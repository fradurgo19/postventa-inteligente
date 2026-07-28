-- Opciones únicas de filtros (marca / modelo / tipo) desde temparios
-- Evita el límite de 1000 filas del select al construir combos

CREATE OR REPLACE VIEW v_temparios_marcas
WITH (security_invoker = true) AS
SELECT DISTINCT marca
FROM temparios_mantenimiento
WHERE activo = TRUE
  AND marca IS NOT NULL
  AND btrim(marca) <> '';

CREATE OR REPLACE VIEW v_temparios_modelos
WITH (security_invoker = true) AS
SELECT DISTINCT marca, modelo
FROM temparios_mantenimiento
WHERE activo = TRUE
  AND marca IS NOT NULL
  AND modelo IS NOT NULL
  AND btrim(marca) <> ''
  AND btrim(modelo) <> '';

CREATE OR REPLACE VIEW v_temparios_tipos
WITH (security_invoker = true) AS
SELECT DISTINCT tipo_item
FROM temparios_mantenimiento
WHERE activo = TRUE
  AND tipo_item IS NOT NULL
  AND btrim(tipo_item) <> '';

COMMENT ON VIEW v_temparios_marcas IS 'Marcas únicas activas para filtros de calculadora/admin';
COMMENT ON VIEW v_temparios_modelos IS 'Modelos únicos por marca para filtros';
COMMENT ON VIEW v_temparios_tipos IS 'Tipos de ítem únicos (Repuesto, Consumible, …)';

GRANT SELECT ON v_temparios_marcas TO authenticated, anon;
GRANT SELECT ON v_temparios_modelos TO authenticated, anon;
GRANT SELECT ON v_temparios_tipos TO authenticated, anon;
