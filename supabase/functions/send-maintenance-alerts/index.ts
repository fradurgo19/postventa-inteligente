/**
 * Edge Function: send-maintenance-alerts
 * Cron diario: genera/envía alertas 7 días antes de fecha_primer/segundo/tercer_mtto.
 *
 * Deploy: supabase functions deploy send-maintenance-alerts
 * Cron (Dashboard → Edge Functions → Schedules): 0 13 * * * (8:00 COT)
 *
 * Secrets opcionales:
 *   RESEND_API_KEY, ALERT_FROM_EMAIL
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type TipoAlerta = 'primer' | 'segundo' | 'tercer';

interface EquipoAlerta {
  id: string;
  serie: string;
  modelo: string;
  marca: string;
  titulo: string | null;
  asesor_email: string | null;
  sede: string | null;
  fecha_primer_mtto: string | null;
  fecha_segundo_mtto: string | null;
  fecha_tercer_mtto: string | null;
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('ALERT_FROM_EMAIL') ?? 'alertas@partequipos.com';

  if (!apiKey) {
    console.log(`[alerta-mock] To=${to} Subject=${subject}`);
    return true;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });

  return response.ok;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const admin = createClient(supabaseUrl, serviceKey);

    const targetDate = addDays(todayUtc(), 7);
    const { data: equipos, error } = await admin
      .from('telemetria_equipos')
      .select(
        'id, serie, modelo, marca, titulo, asesor_email, sede, fecha_primer_mtto, fecha_segundo_mtto, fecha_tercer_mtto'
      )
      .or(
        `fecha_primer_mtto.eq.${targetDate},fecha_segundo_mtto.eq.${targetDate},fecha_tercer_mtto.eq.${targetDate}`
      );

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let created = 0;
    let sent = 0;
    let skipped = 0;

    for (const equipo of (equipos ?? []) as EquipoAlerta[]) {
      const candidates: Array<{ tipo: TipoAlerta; fecha: string }> = [];
      if (equipo.fecha_primer_mtto === targetDate) {
        candidates.push({ tipo: 'primer', fecha: equipo.fecha_primer_mtto });
      }
      if (equipo.fecha_segundo_mtto === targetDate) {
        candidates.push({ tipo: 'segundo', fecha: equipo.fecha_segundo_mtto });
      }
      if (equipo.fecha_tercer_mtto === targetDate) {
        candidates.push({ tipo: 'tercer', fecha: equipo.fecha_tercer_mtto });
      }

      for (const candidate of candidates) {
        const destinatario = equipo.asesor_email ?? 'centrodemonitoreo@partequipos.com';

        const { data: existing } = await admin
          .from('alertas_mantenimiento')
          .select('id, estado')
          .eq('telemetria_id', equipo.id)
          .eq('tipo_alerta', candidate.tipo)
          .eq('fecha_programada', candidate.fecha)
          .maybeSingle();

        if (existing?.estado === 'enviado') {
          skipped += 1;
          continue;
        }

        let alertaId = existing?.id as string | undefined;
        if (!alertaId) {
          const { data: inserted, error: insertError } = await admin
            .from('alertas_mantenimiento')
            .insert({
              telemetria_id: equipo.id,
              tipo_alerta: candidate.tipo,
              fecha_programada: candidate.fecha,
              destinatario,
              estado: 'pendiente',
            })
            .select('id')
            .single();

          if (insertError) {
            console.error(insertError.message);
            continue;
          }
          alertaId = inserted.id;
          created += 1;
        }

        const subject = `[PARTEQUIPOS] Mantenimiento ${candidate.tipo} en 7 días — ${equipo.serie}`;
        const html = `
          <h2 style="color:#cf1b22">Alerta de Mantenimiento Proyectado</h2>
          <p>Equipo <strong>${equipo.marca} ${equipo.modelo}</strong> (Serie: ${equipo.serie})</p>
          <p>Cliente: ${equipo.titulo ?? 'N/A'} · Sede: ${equipo.sede ?? 'N/A'}</p>
          <p>Tipo: <strong>${candidate.tipo}</strong> · Fecha programada: <strong>${candidate.fecha}</strong></p>
          <p>Este aviso se envía con 1 semana de antelación según telemetría.</p>
        `;

        const ok = await sendEmail(destinatario, subject, html);
        await admin
          .from('alertas_mantenimiento')
          .update({
            estado: ok ? 'enviado' : 'fallido',
            fecha_envio: ok ? new Date().toISOString() : null,
          })
          .eq('id', alertaId);

        if (ok) sent += 1;
      }
    }

    return new Response(
      JSON.stringify({
        targetDate,
        equiposEvaluados: equipos?.length ?? 0,
        alertasCreadas: created,
        alertasEnviadas: sent,
        omitidas: skipped,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Error interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
