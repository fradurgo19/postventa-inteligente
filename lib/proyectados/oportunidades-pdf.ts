import jsPDF from 'jspdf';
import autoTable, { type CellHookData } from 'jspdf-autotable';
import {
  fetchPartequiposLogoDataUrl,
} from '@/lib/calculadora/quote-pdf';
import {
  buildGoogleMapsUrl,
  formatTipoMttoLabel,
  hasValidMapCoordinates,
  type TelemetriaOpportunityRow,
} from '@/lib/proyectados/map-telemetria-ui';

const BRAND_RGB = { r: 207, g: 27, b: 34 } as const;
const PAGE_MARGIN = 10;
const MAPS_LINK_LABEL = 'Maps';
const NO_GPS_LABEL = 'Sin GPS';
/** Índice de columna "Ubicación" en el cuerpo de la tabla (0-based). */
const UBICACION_COL_INDEX = 10;

interface JsPdfWithAutoTable extends jsPDF {
  lastAutoTable?: { finalY: number };
}

function formatDateEs(date: Date): string {
  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function textOrDash(value: string | null | undefined): string {
  const v = (value ?? '').trim();
  return v || '—';
}

/** Solo oportunidades en estado Programado (Scheduled). */
export function filterProgramadasForPdf(
  rows: ReadonlyArray<TelemetriaOpportunityRow>
): TelemetriaOpportunityRow[] {
  return rows.filter((r) => r.status === 'Scheduled');
}

function resolveMapsUrl(row: TelemetriaOpportunityRow): string | null {
  if (
    !hasValidMapCoordinates(row.latitud, row.longitud) ||
    row.latitud == null ||
    row.longitud == null
  ) {
    return null;
  }
  return buildGoogleMapsUrl(row.latitud, row.longitud);
}

function ubicacionCellContent(row: TelemetriaOpportunityRow): string {
  return resolveMapsUrl(row) ? MAPS_LINK_LABEL : NO_GPS_LABEL;
}

function addHeader(doc: jsPDF, logoDataUrl: string | null, total: number): void {
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', PAGE_MARGIN, PAGE_MARGIN - 1, 38, 12);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(BRAND_RGB.r, BRAND_RGB.g, BRAND_RGB.b);
    doc.text('PARTEQUIPOS MAQUINARIA', PAGE_MARGIN, PAGE_MARGIN + 6);
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  const rightX = pageWidth - PAGE_MARGIN;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('Oportunidades Próximas — Programadas', rightX, PAGE_MARGIN + 4, {
    align: 'right',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(formatDateEs(new Date()), rightX, PAGE_MARGIN + 9, { align: 'right' });
  doc.text(`${total} registro(s) programado(s)`, rightX, PAGE_MARGIN + 13, {
    align: 'right',
  });

  doc.setDrawColor(BRAND_RGB.r, BRAND_RGB.g, BRAND_RGB.b);
  doc.setLineWidth(0.4);
  doc.line(PAGE_MARGIN, PAGE_MARGIN + 16, pageWidth - PAGE_MARGIN, PAGE_MARGIN + 16);
}

function addFooter(doc: JsPdfWithAutoTable): void {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'PARTEQUIPOS MAQUINARIA · Mantenimiento Proyectado · Solo programadas',
      PAGE_MARGIN,
      pageHeight - 6
    );
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - PAGE_MARGIN, pageHeight - 6, {
      align: 'right',
    });
  }
}

function styleUbicacionCell(data: CellHookData): void {
  if (data.section !== 'body' || data.column.index !== UBICACION_COL_INDEX) return;
  if (data.cell.text.join('') !== MAPS_LINK_LABEL) return;
  data.cell.styles.textColor = [BRAND_RGB.r, BRAND_RGB.g, BRAND_RGB.b];
  data.cell.styles.fontStyle = 'bold';
}

function attachMapsLink(data: CellHookData, mapsUrls: ReadonlyArray<string | null>): void {
  if (data.section !== 'body' || data.column.index !== UBICACION_COL_INDEX) return;
  const url = mapsUrls[data.row.index];
  if (!url) return;
  data.doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url });
}

/**
 * Genera y descarga PDF de oportunidades próximas programadas
 * (excluye vencidas y demás estados).
 * Incluye hipervínculo Google Maps por registro cuando hay GPS válido.
 */
export async function downloadOportunidadesProgramadasPdf(
  rows: ReadonlyArray<TelemetriaOpportunityRow>
): Promise<{ ok: boolean; count: number }> {
  const programadas = filterProgramadasForPdf(rows);
  if (programadas.length === 0) {
    return { ok: false, count: 0 };
  }

  const logoDataUrl = await fetchPartequiposLogoDataUrl();
  const mapsUrls = programadas.map(resolveMapsUrl);

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  }) as JsPdfWithAutoTable;

  addHeader(doc, logoDataUrl, programadas.length);

  autoTable(doc, {
    startY: PAGE_MARGIN + 18,
    head: [
      [
        'Equipo',
        'Marca',
        'Modelo',
        'Serie',
        'Horas',
        'Tipo Mtto',
        'Descarga telemetría',
        'Fecha estimada mtto',
        'Asesor',
        'Cliente',
        'Ubicación',
      ],
    ],
    body: programadas.map((r) => [
      textOrDash(r.equipment),
      textOrDash(r.brand),
      textOrDash(r.model),
      textOrDash(r.serie),
      r.hours.toLocaleString('es-CO'),
      textOrDash(formatTipoMttoLabel(r.tipoMtto)),
      textOrDash(r.lastMaintenance),
      textOrDash(r.nextDue),
      textOrDash(r.advisor),
      textOrDash(r.client),
      ubicacionCellContent(r),
    ]),
    theme: 'striped',
    styles: {
      fontSize: 7.5,
      cellPadding: 1.4,
      overflow: 'linebreak',
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [BRAND_RGB.r, BRAND_RGB.g, BRAND_RGB.b],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      [UBICACION_COL_INDEX]: { halign: 'center' },
    },
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN, bottom: 12 },
    didParseCell: styleUbicacionCell,
    didDrawCell: (data) => attachMapsLink(data, mapsUrls),
  });

  addFooter(doc);

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`oportunidades-proximas-programadas-${stamp}.pdf`);
  return { ok: true, count: programadas.length };
}
