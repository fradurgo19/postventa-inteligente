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
const PAGE_HEIGHT = 297;
const FOOTER_Y = PAGE_HEIGHT - 10;

export interface QuotePdfInput {
  quote: PreventiveQuoteResult;
  travelTimeHours?: number;
  selectedMachine?: TelemetriaEquipo | null;
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
  doc: jsPDF,
  input: QuotePdfInput,
  startY: number
): number {
  const y = drawSectionTitle(doc, 'Datos del equipo', startY);
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
      [
        'Km trayecto',
        `${quote.kilometers.toLocaleString('es-CO')} km`,
        'Tiempo viaje',
        `${travelTimeHours ?? 0} h`,
      ],
      ['Frecuencias', frecuencias, 'Tarifa MO', `${formatCOP(quote.laborRate)}/h`],
    ],
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    pageBreak: 'avoid',
  });

  const finalY =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 40;
  return finalY + 10;
}

/** Resumen de costos en texto (evita tablas que desbordan o ocultan valores). */
function addCostSummary(doc: jsPDF, quote: PreventiveQuoteResult, startY: number): number {
  const y = drawSectionTitle(doc, 'Resumen de costos', startY);
  const labor = quote.costs.labor;
  const travel = quote.costs.travel;
  const subtotal = quote.costs.subtotal;
  const rightX = PAGE_MARGIN + CONTENT_WIDTH;
  const labelX = PAGE_MARGIN + 4;
  const boxTop = y + 2;
  const rowH = 9;
  const rows = [
    { label: 'Total mano de obra', value: formatCOP(labor), bold: false },
    { label: 'Total desplazamiento', value: formatCOP(travel), bold: false },
    { label: 'Total (mano de obra + desplazamiento)', value: formatCOP(subtotal), bold: true },
  ];

  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(PAGE_MARGIN, boxTop, CONTENT_WIDTH, rows.length * rowH + 6, 2, 2, 'FD');

  rows.forEach((row, index) => {
    const rowY = boxTop + 6 + index * rowH;
    doc.setFont('helvetica', row.bold ? 'bold' : 'normal');
    doc.setFontSize(row.bold ? 11 : 10);
    doc.setTextColor(row.bold ? BRAND_RGB.r : 51, row.bold ? BRAND_RGB.g : 65, row.bold ? BRAND_RGB.b : 85);
    doc.text(row.label, labelX, rowY);
    doc.text(row.value, rightX - 4, rowY, { align: 'right' });
  });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Fluidos y repuestos: listado informativo sin precio SAP. IVA no incluido en este resumen.',
    PAGE_MARGIN,
    boxTop + rows.length * rowH + 12
  );

  return boxTop + rows.length * rowH + 18;
}

function addActivityCounts(doc: jsPDF, quote: PreventiveQuoteResult, startY: number): number {
  if (startY > FOOTER_Y - 24) return startY;

  const y = drawSectionTitle(doc, 'Detalle del cálculo', startY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(
    [
      `Actividades: ${quote.activities.length}`,
      `Fluidos: ${quote.fluids.length}`,
      `Repuestos: ${quote.parts.length}`,
      `Horas MO: ${quote.laborHoursTotal.toFixed(2)} h`,
    ].join('  ·  '),
    PAGE_MARGIN,
    y + 2
  );
  return y + 10;
}

function addFooter(doc: jsPDF): void {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'PARTEQUIPOS MAQUINARIA · Cotización generada desde la calculadora de mantenimiento preventivo.',
    PAGE_MARGIN,
    FOOTER_Y
  );
}

/** Genera y descarga el PDF de cotización (una sola página). */
export async function downloadPreventiveQuotePdf(input: QuotePdfInput): Promise<void> {
  const logoDataUrl = await fetchImageDataUrl(PARTEQUIPOS_LOGO_URL);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  let y = addHeader(doc, logoDataUrl);
  y = addEquipmentSection(doc, input, y);
  y = addActivityCounts(doc, input.quote, y);
  addCostSummary(doc, input.quote, y);
  addFooter(doc);

  const stamp = new Date().toISOString().slice(0, 10);
  const fileName = `cotizacion-${sanitizeFilePart(input.quote.brand)}-${sanitizeFilePart(input.quote.model)}-${stamp}.pdf`;
  doc.save(fileName);
}
