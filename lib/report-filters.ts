export const REPORT_MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const;

export interface ReportFiltersState {
  marca: string;
  modelo: string;
  periodo: string;
  cliente: string;
  mes: string;
}

export const DEFAULT_REPORT_FILTERS: ReportFiltersState = {
  marca: 'all',
  modelo: 'all',
  periodo: 'all',
  cliente: 'all',
  mes: 'all',
};

const MES_CREADO_TO_ES: Record<string, (typeof REPORT_MESES)[number]> = {
  january: 'Enero',
  enero: 'Enero',
  february: 'Febrero',
  febrero: 'Febrero',
  march: 'Marzo',
  marzo: 'Marzo',
  april: 'Abril',
  abril: 'Abril',
  may: 'Mayo',
  mayo: 'Mayo',
  june: 'Junio',
  junio: 'Junio',
  july: 'Julio',
  julio: 'Julio',
  august: 'Agosto',
  agosto: 'Agosto',
  september: 'Septiembre',
  septiembre: 'Septiembre',
  setiembre: 'Septiembre',
  october: 'Octubre',
  octubre: 'Octubre',
  november: 'Noviembre',
  noviembre: 'Noviembre',
  december: 'Diciembre',
  diciembre: 'Diciembre',
};

export function sortLocale(values: string[]): string[] {
  return [...values].sort((a, b) => a.localeCompare(b, 'es'));
}

/** Parse dates like DD/MM/YYYY or YYYY-MM-DD */
export function parseFlexibleDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (slash) {
    const day = Number(slash[1]);
    const month = Number(slash[2]) - 1;
    const year = Number(slash[3]);
    const d = new Date(year, month, day);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const iso = new Date(value);
  return Number.isNaN(iso.getTime()) ? null : iso;
}

export function matchesStringFilter(actual: string, selected: string): boolean {
  if (selected === 'all') return true;
  return actual.trim().toLowerCase() === selected.trim().toLowerCase();
}

/** Normaliza MesCreado (EN/ES) al label del filtro en español. */
export function mesCreadoToEs(mesCreado: string | null | undefined): string | null {
  if (!mesCreado || mesCreado === '—') return null;
  const key = mesCreado
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  return MES_CREADO_TO_ES[key] ?? null;
}

export function matchesDateFilters(
  dateValue: string | null | undefined,
  filters: Pick<ReportFiltersState, 'mes' | 'periodo'>
): boolean {
  if (filters.mes === 'all' && filters.periodo === 'all') return true;
  const date = parseFlexibleDate(dateValue);
  if (!date) return false;
  if (filters.mes !== 'all' && REPORT_MESES[date.getMonth()] !== filters.mes) return false;
  if (filters.periodo !== 'all' && date.getFullYear().toString() !== filters.periodo) return false;
  return true;
}

export interface TelemetriaFilterableRow {
  brand: string;
  model: string;
  client: string;
  mesCreado?: string | null;
  anio?: number | null;
  fechaIso?: string | null;
  nextDue?: string | null;
}

/**
 * Filtros del informe de telemetría:
 * - marca / modelo / cliente por texto
 * - periodo / mes priorizan anio + mes_creado del Excel; fallback a fecha de mtto
 */
export function matchesTelemetriaReportFilters(
  row: TelemetriaFilterableRow,
  filters: ReportFiltersState
): boolean {
  if (!matchesStringFilter(row.brand, filters.marca)) return false;
  if (!matchesStringFilter(row.model, filters.modelo)) return false;
  if (!matchesStringFilter(row.client, filters.cliente)) return false;

  if (filters.periodo !== 'all') {
    const fromAnio = row.anio != null && row.anio > 0 ? String(row.anio) : null;
    const fromFecha = row.fechaIso
      ? new Date(row.fechaIso)
      : parseFlexibleDate(row.nextDue ?? null);
    const year =
      fromAnio ??
      (fromFecha && !Number.isNaN(fromFecha.getTime())
        ? String(fromFecha.getFullYear())
        : null);
    if (year !== filters.periodo) return false;
  }

  if (filters.mes !== 'all') {
    const fromCreado = mesCreadoToEs(row.mesCreado);
    if (fromCreado) {
      if (fromCreado !== filters.mes) return false;
    } else {
      const fromFecha = row.fechaIso
        ? new Date(row.fechaIso)
        : parseFlexibleDate(row.nextDue ?? null);
      if (!fromFecha || Number.isNaN(fromFecha.getTime())) return false;
      if (REPORT_MESES[fromFecha.getMonth()] !== filters.mes) return false;
    }
  }

  return true;
}
