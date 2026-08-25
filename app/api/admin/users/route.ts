import { NextResponse } from 'next/server';
import type { UserRole } from '@/lib/mock-data';
import {
  createAuthUserWithProfile,
  isAdminUserApiConfigured,
  verifyRequestIsAdministrator,
} from '@/lib/supabase/server-admin';

const VALID_ROLES = new Set<UserRole>([
  'Administrator',
  'Coordinator',
  'Sales Advisor',
  'Technician',
  'Viewer',
]);

interface CreateUserBody {
  email?: string;
  password?: string;
  nombre?: string;
  rol?: UserRole;
  sede?: string | null;
}

function parseBearerToken(request: Request): string | null {
  const header = request.headers.get('authorization') ?? request.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

function validateBody(body: CreateUserBody): {
  email: string;
  password: string;
  nombre: string;
  rol: UserRole;
  sede: string | null;
} | string {
  const email = body.email?.trim() ?? '';
  const password = body.password ?? '';
  const nombre = body.nombre?.trim() ?? '';
  const rol = body.rol ?? 'Viewer';
  const sede = body.sede?.trim() || null;

  if (!email?.includes('@')) {
    return 'Correo electrónico inválido.';
  }
  if (password.length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres.';
  }
  if (!nombre) {
    return 'El nombre es obligatorio.';
  }
  if (!VALID_ROLES.has(rol)) {
    return 'Rol inválido.';
  }

  return { email, password, nombre, rol, sede };
}

export async function POST(request: Request) {
  if (!isAdminUserApiConfigured()) {
    return NextResponse.json(
      {
        error:
          'Creación de usuarios no disponible. Configure SUPABASE_SERVICE_ROLE_KEY en el servidor.',
      },
      { status: 503 }
    );
  }

  const token = parseBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Token de sesión requerido.' }, { status: 401 });
  }

  let createdBy: string;
  try {
    createdBy = await verifyRequestIsAdministrator(token);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No autorizado';
    const status = message.includes('administradores') ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }

  let body: CreateUserBody;
  try {
    body = (await request.json()) as CreateUserBody;
  } catch {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido.' }, { status: 400 });
  }

  const validated = validateBody(body);
  if (typeof validated === 'string') {
    return NextResponse.json({ error: validated }, { status: 400 });
  }

  try {
    const created = await createAuthUserWithProfile({
      ...validated,
      createdBy,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo crear el usuario';
    const status = /already|registered|exists|duplicate/i.test(message) ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
