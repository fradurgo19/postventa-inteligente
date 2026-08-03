'use client';

import { motion } from 'framer-motion';
import { KeyRound, Pencil, RefreshCw, UserPlus, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import {
  useAdminAsesores,
  useAdminUsers,
  useTogglePerfilActivo,
  useUpdatePerfil,
} from '@/hooks/use-administration';
import type { AdminAsesorRow, AdminUserRow } from '@/services/administration.service';
import { toast } from 'sonner';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/lib/mock-data';

const EDIT_ROLES: { value: UserRole; label: string }[] = [
  { value: 'Administrator', label: 'Administrador' },
  { value: 'Coordinator', label: 'Coordinador' },
  { value: 'Sales Advisor', label: 'Asesor Comercial' },
  { value: 'Technician', label: 'Técnico' },
  { value: 'Viewer', label: 'Visualizador' },
];

function RoleBadge({ role }: { role: UserRole }) {
  const map: Record<UserRole, string> = {
    Administrator: 'bg-[#cf1b22]/10 text-[#cf1b22] border-[#cf1b22]/30',
    Coordinator: 'bg-blue-50 text-blue-700 border-blue-200',
    'Sales Advisor': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Technician: 'bg-amber-50 text-amber-700 border-amber-200',
    Viewer: 'bg-slate-50 text-slate-600 border-slate-200',
  };
  const labels: Record<UserRole, string> = {
    Administrator: 'Administrador',
    Coordinator: 'Coordinador',
    'Sales Advisor': 'Asesor Comercial',
    Technician: 'Técnico',
    Viewer: 'Visualizador',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        map[role]
      )}
    >
      {labels[role]}
    </span>
  );
}

function StatusDot({ status }: { status: 'active' | 'inactive' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium',
        status === 'active' ? 'text-emerald-600' : 'text-slate-400'
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full',
          status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
        )}
      />
      {status === 'active' ? 'Activo' : 'Inactivo'}
    </span>
  );
}

export function AdminUsersPanel() {
  const [showAddUser, setShowAddUser] = useState(false);
  const [editing, setEditing] = useState<AdminUserRow | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('Viewer');
  const [editSede, setEditSede] = useState('');
  const { data: adminUsers = [] as AdminUserRow[], isLoading: loadingUsers, refetch } = useAdminUsers();
  const { data: asesores = [] as AdminAsesorRow[], isLoading: loadingAsesores } = useAdminAsesores();
  const toggleActivo = useTogglePerfilActivo();
  const updatePerfil = useUpdatePerfil();

  const openEdit = (u: AdminUserRow) => {
    setEditing(u);
    setEditName(u.name);
    setEditRole(u.role);
    setEditSede(u.sede ?? '');
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      await updatePerfil.mutateAsync({
        id: editing.id,
        patch: {
          nombre: editName,
          rol: editRole,
          sede: editSede.trim() || null,
        },
      });
      toast.success('Usuario actualizado');
      setEditing(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar');
    }
  };

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-border shadow-sm"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border gap-3 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Gestión de Usuarios (Auth / perfiles)
            </h2>
            <p className="text-xs text-muted-foreground">
              {adminUsers.length} usuarios · Asesores comerciales se relacionan con clientes/equipos
              vía telemetría
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => void refetch()}>
              <RefreshCw className="h-3.5 w-3.5" />
              Actualizar
            </Button>
            <Button
              size="sm"
              className="bg-[#cf1b22] hover:bg-[#a81419] text-white gap-1.5"
              onClick={() => setShowAddUser(true)}
            >
              <UserPlus className="h-4 w-4" />
              Agregar Usuario
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          {loadingUsers ? (
            <div className="p-5 space-y-2">
              {['u1', 'u2', 'u3'].map((id) => (
                <Skeleton key={id} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground font-semibold">
                  <th className="px-5 py-3 text-left">Nombre</th>
                  <th className="px-5 py-3 text-left">Correo electrónico</th>
                  <th className="px-5 py-3 text-left">Rol</th>
                  <th className="px-5 py-3 text-left">Estado</th>
                  <th className="px-5 py-3 text-right">Clientes</th>
                  <th className="px-5 py-3 text-right">Equipos</th>
                  <th className="px-5 py-3 text-left">Último Acceso</th>
                  <th className="px-5 py-3 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {adminUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-sm text-muted-foreground">
                      {isSupabaseConfigured()
                        ? 'No hay perfiles. Cree usuarios en Supabase Authentication.'
                        : 'Supabase no configurado.'}
                    </td>
                  </tr>
                ) : (
                  adminUsers.map((u: AdminUserRow) => (
                    <tr
                      key={u.id}
                      className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#cf1b22] to-[#ff4d4d] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                            {u.avatar}
                          </div>
                          <div>
                            <span className="font-medium text-foreground block">{u.name}</span>
                            {u.linkedAsesorId ? (
                              <span className="text-[10px] text-emerald-700">
                                Vinculado a asesores
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{u.email}</td>
                      <td className="px-5 py-3">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="px-5 py-3">
                        <StatusDot status={u.status} />
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        {u.clientesRelacionados}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        {u.equiposRelacionados}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground text-xs">{u.lastLogin}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs gap-1 hover:bg-blue-50 hover:text-blue-700"
                            onClick={() => openEdit(u)}
                          >
                            <Pencil className="h-3 w-3" /> Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs gap-1 hover:bg-amber-50 hover:text-amber-700"
                            disabled={toggleActivo.isPending}
                            onClick={() => {
                              void toggleActivo
                                .mutateAsync({
                                  id: u.id,
                                  activo: u.status !== 'active',
                                })
                                .then(() =>
                                  toast.success(
                                    u.status === 'active'
                                      ? 'Usuario desactivado'
                                      : 'Usuario activado'
                                  )
                                )
                                .catch((err: unknown) =>
                                  toast.error(
                                    err instanceof Error ? err.message : 'No se pudo actualizar'
                                  )
                                );
                            }}
                          >
                            <UserX className="h-3 w-3" />{' '}
                            {u.status === 'active' ? 'Desactivar' : 'Activar'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs gap-1 hover:bg-purple-50 hover:text-purple-700"
                            onClick={() =>
                              toast.message('Restablecer contraseña en Supabase Auth → Users')
                            }
                          >
                            <KeyRound className="h-3 w-3" /> Restablecer
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white rounded-xl border border-border shadow-sm"
      >
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Asesores (telemetría)</h2>
          <p className="text-xs text-muted-foreground">
            Tabla <code className="text-[11px]">asesores</code> del Excel mensual · clientes/equipos
            vía <code className="text-[11px]">telemetria_equipos</code>
          </p>
        </div>
        <div className="overflow-x-auto">
          {loadingAsesores ? (
            <div className="p-5">
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold">
                  <th className="px-5 py-3 text-left">Nombre</th>
                  <th className="px-5 py-3 text-left">Email</th>
                  <th className="px-5 py-3 text-left">Sede</th>
                  <th className="px-5 py-3 text-right">Clientes</th>
                  <th className="px-5 py-3 text-right">Equipos</th>
                  <th className="px-5 py-3 text-right">Oportunidades</th>
                </tr>
              </thead>
              <tbody>
                {asesores.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-6 text-center text-muted-foreground">
                      Sin asesores. Importe telemetría (Cronograma) para poblar esta tabla.
                    </td>
                  </tr>
                ) : (
                  asesores.map((a: AdminAsesorRow) => (
                    <tr key={a.id} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="px-5 py-2.5 font-medium">{a.nombre}</td>
                      <td className="px-5 py-2.5 text-muted-foreground">{a.email}</td>
                      <td className="px-5 py-2.5">{a.sede || '—'}</td>
                      <td className="px-5 py-2.5 text-right tabular-nums">{a.clientes}</td>
                      <td className="px-5 py-2.5 text-right tabular-nums">{a.equipos}</td>
                      <td className="px-5 py-2.5 text-right tabular-nums">{a.oportunidades}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>

      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-[#cf1b22]" />
              Agregar Nuevo Usuario
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Cree el usuario en Supabase Dashboard → Authentication. El trigger genera el perfil en{' '}
            <code>perfiles</code>. Luego edite rol y sede desde esta tabla.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddUser(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-[#cf1b22]" />
              Editar usuario
            </DialogTitle>
          </DialogHeader>
          {editing ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">{editing.email}</p>
              <div className="space-y-1.5">
                <Label>Nombre</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Rol</Label>
                <Select value={editRole} onValueChange={(v) => setEditRole(v as UserRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EDIT_ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Sede</Label>
                <Input
                  value={editSede}
                  onChange={(e) => setEditSede(e.target.value)}
                  placeholder="Ej: Bogotá"
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button
              className="bg-[#cf1b22] hover:bg-[#a81419] text-white"
              disabled={updatePerfil.isPending || !editName.trim()}
              onClick={() => void saveEdit()}
            >
              {updatePerfil.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
