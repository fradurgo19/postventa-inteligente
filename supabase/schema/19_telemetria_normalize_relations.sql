-- ═══════════════════════════════════════════════════════════════════════════════
-- Telemetría: tablas relacionadas (sedes, maquinas) + uniques para upsert
-- Ejecutar en SQL Editor después de 02_mantenimientos_proyectados.sql
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1) Sedes
CREATE TABLE IF NOT EXISTS sedes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre      TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sedes_nombre_unique UNIQUE (nombre)
);

COMMENT ON TABLE sedes IS
  'Sedes de servicio. Excel columna Sede (elegida por distancia mínima).';

-- 2) Máquinas (flota / serie)
CREATE TABLE IF NOT EXISTS maquinas (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  serie         TEXT NOT NULL,
  numero_serie  TEXT,
  marca         TEXT NOT NULL,
  modelo        TEXT NOT NULL,
  tipo_maquina  TEXT,
  cliente_id    UUID REFERENCES clientes(id),
  sede_id       UUID REFERENCES sedes(id),
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT maquinas_serie_unique UNIQUE (serie)
);

CREATE INDEX IF NOT EXISTS idx_maquinas_marca_modelo ON maquinas (marca, modelo);
CREATE INDEX IF NOT EXISTS idx_maquinas_cliente ON maquinas (cliente_id);

COMMENT ON TABLE maquinas IS
  'Flota por número de serie. Relacionada con clientes/sedes; telemetría apunta a maquina_id.';

-- 3) Uniques / índices para upsert de clientes y asesores
CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_nit_unique
  ON clientes (nit)
  WHERE nit IS NOT NULL AND btrim(nit) <> '' AND nit NOT ILIKE '#N/D';

-- 4) FKs adicionales en telemetria_equipos
ALTER TABLE telemetria_equipos
  ADD COLUMN IF NOT EXISTS sede_id UUID REFERENCES sedes(id);

ALTER TABLE telemetria_equipos
  ADD COLUMN IF NOT EXISTS maquina_id UUID REFERENCES maquinas(id);

-- 5) Una fila de telemetría vigente por serie (snapshot mensual)
-- Deduplica conservando el registro más reciente antes del UNIQUE
DELETE FROM telemetria_equipos a
USING telemetria_equipos b
WHERE a.serie = b.serie
  AND a.id <> b.id
  AND COALESCE(a.updated_at, a.created_at) < COALESCE(b.updated_at, b.created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_telemetria_serie_unique
  ON telemetria_equipos (serie);

-- 6) Triggers updated_at (si existe la función compartida)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at'
  ) THEN
    DROP TRIGGER IF EXISTS trg_sedes_updated_at ON sedes;
    CREATE TRIGGER trg_sedes_updated_at
      BEFORE UPDATE ON sedes
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

    DROP TRIGGER IF EXISTS trg_maquinas_updated_at ON maquinas;
    CREATE TRIGGER trg_maquinas_updated_at
      BEFORE UPDATE ON maquinas
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- 7) RLS
ALTER TABLE sedes ENABLE ROW LEVEL SECURITY;
ALTER TABLE maquinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE asesores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sedes_select ON sedes;
CREATE POLICY sedes_select ON sedes FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS sedes_write ON sedes;
CREATE POLICY sedes_write ON sedes FOR ALL TO authenticated
  USING (auth_user_rol() IN ('administrador', 'coordinador'))
  WITH CHECK (auth_user_rol() IN ('administrador', 'coordinador'));

DROP POLICY IF EXISTS maquinas_select ON maquinas;
CREATE POLICY maquinas_select ON maquinas FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS maquinas_write ON maquinas;
CREATE POLICY maquinas_write ON maquinas FOR ALL TO authenticated
  USING (auth_user_rol() IN ('administrador', 'coordinador'))
  WITH CHECK (auth_user_rol() IN ('administrador', 'coordinador'));

DROP POLICY IF EXISTS clientes_select ON clientes;
CREATE POLICY clientes_select ON clientes FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS clientes_write ON clientes;
CREATE POLICY clientes_write ON clientes FOR ALL TO authenticated
  USING (auth_user_rol() IN ('administrador', 'coordinador'))
  WITH CHECK (auth_user_rol() IN ('administrador', 'coordinador'));

DROP POLICY IF EXISTS asesores_select ON asesores;
CREATE POLICY asesores_select ON asesores FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS asesores_write ON asesores;
CREATE POLICY asesores_write ON asesores FOR ALL TO authenticated
  USING (auth_user_rol() IN ('administrador', 'coordinador'))
  WITH CHECK (auth_user_rol() IN ('administrador', 'coordinador'));

GRANT SELECT, INSERT, UPDATE ON sedes, maquinas, clientes, asesores TO authenticated;
