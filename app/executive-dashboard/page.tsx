'use client';

import { useMemo, useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import {
  Wrench,
  Users,
  Building2,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { KPICard } from '@/components/ui/kpi-card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  ReportFiltersBar,
  DEFAULT_REPORT_FILTERS,
} from '@/components/modules/report-filters-bar';
import {
  sortLocale,
  matchesStringFilter,
  matchesTelemetriaReportFilters,
  type ReportFiltersState,
} from '@/lib/report-filters';
import { useTelemetriaEquipos } from '@/hooks/use-projected-maintenance';
import {
  mapTelemetriaToOpportunityRows,
  aggregateMarcasPie,
  aggregateOportunidadesPorSede,
  sedeChartHeight,
  SEDE_CHART_Y_AXIS_WIDTH,
  sortOportunidadesProximas,
  type MaintenanceStatusUi,
  type TelemetriaOpportunityRow,
} from '@/lib/proyectados/map-telemetria-ui';
import type { TelemetriaEquipo } from '@/types/database';

const CHART_COLORS = ['#cf1b22', '#50504f', '#2563eb', '#16a34a', '#d97706', '#7c3aed'];

const STATUS_LABEL: Record<MaintenanceStatusUi, string> = {
  Scheduled: 'Programado',
  Overdue: 'Vencido',
  'In Progress': 'En Progreso',
  Completed: 'Completado',
};

const STATUS_FILL: Record<MaintenanceStatusUi, string> = {
  Scheduled: '#3b82f6',
  Overdue: '#ef4444',
  'In Progress': '#f59e0b',
  Completed: '#10b981',
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: [0.4, 0, 0.2, 1] as const },
  }),
};

function StatusBadge({ status }: Readonly<{ status: MaintenanceStatusUi }>) {
  const cls: Record<MaintenanceStatusUi, string> = {
    Scheduled: 'bg-blue-100 text-blue-700',
    Overdue: 'bg-red-100 text-red-700',
    'In Progress': 'bg-amber-100 text-amber-700',
    Completed: 'bg-emerald-100 text-emerald-700',
  };
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', cls[status])}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function mesPeriodoLabel(r: TelemetriaOpportunityRow): string {
  if (r.mesCreado && r.mesCreado !== '—') {
    return r.anio ? `${r.mesCreado} ${r.anio}` : r.mesCreado;
  }
  if (r.createdAt) {
    return new Date(r.createdAt).toLocaleDateString('es-CO', {
      month: 'short',
      year: 'numeric',
    });
  }
  return 'Sin periodo';
}

function buildMesChartFromRows(rows: TelemetriaOpportunityRow[], equiposById: Map<string, TelemetriaEquipo>) {
  const map = new Map<string, { mes: string; total: number; enviadas: number; pendientes: number }>();
  for (const r of rows) {
    const mes = mesPeriodoLabel(r);
    const prev = map.get(mes) ?? { mes, total: 0, enviadas: 0, pendientes: 0 };
    prev.total += 1;
    const estado = (equiposById.get(r.id)?.estado ?? '').toLowerCase();
    if (estado.includes('enviad')) prev.enviadas += 1;
    else if (estado.includes('pend') || !estado) prev.pendientes += 1;
    map.set(mes, prev);
  }
  return Array.from(map.values()).sort((a, b) => a.mes.localeCompare(b.mes, 'es'));
}

export default function ExecutiveDashboardPage() {
  const [reportFilters, setReportFilters] = useState<ReportFiltersState>(DEFAULT_REPORT_FILTERS);
  const { data: equiposData, isLoading: loadingEquipos } = useTelemetriaEquipos();
  const equipos: TelemetriaEquipo[] = equiposData ?? [];

  const rows = useMemo(() => mapTelemetriaToOpportunityRows(equipos), [equipos]);
  const equiposById = useMemo(() => {
    const map = new Map<string, TelemetriaEquipo>();
    for (const e of equipos) map.set(e.id, e);
    return map;
  }, [equipos]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => matchesTelemetriaReportFilters(r, reportFilters));
  }, [rows, reportFilters]);

  /** Flota y próximos: programados (cercano→lejano), luego vencidos. */
  const sortedRows = useMemo(
    () => sortOportunidadesProximas(filteredRows),
    [filteredRows]
  );

  const filterOptions = useMemo(() => {
    const usable = (v: string) => Boolean(v?.trim()) && v !== '—';
    const marcas = sortLocale(Array.from(new Set(rows.map((r) => r.brand).filter(usable))));
    const source =
      reportFilters.marca === 'all'
        ? rows
        : rows.filter((r) => matchesStringFilter(r.brand, reportFilters.marca));
    const modelos = sortLocale(Array.from(new Set(source.map((r) => r.model).filter(usable))));
    const clientes = sortLocale(Array.from(new Set(rows.map((r) => r.client).filter(usable))));
    const sedes = sortLocale(Array.from(new Set(rows.map((r) => r.sede).filter(usable))));
    const yearSet = new Set<string>();
    for (const r of rows) {
      if (r.anio != null && r.anio > 0) yearSet.add(String(r.anio));
      else if (r.fechaIso) {
        const y = new Date(r.fechaIso).getFullYear();
        if (!Number.isNaN(y)) yearSet.add(String(y));
      }
    }
    const periodos = sortLocale(Array.from(yearSet));
    return { marcas, modelos, periodos, clientes, sedes };
  }, [rows, reportFilters.marca]);

  const statusChart = useMemo(() => {
    const map = new Map<MaintenanceStatusUi, number>();
    for (const r of filteredRows) {
      map.set(r.status, (map.get(r.status) ?? 0) + 1);
    }
    return (Object.keys(STATUS_LABEL) as MaintenanceStatusUi[]).map((status) => ({
      status: STATUS_LABEL[status],
      count: map.get(status) ?? 0,
      fill: STATUS_FILL[status],
    }));
  }, [filteredRows]);

  const mesChart = useMemo(
    () => buildMesChartFromRows(filteredRows, equiposById),
    [filteredRows, equiposById]
  );

  const sedeChart = useMemo(() => aggregateOportunidadesPorSede(filteredRows), [filteredRows]);

  const topClientes = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filteredRows) {
      map.set(r.client, (map.get(r.client) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, equipment]) => ({ name, equipment }))
      .sort((a, b) => b.equipment - a.equipment)
      .slice(0, 8);
  }, [filteredRows]);

  const topAsesores = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filteredRows) {
      if (!r.advisor || r.advisor === 'Sin asesor') continue;
      map.set(r.advisor, (map.get(r.advisor) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, maintenances]) => ({ name, maintenances }))
      .sort((a, b) => b.maintenances - a.maintenances)
      .slice(0, 8);
  }, [filteredRows]);

  const marcasPie = useMemo(() => {
    const ids = new Set(filteredRows.map((r) => r.id));
    return aggregateMarcasPie(equipos.filter((e) => ids.has(e.id)));
  }, [equipos, filteredRows]);

  const upcoming = useMemo(() => {
    return sortOportunidadesProximas(filteredRows.filter((r) => Boolean(r.fechaIso))).slice(0, 10);
  }, [filteredRows]);

  const fleetRows = useMemo(() => sortedRows.slice(0, 50), [sortedRows]);

  const programados = filteredRows.filter((r) => r.status === 'Scheduled').length;
  const vencidos = filteredRows.length - programados;
  const clientesUnicos = new Set(filteredRows.map((r) => r.client)).size;
  const sedesUnicas = new Set(filteredRows.map((r) => r.sede).filter((s) => s && s !== '—')).size;
  const maquinasUnicas = new Set(filteredRows.map((r) => r.serie)).size;

  const loading = loadingEquipos;

  return (
      <div className="space-y-6 pt-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Panel Ejecutivo</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Datos reales de telemetría, clientes, asesores y máquinas · Actualizado:{' '}
              {new Date().toLocaleString('es-CO')}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Supabase
          </span>
        </div>

        {!loading && equipos.length === 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            No hay proyecciones de telemetría. Importe la carga masiva en Mantenimiento Proyectado.
          </div>
        )}

        <ReportFiltersBar
          value={reportFilters}
          onChange={setReportFilters}
          options={filterOptions}
        />

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              {
                title: 'Proyecciones',
                value: String(filteredRows.length),
                icon: Wrench,
                variant: 'default' as const,
                description: `${maquinasUnicas} máquinas únicas · total registros`,
              },
              {
                title: 'Clientes',
                value: String(clientesUnicos),
                icon: Users,
                variant: 'default' as const,
                description: 'Clientes en telemetría filtrada',
              },
              {
                title: 'Sedes',
                value: String(sedesUnicas),
                icon: Building2,
                variant: 'default' as const,
                description: 'Cobertura por sede',
              },
              {
                title: 'Programados',
                value: String(programados),
                icon: Calendar,
                variant: 'default' as const,
                description: 'Fecha Primer Mtto ≥ hoy',
              },
              {
                title: 'Vencidos',
                value: String(vencidos),
                icon: AlertTriangle,
                variant: 'danger' as const,
                description: 'Total − programados (1er mtto)',
              },
            ].map((kpi, i) => (
              <motion.div
                key={kpi.title}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
              >
                <KPICard
                  title={kpi.title}
                  value={kpi.value}
                  change={0}
                  changeType="neutral"
                  icon={kpi.icon}
                  variant={kpi.variant}
                  description={kpi.description}
                />
              </motion.div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Oportunidades por estado</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={statusChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Cantidad" radius={[4, 4, 0, 0]}>
                  {statusChart.map((entry) => (
                    <Cell key={entry.status} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Proyecciones por periodo</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={mesChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" name="Total" fill="#cf1b22" radius={[4, 4, 0, 0]} />
                <Bar dataKey="enviadas" name="Enviadas" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pendientes" name="Pendientes" fill="#d97706" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Por marca</h3>
            {marcasPie.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Sin datos</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={marcasPie}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {marcasPie.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Top clientes</h3>
            <ul className="space-y-2 max-h-56 overflow-auto">
              {topClientes.length === 0 ? (
                <li className="text-sm text-muted-foreground">Sin clientes</li>
              ) : (
                topClientes.map((c, i) => (
                  <li
                    key={c.name}
                    className="flex items-center justify-between gap-2 text-sm border-b border-border/50 pb-1.5"
                  >
                    <span className="truncate">
                      <span className="text-muted-foreground mr-1">{i + 1}.</span>
                      {c.name}
                    </span>
                    <Badge variant="outline">{c.equipment}</Badge>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Top asesores</h3>
            <ul className="space-y-2 max-h-56 overflow-auto">
              {topAsesores.length === 0 ? (
                <li className="text-sm text-muted-foreground">Sin asesores asignados</li>
              ) : (
                topAsesores.map((a, i) => (
                  <li
                    key={a.name}
                    className="flex items-center justify-between gap-2 text-sm border-b border-border/50 pb-1.5"
                  >
                    <span className="truncate font-mono text-xs">
                      <span className="text-muted-foreground mr-1">{i + 1}.</span>
                      {a.name}
                    </span>
                    <Badge variant="outline">{a.maintenances}</Badge>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold">Flota / proyecciones (telemetría)</h3>
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold">Serie</th>
                    <th className="text-left px-3 py-2 font-semibold">Equipo</th>
                    <th className="text-left px-3 py-2 font-semibold">Cliente</th>
                    <th className="text-left px-3 py-2 font-semibold">Sede</th>
                    <th className="text-right px-3 py-2 font-semibold">Horómetro</th>
                    <th className="text-left px-3 py-2 font-semibold">Próximo mtto</th>
                    <th className="text-left px-3 py-2 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {fleetRows.map((r) => (
                    <tr key={r.id} className="border-t border-border/50 hover:bg-muted/20">
                      <td className="px-3 py-2 font-mono">{r.serie}</td>
                      <td className="px-3 py-2">{r.equipment}</td>
                      <td className="px-3 py-2">{r.client}</td>
                      <td className="px-3 py-2">{r.sede}</td>
                      <td className="px-3 py-2 text-right font-mono">{r.hours.toLocaleString('es-CO')}</td>
                      <td className="px-3 py-2">{r.nextDue}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={r.status} />
                      </td>
                    </tr>
                  ))}
                  {fleetRows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                        Sin registros para los filtros seleccionados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#cf1b22]" />
              Próximos mantenimientos
            </h3>
            <ul className="space-y-2 max-h-96 overflow-auto">
              {upcoming.length === 0 ? (
                <li className="text-sm text-muted-foreground">Sin fechas de mtto</li>
              ) : (
                upcoming.map((u) => (
                  <li
                    key={u.id}
                    className="rounded-lg border border-border/60 px-3 py-2 text-sm space-y-0.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{u.equipment}</span>
                      <StatusBadge status={u.status} />
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{u.client}</p>
                    <p className="text-xs font-mono text-foreground">{u.nextDue}</p>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold mb-3">Oportunidades por sede</h3>
          <div style={{ height: sedeChartHeight(sedeChart.length), width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sedeChart}
                layout="vertical"
                margin={{ left: 12, right: 16, top: 8, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="sede"
                  width={SEDE_CHART_Y_AXIS_WIDTH}
                  interval={0}
                  ticks={sedeChart.map((d) => d.sede)}
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  tickLine={false}
                />
                <Tooltip />
                <Bar dataKey="total" name="Total" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
  );
}
