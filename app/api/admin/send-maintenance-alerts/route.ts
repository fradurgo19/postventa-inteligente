import { NextResponse } from 'next/server';
import {
  isAdminUserApiConfigured,
  verifyRequestIsAdministrator,
} from '@/lib/supabase/server-admin';

function parseBearerToken(request: Request): string | null {
  const header = request.headers.get('authorization') ?? request.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

/** Dispara manualmente la Edge Function de alertas (7 días antes del MTTO). Solo administrador. */
export async function POST(request: Request) {
  if (!isAdminUserApiConfigured()) {
    return NextResponse.json({ error: 'Supabase no configurado en el servidor.' }, { status: 503 });
  }

  const token = parseBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  }

  try {
    await verifyRequestIsAdministrator(token);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'No autorizado.' },
      { status: 403 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Faltan variables de servidor Supabase.' }, { status: 503 });
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  };
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) headers['x-cron-secret'] = cronSecret;

  const response = await fetch(`${supabaseUrl}/functions/v1/send-maintenance-alerts`, {
    method: 'POST',
    headers,
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return NextResponse.json(payload, { status: response.status });
}
