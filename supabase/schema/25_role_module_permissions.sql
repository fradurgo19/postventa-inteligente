-- Matriz de permisos por módulo × rol (editable por administrador)
ALTER TABLE configuracion_sistema
  ADD COLUMN IF NOT EXISTS module_access JSONB;

COMMENT ON COLUMN configuracion_sistema.module_access IS
  'Matriz módulo × rol (JSON). Si es NULL se usan los defaults de la aplicación.';
