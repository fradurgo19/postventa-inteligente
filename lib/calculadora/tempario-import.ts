import type { TemparioTipoItem, MaintenanceFrequencyHours } from '@/types/database';

const VALID_FREQ: MaintenanceFrequencyHours[] = [250, 1000, 2000, 4000, 5000];

/** Encabezados exactos del Excel TEMPARIOS MANTENIMIENTOS (orden de negocio). */
export const TEMPARIO_EXCEL_HEADERS = [
  'Marca',
  'Linea',
  'Modelo',
  'Tipo de item',
  'Item',
  'Unidad de medida',
  'Cantidad',
  'Frecuencia (horas)',
  'Aceite Homologado',
  'Referencia Genuina',
  'REF SAP DISPEL',
  'REF SAP ORIGINAl',
  'Referencia Stal',
  'Referencia Fleetguard',
  'Referencia Donalson',
  'Tiempo (horas)',
  'Procedimiento',
  'Avisos Claves',
  'ID',
  'TipoItem',
  'Modificado',
  'Creado',
  'Creado por',
  'Modificado por',
] as const;

export interface TemparioImportRow {
  legacy_id: number | null;
  marca: string;
  linea: string;
  modelo: string;
  tipo_item: TemparioTipoItem;
  tipo_catalogo: string | null;
  item: string;
  unidad_medida: string;
  cantidad: number;
  frecuencia_horas: MaintenanceFrequencyHours;
  aceite_homologado: string | null;
  referencia_genuina: string | null;
  ref_sap_dispel: string | null;
  ref_sap_original: string | null;
  referencia_stal: string | null;
  referencia_fleetguard: string | null;
  referencia_donaldson: string | null;
  tiempo_horas: number;
  procedimiento: string | null;
  avisos_claves: string | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string;
  updated_by: string;
  activo: boolean;
}

export interface TemparioImportParseResult {
  rows: TemparioImportRow[];
  errors: Array<{ row: number; message: string }>;
}

function normalizeHeader(header: string): string {
  return header
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function cellToString(value: unknown): string {
  if (value == null) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return String(value).trim();
}

function getField(row: Record<string, string>, ...keys: string[]): string {
  const normalizedEntries = Object.entries(row).map(([k, v]) => [normalizeHeader(k), v] as const);
  for (const key of keys) {
    const target = normalizeHeader(key);
    const found = normalizedEntries.find(([k]) => k === target);
    if (found && found[1] !== '') return found[1].trim();
  }
  return '';
}

/** Cantidades/horas: acepta 1,5 / 1.5 / 1.234,56 / 250 */
function toNumber(value: string, fallback = 0): number {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;

  let normalized = trimmed.replace(/\s/g, '');
  if (normalized.includes(',') && normalized.includes('.')) {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else if (normalized.includes(',')) {
    normalized = normalized.replace(',', '.');
  }

  const n = Number(normalized.replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Fechas del Excel: "7/31/2024 7:58 AM", ISO, o serial.
 */
export function parseExcelDateTime(value: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || /^n\/?a$/i.test(trimmed)) return null;

  const asNumber = Number(trimmed);
  if (Number.isFinite(asNumber) && asNumber > 20000 && asNumber < 80000) {
    // Serial Excel → días desde 1899-12-30
    const utc = Date.UTC(1899, 11, 30) + asNumber * 86400000;
    return new Date(utc).toISOString();
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  // MM/DD/YYYY h:mm AM/PM
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})\s*(AM|PM))?$/i.exec(
    trimmed
  );
  if (m) {
    let hours = m[4] ? Number(m[4]) : 0;
    const minutes = m[5] ? Number(m[5]) : 0;
    const ampm = (m[6] ?? '').toUpperCase();
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    const d = new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]), hours, minutes);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  return null;
}

/**
 * Columna "Tipo de item" (Power Apps / Excel):
 * Repuesto | Fluido | Consumible | Actividad | Servicio
 */
export function normalizeTipoItem(raw: string): TemparioTipoItem {
  const v = raw.trim().toLowerCase();
  if (!v) return 'Repuesto';
  if (v === 'repuesto' || v.startsWith('repues')) return 'Repuesto';
  if (v === 'fluido' || v.startsWith('fluid')) return 'Fluido';
  if (v === 'consumible' || v.startsWith('consum')) return 'Consumible';
  if (v === 'actividad' || v.startsWith('activ')) return 'Actividad';
  if (v === 'servicio' || v.startsWith('serv')) return 'Servicio';
  return 'Repuesto';
}

function normalizeFrecuencia(raw: number): MaintenanceFrequencyHours {
  if (VALID_FREQ.includes(raw as MaintenanceFrequencyHours)) {
    return raw as MaintenanceFrequencyHours;
  }
  let best: MaintenanceFrequencyHours = 250;
  let bestDiff = Number.POSITIVE_INFINITY;
  for (const f of VALID_FREQ) {
    const d = Math.abs(f - raw);
    if (d < bestDiff) {
      best = f;
      bestDiff = d;
    }
  }
  return best;
}

function textOrNull(value: string): string | null {
  const v = value.trim();
  return v ? v : null;
}

/**
 * Mapea una fila del Excel TEMPARIOS MANTENIMIENTOS al registro de BD.
 * Ejemplo:
 * Case | Minicargador | SR175B | Repuesto | Filtro aceite motor | … | ID 11451 | TipoItem Filtro
 */
export function mapTemparioSheetRow(
  row: Record<string, string>,
  createdBy: string
): TemparioImportRow {
  const tipoDeItem = getField(row, 'Tipo de item', 'tipo_item', 'Tipo de ítem');
  const tipoCatalogo = textOrNull(getField(row, 'TipoItem', 'tipo_item_catalogo', 'Tipo Item'));

  const freqRaw = toNumber(
    getField(row, 'Frecuencia (horas)', 'frecuencia_horas', 'Frecuencia'),
    250
  );
  const legacyRaw = getField(row, 'ID', 'Id', 'legacy_id', 'id_legacy');
  const legacyParsed = legacyRaw ? Math.trunc(toNumber(legacyRaw, 0)) : 0;
  const legacyId = legacyParsed > 0 ? legacyParsed : null;

  const creadoPor =
    textOrNull(getField(row, 'Creado por', 'created_by', 'Creado Por')) ?? createdBy;
  const modificadoPor =
    textOrNull(getField(row, 'Modificado por', 'updated_by', 'Modificado Por')) ?? createdBy;

  const creado = parseExcelDateTime(getField(row, 'Creado', 'created_at', 'Fecha creado'));
  const modificado = parseExcelDateTime(
    getField(row, 'Modificado', 'updated_at', 'Fecha modificado')
  );

  const procedimientoRaw = getField(row, 'Procedimiento', 'procedimiento');
  const avisosRaw = getField(row, 'Avisos Claves', 'avisos_claves');

  return {
    legacy_id: legacyId,
    marca: getField(row, 'Marca', 'marca'),
    linea: getField(row, 'Linea', 'Línea', 'linea') || '',
    modelo: getField(row, 'Modelo', 'modelo'),
    tipo_item: normalizeTipoItem(tipoDeItem || 'Repuesto'),
    tipo_catalogo: tipoCatalogo,
    item: getField(row, 'Item', 'item', 'Nombre'),
    unidad_medida: getField(row, 'Unidad de medida', 'unidad_medida') || 'Unidad',
    cantidad: toNumber(getField(row, 'Cantidad', 'cantidad'), 1),
    frecuencia_horas: normalizeFrecuencia(freqRaw),
    aceite_homologado: textOrNull(getField(row, 'Aceite Homologado', 'aceite_homologado')),
    referencia_genuina: textOrNull(getField(row, 'Referencia Genuina', 'referencia_genuina')),
    ref_sap_dispel: textOrNull(getField(row, 'REF SAP DISPEL', 'ref_sap_dispel')),
    ref_sap_original: textOrNull(
      getField(row, 'REF SAP ORIGINAl', 'REF SAP ORIGINAL', 'ref_sap_original')
    ),
    referencia_stal: textOrNull(getField(row, 'Referencia Stal', 'referencia_stal')),
    referencia_fleetguard: textOrNull(
      getField(row, 'Referencia Fleetguard', 'referencia_fleetguard')
    ),
    referencia_donaldson: textOrNull(
      getField(row, 'Referencia Donalson', 'Referencia Donaldson', 'referencia_donaldson')
    ),
    tiempo_horas: toNumber(getField(row, 'Tiempo (horas)', 'tiempo_horas'), 0),
    procedimiento: textOrNull(procedimientoRaw),
    avisos_claves: textOrNull(avisosRaw),
    created_at: creado,
    updated_at: modificado ?? creado,
    created_by: creadoPor,
    updated_by: modificadoPor,
    activo: true,
  };
}

function parseCsvText(text: string): Record<string, string>[] {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);

  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = (values[idx] ?? '').trim();
    });
    rows.push(row);
  }

  return rows;
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * Parsea Excel/CSV en el navegador y valida filas de tempario.
 */
export async function parseTemparioFile(
  file: File,
  createdBy: string
): Promise<TemparioImportParseResult> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  let sheetRows: Record<string, string>[] = [];

  if (ext === 'csv' || ext === 'txt') {
    const text = await file.text();
    sheetRows = parseCsvText(text);
  } else if (ext === 'xlsx' || ext === 'xls') {
    const XLSX = await import('xlsx');
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return { rows: [], errors: [{ row: 0, message: 'El archivo no tiene hojas' }] };
    }
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
      raw: false,
    });
    sheetRows = json.map((row) => {
      const out: Record<string, string> = {};
      Object.entries(row).forEach(([key, value]) => {
        out[String(key).trim()] = cellToString(value);
      });
      return out;
    });
  } else {
    return {
      rows: [],
      errors: [{ row: 0, message: 'Formato no soportado. Use .xlsx, .xls o .csv' }],
    };
  }

  const rows: TemparioImportRow[] = [];
  const errors: Array<{ row: number; message: string }> = [];

  sheetRows.forEach((raw, index) => {
    const excelRow = index + 2;
    try {
      const mapped = mapTemparioSheetRow(raw, createdBy);
      if (!mapped.marca || !mapped.modelo || !mapped.item) {
        throw new Error('Marca, Modelo e Item son obligatorios');
      }
      rows.push(mapped);
    } catch (err) {
      errors.push({
        row: excelRow,
        message: err instanceof Error ? err.message : 'Fila inválida',
      });
    }
  });

  return { rows, errors };
}
