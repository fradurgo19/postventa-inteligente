'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { canRoleAccessPath, cloneDefaultModuleAccess } from '@/lib/admin/module-access';
import { useModuleAccessMatrix } from '@/hooks/use-administration';
import { useUserStore } from '@/store';

/** Redirige si el rol actual no tiene acceso al módulo de la ruta. */
export function ModuleRouteGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const { role, authReady, isAuthenticated } = useUserStore();
  const { data: matrix } = useModuleAccessMatrix();

  useEffect(() => {
    if (!authReady || !isAuthenticated) return;
    const effectiveMatrix = matrix ?? cloneDefaultModuleAccess();
    if (!canRoleAccessPath(effectiveMatrix, pathname, role)) {
      toast.error('No tiene permiso para acceder a este módulo');
      router.replace('/dashboard');
    }
  }, [authReady, isAuthenticated, matrix, pathname, role, router]);

  return null;
}
