'use client';

import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from '@/lib/query-client';
import { getSessionUser, subscribeAuthChanges } from '@/lib/supabase/auth';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { AuthGate } from '@/components/auth/auth-gate';
import { InactivityGuard } from '@/components/auth/inactivity-guard';
import { purgeStaleUserPersistence, useUserStore } from '@/store';

function AuthHydrator({ children }: Readonly<{ children: React.ReactNode }>) {
  const setUser = useUserStore((s) => s.setUser);
  const clearSession = useUserStore((s) => s.clearSession);
  const setAuthReady = useUserStore((s) => s.setAuthReady);

  useEffect(() => {
    purgeStaleUserPersistence();

    let cancelled = false;
    let seq = 0;

    const finishAnonymous = () => {
      if (cancelled) return;
      clearSession();
      setAuthReady(true);
    };

    const applyFromServer = async () => {
      const mySeq = ++seq;

      if (!isSupabaseConfigured()) {
        // Modo local/mock: no hay JWT; exigir login explícito.
        if (!cancelled && mySeq === seq) finishAnonymous();
        return;
      }

      try {
        const sessionUser = await getSessionUser();
        if (cancelled || mySeq !== seq) return;
        if (sessionUser) {
          setUser(sessionUser);
        } else {
          finishAnonymous();
        }
      } catch {
        if (!cancelled && mySeq === seq) finishAnonymous();
      }
    };

    void applyFromServer();

    const unsubscribe = isSupabaseConfigured()
      ? subscribeAuthChanges((user) => {
          seq += 1;
          if (cancelled) return;
          if (user) {
            setUser(user);
          } else {
            finishAnonymous();
          }
        })
      : () => undefined;

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [setUser, clearSession, setAuthReady]);

  return <>{children}</>;
}

export function Providers({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthHydrator>
        <AuthGate>
          <InactivityGuard>{children}</InactivityGuard>
        </AuthGate>
      </AuthHydrator>
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  );
}
