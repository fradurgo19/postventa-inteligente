-- ═══════════════════════════════════════════════════════════════════════════════
-- Temparios: soporte admin (upsert por ID legacy + lectura admin)
-- Ejecutar en SQL Editor de Supabase si aún no está aplicado
-- ═══════════════════════════════════════════════════════════════════════════════

-- Índice único para upsert por columna ID del Excel (legacy_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_temparios_legacy_id
  ON temparios_mantenimiento (legacy_id)
  WHERE legacy_id IS NOT NULL;

-- Admin/coordinador pueden ver todos los registros (incl. inactivos)
DROP POLICY IF EXISTS temparios_select_admin ON temparios_mantenimiento;
CREATE POLICY temparios_select_admin ON temparios_mantenimiento FOR SELECT
  TO authenticated
  USING (auth_user_rol() IN ('administrador', 'coordinador'));
