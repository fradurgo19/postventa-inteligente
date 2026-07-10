import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import type { TelemetriaEquipo, ProjectedMaintenanceKpis } from '@/types/database';

function mapTelemetriaRow(row: Record<string, unknown>): TelemetriaEquipo {
  return {
    id: String(row.id),
    titulo: row.titulo as string | null,
    nit: row.nit as string | null,
    telefono: row.telefono as string | null,
    serie: String(row.serie),
    modelo: String(row.modelo),
    horometro: Number(row.horometro ?? 0),
    promedio_h: row.promedio_h as number | null,
    ciudad: row.ciudad as string | null,
    latitud: row.latitud as number | null,
    longitud: row.longitud as number | null,
    fecha_primer_mtto: row.fecha_primer_mtto as string | null,
    fecha_segundo_mtto: row.fecha_segundo_mtto as string | null,
    fecha_tercer_mtto: row.fecha_tercer_mtto as string | null,
    sede: row.sede as string | null,
    asesor_email: row.asesor_email as string | null,
    marca: String(row.marca),
    tipo_mtto: row.tipo_mtto as number | null,
    estado: row.estado as string | null,
    tipo_maquina: row.tipo_maquina as string | null,
  };
}

const MOCK_TELEMETRIA: TelemetriaEquipo[] = [
  {
    id: 'tel-1',
    titulo: 'ARROYO CARCAMO TANIA',
    nit: '1067945313',
    telefono: '3104200886',
    serie: 'CLG922FZKSE733808',
    modelo: '922F',
    horometro: 184415,
    promedio_h: 14.585,
    ciudad: 'Animas, Chocó',
    latitud: 5.2636,
    longitud: -76.6332,
    fecha_primer_mtto: '2026-07-16',
    fecha_segundo_mtto: '2026-08-02',
    fecha_tercer_mtto: '2026-08-19',
    sede: 'Barranquilla',
    asesor_email: 'centrodemonitoreo@partequipos.com',
    marca: 'liugong',
    tipo_mtto: 2,
    estado: 'Enviado',
    tipo_maquina: 'Otro',
  },
  {
    id: 'tel-2',
    titulo: 'MINEROS S.A.',
    nit: '900123456',
    serie: 'CAT00321ABC',
    modelo: '320',
    horometro: 4520,
    ciudad: 'Medellín',
    latitud: 6.2442,
    longitud: -75.5812,
    fecha_primer_mtto: '2026-07-20',
    sede: 'Medellín',
    asesor_email: 'asesor@partequipos.com',
    marca: 'Caterpillar',
    estado: 'Pendiente',
    tipo_maquina: 'Excavadora',
  },
  {
    id: 'tel-3',
    titulo: 'CONSTRUCTORA ANDINA',
    nit: '800987654',
    serie: 'HITZX350LC',
    modelo: 'ZX350LC-6',
    horometro: 2100,
    ciudad: 'Bogotá',
    latitud: 4.711,
    longitud: -74.0721,
    fecha_primer_mtto: '2026-07-25',
    sede: 'Bogotá',
    asesor_email: 'asesor.bogota@partequipos.com',
    marca: 'Hitachi',
    estado: 'Pendiente',
    tipo_maquina: 'Excavadora',
  },
];

export async function fetchTelemetriaEquipos(): Promise<TelemetriaEquipo[]> {
  if (!isSupabaseConfigured()) {
    return MOCK_TELEMETRIA;
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('telemetria_equipos')
    .select('*')
    .order('fecha_primer_mtto', { ascending: true });

  if (error || !data?.length) {
    return MOCK_TELEMETRIA;
  }

  return data.map(mapTelemetriaRow);
}

function formatMesLabel(value: unknown): string {
  if (!value) return 'N/A';
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('es-CO', { month: 'short', year: 'numeric' });
}

export async function fetchProjectedKpis(): Promise<ProjectedMaintenanceKpis> {
  const equipos = await fetchTelemetriaEquipos();

  if (!isSupabaseConfigured()) {
    return buildMockKpis(equipos);
  }

  const supabase = getSupabaseClient();

  const [sedeRes, marcaRes, clienteRes, mesRes, insumosRes] = await Promise.all([
    supabase.from('v_kpi_oportunidades_sede').select('*'),
    supabase.from('v_kpi_oportunidades_marca').select('*'),
    supabase.from('v_kpi_oportunidades_cliente').select('*').limit(10),
    supabase.from('v_kpi_oportunidades_mes').select('*').order('mes', { ascending: true }),
    supabase.from('v_insumos_proyectados').select('tipo_item, cantidad, valor_proyectado'),
  ]);

  const insumosPorTipoMap = new Map<string, { total: number; cantidad: number }>();
  (insumosRes.data ?? []).forEach((row) => {
    const tipo = String(row.tipo_item ?? 'Otro');
    const prev = insumosPorTipoMap.get(tipo) ?? { total: 0, cantidad: 0 };
    prev.total += Number(row.valor_proyectado ?? 0);
    prev.cantidad += Number(row.cantidad ?? 0);
    insumosPorTipoMap.set(tipo, prev);
  });

  const insumosPorTipo = Array.from(insumosPorTipoMap.entries()).map(([tipo, v]) => ({
    tipo,
    total: v.total,
    cantidad: v.cantidad,
  }));

  const insumosProyectadosTotal = insumosPorTipo.reduce((s, i) => s + i.total, 0);

  const oportunidadesPorSede = (sedeRes.data ?? []).map((r) => ({
    sede: String(r.sede),
    total: Number(r.total),
  }));

  // Agregar por sede si la vista trae marca
  const sedeAgg = new Map<string, number>();
  oportunidadesPorSede.forEach((r) => {
    sedeAgg.set(r.sede, (sedeAgg.get(r.sede) ?? 0) + r.total);
  });

  return {
    totalMaquinas: equipos.length,
    totalClientes: new Set(equipos.map((e) => e.titulo).filter(Boolean)).size,
    oportunidadesMes: equipos.filter((e) => e.fecha_primer_mtto).length,
    oportunidadesPorSede: Array.from(sedeAgg.entries()).map(([sede, total]) => ({ sede, total })),
    oportunidadesPorMarca: (marcaRes.data ?? []).map((r) => ({
      marca: String(r.marca),
      total: Number(r.total),
    })),
    oportunidadesPorCliente: (clienteRes.data ?? []).map((r) => ({
      cliente: String(r.cliente),
      total: Number(r.total),
    })),
    oportunidadesPorMes: (mesRes.data ?? []).map((r) => ({
      mes: formatMesLabel(r.mes),
      total: Number(r.total_oportunidades ?? 0),
      enviadas: Number(r.enviadas ?? 0),
      pendientes: Number(r.pendientes ?? 0),
    })),
    insumosProyectadosTotal,
    insumosPorTipo,
  };
}

function buildMockKpis(equipos: TelemetriaEquipo[]): ProjectedMaintenanceKpis {
  const sedeMap = new Map<string, number>();
  const marcaMap = new Map<string, number>();
  const clienteMap = new Map<string, number>();

  equipos.forEach((e) => {
    if (e.sede) sedeMap.set(e.sede, (sedeMap.get(e.sede) ?? 0) + 1);
    marcaMap.set(e.marca, (marcaMap.get(e.marca) ?? 0) + 1);
    if (e.titulo) clienteMap.set(e.titulo, (clienteMap.get(e.titulo) ?? 0) + 1);
  });

  return {
    totalMaquinas: equipos.length,
    totalClientes: clienteMap.size,
    oportunidadesMes: equipos.length,
    oportunidadesPorSede: Array.from(sedeMap.entries()).map(([sede, total]) => ({ sede, total })),
    oportunidadesPorMarca: Array.from(marcaMap.entries()).map(([marca, total]) => ({ marca, total })),
    oportunidadesPorCliente: Array.from(clienteMap.entries()).map(([cliente, total]) => ({
      cliente,
      total,
    })),
    oportunidadesPorMes: [
      { mes: 'may. 2026', total: 12, enviadas: 8, pendientes: 4 },
      { mes: 'jun. 2026', total: 18, enviadas: 14, pendientes: 4 },
      { mes: 'jul. 2026', total: equipos.length, enviadas: 1, pendientes: equipos.length - 1 },
    ],
    insumosProyectadosTotal: 125000000,
    insumosPorTipo: [
      { tipo: 'Repuesto', total: 45000000, cantidad: 120 },
      { tipo: 'Consumible', total: 38000000, cantidad: 85 },
      { tipo: 'Actividad', total: 42000000, cantidad: 64 },
    ],
  };
}

export async function registerTelemetriaImport(
  fileName: string,
  recordsOk: number,
  recordsError: number
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const supabase = getSupabaseClient();
  await supabase.from('importaciones').insert({
    modulo: 'proyectados',
    nombre_archivo: fileName,
    tipo_archivo: fileName.split('.').pop() ?? 'xlsx',
    registros_total: recordsOk + recordsError,
    registros_ok: recordsOk,
    registros_error: recordsError,
    estado: recordsError > 0 ? 'parcial' : 'completado',
    completed_at: new Date().toISOString(),
  });
}
