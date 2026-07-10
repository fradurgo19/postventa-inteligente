"use client";

import { useState, useCallback } from "react";
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
import { useProjectedKpis } from "@/hooks/use-projected-maintenance";
import { formatCOP } from "@/lib/mock-data";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ─────────────────────────────────────────────────────────────────────

type MaintenanceStatus = "Scheduled" | "Overdue" | "In Progress" | "Completed";

interface MaintenanceEvent {
  id: number;
  day: number;
  title: string;
  status: MaintenanceStatus;
}

interface MaintenanceRow {
  id: number;
  equipment: string;
  brand: string;
  model: string;
  hours: number;
  lastMaintenance: string;
  nextDue: string;
  status: MaintenanceStatus;
  advisor: string;
}

interface ImportRecord {
  id: number;
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

// ─── Mock Data ─────────────────────────────────────────────────────────────────

const MAINTENANCE_EVENTS: MaintenanceEvent[] = [
  { id: 1,  day: 2,  title: "CAT 320 – PM500",        status: "Completed"  },
  { id: 2,  day: 3,  title: "Volvo EC220 – PM1000",   status: "Completed"  },
  { id: 3,  day: 5,  title: "Komatsu PC200 – PM250",  status: "Completed"  },
  { id: 4,  day: 7,  title: "Hitachi ZX200 – PM500",  status: "Overdue"    },
  { id: 5,  day: 8,  title: "JCB 3CX – PM250",        status: "Overdue"    },
  { id: 6,  day: 10, title: "CAT 336 – PM2000",       status: "In Progress"},
  { id: 7,  day: 12, title: "Doosan DX225 – PM500",   status: "Scheduled"  },
  { id: 8,  day: 13, title: "Liebherr R926 – PM1000", status: "Scheduled"  },
  { id: 9,  day: 15, title: "Volvo L120 – PM250",     status: "Scheduled"  },
  { id: 10, day: 16, title: "CAT 966 – PM500",        status: "Scheduled"  },
  { id: 11, day: 17, title: "Komatsu D65 – PM1000",   status: "In Progress"},
  { id: 12, day: 19, title: "Hitachi EX200 – PM250",  status: "Scheduled"  },
  { id: 13, day: 21, title: "JCB 540-170 – PM500",    status: "Scheduled"  },
  { id: 14, day: 22, title: "CAT 420F – PM2000",      status: "Scheduled"  },
  { id: 15, day: 24, title: "Doosan DX300 – PM250",   status: "Scheduled"  },
  { id: 16, day: 25, title: "Volvo EC480 – PM1000",   status: "Scheduled"  },
  { id: 17, day: 27, title: "CAT 390 – PM500",        status: "Scheduled"  },
  { id: 18, day: 28, title: "Komatsu PC400 – PM2000", status: "Scheduled"  },
  { id: 19, day: 29, title: "Liebherr LTM – PM250",   status: "Scheduled"  },
  { id: 20, day: 30, title: "Hitachi ZX350 – PM1000", status: "Scheduled"  },
];

const OPPORTUNITY_ROWS: MaintenanceRow[] = [
  { id: 1,  equipment: "CAT 320 GC",      brand: "Caterpillar", model: "320 GC",    hours: 2480, lastMaintenance: "15/05/2025", nextDue: "15/07/2025", status: "Scheduled",   advisor: "Carlos Ruiz"    },
  { id: 2,  equipment: "Volvo EC220E",     brand: "Volvo CE",    model: "EC220E",    hours: 3150, lastMaintenance: "01/04/2025", nextDue: "01/06/2025", status: "Overdue",     advisor: "Mónica Torres"  },
  { id: 3,  equipment: "Komatsu PC200-8",  brand: "Komatsu",     model: "PC200-8",   hours: 1870, lastMaintenance: "20/06/2025", nextDue: "20/08/2025", status: "Scheduled",   advisor: "Felipe Gómez"   },
  { id: 4,  equipment: "CAT 336 Next",     brand: "Caterpillar", model: "336 Next",  hours: 4200, lastMaintenance: "10/03/2025", nextDue: "10/05/2025", status: "Overdue",     advisor: "Sandra Mejía"   },
  { id: 5,  equipment: "JCB 3CX Compact",  brand: "JCB",         model: "3CX",       hours: 980,  lastMaintenance: "28/06/2025", nextDue: "28/09/2025", status: "In Progress", advisor: "Andrés Vargas"   },
  { id: 6,  equipment: "Hitachi ZX200-6",  brand: "Hitachi",     model: "ZX200-6",   hours: 2760, lastMaintenance: "05/05/2025", nextDue: "05/08/2025", status: "Scheduled",   advisor: "Laura Castro"    },
  { id: 7,  equipment: "Doosan DX225LC",   brand: "Doosan",      model: "DX225LC",   hours: 5100, lastMaintenance: "15/02/2025", nextDue: "15/04/2025", status: "Overdue",     advisor: "Carlos Ruiz"    },
  { id: 8,  equipment: "Volvo L120H",      brand: "Volvo CE",    model: "L120H",     hours: 3400, lastMaintenance: "18/06/2025", nextDue: "18/09/2025", status: "Completed",   advisor: "Felipe Gómez"   },
  { id: 9,  equipment: "CAT 966M XE",      brand: "Caterpillar", model: "966M XE",   hours: 1600, lastMaintenance: "22/06/2025", nextDue: "22/09/2025", status: "Completed",   advisor: "Sandra Mejía"   },
  { id: 10, equipment: "Liebherr R926 Li", brand: "Liebherr",    model: "R926 Li",   hours: 2200, lastMaintenance: "30/05/2025", nextDue: "30/07/2025", status: "In Progress", advisor: "Andrés Vargas"   },
];

const IMPORT_HISTORY: ImportRecord[] = [
  { id: 1, date: "10/07/2025 09:14", fileName: "equipos_julio_2025.xlsx",   records: 156, status: "Success",    user: "admin@partequipos.co" },
  { id: 2, date: "03/07/2025 14:32", fileName: "mantenimientos_q2.xlsx",    records: 89,  status: "Success",    user: "supervisor@partequipos.co" },
  { id: 3, date: "25/06/2025 11:05", fileName: "importacion_junio.csv",     records: 42,  status: "Failed",     user: "admin@partequipos.co" },
  { id: 4, date: "18/06/2025 08:47", fileName: "equipos_semana24.xlsx",     records: 78,  status: "Success",    user: "asistente@partequipos.co" },
  { id: 5, date: "10/06/2025 16:20", fileName: "consolidado_mayo_2025.xls", records: 201, status: "Processing", user: "admin@partequipos.co" },
];

const AUTOMATION_STEPS: AutomationStep[] = [
  { number: 1, icon: Cpu,        title: "Integración SAP",       description: "Extrae diariamente a las 6 AM los datos de equipos directamente del módulo SAP PM. Sincroniza horómetros, órdenes de trabajo y maestros de equipos automáticamente.", status: "Planned"         },
  { number: 2, icon: RefreshCw,  title: "Análisis de Horómetro",   description: "Compara las lecturas actuales del horómetro con los umbrales de mantenimiento definidos por modelo. Marca los equipos que se acercan a los intervalos de servicio con ventanas de tolerancia configurables.", status: "Planned"         },
  { number: 3, icon: Calendar,   title: "Programación Automática",  description: "Crea órdenes de trabajo en borrador con 30 días de anticipación según las horas de operación proyectadas y los planes de mantenimiento. Asigna automáticamente a los asesores de servicio disponibles.", status: "In Development"  },
  { number: 4, icon: Bell,       title: "Motor de Notificaciones",   description: "Envía alertas automáticas por correo y SMS a los asesores de servicio y clientes finales cuando el mantenimiento está próximo. Recordatorios configurables a 30, 15 y 7 días.", status: "Planned"         },
  { number: 5, icon: FileText,   title: "Generación de PDF",        description: "Genera automáticamente cotizaciones de mantenimiento personalizadas con precios de repuestos actuales, estimaciones de mano de obra e historial de servicio. Se adjuntan a las órdenes de trabajo y se envían por correo.", status: "Planned"         },
  { number: 6, icon: Zap,        title: "Actualización del Panel",      description: "Recálculo de KPIs en tiempo real y actualización del panel después de cada ciclo de flujo de trabajo. Seguimiento de tasas de cumplimiento, tendencias de vencimiento y métricas de desempeño de asesores.", status: "In Development"  },
];

const BRAND_DATA: BrandData[] = [
  { name: "Caterpillar", value: 52, color: "#cf1b22" },
  { name: "Volvo CE",    value: 31, color: "#f97316" },
  { name: "Komatsu",     value: 28, color: "#3b82f6" },
  { name: "Hitachi",     value: 24, color: "#8b5cf6" },
  { name: "JCB",         value: 21, color: "#10b981" },
];

const CITY_DOTS: CityDot[] = [
  { id: "bogota",       name: "Bogotá",       count: 48, status: "active",   cx: 178, cy: 245 },
  { id: "medellin",     name: "Medellín",     count: 31, status: "active",   cx: 155, cy: 190 },
  { id: "cali",         name: "Cali",         count: 22, status: "warning",  cx: 138, cy: 280 },
  { id: "barranquilla", name: "Barranquilla", count: 18, status: "active",   cx: 172, cy: 98  },
  { id: "bucaramanga",  name: "Bucaramanga",  count: 15, status: "critical", cx: 192, cy: 175 },
  { id: "pereira",      name: "Pereira",      count: 12, status: "warning",  cx: 147, cy: 225 },
  { id: "manizales",    name: "Manizales",    count: 10, status: "active",   cx: 152, cy: 210 },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

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

// ─── Sub-components ────────────────────────────────────────────────────────────

/** KPI Row — datos desde v_kpi_* / telemetría */
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
        description="Telemetría registrada"
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
        description="Próximos mantenimientos"
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
            Insumos Proyectados — {formatCOP(kpis.insumosProyectadosTotal)}
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

/** Monthly Maintenance Calendar */
function MaintenanceCalendar() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [hoveredEvent, setHoveredEvent] = useState<MaintenanceEvent | null>(null);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);

  const eventsByDay: Record<number, MaintenanceEvent[]> = {};
  MAINTENANCE_EVENTS.forEach((ev) => {
    if (!eventsByDay[ev.day]) eventsByDay[ev.day] = [];
    eventsByDay[ev.day].push(ev);
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
          {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d) => (
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
                          {ev.title.split("–")[0].trim()}
                        </div>
                      ))}
                      {events.length > 2 && (
                        <span className="text-[9px] text-muted-foreground pl-0.5">
                          +{events.length - 2} más
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
                Día {hoveredEvent.day} ·{" "}
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
function OpportunitiesTable() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;
  const totalRows = 24;

  const filtered = OPPORTUNITY_ROWS.filter((r) => {
    const matchSearch =
      r.equipment.toLowerCase().includes(search.toLowerCase()) ||
      r.brand.toLowerCase().includes(search.toLowerCase()) ||
      r.advisor.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <CardTitle className="text-base font-semibold">Oportunidades Próximas</CardTitle>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-52">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar equipo…"
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
                <TableHead className="text-xs font-semibold">Último Mant.</TableHead>
                <TableHead className="text-xs font-semibold">Próximo Venc.</TableHead>
                <TableHead className="text-xs font-semibold">Estado</TableHead>
                <TableHead className="text-xs font-semibold pr-4">Asesor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-sm">
                    No se encontraron resultados
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row, i) => (
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
            Mostrando {(page - 1) * rowsPerPage + 1}–
            {Math.min(page * rowsPerPage, totalRows)} de {totalRows} resultados
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
            {[1, 2, 3].map((p) => (
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
              disabled={page === 3}
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

/** Colombia SVG Map */
function ColombiaMap() {
  const [tooltip, setTooltip] = useState<CityDot | null>(null);

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[#cf1b22]" />
            Distribución de Equipos por Ciudad
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative w-full" style={{ paddingBottom: "90%" }}>
          <svg
            viewBox="0 0 340 440"
            className="absolute inset-0 w-full h-full"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* ── Colombia outline (simplified, recognizable shape) ── */}
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
            {CITY_DOTS.map((city) => (
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
              { label: "Crítico", status: "critical" },
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
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: BrandData }>;
}) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-card shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold" style={{ color: d.color }}>
        {d.name}
      </p>
      <p className="text-muted-foreground">
        {d.value} mantenimientos &nbsp;
        <span className="font-medium text-foreground">
          ({((d.value / BRAND_DATA.reduce((a, b) => a + b.value, 0)) * 100).toFixed(1)}%)
        </span>
      </p>
    </div>
  );
};

function BrandsChart() {
  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Mantenimientos por Marca</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={BRAND_DATA}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
            >
              {BRAND_DATA.map((entry, i) => (
                <Cell key={i} fill={entry.color} stroke="transparent" />
              ))}
            </Pie>
            <RechartsTooltip content={<CustomBrandTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/** ── TAB 1: Dashboard ─────────────────────────────────────────────────────── */
function DashboardTab() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      <KPIRow />
      <KpiChartsSection />

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 space-y-6">
          <MaintenanceCalendar />
          <OpportunitiesTable />
        </div>
        <div className="xl:col-span-2 space-y-6">
          <ColombiaMap />
        </div>
      </div>
    </motion.div>
  );
}

/** ── TAB 2: Import ────────────────────────────────────────────────────────── */
function ImportTab() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadFile, setUploadFile] = useState<string | null>(null);

  const simulateUpload = useCallback((name: string) => {
    setUploadFile(name);
    setUploadProgress(0);
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 18 + 4;
      if (p >= 100) {
        p = 100;
        clearInterval(iv);
        setTimeout(() => setUploadProgress(null), 1200);
      }
      setUploadProgress(Math.round(p));
    }, 200);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) simulateUpload(f.name);
    },
    [simulateUpload]
  );

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

      {/* Upload zone legacy */}
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Upload className="h-4 w-4 text-[#cf1b22]" />
            Importar Datos de Equipos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Drag & Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`
              relative rounded-xl border-2 border-dashed transition-all duration-200
              flex flex-col items-center justify-center gap-3 py-12 px-6 text-center
              ${isDragging
                ? "border-[#cf1b22] bg-[#cf1b22]/5"
                : "border-border/70 hover:border-[#cf1b22]/50 hover:bg-muted/30"
              }
            `}
          >
            <div
              className={`rounded-full p-4 transition-colors ${
                isDragging ? "bg-[#cf1b22]/10" : "bg-muted"
              }`}
            >
              <FileSpreadsheet
                className={`h-8 w-8 ${
                  isDragging ? "text-[#cf1b22]" : "text-muted-foreground"
                }`}
              />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                {isDragging ? "Suelta tu archivo aquí" : "Arrastra y suelta tu archivo aquí"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                o haz clic para buscar en tu computadora
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              {[".xlsx", ".xls", ".csv"].map((ext) => (
                <Badge key={ext} variant="secondary" className="font-mono text-xs">
                  {ext}
                </Badge>
              ))}
            </div>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) simulateUpload(f.name);
                e.target.value = "";
              }}
            />
          </div>

          {/* Progress */}
          <AnimatePresence>
            {uploadProgress !== null && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground truncate max-w-[60%]">
                    {uploadFile}
                  </span>
                  <span className="text-muted-foreground">{uploadProgress}%</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-[#cf1b22] rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
                {uploadProgress === 100 && (
                  <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCheck className="h-3.5 w-3.5" /> Carga completa
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button
              className="bg-[#cf1b22] hover:bg-[#b01820] text-white"
              onClick={() => simulateUpload("equipos_import.xlsx")}
            >
              <Upload className="h-4 w-4 mr-2" />
              Subir Archivo
            </Button>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Descargar Plantilla
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Import history */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Historial de Importaciones</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
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
              {IMPORT_HISTORY.map((row, i) => (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/** ── TAB 3: Automation ────────────────────────────────────────────────────── */
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
            <p className="font-bold text-amber-800 text-sm">Próximamente</p>
            <p className="text-xs text-amber-700 mt-0.5">
              El módulo de automatización se encuentra actualmente en desarrollo. Las
              funcionalidades se habilitarán progresivamente en las próximas versiones.
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
          Este módulo automatizará el ciclo de mantenimiento de extremo a extremo — desde la
          ingestión de datos de SAP hasta la programación, notificación al cliente, generación
          de cotizaciones y actualización del panel en tiempo real. La integración planificada
          reduce el esfuerzo manual y garantiza que ningún equipo sea pasado por alto.
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

// ─── Page ──────────────────────────────────────────────────────────────────────

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
            Programación proactiva de mantenimiento y gestión del ciclo de vida de equipos
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
            Automatización
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
