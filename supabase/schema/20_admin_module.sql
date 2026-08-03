-- ═══════════════════════════════════════════════════════════════════════════════
-- Administración: configuración del sistema + RLS perfiles/auditoría
-- Ejecutar en SQL Editor después de 04_shared / 05_rls / 19_telemetria
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1) Configuración (fila única id = 1)
CREATE TABLE IF NOT EXISTS configuracion_sistema (
  id                INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  empresa_nombre    TEXT NOT NULL DEFAULT 'PARTEQUIPOS MAQUINARIA',
  nit               TEXT DEFAULT '900.123.456-7',
  telefono          TEXT DEFAULT '+57 601 234 5678',
  direccion         TEXT DEFAULT 'Cra. 7 #32-16, Bogotá D.C., Colombia',
  email_corporativo TEXT DEFAULT 'info@partequipos.com',
  moneda            TEXT NOT NULL DEFAULT 'COP',
  idioma            TEXT NOT NULL DEFAULT 'es',
  zona_horaria      TEXT NOT NULL DEFAULT 'America/Bogota',
  iva_porcentaje    NUMERIC(5, 2) NOT NULL DEFAULT 19,
  dias_credito      INTEGER NOT NULL DEFAULT 30,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        TEXT
);

INSERT INTO configuracion_sistema (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE configuracion_sistema IS
  'Configuración global de la plataforma (fila única). Editable solo por administrador.';

DROP TRIGGER IF EXISTS trg_configuracion_sistema_updated ON configuracion_sistema;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    CREATE TRIGGER trg_configuracion_sistema_updated
      BEFORE UPDATE ON configuracion_sistema
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- 2) Columna opcional último acceso en perfiles
ALTER TABLE perfiles
  ADD COLUMN IF NOT EXISTS ultimo_acceso TIMESTAMPTZ;

-- 3) RLS perfiles: admin puede actualizar cualquier perfil
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS perfiles_update_self ON perfiles;
CREATE POLICY perfiles_update_self ON perfiles FOR UPDATE
  USING (
    id = auth.uid()
    OR auth_user_rol() = 'administrador'
  )
  WITH CHECK (
    id = auth.uid()
    OR auth_user_rol() = 'administrador'
  );

DROP POLICY IF EXISTS perfiles_insert_admin ON perfiles;
CREATE POLICY perfiles_insert_admin ON perfiles FOR INSERT
  TO authenticated
  WITH CHECK (auth_user_rol() = 'administrador');

-- 4) RLS auditoría
ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS auditoria_select ON auditoria;
CREATE POLICY auditoria_select ON auditoria FOR SELECT
  TO authenticated
  USING (auth_user_rol() IN ('administrador', 'coordinador'));

DROP POLICY IF EXISTS auditoria_insert ON auditoria;
CREATE POLICY auditoria_insert ON auditoria FOR INSERT
  TO authenticated
  WITH CHECK (
    auth_user_rol() IN ('administrador', 'coordinador')
    AND (user_id IS NULL OR user_id = auth.uid())
  );

-- 5) RLS configuración
ALTER TABLE configuracion_sistema ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS config_select ON configuracion_sistema;
CREATE POLICY config_select ON configuracion_sistema FOR SELECT
  TO authenticated USING (TRUE);

DROP POLICY IF EXISTS config_update ON configuracion_sistema;
CREATE POLICY config_update ON configuracion_sistema FOR UPDATE
  TO authenticated
  USING (auth_user_rol() = 'administrador')
  WITH CHECK (auth_user_rol() = 'administrador');

GRANT SELECT, INSERT, UPDATE ON configuracion_sistema TO authenticated;
GRANT SELECT, INSERT ON auditoria TO authenticated;

DROP POLICY IF EXISTS config_insert ON configuracion_sistema;
CREATE POLICY config_insert ON configuracion_sistema FOR INSERT
  TO authenticated
  WITH CHECK (auth_user_rol() = 'administrador' AND id = 1);

CREATE INDEX IF NOT EXISTS idx_auditoria_created ON auditoria (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_modulo ON auditoria (modulo, created_at DESC);
