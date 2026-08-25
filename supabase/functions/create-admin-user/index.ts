/**
 * Edge Function: create-admin-user
 * Crea usuarios Auth + perfil. Solo administradores.
 *
 * Deploy:
 *   supabase functions deploy create-admin-user
 *
 * Invoke: POST /functions/v1/create-admin-user
 * Body: { email, password, nombre, rol, sede? }
 * rol: Administrator | Coordinator | Sales Advisor | Technician | Viewer
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VALID_ROLES = new Set([
  'Administrator',
  'Coordinator',
  'Sales Advisor',
  'Technician',
  'Viewer',
]);

const APP_ROLE_TO_DB: Record<string, string> = {
  Administrator: 'administrador',
  Coordinator: 'coordinador',
  'Sales Advisor': 'asesor_comercial',
  Technician: 'tecnico',
  Viewer: 'visualizador',
};

interface CreateUserRequest {
  email?: string;
  password?: string;
  nombre?: string;
  rol?: string;
  sede?: string | null;
}

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function validateBody(body: CreateUserRequest): CreateUserRequest & {
  email: string;
  password: string;
  nombre: string;
  rol: string;
  sede: string | null;
} | string {
  const email = body.email?.trim().toLowerCase() ?? '';
  const password = body.password ?? '';
  const nombre = body.nombre?.trim() ?? '';
  const rol = body.rol ?? 'Viewer';
  const sede = body.sede?.trim() || null;

  if (!email.includes('@')) return 'Correo electrónico inválido.';
  if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
  if (!nombre) return 'El nombre es obligatorio.';
  if (!VALID_ROLES.has(rol)) return 'Rol inválido.';

  return { email, password, nombre, rol, sede };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método no permitido.' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'No autorizado.' }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return jsonResponse({ error: 'Sesión inválida o expirada.' }, 401);
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: perfil, error: perfilError } = await admin
      .from('perfiles')
      .select('rol')
      .eq('id', userData.user.id)
      .maybeSingle();

    if (perfilError) {
      return jsonResponse({ error: perfilError.message }, 500);
    }

    if (perfil?.rol !== 'administrador') {
      return jsonResponse({ error: 'Solo administradores pueden crear usuarios.' }, 403);
    }

    let rawBody: CreateUserRequest;
    try {
      rawBody = (await req.json()) as CreateUserRequest;
    } catch {
      return jsonResponse({ error: 'Cuerpo de solicitud inválido.' }, 400);
    }

    const validated = validateBody(rawBody);
    if (typeof validated === 'string') {
      return jsonResponse({ error: validated }, 400);
    }

    const dbRole = APP_ROLE_TO_DB[validated.rol] ?? 'visualizador';

    const { data, error } = await admin.auth.admin.createUser({
      email: validated.email,
      password: validated.password,
      email_confirm: true,
      user_metadata: {
        nombre: validated.nombre,
        rol: dbRole,
      },
    });

    if (error || !data.user) {
      const message = error?.message ?? 'No se pudo crear el usuario en Auth.';
      const status = /already|registered|exists|duplicate/i.test(message) ? 409 : 500;
      return jsonResponse({ error: message }, status);
    }

    const userId = data.user.id;

    const { error: perfilUpsertError } = await admin.from('perfiles').upsert(
      {
        id: userId,
        email: validated.email,
        nombre: validated.nombre,
        rol: dbRole,
        sede: validated.sede,
        activo: true,
      },
      { onConflict: 'id' }
    );

    if (perfilUpsertError) {
      return jsonResponse({ error: perfilUpsertError.message }, 500);
    }

    await admin.from('auditoria').insert({
      user_id: userData.user.id,
      modulo: 'Usuarios',
      accion: 'Created',
      entidad: 'perfiles',
      entidad_id: userId,
      detalle: { email: validated.email, rol: dbRole, sede: validated.sede },
    });

    return jsonResponse({ id: userId, email: validated.email }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno';
    return jsonResponse({ error: message }, 500);
  }
});
