'use client';

import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { APP_MODULES, MODULE_ACCESS } from '@/lib/admin/role-catalog';
import type { UserRole } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const PERM_ROLES: UserRole[] = [
  'Administrator',
  'Coordinator',
  'Sales Advisor',
  'Technician',
  'Viewer',
];

const ROLE_LABELS: Record<UserRole, string> = {
  Administrator: 'Administrador',
  Coordinator: 'Coordinador',
  'Sales Advisor': 'Asesor',
  Technician: 'Técnico',
  Viewer: 'Visualizador',
};

export function AdminPermissionsPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-border shadow-sm"
    >
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Matriz de Permisos por Módulo</h2>
        <p className="text-xs text-muted-foreground">
          Derivada del rol en <code className="text-[11px]">perfiles.rol</code> y alineada al menú
          de la app. Solo lectura (los cambios de acceso se hacen asignando el rol al usuario).
        </p>
      </div>
      <div className="overflow-x-auto p-5">
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
                {PERM_ROLES.map((role) => {
                  const allowed = MODULE_ACCESS[mod]?.[role] ?? false;
                  return (
                    <td key={role} className="text-center py-3 px-4">
                      <span
                        className={cn(
                          'w-7 h-7 rounded-full inline-flex items-center justify-center mx-auto',
                          allowed
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-50 text-red-400'
                        )}
                        title={allowed ? 'Permitido' : 'Denegado'}
                      >
                        {allowed ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
