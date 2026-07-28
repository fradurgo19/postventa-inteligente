-- Permitir Observacion (columna Modelo2 del Excel)

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
  'Clasificación Excel columna Modelo2: Repuesto | Fluido | Actividad | Observacion | …';
