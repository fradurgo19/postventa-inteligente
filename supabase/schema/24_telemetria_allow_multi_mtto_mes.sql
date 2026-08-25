-- ═══════════════════════════════════════════════════════════════════════════════
-- Permitir varios MTTOs preventivos de la misma máquina en el mismo mes/año
-- Ejecutar en SQL Editor DESPUÉS de 22 (si aplica).
--
-- Motivo: equipos de alto uso pueden tener 2+ servicios proyectados en el mismo
-- periodo. El UNIQUE (serie, mes_creado, anio) descartaba ~1900 filas válidas.
--
-- Flota (maquinas.serie) y maestros (clientes/asesores/sedes) siguen únicos.
-- Reimportar: vaciar con 23_truncate_telemetria_reimport.sql y cargar el Excel.
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE telemetria_equipos
  DROP CONSTRAINT IF EXISTS telemetria_serie_mes_anio_uid;

DROP INDEX IF EXISTS idx_telemetria_serie_unique;
DROP INDEX IF EXISTS telemetria_serie_mes_anio_uid;

-- Índices de consulta (sin unique): listados por periodo / máquina
CREATE INDEX IF NOT EXISTS idx_telemetria_periodo
  ON telemetria_equipos (anio, mes_creado);

CREATE INDEX IF NOT EXISTS idx_telemetria_serie_periodo
  ON telemetria_equipos (serie, anio DESC, mes_creado);

CREATE INDEX IF NOT EXISTS idx_telemetria_serie_tipo_mtto
  ON telemetria_equipos (serie, tipo_mtto);

COMMENT ON TABLE telemetria_equipos IS
  'Servicios proyectados de telemetría: varias filas por máquina en el mismo mes/año si hay múltiples MTTOs preventivos. Flota única en maquinas.';
