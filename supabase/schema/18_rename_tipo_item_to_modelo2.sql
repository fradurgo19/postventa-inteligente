-- Mantener columna BD como tipo_item (valor = Excel Modelo2)
-- Si se ejecutó el rename a modelo2, lo revierte.
-- Orden con truncate: 17 → 18 → reimportar Excel

-- 1) Revertir rename si existe modelo2 y no tipo_item
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'temparios_mantenimiento'
      AND column_name = 'modelo2'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'temparios_mantenimiento'
      AND column_name = 'tipo_item'
  ) THEN
    ALTER TABLE temparios_mantenimiento RENAME COLUMN modelo2 TO tipo_item;
  END IF;
END $$;

-- 2) Constraint tipo_item (incluye Fluido y Observacion)
ALTER TABLE temparios_mantenimiento
  DROP CONSTRAINT IF EXISTS temparios_mantenimiento_modelo2_check;

ALTER TABLE temparios_mantenimiento
  DROP CONSTRAINT IF EXISTS temparios_mantenimiento_tipo_item_check;

ALTER TABLE temparios_mantenimiento
  ADD CONSTRAINT temparios_mantenimiento_tipo_item_check
  CHECK (
    tipo_item IN (
      'Repuesto',
      'Consumible',
      'Fluido',
      'Actividad',
      'Servicio',
      'Observacion'
    )
  );

DROP INDEX IF EXISTS idx_temparios_modelo2;
CREATE INDEX IF NOT EXISTS idx_temparios_tipo
  ON temparios_mantenimiento (tipo_item);

COMMENT ON COLUMN temparios_mantenimiento.tipo_item IS
  'Clasificación = valor Excel columna Modelo2 (Actividad | Repuesto | Fluido | Observacion)';

COMMENT ON COLUMN temparios_mantenimiento.tipo_catalogo IS
  'Derivado de Modelo2: Repuesto→Filtro | Fluido→Aceite | Actividad | Observacion';

-- 3) Vistas
CREATE OR REPLACE VIEW v_temparios_tipos
WITH (security_invoker = true) AS
SELECT DISTINCT tipo_item
FROM temparios_mantenimiento
WHERE activo = TRUE
  AND tipo_item IS NOT NULL
  AND btrim(tipo_item) <> '';

GRANT SELECT ON v_temparios_tipos TO authenticated, anon;

CREATE OR REPLACE VIEW v_temparios_resumen AS
SELECT
  marca,
  modelo,
  frecuencia_horas,
  tipo_item,
  COUNT(*) AS total_items,
  SUM(cantidad) AS cantidad_total,
  SUM(CASE WHEN tipo_item IN ('Actividad', 'Servicio') THEN tiempo_horas ELSE 0 END) AS horas_mano_obra
FROM temparios_mantenimiento
WHERE activo = TRUE
GROUP BY marca, modelo, frecuencia_horas, tipo_item;

CREATE OR REPLACE VIEW v_insumos_proyectados AS
SELECT
  te.id AS telemetria_id,
  te.serie,
  te.modelo,
  te.marca,
  te.horometro,
  te.fecha_primer_mtto,
  te.sede,
  te.titulo AS cliente,
  tm.tipo_item,
  tm.item,
  tm.cantidad,
  tm.unidad_medida,
  tm.ref_sap_original,
  tm.frecuencia_horas,
  tm.precio_unitario,
  (tm.cantidad * COALESCE(tm.precio_unitario, 0)) AS valor_proyectado
FROM telemetria_equipos te
JOIN temparios_mantenimiento tm
  ON LOWER(tm.marca) = LOWER(te.marca)
 AND LOWER(tm.modelo) = LOWER(te.modelo)
WHERE te.estado NOT IN ('Completado', 'Cancelado')
  AND tm.activo = TRUE;
