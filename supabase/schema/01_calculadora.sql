-- ═══════════════════════════════════════════════════════════════════════════════
-- MÓDULO: Calculadora de Mantenimientos Preventivos
-- Temparios, matriz de frecuencias por horómetro, tarifas de desplazamiento
-- ═══════════════════════════════════════════════════════════════════════════════

-- Matriz de frecuencias: qué paquetes aplican según horómetro acumulado
CREATE TABLE IF NOT EXISTS maintenance_frequency_matrix (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  horometro       INTEGER NOT NULL CHECK (horometro > 0 AND horometro % 250 = 0),
  frecuencia_250  BOOLEAN NOT NULL DEFAULT TRUE,
  frecuencia_1000 BOOLEAN NOT NULL DEFAULT FALSE,
  frecuencia_2000 BOOLEAN NOT NULL DEFAULT FALSE,
  frecuencia_4000 BOOLEAN NOT NULL DEFAULT FALSE,
  frecuencia_5000 BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (horometro)
);

COMMENT ON TABLE maintenance_frequency_matrix IS
  'Define qué frecuencias de mantenimiento (250/1000/2000/4000/5000 h) aplican en cada hito de horómetro.';

-- Temparios de mantenimiento (estructura Excel importación)
CREATE TABLE IF NOT EXISTS temparios_mantenimiento (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  legacy_id           INTEGER,
  marca               TEXT NOT NULL,
  linea               TEXT,
  modelo              TEXT NOT NULL,
  tipo_item           TEXT NOT NULL CHECK (tipo_item IN ('Repuesto', 'Consumible', 'Actividad', 'Servicio')),
  item                TEXT NOT NULL,
  unidad_medida       TEXT NOT NULL DEFAULT 'Unidad',
  cantidad            NUMERIC(12, 3) NOT NULL DEFAULT 1,
  frecuencia_horas    INTEGER NOT NULL CHECK (frecuencia_horas IN (250, 1000, 2000, 4000, 5000)),
  aceite_homologado   TEXT,
  referencia_genuina  TEXT,
  ref_sap_dispel      TEXT,
  ref_sap_original    TEXT,
  referencia_stal     TEXT,
  referencia_fleetguard TEXT,
  referencia_donaldson  TEXT,
  tiempo_horas        NUMERIC(8, 2) NOT NULL DEFAULT 0,
  procedimiento       TEXT,
  avisos_claves       TEXT,
  precio_unitario     NUMERIC(14, 2) DEFAULT 0,
  tarifa_mano_obra_h  NUMERIC(14, 2) DEFAULT 95000,
  activo              BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by          TEXT,
  updated_by          TEXT
);

CREATE INDEX IF NOT EXISTS idx_temparios_marca_modelo
  ON temparios_mantenimiento (marca, modelo);
CREATE INDEX IF NOT EXISTS idx_temparios_frecuencia
  ON temparios_mantenimiento (frecuencia_horas);
CREATE INDEX IF NOT EXISTS idx_temparios_tipo
  ON temparios_mantenimiento (tipo_item);

COMMENT ON TABLE temparios_mantenimiento IS
  'Catálogo de actividades, consumibles y repuestos por marca/modelo/frecuencia.';

-- Catálogo de marcas/modelos (opcional, derivado de temparios o importación)
CREATE TABLE IF NOT EXISTS maquinas_catalogo (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  marca       TEXT NOT NULL,
  linea       TEXT NOT NULL DEFAULT '',
  modelo      TEXT NOT NULL,
  tipo_maquina TEXT,
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_maquinas_catalogo_marca_modelo_linea
  ON maquinas_catalogo (marca, modelo, linea);

-- Tarifas de desplazamiento (km trayecto + duración → costo)
CREATE TABLE IF NOT EXISTS tarifas_desplazamiento (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre                TEXT NOT NULL DEFAULT 'Estándar',
  costo_por_km          NUMERIC(12, 2) NOT NULL DEFAULT 3500,
  costo_por_hora_viaje  NUMERIC(12, 2) NOT NULL DEFAULT 142500,
  factor_ida_vuelta     NUMERIC(4, 2) NOT NULL DEFAULT 2,
  iva_porcentaje        NUMERIC(5, 2) NOT NULL DEFAULT 19,
  vigente_desde         DATE NOT NULL DEFAULT CURRENT_DATE,
  activo                BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cotizaciones generadas desde la calculadora
CREATE TABLE IF NOT EXISTS cotizaciones_preventivo (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES auth.users(id),
  marca           TEXT NOT NULL,
  modelo          TEXT NOT NULL,
  horometro       INTEGER NOT NULL,
  frecuencias_aplicadas INTEGER[] NOT NULL,
  km_trayecto     NUMERIC(10, 2) NOT NULL DEFAULT 0,
  horas_trayecto  NUMERIC(8, 2) NOT NULL DEFAULT 0,
  costo_mano_obra NUMERIC(14, 2) NOT NULL DEFAULT 0,
  costo_consumibles NUMERIC(14, 2) NOT NULL DEFAULT 0,
  costo_repuestos NUMERIC(14, 2) NOT NULL DEFAULT 0,
  costo_desplazamiento NUMERIC(14, 2) NOT NULL DEFAULT 0,
  subtotal        NUMERIC(14, 2) NOT NULL DEFAULT 0,
  iva             NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total           NUMERIC(14, 2) NOT NULL DEFAULT 0,
  detalle_json    JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Datos semilla: matriz de frecuencias (hasta 9000 h) ──────────────────────
INSERT INTO maintenance_frequency_matrix (horometro, frecuencia_250, frecuencia_1000, frecuencia_2000, frecuencia_4000, frecuencia_5000)
SELECT
  h AS horometro,
  TRUE AS frecuencia_250,
  (h >= 1000 AND h % 1000 = 0) AS frecuencia_1000,
  (h >= 2000 AND h % 2000 = 0 AND (h / 2000) % 2 = 1) AS frecuencia_2000,
  (h >= 4000 AND h % 4000 = 0) AS frecuencia_4000,
  (h >= 5000 AND h % 5000 = 0) AS frecuencia_5000
FROM generate_series(250, 9000, 250) AS h
ON CONFLICT (horometro) DO NOTHING;

-- ── Función: frecuencias aplicables según horómetro ──────────────────────────
CREATE OR REPLACE FUNCTION get_frecuencias_por_horometro(p_horometro INTEGER)
RETURNS INTEGER[] AS $$
DECLARE
  v_row maintenance_frequency_matrix%ROWTYPE;
  v_freqs INTEGER[] := '{}';
BEGIN
  SELECT * INTO v_row
  FROM maintenance_frequency_matrix
  WHERE horometro = p_horometro
  LIMIT 1;

  IF NOT FOUND THEN
    IF p_horometro >= 250 AND p_horometro % 250 = 0 THEN
      v_freqs := array_append(v_freqs, 250);
    END IF;
    RETURN v_freqs;
  END IF;

  IF v_row.frecuencia_250 THEN v_freqs := array_append(v_freqs, 250); END IF;
  IF v_row.frecuencia_1000 THEN v_freqs := array_append(v_freqs, 1000); END IF;
  IF v_row.frecuencia_2000 THEN v_freqs := array_append(v_freqs, 2000); END IF;
  IF v_row.frecuencia_4000 THEN v_freqs := array_append(v_freqs, 4000); END IF;
  IF v_row.frecuencia_5000 THEN v_freqs := array_append(v_freqs, 5000); END IF;

  RETURN v_freqs;
END;
$$ LANGUAGE plpgsql STABLE;

-- ── Vista: temparios agrupados por actividad ─────────────────────────────────
CREATE OR REPLACE VIEW v_temparios_resumen AS
SELECT
  marca,
  modelo,
  frecuencia_horas,
  tipo_item,
  COUNT(*) AS total_items,
  SUM(cantidad) AS cantidad_total,
  SUM(CASE WHEN tipo_item IN ('Actividad', 'Servicio') THEN tiempo_horas ELSE 0 END) AS horas_mano_obra
FROM temparios_mantenimiento
WHERE activo = TRUE
GROUP BY marca, modelo, frecuencia_horas, tipo_item;
