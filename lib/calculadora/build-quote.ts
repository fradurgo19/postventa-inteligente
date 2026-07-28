import type {
  TemparioMantenimiento,
  PreventiveQuoteInput,
  PreventiveQuoteResult,
  MaintenanceFrequencyHours,
} from '@/types/database';
import { getFrecuenciasPorHorometro } from '@/lib/maintenance-frequency';
import { calcularCostoDesplazamiento, calcularIva, DEFAULT_TARIFA } from '@/lib/travel-cost';
import { normalizeTipoItem } from '@/lib/calculadora/tempario-import';

/**
 * Tarifa fija de mano de obra (COP/h) — Power Apps:
 * Sum(Tiempo horas) * 110000
 */
export const TARIFA_MANO_OBRA_COP = 110_000;

/** Normaliza marca/modelo para comparar (case + espacios). */
export function normalizeEquipKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

function normalizeTipoKey(tipo: string): string {
  return tipo.trim().toLowerCase();
}

/**
 * Power Apps: 'Tipo de item'.Value = "Actividad"
 * (Servicio se acepta por compatibilidad con seeds previos.)
 */
export function isActivityTipo(tipo: string): boolean {
  const t = normalizeTipoKey(tipo);
  return t === 'actividad' || t === 'servicio';
}

/** Fluido / Consumible, o Repuesto mal importado que es fluido por catálogo/unidad. */
export function isConsumableRow(t: TemparioMantenimiento): boolean {
  const tipo = normalizeTipoItem(String(t.tipo_item ?? ''));
  if (tipo === 'Fluido' || tipo === 'Consumible') return true;
  if (tipo !== 'Repuesto') return false;
  return looksLikeFluidoMisclassified(t);
}

export function isPartRow(t: TemparioMantenimiento): boolean {
  const tipo = normalizeTipoItem(String(t.tipo_item ?? ''));
  if (tipo !== 'Repuesto') return false;
  return !looksLikeFluidoMisclassified(t);
}

/** Recuperación si Fluido se importó como Repuesto antes del fix. */
function looksLikeFluidoMisclassified(t: TemparioMantenimiento): boolean {
  const cat = (t.tipo_catalogo ?? '').toLowerCase();
  const unit = (t.unidad_medida ?? '').toLowerCase();
  if ((t.aceite_homologado ?? '').trim()) return true;
  if (/aceite|fluido|coolant|refriger|grasa|lubricante/.test(cat)) return true;
  if (/litro|litros|gal[oó]n|gallon|quart|\bml\b|cm3|cm³/.test(unit)) return true;
  return false;
}

export function matchesMarcaModelo(
  t: TemparioMantenimiento,
  marca: string,
  modelo: string
): boolean {
  return (
    normalizeEquipKey(t.marca) === normalizeEquipKey(marca) &&
    normalizeEquipKey(t.modelo) === normalizeEquipKey(modelo)
  );
}

/**
 * Power Apps: 'Frecuencia (horas)'.Value in SelectedFrequencies
 * (coerción numérica por si PostgREST devuelve string).
 */
export function matchesFrecuencia(
  t: TemparioMantenimiento,
  frecuencias: MaintenanceFrequencyHours[]
): boolean {
  const freq = Number(t.frecuencia_horas);
  if (!Number.isFinite(freq)) return false;
  return frecuencias.some((f) => Number(f) === freq);
}

/** Código SAMM / ref. de catálogo para la tabla de actividades. */
export function resolveCodigoSamm(t: TemparioMantenimiento): string {
  const candidates = [
    t.referencia_genuina,
    t.ref_sap_original,
    t.ref_sap_dispel,
    t.referencia_stal,
    t.legacy_id != null ? String(t.legacy_id) : null,
  ];
  for (const c of candidates) {
    if (c != null && String(c).trim()) return String(c).trim();
  }
  return '—';
}

function sortByTipoThenItem(a: TemparioMantenimiento, b: TemparioMantenimiento): number {
  const tipoCmp = String(a.tipo_item).localeCompare(String(b.tipo_item), 'es');
  if (tipoCmp !== 0) return tipoCmp;
  return a.item.localeCompare(b.item, 'es');
}

function randomSerial(marca: string): string {
  const prefix = marca.slice(0, 3).toUpperCase();
  return `${prefix}${Math.floor(100000 + Math.random() * 900000)}`;
}

/**
 * Cotización preventiva — misma lógica que Power Apps sobre TempariosLocal.
 *
 * Actividades:
 *   Filter(Marca, Modelo, Frecuencia in SelectedFrequencies, Tipo = "Actividad")
 *
 * Mano de obra:
 *   Sum(Tiempo horas) * 110000
 *
 * Consumibles: Fluido | Consumible (sin precio SAP)
 * Repuestos: Repuesto (sin precio SAP)
 */
export function buildPreventiveQuote(
  input: PreventiveQuoteInput,
  temparios: TemparioMantenimiento[]
): PreventiveQuoteResult {
  const frecuencias = getFrecuenciasPorHorometro(input.horometro);

  const forEquip = temparios.filter(
    (t) => t.activo !== false && matchesMarcaModelo(t, input.marca, input.modelo)
  );

  const filtered = forEquip.filter((t) => matchesFrecuencia(t, frecuencias));

  // Power Apps: Tipo de item = "Actividad"
  const activityRows = filtered.filter((t) => isActivityTipo(String(t.tipo_item)));
  const laborHoursTotal = activityRows.reduce(
    (sum, t) => sum + (Number.isFinite(Number(t.tiempo_horas)) ? Number(t.tiempo_horas) : 0),
    0
  );
  const laborTotal = Math.round(laborHoursTotal * TARIFA_MANO_OBRA_COP);

  const activities = activityRows.map((t, i) => {
    const hours = Number(t.tiempo_horas) || 0;
    return {
      id: t.id || `act-${i}`,
      activity: t.item,
      description: t.procedimiento ?? t.avisos_claves ?? '',
      laborHours: hours,
      parts: 0,
      consumables: 0,
      subtotal: Math.round(hours * TARIFA_MANO_OBRA_COP),
      frecuenciaHoras: Number(t.frecuencia_horas) as MaintenanceFrequencyHours,
      marca: t.marca,
      modelo: t.modelo,
      codigoSamm: resolveCodigoSamm(t),
    };
  });

  const consumableRows = filtered.filter(isConsumableRow).slice().sort(sortByTipoThenItem);
  const consumables = consumableRows.map((t) => {
    const codigo = resolveCodigoSamm(t);
    return {
      item: t.item,
      quantity: t.cantidad,
      unit: t.unidad_medida,
      unitPrice: 0,
      total: 0,
      tipoItem: normalizeTipoItem(String(t.tipo_item)),
      referencia: codigo === '—' ? null : codigo,
      frecuenciaHoras: Number(t.frecuencia_horas) as MaintenanceFrequencyHours,
      marca: t.marca,
      modelo: t.modelo,
    };
  });

  const partRows = filtered.filter(isPartRow).slice().sort(sortByTipoThenItem);
  const parts = partRows.map((t) => ({
    sapCode: resolveCodigoSamm(t),
    description: t.item,
    quantity: t.cantidad,
    unitPrice: 0,
    total: 0,
    unit: t.unidad_medida,
    frecuenciaHoras: Number(t.frecuencia_horas) as MaintenanceFrequencyHours,
  }));

  const travelCost = calcularCostoDesplazamiento(input.kmTrayecto, input.horasTrayecto);
  const subtotal = laborTotal + travelCost;
  const vat = calcularIva(subtotal, DEFAULT_TARIFA.iva_porcentaje);

  const tiposEnEquipo = Array.from(
    new Set(forEquip.map((t) => String(t.tipo_item ?? '').trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, 'es'));

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
    matchMeta: {
      tempariosEquipo: forEquip.length,
      tempariosFrecuencia: filtered.length,
      tiposEnEquipo,
    },
    costs: {
      labor: laborTotal,
      consumables: 0,
      parts: 0,
      travel: travelCost,
      subtotal,
      vat,
      total: subtotal + vat,
    },
  };
}
