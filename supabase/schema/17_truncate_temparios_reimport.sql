-- Vaciar temparios y dejar listo para reimportar Excel
-- Orden: 1) este script  2) 18_…sql  3) cargar Excel
--
-- Mapeo al reimportar:
--   Excel Modelo2  → BD tipo_item  y  tipo_catalogo
--     Repuesto→Filtro | Fluido→Aceite | Actividad→Actividad | Observacion→Observacion

TRUNCATE TABLE temparios_mantenimiento RESTART IDENTITY CASCADE;

-- SELECT COUNT(*) FROM temparios_mantenimiento;  -- debe ser 0
