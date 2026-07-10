import type { User, UserRole } from '@/lib/mock-data';
import { DEFAULT_USER } from '@/lib/mock-data';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

const ROLE_MAP: Record<string, UserRole> = {
  administrador: 'Administrator',
  coordinador: 'Coordinator',
  asesor_comercial: 'Sales Advisor',
  tecnico: 'Technician',
  visualizador: 'Viewer',
};

export function mapDbRoleToApp(rol: string | null | undefined): UserRole {
  if (!rol) return 'Viewer';
  return ROLE_MAP[rol.toLowerCase()] ?? 'Viewer';
}

export function mapAppRoleToDb(role: UserRole): string {
  const reverse: Record<UserRole, string> = {
    Administrator: 'administrador',
    Coordinator: 'coordinador',
    'Sales Advisor': 'asesor_comercial',
    Technician: 'tecnico',
    Viewer: 'visualizador',
  };
  return reverse[role];
}

interface PerfilRow {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  sede?: string | null;
  activo?: boolean;
}

export async function fetchProfileAsUser(userId: string, emailFallback: string): Promise<User> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('perfiles')
    .select('id, email, nombre, rol, sede, activo')
    .eq('id', userId)
    .maybeSingle();

  const perfil = data as PerfilRow | null;
  if (!perfil) {
    return {
      ...DEFAULT_USER,
      id: userId,
      email: emailFallback,
      name: emailFallback.split('@')[0],
      role: 'Viewer',
      permissions: DEFAULT_USER.permissions,
    };
  }

  const role = mapDbRoleToApp(perfil.rol);

  return {
    id: perfil.id,
    name: perfil.nombre,
    email: perfil.email || emailFallback,
    role,
    avatar: perfil.nombre
      .split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase(),
    phone: '',
    department: perfil.sede ?? 'Posventa',
    isActive: perfil.activo ?? true,
    lastLogin: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    permissions: DEFAULT_USER.permissions,
  };
}

export interface AuthResult {
  user: User;
  sessionExists: boolean;
}

/**
 * Login con Supabase Auth. Si Supabase no está configurado, usa mock local.
 */
export async function signInWithPassword(
  email: string,
  password: string
): Promise<AuthResult> {
  if (!isSupabaseConfigured()) {
    const { USERS } = await import('@/lib/mock-data');
    const found =
      email === 'admin@partequipos.com' && password === 'password123'
        ? USERS[0]
        : USERS.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? DEFAULT_USER;

    return { user: found, sessionExists: true };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    throw new Error(error?.message ?? 'Credenciales inválidas');
  }

  const user = await fetchProfileAsUser(data.user.id, data.user.email ?? email);
  return { user, sessionExists: Boolean(data.session) };
}

export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabaseClient();
  await supabase.auth.signOut();
}

export async function getSessionUser(): Promise<User | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) return null;

  return fetchProfileAsUser(
    data.session.user.id,
    data.session.user.email ?? ''
  );
}
