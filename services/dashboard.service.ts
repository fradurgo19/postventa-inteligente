import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { DASHBOARD_KPIS } from '@/lib/mock-data';
import {
  fetchTelemetriaEquipos,
  pickLatestTelemetriaPerSerie,
} from '@/services/projected-maintenance.service';

export interface DashboardQuickStats {
  totalMachines: number;
  activeMaintenances: number;
  totalPartsInStock: number;
  monthlyRevenue: number;
}

export interface DashboardModuleBadges {
  calculator: number;
  projected: number;
  cpp: number;
}

export interface DashboardActivityEntry {
  id: string;
  createdAt: string;
  description: string;
  module: string;
  kind: 'import' | 'audit' | 'quote';
}

export interface DashboardData {
  stats: DashboardQuickStats;
  badges: DashboardModuleBadges;
  activity: DashboardActivityEntry[];
}

function currentMonthStartIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

function isFechaInCurrentMonth(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getUTCMonth() === now.getUTCMonth() && d.getUTCFullYear() === now.getUTCFullYear();
}

function moduloLabel(modulo: string): string {
  switch (modulo) {
    case 'proyectados':
      return 'Cronograma / Telemetría';
    case 'calculadora':
      return 'Temparios';
    case 'cpp':
      return 'Repuestos CPP';
    default:
      return modulo;
  }
}

function importEstadoLabel(estado: string): string {
  switch (estado.toLowerCase()) {
    case 'completado':
      return 'completada';
    case 'parcial':
      return 'parcial';
    case 'fallido':
      return 'fallida';
    case 'procesando':
      return 'en proceso';
    default:
      return estado || 'registrada';
  }
}

function auditDescription(
  modulo: string,
  accion: string,
  entidad: string | null,
  detalle: unknown
): string {
  const entity = entidad ? ` (${entidad})` : '';
  if (detalle && typeof detalle === 'object' && detalle !== null) {
    const d = detalle as Record<string, unknown>;
    const email = typeof d.email === 'string' ? d.email : null;
    const fileName = typeof d.nombre_archivo === 'string' ? d.nombre_archivo : null;
    if (email) return `${modulo}: ${accion} — ${email}`;
    if (fileName) return `${modulo}: ${accion} — ${fileName}`;
  }
  return `${modulo}: ${accion}${entity}`;
}

function countFleetMetrics(
  latestFleet: ReturnType<typeof pickLatestTelemetriaPerSerie>
) {
  return latestFleet.reduce(
    (acc, equipo) => {
      const estado = (equipo.estado ?? '').toLowerCase();
      if (estado.includes('pend') || !estado.trim()) {
        acc.activeMaintenances += 1;
      }
      if (isFechaInCurrentMonth(equipo.fecha_primer_mtto)) {
        acc.projectedScheduled += 1;
      }
      return acc;
    },
    { activeMaintenances: 0, projectedScheduled: 0 }
  );
}

function sumStockRows(rows: Array<{ stock_disponible?: number | null }> | null): number {
  if (!rows?.length) return 0;
  return Math.round(
    rows.reduce((sum, row) => sum + Number(row.stock_disponible ?? 0), 0)
  );
}

function sumQuoteTotals(rows: Array<{ total?: number | null }> | null): number {
  if (!rows?.length) return 0;
  return Math.round(rows.reduce((sum, row) => sum + Number(row.total ?? 0), 0));
}

function buildActivityFeed(
  imports: Array<{
    id: unknown;
    modulo: unknown;
    nombre_archivo: unknown;
    registros_ok: unknown;
    estado: unknown;
    created_at: unknown;
  }> | null,
  auditRows: Array<{
    id: unknown;
    modulo: unknown;
    accion: unknown;
    entidad: unknown;
    detalle: unknown;
    created_at: unknown;
  }> | null
): DashboardActivityEntry[] {
  const activity: DashboardActivityEntry[] = [];

  for (const row of imports ?? []) {
    const estado = String(row.estado ?? '');
    activity.push({
      id: `imp-${row.id}`,
      createdAt: String(row.created_at),
      module: moduloLabel(String(row.modulo ?? '')),
      kind: 'import',
      description: `Importación ${moduloLabel(String(row.modulo ?? ''))}: ${String(row.nombre_archivo ?? '—')} — ${Number(row.registros_ok ?? 0)} registros (${importEstadoLabel(estado)})`,
    });
  }

  for (const row of auditRows ?? []) {
    activity.push({
      id: `aud-${row.id}`,
      createdAt: String(row.created_at),
      module: String(row.modulo ?? 'Sistema'),
      kind: 'audit',
      description: auditDescription(
        String(row.modulo ?? 'Sistema'),
        String(row.accion ?? 'Updated'),
        row.entidad ? String(row.entidad) : null,
        row.detalle
      ),
    });
  }

  activity.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return activity.slice(0, 8);
}

function mockDashboardData(): DashboardData {
  return {
    stats: {
      totalMachines: DASHBOARD_KPIS.totalMachines,
      activeMaintenances:
        DASHBOARD_KPIS.machinesInMaintenance + DASHBOARD_KPIS.scheduledMaintenances,
      totalPartsInStock: DASHBOARD_KPIS.totalPartsInStock,
      monthlyRevenue: DASHBOARD_KPIS.monthlyRevenue,
    },
    badges: {
      calculator: 12,
      projected: 8,
      cpp: 247,
    },
    activity: [
      {
        id: 'mock-a1',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        description: 'OT-2024-00821 completada — PM 250H Volvo EC480E (3.5 h)',
        module: 'Proyectados',
        kind: 'audit',
      },
      {
        id: 'mock-a2',
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        description: 'Importación telemetría registrada en la plataforma',
        module: 'Importaciones',
        kind: 'import',
      },
    ],
  };
}

export async function fetchDashboardData(): Promise<DashboardData> {
  if (!isSupabaseConfigured()) {
    return mockDashboardData();
  }

  const supabase = getSupabaseClient();
  const monthStart = currentMonthStartIso();

  const [
    maquinasRes,
    telemetriaEquipos,
    cppStockRes,
    cppCountRes,
    tempariosRes,
    cotizPrevRes,
    cotizCppRes,
    importsRes,
    auditRes,
  ] = await Promise.all([
    supabase.from('maquinas').select('id', { count: 'exact', head: true }).eq('activo', true),
    fetchTelemetriaEquipos(),
    supabase.from('cpp_catalogo').select('stock_disponible').eq('activo', true),
    supabase.from('cpp_catalogo').select('id', { count: 'exact', head: true }).eq('activo', true),
    supabase.from('temparios_mantenimiento').select('id', { count: 'exact', head: true }).eq('activo', true),
    supabase.from('cotizaciones_preventivo').select('total').gte('created_at', monthStart),
    supabase
      .from('cpp_cotizaciones')
      .select('total')
      .gte('created_at', monthStart)
      .neq('estado', 'anulada'),
    supabase
      .from('importaciones')
      .select('id, modulo, nombre_archivo, registros_ok, estado, created_at')
      .order('created_at', { ascending: false })
      .limit(12),
    supabase
      .from('auditoria')
      .select('id, modulo, accion, entidad, detalle, created_at')
      .order('created_at', { ascending: false })
      .limit(12),
  ]);

  const latestFleet = pickLatestTelemetriaPerSerie(telemetriaEquipos);
  const maquinasCount = maquinasRes.count ?? 0;
  const totalMachines = maquinasCount > 0 ? maquinasCount : latestFleet.length;
  const { activeMaintenances, projectedScheduled } = countFleetMetrics(latestFleet);

  const totalPartsInStock = cppStockRes.error ? 0 : sumStockRows(cppStockRes.data);
  const monthlyRevenue =
    sumQuoteTotals(cotizPrevRes.data) + sumQuoteTotals(cotizCppRes.data);

  const cppParts = cppCountRes.count ?? 0;
  const calculatorTemparios = tempariosRes.count ?? 0;
  const activity = buildActivityFeed(
    importsRes.data,
    auditRes.error ? null : auditRes.data
  );

  return {
    stats: {
      totalMachines,
      activeMaintenances,
      totalPartsInStock,
      monthlyRevenue,
    },
    badges: {
      calculator: calculatorTemparios,
      projected: projectedScheduled > 0 ? projectedScheduled : activeMaintenances,
      cpp: cppParts,
    },
    activity,
  };
}
