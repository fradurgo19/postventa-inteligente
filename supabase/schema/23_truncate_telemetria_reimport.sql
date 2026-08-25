-- ═══════════════════════════════════════════════════════════════════════════════
-- Vaciar telemetría + maestros relacionados y dejar listo para reimportar Excel
-- Orden recomendado:
--   1) 22_telemetria_widen_numerics.sql   (si aún no se ejecutó)
--   2) ESTE script
--   3) Cargar Telemetria.xlsx desde la app (pestaña Importar)
--
-- CASCADE limpia alertas_mantenimiento (FK a telemetria_equipos).
-- No borra importaciones (historial de cargas) ni usuarios.
-- ═══════════════════════════════════════════════════════════════════════════════

TRUNCATE TABLE alertas_mantenimiento RESTART IDENTITY CASCADE;
TRUNCATE TABLE telemetria_equipos RESTART IDENTITY CASCADE;
TRUNCATE TABLE maquinas RESTART IDENTITY CASCADE;
TRUNCATE TABLE sedes RESTART IDENTITY CASCADE;
TRUNCATE TABLE clientes RESTART IDENTITY CASCADE;
TRUNCATE TABLE asesores RESTART IDENTITY CASCADE;

-- Verificación esperada: todos en 0
-- SELECT
--   (SELECT COUNT(*) FROM telemetria_equipos) AS telemetria,
--   (SELECT COUNT(*) FROM maquinas) AS maquinas,
--   (SELECT COUNT(*) FROM clientes) AS clientes,
--   (SELECT COUNT(*) FROM asesores) AS asesores,
--   (SELECT COUNT(*) FROM sedes) AS sedes;
