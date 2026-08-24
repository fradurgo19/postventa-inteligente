-- ═══════════════════════════════════════════════════════════════════════════════
-- Telemetría: proyecciones por máquina + mes + año (no UNIQUE solo por serie)
-- Ejecutar en SQL Editor DESPUÉS de 19_telemetria_normalize_relations.sql
--
-- - clientes / asesores / maquinas / sedes: siguen únicos (NIT, email, serie, nombre)
-- - telemetria_equipos: misma máquina puede tener filas de distintos meses/años
--   (servicios proyectados). Reimportar el mismo mes actualiza esa proyección.
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1) Quitar UNIQUE solo por serie (sobreescribía meses anteriores)
DROP INDEX IF EXISTS idx_telemetria_serie_unique;

-- 2) Completar mes/año faltantes desde created_at (inglés, alineado a Power Apps MesCreado)
UPDATE telemetria_equipos
SET
  anio = COALESCE(anio, EXTRACT(YEAR FROM (created_at AT TIME ZONE 'America/Bogota'))::INTEGER),
  mes_creado = COALESCE(
    NULLIF(btrim(mes_creado), ''),
    (ARRAY[
      'January','February','March','April','May','June',
      'July','August','September','October','November','December'
    ])[EXTRACT(MONTH FROM (created_at AT TIME ZONE 'America/Bogota'))::INTEGER]
  )
WHERE anio IS NULL
   OR mes_creado IS NULL
   OR btrim(mes_creado) = '';

-- 3) Deduplicar mismo (serie, mes, año) conservando el más reciente
DELETE FROM telemetria_equipos a
USING telemetria_equipos b
WHERE a.serie = b.serie
  AND lower(btrim(a.mes_creado)) = lower(btrim(b.mes_creado))
  AND a.anio = b.anio
  AND a.id <> b.id
  AND COALESCE(a.updated_at, a.created_at) < COALESCE(b.updated_at, b.created_at);

-- 4) Normalizar mes a Title Case para coincidir en upsert
UPDATE telemetria_equipos
SET mes_creado = initcap(lower(btrim(mes_creado)))
WHERE mes_creado IS NOT NULL;

-- 5) Unique compuesto: una proyección por máquina y periodo
ALTER TABLE telemetria_equipos
  ALTER COLUMN mes_creado SET NOT NULL,
  ALTER COLUMN anio SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'telemetria_serie_mes_anio_uid'
  ) THEN
    ALTER TABLE telemetria_equipos
      ADD CONSTRAINT telemetria_serie_mes_anio_uid
      UNIQUE (serie, mes_creado, anio);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_telemetria_periodo
  ON telemetria_equipos (anio, mes_creado);

CREATE INDEX IF NOT EXISTS idx_telemetria_serie_periodo
  ON telemetria_equipos (serie, anio DESC, mes_creado);

COMMENT ON CONSTRAINT telemetria_serie_mes_anio_uid ON telemetria_equipos IS
  'Proyección mensual: misma serie en otro mes/año = nuevo servicio proyectado; mismo periodo = update.';

COMMENT ON TABLE telemetria_equipos IS
  'Servicios proyectados de telemetría por máquina y periodo (mes_creado + anio). Flota única en maquinas.';
