import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { mapAppRoleToDb } from '@/lib/supabase/auth';
import type { UserRole } from '@/lib/mock-data';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SERVICE_KEY ??
  '';

export function isAdminUserApiConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey && serviceRoleKey);
}

function createServiceRoleClient(): SupabaseClient {
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no está configurada en el servidor.');
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function verifyRequestIsAdministrator(accessToken: string): Promise<string> {
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const {
    data: { user },
    error,
  } = await userClient.auth.getUser();

  if (error || !user) {
    throw new Error('Sesión no válida o expirada.');
  }

  const { data: perfil, error: perfilError } = await userClient
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .maybeSingle();

  if (perfilError) {
    throw new Error(perfilError.message);
  }

  if (perfil?.rol !== 'administrador') {
    throw new Error('Solo administradores pueden crear usuarios.');
  }

  return user.id;
}

export interface CreateAuthUserParams {
  email: string;
  password: string;
  nombre: string;
  rol: UserRole;
  sede?: string | null;
  createdBy: string;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function createAuthUserWithProfile(
  params: CreateAuthUserParams
): Promise<{ id: string; email: string }> {
  const admin = createServiceRoleClient();
  const email = normalizeEmail(params.email);
  const nombre = params.nombre.trim();
  const dbRole = mapAppRoleToDb(params.rol);
  const sede = params.sede?.trim() || null;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: params.password,
    email_confirm: true,
    user_metadata: {
      nombre,
      rol: dbRole,
    },
  });

  if (error || !data.user) {
    throw new Error(error?.message ?? 'No se pudo crear el usuario en Auth.');
  }

  const userId = data.user.id;

  const { error: perfilError } = await admin.from('perfiles').upsert(
    {
      id: userId,
      email,
      nombre,
      rol: dbRole,
      sede,
      activo: true,
    },
    { onConflict: 'id' }
  );

  if (perfilError) {
    throw new Error(perfilError.message);
  }

  await admin.from('auditoria').insert({
    user_id: params.createdBy,
    modulo: 'Usuarios',
    accion: 'Created',
    entidad: 'perfiles',
    entidad_id: userId,
    detalle: { email, rol: dbRole, sede },
  });

  return { id: userId, email };
}
