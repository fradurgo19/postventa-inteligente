import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { apiRequest, isApiConfigured } from '@/lib/api/client';
import type { CppCatalogItem, CppFilters, SapItemAvailability } from '@/types/database';

function mapCppRow(row: Record<string, unknown>): CppCatalogItem {
  return {
    id: String(row.id),
    legacy_no: row.legacy_no as number | null,
    ref_sap: String(row.ref_sap),
    marca: String(row.marca),
    nombre: String(row.nombre),
    cantidad: Number(row.cantidad ?? 1),
    frecuencia: row.frecuencia as string | null,
    medida: row.medida as string | null,
    comentario: row.comentario as string | null,
    modelo: String(row.modelo),
    componente: String(row.parte ?? row.componente ?? ''),
    subtipo_componente: String(row.tipo ?? row.subtipo_componente ?? ''),
    imagen_url: row.imagen_url as string | null,
    recomendacion: row.recomendacion as string | null,
    adjuntos: (row.adjuntos as CppCatalogItem['adjuntos']) ?? [],
    equivalencia1: row.equivalencia1 as string | null,
    equivalencia2: row.equivalencia2 as string | null,
    equivalencia3: row.equivalencia3 as string | null,
    referencia_catalogo_original: row.referencia_catalogo_original as string | null,
    precio_lista: Number(row.precio_lista ?? row.precio_sap ?? 0),
    stock_disponible: Number(row.stock_disponible ?? row.stock_sap ?? 0),
    bodega: (row.bodega ?? row.bodega_sap) as string | null,
    precio_sap: row.precio_sap as number | null,
    stock_sap: row.stock_sap as number | null,
    bodega_sap: row.bodega_sap as string | null,
  };
}

const MOCK_CPP: CppCatalogItem[] = [
  {
    id: 'cpp-1',
    legacy_no: 2,
    ref_sap: '898375860-0',
    marca: 'HITACHI',
    nombre: 'FILTRO ACEITE MOTOR N°1 / ENGINE OIL FILTER',
    cantidad: 1,
    frecuencia: '250 hrs',
    medida: '0',
    comentario: 'N/A',
    modelo: 'ZX330-6',
    componente: 'MTTO PREVENTIVO',
    subtipo_componente: 'FILTRACION',
    imagen_url: null,
    recomendacion: 'Reemplazar cada 250 horas o según indicador de restricción',
    adjuntos: [{ title: 'Ficha técnica filtro', url: '#' }],
    equivalencia1: 'P550596',
    equivalencia2: 'LF16045',
    equivalencia3: '898375860-0',
    referencia_catalogo_original: '8983758600',
    precio_lista: 145000,
    stock_disponible: 12,
    bodega: 'Bogotá',
  },
  {
    id: 'cpp-2',
    ref_sap: '84475542',
    marca: 'Case',
    nombre: 'Filtro aceite motor SR175B',
    cantidad: 1,
    frecuencia: '250 hrs',
    modelo: 'SR175B',
    componente: 'MTTO PREVENTIVO',
    subtipo_componente: 'FILTRACION',
    recomendacion: 'Usar aceite homologado Case AH-2',
    equivalencia1: 'LF16011',
    precio_lista: 85000,
    stock_disponible: 8,
    bodega: 'Medellín',
  },
];

export async function fetchCppCatalog(filters: CppFilters = {}): Promise<CppCatalogItem[]> {
  let items: CppCatalogItem[];

  if (!isSupabaseConfigured()) {
    items = [...MOCK_CPP];
  } else {
    const supabase = getSupabaseClient();
    let query = supabase.from('v_cpp_consulta').select('*');

    if (filters.marca) query = query.ilike('marca', filters.marca);
    if (filters.modelo) query = query.ilike('modelo', filters.modelo);
    if (filters.componente) query = query.ilike('componente', `%${filters.componente}%`);
    if (filters.subtipo) query = query.ilike('subtipo_componente', `%${filters.subtipo}%`);
    if (filters.frecuencia) query = query.ilike('frecuencia', `%${filters.frecuencia}%`);

    const { data, error } = await query;
    items = error || !data?.length ? [...MOCK_CPP] : data.map(mapCppRow);
  }

  if (filters.search) {
    const q = filters.search.toLowerCase();
    items = items.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        p.ref_sap.toLowerCase().includes(q) ||
        (p.equivalencia1?.toLowerCase().includes(q) ?? false)
    );
  }

  return items;
}

export async function fetchCppMarcas(): Promise<string[]> {
  const items = await fetchCppCatalog();
  return Array.from(new Set(items.map((i) => i.marca))).sort();
}

export async function fetchCppModelos(marca: string): Promise<string[]> {
  const items = await fetchCppCatalog({ marca });
  return Array.from(new Set(items.map((i) => i.modelo))).sort();
}

export async function fetchSapAvailability(refSap: string): Promise<SapItemAvailability | null> {
  if (isApiConfigured()) {
    try {
      return await apiRequest<SapItemAvailability>(`/sap/items/${encodeURIComponent(refSap)}`);
    } catch {
      return null;
    }
  }

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from('cpp_sap_cache')
      .select('*')
      .eq('ref_sap', refSap)
      .maybeSingle();

    if (data) {
      return {
        refSap: String(data.ref_sap),
        price: Number(data.precio ?? 0),
        stock: Number(data.stock ?? 0),
        warehouse: String(data.bodega ?? ''),
        currency: String(data.moneda ?? 'COP'),
        available: Boolean(data.disponible ?? true),
      };
    }
  }

  return null;
}

export async function registerCppImport(
  fileName: string,
  recordsOk: number,
  recordsError: number
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const supabase = getSupabaseClient();
  await supabase.from('importaciones').insert({
    modulo: 'cpp',
    nombre_archivo: fileName,
    tipo_archivo: fileName.split('.').pop() ?? 'xlsx',
    registros_total: recordsOk + recordsError,
    registros_ok: recordsOk,
    registros_error: recordsError,
    estado: recordsError > 0 ? 'parcial' : 'completado',
    completed_at: new Date().toISOString(),
  });
}
