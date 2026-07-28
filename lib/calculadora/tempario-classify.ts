import type { TemparioTipoItem } from '@/types/database';

/**
 * Normaliza valor Excel Modelo2 → tipo_item en BD.
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

export const normalizeModelo2 = normalizeTipoItem;
export const resolveModelo2 = (raw: string) => normalizeTipoItem(raw || 'Repuesto');
export const resolveEffectiveTipoItem = resolveModelo2;

export function isActivityRow(row: { tipo_item: string }): boolean {
  const t = normalizeTipoItem(row.tipo_item);
  return t === 'Actividad' || t === 'Servicio';
}

/** Insumos amplios (legacy): Fluido + Consumible + Repuesto */
export function isConsumableOrPartRow(row: { tipo_item: string }): boolean {
  const t = normalizeTipoItem(row.tipo_item);
  return t === 'Fluido' || t === 'Consumible' || t === 'Repuesto';
}

/** Solo Consumible (pestaña Consumibles; excluye Fluido y Repuesto) */
export function isConsumableOnlyRow(row: { tipo_item: string }): boolean {
  return normalizeTipoItem(row.tipo_item) === 'Consumible';
}

export function isPartOnlyRow(row: { tipo_item: string }): boolean {
  return normalizeTipoItem(row.tipo_item) === 'Repuesto';
}

export function isFluidoRow(row: { tipo_item: string }): boolean {
  return normalizeTipoItem(row.tipo_item) === 'Fluido';
}

/**
 * tipo_catalogo derivado de Modelo2 (columna primordial):
 *   Repuesto     → Filtro
 *   Fluido       → Aceite
 *   Actividad    → Actividad
 *   Observacion  → Observacion
 */
export function modelo2ToTipoCatalogo(modelo2: TemparioTipoItem | string): string {
  const t = normalizeTipoItem(String(modelo2));
  switch (t) {
    case 'Repuesto':
      return 'Filtro';
    case 'Fluido':
    case 'Consumible':
      return 'Aceite';
    case 'Actividad':
    case 'Servicio':
      return 'Actividad';
    case 'Observacion':
      return 'Observacion';
    default:
      return t;
  }
}
