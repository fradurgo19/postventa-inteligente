-- ═══════════════════════════════════════════════════════════════════════════════
-- 28 · Recuperación ÚNICA tras borrado accidental del script 27 (con DELETE)
--
-- ⚠️ NO ejecutar cada mes. Solo una vez para recuperar el histórico (~5153).
--
-- Flujo normal mensual:
--   Subir el Excel del mes (~300 filas) desde la app → se AGREGAN a lo existente.
--   No vaciar telemetria_equipos.
--
-- Este script vacía SOLO telemetría + alertas (no clientes / asesores / máquinas).
-- Luego reimporte UNA VEZ el Excel histórico completo.
-- ═══════════════════════════════════════════════════════════════════════════════

TRUNCATE TABLE alertas_mantenimiento RESTART IDENTITY CASCADE;
TRUNCATE TABLE telemetria_equipos RESTART IDENTITY CASCADE;

-- Verificación (debe dar 0 antes de reimportar):
-- SELECT COUNT(*) AS telemetria FROM telemetria_equipos;
