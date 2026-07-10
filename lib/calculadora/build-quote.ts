import type {
  TemparioMantenimiento,
  PreventiveQuoteInput,
  PreventiveQuoteResult,
} from '@/types/database';
import { getFrecuenciasPorHorometro } from '@/lib/maintenance-frequency';
import { calcularCostoDesplazamiento, calcularIva, DEFAULT_TARIFA } from '@/lib/travel-cost';

function randomSerial(marca: string): string {
  const prefix = marca.slice(0, 3).toUpperCase();
  return `${prefix}${Math.floor(100000 + Math.random() * 900000)}`;
}

/**
 * Construye cotización de mantenimiento preventivo a partir de temparios.
 * Lógica pura — sin I/O. Usada por servicio Supabase y fallback mock.
 */
export function buildPreventiveQuote(
  input: PreventiveQuoteInput,
  temparios: TemparioMantenimiento[]
): PreventiveQuoteResult {
  const frecuencias = getFrecuenciasPorHorometro(input.horometro);

  const filtered = temparios.filter(
    (t) =>
      t.marca.toLowerCase() === input.marca.toLowerCase() &&
      t.modelo.toLowerCase() === input.modelo.toLowerCase() &&
      frecuencias.includes(t.frecuencia_horas) &&
      t.activo
  );

  const activities = filtered
    .filter((t) => t.tipo_item === 'Actividad' || t.tipo_item === 'Servicio')
    .map((t, i) => {
      const laborCost = Math.round(t.tiempo_horas * t.tarifa_mano_obra_h);
      return {
        id: t.id || `act-${i}`,
        activity: t.item,
        description: t.procedimiento ?? t.avisos_claves ?? 'Procedimiento estándar OEM',
        laborHours: t.tiempo_horas,
        parts: 0,
        consumables: 0,
        subtotal: laborCost,
      };
    });

  const consumables = filtered
    .filter((t) => t.tipo_item === 'Consumible')
    .map((t) => ({
      item: t.item,
      quantity: t.cantidad,
      unit: t.unidad_medida,
      unitPrice: t.precio_unitario,
      total: Math.round(t.cantidad * t.precio_unitario),
    }));

  const parts = filtered
    .filter((t) => t.tipo_item === 'Repuesto')
    .map((t) => ({
      sapCode: t.ref_sap_original ?? t.ref_sap_dispel ?? t.referencia_genuina ?? 'N/A',
      description: t.item,
      quantity: t.cantidad,
      unitPrice: t.precio_unitario,
      total: Math.round(t.cantidad * t.precio_unitario),
    }));

  const laborTotal = activities.reduce(
    (sum, a) => sum + Math.round(a.laborHours * (filtered[0]?.tarifa_mano_obra_h ?? 95000)),
    0
  );
  const consumablesTotal = consumables.reduce((sum, c) => sum + c.total, 0);
  const partsTotal = parts.reduce((sum, p) => sum + p.total, 0);
  const travelCost = calcularCostoDesplazamiento(input.kmTrayecto, input.horasTrayecto);
  const subtotal = laborTotal + consumablesTotal + partsTotal + travelCost;
  const vat = calcularIva(subtotal, DEFAULT_TARIFA.iva_porcentaje);

  return {
    brand: input.marca,
    model: input.modelo,
    serialNumber: randomSerial(input.marca),
    year: new Date().getFullYear() - Math.floor(Math.random() * 6),
    hours: input.horometro,
    kilometers: input.kmTrayecto,
    status: Math.random() > 0.3 ? 'active' : 'maintenance',
    frecuenciasAplicadas: frecuencias,
    activities: activities.length > 0 ? activities : buildFallbackActivities(laborTotal),
    consumables,
    parts,
    costs: {
      labor: laborTotal,
      consumables: consumablesTotal,
      parts: partsTotal,
      travel: travelCost,
      subtotal,
      vat,
      total: subtotal + vat,
    },
  };
}

function buildFallbackActivities(laborTotal: number) {
  return [
    {
      id: 'fallback-1',
      activity: 'Mantenimiento preventivo programado',
      description: 'Actividades según tempario — cargue datos en Supabase',
      laborHours: laborTotal / 95000,
      parts: 0,
      consumables: 0,
      subtotal: laborTotal,
    },
  ];
}
