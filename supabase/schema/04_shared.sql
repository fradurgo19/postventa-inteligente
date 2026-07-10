-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLAS COMPARTIDAS: importaciones, perfiles, auditoría
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS perfiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  nombre      TEXT NOT NULL,
  rol         TEXT NOT NULL DEFAULT 'visualizador'
    CHECK (rol IN ('administrador', 'coordinador', 'asesor_comercial', 'tecnico', 'visualizador')),
  sede        TEXT,
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS importaciones (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  modulo          TEXT NOT NULL CHECK (modulo IN ('calculadora', 'proyectados', 'cpp')),
  nombre_archivo  TEXT NOT NULL,
  tipo_archivo    TEXT NOT NULL,
  registros_total INTEGER NOT NULL DEFAULT 0,
  registros_ok    INTEGER NOT NULL DEFAULT 0,
  registros_error INTEGER NOT NULL DEFAULT 0,
  duplicados      INTEGER NOT NULL DEFAULT 0,
  estado          TEXT NOT NULL DEFAULT 'procesando'
    CHECK (estado IN ('procesando', 'completado', 'fallido', 'parcial')),
  errores_json    JSONB DEFAULT '[]',
  resumen_json    JSONB DEFAULT '{}',
  storage_path    TEXT,
  user_id         UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_importaciones_modulo ON importaciones (modulo, created_at DESC);

CREATE TABLE IF NOT EXISTS auditoria (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES auth.users(id),
  modulo      TEXT NOT NULL,
  accion      TEXT NOT NULL,
  entidad     TEXT,
  entidad_id  TEXT,
  detalle     JSONB DEFAULT '{}',
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bucket Storage (crear en Supabase Dashboard → Storage)
-- nombre: importaciones-excel
-- políticas en 05_rls_policies.sql

-- Trigger updated_at genérico
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'temparios_mantenimiento',
    'telemetria_equipos',
    'cpp_catalogo',
    'clientes',
    'perfiles',
    'cpp_cotizaciones'
  ]
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%I_updated ON %I; CREATE TRIGGER trg_%I_updated
       BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at();',
      t, t, t, t
    );
  END LOOP;
END $$;
