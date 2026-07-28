-- Permitir tipo_item = Fluido (Excel / Power Apps) además de Consumible

ALTER TABLE temparios_mantenimiento
  DROP CONSTRAINT IF EXISTS temparios_mantenimiento_tipo_item_check;

ALTER TABLE temparios_mantenimiento
  ADD CONSTRAINT temparios_mantenimiento_tipo_item_check
  CHECK (tipo_item IN ('Repuesto', 'Consumible', 'Fluido', 'Actividad', 'Servicio'));

COMMENT ON COLUMN temparios_mantenimiento.tipo_item IS
  'Repuesto | Consumible | Fluido | Actividad | Servicio (Power Apps)';

-- Tarifa de referencia alineada a Power Apps (110000 COP/h)
ALTER TABLE temparios_mantenimiento
  ALTER COLUMN tarifa_mano_obra_h SET DEFAULT 110000;
