-- ═══════════════════════════════════════════════════════════════════════════════
-- Ampliar precisión NUMERIC en telemetria_equipos (evita "numeric field overflow")
-- Ejecutar en SQL Editor ANTES de reimportar Telemetria.xlsx
--
-- Nota: PostgreSQL no permite ALTER TYPE si una vista usa la columna.
-- Por eso se dropean las vistas dependientes, se altera y se recrean.
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1) Quitar vistas que referencian columnas numéricas de telemetria_equipos
DROP VIEW IF EXISTS v_insumos_proyectados CASCADE;
DROP VIEW IF EXISTS v_kpi_oportunidades_cliente CASCADE;
DROP VIEW IF EXISTS v_kpi_oportunidades_mes CASCADE;
DROP VIEW IF EXISTS v_kpi_oportunidades_sede CASCADE;
DROP VIEW IF EXISTS v_kpi_oportunidades_marca CASCADE;
DROP VIEW IF EXISTS v_calendario_mantenimientos CASCADE;

-- 2) Ampliar tipos
ALTER TABLE telemetria_equipos
  ALTER COLUMN horometro TYPE NUMERIC(18, 3) USING ROUND(horometro::numeric, 3),
  ALTER COLUMN promedio_h TYPE NUMERIC(18, 6) USING CASE
    WHEN promedio_h IS NULL THEN NULL ELSE ROUND(promedio_h::numeric, 6) END,
  ALTER COLUMN latitud TYPE NUMERIC(18, 10) USING CASE
    WHEN latitud IS NULL THEN NULL ELSE ROUND(latitud::numeric, 10) END,
  ALTER COLUMN longitud TYPE NUMERIC(18, 10) USING CASE
    WHEN longitud IS NULL THEN NULL ELSE ROUND(longitud::numeric, 10) END,
  ALTER COLUMN dias_primer_mtto TYPE NUMERIC(18, 6) USING CASE
    WHEN dias_primer_mtto IS NULL THEN NULL ELSE ROUND(dias_primer_mtto::numeric, 6) END,
  ALTER COLUMN proximo_primer_mtto TYPE NUMERIC(18, 6) USING CASE
    WHEN proximo_primer_mtto IS NULL THEN NULL ELSE ROUND(proximo_primer_mtto::numeric, 6) END,
  ALTER COLUMN dias_segundo_mtto TYPE NUMERIC(18, 6) USING CASE
    WHEN dias_segundo_mtto IS NULL THEN NULL ELSE ROUND(dias_segundo_mtto::numeric, 6) END,
  ALTER COLUMN proximo_segundo_mtto TYPE NUMERIC(18, 6) USING CASE
    WHEN proximo_segundo_mtto IS NULL THEN NULL ELSE ROUND(proximo_segundo_mtto::numeric, 6) END,
  ALTER COLUMN dias_tercer_mtto TYPE NUMERIC(18, 6) USING CASE
    WHEN dias_tercer_mtto IS NULL THEN NULL ELSE ROUND(dias_tercer_mtto::numeric, 6) END,
  ALTER COLUMN proximo_tercer_mtto TYPE NUMERIC(18, 6) USING CASE
    WHEN proximo_tercer_mtto IS NULL THEN NULL ELSE ROUND(proximo_tercer_mtto::numeric, 6) END,
  ALTER COLUMN distancia_bogota TYPE NUMERIC(18, 6) USING CASE
    WHEN distancia_bogota IS NULL THEN NULL ELSE ROUND(distancia_bogota::numeric, 6) END,
  ALTER COLUMN distancia_medellin TYPE NUMERIC(18, 6) USING CASE
    WHEN distancia_medellin IS NULL THEN NULL ELSE ROUND(distancia_medellin::numeric, 6) END,
  ALTER COLUMN distancia_barranquilla TYPE NUMERIC(18, 6) USING CASE
    WHEN distancia_barranquilla IS NULL THEN NULL ELSE ROUND(distancia_barranquilla::numeric, 6) END,
  ALTER COLUMN distancia_monteria TYPE NUMERIC(18, 6) USING CASE
    WHEN distancia_monteria IS NULL THEN NULL ELSE ROUND(distancia_monteria::numeric, 6) END,
  ALTER COLUMN distancia_cali TYPE NUMERIC(18, 6) USING CASE
    WHEN distancia_cali IS NULL THEN NULL ELSE ROUND(distancia_cali::numeric, 6) END,
  ALTER COLUMN distancia_bucaramanga TYPE NUMERIC(18, 6) USING CASE
    WHEN distancia_bucaramanga IS NULL THEN NULL ELSE ROUND(distancia_bucaramanga::numeric, 6) END,
  ALTER COLUMN distancia_ibague TYPE NUMERIC(18, 6) USING CASE
    WHEN distancia_ibague IS NULL THEN NULL ELSE ROUND(distancia_ibague::numeric, 6) END,
  ALTER COLUMN distancia_istmina TYPE NUMERIC(18, 6) USING CASE
    WHEN distancia_istmina IS NULL THEN NULL ELSE ROUND(distancia_istmina::numeric, 6) END,
  ALTER COLUMN distancia_minima TYPE NUMERIC(18, 6) USING CASE
    WHEN distancia_minima IS NULL THEN NULL ELSE ROUND(distancia_minima::numeric, 6) END;

-- 3) Recrear vistas (misma definición que 02 / 18)
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

CREATE OR REPLACE VIEW v_kpi_oportunidades_mes AS
SELECT
  DATE_TRUNC('month', COALESCE(fecha_primer_mtto, created_at::DATE)) AS mes,
  COUNT(*) AS total_oportunidades,
  COUNT(*) FILTER (WHERE estado = 'Enviado') AS enviadas,
  COUNT(*) FILTER (WHERE estado = 'Pendiente') AS pendientes
FROM telemetria_equipos
GROUP BY 1
ORDER BY 1;

CREATE OR REPLACE VIEW v_kpi_oportunidades_sede AS
SELECT sede, COUNT(*) AS total, marca
FROM telemetria_equipos
WHERE sede IS NOT NULL
GROUP BY sede, marca;

CREATE OR REPLACE VIEW v_kpi_oportunidades_cliente AS
SELECT titulo AS cliente, COUNT(*) AS total, SUM(horometro) AS horometro_acumulado
FROM telemetria_equipos
GROUP BY titulo
ORDER BY total DESC;

CREATE OR REPLACE VIEW v_kpi_oportunidades_marca AS
SELECT marca, COUNT(*) AS total
FROM telemetria_equipos
GROUP BY marca
ORDER BY total DESC;

CREATE OR REPLACE VIEW v_calendario_mantenimientos AS
SELECT
  id,
  serie,
  modelo,
  marca,
  titulo AS cliente,
  sede,
  asesor_email,
  fecha_primer_mtto AS fecha_servicio,
  'primer' AS tipo_servicio,
  estado
FROM telemetria_equipos
WHERE fecha_primer_mtto IS NOT NULL
UNION ALL
SELECT id, serie, modelo, marca, titulo, sede, asesor_email, fecha_segundo_mtto, 'segundo', estado
FROM telemetria_equipos WHERE fecha_segundo_mtto IS NOT NULL
UNION ALL
SELECT id, serie, modelo, marca, titulo, sede, asesor_email, fecha_tercer_mtto, 'tercer', estado
FROM telemetria_equipos WHERE fecha_tercer_mtto IS NOT NULL;

COMMENT ON COLUMN telemetria_equipos.promedio_h IS
  'Promedio horas/día. NUMERIC(18,6) para soportar exports Excel/Power Apps.';

COMMENT ON COLUMN telemetria_equipos.horometro IS
  'Horómetro acumulado. NUMERIC(18,3) evita overflow en lecturas altas.';
