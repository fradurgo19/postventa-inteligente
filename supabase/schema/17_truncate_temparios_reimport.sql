-- Vaciar temparios mal catalogados (sin Modelo2) y dejar listo para reimportar Excel
-- Ejecutar en SQL Editor ANTES de volver a cargar el Excel desde la calculadora.
--
-- Mapeo correcto al reimportar:
--   Excel Modelo2     → BD tipo_item     (Actividad | Repuesto | Fluido | Observacion)
--   Excel TipoItem    → BD tipo_catalogo (Filtro | Aceite | …)  [detalle, no clasificación]

TRUNCATE TABLE temparios_mantenimiento RESTART IDENTITY CASCADE;

-- Asegurar CHECK con Observacion (por si 16 no se ejecutó)
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

COMMENT ON COLUMN temparios_mantenimiento.tipo_item IS
  'Clasificación = Excel Modelo2 (Actividad | Repuesto | Fluido | Observacion)';

COMMENT ON COLUMN temparios_mantenimiento.tipo_catalogo IS
  'Catálogo detalle = Excel TipoItem (Filtro | Aceite | …), distinto de Modelo2';

-- Verificación: debe devolver 0
-- SELECT COUNT(*) FROM temparios_mantenimiento;
