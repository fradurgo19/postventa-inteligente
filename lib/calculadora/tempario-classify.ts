import type { TemparioTipoItem } from '@/types/database';

/**
 * Normaliza el valor de Modelo2 (Excel) — única fuente de clasificación.
 * Valores: Repuesto | Fluido | Actividad | Observacion | Consumible | Servicio
 */
export function normalizeTipoItem(raw: string): TemparioTipoItem {
  const v = raw.trim().toLowerCase();
  if (!v) return 'Repuesto';
  if (v === 'repuesto' || v.startsWith('repues')) return 'Repuesto';
  if (v === 'fluido' || v.startsWith('fluid')) return 'Fluido';
  if (v === 'consumible' || v.startsWith('consum')) return 'Consumible';
  if (v === 'actividad' || v.startsWith('activ')) return 'Actividad';
  if (v === 'servicio' || v.startsWith('serv')) return 'Servicio';
  if (v === 'observacion' || v.startsWith('observ')) return 'Observacion';
  return 'Repuesto';
}

/** Alias: el tipo efectivo es solo el de Modelo2 / tipo_item en BD. */
export function resolveEffectiveTipoItem(tipoRaw: string): TemparioTipoItem {
  return normalizeTipoItem(tipoRaw || 'Repuesto');
}

export function isActivityRow(row: { tipo_item: string }): boolean {
  const t = normalizeTipoItem(row.tipo_item);
  return t === 'Actividad' || t === 'Servicio';
}

/** Insumos: Fluido / Consumible / Repuesto (no Actividad ni Observacion). */
export function isConsumableOrPartRow(row: { tipo_item: string }): boolean {
  const t = normalizeTipoItem(row.tipo_item);
  return t === 'Fluido' || t === 'Consumible' || t === 'Repuesto';
}

export function isPartOnlyRow(row: { tipo_item: string }): boolean {
  return normalizeTipoItem(row.tipo_item) === 'Repuesto';
}

export function isFluidoRow(row: { tipo_item: string }): boolean {
  return normalizeTipoItem(row.tipo_item) === 'Fluido';
}
