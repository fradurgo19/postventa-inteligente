'use client';

import { useState } from 'react';
import {
  Users,
  ShieldCheck,
  Lock,
  Upload,
  Settings,
  FileText,
  ClipboardList,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AdminUsersPanel } from '@/components/modules/admin-users-panel';
import { AdminRolesPanel } from '@/components/modules/admin-roles-panel';
import { AdminPermissionsPanel } from '@/components/modules/admin-permissions-panel';
import { AdminImportsPanel } from '@/components/modules/admin-imports-panel';
import { AdminSettingsPanel } from '@/components/modules/admin-settings-panel';
import { AdminAuditPanel } from '@/components/modules/admin-audit-panel';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { useAdminDomainSummary } from '@/hooks/use-administration';

function AdminDomainKpis() {
  const { data: summary } = useAdminDomainSummary();
  if (!isSupabaseConfigured() || !summary) return null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {[
        { label: 'Usuarios', value: summary.usuarios },
        { label: 'Asesores', value: summary.asesores },
        { label: 'Clientes', value: summary.clientes },
        { label: 'Equipos', value: summary.maquinas },
        { label: 'Telemetría', value: summary.telemetria },
      ].map((kpi) => (
        <div
          key={kpi.label}
          className="rounded-xl border border-border bg-white px-4 py-3 shadow-sm"
        >
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
            {kpi.label}
          </p>
          <p className="text-xl font-bold text-foreground tabular-nums mt-0.5">
            {kpi.value.toLocaleString('es-CO')}
          </p>
        </div>
      ))}
    </div>
  );
}

const ADMIN_TABS = [
  { value: 'users', label: 'Usuarios', icon: Users },
  { value: 'roles', label: 'Roles', icon: ShieldCheck },
  { value: 'permissions', label: 'Permisos', icon: Lock },
  { value: 'imports', label: 'Importaciones', icon: Upload },
  { value: 'settings', label: 'Configuración', icon: Settings },
  { value: 'logs', label: 'Registros', icon: FileText },
  { value: 'audit', label: 'Auditoría', icon: ClipboardList },
] as const;

export default function AdministrationPage() {
  const [tab, setTab] = useState<string>('users');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Administración</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gestión de usuarios, roles, permisos, importaciones, configuración y auditoría.
        </p>
      </div>

      <AdminDomainKpis />

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/60 p-1 rounded-xl">
          {ADMIN_TABS.map((t) => (
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

        <TabsContent value="users">
          <AdminUsersPanel />
        </TabsContent>

        <TabsContent value="roles">
          <AdminRolesPanel onEditPermissions={() => setTab('permissions')} />
        </TabsContent>

        <TabsContent value="permissions">
          <AdminPermissionsPanel />
        </TabsContent>

        <TabsContent value="imports">
          <AdminImportsPanel />
        </TabsContent>

        <TabsContent value="settings">
          <AdminSettingsPanel />
        </TabsContent>

        <TabsContent value="logs">
          <AdminAuditPanel mode="logs" />
        </TabsContent>

        <TabsContent value="audit">
          <AdminAuditPanel mode="audit" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
