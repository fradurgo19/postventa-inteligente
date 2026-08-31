-- ═══════════════════════════════════════════════════════════════════════════════
-- 26 · Telemetría: índice por lote + DELETE solo administrador
-- Permite eliminar una carga masiva (import_batch_id) sin truncar toda la BD.
-- Ejecutar en Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_telemetria_import_batch
  ON telemetria_equipos (import_batch_id);

COMMENT ON COLUMN telemetria_equipos.import_batch_id IS
  'UUID de importaciones.id de la carga masiva que insertó la fila.';

-- DELETE de filas de telemetría: solo administrador
DROP POLICY IF EXISTS telemetria_delete ON telemetria_equipos;
CREATE POLICY telemetria_delete ON telemetria_equipos
  FOR DELETE
  TO authenticated
  USING (auth_user_rol() = 'administrador');

-- Actualizar / marcar historial de importaciones (revertido)
DROP POLICY IF EXISTS importaciones_update ON importaciones;
CREATE POLICY importaciones_update ON importaciones
  FOR UPDATE
  TO authenticated
  USING (auth_user_rol() = 'administrador')
  WITH CHECK (auth_user_rol() = 'administrador');

-- Ampliar estados de importación para marcar lotes revertidos
DO $$
BEGIN
  ALTER TABLE importaciones DROP CONSTRAINT IF EXISTS importaciones_estado_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE importaciones
  ADD CONSTRAINT importaciones_estado_check
  CHECK (estado IN ('procesando', 'completado', 'fallido', 'parcial', 'revertido'));
