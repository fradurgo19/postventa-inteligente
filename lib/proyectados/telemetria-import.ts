/**
 * Parseo / mapeo del Excel mensual de telemetría → entidades + telemetria_equipos.
 * Encabezados reales empiezan en "Nombre del cliente".
 */

export const TELEMETRIA_EXCEL_COLUMNS = [
  'Nombre del cliente',
  'email',
  'Nit',
  'Telefono',
  'Serie.',
  'Modelo',
  'Horometro',
  'Promedio_h',
  'Ciudad',
  'Última fecha/hora de común',
  'Latitud',
  'Longitud',
  'Dias Primer Mtto',
  'Proximo Primer Mtto',
  'Dias Segundo Mtto',
  'Proximo Segundo Mtto',
  'Dias Tercer Mtto',
  'Proximo Tercer Mtto',
  'Fecha Primer Mtto',
  'Fecha Segundo Mtto',
  'Fecha Tercer Mtto',
  'Distancia Bogota',
  'Distancia Medellin',
  'Distacia Barranquilla',
  'Distancia Monteria',
  'Distancia Cali',
  'Distancia Bucaramanga',
  'Distancia Ibague',
  'Distancia Istmina',
  'Distacia Minima',
  'Sede',
  'ASESOR',
  'Asesor2',
  'Marca',
  'Tipo Mtto',
  'N° serie',
  'Tipo Cliente',
  'Estado',
  'Estado2',
  'Detalle',
  'Observaciones',
  'Reenviar Correo',
  'Creado',
  'MesCreado',
  'Correo',
  'Año',
  'TipoDeMaquina',
] as const;

export const TELEMETRIA_TEMPLATE_FILENAME = 'plantilla_telemetria_proyectados.xlsx';

export interface TelemetriaMappedRow {
  titulo: string | null;
  email: string | null;
  nit: string | null;
  telefono: string | null;
  serie: string;
  modelo: string;
  horometro: number;
  promedio_h: number | null;
  ciudad: string | null;
  ultima_fecha_comunicacion: string | null;
  latitud: number | null;
  longitud: number | null;
  dias_primer_mtto: number | null;
  proximo_primer_mtto: number | null;
  dias_segundo_mtto: number | null;
  proximo_segundo_mtto: number | null;
  dias_tercer_mtto: number | null;
  proximo_tercer_mtto: number | null;
  fecha_primer_mtto: string | null;
  fecha_segundo_mtto: string | null;
  fecha_tercer_mtto: string | null;
  distancia_bogota: number | null;
  distancia_medellin: number | null;
  distancia_barranquilla: number | null;
  distancia_monteria: number | null;
  distancia_cali: number | null;
  distancia_bucaramanga: number | null;
  distancia_ibague: number | null;
  distancia_istmina: number | null;
  distancia_minima: number | null;
  sede: string | null;
  asesor_email: string | null;
  asesor_secundario_email: string | null;
  marca: string;
  tipo_mtto: number | null;
  numero_serie: string | null;
  tipo_oportunidad: string | null;
  estado: string;
  estado2: string | null;
  detalle: string | null;
  observaciones: string | null;
  reenviar_correo: boolean;
  mes_creado: string | null;
  correo_enviado: string | null;
  anio: number | null;
  tipo_maquina: string | null;
  created_by: string;
}

export interface TelemetriaParseResult {
  rows: TelemetriaMappedRow[];
  errors: Array<{ row: number; message: string }>;
}

function normalizeHeader(header: string): string {
  return header
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function getField(row: Record<string, string>, ...aliases: string[]): string {
  for (const alias of aliases) {
    const direct = row[alias];
    if (direct != null && String(direct).trim()) return String(direct).trim();
  }
  const wanted = aliases.map(normalizeHeader);
  for (const [key, value] of Object.entries(row)) {
    if (wanted.includes(normalizeHeader(key)) && String(value).trim()) {
      return String(value).trim();
    }
  }
  return '';
}

/** Trata #N/D / N/D / vacío como ausente. */
export function cleanCell(value: string | null | undefined): string | null {
  const v = (value ?? '').trim();
  if (!v) return null;
  const upper = v.toUpperCase();
  if (upper === '#N/D' || upper === 'N/D' || upper === 'ND' || upper === '-' || upper === 'NULL') {
    return null;
  }
  return v;
}

function toNumber(raw: string, fallback = 0): number {
  if (!raw) return fallback;
  const cleaned = raw.replace(/\s/g, '').replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : fallback;
}

function toNumberOrNull(raw: string): number | null {
  const v = cleanCell(raw);
  if (v == null) return null;
  const n = toNumber(v, NaN);
  return Number.isFinite(n) ? n : null;
}

function parseBool(raw: string): boolean {
  const v = (cleanCell(raw) ?? '').toLowerCase();
  return v === 'true' || v === 'verdadero' || v === '1' || v === 'si' || v === 'sí' || v === 'x';
}

/** Fecha Excel DD/MM/YYYY o ISO → YYYY-MM-DD */
function parseDateOnly(raw: string): string | null {
  const v = cleanCell(raw);
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);

  const m = v.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (m) {
    const d = m[1].padStart(2, '0');
    const mo = m[2].padStart(2, '0');
    let y = m[3];
    if (y.length === 2) y = `20${y}`;
    return `${y}-${mo}-${d}`;
  }
  const dt = Date.parse(v);
  if (!Number.isNaN(dt)) return new Date(dt).toISOString().slice(0, 10);
  return null;
}

/** Fecha/hora → ISO o null */
function parseDateTime(raw: string): string | null {
  const v = cleanCell(raw);
  if (!v) return null;
  const dateOnly = parseDateOnly(v);
  if (dateOnly && !v.includes(':') && v.length <= 10) {
    return `${dateOnly}T00:00:00.000Z`;
  }
  // DD/MM/YYYY H:mm
  const m = v.match(
    /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/
  );
  if (m) {
    let y = m[3];
    if (y.length === 2) y = `20${y}`;
    const iso = `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}T${(m[4] ?? '0').padStart(2, '0')}:${(m[5] ?? '0').padStart(2, '0')}:${(m[6] ?? '0').padStart(2, '0')}.000Z`;
    return iso;
  }
  const dt = Date.parse(v);
  if (!Number.isNaN(dt)) return new Date(dt).toISOString();
  return dateOnly ? `${dateOnly}T00:00:00.000Z` : null;
}

function isValidEmail(value: string | null): value is string {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function mapTelemetriaSheetRow(
  row: Record<string, string>,
  createdBy: string
): TelemetriaMappedRow {
  const serie =
    cleanCell(getField(row, 'Serie.', 'Serie', 'serie', 'N° serie', 'Nº serie', 'numero_serie')) ??
    '';
  const modelo = cleanCell(getField(row, 'Modelo', 'modelo')) ?? '';
  const marca = cleanCell(getField(row, 'Marca', 'marca')) ?? '';

  if (!serie || !modelo || !marca) {
    throw new Error('Serie, Modelo y Marca son obligatorios');
  }

  const emailCliente = cleanCell(getField(row, 'email', 'Email', 'E-mail'));
  const correoFlag = cleanCell(getField(row, 'Correo', 'correo_enviado'));
  const asesorRaw = cleanCell(getField(row, 'ASESOR', 'Asesor', 'asesor_email'));
  const asesor2Raw = cleanCell(getField(row, 'Asesor2', 'ASESOR 2', 'Asesor 2', 'asesor_secundario'));

  const asesorEmail = isValidEmail(asesorRaw)
    ? asesorRaw
    : isValidEmail(asesor2Raw)
      ? asesor2Raw
      : null;
  const asesorSecundario = isValidEmail(asesor2Raw) ? asesor2Raw : null;

  const numeroSerie =
    cleanCell(getField(row, 'N° serie', 'Nº serie', 'numero_serie')) ?? serie;

  return {
    titulo: cleanCell(
      getField(row, 'Nombre del cliente', 'Nombre del Cliente', 'Título', 'Titulo', 'titulo')
    ),
    email: isValidEmail(emailCliente) ? emailCliente : null,
    nit: cleanCell(getField(row, 'Nit', 'NIT', 'nit')),
    telefono: cleanCell(getField(row, 'Telefono', 'Teléfono', 'telefono')),
    serie,
    modelo,
    horometro: toNumber(getField(row, 'Horometro', 'Horómetro', 'horometro'), 0),
    promedio_h: toNumberOrNull(getField(row, 'Promedio_h', 'Promedio h', 'promedio_h')),
    ciudad: cleanCell(getField(row, 'Ciudad', 'ciudad')),
    ultima_fecha_comunicacion: parseDateTime(
      getField(
        row,
        'Última fecha/hora de común',
        'Ultima fecha/hora de comun',
        'Última fecha/hora de comun',
        'ultima_fecha_comunicacion'
      )
    ),
    latitud: toNumberOrNull(getField(row, 'Latitud', 'latitud')),
    longitud: toNumberOrNull(getField(row, 'Longitud', 'longitud')),
    dias_primer_mtto: toNumberOrNull(getField(row, 'Dias Primer Mtto', 'dias_primer_mtto')),
    proximo_primer_mtto: toNumberOrNull(
      getField(row, 'Proximo Primer Mtto', 'Próximo Primer Mtto', 'proximo_primer_mtto')
    ),
    dias_segundo_mtto: toNumberOrNull(getField(row, 'Dias Segundo Mtto', 'dias_segundo_mtto')),
    proximo_segundo_mtto: toNumberOrNull(
      getField(row, 'Proximo Segundo Mtto', 'Próximo Segundo Mtto', 'proximo_segundo_mtto')
    ),
    dias_tercer_mtto: toNumberOrNull(getField(row, 'Dias Tercer Mtto', 'dias_tercer_mtto')),
    proximo_tercer_mtto: toNumberOrNull(
      getField(row, 'Proximo Tercer Mtto', 'Próximo Tercer Mtto', 'proximo_tercer_mtto')
    ),
    fecha_primer_mtto: parseDateOnly(getField(row, 'Fecha Primer Mtto', 'fecha_primer_mtto')),
    fecha_segundo_mtto: parseDateOnly(getField(row, 'Fecha Segundo Mtto', 'fecha_segundo_mtto')),
    fecha_tercer_mtto: parseDateOnly(getField(row, 'Fecha Tercer Mtto', 'fecha_tercer_mtto')),
    distancia_bogota: toNumberOrNull(getField(row, 'Distancia Bogota', 'Distancia Bogotá')),
    distancia_medellin: toNumberOrNull(getField(row, 'Distancia Medellin', 'Distancia Medellín')),
    distancia_barranquilla: toNumberOrNull(
      getField(row, 'Distacia Barranquilla', 'Distancia Barranquilla')
    ),
    distancia_monteria: toNumberOrNull(getField(row, 'Distancia Monteria', 'Distancia Montería')),
    distancia_cali: toNumberOrNull(getField(row, 'Distancia Cali')),
    distancia_bucaramanga: toNumberOrNull(getField(row, 'Distancia Bucaramanga')),
    distancia_ibague: toNumberOrNull(getField(row, 'Distancia Ibague', 'Distancia Ibagué')),
    distancia_istmina: toNumberOrNull(getField(row, 'Distancia Istmina')),
    distancia_minima: toNumberOrNull(getField(row, 'Distacia Minima', 'Distancia Minima', 'Distancia Mínima')),
    sede: cleanCell(getField(row, 'Sede', 'sede')),
    asesor_email: asesorEmail,
    asesor_secundario_email: asesorSecundario,
    marca,
    tipo_mtto: toNumberOrNull(getField(row, 'Tipo Mtto', 'tipo_mtto')),
    numero_serie: numeroSerie,
    tipo_oportunidad: cleanCell(getField(row, 'Tipo Cliente', 'tipo_oportunidad', 'Tipo Oportunidad')),
    estado: cleanCell(getField(row, 'Estado', 'estado')) ?? 'Pendiente',
    estado2: cleanCell(getField(row, 'Estado2', 'estado2')),
    detalle: cleanCell(getField(row, 'Detalle', 'detalle')),
    observaciones: cleanCell(getField(row, 'Observaciones', 'observaciones')),
    reenviar_correo: parseBool(getField(row, 'Reenviar Correo', 'reenviar_correo')),
    mes_creado: cleanCell(getField(row, 'MesCreado', 'Mes Creado', 'mes_creado')),
    correo_enviado: correoFlag,
    anio: toNumberOrNull(getField(row, 'Año', 'Anio', 'anio')),
    tipo_maquina: cleanCell(getField(row, 'TipoDeMaquina', 'Tipo de Maquina', 'tipo_maquina')),
    created_by: createdBy,
  };
}

export async function parseTelemetriaFile(file: File): Promise<TelemetriaParseResult> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  let rawRows: Record<string, string>[] = [];

  if (ext === 'csv' || ext === 'txt') {
    const text = await file.text();
    rawRows = parseCsv(text);
  } else if (ext === 'xlsx' || ext === 'xls') {
    const XLSX = await import('xlsx');
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return { rows: [], errors: [{ row: 0, message: 'Excel sin hojas' }] };
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
      raw: false,
    });
    rawRows = json.map((row) => {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(row)) {
        out[String(k).trim()] = v == null ? '' : String(v).trim();
      }
      return out;
    });
  } else {
    return {
      rows: [],
      errors: [{ row: 0, message: 'Formato no soportado. Use .xlsx, .xls o .csv' }],
    };
  }

  const rows: TelemetriaMappedRow[] = [];
  const errors: Array<{ row: number; message: string }> = [];

  rawRows.forEach((row, idx) => {
    try {
      rows.push(mapTelemetriaSheetRow(row, 'import'));
    } catch (err) {
      errors.push({
        row: idx + 2,
        message: err instanceof Error ? err.message : 'Fila inválida',
      });
    }
  });

  return { rows, errors };
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, i) => {
      row[header] = (values[i] ?? '').trim();
    });
    return row;
  });
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  result.push(current);
  return result;
}

export async function downloadTelemetriaExcelTemplate(): Promise<void> {
  const XLSX = await import('xlsx');
  const headers = [...TELEMETRIA_EXCEL_COLUMNS];
  const example = headers.map((h) => {
    switch (h) {
      case 'Nombre del cliente':
        return 'EMPRESA EJEMPLO S.A.S';
      case 'email':
        return 'contacto@ejemplo.com';
      case 'Nit':
        return '900000000';
      case 'Telefono':
        return '3000000000';
      case 'Serie.':
        return 'SERIE-EJEMPLO-001';
      case 'Modelo':
        return 'ZX210LC-5B';
      case 'Horometro':
        return '250';
      case 'Promedio_h':
        return '5';
      case 'Ciudad':
        return 'Medellín,Antioquia,Colombia';
      case 'Última fecha/hora de común':
        return '01/08/2026';
      case 'Latitud':
        return '6.24';
      case 'Longitud':
        return '-75.57';
      case 'Dias Primer Mtto':
        return '30';
      case 'Proximo Primer Mtto':
        return '250';
      case 'Fecha Primer Mtto':
        return '01/09/2026';
      case 'Distacia Minima':
        return '10';
      case 'Sede':
        return 'Medellín';
      case 'Asesor2':
        return 'centrodemonitoreo@partequipos.com';
      case 'Marca':
        return 'Hitachi';
      case 'Tipo Mtto':
        return '250';
      case 'N° serie':
        return 'SERIE-EJEMPLO-001';
      case 'Estado':
        return 'Pendiente';
      case 'Reenviar Correo':
        return 'FALSO';
      case 'MesCreado':
        return 'August';
      case 'Año':
        return '2026';
      case 'TipoDeMaquina':
        return 'Otro';
      default:
        return '';
    }
  });

  const sheet = XLSX.utils.aoa_to_sheet([headers, example]);
  sheet['!cols'] = headers.map((h) => ({ wch: Math.min(28, Math.max(12, h.length + 2)) }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'TELEMETRIA');
  XLSX.writeFile(workbook, TELEMETRIA_TEMPLATE_FILENAME);
}
