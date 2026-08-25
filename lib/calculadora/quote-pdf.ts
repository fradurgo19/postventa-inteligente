import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { PreventiveQuoteResult, TelemetriaEquipo } from '@/types/database';

/** Logo oficial PARTEQUIPOS MAQUINARIA (Cloudinary). */
export const PARTEQUIPOS_LOGO_URL =
  'https://res.cloudinary.com/dbufrzoda/image/upload/v1750457354/Captura_de_pantalla_2025-06-20_170819_wzmyli.png';

const BRAND_RGB = { r: 207, g: 27, b: 34 } as const;
const PAGE_MARGIN = 10;
const PAGE_WIDTH = 297;
const PAGE_HEIGHT = 210;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;
const COST_BLOCK_HEIGHT = 24;
const FOOTER_Y = PAGE_HEIGHT - 6;

export interface QuotePdfInput {
  quote: PreventiveQuoteResult;
  travelTimeHours?: number;
  selectedMachine?: TelemetriaEquipo | null;
}

interface JsPdfWithAutoTable extends jsPDF {
  lastAutoTable?: { finalY: number };
}

interface PdfLayoutMetrics {
  fontSize: number;
  cellPadding: number;
  headerEndY: number;
  detailStartY: number;
  detailMaxY: number;
  costStartY: number;
}

function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
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

function truncate(value: string, max: number): string {
  const v = value.trim();
  if (v.length <= max) return v;
  return `${v.slice(0, max - 1)}…`;
}

function sanitizeFilePart(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

async function fetchImageDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const data = reader.result;
        if (typeof data === 'string') resolve(data);
        else reject(new Error('Formato de logo no válido'));
      };
      reader.onerror = () => reject(new Error('No se pudo leer el logo'));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function tableFinalY(doc: JsPdfWithAutoTable, fallback: number): number {
  return doc.lastAutoTable?.finalY ?? fallback;
}

function countDetailRows(quote: PreventiveQuoteResult): number {
  const actRows = Math.max(quote.activities.length, 1);
  const fluidRows = Math.max(quote.fluids.length, 1);
  const partRows = Math.max(quote.parts.length, 1);
  return actRows + fluidRows + partRows + 3;
}

function resolveLayoutMetrics(quote: PreventiveQuoteResult, fontSize: number): PdfLayoutMetrics {
  const headerEndY = 38;
  const detailStartY = headerEndY + 2;
  const costStartY = PAGE_HEIGHT - COST_BLOCK_HEIGHT - 8;
  const detailMaxY = costStartY - 4;
  const available = detailMaxY - detailStartY;
  const totalRows = countDetailRows(quote);
  const rowHeight = fontSize * 0.45 + 1.8;
  const needed = totalRows * rowHeight + 14;

  let adjustedFont = fontSize;
  if (needed > available && fontSize > 4.5) {
    adjustedFont = Math.max(4.5, (fontSize * available) / needed);
  }

  return {
    fontSize: adjustedFont,
    cellPadding: adjustedFont <= 5.5 ? 0.8 : 1.2,
    headerEndY,
    detailStartY,
    detailMaxY,
    costStartY,
  };
}

function compactTableStyles(fontSize: number, cellPadding: number) {
  return {
    fontSize,
    cellPadding,
    overflow: 'linebreak' as const,
    lineColor: [226, 232, 240] as [number, number, number],
    lineWidth: 0.1,
    textColor: [30, 41, 59] as [number, number, number],
  };
}

function drawMiniTitle(doc: jsPDF, title: string, x: number, y: number, width: number): void {
  doc.setFillColor(BRAND_RGB.r, BRAND_RGB.g, BRAND_RGB.b);
  doc.rect(x, y - 3.5, width, 4.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text(title, x + 1.5, y);
  doc.setTextColor(30, 41, 59);
}

function addHeader(doc: jsPDF, logoDataUrl: string | null, input: QuotePdfInput): void {
  const { quote, travelTimeHours, selectedMachine } = input;
  const serial = selectedMachine?.serie ?? quote.serialNumber;
  const client = truncate(selectedMachine?.titulo ?? '—', 36);
  const sede = truncate(selectedMachine?.sede ?? selectedMachine?.ciudad ?? '—', 28);
  const frecuencias = quote.frecuenciasAplicadas
    .map((f) => `${f}`)
    .join(', ');

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', PAGE_MARGIN, PAGE_MARGIN, 42, 14);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(BRAND_RGB.r, BRAND_RGB.g, BRAND_RGB.b);
    doc.text('PARTEQUIPOS MAQUINARIA', PAGE_MARGIN, PAGE_MARGIN + 8);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const rightX = PAGE_MARGIN + CONTENT_WIDTH;
  doc.text('Cotización Mantenimiento Preventivo', rightX, PAGE_MARGIN + 4, { align: 'right' });
  doc.text(formatDateEs(new Date()), rightX, PAGE_MARGIN + 9, { align: 'right' });

  autoTable(doc, {
    startY: PAGE_MARGIN + 16,
    theme: 'plain',
    styles: { fontSize: 7, cellPadding: 1, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 22, textColor: [100, 116, 139] },
      1: { cellWidth: 52 },
      2: { fontStyle: 'bold', cellWidth: 22, textColor: [100, 116, 139] },
      3: { cellWidth: 52 },
      4: { fontStyle: 'bold', cellWidth: 22, textColor: [100, 116, 139] },
      5: { cellWidth: 52 },
    },
    body: [
      [
        'Marca',
        quote.brand,
        'Modelo',
        quote.model,
        'Serie',
        serial,
      ],
      [
        'Horómetro',
        `${quote.hours.toLocaleString('es-CO')} h`,
        'Cliente',
        client,
        'Sede',
        sede,
      ],
      [
        'Km',
        `${quote.kilometers.toLocaleString('es-CO')}`,
        'Viaje',
        `${travelTimeHours ?? 0} h`,
        'Freq. (h)',
        frecuencias,
      ],
    ],
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN, top: PAGE_MARGIN },
    pageBreak: 'avoid',
  });
}

function addActivitiesBlock(
  doc: JsPdfWithAutoTable,
  quote: PreventiveQuoteResult,
  layout: PdfLayoutMetrics
): number {
  const startY = layout.detailStartY;
  drawMiniTitle(doc, 'Actividades', PAGE_MARGIN, startY, CONTENT_WIDTH);

  const body =
    quote.activities.length === 0
      ? [['—', 'Sin actividades para esta frecuencia', '—', '—']]
      : [
          ...quote.activities.map((act) => [
            String(act.frecuenciaHoras ?? '—'),
            truncate(act.activity, 72),
            act.laborHours.toFixed(1),
            formatCOP(act.subtotal),
          ]),
          [
            { content: 'Total MO', colSpan: 2, styles: { fontStyle: 'bold' as const } },
            {
              content: quote.laborHoursTotal.toFixed(1),
              styles: { fontStyle: 'bold' as const, halign: 'right' as const },
            },
            {
              content: formatCOP(quote.costs.labor),
              styles: { fontStyle: 'bold' as const, halign: 'right' as const },
            },
          ],
        ];

  autoTable(doc, {
    startY: startY + 2,
    head: [['F', 'Actividad', 'h', 'MO']],
    body,
    styles: compactTableStyles(layout.fontSize, layout.cellPadding),
    headStyles: {
      fillColor: [BRAND_RGB.r, BRAND_RGB.g, BRAND_RGB.b],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: layout.fontSize,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'right' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 12, halign: 'right' },
      3: { cellWidth: 28, halign: 'right' },
    },
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN, bottom: PAGE_HEIGHT - layout.costStartY },
    pageBreak: 'avoid',
    rowPageBreak: 'avoid',
    tableWidth: CONTENT_WIDTH,
  });

  return tableFinalY(doc, startY + 12);
}

function addFluidsBlock(
  doc: JsPdfWithAutoTable,
  quote: PreventiveQuoteResult,
  layout: PdfLayoutMetrics,
  startY: number
): number {
  const colWidth = CONTENT_WIDTH / 2 - 2;
  const x = PAGE_MARGIN;

  drawMiniTitle(doc, 'Fluidos', x, startY, colWidth);

  const body =
    quote.fluids.length === 0
      ? [['—', 'Sin fluidos', '—', '—']]
      : quote.fluids.map((f) => [
          String(f.frecuenciaHoras ?? '—'),
          truncate(f.item, 42),
          String(f.quantity),
          textOrDash(f.unit),
        ]);

  autoTable(doc, {
    startY: startY + 2,
    head: [['F', 'Fluido', 'Cant', 'Und']],
    body,
    styles: compactTableStyles(layout.fontSize, layout.cellPadding),
    headStyles: {
      fillColor: [22, 163, 74],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: layout.fontSize,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'right' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 10, halign: 'right' },
      3: { cellWidth: 12 },
    },
    margin: { left: x, right: PAGE_WIDTH - x - colWidth, bottom: PAGE_HEIGHT - layout.costStartY },
    pageBreak: 'avoid',
    rowPageBreak: 'avoid',
    tableWidth: colWidth,
  });

  return tableFinalY(doc, startY + 12);
}

function addPartsBlock(
  doc: JsPdfWithAutoTable,
  quote: PreventiveQuoteResult,
  layout: PdfLayoutMetrics,
  startY: number
): number {
  const colWidth = CONTENT_WIDTH / 2 - 2;
  const x = PAGE_MARGIN + colWidth + 4;

  drawMiniTitle(doc, 'Repuestos', x, startY, colWidth);

  const body =
    quote.parts.length === 0
      ? [['—', 'Sin repuestos', '—', '—']]
      : quote.parts.map((p) => [
          String(p.frecuenciaHoras ?? '—'),
          truncate(p.description, 42),
          String(p.quantity),
          textOrDash(p.unit),
        ]);

  autoTable(doc, {
    startY: startY + 2,
    head: [['F', 'Repuesto', 'Cant', 'Und']],
    body,
    styles: compactTableStyles(layout.fontSize, layout.cellPadding),
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: layout.fontSize,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'right' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 10, halign: 'right' },
      3: { cellWidth: 12 },
    },
    margin: { left: x, right: PAGE_MARGIN, bottom: PAGE_HEIGHT - layout.costStartY },
    pageBreak: 'avoid',
    rowPageBreak: 'avoid',
    tableWidth: colWidth,
  });

  return tableFinalY(doc, startY + 12);
}

function addCostSummary(doc: jsPDF, quote: PreventiveQuoteResult, startY: number): void {
  const labor = quote.costs.labor;
  const travel = quote.costs.travel;
  const subtotal = quote.costs.subtotal;
  const rightX = PAGE_MARGIN + CONTENT_WIDTH;
  const boxTop = startY;
  const rowH = 6.5;
  const rows = [
    { label: 'Total mano de obra', value: formatCOP(labor), bold: false },
    { label: 'Total desplazamiento', value: formatCOP(travel), bold: false },
    { label: 'Total (MO + desplazamiento)', value: formatCOP(subtotal), bold: true },
  ];

  doc.setDrawColor(BRAND_RGB.r, BRAND_RGB.g, BRAND_RGB.b);
  doc.setFillColor(255, 247, 237);
  doc.roundedRect(PAGE_MARGIN, boxTop, CONTENT_WIDTH, rows.length * rowH + 4, 1.5, 1.5, 'FD');

  rows.forEach((row, index) => {
    const rowY = boxTop + 4.5 + index * rowH;
    doc.setFont('helvetica', row.bold ? 'bold' : 'normal');
    doc.setFontSize(row.bold ? 9 : 8);
    doc.setTextColor(row.bold ? BRAND_RGB.r : 51, row.bold ? BRAND_RGB.g : 65, row.bold ? BRAND_RGB.b : 85);
    doc.text(row.label, PAGE_MARGIN + 3, rowY);
    doc.text(row.value, rightX - 3, rowY, { align: 'right' });
  });
}

function addFooter(doc: jsPDF): void {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'PARTEQUIPOS MAQUINARIA · Fluidos/repuestos sin precio SAP · Una página · Calculadora preventiva',
    PAGE_MARGIN,
    FOOTER_Y
  );
}

function renderQuotePdf(doc: JsPdfWithAutoTable, input: QuotePdfInput, logoDataUrl: string | null, fontSize: number): void {
  const layout = resolveLayoutMetrics(input.quote, fontSize);

  addHeader(doc, logoDataUrl, input);

  const afterActivities = addActivitiesBlock(doc, input.quote, layout);
  const suppliesY = afterActivities + 3;
  addFluidsBlock(doc, input.quote, layout, suppliesY);
  addPartsBlock(doc, input.quote, layout, suppliesY);

  addCostSummary(doc, input.quote, layout.costStartY);
  addFooter(doc);
}

function buildSinglePagePdf(input: QuotePdfInput, logoDataUrl: string | null): JsPdfWithAutoTable {
  let fontSize = 7;
  let doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' }) as JsPdfWithAutoTable;

  while (fontSize >= 4) {
    doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' }) as JsPdfWithAutoTable;
    renderQuotePdf(doc, input, logoDataUrl, fontSize);
    if (doc.getNumberOfPages() === 1) break;
    fontSize -= 0.5;
  }

  return doc;
}

/** Genera y descarga el PDF de cotización (una sola página landscape). */
export async function downloadPreventiveQuotePdf(input: QuotePdfInput): Promise<void> {
  const logoDataUrl = await fetchImageDataUrl(PARTEQUIPOS_LOGO_URL);
  const doc = buildSinglePagePdf(input, logoDataUrl);

  const stamp = new Date().toISOString().slice(0, 10);
  const fileName = `cotizacion-${sanitizeFilePart(input.quote.brand)}-${sanitizeFilePart(input.quote.model)}-${stamp}.pdf`;
  doc.save(fileName);
}
