"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Calculator,
  Calendar,
  Package,
  BarChart3,
  Settings,
  ArrowRight,
  Activity,
  Cpu,
  Wrench,
  LogIn,
  FileText,
  Eye,
  Truck,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { useUserStore } from "@/store";
import { DASHBOARD_KPIS } from "@/lib/mock-data";
import type { UserRole } from "@/lib/mock-data";
import { formatCOP } from "@/lib/mock-data";
import { isFeatureEnabled } from "@/lib/feature-flags";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ModuleCard {
  id: string;
  icon: React.ReactNode;
  iconColor: string;
  accentColor: string;
  title: string;
  description: string;
  badge: string;
  badgeBg: string;
  badgeText: string;
  href: string;
  allowedRoles?: UserRole[];
}

interface QuickStat {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
}

interface ActivityItem {
  id: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  description: string;
  timestamp: string;
  relativeTime: string;
}

// ── Module cards definition ────────────────────────────────────────────────────

const MODULE_CARDS: ModuleCard[] = [
  {
    id: "calculator",
    icon: <Calculator size={26} />,
    iconColor: "#cf1b22",
    accentColor: "#cf1b22",
    title: "Calculadora de Mantenimiento Preventivo",
    description:
      "Calcula los costos de mantenimiento de equipos por horómetro y kilómetros",
    badge: "12 Pendientes",
    badgeBg: "#fef2f2",
    badgeText: "#b91c1c",
    href: "/calculator",
  },
  {
    id: "projected",
    icon: <Calendar size={26} />,
    iconColor: "#2563eb",
    accentColor: "#2563eb",
    title: "Mantenimiento Proyectado",
    description:
      "Planifica y programa el mantenimiento preventivo con mapas interactivos y calendarios",
    badge: "8 Programados",
    badgeBg: "#eff6ff",
    badgeText: "#1d4ed8",
    href: "/projected-maintenance",
  },
  {
    id: "cpp",
    icon: <Package size={26} />,
    iconColor: "#16a34a",
    accentColor: "#16a34a",
    title: "Repuestos Inteligentes CPP",
    description:
      "Consulta el catálogo de repuestos integrado con SAP con precios, stock y recomendaciones",
    badge: "247 Repuestos",
    badgeBg: "#f0fdf4",
    badgeText: "#15803d",
    href: "/cpp",
  },
  {
    id: "executive",
    icon: <BarChart3 size={26} />,
    iconColor: "#d97706",
    accentColor: "#d97706",
    title: "Panel Ejecutivo",
    description:
      "KPIs en tiempo real, analítica, principales clientes y métricas de rendimiento",
    badge: "En vivo",
    badgeBg: "#fffbeb",
    badgeText: "#b45309",
    href: "/executive-dashboard",
    allowedRoles: ["Administrator", "Coordinator"],
  },
  {
    id: "administration",
    icon: <Settings size={26} />,
    iconColor: "#475569",
    accentColor: "#475569",
    title: "Administración",
    description:
      "Gestión de usuarios, roles, permisos, importación/exportación y configuración del sistema",
    badge: "Admin",
    badgeBg: "#f8fafc",
    badgeText: "#334155",
    href: "/administration",
    allowedRoles: ["Administrator"],
  },
];

// ── Quick stats data ────────────────────────────────────────────────────────────

function buildQuickStats(kpis: typeof DASHBOARD_KPIS): QuickStat[] {
  return [
    {
      label: "Equipos Totales",
      value: String(kpis.totalMachines),
      icon: <Truck size={18} />,
      color: "#cf1b22",
      bg: "#fef2f2",
    },
    {
      label: "Mantenimientos Activos",
      value: String(kpis.machinesInMaintenance + kpis.scheduledMaintenances),
      icon: <Wrench size={18} />,
      color: "#2563eb",
      bg: "#eff6ff",
    },
    {
      label: "Repuestos en Stock",
      value: kpis.totalPartsInStock.toLocaleString("es-CO"),
      icon: <Package size={18} />,
      color: "#16a34a",
      bg: "#f0fdf4",
    },
    {
      label: "Ingresos del Mes",
      value: formatCOP(kpis.monthlyRevenue),
      icon: <BarChart3 size={18} />,
      color: "#d97706",
      bg: "#fffbeb",
    },
  ];
}

// ── Mock activity log ──────────────────────────────────────────────────────────

const MOCK_ACTIVITY: ActivityItem[] = [
  {
    id: "a1",
    icon: <CheckCircle2 size={15} />,
    iconBg: "#f0fdf4",
    iconColor: "#16a34a",
    description: "OT-2024-00821 completada — PM 250H Volvo EC480E (3.5 h)",
    timestamp: "2024-12-05T10:00:00Z",
    relativeTime: "hace 2 horas",
  },
  {
    id: "a2",
    icon: <AlertTriangle size={15} />,
    iconBg: "#fef2f2",
    iconColor: "#dc2626",
    description: "Alerta crítica: Hitachi ZX350LC-6 — fuga hidráulica detectada",
    timestamp: "2024-12-05T09:00:00Z",
    relativeTime: "hace 3 horas",
  },
  {
    id: "a3",
    icon: <FileText size={15} />,
    iconBg: "#fffbeb",
    iconColor: "#d97706",
    description: "Cotización CPP-Q-2024-0892 enviada a Mineros S.A. — $18,640,000 COP",
    timestamp: "2024-12-04T16:00:00Z",
    relativeTime: "hace 18 horas",
  },
  {
    id: "a4",
    icon: <Package size={15} />,
    iconBg: "#eff6ff",
    iconColor: "#2563eb",
    description: "Alerta de stock bajo: Sello Hidráulico Hitachi (CPP-1006-SA) — 3 unidades restantes",
    timestamp: "2024-12-04T14:00:00Z",
    relativeTime: "hace 20 horas",
  },
  {
    id: "a5",
    icon: <LogIn size={15} />,
    iconBg: "#f8fafc",
    iconColor: "#475569",
    description: "Inicio de sesión registrado en la plataforma",
    timestamp: "2024-12-05T08:32:00Z",
    relativeTime: "hace 4 horas",
  },
];

// ── Role-based card filter ─────────────────────────────────────────────────────

function filterCardsForRole(cards: ModuleCard[], role: UserRole): ModuleCard[] {
  const withFeatures = isFeatureEnabled('cppModule')
    ? cards
    : cards.filter((c) => c.id !== 'cpp');

  // Technician and Viewer: Calculator (y CPP solo si el módulo está activo)
  if (role === 'Technician' || role === 'Viewer') {
    return withFeatures.filter((c) => c.id === 'calculator' || c.id === 'cpp');
  }
  // Coordinator and Sales Advisor: no Administration
  if (role === 'Coordinator' || role === 'Sales Advisor') {
    return withFeatures.filter((c) => !c.allowedRoles || c.allowedRoles.includes(role));
  }
  // Administrator: all enabled cards
  return withFeatures;
}

// ── Framer Motion variants ─────────────────────────────────────────────────────

const pageVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const EASE_OUT = "easeOut" as const;

const sectionVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.1, duration: 0.45, ease: EASE_OUT },
  }),
};

// ── Module Card Component ──────────────────────────────────────────────────────

function ModuleCardItem({ card, index }: { card: ModuleCard; index: number }) {
  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -6, scale: 1.025 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <Link href={card.href} className="group block h-full">
        <div
          className="relative h-full bg-white rounded-2xl border border-gray-100 p-6
            shadow-sm hover:shadow-xl transition-shadow duration-300 overflow-hidden"
        >
          {/* Colored top-left accent bar */}
          <div
            className="absolute top-0 left-0 w-1 h-full rounded-l-2xl"
            style={{ background: card.accentColor }}
          />

          {/* Subtle background blob on hover */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-[0.04] transition-opacity duration-300 rounded-2xl"
            style={{ background: card.accentColor }}
          />

          <div className="relative">
            {/* Header row: icon + badge */}
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0"
                style={{
                  background: `${card.iconColor}18`,
                  color: card.iconColor,
                }}
              >
                {card.icon}
              </div>

              <span
                className="px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{
                  background: card.badgeBg,
                  color: card.badgeText,
                }}
              >
                {card.badge}
              </span>
            </div>

            {/* Title */}
            <h3 className="font-bold text-gray-900 text-base leading-snug mb-2">
              {card.title}
            </h3>

            {/* Description */}
            <p className="text-sm text-gray-500 leading-relaxed mb-5">
              {card.description}
            </p>

            {/* Footer arrow */}
            <div className="flex items-center justify-between">
              <span
                className="text-xs font-semibold tracking-wide uppercase"
                style={{ color: card.accentColor }}
              >
                Abrir Módulo
              </span>
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center
                  opacity-0 group-hover:opacity-100 translate-x-0 group-hover:translate-x-1
                  transition-all duration-300"
                style={{ background: `${card.accentColor}15`, color: card.accentColor }}
              >
                <ArrowRight size={14} />
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ── Quick Stat Chip ────────────────────────────────────────────────────────────

function QuickStatChip({ stat }: { stat: QuickStat }) {
  return (
    <motion.div
      variants={sectionVariants}
      className="flex items-center gap-3 bg-white rounded-xl border border-gray-100
        px-4 py-3 shadow-sm flex-1 min-w-[140px]"
    >
      <span
        className="w-9 h-9 flex-shrink-0 rounded-lg flex items-center justify-center"
        style={{ background: stat.bg, color: stat.color }}
      >
        {stat.icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 truncate">{stat.label}</p>
        <p className="font-bold text-gray-900 text-sm truncate">{stat.value}</p>
      </div>
    </motion.div>
  );
}

// ── Activity Row ───────────────────────────────────────────────────────────────

function ActivityRow({ item, index }: { item: ActivityItem; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.4 + index * 0.07, duration: 0.35 }}
      className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0"
    >
      <span
        className="w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center mt-0.5"
        style={{ background: item.iconBg, color: item.iconColor }}
      >
        {item.icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700 leading-snug">{item.description}</p>
      </div>
      <span className="flex-shrink-0 text-xs text-gray-400 mt-0.5 whitespace-nowrap">
        {item.relativeTime}
      </span>
    </motion.div>
  );
}

// ── Dashboard Page ─────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { currentUser, role } = useUserStore();

  const today = `Hoy es ${new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })}`;

  const visibleCards = filterCardsForRole(MODULE_CARDS, role);
  const quickStats = buildQuickStats(DASHBOARD_KPIS);

  return (
    <AppShell breadcrumbs={[{ label: "Panel Principal" }]}>
      <motion.div
        variants={pageVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8 max-w-7xl mx-auto"
      >
        {/* ── Page header ─────────────────────────────────────────────────── */}
        <motion.div variants={sectionVariants}>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight">
            Bienvenido de nuevo,{" "}
            <span className="text-[#cf1b22]">
              {(currentUser?.name?.trim().split(/\s+/)[0] || "Usuario")}!
            </span>
          </h1>
          <p className="mt-1 text-sm text-gray-500 flex items-center gap-2">
            <Activity size={14} className="text-[#cf1b22]" />
            {today}
            <span className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-medium border border-green-100">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Todos los sistemas operativos
            </span>
          </p>
        </motion.div>

        {/* ── Quick stats row ──────────────────────────────────────────────── */}
        <motion.div variants={sectionVariants}>
          <div className="flex flex-wrap gap-3">
            {quickStats.map((stat) => (
              <QuickStatChip key={stat.label} stat={stat} />
            ))}
          </div>
        </motion.div>

        {/* ── Module cards grid ────────────────────────────────────────────── */}
        <div>
          <motion.h2
            variants={sectionVariants}
            className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2"
          >
            <Cpu size={14} />
            Módulos de la Plataforma
          </motion.h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {visibleCards.map((card, i) => (
              <ModuleCardItem key={card.id} card={card} index={i} />
            ))}
          </div>
        </div>

        {/* ── Recent activity ──────────────────────────────────────────────── */}
        <motion.div variants={sectionVariants}>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Activity size={14} />
            Actividad Reciente
          </h2>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            {MOCK_ACTIVITY.map((item, i) => (
              <ActivityRow key={item.id} item={item} index={i} />
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AppShell>
  );
}
