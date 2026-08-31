-- ═══════════════════════════════════════════════════════════════════════════════
-- 27 · Telemetría: UNIQUE por serie + periodo + tipo MTTO (upsert en reimport)
-- Ejecutar DESPUÉS de 24_telemetria_allow_multi_mtto_mes.sql
--
-- Permite varios MTTOs en el mismo mes (tipo_mtto distinto) y actualiza la misma
-- proyección al reimportar el Excel mensual.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Deduplicar (serie, mes, año, tipo_mtto) conservando el más reciente
DELETE FROM telemetria_equipos a
USING telemetria_equipos b
WHERE a.serie = b.serie
  AND lower(btrim(a.mes_creado)) = lower(btrim(b.mes_creado))
  AND a.anio = b.anio
  AND COALESCE(a.tipo_mtto, -1) = COALESCE(b.tipo_mtto, -1)
  AND a.id <> b.id
  AND COALESCE(a.updated_at, a.created_at) < COALESCE(b.updated_at, b.created_at);

-- Índice único con COALESCE para tratar NULL tipo_mtto como un solo valor
CREATE UNIQUE INDEX IF NOT EXISTS idx_telemetria_serie_periodo_tipo
  ON telemetria_equipos (serie, mes_creado, anio, COALESCE(tipo_mtto, -1));

COMMENT ON INDEX idx_telemetria_serie_periodo_tipo IS
  'Proyección única por máquina, periodo y tipo MTTO. Reimportar actualiza la misma fila.';
