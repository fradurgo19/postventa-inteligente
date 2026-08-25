import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { mapDbRoleToApp, mapAppRoleToDb } from '@/lib/supabase/auth';
import type { UserRole } from '@/lib/mock-data';
import {
  cloneDefaultModuleAccess,
  enforceAdministratorFullAccess,
  normalizeModuleAccessMatrix,
  type ModuleAccessMatrix,
} from '@/lib/admin/module-access';

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  dbRole: string;
  status: 'active' | 'inactive';
  lastLogin: string;
  avatar: string;
  sede: string | null;
  /** Si el email coincide con tabla asesores (telemetría). */
  linkedAsesorId: string | null;
  clientesRelacionados: number;
  equiposRelacionados: number;
}

export interface AdminClienteRow {
  id: string;
  titulo: string;
  nit: string | null;
  email: string | null;
  telefono: string | null;
  ciudad: string | null;
  equipos: number;
}

export interface AdminMaquinaRow {
  id: string;
  serie: string;
  marca: string;
  modelo: string;
  tipo_maquina: string | null;
  cliente: string | null;
  cliente_id: string | null;
  sede: string | null;
  sede_id: string | null;
  activo: boolean;
}

export interface AdminSedeOption {
  id: string;
  nombre: string;
}

export interface AsesorInput {
  nombre: string;
  email: string;
  sede?: string | null;
  activo?: boolean;
}

export interface ClienteInput {
  titulo: string;
  nit?: string | null;
  email?: string | null;
  telefono?: string | null;
  ciudad?: string | null;
}

export interface MaquinaInput {
  serie: string;
  marca: string;
  modelo: string;
  tipo_maquina?: string | null;
  cliente_id?: string | null;
  sede_id?: string | null;
  activo?: boolean;
}

export interface AdminAsesorRow {
  id: string;
  nombre: string;
  email: string;
  sede: string | null;
  activo: boolean;
  clientes: number;
  equipos: number;
  oportunidades: number;
}

export interface AdminImportRow {
  id: string;
  modulo: string;
  typeLabel: string;
  file: string;
  rows: number;
  status: 'success' | 'error' | 'warning' | 'processing';
  date: string;
  user: string;
}

export interface AdminDomainSummary {
  clientes: number;
  asesores: number;
  maquinas: number;
  telemetria: number;
  usuarios: number;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';
}

function moduloToTypeLabel(modulo: string): string {
  switch (modulo) {
    case 'proyectados':
      return 'Cronograma / Telemetría';
    case 'calculadora':
      return 'Temparios';
    case 'cpp':
      return 'Repuestos CPP';
    default:
      return modulo;
  }
}

function mapImportEstado(estado: string): AdminImportRow['status'] {
  switch (estado) {
    case 'completado':
    case 'ok':
      return 'success';
    case 'parcial':
      return 'warning';
    case 'procesando':
      return 'processing';
    default:
      return 'error';
  }
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export async function fetchAdminDomainSummary(): Promise<AdminDomainSummary> {
  if (!isSupabaseConfigured()) {
    return { clientes: 0, asesores: 0, maquinas: 0, telemetria: 0, usuarios: 0 };
  }
  const supabase = getSupabaseClient();

  const [clientes, asesores, maquinas, telemetria, usuarios] = await Promise.all([
    supabase.from('clientes').select('id', { count: 'exact', head: true }),
    supabase.from('asesores').select('id', { count: 'exact', head: true }),
    supabase.from('maquinas').select('id', { count: 'exact', head: true }),
    supabase.from('telemetria_equipos').select('id', { count: 'exact', head: true }),
    supabase.from('perfiles').select('id', { count: 'exact', head: true }),
  ]);

  return {
    clientes: clientes.count ?? 0,
    asesores: asesores.count ?? 0,
    maquinas: maquinas.count ?? 0,
    telemetria: telemetria.count ?? 0,
    usuarios: usuarios.count ?? 0,
  };
}

export async function fetchAdminUsers(): Promise<AdminUserRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = getSupabaseClient();
  type PerfilAdminRow = {
    id: string;
    email: string;
    nombre: string;
    rol: string;
    sede: string | null;
    activo: boolean;
    updated_at: string;
    created_at: string;
    ultimo_acceso?: string | null;
  };

  let perfiles: PerfilAdminRow[] | null = null;
  const first = await supabase
    .from('perfiles')
    .select('id, email, nombre, rol, sede, activo, updated_at, created_at, ultimo_acceso')
    .order('nombre');

  if (first.error && /ultimo_acceso/i.test(first.error.message)) {
    const fallback = await supabase
      .from('perfiles')
      .select('id, email, nombre, rol, sede, activo, updated_at, created_at')
      .order('nombre');
    if (fallback.error) throw new Error(fallback.error.message);
    perfiles = (fallback.data ?? []) as PerfilAdminRow[];
  } else if (first.error) {
    throw new Error(first.error.message);
  } else {
    perfiles = (first.data ?? []) as PerfilAdminRow[];
  }

  const { data: asesores } = await supabase.from('asesores').select('id, email');
  const asesorByEmail = new Map(
    (asesores ?? []).map((a) => [String(a.email).toLowerCase(), a.id as string])
  );

  const { data: telemetria } = await supabase
    .from('telemetria_equipos')
    .select('asesor_email, cliente_id, serie');

  const clientesByAsesor = new Map<string, Set<string>>();
  const equiposByAsesor = new Map<string, Set<string>>();

  for (const t of telemetria ?? []) {
    const email = String(t.asesor_email ?? '').toLowerCase();
    if (!email) continue;
    if (!clientesByAsesor.has(email)) clientesByAsesor.set(email, new Set());
    if (!equiposByAsesor.has(email)) equiposByAsesor.set(email, new Set());
    if (t.cliente_id) clientesByAsesor.get(email)!.add(String(t.cliente_id));
    if (t.serie) equiposByAsesor.get(email)!.add(String(t.serie));
  }

  return (perfiles ?? []).map((p) => {
    const email = String(p.email ?? '').toLowerCase();
    const role = mapDbRoleToApp(p.rol);
    return {
      id: p.id as string,
      name: String(p.nombre ?? email),
      email: String(p.email ?? ''),
      role,
      dbRole: String(p.rol ?? 'visualizador'),
      status: p.activo === false ? 'inactive' : 'active',
      lastLogin: formatDateTime(
        (p.ultimo_acceso as string) ||
          (p.updated_at as string) ||
          (p.created_at as string)
      ),
      avatar: initials(String(p.nombre ?? email)),
      sede: (p.sede as string) ?? null,
      linkedAsesorId: asesorByEmail.get(email) ?? null,
      clientesRelacionados: clientesByAsesor.get(email)?.size ?? 0,
      equiposRelacionados: equiposByAsesor.get(email)?.size ?? 0,
    };
  });
}

export async function fetchAdminAsesores(): Promise<AdminAsesorRow[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseClient();

  const { data: asesores, error } = await supabase
    .from('asesores')
    .select('id, nombre, email, sede, activo')
    .order('nombre');

  if (error) throw new Error(error.message);

  const { data: telemetria } = await supabase
    .from('telemetria_equipos')
    .select('asesor_email, cliente_id, serie, id');

  return (asesores ?? []).map((a) => {
    const email = String(a.email).toLowerCase();
    const rows = (telemetria ?? []).filter(
      (t) => String(t.asesor_email ?? '').toLowerCase() === email
    );
    const clientes = new Set(rows.map((r) => r.cliente_id).filter(Boolean));
    const equipos = new Set(rows.map((r) => r.serie).filter(Boolean));
    return {
      id: a.id as string,
      nombre: String(a.nombre),
      email: String(a.email),
      sede: (a.sede as string) ?? null,
      activo: a.activo !== false,
      clientes: clientes.size,
      equipos: equipos.size,
      oportunidades: rows.length,
    };
  });
}

export async function fetchAdminClientes(limit = 50): Promise<AdminClienteRow[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseClient();

  const { data: clientes, error } = await supabase
    .from('clientes')
    .select('id, titulo, nit, email, telefono, ciudad')
    .order('titulo')
    .limit(limit);

  if (error) throw new Error(error.message);

  const ids = (clientes ?? []).map((c) => c.id as string);
  const countByCliente = new Map<string, number>();

  if (ids.length > 0) {
    const { data: maquinas } = await supabase
      .from('maquinas')
      .select('cliente_id')
      .in('cliente_id', ids);

    for (const m of maquinas ?? []) {
      const cid = String(m.cliente_id ?? '');
      if (!cid) continue;
      countByCliente.set(cid, (countByCliente.get(cid) ?? 0) + 1);
    }
  }

  return (clientes ?? []).map((c) => ({
    id: c.id as string,
    titulo: String(c.titulo),
    nit: (c.nit as string) ?? null,
    email: (c.email as string) ?? null,
    telefono: (c.telefono as string) ?? null,
    ciudad: (c.ciudad as string) ?? null,
    equipos: countByCliente.get(c.id as string) ?? 0,
  }));
}

export async function fetchAdminMaquinas(limit = 50): Promise<AdminMaquinaRow[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('maquinas')
    .select('id, serie, marca, modelo, tipo_maquina, cliente_id, sede_id, activo, clientes(titulo), sedes(nombre)')
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    // Join puede fallar si no existe tabla; fallback simple
    const { data: plain, error: plainErr } = await supabase
      .from('maquinas')
      .select('id, serie, marca, modelo, tipo_maquina, cliente_id, sede_id, activo')
      .order('updated_at', { ascending: false })
      .limit(limit);
    if (plainErr) throw new Error(plainErr.message);

    const clienteIds = Array.from(
      new Set((plain ?? []).map((m) => m.cliente_id).filter(Boolean))
    ) as string[];
    const tituloById = new Map<string, string>();
    if (clienteIds.length) {
      const { data: clientes } = await supabase
        .from('clientes')
        .select('id, titulo')
        .in('id', clienteIds);
      for (const c of clientes ?? []) tituloById.set(c.id as string, String(c.titulo));
    }

    return (plain ?? []).map((m) => ({
      id: m.id as string,
      serie: String(m.serie),
      marca: String(m.marca),
      modelo: String(m.modelo),
      tipo_maquina: (m.tipo_maquina as string) ?? null,
      cliente: m.cliente_id ? tituloById.get(m.cliente_id as string) ?? null : null,
      cliente_id: (m.cliente_id as string) ?? null,
      sede: null,
      sede_id: null,
      activo: m.activo !== false,
    }));
  }

  return (data ?? []).map((m) => {
    const clienteJoin = m.clientes as { titulo?: string } | { titulo?: string }[] | null;
    const sedeJoin = m.sedes as { nombre?: string } | { nombre?: string }[] | null;
    const clienteTitulo = Array.isArray(clienteJoin)
      ? clienteJoin[0]?.titulo
      : clienteJoin?.titulo;
    const sedeNombre = Array.isArray(sedeJoin) ? sedeJoin[0]?.nombre : sedeJoin?.nombre;

    return {
      id: m.id as string,
      serie: String(m.serie),
      marca: String(m.marca),
      modelo: String(m.modelo),
      tipo_maquina: (m.tipo_maquina as string) ?? null,
      cliente: clienteTitulo ?? null,
      cliente_id: (m.cliente_id as string) ?? null,
      sede: sedeNombre ?? null,
      sede_id: (m.sede_id as string) ?? null,
      activo: m.activo !== false,
    };
  });
}

export async function fetchAdminSedes(): Promise<AdminSedeOption[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('sedes').select('id, nombre').order('nombre');
  if (error) {
    if (/sedes|relation|does not exist/i.test(error.message)) return [];
    throw new Error(error.message);
  }
  return (data ?? []).map((s) => ({ id: s.id as string, nombre: String(s.nombre) }));
}

export async function createAsesor(input: AsesorInput): Promise<string> {
  const supabase = getSupabaseClient();
  const email = input.email.trim().toLowerCase();
  const { data, error } = await supabase
    .from('asesores')
    .insert({
      nombre: input.nombre.trim(),
      email,
      sede: input.sede?.trim() || null,
      activo: input.activo !== false,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  const id = data.id as string;
  await writeAudit({
    modulo: 'Importaciones',
    accion: 'Created',
    entidad: 'asesores',
    entidadId: id,
    detalle: { email },
  });
  return id;
}

export async function updateAsesor(id: string, input: Partial<AsesorInput>): Promise<void> {
  const supabase = getSupabaseClient();
  const payload: Record<string, unknown> = {};
  if (input.nombre != null) payload.nombre = input.nombre.trim();
  if (input.email != null) payload.email = input.email.trim().toLowerCase();
  if (input.sede !== undefined) payload.sede = input.sede?.trim() || null;
  if (input.activo != null) payload.activo = input.activo;

  const { error } = await supabase.from('asesores').update(payload).eq('id', id);
  if (error) throw new Error(error.message);
  await writeAudit({
    modulo: 'Importaciones',
    accion: 'Updated',
    entidad: 'asesores',
    entidadId: id,
    detalle: payload,
  });
}

export async function createCliente(input: ClienteInput): Promise<string> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('clientes')
    .insert({
      titulo: input.titulo.trim(),
      nit: input.nit?.trim() || null,
      email: input.email?.trim() || null,
      telefono: input.telefono?.trim() || null,
      ciudad: input.ciudad?.trim() || null,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  const id = data.id as string;
  await writeAudit({
    modulo: 'Importaciones',
    accion: 'Created',
    entidad: 'clientes',
    entidadId: id,
    detalle: { titulo: input.titulo },
  });
  return id;
}

export async function updateCliente(id: string, input: Partial<ClienteInput>): Promise<void> {
  const supabase = getSupabaseClient();
  const payload: Record<string, unknown> = {};
  if (input.titulo != null) payload.titulo = input.titulo.trim();
  if (input.nit !== undefined) payload.nit = input.nit?.trim() || null;
  if (input.email !== undefined) payload.email = input.email?.trim() || null;
  if (input.telefono !== undefined) payload.telefono = input.telefono?.trim() || null;
  if (input.ciudad !== undefined) payload.ciudad = input.ciudad?.trim() || null;

  const { error } = await supabase.from('clientes').update(payload).eq('id', id);
  if (error) throw new Error(error.message);
  await writeAudit({
    modulo: 'Importaciones',
    accion: 'Updated',
    entidad: 'clientes',
    entidadId: id,
    detalle: payload,
  });
}

export async function createMaquina(input: MaquinaInput): Promise<string> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('maquinas')
    .insert({
      serie: input.serie.trim(),
      marca: input.marca.trim(),
      modelo: input.modelo.trim(),
      tipo_maquina: input.tipo_maquina?.trim() || null,
      cliente_id: input.cliente_id || null,
      sede_id: input.sede_id || null,
      activo: input.activo !== false,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  const id = data.id as string;
  await writeAudit({
    modulo: 'Importaciones',
    accion: 'Created',
    entidad: 'maquinas',
    entidadId: id,
    detalle: { serie: input.serie },
  });
  return id;
}

export async function updateMaquina(id: string, input: Partial<MaquinaInput>): Promise<void> {
  const supabase = getSupabaseClient();
  const payload: Record<string, unknown> = {};
  if (input.serie != null) payload.serie = input.serie.trim();
  if (input.marca != null) payload.marca = input.marca.trim();
  if (input.modelo != null) payload.modelo = input.modelo.trim();
  if (input.tipo_maquina !== undefined) payload.tipo_maquina = input.tipo_maquina?.trim() || null;
  if (input.cliente_id !== undefined) payload.cliente_id = input.cliente_id || null;
  if (input.sede_id !== undefined) payload.sede_id = input.sede_id || null;
  if (input.activo != null) payload.activo = input.activo;

  const { error } = await supabase.from('maquinas').update(payload).eq('id', id);
  if (error) throw new Error(error.message);
  await writeAudit({
    modulo: 'Importaciones',
    accion: 'Updated',
    entidad: 'maquinas',
    entidadId: id,
    detalle: payload,
  });
}

export async function fetchAdminImportaciones(limit = 30): Promise<AdminImportRow[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('importaciones')
    .select('id, modulo, nombre_archivo, registros_ok, registros_total, estado, created_at, user_id')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  const userIds = Array.from(
    new Set((data ?? []).map((r) => r.user_id).filter(Boolean))
  ) as string[];

  const nameById = new Map<string, string>();
  if (userIds.length) {
    const { data: perfiles } = await supabase
      .from('perfiles')
      .select('id, nombre, email')
      .in('id', userIds);
    for (const p of perfiles ?? []) {
      nameById.set(p.id as string, String(p.nombre || p.email));
    }
  }

  return (data ?? []).map((r) => ({
    id: String(r.id).slice(0, 8).toUpperCase(),
    modulo: String(r.modulo),
    typeLabel: moduloToTypeLabel(String(r.modulo)),
    file: String(r.nombre_archivo),
    rows: Number(r.registros_ok ?? r.registros_total ?? 0),
    status: mapImportEstado(String(r.estado)),
    date: formatDateTime(r.created_at as string),
    user: r.user_id ? nameById.get(r.user_id as string) ?? '—' : '—',
  }));
}

export async function setPerfilActivo(id: string, activo: boolean): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('perfiles').update({ activo }).eq('id', id);
  if (error) throw new Error(error.message);
  await writeAudit({
    modulo: 'Usuarios',
    accion: activo ? 'Updated' : 'Updated',
    entidad: 'perfiles',
    entidadId: id,
    detalle: { campo: 'activo', valor: activo },
  });
}

export interface AdminPerfilUpdate {
  nombre?: string;
  rol?: UserRole;
  sede?: string | null;
  activo?: boolean;
}

export interface CreateAdminUserInput {
  email: string;
  password: string;
  nombre: string;
  rol: UserRole;
  sede?: string | null;
}

export async function createAdminUser(input: CreateAdminUserInput): Promise<{ id: string }> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase no configurado.');
  }

  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Sesión no válida. Inicie sesión nuevamente.');
  }

  const response = await fetch('/api/admin/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      email: input.email.trim(),
      password: input.password,
      nombre: input.nombre.trim(),
      rol: input.rol,
      sede: input.sede?.trim() || null,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as { error?: string; id?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? 'No se pudo crear el usuario.');
  }

  return { id: payload.id ?? '' };
}

export async function updatePerfil(id: string, patch: AdminPerfilUpdate): Promise<void> {
  const supabase = getSupabaseClient();
  const payload: Record<string, unknown> = {};
  if (patch.nombre != null) payload.nombre = patch.nombre.trim();
  if (patch.sede !== undefined) payload.sede = patch.sede;
  if (patch.activo != null) payload.activo = patch.activo;
  if (patch.rol) {
    payload.rol = mapAppRoleToDb(patch.rol);
  }

  const { error } = await supabase.from('perfiles').update(payload).eq('id', id);
  if (error) throw new Error(error.message);

  await writeAudit({
    modulo: 'Usuarios',
    accion: 'Updated',
    entidad: 'perfiles',
    entidadId: id,
    detalle: payload,
  });
}

export interface AdminRoleSummary {
  id: string;
  dbRole: string;
  appRole: UserRole;
  name: string;
  description: string;
  userCount: number;
  capabilities: string[];
}

export async function fetchModuleAccessMatrix(): Promise<ModuleAccessMatrix> {
  if (!isSupabaseConfigured()) return cloneDefaultModuleAccess();

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('configuracion_sistema')
    .select('module_access')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    if (/module_access|column|does not exist/i.test(error.message)) {
      return cloneDefaultModuleAccess();
    }
    throw new Error(error.message);
  }

  if (!data?.module_access) return cloneDefaultModuleAccess();
  return normalizeModuleAccessMatrix(data.module_access);
}

export async function saveModuleAccessMatrix(matrix: ModuleAccessMatrix): Promise<void> {
  const normalized = enforceAdministratorFullAccess(normalizeModuleAccessMatrix(matrix));
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('configuracion_sistema')
    .update({
      module_access: normalized,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1);

  if (error) throw new Error(error.message);

  await writeAudit({
    modulo: 'Permisos',
    accion: 'Updated',
    entidad: 'configuracion_sistema',
    entidadId: 'module_access',
    detalle: { modules: Object.keys(normalized) },
  });
}

export async function fetchAdminRoleSummaries(): Promise<AdminRoleSummary[]> {
  const { ROLE_CATALOG, PERM_CAPABILITIES } = await import('@/lib/admin/role-catalog');

  if (!isSupabaseConfigured()) {
    return ROLE_CATALOG.map((r) => ({
      ...r,
      userCount: 0,
      capabilities: PERM_CAPABILITIES[r.appRole],
    }));
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('perfiles').select('rol');
  if (error) throw new Error(error.message);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const rol = String(row.rol ?? 'visualizador');
    counts.set(rol, (counts.get(rol) ?? 0) + 1);
  }

  return ROLE_CATALOG.map((r) => ({
    ...r,
    userCount: counts.get(r.dbRole) ?? 0,
    capabilities: PERM_CAPABILITIES[r.appRole],
  }));
}

export interface SystemConfig {
  empresa_nombre: string;
  nit: string;
  telefono: string;
  direccion: string;
  email_corporativo: string;
  moneda: string;
  idioma: string;
  zona_horaria: string;
  iva_porcentaje: number;
  dias_credito: number;
}

const DEFAULT_CONFIG: SystemConfig = {
  empresa_nombre: 'PARTEQUIPOS MAQUINARIA',
  nit: '900.123.456-7',
  telefono: '+57 601 234 5678',
  direccion: 'Cra. 7 #32-16, Bogotá D.C., Colombia',
  email_corporativo: 'info@partequipos.com',
  moneda: 'COP',
  idioma: 'es',
  zona_horaria: 'America/Bogota',
  iva_porcentaje: 19,
  dias_credito: 30,
};

export async function fetchSystemConfig(): Promise<SystemConfig> {
  if (!isSupabaseConfigured()) return { ...DEFAULT_CONFIG };

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('configuracion_sistema')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error || !data) {
    // Tabla aún no creada (SQL 20): devolver defaults
    return { ...DEFAULT_CONFIG };
  }

  return {
    empresa_nombre: String(data.empresa_nombre ?? DEFAULT_CONFIG.empresa_nombre),
    nit: String(data.nit ?? DEFAULT_CONFIG.nit),
    telefono: String(data.telefono ?? DEFAULT_CONFIG.telefono),
    direccion: String(data.direccion ?? DEFAULT_CONFIG.direccion),
    email_corporativo: String(data.email_corporativo ?? DEFAULT_CONFIG.email_corporativo),
    moneda: String(data.moneda ?? DEFAULT_CONFIG.moneda),
    idioma: String(data.idioma ?? DEFAULT_CONFIG.idioma),
    zona_horaria: String(data.zona_horaria ?? DEFAULT_CONFIG.zona_horaria),
    iva_porcentaje: Number(data.iva_porcentaje ?? DEFAULT_CONFIG.iva_porcentaje),
    dias_credito: Number(data.dias_credito ?? DEFAULT_CONFIG.dias_credito),
  };
}

export async function saveSystemConfig(
  config: SystemConfig,
  updatedBy: string
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('configuracion_sistema').upsert(
    {
      id: 1,
      ...config,
      updated_by: updatedBy,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
  if (error) throw new Error(error.message);

  await writeAudit({
    modulo: 'Configuración',
    accion: 'Updated',
    entidad: 'configuracion_sistema',
    entidadId: '1',
    detalle: { ...config },
  });
}

export interface AdminAuditRow {
  id: string;
  timestamp: string;
  user: string;
  action: 'Created' | 'Updated' | 'Deleted' | string;
  module: string;
  record: string;
  fields: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  ip: string;
}

export interface AuditQuery {
  from?: string;
  to?: string;
  search?: string;
  limit?: number;
}

function inferLevel(accion: string): AdminAuditRow['level'] {
  const a = accion.toLowerCase();
  if (a.includes('delete') || a.includes('elimin') || a.includes('error')) return 'ERROR';
  if (a.includes('update') || a.includes('warn') || a.includes('desactiv')) return 'WARN';
  return 'INFO';
}

function detailToFields(detalle: unknown): string {
  if (detalle == null) return '—';
  if (typeof detalle === 'string') return detalle;
  try {
    return JSON.stringify(detalle);
  } catch {
    return '—';
  }
}

export async function fetchAuditoria(query: AuditQuery = {}): Promise<AdminAuditRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = getSupabaseClient();
  let q = supabase
    .from('auditoria')
    .select('id, user_id, modulo, accion, entidad, entidad_id, detalle, ip_address, created_at')
    .order('created_at', { ascending: false })
    .limit(Math.min(200, query.limit ?? 100));

  if (query.from) q = q.gte('created_at', `${query.from}T00:00:00`);
  if (query.to) q = q.lte('created_at', `${query.to}T23:59:59`);

  const { data, error } = await q;
  if (error) {
    // Tabla sin RLS o vacía
    if (/auditoria|permission|policy/i.test(error.message)) return [];
    throw new Error(error.message);
  }

  const userIds = Array.from(
    new Set((data ?? []).map((r) => r.user_id).filter(Boolean))
  ) as string[];
  const nameById = new Map<string, string>();
  if (userIds.length) {
    const { data: perfiles } = await supabase
      .from('perfiles')
      .select('id, nombre, email')
      .in('id', userIds);
    for (const p of perfiles ?? []) {
      nameById.set(p.id as string, String(p.nombre || p.email));
    }
  }

  const search = (query.search ?? '').trim().toLowerCase();

  return (data ?? [])
    .map((r) => {
      const action = String(r.accion || 'Updated');
      const row: AdminAuditRow = {
        id: String(r.id).slice(0, 8).toUpperCase(),
        timestamp: formatDateTime(r.created_at as string),
        user: r.user_id ? nameById.get(r.user_id as string) ?? '—' : 'sistema',
        action,
        module: String(r.modulo ?? '—'),
        record: String(r.entidad_id || r.entidad || '—'),
        fields: detailToFields(r.detalle),
        level: inferLevel(action),
        ip: r.ip_address ? String(r.ip_address) : '—',
      };
      return row;
    })
    .filter((row) => {
      if (!search) return true;
      return [row.user, row.module, row.record, row.fields, row.action]
        .join(' ')
        .toLowerCase()
        .includes(search);
    });
}

export async function writeAudit(input: {
  modulo: string;
  accion: string;
  entidad?: string;
  entidadId?: string;
  detalle?: Record<string, unknown>;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const supabase = getSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from('auditoria').insert({
      user_id: user?.id ?? null,
      modulo: input.modulo,
      accion: input.accion,
      entidad: input.entidad ?? null,
      entidad_id: input.entidadId ?? null,
      detalle: input.detalle ?? {},
    });
  } catch {
    // No bloquear flujo de negocio si falla auditoría
  }
}
