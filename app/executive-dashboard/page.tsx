"use client";

import { useState, useMemo } from "react";
import { motion, type Variants } from "framer-motion";
import {
  DollarSign,
  Wrench,
  CheckCircle2,
  Package,
  Star,
  TrendingUp,
  TrendingDown,
  ChevronUp,
  ChevronDown,
  MapPin,
  Clock,
  AlertTriangle,
  ShoppingCart,
  FileText,
  Bell,
  ArrowRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { KPICard } from "@/components/ui/kpi-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatCOP(value: number): string {
  if (value >= 1_000_000_000)
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000)
    return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)
    return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString("es-CO")}`;
}

function formatCOPFull(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// ── Mock data ──────────────────────────────────────────────────────────────────

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const monthlyRevenue = [
  { month: "Ene", budget: 95, actual: 88 },
  { month: "Feb", budget: 100, actual: 104 },
  { month: "Mar", budget: 105, actual: 112 },
  { month: "Abr", budget: 110, actual: 108 },
  { month: "May", budget: 115, actual: 121 },
  { month: "Jun", budget: 118, actual: 130 },
  { month: "Jul", budget: 120, actual: 125 },
  { month: "Ago", budget: 122, actual: 135 },
  { month: "Sep", budget: 125, actual: 128 },
  { month: "Oct", budget: 128, actual: 140 },
  { month: "Nov", budget: 130, actual: 142 },
  { month: "Dic", budget: 132, actual: 145 },
];

const maintenanceByStatus = [
  { status: "Programado", count: 34, fill: "#3b82f6" },
  { status: "En Progreso", count: 12, fill: "#f59e0b" },
  { status: "Completado", count: 89, fill: "#10b981" },
  { status: "Vencido", count: 8, fill: "#ef4444" },
];

const topCustomers = [
  { rank: 1, name: "Cemex Colombia S.A.S.", equipment: 18, revenue: 345_600_000, growth: 22.4 },
  { rank: 2, name: "Holcim Colombia S.A.", equipment: 14, revenue: 289_400_000, growth: 18.1 },
  { rank: 3, name: "Argos S.A.", equipment: 12, revenue: 234_800_000, growth: -3.2 },
  { rank: 4, name: "Mineros S.A.", equipment: 9, revenue: 198_500_000, growth: 35.7 },
  { rank: 5, name: "Drummond Ltd.", equipment: 7, revenue: 167_300_000, growth: 12.9 },
];

const topBrands = [
  { brand: "Caterpillar", equipment: 38, revenue: 520_000_000, share: 42.1 },
  { brand: "Komatsu", equipment: 24, revenue: 310_000_000, share: 25.1 },
  { brand: "Volvo CE", equipment: 19, revenue: 245_000_000, share: 19.8 },
  { brand: "John Deere", equipment: 11, revenue: 98_000_000, share: 7.9 },
  { brand: "Hitachi", equipment: 6, revenue: 62_000_000, share: 5.1 },
];

const topAdvisors = [
  { name: "Carlos Mejía", initials: "CM", maintenances: 42, revenue: 185_400_000, rating: 5 },
  { name: "Ana Torres", initials: "AT", maintenances: 38, revenue: 172_300_000, rating: 5 },
  { name: "Javier Ríos", initials: "JR", maintenances: 35, revenue: 158_700_000, rating: 4 },
  { name: "María López", initials: "ML", maintenances: 29, revenue: 134_200_000, rating: 4 },
  { name: "Diego Sánchez", initials: "DS", maintenances: 26, revenue: 119_800_000, rating: 4 },
];

const topParts = [
  { sap: "10-9891-F", name: "Filtro de Aceite Motor CAT", units: 312, revenue: 62_400_000 },
  { sap: "10-5631-H", name: "Kit de Frenos Hidráulicos", units: 156, revenue: 54_600_000 },
  { sap: "10-3421-C", name: "Correa Dentada Principal", units: 204, revenue: 48_960_000 },
  { sap: "10-7832-L", name: "Aceite Hidráulico SAE 46", units: 487, revenue: 43_830_000 },
  { sap: "10-2241-E", name: "Filtro de Combustible D11", units: 278, revenue: 38_920_000 },
];

const calendarEvents: Record<number, { type: "maintenance" | "overdue" | "scheduled" }[]> = {
  3: [{ type: "maintenance" }],
  5: [{ type: "scheduled" }, { type: "scheduled" }],
  8: [{ type: "maintenance" }],
  12: [{ type: "overdue" }],
  15: [{ type: "maintenance" }, { type: "scheduled" }],
  18: [{ type: "scheduled" }],
  22: [{ type: "maintenance" }],
  25: [{ type: "overdue" }, { type: "maintenance" }],
  28: [{ type: "scheduled" }],
};

const upcomingMaintenances = [
  { date: "Hoy", equipment: "CAT 320D2 — Cemex Bogotá", type: "500h PM", status: "in_progress" },
  { date: "Mañana", equipment: "Komatsu PC360 — Holcim", type: "250h PM", status: "scheduled" },
  { date: "Mar 26", equipment: "Volvo EC380 — Argos Cali", type: "1000h PM", status: "scheduled" },
  { date: "Mar 27", equipment: "CAT D8T — Mineros S.A.", type: "Correctivo", status: "overdue" },
  { date: "Mar 28", equipment: "JD 844L — Drummond", type: "500h PM", status: "scheduled" },
  { date: "Mar 29", equipment: "Hitachi ZX350 — Holcim", type: "250h PM", status: "scheduled" },
  { date: "Mar 30", equipment: "CAT 745 — Cemex Medellín", type: "2000h PM", status: "scheduled" },
];

const activityFeed = [
  { id: 1, type: "maintenance", icon: Wrench, color: "blue", title: "Mantenimiento completado", desc: "CAT 320D2 — 500h PM finalizado. Cemex Bogotá.", time: "hace 12 min" },
  { id: 2, type: "parts", icon: Package, color: "green", title: "Venta de repuesto", desc: "Filtro aceite x4 despachado a Holcim Planta Norte.", time: "hace 28 min" },
  { id: 3, type: "quote", icon: FileText, color: "amber", title: "Cotización enviada", desc: "CPP#2024-0891 — Argos S.A. por $45.600.000 COP.", time: "hace 45 min" },
  { id: 4, type: "alert", icon: AlertTriangle, color: "red", title: "Alerta de vencimiento", desc: "CAT D8T — Mantenimiento vencido hace 3 días.", time: "hace 1 h" },
  { id: 5, type: "maintenance", icon: Wrench, color: "blue", title: "Mantenimiento programado", desc: "Komatsu PC360 — 250h PM para mañana 8:00 AM.", time: "hace 2 h" },
  { id: 6, type: "parts", icon: ShoppingCart, color: "green", title: "Orden de compra recibida", desc: "OC#4521 — Kit frenos hidráulicos x2 unidades.", time: "hace 3 h" },
  { id: 7, type: "quote", icon: FileText, color: "amber", title: "Cotización aprobada", desc: "CPP#2024-0887 — Drummond Ltd. $98.200.000 COP.", time: "hace 4 h" },
  { id: 8, type: "alert", icon: Bell, color: "red", title: "Revisión requerida", desc: "Volvo EC380 — Fuga hidráulica reportada en campo.", time: "hace 5 h" },
  { id: 9, type: "maintenance", icon: CheckCircle2, color: "blue", title: "Inspección completada", desc: "JD 844L — Pre-entrega inspeccionada y aprobada.", time: "hace 6 h" },
  { id: 10, type: "parts", icon: Package, color: "green", title: "Stock actualizado", desc: "Ingreso de 120 filtros de combustible al almacén.", time: "hace 7 h" },
];

const equipmentTable = [
  { id: "EQ-001", name: "Excavadora 320D2", brand: "Caterpillar", model: "320D2", customer: "Cemex Bogotá", hours: 4820, status: "operational", lastMaint: "2024-01-15", nextDue: "2024-04-15", revenue: 85_400_000 },
  { id: "EQ-002", name: "Excavadora PC360", brand: "Komatsu", model: "PC360-11", customer: "Holcim Norte", hours: 3210, status: "maintenance", lastMaint: "2024-01-20", nextDue: "2024-03-25", revenue: 72_100_000 },
  { id: "EQ-003", name: "Excavadora EC380", brand: "Volvo CE", model: "EC380E", customer: "Argos Cali", hours: 5640, status: "operational", lastMaint: "2024-02-01", nextDue: "2024-05-01", revenue: 63_900_000 },
  { id: "EQ-004", name: "Buldócer D8T", brand: "Caterpillar", model: "D8T", customer: "Mineros S.A.", hours: 7890, status: "critical", lastMaint: "2023-12-10", nextDue: "2024-03-10", revenue: 91_200_000 },
  { id: "EQ-005", name: "Motoniveladora 844L", brand: "John Deere", model: "844L", customer: "Drummond Ltd.", hours: 2340, status: "operational", lastMaint: "2024-02-14", nextDue: "2024-05-14", revenue: 48_700_000 },
  { id: "EQ-006", name: "Excavadora ZX350", brand: "Hitachi", model: "ZX350H-7", customer: "Holcim Sur", hours: 4120, status: "idle", lastMaint: "2024-01-28", nextDue: "2024-04-28", revenue: 55_300_000 },
  { id: "EQ-007", name: "Camión 745", brand: "Caterpillar", model: "745", customer: "Cemex Medellín", hours: 6310, status: "operational", lastMaint: "2024-02-08", nextDue: "2024-05-08", revenue: 78_600_000 },
  { id: "EQ-008", name: "Excavadora 390F", brand: "Caterpillar", model: "390F", customer: "Argos Bogotá", hours: 3980, status: "maintenance", lastMaint: "2024-02-15", nextDue: "2024-03-29", revenue: 67_400_000 },
  { id: "EQ-009", name: "Excavadora PC490", brand: "Komatsu", model: "PC490-11", customer: "Cemex Barranquilla", hours: 2780, status: "operational", lastMaint: "2024-02-20", nextDue: "2024-05-20", revenue: 43_800_000 },
  { id: "EQ-010", name: "Cargador 980M", brand: "Caterpillar", model: "980M", customer: "Mineros Zaragoza", hours: 5120, status: "operational", lastMaint: "2024-01-30", nextDue: "2024-04-30", revenue: 59_100_000 },
];

const colombiaRegions = [
  { city: "Bogotá", x: 200, y: 210, revenue: 420_000_000, color: "#cf1b22" },
  { city: "Medellín", x: 170, y: 175, revenue: 280_000_000, color: "#3b82f6" },
  { city: "Cali", x: 155, y: 240, revenue: 195_000_000, color: "#10b981" },
  { city: "Barranquilla", x: 195, y: 100, revenue: 148_000_000, color: "#f59e0b" },
  { city: "Bucaramanga", x: 215, y: 155, revenue: 112_000_000, color: "#8b5cf6" },
  { city: "Cartagena", x: 175, y: 105, revenue: 87_000_000, color: "#ec4899" },
  { city: "Pereira", x: 165, y: 210, revenue: 63_000_000, color: "#06b6d4" },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

type SortKey = keyof (typeof equipmentTable)[0];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    operational: { label: "Operativo", cls: "bg-emerald-100 text-emerald-700" },
    maintenance: { label: "En Mantenimiento", cls: "bg-blue-100 text-blue-700" },
    idle: { label: "Inactivo", cls: "bg-gray-100 text-gray-600" },
    critical: { label: "Crítico", cls: "bg-red-100 text-red-700" },
  };
  const s = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-600" };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", s.cls)}>
      {s.label}
    </span>
  );
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <span className="text-amber-400 text-sm">
      {"★".repeat(rating)}{"☆".repeat(5 - rating)}
    </span>
  );
}

function RevenueTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-foreground mb-1">{label} 2024</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-medium">
          {p.name}: {formatCOPFull(p.value * 1_000_000)}
        </p>
      ))}
    </div>
  );
}

// Mini calendar
const DAYS = ["L", "M", "M", "J", "V", "S", "D"];
function MiniCalendar() {
  const today = 24;
  const firstDay = 5; // Mar 2024 starts on Friday (index 4 in Mon-first, shift)
  const totalDays = 31;
  const cells: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="select-none">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        Marzo 2024
      </p>
      <div className="grid grid-cols-7 gap-px text-center mb-1">
        {DAYS.map((d, i) => (
          <div key={i} className="text-[10px] font-semibold text-muted-foreground py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px text-center">
        {cells.map((d, i) => {
          const events = (d ? calendarEvents[d] : undefined) ?? [];
          const isToday = d === today;
          return (
            <div
              key={i}
              className={cn(
                "h-8 flex flex-col items-center justify-center rounded text-xs font-medium relative",
                !d && "opacity-0 pointer-events-none",
                isToday && "bg-[#cf1b22] text-white rounded-full",
                !isToday && d && "hover:bg-muted cursor-pointer text-foreground"
              )}
            >
              {d}
              {events.length > 0 && !isToday && (
                <div className="flex gap-0.5 absolute bottom-0.5">
                  {events.slice(0, 2).map((ev, ei) => (
                    <div
                      key={ei}
                      className={cn(
                        "w-1 h-1 rounded-full",
                        ev.type === "maintenance" && "bg-blue-500",
                        ev.type === "scheduled" && "bg-emerald-500",
                        ev.type === "overdue" && "bg-red-500"
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Colombia SVG map (simplified outline)
function ColombiaMap() {
  return (
    <div className="relative">
      <svg
        viewBox="0 0 370 430"
        className="w-full max-h-64 opacity-90"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Simplified Colombia outline */}
        <path
          d="M160,60 L185,55 L210,60 L230,75 L245,95 L250,115 L240,130 L250,150
             L260,170 L255,190 L265,210 L270,230 L260,255 L250,270 L240,290
             L230,310 L220,330 L210,355 L200,375 L190,385 L180,375 L170,355
             L160,335 L150,315 L140,295 L130,275 L120,255 L110,235 L105,215
             L100,195 L108,175 L115,155 L120,135 L115,115 L120,95 L135,80 Z"
          fill="#e5e7eb"
          stroke="#d1d5db"
          strokeWidth="1.5"
        />
        {/* Caribbean coast bump */}
        <path
          d="M160,60 L150,50 L145,40 L155,35 L170,38 L185,35 L200,38 L210,45 L210,60"
          fill="#e5e7eb"
          stroke="#d1d5db"
          strokeWidth="1.5"
        />
        {/* Pacific coast indent */}
        <path
          d="M105,215 L90,220 L80,240 L85,260 L95,270 L110,265 L120,255"
          fill="#e5e7eb"
          stroke="#d1d5db"
          strokeWidth="1.5"
        />
        {/* City dots */}
        {colombiaRegions.map((r) => (
          <g key={r.city}>
            <circle cx={r.x} cy={r.y} r={7} fill={r.color} opacity={0.85} />
            <circle cx={r.x} cy={r.y} r={3} fill="white" />
          </g>
        ))}
      </svg>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function ExecutiveDashboardPage() {
  const [sortKey, setSortKey] = useState<SortKey>("revenue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sortedEquipment = useMemo(() => {
    return [...equipmentTable].sort((a, b) => {
      const va = a[sortKey] as any;
      const vb = b[sortKey] as any;
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (col !== sortKey) return <ChevronUp className="h-3 w-3 text-muted-foreground/40" />;
    return sortDir === "asc"
      ? <ChevronUp className="h-3 w-3 text-[#cf1b22]" />
      : <ChevronDown className="h-3 w-3 text-[#cf1b22]" />;
  }

  const maintenanceColors: Record<string, string> = {
    Programado: "#3b82f6",
    "En Progreso": "#f59e0b",
    Completado: "#10b981",
    Vencido: "#ef4444",
  };

  const activityColor: Record<string, string> = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-emerald-100 text-emerald-600",
    amber: "bg-amber-100 text-amber-600",
    red: "bg-red-100 text-red-600",
  };

  const upcomingStatusColor: Record<string, string> = {
    in_progress: "bg-blue-100 text-blue-700",
    scheduled: "bg-emerald-100 text-emerald-700",
    overdue: "bg-red-100 text-red-700",
  };

  const upcomingStatusLabel: Record<string, string> = {
    in_progress: "En Curso",
    scheduled: "Programado",
    overdue: "Vencido",
  };

  const fadeUp: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.07, duration: 0.45, ease: [0.4, 0, 0.2, 1] as const },
    }),
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Panel Ejecutivo</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Resumen ejecutivo · Año 2024 · Actualizado: {new Date().toLocaleString("es-CO")}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          En Vivo
        </span>
      </div>

      {/* ── Row 1: KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          {
            title: "Ingresos Totales",
            value: "$1.234.567.890",
            change: 15.3,
            changeType: "up" as const,
            icon: DollarSign,
            variant: "default" as const,
            description: "+15.3% vs año anterior",
          },
          {
            title: "Equipos en Mantenimiento",
            value: "23",
            change: undefined,
            changeType: "neutral" as const,
            icon: Wrench,
            variant: "warning" as const,
            description: "+2 desde ayer",
          },
          {
            title: "Mantenimientos Completados",
            value: "156",
            change: 18,
            changeType: "up" as const,
            icon: CheckCircle2,
            variant: "success" as const,
            description: "+18% este mes",
          },
          {
            title: "Repuestos Vendidos",
            value: "847",
            change: 32,
            changeType: "up" as const,
            icon: Package,
            variant: "default" as const,
            description: "+32% vs mes anterior",
          },
          {
            title: "Satisfacción del Cliente",
            value: "94.5%",
            change: 1.2,
            changeType: "up" as const,
            icon: Star,
            variant: "success" as const,
            description: "+1.2 pts vs trimestre",
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
              change={kpi.change}
              changeType={kpi.changeType}
              icon={kpi.icon}
              variant={kpi.variant}
              description={kpi.description}
            />
          </motion.div>
        ))}
      </div>

      {/* ── Row 2: Revenue Chart + Maintenance Status ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Revenue line chart — 60% */}
        <motion.div
          variants={fadeUp}
          custom={5}
          initial="hidden"
          animate="visible"
          className="lg:col-span-3 bg-white rounded-xl border border-border shadow-sm p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Ingresos Mensuales 2024</h2>
              <p className="text-xs text-muted-foreground">Presupuesto vs Real (millones COP)</p>
            </div>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={monthlyRevenue} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}M`} />
              <Tooltip content={<RevenueTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="budget"
                name="Presupuesto"
                stroke="#94a3b8"
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={false}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="actual"
                name="Real"
                stroke="#cf1b22"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#cf1b22" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Maintenance bar chart — 40% */}
        <motion.div
          variants={fadeUp}
          custom={6}
          initial="hidden"
          animate="visible"
          className="lg:col-span-2 bg-white rounded-xl border border-border shadow-sm p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Mantenimientos por Estado</h2>
              <p className="text-xs text-muted-foreground">Total: {maintenanceByStatus.reduce((s, r) => s + r.count, 0)} registros</p>
            </div>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={maintenanceByStatus} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="status" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v) => [v, "Cantidad"]}
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="count" name="Mantenimientos" radius={[4, 4, 0, 0]}>
                {maintenanceByStatus.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* ── Row 3: Top Rankings ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Top Customers */}
        <motion.div variants={fadeUp} custom={7} initial="hidden" animate="visible"
          className="bg-white rounded-xl border border-border shadow-sm p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#cf1b22]" />
            Top 5 Clientes
          </h2>
          <div className="space-y-2">
            {topCustomers.map((c) => (
              <div key={c.rank} className="flex items-center gap-2 py-1 border-b border-border/50 last:border-0">
                <span className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0",
                  c.rank === 1 && "bg-amber-100 text-amber-700",
                  c.rank === 2 && "bg-slate-100 text-slate-600",
                  c.rank === 3 && "bg-orange-100 text-orange-700",
                  c.rank > 3 && "bg-muted text-muted-foreground"
                )}>
                  {c.rank}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{c.name}</p>
                  <p className="text-[10px] text-muted-foreground">{c.equipment} equipos</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-semibold">{formatCOP(c.revenue)}</p>
                  <p className={cn("text-[10px] font-medium", c.growth >= 0 ? "text-emerald-600" : "text-red-500")}>
                    {c.growth >= 0 ? "+" : ""}{c.growth}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Top Brands */}
        <motion.div variants={fadeUp} custom={8} initial="hidden" animate="visible"
          className="bg-white rounded-xl border border-border shadow-sm p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            Top 5 Marcas
          </h2>
          <div className="space-y-2">
            {topBrands.map((b, i) => (
              <div key={b.brand} className="flex items-center gap-2 py-1 border-b border-border/50 last:border-0">
                <span className="w-5 h-5 rounded bg-blue-50 flex items-center justify-center text-[10px] font-bold text-blue-700 flex-shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">{b.brand}</p>
                  <p className="text-[10px] text-muted-foreground">{b.equipment} equipos</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-semibold">{formatCOP(b.revenue)}</p>
                  <p className="text-[10px] text-muted-foreground">{b.share}% mercado</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Top Advisors */}
        <motion.div variants={fadeUp} custom={9} initial="hidden" animate="visible"
          className="bg-white rounded-xl border border-border shadow-sm p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
            Top 5 Asesores
          </h2>
          <div className="space-y-2">
            {topAdvisors.map((a, i) => (
              <div key={a.name} className="flex items-center gap-2 py-1 border-b border-border/50 last:border-0">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#cf1b22] to-[#ff4d4d] flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                  {a.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{a.name}</p>
                  <RatingStars rating={a.rating} />
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-semibold">{formatCOP(a.revenue)}</p>
                  <p className="text-[10px] text-muted-foreground">{a.maintenances} mant.</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Top Parts */}
        <motion.div variants={fadeUp} custom={10} initial="hidden" animate="visible"
          className="bg-white rounded-xl border border-border shadow-sm p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Top 5 Repuestos
          </h2>
          <div className="space-y-2">
            {topParts.map((p, i) => (
              <div key={p.sap} className="py-1 border-b border-border/50 last:border-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-mono text-muted-foreground">{p.sap}</p>
                    <p className="text-xs font-medium text-foreground leading-tight truncate">{p.name}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-semibold">{formatCOP(p.revenue)}</p>
                    <p className="text-[10px] text-muted-foreground">{p.units.toLocaleString()} uds</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Row 4: Calendar + Map + Activity Feed ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Calendar + Map */}
        <div className="space-y-4">
          {/* Calendar */}
          <motion.div variants={fadeUp} custom={11} initial="hidden" animate="visible"
            className="bg-white rounded-xl border border-border shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">Calendario de Mantenimientos</h2>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" />Activo</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />Prog.</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />Vencido</span>
              </div>
            </div>
            <MiniCalendar />
            <div className="mt-4 space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Próximos 7 días</p>
              {upcomingMaintenances.map((m, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="text-[10px] font-medium text-muted-foreground w-14 flex-shrink-0">{m.date}</span>
                  <span className="flex-1 truncate text-foreground">{m.equipment}</span>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0 mr-1">{m.type}</span>
                  <span className={cn(
                    "text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0",
                    upcomingStatusColor[m.status]
                  )}>
                    {upcomingStatusLabel[m.status]}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Colombia Map */}
          <motion.div variants={fadeUp} custom={12} initial="hidden" animate="visible"
            className="bg-white rounded-xl border border-border shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">Ingresos por Región</h2>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <ColombiaMap />
              <div className="flex flex-col justify-center gap-1.5">
                {colombiaRegions.map((r) => (
                  <div key={r.city} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: r.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">{r.city}</p>
                      <p className="text-[10px] text-muted-foreground">{formatCOP(r.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right: Activity Feed */}
        <motion.div variants={fadeUp} custom={13} initial="hidden" animate="visible"
          className="bg-white rounded-xl border border-border shadow-sm p-5 h-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Actividad Reciente</h2>
            <button className="text-xs text-[#cf1b22] hover:underline flex items-center gap-1">
              Ver todo <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-3">
            {activityFeed.map((item) => {
              const IconComp = item.icon;
              return (
                <div key={item.id} className="flex items-start gap-3">
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                    activityColor[item.color]
                  )}>
                    <IconComp className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-foreground leading-tight">{item.title}</p>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0 whitespace-nowrap">{item.time}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* ── Row 5: Equipment Performance Table ── */}
      <motion.div variants={fadeUp} custom={14} initial="hidden" animate="visible"
        className="bg-white rounded-xl border border-border shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Rendimiento de Equipos</h2>
            <p className="text-xs text-muted-foreground">Top 10 equipos · Haz clic en columnas para ordenar</p>
          </div>
          <span className="text-xs text-muted-foreground">{equipmentTable.length} equipos</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {[
                  { key: "name", label: "Equipo" },
                  { key: "brand", label: "Marca" },
                  { key: "model", label: "Modelo" },
                  { key: "customer", label: "Cliente" },
                  { key: "hours", label: "Horas" },
                  { key: "status", label: "Estado" },
                  { key: "lastMaint", label: "Último Mantenimiento" },
                  { key: "nextDue", label: "Próximo Vencimiento" },
                  { key: "revenue", label: "Ingresos" },
                ].map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-left font-semibold text-muted-foreground cursor-pointer hover:text-foreground select-none"
                    onClick={() => handleSort(col.key as SortKey)}
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      <SortIcon col={col.key as SortKey} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedEquipment.map((eq, i) => (
                <motion.tr
                  key={eq.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-foreground">{eq.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{eq.brand}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{eq.model}</td>
                  <td className="px-4 py-3 text-muted-foreground truncate max-w-32">{eq.customer}</td>
                  <td className="px-4 py-3 text-right font-medium">{eq.hours.toLocaleString()} h</td>
                  <td className="px-4 py-3"><StatusBadge status={eq.status} /></td>
                  <td className="px-4 py-3 text-muted-foreground">{eq.lastMaint}</td>
                  <td className="px-4 py-3 text-muted-foreground">{eq.nextDue}</td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground">{formatCOP(eq.revenue)}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
