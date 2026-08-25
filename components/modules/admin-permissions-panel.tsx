'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, RotateCcw, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { APP_MODULES } from '@/lib/admin/role-catalog';
import {
  cloneDefaultModuleAccess,
  enforceAdministratorFullAccess,
  matricesEqual,
  PERM_ROLES,
  type ModuleAccessMatrix,
} from '@/lib/admin/module-access';
import type { UserRole } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useModuleAccessMatrix,
  useSaveModuleAccessMatrix,
} from '@/hooks/use-administration';
import { useUserStore } from '@/store';

const ROLE_LABELS: Record<UserRole, string> = {
  Administrator: 'Administrador',
  Coordinator: 'Coordinador',
  'Sales Advisor': 'Asesor',
  Technician: 'Técnico',
  Viewer: 'Visualizador',
};

interface PermissionCellProps {
  readonly allowed: boolean;
  readonly editable: boolean;
  readonly onToggle: () => void;
}

function PermissionCell({ allowed, editable, onToggle }: PermissionCellProps) {
  if (!editable) {
    return (
      <span
        className={cn(
          'w-7 h-7 rounded-full inline-flex items-center justify-center mx-auto',
          allowed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-400'
        )}
        title={allowed ? 'Permitido' : 'Denegado'}
      >
        {allowed ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'w-8 h-8 rounded-full inline-flex items-center justify-center mx-auto border transition-colors',
        allowed
          ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200'
          : 'bg-red-50 text-red-400 border-red-100 hover:bg-red-100'
      )}
      title={allowed ? 'Quitar acceso' : 'Conceder acceso'}
      aria-label={allowed ? 'Quitar acceso' : 'Conceder acceso'}
    >
      {allowed ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
    </button>
  );
}

export function AdminPermissionsPanel() {
  const { role } = useUserStore();
  const isAdmin = role === 'Administrator';
  const { data: savedMatrix, isLoading } = useModuleAccessMatrix();
  const saveMutation = useSaveModuleAccessMatrix();
  const [draft, setDraft] = useState<ModuleAccessMatrix | null>(null);

  useEffect(() => {
    if (savedMatrix) setDraft(enforceAdministratorFullAccess(savedMatrix));
  }, [savedMatrix]);

  const baseline = useMemo(
    () => enforceAdministratorFullAccess(savedMatrix ?? cloneDefaultModuleAccess()),
    [savedMatrix]
  );

  const dirty = draft != null && !matricesEqual(draft, baseline);

  const togglePermission = (module: string, permRole: UserRole) => {
    if (!isAdmin || permRole === 'Administrator' || !draft) return;
    setDraft((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [module]: { ...prev[module] } };
      next[module][permRole] = !next[module][permRole];
      return enforceAdministratorFullAccess(next);
    });
  };

  const resetDraft = () => setDraft(enforceAdministratorFullAccess(baseline));

  const restoreDefaults = () => setDraft(enforceAdministratorFullAccess(cloneDefaultModuleAccess()));

  const save = async () => {
    if (!draft || !isAdmin) return;
    try {
      await saveMutation.mutateAsync(draft);
      toast.success('Permisos actualizados. Los cambios aplican a los roles de inmediato.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudieron guardar los permisos');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-border shadow-sm"
    >
      <div className="px-5 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Matriz de Permisos por Módulo</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Define qué módulos puede ver cada rol. Se guarda en Supabase y afecta menú y rutas.
            {isAdmin ? ' Solo administradores pueden editar.' : ' Solo lectura para su rol.'}
          </p>
        </div>
        {isAdmin ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              disabled={!dirty || saveMutation.isPending}
              onClick={resetDraft}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Descartar
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              disabled={saveMutation.isPending}
              onClick={restoreDefaults}
            >
              Restaurar defaults
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 bg-[#cf1b22] hover:bg-[#a81419] text-white"
              disabled={!dirty || saveMutation.isPending || !draft}
              onClick={() => void save()}
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {saveMutation.isPending ? 'Guardando…' : 'Guardar permisos'}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="overflow-x-auto p-5">
        {isLoading || !draft ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left text-xs font-semibold text-muted-foreground pb-3 pr-8">
                  Módulo
                </th>
                {PERM_ROLES.map((r) => (
                  <th
                    key={r}
                    className="text-center text-xs font-semibold text-muted-foreground pb-3 px-4"
                  >
                    <Badge variant="outline" className="font-semibold">
                      {ROLE_LABELS[r]}
                    </Badge>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {APP_MODULES.map((mod, mi) => (
                <tr
                  key={mod}
                  className={cn('border-b border-border/50', mi % 2 === 0 && 'bg-muted/10')}
                >
                  <td className="py-3 pr-8 font-medium text-foreground">{mod}</td>
                  {PERM_ROLES.map((permRole) => {
                    const allowed = draft[mod]?.[permRole] ?? false;
                    const editable = isAdmin && permRole !== 'Administrator';
                    return (
                      <td key={permRole} className="text-center py-3 px-4">
                        <PermissionCell
                          allowed={allowed}
                          editable={editable}
                          onToggle={() => togglePermission(mod, permRole)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </motion.div>
  );
}
