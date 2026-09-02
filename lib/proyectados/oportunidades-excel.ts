import {
  formatTipoMttoLabel,
  type MaintenanceStatusUi,
  type TelemetriaOpportunityRow,
} from '@/lib/proyectados/map-telemetria-ui';
import { filterProgramadasForPdf } from '@/lib/proyectados/oportunidades-pdf';

const STATUS_LABEL: Record<MaintenanceStatusUi, string> = {
  Scheduled: 'Programado',
  Overdue: 'Vencido',
  'In Progress': 'En Progreso',
  Completed: 'Completado',
};

const EXCEL_HEADERS = [
  'Equipo',
  'Marca',
  'Modelo',
  'Serie',
  'Horas',
  'Tipo Mtto',
  'Descarga telemetría',
  'Fecha estimada mtto',
  'Estado',
  'Asesor',
  'Cliente',
  'Sede',
  'Ciudad',
  'Latitud',
  'Longitud',
] as const;

function textOrDash(value: string | null | undefined): string {
  const v = (value ?? '').trim();
  return v || '—';
}

function coordOrDash(value: number | null | undefined): string | number {
  if (value == null || !Number.isFinite(value)) return '—';
  return value;
}

function rowToExcelValues(r: TelemetriaOpportunityRow): (string | number)[] {
  return [
    textOrDash(r.equipment),
    textOrDash(r.brand),
    textOrDash(r.model),
    textOrDash(r.serie),
    r.hours,
    textOrDash(formatTipoMttoLabel(r.tipoMtto)),
    textOrDash(r.lastMaintenance),
    textOrDash(r.nextDue),
    STATUS_LABEL[r.status] ?? r.status,
    textOrDash(r.advisor),
    textOrDash(r.client),
    textOrDash(r.sede),
    textOrDash(r.ciudad),
    coordOrDash(r.latitud),
    coordOrDash(r.longitud),
  ];
}

function buildColumnWidths(headers: readonly string[]): { wch: number }[] {
  return headers.map((h) => ({ wch: Math.min(32, Math.max(12, h.length + 2)) }));
}

/**
 * Genera y descarga Excel (.xlsx) de oportunidades próximas programadas
 * (mismo alcance que el PDF: excluye vencidas y demás estados).
 */
export async function downloadOportunidadesProgramadasExcel(
  rows: ReadonlyArray<TelemetriaOpportunityRow>
): Promise<{ ok: boolean; count: number }> {
  const programadas = filterProgramadasForPdf(rows);
  if (programadas.length === 0) {
    return { ok: false, count: 0 };
  }

  const XLSX = await import('xlsx');
  const sheetData: (string | number)[][] = [
    [...EXCEL_HEADERS],
    ...programadas.map(rowToExcelValues),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(sheetData);
  sheet['!cols'] = buildColumnWidths(EXCEL_HEADERS);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Programadas');

  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `oportunidades-proximas-programadas-${stamp}.xlsx`);
  return { ok: true, count: programadas.length };
}
