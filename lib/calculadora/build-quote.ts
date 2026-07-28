import type {
  TemparioMantenimiento,
  PreventiveQuoteInput,
  PreventiveQuoteResult,
  MaintenanceFrequencyHours,
} from '@/types/database';
import { getFrecuenciasPorHorometro } from '@/lib/maintenance-frequency';
import { calcularCostoDesplazamiento, calcularIva, DEFAULT_TARIFA } from '@/lib/travel-cost';
import {
  isActivityRow,
  isConsumableOrPartRow,
  isPartOnlyRow,
  resolveEffectiveTipoItem,
} from '@/lib/calculadora/tempario-classify';

/**
 * Tarifa fija de mano de obra (COP/h) — Power Apps:
 * Sum(Tiempo horas) * 110000
 */
export const TARIFA_MANO_OBRA_COP = 110_000;

/** Normaliza marca/modelo para comparar (case + espacios). */
export function normalizeEquipKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

export function isActivityTipo(tipo: string): boolean {
  const t = tipo.trim().toLowerCase();
  return t === 'actividad' || t === 'servicio';
}

export function isConsumableRow(t: { tipo_item: string; item: string }): boolean {
  return isConsumableOrPartRow(t);
}

export function isPartRow(t: { tipo_item: string; item: string }): boolean {
  return isPartOnlyRow(t);
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

function textOrDash(value: string | null | undefined): string {
  const v = (value ?? '').trim();
  return v || '—';
}

function randomSerial(marca: string): string {
  const prefix = marca.slice(0, 3).toUpperCase();
  return `${prefix}${Math.floor(100000 + Math.random() * 900000)}`;
}

/**
 * Cotización preventiva — Power Apps / Excel Modelo2.
 *
 * Actividades: tipo Actividad según Modelo2
 * Mano de obra: Sum(Tiempo) * 110000
 * Consumibles: Fluido | Repuesto | Consumible (insumos)
 * Observacion: excluida de tabs de cálculo
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

  const activityRows = filtered.filter((t) => isActivityRow(t));
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
    const qty = Number(t.cantidad);
    return {
      item: t.item,
      quantity: Number.isFinite(qty) && qty > 0 ? qty : qty === 0 ? 0 : 1,
      unit: t.unidad_medida,
      unitPrice: 0,
      total: 0,
      tipoItem: resolveEffectiveTipoItem(String(t.tipo_item)),
      tipoCatalogo: t.tipo_catalogo ?? null,
      frecuenciaHoras: Number(t.frecuencia_horas) as MaintenanceFrequencyHours,
      marca: t.marca,
      modelo: t.modelo,
      referenciaGenuina: textOrDash(t.referencia_genuina),
      refSapDispel: textOrDash(t.ref_sap_dispel),
      refSapOriginal: textOrDash(t.ref_sap_original),
      referenciaStal: textOrDash(t.referencia_stal),
      referenciaDonaldson: textOrDash(t.referencia_donaldson),
      referenciaFleetguard: textOrDash(t.referencia_fleetguard),
    };
  });

  const partRows = filtered.filter(isPartRow).slice().sort(sortByTipoThenItem);
  const parts = partRows.map((t) => {
    const qty = Number(t.cantidad);
    return {
      sapCode: resolveCodigoSamm(t),
      description: t.item,
      quantity: Number.isFinite(qty) && qty > 0 ? qty : qty === 0 ? 0 : 1,
      unitPrice: 0,
      total: 0,
      unit: t.unidad_medida,
      frecuenciaHoras: Number(t.frecuencia_horas) as MaintenanceFrequencyHours,
    };
  });

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
