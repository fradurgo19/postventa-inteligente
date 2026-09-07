-- ═══════════════════════════════════════════════════════════════════════════════
-- 30 · Temparios: índice por lote + DELETE solo administrador
-- Permite eliminar una carga masiva (import_batch_id) sin truncar toda la BD.
-- Ejecutar en Supabase SQL Editor (después de 26 si aplica).
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE temparios_mantenimiento
  ADD COLUMN IF NOT EXISTS import_batch_id UUID;

CREATE INDEX IF NOT EXISTS idx_temparios_import_batch
  ON temparios_mantenimiento (import_batch_id);

COMMENT ON COLUMN temparios_mantenimiento.import_batch_id IS
  'UUID de importaciones.id de la carga masiva que insertó/actualizó la fila.';

-- DELETE de filas de temparios: solo administrador
DROP POLICY IF EXISTS temparios_delete ON temparios_mantenimiento;
CREATE POLICY temparios_delete ON temparios_mantenimiento
  FOR DELETE
  TO authenticated
  USING (auth_user_rol() = 'administrador');

-- Asegurar UPDATE/SELECT de importaciones para marcar revertido (idempotente con 26)
DROP POLICY IF EXISTS importaciones_update ON importaciones;
CREATE POLICY importaciones_update ON importaciones
  FOR UPDATE
  TO authenticated
  USING (auth_user_rol() = 'administrador')
  WITH CHECK (auth_user_rol() = 'administrador');

DO $$
BEGIN
  ALTER TABLE importaciones DROP CONSTRAINT IF EXISTS importaciones_estado_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE importaciones
  ADD CONSTRAINT importaciones_estado_check
  CHECK (estado IN ('procesando', 'completado', 'fallido', 'parcial', 'revertido'));

-- Vincular temparios sin lote al ÚLTIMO import exitoso de calculadora
-- (permite revertir cargas históricas previas al tracking por lote).
WITH latest AS (
  SELECT id
  FROM importaciones
  WHERE modulo = 'calculadora'
    AND estado IN ('completado', 'parcial')
  ORDER BY COALESCE(completed_at, created_at) DESC
  LIMIT 1
)
UPDATE temparios_mantenimiento t
SET import_batch_id = (SELECT id FROM latest)
WHERE t.import_batch_id IS NULL
  AND EXISTS (SELECT 1 FROM latest);
