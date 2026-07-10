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
3. Crear usuario en Auth y actualizar `perfiles.rol` a `administrador` o `coordinador`

## Variables de entorno (frontend)

Crear `.env.local` en la raíz del proyecto:

```
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

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
