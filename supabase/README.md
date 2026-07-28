# Supabase — PARTEQUIPOS Posventa Inteligente

Scripts SQL para ejecutar **manualmente** en el SQL Editor de Supabase.
La aplicación **no crea** las tablas automáticamente.

## Orden de ejecución SQL

| # | Archivo | Descripción |
|---|---------|-------------|
| 1 | `schema/00_extensions.sql` | Extensiones PostgreSQL |
| 2 | `schema/01_calculadora.sql` | Temparios, matriz frecuencias, cotizaciones |
| 3 | `schema/02_mantenimientos_proyectados.sql` | Telemetría, clientes, asesores, KPIs |
| 4 | `schema/03_cpp.sql` | Catálogo CPP, cotizaciones |
| 5 | `schema/04_shared.sql` | Perfiles, importaciones, auditoría |
| 6 | `schema/05_rls_policies.sql` | Políticas RLS (requiere Auth habilitado) |
| 7 | `schema/06_seed_ejemplo.sql` | Datos de ejemplo (opcional) |
| 8 | `schema/07_auth_trigger.sql` | Trigger perfil al crear usuario Auth |
| 9 | `schema/08_temparios_admin.sql` | Índice legacy_id + SELECT admin (temparios) |
| 10 | `schema/09_seed_admin_user.sql` | Usuario admin@partequipos.com / password123 |
| 11 | `schema/10_temparios_excel_columns.sql` | Columna tipo_catalogo (TipoItem del Excel) |
| 12 | `schema/11_temparios_upsert_legacy.sql` | UNIQUE legacy_id para upsert masivo |

## Dónde ejecutar `supabase functions deploy`

Los comandos **no** se ejecutan en el SQL Editor. Se ejecutan en la **terminal** (PowerShell / CMD / bash) desde la carpeta del proyecto, con la [CLI de Supabase](https://supabase.com/docs/guides/cli).

### 1. Instalar CLI (una sola vez)

```powershell
npm install -g supabase
```

O con Scoop: `scoop install supabase`

### 2. Iniciar sesión y vincular el proyecto

```powershell
cd "c:\Users\Frank Duran\OneDrive - Partequipos S.A.S\Escritorio\PostventaInteligente\project"

supabase login
supabase link --project-ref obhgdgnozeaneljprudd
```

> **Importante:** no uses el texto literal `TU_PROJECT_REF`. Usa tu Reference ID real  
> (ej. `obhgdgnozeaneljprudd`). Está en Dashboard → Project Settings → General.

### 3. Desplegar las Edge Functions

```powershell
supabase functions deploy import-excel
supabase functions deploy send-maintenance-alerts
```

### 4. Verificar

Dashboard → **Edge Functions** → deben aparecer `import-excel` y `send-maintenance-alerts`.

### Cron de alertas

Dashboard → Edge Functions → `send-maintenance-alerts` → **Schedules**:

- Cron: `0 13 * * *` (08:00 Colombia)
- Secrets opcionales: `RESEND_API_KEY`, `ALERT_FROM_EMAIL`

## Auth

1. Habilitar Email/Password en Authentication → Providers
2. Ejecutar `07_auth_trigger.sql`
3. Crear el administrador de pruebas con **una** de estas opciones:

### Opción A — SQL (recomendada)

Ejecutar en SQL Editor el archivo `schema/09_seed_admin_user.sql`.

Credenciales:

- Email: `admin@partequipos.com`
- Password: `password123`
- Rol en `perfiles`: `administrador`

### Opción B — Dashboard

1. Authentication → Users → **Add user** → Email / Password  
   - Email: `admin@partequipos.com`  
   - Password: `password123`  
   - Marcar **Auto Confirm User**
2. Luego en SQL Editor:

```sql
UPDATE public.perfiles
SET rol = 'administrador',
    nombre = 'Administrador PARTEQUIPOS',
    activo = TRUE,
    updated_at = NOW()
WHERE lower(email) = lower('admin@partequipos.com');
```

Si el perfil aún no existe (sin trigger), créalo con el `id` del usuario en Authentication.

## Variables de entorno (frontend / Vercel)

Local (`.env.local`) y en Vercel → Project → Settings → Environment Variables:

```
NEXT_PUBLIC_APP_URL=https://tu-app.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://obhgdgnozeaneljprudd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-public-key
```

## Despliegue en Vercel

```powershell
cd "c:\Users\Frank Duran\OneDrive - Partequipos S.A.S\Escritorio\PostventaInteligente\project"
npx vercel login
npx vercel link
npx vercel env pull   # opcional
npx vercel --prod
```

O en [vercel.com/new](https://vercel.com/new): Import Git Repository → `fradurgo19/postventa-inteligente` → add env vars → Deploy.

Tras el deploy, en Supabase → Authentication → URL Configuration:

- Site URL: `https://tu-app.vercel.app`
- Redirect URLs: `https://tu-app.vercel.app/**`

## Importación Excel / CSV

La Edge Function `import-excel` acepta:

- **`.xlsx`** (Excel moderno)
- **`.xls`** (Excel clásico)
- **`.csv`** (UTF-8)

Lee la **primera hoja** del libro. Columnas deben coincidir con la estructura del módulo:

| Módulo | Tabla destino |
|--------|---------------|
| `calculadora` | `temparios_mantenimiento` |
| `proyectados` | `telemetria_equipos` |
| `cpp` | `cpp_catalogo` |
