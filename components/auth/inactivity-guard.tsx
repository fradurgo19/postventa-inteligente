'use client';

import { useInactivityLogout } from '@/hooks/use-inactivity-logout';

/** Cierra sesión tras 30 minutos sin interacción del usuario. */
export function InactivityGuard({ children }: Readonly<{ children: React.ReactNode }>) {
  useInactivityLogout();
  return <>{children}</>;
}
