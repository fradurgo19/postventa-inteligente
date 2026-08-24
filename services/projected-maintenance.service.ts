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
    mes_creado: (row.mes_creado as string | null) ?? null,
    anio: row.anio == null ? null : Number(row.anio),
  };
}

const MONTH_RANK: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

function telemetriaPeriodRank(row: Pick<TelemetriaEquipo, 'mes_creado' | 'anio'>): number {
  const year = Number(row.anio ?? 0);
  const monthKey = String(row.mes_creado ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const month = MONTH_RANK[monthKey] ?? 0;
  return year * 100 + month;
}

/** Flota única: conserva la proyección más reciente por número de serie. */
export function pickLatestTelemetriaPerSerie(equipos: TelemetriaEquipo[]): TelemetriaEquipo[] {
  const bySerie = new Map<string, TelemetriaEquipo>();
  for (const equipo of equipos) {
    const prev = bySerie.get(equipo.serie);
    if (!prev || telemetriaPeriodRank(equipo) >= telemetriaPeriodRank(prev)) {
      bySerie.set(equipo.serie, equipo);
    }
  }
  return Array.from(bySerie.values());
}

export async function fetchTelemetriaEquipos(): Promise<TelemetriaEquipo[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('telemetria_equipos')
    .select('*')
    .order('anio', { ascending: false })
    .order('fecha_primer_mtto', { ascending: true });

  if (error || !data?.length) return [];
  return data.map(mapTelemetriaRow);
}

function formatMesLabel(value: unknown): string {
  if (!value) return 'N/A';
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('es-CO', { month: 'short', year: 'numeric' });
}

function currentMonthYear(): { month: number; year: number } {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

function isFechaInCurrentMonth(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const { month, year } = currentMonthYear();
  return d.getUTCMonth() + 1 === month && d.getUTCFullYear() === year;
}

function buildKpisFromEquipos(
  equipos: TelemetriaEquipo[],
  extras?: { clientesCount?: number; maquinasCount?: number }
): ProjectedMaintenanceKpis {
  const sedeMap = new Map<string, number>();
  const marcaMap = new Map<string, number>();
  const clienteMap = new Map<string, number>();
  const mesMap = new Map<string, { total: number; enviadas: number; pendientes: number }>();

  for (const e of equipos) {
    if (e.sede) sedeMap.set(e.sede, (sedeMap.get(e.sede) ?? 0) + 1);
    if (e.marca) marcaMap.set(e.marca, (marcaMap.get(e.marca) ?? 0) + 1);
    if (e.titulo) clienteMap.set(e.titulo, (clienteMap.get(e.titulo) ?? 0) + 1);

    const periodo =
      e.mes_creado && e.anio
        ? `${e.mes_creado} ${e.anio}`
        : e.fecha_primer_mtto
          ? formatMesLabel(e.fecha_primer_mtto)
          : 'Sin periodo';
    const prev = mesMap.get(periodo) ?? { total: 0, enviadas: 0, pendientes: 0 };
    prev.total += 1;
    const estado = (e.estado ?? '').toLowerCase();
    if (estado.includes('enviad')) prev.enviadas += 1;
    else if (estado.includes('pend') || !estado) prev.pendientes += 1;
    mesMap.set(periodo, prev);
  }

  const oportunidadesMes = equipos.filter(
    (e) =>
      isFechaInCurrentMonth(e.fecha_primer_mtto) ||
      isFechaInCurrentMonth(e.fecha_segundo_mtto) ||
      isFechaInCurrentMonth(e.fecha_tercer_mtto)
  ).length;

  return {
    totalMaquinas: extras?.maquinasCount ?? pickLatestTelemetriaPerSerie(equipos).length,
    totalClientes: extras?.clientesCount ?? clienteMap.size,
    oportunidadesMes,
    oportunidadesPorSede: Array.from(sedeMap.entries())
      .map(([sede, total]) => ({ sede, total }))
      .sort((a, b) => b.total - a.total),
    oportunidadesPorMarca: Array.from(marcaMap.entries())
      .map(([marca, total]) => ({ marca, total }))
      .sort((a, b) => b.total - a.total),
    oportunidadesPorCliente: Array.from(clienteMap.entries())
      .map(([cliente, total]) => ({ cliente, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 20),
    oportunidadesPorMes: Array.from(mesMap.entries()).map(([mes, v]) => ({
      mes,
      total: v.total,
      enviadas: v.enviadas,
      pendientes: v.pendientes,
    })),
    insumosProyectadosTotal: 0,
    insumosPorTipo: [],
  };
}

export async function fetchProjectedKpis(): Promise<ProjectedMaintenanceKpis> {
  const equipos = await fetchTelemetriaEquipos();

  if (!isSupabaseConfigured()) {
    return buildKpisFromEquipos(equipos);
  }

  const supabase = getSupabaseClient();

  const [clientesCount, maquinasCount, sedeRes, marcaRes, clienteRes, mesRes, insumosRes] =
    await Promise.all([
      supabase.from('clientes').select('id', { count: 'exact', head: true }),
      supabase.from('maquinas').select('id', { count: 'exact', head: true }),
      supabase.from('v_kpi_oportunidades_sede').select('*'),
      supabase.from('v_kpi_oportunidades_marca').select('*'),
      supabase.from('v_kpi_oportunidades_cliente').select('*').limit(20),
      supabase.from('v_kpi_oportunidades_mes').select('*').order('mes', { ascending: true }),
      supabase.from('v_insumos_proyectados').select('tipo_item, cantidad, valor_proyectado'),
    ]);

  const fromViews =
    (sedeRes.data?.length ?? 0) > 0 ||
    (marcaRes.data?.length ?? 0) > 0 ||
    (clienteRes.data?.length ?? 0) > 0;

  if (!fromViews && equipos.length === 0) {
    return buildKpisFromEquipos([], {
      clientesCount: clientesCount.count ?? 0,
      maquinasCount: maquinasCount.count ?? 0,
    });
  }

  if (!fromViews) {
    return buildKpisFromEquipos(equipos, {
      clientesCount: clientesCount.count ?? undefined,
      maquinasCount: maquinasCount.count ?? undefined,
    });
  }

  const insumosPorTipoMap = new Map<string, { total: number; cantidad: number }>();
  for (const row of insumosRes.data ?? []) {
    const tipo = String(row.tipo_item ?? 'Otro');
    const prev = insumosPorTipoMap.get(tipo) ?? { total: 0, cantidad: 0 };
    prev.total += Number(row.valor_proyectado ?? 0);
    prev.cantidad += Number(row.cantidad ?? 0);
    insumosPorTipoMap.set(tipo, prev);
  }

  const insumosPorTipo = Array.from(insumosPorTipoMap.entries()).map(([tipo, v]) => ({
    tipo,
    total: v.total,
    cantidad: v.cantidad,
  }));

  const sedeAgg = new Map<string, number>();
  for (const r of sedeRes.data ?? []) {
    const sede = String(r.sede ?? '');
    if (!sede) continue;
    sedeAgg.set(sede, (sedeAgg.get(sede) ?? 0) + Number(r.total ?? 0));
  }

  const base = buildKpisFromEquipos(equipos, {
    clientesCount: clientesCount.count ?? undefined,
    maquinasCount: maquinasCount.count ?? undefined,
  });

  return {
    ...base,
    oportunidadesPorSede:
      sedeAgg.size > 0
        ? Array.from(sedeAgg.entries()).map(([sede, total]) => ({ sede, total }))
        : base.oportunidadesPorSede,
    oportunidadesPorMarca:
      (marcaRes.data?.length ?? 0) > 0
        ? (marcaRes.data ?? []).map((r) => ({
            marca: String(r.marca),
            total: Number(r.total),
          }))
        : base.oportunidadesPorMarca,
    oportunidadesPorCliente:
      (clienteRes.data?.length ?? 0) > 0
        ? (clienteRes.data ?? []).map((r) => ({
            cliente: String(r.cliente),
            total: Number(r.total),
          }))
        : base.oportunidadesPorCliente,
    oportunidadesPorMes:
      (mesRes.data?.length ?? 0) > 0
        ? (mesRes.data ?? []).map((r) => ({
            mes: formatMesLabel(r.mes),
            total: Number(r.total_oportunidades ?? 0),
            enviadas: Number(r.enviadas ?? 0),
            pendientes: Number(r.pendientes ?? 0),
          }))
        : base.oportunidadesPorMes,
    insumosProyectadosTotal: insumosPorTipo.reduce((s, i) => s + i.total, 0),
    insumosPorTipo,
  };
}

export interface ProyectadosImportLog {
  id: string;
  date: string;
  fileName: string;
  records: number;
  status: 'Success' | 'Failed' | 'Processing';
  user: string;
}

export async function fetchProyectadosImportHistory(): Promise<ProyectadosImportLog[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('importaciones')
    .select('id, nombre_archivo, registros_ok, registros_error, estado, created_at, user_id')
    .eq('modulo', 'proyectados')
    .order('created_at', { ascending: false })
    .limit(30);

  if (error || !data?.length) return [];

  return data.map((row) => {
    const estado = String(row.estado ?? '').toLowerCase();
    let status: ProyectadosImportLog['status'] = 'Processing';
    if (estado === 'completado' || estado === 'parcial') status = 'Success';
    else if (estado === 'fallido') status = 'Failed';

    return {
      id: String(row.id),
      date: new Date(String(row.created_at)).toLocaleString('es-CO'),
      fileName: String(row.nombre_archivo ?? '—'),
      records: Number(row.registros_ok ?? 0) + Number(row.registros_error ?? 0),
      status,
      user: row.user_id ? String(row.user_id).slice(0, 8) : 'sistema',
    };
  });
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
