"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  ShieldCheck,
  Lock,
  Upload,
  Settings,
  FileText,
  ClipboardList,
  Plus,
  Pencil,
  UserX,
  KeyRound,
  Check,
  X,
  Search,
  Download,
  Filter,
  ChevronDown,
  AlertTriangle,
  Info,
  AlertCircle,
  LogIn,
  LogOut,
  Eye,
  Trash2,
  RefreshCw,
  Calendar,
  Clock,
  Globe,
  Building2,
  Phone,
  Mail,
  Percent,
  DollarSign,
  Save,
  UserPlus,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

type UserStatus = "active" | "inactive";
type UserRole = "Administrator" | "Coordinator" | "Sales Advisor" | "Technician" | "Viewer";
type LogLevel = "INFO" | "WARN" | "ERROR";
type AuditAction = "Created" | "Updated" | "Deleted";

// ── Mock data ──────────────────────────────────────────────────────────────────

const MOCK_USERS = [
  { id: "U1", name: "Carlos Mejía Rodríguez", email: "carlos.mejia@partequipos.com", role: "Administrator" as UserRole, status: "active" as UserStatus, lastLogin: "2024-03-24 09:14", avatar: "CM" },
  { id: "U2", name: "Ana Torres Vargas", email: "ana.torres@partequipos.com", role: "Coordinator" as UserRole, status: "active" as UserStatus, lastLogin: "2024-03-24 08:32", avatar: "AT" },
  { id: "U3", name: "Javier Ríos Castillo", email: "javier.rios@partequipos.com", role: "Sales Advisor" as UserRole, status: "active" as UserStatus, lastLogin: "2024-03-23 17:45", avatar: "JR" },
  { id: "U4", name: "María López Herrera", email: "maria.lopez@partequipos.com", role: "Technician" as UserRole, status: "inactive" as UserStatus, lastLogin: "2024-03-20 14:10", avatar: "ML" },
  { id: "U5", name: "Diego Sánchez Pérez", email: "diego.sanchez@partequipos.com", role: "Viewer" as UserRole, status: "active" as UserStatus, lastLogin: "2024-03-24 07:55", avatar: "DS" },
];

const ROLES = [
  {
    id: "administrator",
    name: "Administrador",
    description: "Acceso completo a todos los módulos y configuraciones del sistema.",
    userCount: 2,
    permissions: {
      "Ver Dashboard": true, "Editar Datos": true, "Gestionar Usuarios": true,
      "Importar/Exportar": true, "Ver Reportes": true, "Configurar Sistema": true,
      "Aprobar Cotizaciones": true, "Gestionar Roles": true,
    },
  },
  {
    id: "coordinator",
    name: "Coordinador",
    description: "Gestiona cronogramas de mantenimiento y coordina técnicos.",
    userCount: 3,
    permissions: {
      "Ver Dashboard": true, "Editar Datos": true, "Gestionar Usuarios": false,
      "Importar/Exportar": true, "Ver Reportes": true, "Configurar Sistema": false,
      "Aprobar Cotizaciones": true, "Gestionar Roles": false,
    },
  },
  {
    id: "sales_advisor",
    name: "Asesor Comercial",
    description: "Crea cotizaciones y gestiona relaciones con clientes.",
    userCount: 5,
    permissions: {
      "Ver Dashboard": true, "Editar Datos": true, "Gestionar Usuarios": false,
      "Importar/Exportar": false, "Ver Reportes": true, "Configurar Sistema": false,
      "Aprobar Cotizaciones": false, "Gestionar Roles": false,
    },
  },
  {
    id: "technician",
    name: "Técnico",
    description: "Ejecuta órdenes de trabajo y registra diagnósticos de campo.",
    userCount: 8,
    permissions: {
      "Ver Dashboard": true, "Editar Datos": true, "Gestionar Usuarios": false,
      "Importar/Exportar": false, "Ver Reportes": false, "Configurar Sistema": false,
      "Aprobar Cotizaciones": false, "Gestionar Roles": false,
    },
  },
  {
    id: "viewer",
    name: "Visualizador",
    description: "Solo lectura de reportes y dashboards.",
    userCount: 4,
    permissions: {
      "Ver Dashboard": true, "Editar Datos": false, "Gestionar Usuarios": false,
      "Importar/Exportar": false, "Ver Reportes": true, "Configurar Sistema": false,
      "Aprobar Cotizaciones": false, "Gestionar Roles": false,
    },
  },
];

const MODULES = ["Panel Principal", "Calculadora", "Mantenimiento Proyectado", "Repuestos CPP", "Panel Ejecutivo", "Administración"];
const PERM_ROLES: UserRole[] = ["Administrator", "Coordinator", "Sales Advisor", "Technician", "Viewer"];

const PERM_MATRIX: Record<string, Record<string, boolean>> = {
  "Panel Principal":           { Administrator: true,  Coordinator: true,  "Sales Advisor": true,  Technician: true,  Viewer: true  },
  "Calculadora":                { Administrator: true,  Coordinator: true,  "Sales Advisor": true,  Technician: false, Viewer: false },
  "Mantenimiento Proyectado":   { Administrator: true,  Coordinator: true,  "Sales Advisor": true,  Technician: true,  Viewer: false },
  "Repuestos CPP":               { Administrator: true,  Coordinator: true,  "Sales Advisor": true,  Technician: false, Viewer: false },
  "Panel Ejecutivo":            { Administrator: true,  Coordinator: true,  "Sales Advisor": false, Technician: false, Viewer: true  },
  "Administración":              { Administrator: true,  Coordinator: false, "Sales Advisor": false, Technician: false, Viewer: false },
};

const IMPORT_TYPES = ["Equipos", "Repuestos", "Cronograma de Mantenimiento", "Clientes"];

const IMPORT_HISTORY = [
  { id: "IMP-001", type: "Equipos", file: "equipos_mar2024.xlsx", rows: 45, status: "success", date: "2024-03-20 14:32", user: "Carlos Mejía" },
  { id: "IMP-002", type: "Repuestos", file: "repuestos_q1.csv", rows: 312, status: "success", date: "2024-03-18 10:15", user: "Ana Torres" },
  { id: "IMP-003", type: "Clientes", file: "clientes_v2.xlsx", rows: 28, status: "error", date: "2024-03-15 16:45", user: "Javier Ríos" },
  { id: "IMP-004", type: "Cronograma de Mantenimiento", file: "maint_q2.csv", rows: 156, status: "success", date: "2024-03-12 09:00", user: "Carlos Mejía" },
  { id: "IMP-005", type: "Repuestos", file: "repuestos_update.xlsx", rows: 89, status: "warning", date: "2024-03-10 11:30", user: "Ana Torres" },
  { id: "IMP-006", type: "Equipos", file: "equipos_feb2024.xlsx", rows: 38, status: "success", date: "2024-02-28 15:20", user: "Carlos Mejía" },
  { id: "IMP-007", type: "Clientes", file: "clientes_feb.csv", rows: 22, status: "success", date: "2024-02-20 08:45", user: "Javier Ríos" },
  { id: "IMP-008", type: "Repuestos", file: "stock_enero.xlsx", rows: 204, status: "success", date: "2024-01-31 17:00", user: "Ana Torres" },
];

const SYSTEM_LOGS: {
  id: string; level: LogLevel; timestamp: string; module: string; action: string; user: string; ip: string;
}[] = [
  { id: "LOG-001", level: "INFO",  timestamp: "2024-03-24 09:14:32", module: "Autenticación",   action: "Usuario autenticado exitosamente",       user: "carlos.mejia",  ip: "192.168.1.10" },
  { id: "LOG-002", level: "INFO",  timestamp: "2024-03-24 09:12:11", module: "Panel Ejecutivo", action: "Dashboard ejecutivo cargado",            user: "carlos.mejia",  ip: "192.168.1.10" },
  { id: "LOG-003", level: "WARN",  timestamp: "2024-03-24 08:55:47", module: "Importaciones",  action: "Archivo con filas duplicadas detectadas", user: "ana.torres",    ip: "192.168.1.15" },
  { id: "LOG-004", level: "ERROR", timestamp: "2024-03-24 08:32:18", module: "Autenticación",   action: "Intento de login fallido (3/5)",         user: "unknown",       ip: "201.234.56.78" },
  { id: "LOG-005", level: "INFO",  timestamp: "2024-03-24 08:30:05", module: "Repuestos CPP",   action: "Cotización CPP-2024-0891 generada",      user: "javier.rios",   ip: "192.168.1.22" },
  { id: "LOG-006", level: "INFO",  timestamp: "2024-03-23 17:45:30", module: "Mantenimiento",  action: "Mantenimiento 500h completado registrado", user: "maria.lopez",  ip: "192.168.1.31" },
  { id: "LOG-007", level: "WARN",  timestamp: "2024-03-23 16:20:14", module: "Sistema",        action: "Memoria RAM al 85% de capacidad",        user: "system",        ip: "127.0.0.1" },
  { id: "LOG-008", level: "INFO",  timestamp: "2024-03-23 15:10:55", module: "Repuestos",      action: "Inventario actualizado: +120 unidades",  user: "ana.torres",    ip: "192.168.1.15" },
  { id: "LOG-009", level: "ERROR", timestamp: "2024-03-23 14:02:33", module: "Importaciones",        action: "Importación fallida: formato inválido",  user: "diego.sanchez", ip: "192.168.1.44" },
  { id: "LOG-010", level: "INFO",  timestamp: "2024-03-23 13:45:20", module: "Panel Principal", action: "Reporte mensual exportado (PDF)",        user: "carlos.mejia",  ip: "192.168.1.10" },
  { id: "LOG-011", level: "INFO",  timestamp: "2024-03-23 12:30:10", module: "Roles",          action: "Permisos de 'Técnico' actualizados",  user: "carlos.mejia",  ip: "192.168.1.10" },
  { id: "LOG-012", level: "WARN",  timestamp: "2024-03-23 11:15:00", module: "Autenticación",   action: "Sesión expirada por inactividad",        user: "diego.sanchez", ip: "192.168.1.44" },
  { id: "LOG-013", level: "INFO",  timestamp: "2024-03-22 18:00:00", module: "Sistema",         action: "Respaldo automático diario completado",  user: "system",        ip: "127.0.0.1" },
  { id: "LOG-014", level: "INFO",  timestamp: "2024-03-22 16:45:30", module: "Calculadora",     action: "Presupuesto de mantenimiento calculado", user: "javier.rios",   ip: "192.168.1.22" },
  { id: "LOG-015", level: "ERROR", timestamp: "2024-03-22 14:20:15", module: "Base de Datos",   action: "Timeout en consulta de reportes",        user: "system",        ip: "127.0.0.1" },
];

const AUDIT_TRAIL = [
  { id: "AUD-001", timestamp: "2024-03-24 09:15:00", user: "Carlos Mejía",   action: "Updated" as AuditAction, module: "Usuarios",       record: "U4",       fields: "status: active→inactive",          ip: "192.168.1.10" },
  { id: "AUD-002", timestamp: "2024-03-24 08:50:10", user: "Ana Torres",     action: "Created" as AuditAction, module: "Repuestos",       record: "P-10-9891", fields: "stock: +120",                       ip: "192.168.1.15" },
  { id: "AUD-003", timestamp: "2024-03-24 08:30:05", user: "Javier Ríos",   action: "Created" as AuditAction, module: "Repuestos CPP",   record: "CPP-0891",  fields: "quote: $45.600.000",                ip: "192.168.1.22" },
  { id: "AUD-004", timestamp: "2024-03-23 17:45:00", user: "María López",   action: "Updated" as AuditAction, module: "Mantenimiento", record: "MNT-0234",  fields: "status: in_progress→completed",     ip: "192.168.1.31" },
  { id: "AUD-005", timestamp: "2024-03-23 15:00:00", user: "Carlos Mejía",  action: "Updated" as AuditAction, module: "Roles",       record: "Technician",fields: "permissions: Parts.edit: false→true",ip: "192.168.1.10" },
  { id: "AUD-006", timestamp: "2024-03-23 14:30:00", user: "Carlos Mejía",  action: "Deleted" as AuditAction, module: "Usuarios",       record: "U9",        fields: "user: temp.user@partequipos.com",   ip: "192.168.1.10" },
  { id: "AUD-007", timestamp: "2024-03-23 13:20:00", user: "Ana Torres",    action: "Updated" as AuditAction, module: "Configuración",    record: "CONFIG",    fields: "vatRate: 18%→19%",                  ip: "192.168.1.15" },
  { id: "AUD-008", timestamp: "2024-03-22 11:00:00", user: "Javier Ríos",  action: "Created" as AuditAction, module: "Equipos",   record: "EQ-023",    fields: "serial: CAT-320-2024-023",          ip: "192.168.1.22" },
  { id: "AUD-009", timestamp: "2024-03-21 16:10:00", user: "Diego Sánchez", action: "Updated" as AuditAction, module: "Clientes",    record: "CLI-045",   fields: "contact: +57 300 123 4567",         ip: "192.168.1.44" },
  { id: "AUD-010", timestamp: "2024-03-20 14:32:00", user: "Carlos Mejía",  action: "Created" as AuditAction, module: "Importaciones",     record: "IMP-001",   fields: "file: equipos_mar2024.xlsx, rows:45",ip: "192.168.1.10" },
];

// ── Small helpers ──────────────────────────────────────────────────────────────

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="fixed bottom-6 right-6 z-50 bg-foreground text-background text-sm font-medium rounded-xl px-5 py-3 shadow-xl flex items-center gap-3"
      >
        <Info className="h-4 w-4 text-amber-400 flex-shrink-0" />
        {msg}
        <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100">
          <X className="h-3.5 w-3.5" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  const map: Record<UserRole, string> = {
    Administrator: "bg-[#cf1b22]/10 text-[#cf1b22] border-[#cf1b22]/30",
    Coordinator:   "bg-blue-50 text-blue-700 border-blue-200",
    "Sales Advisor": "bg-emerald-50 text-emerald-700 border-emerald-200",
    Technician:    "bg-amber-50 text-amber-700 border-amber-200",
    Viewer:        "bg-slate-50 text-slate-600 border-slate-200",
  };
  const labels: Record<UserRole, string> = {
    Administrator: "Administrador",
    Coordinator: "Coordinador",
    "Sales Advisor": "Asesor Comercial",
    Technician: "Técnico",
    Viewer: "Visualizador",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", map[role])}>
      {labels[role]}
    </span>
  );
}

function StatusDot({ status }: { status: UserStatus }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 text-xs font-medium",
      status === "active" ? "text-emerald-600" : "text-slate-400"
    )}>
      <span className={cn(
        "w-1.5 h-1.5 rounded-full",
        status === "active" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
      )} />
      {status === "active" ? "Activo" : "Inactivo"}
    </span>
  );
}

function LogLevelBadge({ level }: { level: LogLevel }) {
  const map: Record<LogLevel, { cls: string; Icon: any }> = {
    INFO:  { cls: "bg-blue-50 text-blue-700 border-blue-200",   Icon: Info },
    WARN:  { cls: "bg-amber-50 text-amber-700 border-amber-200", Icon: AlertTriangle },
    ERROR: { cls: "bg-red-50 text-red-700 border-red-200",      Icon: AlertCircle },
  };
  const labels: Record<LogLevel, string> = { INFO: "INFO", WARN: "ADVERTENCIA", ERROR: "ERROR" };
  const { cls, Icon } = map[level];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", cls)}>
      <Icon className="h-2.5 w-2.5" />
      {labels[level]}
    </span>
  );
}

function AuditActionBadge({ action }: { action: AuditAction }) {
  const map: Record<AuditAction, string> = {
    Created: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Updated: "bg-blue-50 text-blue-700 border-blue-200",
    Deleted: "bg-red-50 text-red-700 border-red-200",
  };
  const labels: Record<AuditAction, string> = { Created: "Creado", Updated: "Actualizado", Deleted: "Eliminado" };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold", map[action])}>
      {labels[action]}
    </span>
  );
}

function ImportStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    error:   "bg-red-50 text-red-700 border-red-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
  };
  const labels: Record<string, string> = { success: "Exitoso", error: "Error", warning: "Advertencia" };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold", map[status] ?? "bg-gray-100 text-gray-600")}>
      {labels[status] ?? status}
    </span>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function AdministrationPage() {
  const [toast, setToast] = useState("");
  const [showAddUser, setShowAddUser] = useState(false);
  const [logFilter, setLogFilter] = useState<"ALL" | LogLevel>("ALL");
  const [logSearch, setLogSearch] = useState("");
  const [importType, setImportType] = useState(IMPORT_TYPES[0]);
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [auditDateFrom, setAuditDateFrom] = useState("");
  const [auditDateTo, setAuditDateTo] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  }

  const filteredLogs = SYSTEM_LOGS.filter((l) => {
    const matchLevel = logFilter === "ALL" || l.level === logFilter;
    const matchSearch = !logSearch || [l.module, l.action, l.user, l.ip]
      .some((f) => f.toLowerCase().includes(logSearch.toLowerCase()));
    return matchLevel && matchSearch;
  });

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setUploadedFile(file.name);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setUploadedFile(file.name);
  }

  const fadeUp = (i: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: i * 0.05, duration: 0.35 },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Administración</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gestión de usuarios, roles, permisos, importaciones y configuración del sistema.
        </p>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/60 p-1 rounded-xl">
          {[
            { value: "users",       label: "Usuarios",    icon: Users },
            { value: "roles",       label: "Roles",       icon: ShieldCheck },
            { value: "permissions", label: "Permisos",    icon: Lock },
            { value: "imports",     label: "Importaciones", icon: Upload },
            { value: "settings",    label: "Configuración", icon: Settings },
            { value: "logs",        label: "Registros",        icon: FileText },
            { value: "audit",       label: "Auditoría",   icon: ClipboardList },
          ].map((t) => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="flex items-center gap-1.5 text-xs data-[state=active]:bg-white data-[state=active]:text-[#cf1b22] data-[state=active]:font-semibold data-[state=active]:shadow-sm rounded-lg"
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ════════════════════ TAB 1: USERS ════════════════════ */}
        <TabsContent value="users">
          <motion.div {...fadeUp(0)} className="bg-white rounded-xl border border-border shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Gestión de Usuarios</h2>
                <p className="text-xs text-muted-foreground">{MOCK_USERS.length} usuarios registrados</p>
              </div>
              <Button
                size="sm"
                className="bg-[#cf1b22] hover:bg-[#a81419] text-white gap-1.5"
                onClick={() => setShowAddUser(true)}
              >
                <UserPlus className="h-4 w-4" />
                Agregar Usuario
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground font-semibold">
                    <th className="px-5 py-3 text-left">Nombre</th>
                    <th className="px-5 py-3 text-left">Correo electrónico</th>
                    <th className="px-5 py-3 text-left">Rol</th>
                    <th className="px-5 py-3 text-left">Estado</th>
                    <th className="px-5 py-3 text-left">Último Acceso</th>
                    <th className="px-5 py-3 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_USERS.map((u, i) => (
                    <motion.tr
                      key={u.id}
                      {...fadeUp(i + 1)}
                      className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#cf1b22] to-[#ff4d4d] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                            {u.avatar}
                          </div>
                          <span className="font-medium text-foreground">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{u.email}</td>
                      <td className="px-5 py-3"><RoleBadge role={u.role} /></td>
                      <td className="px-5 py-3"><StatusDot status={u.status} /></td>
                      <td className="px-5 py-3 text-muted-foreground text-xs">{u.lastLogin}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 hover:bg-blue-50 hover:text-blue-700">
                            <Pencil className="h-3 w-3" /> Editar
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 hover:bg-amber-50 hover:text-amber-700"
                            onClick={() => showToast(`Usuario ${u.name} ${u.status === "active" ? "desactivado" : "activado"}`)}>
                            <UserX className="h-3 w-3" /> {u.status === "active" ? "Desactivar" : "Activar"}
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 hover:bg-purple-50 hover:text-purple-700"
                            onClick={() => showToast("Correo de restablecimiento enviado a " + u.email)}>
                            <KeyRound className="h-3 w-3" /> Restablecer Contraseña
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Add User Dialog */}
          <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-[#cf1b22]" />
                  Agregar Nuevo Usuario
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="new-name" className="text-sm font-medium">Nombre Completo</Label>
                  <Input id="new-name" placeholder="Ej: Juan Pérez García" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-email" className="text-sm font-medium">Correo Electrónico Corporativo</Label>
                  <Input id="new-email" type="email" placeholder="juan.perez@partequipos.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-role" className="text-sm font-medium">Rol</Label>
                  <Select defaultValue="Viewer">
                    <SelectTrigger id="new-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["Administrator","Coordinator","Sales Advisor","Technician","Viewer"] as UserRole[]).map((r) => {
                        const roleLabels: Record<UserRole, string> = {
                          Administrator: "Administrador",
                          Coordinator: "Coordinador",
                          "Sales Advisor": "Asesor Comercial",
                          Technician: "Técnico",
                          Viewer: "Visualizador",
                        };
                        return <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-pass" className="text-sm font-medium">Contraseña Temporal</Label>
                  <Input id="new-pass" type="password" placeholder="Mínimo 8 caracteres" />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setShowAddUser(false)}>Cancelar</Button>
                <Button className="bg-[#cf1b22] hover:bg-[#a81419] text-white"
                  onClick={() => { setShowAddUser(false); showToast("Usuario creado exitosamente"); }}>
                  Crear Usuario
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ════════════════════ TAB 2: ROLES ════════════════════ */}
        <TabsContent value="roles">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {ROLES.map((role, i) => (
              <motion.div key={role.id} {...fadeUp(i)}
                className="bg-white rounded-xl border border-border shadow-sm p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{role.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{role.description}</p>
                  </div>
                  <span className="text-xs font-medium bg-muted rounded-full px-2 py-1 text-muted-foreground flex-shrink-0 ml-2">
                    {role.userCount} usuarios
                  </span>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Permisos</p>
                  <div className="grid grid-cols-2 gap-1">
                    {Object.entries(role.permissions).map(([perm, allowed]) => (
                      <div key={perm} className="flex items-center gap-2">
                        <Checkbox checked={allowed} disabled className="h-3.5 w-3.5" />
                        <span className={cn("text-[11px]", allowed ? "text-foreground" : "text-muted-foreground/60 line-through")}>
                          {perm}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <Button variant="outline" size="sm" className="self-start text-xs gap-1.5 mt-auto"
                  onClick={() => showToast(`Editando permisos de "${role.name}"`)}>
                  <Pencil className="h-3.5 w-3.5" />
                  Editar Permisos
                </Button>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* ════════════════════ TAB 3: PERMISSIONS MATRIX ════════════════════ */}
        <TabsContent value="permissions">
          <motion.div {...fadeUp(0)} className="bg-white rounded-xl border border-border shadow-sm">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Matriz de Permisos por Módulo</h2>
              <p className="text-xs text-muted-foreground">Haz clic en una celda para gestionar el permiso</p>
            </div>
            <div className="overflow-x-auto p-5">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left text-xs font-semibold text-muted-foreground pb-3 pr-8">Módulo</th>
                    {PERM_ROLES.map((r) => (
                      <th key={r} className="text-center text-xs font-semibold text-muted-foreground pb-3 px-4">
                        <RoleBadge role={r} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MODULES.map((mod, mi) => (
                    <tr key={mod} className={cn("border-b border-border/50", mi % 2 === 0 && "bg-muted/10")}>
                      <td className="py-3 pr-8 font-medium text-foreground">{mod}</td>
                      {PERM_ROLES.map((role) => {
                        const allowed = PERM_MATRIX[mod]?.[role] ?? false;
                        return (
                          <td key={role} className="text-center py-3 px-4">
                            <button
                              className={cn(
                                "w-7 h-7 rounded-full flex items-center justify-center mx-auto transition-all",
                                "hover:scale-110 hover:shadow-sm",
                                allowed
                                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                  : "bg-red-50 text-red-400 hover:bg-red-100"
                              )}
                              onClick={() => showToast("Gestión de permisos — próximamente")}
                            >
                              {allowed
                                ? <Check className="h-4 w-4" />
                                : <X className="h-4 w-4" />
                              }
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </TabsContent>

        {/* ════════════════════ TAB 4: IMPORTS ════════════════════ */}
        <TabsContent value="imports">
          <div className="space-y-4">
            <motion.div {...fadeUp(0)} className="bg-white rounded-xl border border-border shadow-sm p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">Importar Datos</h2>
              {/* Type selector */}
              <div className="mb-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Tipo de importación
                </p>
                <div className="flex flex-wrap gap-2">
                  {IMPORT_TYPES.map((type) => (
                    <button
                      key={type}
                      onClick={() => setImportType(type)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                        importType === type
                          ? "bg-[#cf1b22] text-white border-[#cf1b22] shadow-sm"
                          : "bg-white text-muted-foreground border-border hover:border-[#cf1b22]/50 hover:text-foreground"
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Drop zone */}
              <div
                className={cn(
                  "border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all",
                  dragOver
                    ? "border-[#cf1b22] bg-[#cf1b22]/5"
                    : uploadedFile
                    ? "border-emerald-400 bg-emerald-50"
                    : "border-border hover:border-[#cf1b22]/50 hover:bg-muted/30"
                )}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileRef.current?.click()}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={handleFileInput}
                />
                {uploadedFile ? (
                  <>
                    <CheckCircle className="h-10 w-10 text-emerald-500 mb-2" />
                    <p className="text-sm font-semibold text-foreground">{uploadedFile}</p>
                    <p className="text-xs text-muted-foreground mt-1">Archivo listo para importar</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-10 w-10 text-muted-foreground/40 mb-2" />
                    <p className="text-sm font-semibold text-foreground">
                      Arrastra y suelta tu archivo aquí
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      o haz clic para buscar · Formatos soportados: CSV, Excel (.xlsx, .xls) · Máx 10 MB
                    </p>
                  </>
                )}
              </div>

              <div className="flex gap-2 mt-4">
                <Button
                  className="bg-[#cf1b22] hover:bg-[#a81419] text-white gap-1.5"
                  disabled={!uploadedFile}
                  onClick={() => { showToast(`Importando ${importType}...`); setUploadedFile(null); }}
                >
                  <Upload className="h-4 w-4" /> Importar {importType}
                </Button>
                {uploadedFile && (
                  <Button variant="outline" onClick={() => setUploadedFile(null)}>
                    Cancelar
                  </Button>
                )}
              </div>
            </motion.div>

            {/* Import history */}
            <motion.div {...fadeUp(1)} className="bg-white rounded-xl border border-border shadow-sm">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">Historial de Importaciones</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold">
                      <th className="px-5 py-3 text-left">ID</th>
                      <th className="px-5 py-3 text-left">Tipo</th>
                      <th className="px-5 py-3 text-left">Archivo</th>
                      <th className="px-5 py-3 text-right">Filas</th>
                      <th className="px-5 py-3 text-left">Estado</th>
                      <th className="px-5 py-3 text-left">Fecha</th>
                      <th className="px-5 py-3 text-left">Usuario</th>
                    </tr>
                  </thead>
                  <tbody>
                    {IMPORT_HISTORY.map((imp, i) => (
                      <motion.tr key={imp.id} {...fadeUp(i + 2)}
                        className="border-b border-border/50 hover:bg-muted/20">
                        <td className="px-5 py-3 font-mono text-muted-foreground">{imp.id}</td>
                        <td className="px-5 py-3 font-medium text-foreground">{imp.type}</td>
                        <td className="px-5 py-3 text-muted-foreground">{imp.file}</td>
                        <td className="px-5 py-3 text-right font-medium">{imp.rows.toLocaleString()}</td>
                        <td className="px-5 py-3"><ImportStatusBadge status={imp.status} /></td>
                        <td className="px-5 py-3 text-muted-foreground">{imp.date}</td>
                        <td className="px-5 py-3 text-muted-foreground">{imp.user}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        </TabsContent>

        {/* ════════════════════ TAB 5: SETTINGS ════════════════════ */}
        <TabsContent value="settings">
          <motion.div {...fadeUp(0)} className="bg-white rounded-xl border border-border shadow-sm p-6 max-w-2xl">
            <h2 className="text-sm font-semibold text-foreground mb-6">Configuración del Sistema</h2>
            <div className="space-y-5">
              {/* Company Info */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5" /> Información de la Empresa
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-sm">Nombre de la Empresa</Label>
                    <Input defaultValue="PARTEQUIPOS MAQUINARIA" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">NIT</Label>
                    <Input defaultValue="900.123.456-7" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Teléfono</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input defaultValue="+57 601 234 5678" className="pl-9" />
                    </div>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-sm">Dirección</Label>
                    <Input defaultValue="Cra. 7 #32-16, Bogotá D.C., Colombia" />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-sm">Correo Electrónico Corporativo</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input defaultValue="info@partequipos.com" className="pl-9" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-border" />

              {/* Localization */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5" /> Localización
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Moneda</Label>
                    <Select defaultValue="COP">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="COP">COP — Peso Colombiano</SelectItem>
                        <SelectItem value="USD">USD — Dólar Americano</SelectItem>
                        <SelectItem value="EUR">EUR — Euro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Idioma</Label>
                    <Select defaultValue="es">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="es">Español</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="pt">Português</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Zona Horaria</Label>
                    <Select defaultValue="America/Bogota">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/Bogota">America/Bogota (UTC-5)</SelectItem>
                        <SelectItem value="America/Lima">America/Lima (UTC-5)</SelectItem>
                        <SelectItem value="America/Mexico_City">America/Mexico City (UTC-6)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="border-t border-border" />

              {/* Financial */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                  <DollarSign className="h-3.5 w-3.5" /> Configuración Financiera
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Tasa de IVA (%)</Label>
                    <div className="relative">
                      <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input defaultValue="19" type="number" className="pl-9" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Días de crédito por defecto</Label>
                    <Input defaultValue="30" type="number" />
                  </div>
                </div>
              </div>

              <Button
                className="bg-[#cf1b22] hover:bg-[#a81419] text-white gap-2"
                onClick={() => showToast("Configuración guardada exitosamente")}
              >
                <Save className="h-4 w-4" />
                Guardar Configuración
              </Button>
            </div>
          </motion.div>
        </TabsContent>

        {/* ════════════════════ TAB 6: LOGS ════════════════════ */}
        <TabsContent value="logs">
          <motion.div {...fadeUp(0)} className="bg-white rounded-xl border border-border shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-4 border-b border-border">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Registros del Sistema</h2>
                <p className="text-xs text-muted-foreground">{filteredLogs.length} entradas</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar registros..."
                    className="pl-9 h-8 text-xs w-48"
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                  />
                </div>
                {/* Level filter */}
                <Select
                  value={logFilter}
                  onValueChange={(v) => setLogFilter(v as "ALL" | LogLevel)}
                >
                  <SelectTrigger className="h-8 text-xs w-28 gap-1">
                    <Filter className="h-3 w-3" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos los niveles</SelectItem>
                    <SelectItem value="INFO">INFO</SelectItem>
                    <SelectItem value="WARN">ADVERTENCIA</SelectItem>
                    <SelectItem value="ERROR">ERROR</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1"
                  onClick={() => showToast("Registros exportados como CSV")}>
                  <Download className="h-3.5 w-3.5" /> Exportar Registros
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold">
                    <th className="px-5 py-3 text-left">Nivel</th>
                    <th className="px-5 py-3 text-left">Fecha y Hora</th>
                    <th className="px-5 py-3 text-left">Módulo</th>
                    <th className="px-5 py-3 text-left">Acción</th>
                    <th className="px-5 py-3 text-left">Usuario</th>
                    <th className="px-5 py-3 text-left">Dirección IP</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log, i) => (
                    <motion.tr key={log.id} {...fadeUp(i)}
                      className={cn(
                        "border-b border-border/50 hover:bg-muted/20 transition-colors",
                        log.level === "ERROR" && "bg-red-50/30",
                        log.level === "WARN" && "bg-amber-50/20"
                      )}>
                      <td className="px-5 py-3"><LogLevelBadge level={log.level} /></td>
                      <td className="px-5 py-3 font-mono text-muted-foreground whitespace-nowrap">{log.timestamp}</td>
                      <td className="px-5 py-3 font-medium text-foreground">{log.module}</td>
                      <td className="px-5 py-3 text-muted-foreground max-w-xs truncate">{log.action}</td>
                      <td className="px-5 py-3 text-muted-foreground">{log.user}</td>
                      <td className="px-5 py-3 font-mono text-muted-foreground">{log.ip}</td>
                    </motion.tr>
                  ))}
                  {filteredLogs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center text-muted-foreground py-8 text-sm">
                        No se encontraron registros para los filtros aplicados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </TabsContent>

        {/* ════════════════════ TAB 7: AUDIT ════════════════════ */}
        <TabsContent value="audit">
          <motion.div {...fadeUp(0)} className="bg-white rounded-xl border border-border shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-4 border-b border-border">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Auditoría del Sistema</h2>
                <p className="text-xs text-muted-foreground">Trazabilidad completa de acciones</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="date"
                      className="pl-9 h-8 text-xs w-36"
                      value={auditDateFrom}
                      onChange={(e) => setAuditDateFrom(e.target.value)}
                      placeholder="Desde"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">—</span>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="date"
                      className="pl-9 h-8 text-xs w-36"
                      value={auditDateTo}
                      onChange={(e) => setAuditDateTo(e.target.value)}
                      placeholder="Hasta"
                    />
                  </div>
                </div>
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1"
                  onClick={() => showToast("Auditoría exportada como CSV")}>
                  <Download className="h-3.5 w-3.5" /> Exportar Auditoría
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold">
                    <th className="px-5 py-3 text-left">Fecha y Hora</th>
                    <th className="px-5 py-3 text-left">Usuario</th>
                    <th className="px-5 py-3 text-left">Acción</th>
                    <th className="px-5 py-3 text-left">Módulo</th>
                    <th className="px-5 py-3 text-left">ID del Registro</th>
                    <th className="px-5 py-3 text-left">Campos Modificados</th>
                    <th className="px-5 py-3 text-left">Dirección IP</th>
                  </tr>
                </thead>
                <tbody>
                  {AUDIT_TRAIL.map((entry, i) => (
                    <motion.tr key={entry.id} {...fadeUp(i)}
                      className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3 font-mono text-muted-foreground whitespace-nowrap">{entry.timestamp}</td>
                      <td className="px-5 py-3 font-medium text-foreground">{entry.user}</td>
                      <td className="px-5 py-3"><AuditActionBadge action={entry.action} /></td>
                      <td className="px-5 py-3 text-muted-foreground">{entry.module}</td>
                      <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{entry.record}</td>
                      <td className="px-5 py-3 text-muted-foreground max-w-xs">
                        <code className="text-[10px] bg-muted/60 rounded px-1.5 py-0.5 break-all">
                          {entry.fields}
                        </code>
                      </td>
                      <td className="px-5 py-3 font-mono text-muted-foreground">{entry.ip}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Toast */}
      {toast && <Toast msg={toast} onClose={() => setToast("")} />}
    </div>
  );
}

// CheckCircle alias — resolves to the imported CheckCircle2
function CheckCircle({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
