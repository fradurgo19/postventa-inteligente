'use client';

import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from '@/lib/query-client';
import { getSessionUser } from '@/lib/supabase/auth';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { useUserStore } from '@/store';

function AuthHydrator({ children }: { children: React.ReactNode }) {
  const setUser = useUserStore((s) => s.setUser);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    let cancelled = false;

    void (async () => {
      const sessionUser = await getSessionUser();
      if (!cancelled && sessionUser) {
        setUser(sessionUser);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [setUser]);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthHydrator>{children}</AuthHydrator>
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  );
}
