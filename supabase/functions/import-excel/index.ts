/**
 * Edge Function: import-excel
 * Procesa CSV/Excel (CSV preferido) e inserta en tablas según módulo.
 *
 * Deploy: supabase functions deploy import-excel
 * Invoke: POST /functions/v1/import-excel
 * Body: { modulo, fileName, contentBase64, contentType? }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Modulo = 'calculadora' | 'proyectados' | 'cpp';

interface ImportRequest {
  modulo: Modulo;
  fileName: string;
  contentBase64: string;
  contentType?: string;
}

function decodeBase64(content: string): string {
  const binary = atob(content);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder('utf-8').decode(bytes);
}

function parseCsv(text: string): Record<string, string>[] {
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

function getField(row: Record<string, string>, ...keys: string[]): string {
  const entries = Object.entries(row);
  for (const key of keys) {
    const found = entries.find(([k]) => k.toLowerCase() === key.toLowerCase());
    if (found?.[1]) return found[1];
  }
  return '';
}

function toNumber(value: string, fallback = 0): number {
  if (!value) return fallback;
  const normalized = value.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : fallback;
}

function mapTempario(row: Record<string, string>, createdBy: string) {
  const tipoRaw = getField(row, 'Tipo de item', 'tipo_item', 'TipoItem');
  const tipo = ['Repuesto', 'Consumible', 'Actividad', 'Servicio'].includes(tipoRaw)
    ? tipoRaw
    : 'Repuesto';
  const freq = toNumber(getField(row, 'Frecuencia (horas)', 'frecuencia_horas', 'Frecuencia'), 250);
  const frecuencia = [250, 1000, 2000, 4000, 5000].includes(freq) ? freq : 250;

  return {
    marca: getField(row, 'Marca', 'marca'),
    linea: getField(row, 'Linea', 'linea') || '',
    modelo: getField(row, 'Modelo', 'modelo'),
    tipo_item: tipo,
    item: getField(row, 'Item', 'item', 'Nombre'),
    unidad_medida: getField(row, 'Unidad de medida', 'unidad_medida') || 'Unidad',
    cantidad: toNumber(getField(row, 'Cantidad', 'cantidad'), 1),
    frecuencia_horas: frecuencia,
    aceite_homologado: getField(row, 'Aceite Homologado', 'aceite_homologado') || null,
    referencia_genuina: getField(row, 'Referencia Genuina', 'referencia_genuina') || null,
    ref_sap_dispel: getField(row, 'REF SAP DISPEL', 'ref_sap_dispel') || null,
    ref_sap_original: getField(row, 'REF SAP ORIGINAL', 'ref_sap_original') || null,
    referencia_stal: getField(row, 'Referencia Stal', 'referencia_stal') || null,
    referencia_fleetguard: getField(row, 'Referencia Fleetguard', 'referencia_fleetguard') || null,
    referencia_donaldson: getField(row, 'Referencia Donalson', 'Referencia Donaldson', 'referencia_donaldson') || null,
    tiempo_horas: toNumber(getField(row, 'Tiempo (horas)', 'tiempo_horas'), 0),
    procedimiento: getField(row, 'Procedimiento', 'procedimiento') || null,
    avisos_claves: getField(row, 'Avisos Claves', 'avisos_claves') || null,
    created_by: createdBy,
    updated_by: createdBy,
    activo: true,
  };
}

function mapTelemetria(row: Record<string, string>, createdBy: string) {
  return {
    titulo: getField(row, 'Título', 'Titulo', 'titulo') || null,
    email: getField(row, 'email', 'Correo') || null,
    nit: getField(row, 'Nit', 'nit') || null,
    telefono: getField(row, 'Telefono', 'telefono') || null,
    serie: getField(row, 'Serie.', 'Serie', 'serie', 'N° serie', 'numero_serie'),
    modelo: getField(row, 'Modelo', 'modelo'),
    horometro: toNumber(getField(row, 'Horometro', 'horometro'), 0),
    promedio_h: toNumber(getField(row, 'Promedio_h', 'promedio_h'), 0) || null,
    ciudad: getField(row, 'Ciudad', 'ciudad') || null,
    latitud: toNumber(getField(row, 'Latitud', 'latitud'), 0) || null,
    longitud: toNumber(getField(row, 'Longitud', 'longitud'), 0) || null,
    fecha_primer_mtto: getField(row, 'Fecha Primer Mtto', 'fecha_primer_mtto') || null,
    fecha_segundo_mtto: getField(row, 'Fecha Segundo Mtto', 'fecha_segundo_mtto') || null,
    fecha_tercer_mtto: getField(row, 'Fecha Tercer Mtto', 'fecha_tercer_mtto') || null,
    sede: getField(row, 'Sede', 'sede') || null,
    asesor_email: getField(row, 'Asesor', 'asesor_email', 'ASESOR 2') || null,
    marca: getField(row, 'Marca', 'marca'),
    tipo_mtto: toNumber(getField(row, 'Tipo Mtto', 'tipo_mtto'), 0) || null,
    estado: getField(row, 'Estado', 'estado') || 'Pendiente',
    tipo_maquina: getField(row, 'TipoDeMaquina', 'tipo_maquina') || null,
    created_by: createdBy,
  };
}

function mapCpp(row: Record<string, string>, createdBy: string) {
  return {
    legacy_no: toNumber(getField(row, 'No', 'legacy_no'), 0) || null,
    ref_sap: getField(row, 'RefSAP', 'ref_sap', 'REF SAP'),
    marca: getField(row, 'Marca', 'marca'),
    nombre: getField(row, 'Nombre', 'nombre'),
    cantidad: toNumber(getField(row, 'Cantidad', 'cantidad'), 1),
    frecuencia: getField(row, 'Frecuencia', 'frecuencia') || null,
    medida: getField(row, 'Medida', 'medida') || null,
    comentario: getField(row, 'Comentario', 'comentario') || null,
    modelo: getField(row, 'Modelo', 'modelo'),
    parte: getField(row, 'Parte', 'parte', 'componente') || 'MTTO PREVENTIVO',
    tipo: getField(row, 'Tipo', 'tipo', 'subtipo') || 'FILTRACION',
    imagen_url: getField(row, 'ImagenUrl', 'imagen_url') || null,
    recomendacion: getField(row, 'Recomendación', 'Recomendacion', 'recomendacion') || null,
    equivalencia1: getField(row, 'EQUIVALENCIA1', 'equivalencia1') || null,
    equivalencia2: getField(row, 'EQUIVALENCIA2', 'equivalencia2') || null,
    equivalencia3: getField(row, 'EQUIVALENCIA3', 'equivalencia3') || null,
    referencia_catalogo_original: getField(row, 'REFERENCIACATALOGOORIGINAL', 'referencia_catalogo_original') || null,
    created_by: createdBy,
    updated_by: createdBy,
    activo: true,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Sesión inválida' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: perfil } = await admin
      .from('perfiles')
      .select('rol, email, nombre')
      .eq('id', userData.user.id)
      .maybeSingle();

    const rol = perfil?.rol ?? 'visualizador';
    if (!['administrador', 'coordinador'].includes(rol)) {
      return new Response(JSON.stringify({ error: 'Sin permisos de importación' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as ImportRequest;
    if (!body.modulo || !body.fileName || !body.contentBase64) {
      return new Response(JSON.stringify({ error: 'Payload incompleto' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ext = body.fileName.split('.').pop()?.toLowerCase() ?? '';
    if (!['csv', 'txt'].includes(ext)) {
      return new Response(
        JSON.stringify({
          error: 'Use CSV para importación real. Exporte Excel a CSV (UTF-8) e intente de nuevo.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const text = decodeBase64(body.contentBase64);
    const rows = parseCsv(text);
    const createdBy = perfil?.email ?? userData.user.email ?? 'import';

    let recordsOk = 0;
    let recordsError = 0;
    const errors: Array<{ row: number; message: string }> = [];
    const batch: Record<string, unknown>[] = [];

    rows.forEach((row, index) => {
      try {
        if (body.modulo === 'calculadora') {
          const mapped = mapTempario(row, createdBy);
          if (!mapped.marca || !mapped.modelo || !mapped.item) {
            throw new Error('Marca, Modelo e Item son obligatorios');
          }
          batch.push(mapped);
        } else if (body.modulo === 'proyectados') {
          const mapped = mapTelemetria(row, createdBy);
          if (!mapped.serie || !mapped.modelo || !mapped.marca) {
            throw new Error('Serie, Modelo y Marca son obligatorios');
          }
          batch.push(mapped);
        } else {
          const mapped = mapCpp(row, createdBy);
          if (!mapped.ref_sap || !mapped.marca || !mapped.nombre || !mapped.modelo) {
            throw new Error('RefSAP, Marca, Nombre y Modelo son obligatorios');
          }
          batch.push(mapped);
        }
      } catch (err) {
        recordsError += 1;
        errors.push({
          row: index + 2,
          message: err instanceof Error ? err.message : 'Error de validación',
        });
      }
    });

    const table =
      body.modulo === 'calculadora'
        ? 'temparios_mantenimiento'
        : body.modulo === 'proyectados'
          ? 'telemetria_equipos'
          : 'cpp_catalogo';

    if (batch.length > 0) {
      const { error: insertError } = await admin.from(table).insert(batch);
      if (insertError) {
        return new Response(JSON.stringify({ error: insertError.message, errors }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      recordsOk = batch.length;
    }

    const { data: importRow } = await admin
      .from('importaciones')
      .insert({
        modulo: body.modulo,
        nombre_archivo: body.fileName,
        tipo_archivo: ext,
        registros_total: rows.length,
        registros_ok: recordsOk,
        registros_error: recordsError,
        duplicados: 0,
        estado: recordsError > 0 ? (recordsOk > 0 ? 'parcial' : 'fallido') : 'completado',
        errores_json: errors.slice(0, 50),
        user_id: userData.user.id,
        completed_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    return new Response(
      JSON.stringify({
        importId: importRow?.id,
        recordsOk,
        recordsError,
        duplicates: 0,
        total: rows.length,
        errors: errors.slice(0, 20),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Error interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
