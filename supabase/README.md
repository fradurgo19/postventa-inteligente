# Supabase — PARTEQUIPOS Posventa Inteligente

Scripts SQL para ejecutar **manualmente** en el SQL Editor de Supabase.
La aplicación **no crea** las tablas automáticamente.

## Orden de ejecución

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

## Edge Functions

| Función | Uso |
|---------|-----|
| `import-excel` | Procesa CSV e inserta en temparios / telemetría / CPP |
| `send-maintenance-alerts` | Cron diario: alertas 7 días antes del mtto |

```bash
supabase functions deploy import-excel
supabase functions deploy send-maintenance-alerts
```

### Cron de alertas

En Dashboard → Edge Functions → Schedules:

- Función: `send-maintenance-alerts`
- Cron: `0 13 * * *` (08:00 Colombia / UTC-5)
- Secrets opcionales: `RESEND_API_KEY`, `ALERT_FROM_EMAIL`

## Auth

1. Habilitar Email/Password en Authentication → Providers
2. Ejecutar `07_auth_trigger.sql`
3. Crear usuario en Auth y actualizar `perfiles.rol` a `administrador` o `coordinador`

## Variables de entorno (frontend)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Importación CSV

Exportar Excel → **CSV UTF-8**. La Edge Function `import-excel` valida columnas e inserta en:

- `calculadora` → `temparios_mantenimiento`
- `proyectados` → `telemetria_equipos`
- `cpp` → `cpp_catalogo`
