import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import type { TemparioMantenimiento, PreventiveQuoteInput, PreventiveQuoteResult } from '@/types/database';
import { buildPreventiveQuote } from '@/lib/calculadora/build-quote';
import {
  MOCK_TEMPARIOS,
  getMockMarcas,
  getMockModelos,
} from '@/lib/mock-temparios';

function mapTemparioRow(row: Record<string, unknown>): TemparioMantenimiento {
  return {
    id: String(row.id),
    legacy_id: row.legacy_id as number | null,
    marca: String(row.marca),
    linea: row.linea as string | null,
    modelo: String(row.modelo),
    tipo_item: row.tipo_item as TemparioMantenimiento['tipo_item'],
    item: String(row.item),
    unidad_medida: String(row.unidad_medida ?? 'Unidad'),
    cantidad: Number(row.cantidad ?? 1),
    frecuencia_horas: Number(row.frecuencia_horas) as TemparioMantenimiento['frecuencia_horas'],
    aceite_homologado: row.aceite_homologado as string | null,
    referencia_genuina: row.referencia_genuina as string | null,
    ref_sap_dispel: row.ref_sap_dispel as string | null,
    ref_sap_original: row.ref_sap_original as string | null,
    referencia_stal: row.referencia_stal as string | null,
    referencia_fleetguard: row.referencia_fleetguard as string | null,
    referencia_donaldson: row.referencia_donaldson as string | null,
    tiempo_horas: Number(row.tiempo_horas ?? 0),
    procedimiento: row.procedimiento as string | null,
    avisos_claves: row.avisos_claves as string | null,
    precio_unitario: Number(row.precio_unitario ?? 0),
    tarifa_mano_obra_h: Number(row.tarifa_mano_obra_h ?? 95000),
    activo: Boolean(row.activo ?? true),
  };
}

export async function fetchMarcas(): Promise<string[]> {
  if (!isSupabaseConfigured()) {
    return getMockMarcas();
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('temparios_mantenimiento')
    .select('marca')
    .eq('activo', true);

  if (error || !data?.length) {
    return getMockMarcas();
  }

  return Array.from(new Set(data.map((r) => r.marca as string))).sort();
}

export async function fetchModelos(marca: string): Promise<string[]> {
  if (!marca) return [];

  if (!isSupabaseConfigured()) {
    return getMockModelos(marca);
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('temparios_mantenimiento')
    .select('modelo')
    .eq('activo', true)
    .ilike('marca', marca);

  if (error || !data?.length) {
    return getMockModelos(marca);
  }

  return Array.from(new Set(data.map((r) => r.modelo as string))).sort();
}

export async function fetchTemparios(marca: string, modelo: string): Promise<TemparioMantenimiento[]> {
  if (!isSupabaseConfigured()) {
    return MOCK_TEMPARIOS.filter(
      (t) => t.marca.toLowerCase() === marca.toLowerCase() && t.modelo.toLowerCase() === modelo.toLowerCase()
    );
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('temparios_mantenimiento')
    .select('*')
    .eq('activo', true)
    .ilike('marca', marca)
    .ilike('modelo', modelo);

  if (error || !data?.length) {
    return MOCK_TEMPARIOS.filter(
      (t) => t.marca.toLowerCase() === marca.toLowerCase() && t.modelo.toLowerCase() === modelo.toLowerCase()
    );
  }

  return data.map(mapTemparioRow);
}

export async function calculatePreventiveMaintenance(
  input: PreventiveQuoteInput
): Promise<PreventiveQuoteResult> {
  const temparios = await fetchTemparios(input.marca, input.modelo);
  const allTemparios = temparios.length > 0 ? temparios : MOCK_TEMPARIOS;
  return buildPreventiveQuote(input, allTemparios);
}

export async function registerTemparioImport(
  fileName: string,
  recordsOk: number,
  recordsError: number
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const supabase = getSupabaseClient();
  await supabase.from('importaciones').insert({
    modulo: 'calculadora',
    nombre_archivo: fileName,
    tipo_archivo: fileName.split('.').pop() ?? 'xlsx',
    registros_total: recordsOk + recordsError,
    registros_ok: recordsOk,
    registros_error: recordsError,
    estado: recordsError > 0 ? 'parcial' : 'completado',
    completed_at: new Date().toISOString(),
  });
}
