'use client';

import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from '@/lib/query-client';
import { getSessionUser, subscribeAuthChanges } from '@/lib/supabase/auth';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { InactivityGuard } from '@/components/auth/inactivity-guard';
import { useUserStore } from '@/store';

function AuthHydrator({ children }: Readonly<{ children: React.ReactNode }>) {
  const setUser = useUserStore((s) => s.setUser);
  const clearSession = useUserStore((s) => s.clearSession);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    let cancelled = false;
    let seq = 0;

    const applyFromServer = async () => {
      const mySeq = ++seq;
      const sessionUser = await getSessionUser();
      if (cancelled || mySeq !== seq) return;
      if (sessionUser) {
        setUser(sessionUser);
      } else {
        clearSession();
      }
    };

    void applyFromServer();

    const unsubscribe = subscribeAuthChanges((user) => {
      // Invalida getSessionUser en vuelo (p. ej. tras login).
      seq += 1;
      if (cancelled) return;
      if (user) {
        setUser(user);
      } else {
        clearSession();
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [setUser, clearSession]);

  return <>{children}</>;
}

export function Providers({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthHydrator>
        <InactivityGuard>{children}</InactivityGuard>
      </AuthHydrator>
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  );
}
