-- ═══════════════════════════════════════════════════════════════════════════════
-- 27 · Telemetría: permitir varios MTTOs iguales en el mismo mes
-- Ejecutar DESPUÉS de 24_telemetria_allow_multi_mtto_mes.sql
--
-- IMPORTANTE: este script NO elimina filas de telemetria_equipos.
-- Una misma máquina puede tener varios servicios 250 h (u otro tipo) en el mismo
-- mes; todas las filas del Excel deben conservarse.
--
-- Si una versión anterior del 27 borró registros, reimporte el Excel de telemetría
-- (Administración → Importaciones) para recuperar el total (~5153).
-- ═══════════════════════════════════════════════════════════════════════════════

-- Quitar índices únicos que colapsaban / impedían varios MTTOs del mismo tipo
DROP INDEX IF EXISTS idx_telemetria_serie_periodo_tipo;
DROP INDEX IF EXISTS idx_telemetria_oportunidad_uid;

-- Normalizar mes (Title Case) — solo UPDATE de texto, sin borrar filas
UPDATE telemetria_equipos
SET mes_creado = initcap(lower(btrim(mes_creado)))
WHERE mes_creado IS NOT NULL
  AND btrim(mes_creado) <> '';

-- Índices de consulta (NO únicos)
CREATE INDEX IF NOT EXISTS idx_telemetria_serie_tipo_mtto
  ON telemetria_equipos (serie, tipo_mtto);

CREATE INDEX IF NOT EXISTS idx_telemetria_serie_periodo_fecha
  ON telemetria_equipos (serie, anio, mes_creado, fecha_primer_mtto);

COMMENT ON TABLE telemetria_equipos IS
  'Servicios proyectados de telemetría: varias filas por máquina/mes (varios MTTOs del mismo tipo permitidos). Sin UNIQUE que colapse oportunidades.';
