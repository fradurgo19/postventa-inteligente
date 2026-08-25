import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { PreventiveQuoteResult, TelemetriaEquipo } from '@/types/database';
import { FRECUENCIA_LABELS } from '@/lib/maintenance-frequency';

/** Logo oficial PARTEQUIPOS MAQUINARIA (Cloudinary). */
export const PARTEQUIPOS_LOGO_URL =
  'https://res.cloudinary.com/dbufrzoda/image/upload/v1750457354/Captura_de_pantalla_2025-06-20_170819_wzmyli.png';

const BRAND_RGB = { r: 207, g: 27, b: 34 } as const;
const PAGE_MARGIN = 14;
const CONTENT_WIDTH = 182;

export interface QuotePdfInput {
  quote: PreventiveQuoteResult;
  travelTimeHours?: number;
  selectedMachine?: TelemetriaEquipo | null;
}

interface JsPdfWithAutoTable extends jsPDF {
  lastAutoTable?: { finalY: number };
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
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('No se pudo leer el logo'));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function nextY(doc: JsPdfWithAutoTable, fallback: number, gap = 8): number {
  const y = doc.lastAutoTable?.finalY;
  return (y != null ? y : fallback) + gap;
}

function ensurePage(doc: JsPdfWithAutoTable, y: number, needed = 24): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - PAGE_MARGIN) {
    doc.addPage();
    return PAGE_MARGIN + 4;
  }
  return y;
}

function drawSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(BRAND_RGB.r, BRAND_RGB.g, BRAND_RGB.b);
  doc.text(title, PAGE_MARGIN, y);
  doc.setDrawColor(BRAND_RGB.r, BRAND_RGB.g, BRAND_RGB.b);
  doc.setLineWidth(0.4);
  doc.line(PAGE_MARGIN, y + 2, PAGE_MARGIN + CONTENT_WIDTH, y + 2);
  doc.setTextColor(30, 41, 59);
  return y + 8;
}

function addHeader(doc: jsPDF, logoDataUrl: string | null): number {
  let y = PAGE_MARGIN;

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', PAGE_MARGIN, y, 48, 16);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(BRAND_RGB.r, BRAND_RGB.g, BRAND_RGB.b);
    doc.text('PARTEQUIPOS MAQUINARIA', PAGE_MARGIN, y + 10);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  const rightX = PAGE_MARGIN + CONTENT_WIDTH;
  doc.text('Plataforma de Posventa Inteligente', rightX, y + 4, { align: 'right' });
  doc.text('Cotización de Mantenimiento Preventivo', rightX, y + 10, { align: 'right' });
  doc.text(`Generado: ${formatDateEs(new Date())}`, rightX, y + 16, { align: 'right' });

  y += 22;
  doc.setDrawColor(BRAND_RGB.r, BRAND_RGB.g, BRAND_RGB.b);
  doc.setLineWidth(0.6);
  doc.line(PAGE_MARGIN, y, PAGE_MARGIN + CONTENT_WIDTH, y);

  return y + 8;
}

function addEquipmentSection(
  doc: JsPdfWithAutoTable,
  input: QuotePdfInput,
  startY: number
): number {
  let y = drawSectionTitle(doc, 'Datos del equipo', startY);
  const { quote, travelTimeHours, selectedMachine } = input;

  const serial = selectedMachine?.serie ?? quote.serialNumber;
  const client = selectedMachine?.titulo ?? '—';
  const sede = selectedMachine?.sede ?? selectedMachine?.ciudad ?? '—';
  const frecuencias = quote.frecuenciasAplicadas
    .map((f) => FRECUENCIA_LABELS[f]?.replace('Mantenimiento ', `${f} h`) ?? `${f} h`)
    .join(', ');

  autoTable(doc, {
    startY: y,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 1.8, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 42, textColor: [100, 116, 139] },
      1: { cellWidth: 49 },
      2: { fontStyle: 'bold', cellWidth: 42, textColor: [100, 116, 139] },
      3: { cellWidth: 49 },
    },
    body: [
      ['Marca', quote.brand, 'Modelo', quote.model],
      ['Serie', serial, 'Horómetro', `${quote.hours.toLocaleString('es-CO')} h`],
      ['Cliente', client, 'Sede / Ciudad', sede],
      ['Km trayecto', `${quote.kilometers.toLocaleString('es-CO')} km`, 'Tiempo viaje', `${travelTimeHours ?? 0} h`],
      ['Frecuencias', frecuencias, 'Tarifa MO', `${formatCOP(quote.laborRate)}/h`],
    ],
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
  });

  return nextY(doc, y, 10);
}

function addActivitiesTable(doc: JsPdfWithAutoTable, quote: PreventiveQuoteResult, startY: number): number {
  if (quote.activities.length === 0) return startY;

  let y = ensurePage(doc, drawSectionTitle(doc, 'Actividades', startY));

  autoTable(doc, {
    startY: y,
    head: [['Freq. (h)', 'Actividad', 'Código SAMM', 'Tiempo (h)', 'Mano de obra']],
    body: [
      ...quote.activities.map((act) => [
        String(act.frecuenciaHoras ?? '—'),
        act.activity,
        act.codigoSamm || '—',
        act.laborHours.toFixed(2),
        formatCOP(act.subtotal),
      ]),
      [
        { content: 'Total mano de obra', colSpan: 3, styles: { fontStyle: 'bold' } },
        { content: quote.laborHoursTotal.toFixed(2), styles: { fontStyle: 'bold', halign: 'right' } },
        { content: formatCOP(quote.costs.labor), styles: { fontStyle: 'bold', halign: 'right' } },
      ],
    ],
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: {
      fillColor: [BRAND_RGB.r, BRAND_RGB.g, BRAND_RGB.b],
      textColor: 255,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { halign: 'right', cellWidth: 18 },
      3: { halign: 'right', cellWidth: 22 },
      4: { halign: 'right', cellWidth: 32 },
    },
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
  });

  return nextY(doc, y, 10);
}

function addFluidsTable(doc: JsPdfWithAutoTable, quote: PreventiveQuoteResult, startY: number): number {
  if (quote.fluids.length === 0) return startY;

  let y = ensurePage(doc, drawSectionTitle(doc, 'Fluidos', startY), 30);

  autoTable(doc, {
    startY: y,
    head: [['Freq. (h)', 'Fluido', 'Cant.', 'Unidad', 'Ref. genuina', 'REF SAP DISPEL']],
    body: quote.fluids.map((f) => [
      String(f.frecuenciaHoras ?? '—'),
      f.item,
      String(f.quantity),
      f.unit ?? '—',
      textOrDash(f.referenciaGenuina),
      textOrDash(f.refSapDispel),
    ]),
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: {
      fillColor: [22, 163, 74],
      textColor: 255,
      fontStyle: 'bold',
    },
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
  });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Fluidos: listado de tempario. Valores monetarios pendientes de integración SAP.',
    PAGE_MARGIN,
    nextY(doc, y, 4)
  );

  return nextY(doc, y, 12);
}

function addPartsTable(doc: JsPdfWithAutoTable, quote: PreventiveQuoteResult, startY: number): number {
  if (quote.parts.length === 0) return startY;

  let y = ensurePage(doc, drawSectionTitle(doc, 'Repuestos', startY), 30);

  autoTable(doc, {
    startY: y,
    head: [['Freq. (h)', 'Código', 'Descripción', 'Cant.', 'Unidad']],
    body: quote.parts.map((p) => [
      String(p.frecuenciaHoras ?? '—'),
      p.sapCode || '—',
      p.description,
      String(p.quantity),
      p.unit ?? '—',
    ]),
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      fontStyle: 'bold',
    },
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
  });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Repuestos: listado de tempario. Valores monetarios pendientes de integración SAP.',
    PAGE_MARGIN,
    nextY(doc, y, 4)
  );

  return nextY(doc, y, 12);
}

function addCostSummary(doc: JsPdfWithAutoTable, quote: PreventiveQuoteResult, startY: number): number {
  let y = ensurePage(doc, drawSectionTitle(doc, 'Resumen de costos', startY), 48);

  autoTable(doc, {
    startY: y,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { halign: 'right', fontStyle: 'bold' },
    },
    body: [
      ['Mano de obra', formatCOP(quote.costs.labor)],
      ['Viaje / desplazamiento', formatCOP(quote.costs.travel)],
      ['Subtotal', formatCOP(quote.costs.subtotal)],
      ['IVA (19%)', formatCOP(quote.costs.vat)],
      [{ content: 'TOTAL', styles: { fontStyle: 'bold', textColor: [180, 83, 9] } }, formatCOP(quote.costs.total)],
    ],
    margin: { left: PAGE_MARGIN + 80, right: PAGE_MARGIN },
  });

  return nextY(doc, y, 10);
}

function addFooter(doc: jsPDF): void {
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'PARTEQUIPOS MAQUINARIA · Documento informativo generado desde la calculadora de mantenimiento preventivo.',
      PAGE_MARGIN,
      pageHeight - 8
    );
    doc.text(`Página ${page} de ${pageCount}`, PAGE_MARGIN + CONTENT_WIDTH, pageHeight - 8, {
      align: 'right',
    });
  }
}

/** Genera y descarga el PDF de la cotización preventiva. */
export async function downloadPreventiveQuotePdf(input: QuotePdfInput): Promise<void> {
  const logoDataUrl = await fetchImageDataUrl(PARTEQUIPOS_LOGO_URL);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as JsPdfWithAutoTable;

  let y = addHeader(doc, logoDataUrl);
  y = addEquipmentSection(doc, input, y);
  y = addActivitiesTable(doc, input.quote, y);
  y = addFluidsTable(doc, input.quote, y);
  y = addPartsTable(doc, input.quote, y);
  addCostSummary(doc, input.quote, y);
  addFooter(doc);

  const stamp = new Date().toISOString().slice(0, 10);
  const fileName = `cotizacion-${sanitizeFilePart(input.quote.brand)}-${sanitizeFilePart(input.quote.model)}-${stamp}.pdf`;
  doc.save(fileName);
}
