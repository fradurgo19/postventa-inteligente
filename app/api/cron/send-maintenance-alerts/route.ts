import { NextResponse } from 'next/server';

/**
 * Cron diario (Vercel): 08:00 America/Bogota → invoca Edge Function de alertas MTTO.
 * Schedule en vercel.json: "0 13 * * *" (13:00 UTC).
 *
 * Seguridad: Authorization Bearer = CRON_SECRET (Vercel lo envía automáticamente
 * si defines CRON_SECRET en Environment Variables).
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET no configurado en Vercel.' },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get('authorization') ?? '';
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: 'Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.' },
      { status: 503 }
    );
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  };

  const response = await fetch(`${supabaseUrl}/functions/v1/send-maintenance-alerts`, {
    method: 'POST',
    headers,
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return NextResponse.json(
    {
      triggeredAt: new Date().toISOString(),
      edgeStatus: response.status,
      ...payload,
    },
    { status: response.ok ? 200 : response.status }
  );
}
