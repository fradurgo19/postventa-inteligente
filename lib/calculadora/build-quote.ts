import type {
  TemparioMantenimiento,
  PreventiveQuoteInput,
  PreventiveQuoteResult,
  MaintenanceFrequencyHours,
} from '@/types/database';
import { getFrecuenciasPorHorometro } from '@/lib/maintenance-frequency';
import { calcularCostoDesplazamiento, calcularIva, DEFAULT_TARIFA } from '@/lib/travel-cost';

/**
 * Tarifa fija de mano de obra (COP/h) — misma lógica que Power Apps:
 * Sum(Tiempo horas) * 110000
 */
export const TARIFA_MANO_OBRA_COP = 110_000;

function normalizeTipo(tipo: string): string {
  return tipo.trim().toLowerCase();
}

/** Actividades / servicios → mano de obra */
export function isActivityTipo(tipo: string): boolean {
  const t = normalizeTipo(tipo);
  return t === 'actividad' || t === 'servicio';
}

/** Fluido (Power Apps) o Consumible → pestaña Consumibles */
export function isConsumableTipo(tipo: string): boolean {
  const t = normalizeTipo(tipo);
  return t === 'fluido' || t === 'consumible';
}

/** Solo Repuesto → pestaña Repuestos */
export function isPartTipo(tipo: string): boolean {
  return normalizeTipo(tipo) === 'repuesto';
}

function matchesMarcaModelo(
  t: TemparioMantenimiento,
  marca: string,
  modelo: string
): boolean {
  return (
    t.marca.trim().toLowerCase() === marca.trim().toLowerCase() &&
    t.modelo.trim().toLowerCase() === modelo.trim().toLowerCase()
  );
}

function matchesFrecuencia(
  t: TemparioMantenimiento,
  frecuencias: MaintenanceFrequencyHours[]
): boolean {
  return frecuencias.includes(t.frecuencia_horas);
}

function sortByTipoThenItem(a: TemparioMantenimiento, b: TemparioMantenimiento): number {
  const tipoCmp = a.tipo_item.localeCompare(b.tipo_item, 'es');
  if (tipoCmp !== 0) return tipoCmp;
  return a.item.localeCompare(b.item, 'es');
}

function randomSerial(marca: string): string {
  const prefix = marca.slice(0, 3).toUpperCase();
  return `${prefix}${Math.floor(100000 + Math.random() * 900000)}`;
}

/**
 * Cotización preventiva alineada a Power Apps + temparios_mantenimiento.
 *
 * Mano de obra:
 *   Sum(Filter(marca, modelo, frecuencia, tipo Actividad/Servicio); Tiempo) * 110000
 *
 * Consumibles / Repuestos: listado (Fluido|Consumible / Repuesto) sin precios SAP.
 */
export function buildPreventiveQuote(
  input: PreventiveQuoteInput,
  temparios: TemparioMantenimiento[]
): PreventiveQuoteResult {
  const frecuencias = getFrecuenciasPorHorometro(input.horometro);

  const filtered = temparios.filter(
    (t) =>
      t.activo &&
      matchesMarcaModelo(t, input.marca, input.modelo) &&
      matchesFrecuencia(t, frecuencias)
  );

  const activityRows = filtered.filter((t) => isActivityTipo(t.tipo_item));
  const laborHoursTotal = activityRows.reduce((sum, t) => sum + Number(t.tiempo_horas || 0), 0);
  const laborTotal = Math.round(laborHoursTotal * TARIFA_MANO_OBRA_COP);

  const activities = activityRows.map((t, i) => {
    const hours = Number(t.tiempo_horas || 0);
    return {
      id: t.id || `act-${i}`,
      activity: t.item,
      description: t.procedimiento ?? t.avisos_claves ?? '',
      laborHours: hours,
      parts: 0,
      consumables: 0,
      subtotal: Math.round(hours * TARIFA_MANO_OBRA_COP),
      frecuenciaHoras: t.frecuencia_horas,
    };
  });

  const consumableRows = filtered
    .filter((t) => isConsumableTipo(t.tipo_item))
    .slice()
    .sort(sortByTipoThenItem);

  const consumables = consumableRows.map((t) => ({
    item: t.item,
    quantity: t.cantidad,
    unit: t.unidad_medida,
    unitPrice: 0,
    total: 0,
    tipoItem: t.tipo_item,
    referencia: t.referencia_genuina ?? t.ref_sap_original ?? t.ref_sap_dispel ?? null,
    frecuenciaHoras: t.frecuencia_horas,
  }));

  const partRows = filtered
    .filter((t) => isPartTipo(t.tipo_item))
    .slice()
    .sort(sortByTipoThenItem);

  const parts = partRows.map((t) => ({
    sapCode: t.ref_sap_original ?? t.ref_sap_dispel ?? t.referencia_genuina ?? '—',
    description: t.item,
    quantity: t.cantidad,
    unitPrice: 0,
    total: 0,
    unit: t.unidad_medida,
    frecuenciaHoras: t.frecuencia_horas,
  }));

  const travelCost = calcularCostoDesplazamiento(input.kmTrayecto, input.horasTrayecto);
  // Sin SAP: consumibles y repuestos no aportan valor monetario
  const consumablesTotal = 0;
  const partsTotal = 0;
  const subtotal = laborTotal + travelCost;
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
    laborHoursTotal,
    laborRate: TARIFA_MANO_OBRA_COP,
    activities,
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
