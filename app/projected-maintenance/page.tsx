"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ProyectadosImportPanel } from '@/components/modules/proyectados-import-panel';
import {
  Wrench,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Search,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCheck,
  Clock,
  Cpu,
  Bell,
  FileText,
  RefreshCw,
  Zap,
  MapPin,
  Filter,
  X,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KPICard } from "@/components/ui/kpi-card";
import { AppShell } from "@/components/layout/app-shell";
import {
  useProjectedKpis,
  useTelemetriaEquipos,
  useProyectadosImportHistory,
} from "@/hooks/use-projected-maintenance";
import type { ProyectadosImportLog } from "@/services/projected-maintenance.service";
import { formatCOP } from "@/lib/mock-data";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ReportFiltersBar,
  DEFAULT_REPORT_FILTERS,
} from "@/components/modules/report-filters-bar";
import {
  sortLocale,
  matchesStringFilter,
  matchesDateFilters,
  parseFlexibleDate,
  type ReportFiltersState,
} from "@/lib/report-filters";
import {
  mapTelemetriaToOpportunityRows,
  mapTelemetriaToCalendarEvents,
  aggregateCiudadesFromTelemetria,
  aggregateMarcasPie,
  type MaintenanceStatusUi,
  type TelemetriaOpportunityRow,
  type TelemetriaCalendarEvent,
} from "@/lib/proyectados/map-telemetria-ui";

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type MaintenanceStatus = MaintenanceStatusUi;

interface MaintenanceEvent {
  id: string;
  day: number;
  title: string;
  status: MaintenanceStatus;
}

type MaintenanceRow = TelemetriaOpportunityRow;

interface ImportRecord {
  id: string;
  date: string;
  fileName: string;
  records: number;
  status: "Success" | "Failed" | "Processing";
  user: string;
}

interface AutomationStep {
  number: number;
  icon: React.ElementType;
  title: string;
  description: string;
  status: "Planned" | "In Development";
}

interface BrandData {
  name: string;
  value: number;
  color: string;
}

interface CityDot {
  id: string;
  name: string;
  count: number;
  status: "active" | "warning" | "critical";
  cx: number;
  cy: number;
}

// Roadmap de producto (no es data de prueba de negocio)
const AUTOMATION_STEPS: AutomationStep[] = [
  { number: 1, icon: Cpu,        title: "IntegraciÃ³n SAP",       description: "Extrae diariamente a las 6 AM los datos de equipos directamente del mÃ³dulo SAP PM. Sincroniza horÃ³metros, Ã³rdenes de trabajo y maestros de equipos automÃ¡ticamente.", status: "Planned"         },
  { number: 2, icon: RefreshCw,  title: "AnÃ¡lisis de HorÃ³metro",   description: "Compara las lecturas actuales del horÃ³metro con los umbrales de mantenimiento definidos por modelo. Marca los equipos que se acercan a los intervalos de servicio con ventanas de tolerancia configurables.", status: "Planned"         },
  { number: 3, icon: Calendar,   title: "ProgramaciÃ³n AutomÃ¡tica",  description: "Crea Ã³rdenes de trabajo en borrador con 30 dÃ­as de anticipaciÃ³n segÃºn las horas de operaciÃ³n proyectadas y los planes de mantenimiento. Asigna automÃ¡ticamente a los asesores de servicio disponibles.", status: "In Development"  },
  { number: 4, icon: Bell,       title: "Motor de Notificaciones",   description: "EnvÃ­a alertas automÃ¡ticas por correo y SMS a los asesores de servicio y clientes finales cuando el mantenimiento estÃ¡ prÃ³ximo. Recordatorios configurables a 30, 15 y 7 dÃ­as.", status: "Planned"         },
  { number: 5, icon: FileText,   title: "GeneraciÃ³n de PDF",        description: "Genera automÃ¡ticamente cotizaciones de mantenimiento personalizadas con precios de repuestos actuales, estimaciones de mano de obra e historial de servicio. Se adjuntan a las Ã³rdenes de trabajo y se envÃ­an por correo.", status: "Planned"         },
  { number: 6, icon: Zap,        title: "Actualizacion del Panel",      description: "Recalculo de KPIs en tiempo real y actualizacion del panel despues de cada ciclo de flujo de trabajo. Seguimiento de tasas de cumplimiento, tendencias de vencimiento y metricas de desempeno de asesores.", status: "In Development"  },
];

/** Posiciones aproximadas en el SVG de Colombia (claves sin tildes; cityCoords normaliza). */
const CITY_COORDS: Record<string, { cx: number; cy: number }> = {
  bogota: { cx: 178, cy: 245 },
  medellin: { cx: 155, cy: 190 },
  cali: { cx: 138, cy: 280 },
  barranquilla: { cx: 172, cy: 98 },
  bucaramanga: { cx: 192, cy: 175 },
  pereira: { cx: 147, cy: 225 },
  manizales: { cx: 152, cy: 210 },
  monteria: { cx: 160, cy: 120 },
  ibague: { cx: 165, cy: 250 },
  istmina: { cx: 120, cy: 230 },
};

function cityCoords(name: string, index: number): { cx: number; cy: number } {
  const key = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (CITY_COORDS[key]) return CITY_COORDS[key];
  return { cx: 140 + (index % 5) * 18, cy: 140 + Math.floor(index / 5) * 28 };
}

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const STATUS_CONFIG: Record<
  MaintenanceStatus,
  { label: string; className: string; calClass: string }
> = {
  Scheduled:   { label: "Programado",   className: "bg-blue-100 text-blue-700 border-blue-200",    calClass: "bg-blue-500"   },
  Overdue:     { label: "Vencido",     className: "bg-red-100 text-red-700 border-red-200",       calClass: "bg-[#cf1b22]"  },
  "In Progress":{ label: "En Progreso", className: "bg-amber-100 text-amber-700 border-amber-200", calClass: "bg-amber-500"  },
  Completed:   { label: "Completado",   className: "bg-emerald-100 text-emerald-700 border-emerald-200", calClass: "bg-emerald-500" },
};

const CITY_STATUS_COLORS: Record<CityDot["status"], string> = {
  active:   "#10b981",
  warning:  "#f97316",
  critical: "#cf1b22",
};

function getMonthName(month: number): string {
  return new Date(2025, month, 1).toLocaleString("es-ES", { month: "long" });
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

// â”€â”€â”€ Sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** KPI Row â€” datos desde v_kpi_* / telemetrÃ­a */
function KPIRow() {
  const { data: kpis, isLoading } = useProjectedKpis();

  if (isLoading || !kpis) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  const vencidos = kpis.oportunidadesPorMes.reduce(
    (s: number, m: { pendientes: number }) => s + m.pendientes,
    0
  );
  const enviadas = kpis.oportunidadesPorMes.reduce(
    (s: number, m: { enviadas: number }) => s + m.enviadas,
    0
  );

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        title="Equipos Totales"
        value={kpis.totalMaquinas}
        change={0}
        changeType="up"
        icon={Wrench}
        variant="default"
        description="TelemetrÃ­a registrada"
      />
      <KPICard
        title="Clientes"
        value={kpis.totalClientes}
        change={0}
        changeType="up"
        icon={Calendar}
        variant="default"
        description="Con oportunidades"
      />
      <KPICard
        title="Oportunidades del Mes"
        value={kpis.oportunidadesMes}
        change={0}
        changeType="up"
        icon={AlertTriangle}
        variant="danger"
        description="PrÃ³ximos mantenimientos"
      />
      <KPICard
        title="Alertas Enviadas"
        value={enviadas}
        change={vencidos}
        changeType="down"
        icon={CheckCircle2}
        variant="success"
        description={`${vencidos} pendientes en el periodo`}
      />
    </div>
  );
}

const CHART_COLORS = ["#cf1b22", "#50504f", "#2563eb", "#16a34a", "#d97706", "#7c3aed", "#0891b2"];

function KpiChartsSection() {
  const { data: kpis, isLoading } = useProjectedKpis();

  if (isLoading || !kpis) {
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  const marcaData = kpis.oportunidadesPorMarca.map(
    (m: { marca: string; total: number }, i: number) => ({
      name: m.marca,
      value: m.total,
      color: CHART_COLORS[i % CHART_COLORS.length],
    })
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Oportunidades por Mes</CardTitle>
        </CardHeader>
        <CardContent className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={kpis.oportunidadesPorMes}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <RechartsTooltip />
              <Bar dataKey="total" name="Total" fill="#cf1b22" radius={[4, 4, 0, 0]} />
              <Bar dataKey="enviadas" name="Enviadas" fill="#16a34a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Oportunidades por Sede</CardTitle>
        </CardHeader>
        <CardContent className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={kpis.oportunidadesPorSede} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="sede" width={90} tick={{ fontSize: 11 }} />
              <RechartsTooltip />
              <Bar dataKey="total" fill="#50504f" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Oportunidades por Marca</CardTitle>
        </CardHeader>
        <CardContent className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={marcaData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={75}
                paddingAngle={2}
              >
                {marcaData.map((entry: { name: string; color: string }) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <RechartsTooltip />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Insumos Proyectados â€” {formatCOP(kpis.insumosProyectadosTotal)}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={kpis.insumosPorTipo}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="tipo" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <RechartsTooltip
                formatter={(value: number) => formatCOP(value)}
              />
              <Bar dataKey="total" name="Valor" fill="#cf1b22" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cantidad" name="Cantidad" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Top Clientes por Oportunidades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {kpis.oportunidadesPorCliente.slice(0, 6).map((c: { cliente: string; total: number }) => (
              <div
                key={c.cliente}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
              >
                <span className="text-sm text-foreground truncate pr-2">{c.cliente}</span>
                <Badge variant="outline" className="border-[#cf1b22]/30 text-[#cf1b22]">
                  {c.total}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** Monthly Maintenance Calendar â€” fechas reales de telemetrÃ­a */
function MaintenanceCalendar() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [hoveredEvent, setHoveredEvent] = useState<MaintenanceEvent | null>(null);
  const { data: equipos = [] } = useTelemetriaEquipos();

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);

  const monthEvents = useMemo(() => {
    return mapTelemetriaToCalendarEvents(equipos).filter(
      (ev) => ev.month === viewMonth && ev.year === viewYear
    );
  }, [equipos, viewMonth, viewYear]);

  const eventsByDay: Record<number, MaintenanceEvent[]> = {};
  monthEvents.forEach((ev) => {
    if (!eventsByDay[ev.day]) eventsByDay[ev.day] = [];
    eventsByDay[ev.day].push({
      id: ev.id,
      day: ev.day,
      title: ev.title,
      status: ev.status,
    });
  });

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Calendario de Mantenimiento Mensual</CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium w-32 text-center">
              {getMonthName(viewMonth)} {viewYear}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {["Dom", "Lun", "Mar", "MiÃ©", "Jue", "Vie", "SÃ¡b"].map((d) => (
            <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
          {cells.map((day, idx) => {
            const events = day ? eventsByDay[day] ?? [] : [];
            const isToday =
              day === today.getDate() &&
              viewMonth === today.getMonth() &&
              viewYear === today.getFullYear();

            return (
              <div
                key={idx}
                className="bg-background min-h-[52px] p-1 relative"
              >
                {day && (
                  <>
                    <span
                      className={`text-xs font-medium leading-none ${
                        isToday
                          ? "inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#cf1b22] text-white"
                          : "text-foreground/70"
                      }`}
                    >
                      {day}
                    </span>
                    <div className="mt-0.5 flex flex-col gap-0.5">
                      {events.slice(0, 2).map((ev) => (
                        <div
                          key={ev.id}
                          className={`rounded-sm px-0.5 py-px text-[9px] font-medium text-white truncate cursor-pointer ${
                            STATUS_CONFIG[ev.status].calClass
                          }`}
                          onMouseEnter={() => setHoveredEvent(ev)}
                          onMouseLeave={() => setHoveredEvent(null)}
                        >
                          {ev.title.split("â€“")[0].trim()}
                        </div>
                      ))}
                      {events.length > 2 && (
                        <span className="text-[9px] text-muted-foreground pl-0.5">
                          +{events.length - 2} mÃ¡s
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Hover tooltip */}
        <AnimatePresence>
          {hoveredEvent && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-2 rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-md"
            >
              <p className="font-semibold">{hoveredEvent.title}</p>
              <p className="text-muted-foreground text-xs">
                DÃ­a {hoveredEvent.day} Â·{" "}
                <span
                  className={`font-medium ${
                    hoveredEvent.status === "Overdue" ? "text-[#cf1b22]" : ""
                  }`}
                >
                  {STATUS_CONFIG[hoveredEvent.status].label}
                </span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap gap-3">
          {(Object.keys(STATUS_CONFIG) as MaintenanceStatus[]).map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-sm ${STATUS_CONFIG[s].calClass}`} />
              <span className="text-xs text-muted-foreground">{STATUS_CONFIG[s].label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** Status badge */
function StatusBadge({ status }: { status: MaintenanceStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_CONFIG[status].className}`}
    >
      {STATUS_CONFIG[status].label}
    </span>
  );
}

/** Opportunities Table */
function OpportunitiesTable({
  reportFilters,
}: Readonly<{ reportFilters: ReportFiltersState }>) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;
  const { data: equipos = [], isLoading } = useTelemetriaEquipos();

  const opportunityRows = useMemo(
    () => mapTelemetriaToOpportunityRows(equipos),
    [equipos]
  );

  const filtered = opportunityRows.filter((r) => {
    const matchSearch =
      r.equipment.toLowerCase().includes(search.toLowerCase()) ||
      r.brand.toLowerCase().includes(search.toLowerCase()) ||
      r.advisor.toLowerCase().includes(search.toLowerCase()) ||
      r.client.toLowerCase().includes(search.toLowerCase()) ||
      r.serie.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    const matchReport =
      matchesStringFilter(r.brand, reportFilters.marca) &&
      matchesStringFilter(r.model, reportFilters.modelo) &&
      matchesStringFilter(r.client, reportFilters.cliente) &&
      matchesDateFilters(r.nextDue, reportFilters);
    return matchSearch && matchStatus && matchReport;
  });

  const totalRows = filtered.length;
  const pageRows = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  if (isLoading) {
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <CardTitle className="text-base font-semibold">Oportunidades PrÃ³ximas</CardTitle>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-52">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar equipoâ€¦"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-8 h-8 text-sm"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="h-8 w-36 text-sm">
                <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="Scheduled">Programado</SelectItem>
                <SelectItem value="Overdue">Vencido</SelectItem>
                <SelectItem value="In Progress">En Progreso</SelectItem>
                <SelectItem value="Completed">Completado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-xs font-semibold pl-4">Equipo</TableHead>
                <TableHead className="text-xs font-semibold">Marca</TableHead>
                <TableHead className="text-xs font-semibold">Modelo</TableHead>
                <TableHead className="text-xs font-semibold text-right">Horas</TableHead>
                <TableHead className="text-xs font-semibold">Ãšltimo Mant.</TableHead>
                <TableHead className="text-xs font-semibold">PrÃ³ximo Venc.</TableHead>
                <TableHead className="text-xs font-semibold">Estado</TableHead>
                <TableHead className="text-xs font-semibold pr-4">Asesor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-sm">
                    No se encontraron resultados
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((row, i) => (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="text-xs font-medium pl-4 py-2.5">{row.equipment}</TableCell>
                    <TableCell className="text-xs py-2.5">{row.brand}</TableCell>
                    <TableCell className="text-xs py-2.5 text-muted-foreground">{row.model}</TableCell>
                    <TableCell className="text-xs py-2.5 text-right font-mono font-semibold">{row.hours.toLocaleString()}</TableCell>
                    <TableCell className="text-xs py-2.5 text-muted-foreground">{row.lastMaintenance}</TableCell>
                    <TableCell className="text-xs py-2.5 font-medium">{row.nextDue}</TableCell>
                    <TableCell className="py-2.5"><StatusBadge status={row.status} /></TableCell>
                    <TableCell className="text-xs py-2.5 pr-4 text-muted-foreground">{row.advisor}</TableCell>
                  </motion.tr>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <span className="text-xs text-muted-foreground">
            {totalRows === 0
              ? "Sin resultados"
              : `Mostrando ${(page - 1) * rowsPerPage + 1}â€“${Math.min(page * rowsPerPage, totalRows)} de ${totalRows} resultados`}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            {Array.from({ length: Math.max(1, Math.ceil(totalRows / rowsPerPage)) }, (_, i) => i + 1)
              .slice(0, 5)
              .map((p) => (
              <Button
                key={p}
                variant={page === p ? "default" : "outline"}
                size="sm"
                className={`h-7 w-7 text-xs p-0 ${page === p ? "bg-[#cf1b22] hover:bg-[#b01820] border-[#cf1b22]" : ""}`}
                onClick={() => setPage(p)}
              >
                {p}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={page >= Math.max(1, Math.ceil(totalRows / rowsPerPage))}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Colombia SVG Map â€” sedes/ciudades desde telemetrÃ­a */
function ColombiaMap() {
  const [tooltip, setTooltip] = useState<CityDot | null>(null);
  const { data: equipos = [] } = useTelemetriaEquipos();

  const cityDots: CityDot[] = useMemo(() => {
    return aggregateCiudadesFromTelemetria(equipos).map((c, i) => {
      const coords = cityCoords(c.name, i);
      return {
        id: c.name.toLowerCase().replace(/\s+/g, "-"),
        name: c.name,
        count: c.count,
        status: c.status,
        cx: coords.cx,
        cy: coords.cy,
      };
    });
  }, [equipos]);

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[#cf1b22]" />
            DistribuciÃ³n de Equipos por Ciudad/Sede
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {cityDots.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Sin datos de telemetrÃ­a. Importe la carga masiva para ver la distribuciÃ³n.
          </p>
        ) : null}
        <div className={`relative w-full ${cityDots.length === 0 ? "opacity-40" : ""}`} style={{ paddingBottom: "90%" }}>
          <svg
            viewBox="0 0 340 440"
            className="absolute inset-0 w-full h-full"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* â”€â”€ Colombia outline (simplified, recognizable shape) â”€â”€ */}
            <defs>
              <linearGradient id="colMap" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f8fafc" />
                <stop offset="100%" stopColor="#f1f5f9" />
              </linearGradient>
              <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.12" />
              </filter>
            </defs>

            {/* Colombia mainland */}
            <path
              d="
                M 130 60
                L 145 52
                L 165 50
                L 195 58
                L 210 70
                L 220 85
                L 225 100
                L 215 110
                L 220 125
                L 230 135
                L 235 150
                L 240 165
                L 235 178
                L 245 190
                L 255 205
                L 260 220
                L 255 235
                L 248 248
                L 245 265
                L 240 280
                L 232 295
                L 220 310
                L 210 325
                L 200 340
                L 190 355
                L 182 368
                L 175 375
                L 168 368
                L 160 355
                L 150 340
                L 140 325
                L 132 310
                L 125 295
                L 118 280
                L 112 265
                L 108 248
                L 105 235
                L 100 220
                L 95 205
                L 95 190
                L 100 175
                L 105 160
                L 108 145
                L 105 130
                L 108 115
                L 115 100
                L 120 85
                L 122 72
                Z
              "
              fill="url(#colMap)"
              stroke="#cbd5e1"
              strokeWidth="1.5"
              filter="url(#shadow)"
            />

            {/* Pacific coast notch */}
            <path
              d="M 95 190 C 80 200 70 225 75 250 C 80 270 90 280 100 290 L 108 265 L 105 235 L 100 220 Z"
              fill="#e2e8f0"
              stroke="#cbd5e1"
              strokeWidth="1"
            />

            {/* Caribbean coast extension (northern) */}
            <path
              d="M 130 60 L 145 52 L 165 50 L 195 58 L 210 70 C 225 68 240 72 250 80 C 242 85 230 88 220 85 L 210 70 Z"
              fill="#dbeafe"
              stroke="#bfdbfe"
              strokeWidth="1"
            />

            {/* Rivers (decorative) */}
            <path
              d="M 155 180 Q 168 220 172 260 Q 175 300 178 340"
              fill="none"
              stroke="#bfdbfe"
              strokeWidth="1.5"
              strokeDasharray="3 2"
              opacity="0.7"
            />
            <path
              d="M 168 200 Q 185 210 200 220 Q 215 230 225 245"
              fill="none"
              stroke="#bfdbfe"
              strokeWidth="1"
              strokeDasharray="3 2"
              opacity="0.6"
            />

            {/* Grid lines (subtle) */}
            {[120, 160, 200, 240, 280, 320, 360].map((y) => (
              <line key={`gy-${y}`} x1="90" y1={y} x2="260" y2={y} stroke="#e2e8f0" strokeWidth="0.5" />
            ))}
            {[110, 140, 170, 200, 230].map((x) => (
              <line key={`gx-${x}`} x1={x} y1="50" x2={x} y2="390" stroke="#e2e8f0" strokeWidth="0.5" />
            ))}

            {/* City dots */}
            {cityDots.map((city) => (
              <g key={city.id}>
                {/* Pulse ring */}
                <circle
                  cx={city.cx}
                  cy={city.cy}
                  r="10"
                  fill={CITY_STATUS_COLORS[city.status]}
                  opacity="0.15"
                  className="animate-ping"
                  style={{ animationDuration: "2.5s" }}
                />
                {/* Dot */}
                <circle
                  cx={city.cx}
                  cy={city.cy}
                  r="6"
                  fill={CITY_STATUS_COLORS[city.status]}
                  stroke="white"
                  strokeWidth="2"
                  className="cursor-pointer"
                  onMouseEnter={() => setTooltip(city)}
                  onMouseLeave={() => setTooltip(null)}
                  style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,.25))" }}
                />
                {/* Count badge */}
                <text
                  x={city.cx + 9}
                  y={city.cy - 7}
                  fontSize="8"
                  fontWeight="600"
                  fill={CITY_STATUS_COLORS[city.status]}
                >
                  {city.count}
                </text>
              </g>
            ))}

            {/* Tooltip box */}
            {tooltip && (
              <g>
                <rect
                  x={Math.min(tooltip.cx + 12, 215)}
                  y={tooltip.cy - 22}
                  width="90"
                  height="36"
                  rx="5"
                  fill="white"
                  stroke="#e2e8f0"
                  strokeWidth="1"
                  style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,.15))" }}
                />
                <text
                  x={Math.min(tooltip.cx + 17, 220)}
                  y={tooltip.cy - 8}
                  fontSize="9"
                  fontWeight="700"
                  fill="#1e293b"
                >
                  {tooltip.name}
                </text>
                <text
                  x={Math.min(tooltip.cx + 17, 220)}
                  y={tooltip.cy + 6}
                  fontSize="8"
                  fill="#64748b"
                >
                  {tooltip.count} equipos
                </text>
              </g>
            )}
          </svg>
        </div>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap gap-3">
          {(
            [
              { label: "Activo",   status: "active"   },
              { label: "Advertencia",  status: "warning"  },
              { label: "CrÃ­tico", status: "critical" },
            ] as { label: string; status: CityDot["status"] }[]
          ).map(({ label, status }) => (
            <div key={status} className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: CITY_STATUS_COLORS[status] }}
              />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** Brands Donut Chart */
const CustomBrandTooltip = ({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: BrandData }>;
  total?: number;
}) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const denom = total && total > 0 ? total : 1;
  return (
    <div className="rounded-lg border border-border bg-card shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold" style={{ color: d.color }}>
        {d.name}
      </p>
      <p className="text-muted-foreground">
        {d.value} proyecciones &nbsp;
        <span className="font-medium text-foreground">
          ({((d.value / denom) * 100).toFixed(1)}%)
        </span>
      </p>
    </div>
  );
};

function BrandsChart() {
  const { data: equipos = [] } = useTelemetriaEquipos();
  const brandData = useMemo(() => aggregateMarcasPie(equipos), [equipos]);
  const total = brandData.reduce((a, b) => a + b.value, 0);

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Proyecciones por Marca</CardTitle>
      </CardHeader>
      <CardContent>
        {brandData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            Sin datos de telemetrÃ­a cargados.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={brandData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
              >
                {brandData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <RechartsTooltip content={<CustomBrandTooltip total={total} />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

/** â”€â”€ TAB 1: Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function DashboardTab() {
  const [reportFilters, setReportFilters] = useState<ReportFiltersState>(DEFAULT_REPORT_FILTERS);
  const { data: equipos = [] } = useTelemetriaEquipos();
  const opportunityRows = useMemo(
    () => mapTelemetriaToOpportunityRows(equipos),
    [equipos]
  );

  const filterOptions = useMemo(() => {
    const marcas = sortLocale(Array.from(new Set(opportunityRows.map((r) => r.brand))));
    const source =
      reportFilters.marca === "all"
        ? opportunityRows
        : opportunityRows.filter((r) => matchesStringFilter(r.brand, reportFilters.marca));
    const modelos = sortLocale(Array.from(new Set(source.map((r) => r.model))));
    const clientes = sortLocale(Array.from(new Set(opportunityRows.map((r) => r.client))));
    const periodos = sortLocale(
      Array.from(
        new Set(
          opportunityRows
            .map((r) => {
              const d = parseFlexibleDate(r.nextDue);
              return d ? d.getFullYear().toString() : null;
            })
            .filter(Boolean) as string[]
        )
      )
    );
    return { marcas, modelos, periodos, clientes };
  }, [reportFilters.marca, opportunityRows]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      {equipos.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No hay registros en telemetrÃ­a. Use la pestaÃ±a <strong>Importar</strong> para cargar
          la plantilla mensual.
        </div>
      )}
      <ReportFiltersBar
        value={reportFilters}
        onChange={(next) => setReportFilters(next)}
        options={filterOptions}
      />
      <KPIRow />
      <KpiChartsSection />

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 space-y-6">
          <MaintenanceCalendar />
          <OpportunitiesTable reportFilters={reportFilters} />
        </div>
        <div className="xl:col-span-2 space-y-6">
          <ColombiaMap />
          <BrandsChart />
        </div>
      </div>
    </motion.div>
  );
}

/** â”€â”€ TAB 2: Import â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function ImportTab() {
  const { data: importHistory = [], isLoading } = useProyectadosImportHistory();

  const importStatusConfig: Record<
    ImportRecord["status"],
    { label: string; className: string }
  > = {
    Success:    { label: "Exitoso",    className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    Failed:     { label: "Fallido",     className: "bg-red-100 text-red-700 border-red-200"             },
    Processing: { label: "Procesando", className: "bg-amber-100 text-amber-700 border-amber-200"       },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6 max-w-3xl"
    >
      <ProyectadosImportPanel />

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Historial de Importaciones</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4">
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs font-semibold pl-4">Fecha</TableHead>
                  <TableHead className="text-xs font-semibold">Nombre del Archivo</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Registros</TableHead>
                  <TableHead className="text-xs font-semibold">Estado</TableHead>
                  <TableHead className="text-xs font-semibold pr-4">Usuario</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">
                      AÃºn no hay importaciones de telemetrÃ­a registradas.
                    </TableCell>
                  </TableRow>
                ) : (
                  importHistory.map((row: ProyectadosImportLog, i: number) => (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      <TableCell className="text-xs pl-4 py-2.5 text-muted-foreground whitespace-nowrap">
                        {row.date}
                      </TableCell>
                      <TableCell className="text-xs py-2.5 font-medium font-mono">{row.fileName}</TableCell>
                      <TableCell className="text-xs py-2.5 text-right font-semibold">{row.records}</TableCell>
                      <TableCell className="py-2.5">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${importStatusConfig[row.status].className}`}
                        >
                          {importStatusConfig[row.status].label}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs py-2.5 pr-4 text-muted-foreground">{row.user}</TableCell>
                    </motion.tr>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

/** â”€â”€ TAB 3: Automation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function AutomationTab() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6 max-w-2xl"
    >
      {/* Coming Soon Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-5 py-4"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-amber-100 p-2">
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="font-bold text-amber-800 text-sm">PrÃ³ximamente</p>
            <p className="text-xs text-amber-700 mt-0.5">
              El mÃ³dulo de automatizaciÃ³n se encuentra actualmente en desarrollo. Las
              funcionalidades se habilitarÃ¡n progresivamente en las prÃ³ximas versiones.
            </p>
          </div>
        </div>
        {/* Decorative shimmer */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-200/30" />
          <div className="absolute -right-4 bottom-0 h-20 w-20 rounded-full bg-orange-200/20" />
        </div>
      </motion.div>

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground">
          Flujo de Trabajo de Mantenimiento Automatizado
        </h2>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
          Este mÃ³dulo automatizarÃ¡ el ciclo de mantenimiento de extremo a extremo â€” desde la
          ingestiÃ³n de datos de SAP hasta la programaciÃ³n, notificaciÃ³n al cliente, generaciÃ³n
          de cotizaciones y actualizaciÃ³n del panel en tiempo real. La integraciÃ³n planificada
          reduce el esfuerzo manual y garantiza que ningÃºn equipo sea pasado por alto.
        </p>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical connector line */}
        <div className="absolute left-6 top-8 bottom-8 w-px bg-gradient-to-b from-[#cf1b22]/40 via-border to-border" />

        <div className="space-y-0">
          {AUTOMATION_STEPS.map((step, i) => {
            const Icon = step.icon;
            const isDev = step.status === "In Development";
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="relative flex gap-5 pb-0"
              >
                {/* Numbered circle */}
                <div className="relative z-10 flex-shrink-0">
                  <div
                    className={`h-12 w-12 rounded-full border-2 flex items-center justify-center shadow-sm
                      ${isDev
                        ? "bg-amber-50 border-amber-300"
                        : "bg-white border-border"
                      }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${isDev ? "text-amber-600" : "text-[#cf1b22]"}`}
                    />
                  </div>
                  <span
                    className={`absolute -top-1 -right-1 h-5 w-5 rounded-full text-[10px] font-bold flex items-center justify-center border-2 border-background shadow-sm
                      ${isDev ? "bg-amber-500 text-white" : "bg-[#cf1b22] text-white"}`}
                  >
                    {step.number}
                  </span>
                </div>

                {/* Content */}
                <div
                  className={`flex-1 rounded-xl border p-4 mb-3 transition-shadow hover:shadow-md
                    ${isDev ? "border-amber-200 bg-amber-50/40" : "border-border bg-card"}`}
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm text-foreground">{step.title}</h3>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold flex-shrink-0
                        ${isDev
                          ? "bg-amber-100 text-amber-700 border-amber-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                    >
                      {isDev ? "En Desarrollo" : "Planificado"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// â”€â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function ProjectedMaintenancePage() {
  return (
    <AppShell breadcrumbs={[{ label: "Inicio", href: "/dashboard" }, { label: "Mantenimiento Proyectado" }]}>
    <div className="space-y-6">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-[#cf1b22]/10">
              <Wrench className="h-4.5 w-4.5 text-[#cf1b22]" style={{ height: "18px", width: "18px" }} />
            </span>
            Mantenimiento Proyectado
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            ProgramaciÃ³n proactiva de mantenimiento y gestiÃ³n del ciclo de vida de equipos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" />
            Exportar Reporte
          </Button>
          <Button size="sm" className="gap-1.5 text-xs bg-[#cf1b22] hover:bg-[#b01820] text-white">
            <Calendar className="h-3.5 w-3.5" />
            Programar Mantenimiento
          </Button>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="bg-muted/60 border border-border/50 p-1 gap-1">
          <TabsTrigger
            value="dashboard"
            className="data-[state=active]:bg-[#cf1b22] data-[state=active]:text-white data-[state=active]:shadow-sm text-sm px-5"
          >
            <BarChartIcon className="h-3.5 w-3.5 mr-1.5" />
            Panel
          </TabsTrigger>
          <TabsTrigger
            value="import"
            className="data-[state=active]:bg-[#cf1b22] data-[state=active]:text-white data-[state=active]:shadow-sm text-sm px-5"
          >
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            Importar
          </TabsTrigger>
          <TabsTrigger
            value="automation"
            className="data-[state=active]:bg-[#cf1b22] data-[state=active]:text-white data-[state=active]:shadow-sm text-sm px-5"
          >
            <Zap className="h-3.5 w-3.5 mr-1.5" />
            AutomatizaciÃ³n
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-0">
          <DashboardTab />
        </TabsContent>
        <TabsContent value="import" className="mt-0">
          <ImportTab />
        </TabsContent>
        <TabsContent value="automation" className="mt-0">
          <AutomationTab />
        </TabsContent>
      </Tabs>
    </div>
    </AppShell>
  );
}

/** Small inline icon to avoid BarChart3 import collision */
function BarChartIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6"  y1="20" x2="6"  y2="14" />
    </svg>
  );
}
