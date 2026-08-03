'use client';

import { motion } from 'framer-motion';
import { Pencil, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminRoles } from '@/hooks/use-administration';
import type { AdminRoleSummary } from '@/services/administration.service';
import { cn } from '@/lib/utils';

interface AdminRolesPanelProps {
  readonly onEditPermissions?: () => void;
}

export function AdminRolesPanel({ onEditPermissions }: AdminRolesPanelProps) {
  const { data, isLoading } = useAdminRoles();
  const roles: AdminRoleSummary[] = data ?? [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {['r1', 'r2', 'r3'].map((id) => (
          <Skeleton key={id} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {roles.map((role: AdminRoleSummary, i: number) => (
        <motion.div
          key={role.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="bg-white rounded-xl border border-border shadow-sm p-5 flex flex-col gap-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#cf1b22]" />
                {role.name}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {role.description}
              </p>
            </div>
            <span className="text-xs font-medium bg-muted rounded-full px-2 py-1 text-muted-foreground flex-shrink-0">
              {role.userCount} usuarios
            </span>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Capacidades
            </p>
            <div className="grid grid-cols-1 gap-1">
              {role.capabilities.map((perm: string) => (
                <div key={perm} className="flex items-center gap-2">
                  <Checkbox checked disabled className="h-3.5 w-3.5" />
                  <span className="text-[11px] text-foreground">{perm}</span>
                </div>
              ))}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="self-start text-xs gap-1.5 mt-auto"
            onClick={onEditPermissions}
          >
            <Pencil className="h-3.5 w-3.5" />
            Ver matriz de permisos
          </Button>
          <p className={cn('text-[10px] text-muted-foreground')}>
            Rol BD: <code>{role.dbRole}</code>
          </p>
        </motion.div>
      ))}
    </div>
  );
}
