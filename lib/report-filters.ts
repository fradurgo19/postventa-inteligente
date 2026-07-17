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
  return actual.toLowerCase() === selected.toLowerCase();
}

export function matchesDateFilters(
  dateValue: string | null | undefined,
  filters: Pick<ReportFiltersState, 'mes' | 'periodo'>
): boolean {
  if (filters.mes === 'all' && filters.periodo === 'all') return true;
  const date = parseFlexibleDate(dateValue);
  if (!date) return true;
  if (filters.mes !== 'all' && REPORT_MESES[date.getMonth()] !== filters.mes) return false;
  if (filters.periodo !== 'all' && date.getFullYear().toString() !== filters.periodo) return false;
  return true;
}
