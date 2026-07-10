-- ═══════════════════════════════════════════════════════════════════════════════
-- MÓDULO: CPP — Consulta de Partes Partequipos
-- Catálogo de partes por marca/modelo/componente + carrito/cotizaciones
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cpp_componentes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  marca       TEXT NOT NULL,
  modelo      TEXT NOT NULL,
  componente  TEXT NOT NULL,
  subtipo     TEXT NOT NULL DEFAULT '',
  frecuencia  TEXT NOT NULL DEFAULT '',
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cpp_componentes_unique
  ON cpp_componentes (marca, modelo, componente, subtipo, frecuencia);

CREATE TABLE IF NOT EXISTS cpp_catalogo (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  legacy_no                   INTEGER,
  ref_sap                     TEXT NOT NULL,
  marca                       TEXT NOT NULL,
  nombre                      TEXT NOT NULL,
  cantidad                    NUMERIC(12, 3) NOT NULL DEFAULT 1,
  frecuencia                  TEXT,
  medida                      TEXT,
  comentario                  TEXT,
  modelo                      TEXT NOT NULL,
  parte                       TEXT NOT NULL,
  tipo                        TEXT NOT NULL,
  imagen_url                  TEXT,
  recomendacion               TEXT,
  adjuntos                    JSONB DEFAULT '[]',
  equivalencia1               TEXT,
  equivalencia2               TEXT,
  equivalencia3               TEXT,
  referencia_catalogo_original TEXT,
  diametro_piston             NUMERIC(12, 4),
  medidas_bujes               TEXT,
  componente_id               UUID REFERENCES cpp_componentes(id),
  precio_lista                NUMERIC(14, 2) DEFAULT 0,
  stock_disponible            NUMERIC(12, 3) DEFAULT 0,
  bodega                      TEXT,
  activo                      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by                  TEXT,
  updated_by                  TEXT
);

CREATE INDEX IF NOT EXISTS idx_cpp_marca_modelo ON cpp_catalogo (marca, modelo);
CREATE INDEX IF NOT EXISTS idx_cpp_ref_sap ON cpp_catalogo (ref_sap);
CREATE INDEX IF NOT EXISTS idx_cpp_parte ON cpp_catalogo (parte);
CREATE INDEX IF NOT EXISTS idx_cpp_tipo ON cpp_catalogo (tipo);
CREATE INDEX IF NOT EXISTS idx_cpp_nombre_trgm ON cpp_catalogo USING gin (nombre gin_trgm_ops);

COMMENT ON TABLE cpp_catalogo IS
  'Catálogo CPP — consulta por marca, modelo, componente y subtipo. Import Excel/CSV.';

-- Cache de precios/stock SAP Business One Service Layer
CREATE TABLE IF NOT EXISTS cpp_sap_cache (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ref_sap         TEXT NOT NULL UNIQUE,
  precio          NUMERIC(14, 2),
  stock           NUMERIC(12, 3),
  bodega          TEXT,
  moneda          TEXT DEFAULT 'COP',
  disponible      BOOLEAN DEFAULT TRUE,
  synced_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_response    JSONB
);

-- Carritos / cotizaciones CPP
CREATE TABLE IF NOT EXISTS cpp_cotizaciones (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES auth.users(id),
  estado          TEXT NOT NULL DEFAULT 'borrador'
    CHECK (estado IN ('borrador', 'generada', 'enviada', 'anulada')),
  subtotal        NUMERIC(14, 2) DEFAULT 0,
  iva             NUMERIC(14, 2) DEFAULT 0,
  total           NUMERIC(14, 2) DEFAULT 0,
  notas           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cpp_cotizacion_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cotizacion_id   UUID NOT NULL REFERENCES cpp_cotizaciones(id) ON DELETE CASCADE,
  catalogo_id     UUID REFERENCES cpp_catalogo(id),
  ref_sap         TEXT NOT NULL,
  nombre          TEXT NOT NULL,
  cantidad        NUMERIC(12, 3) NOT NULL DEFAULT 1,
  precio_unitario NUMERIC(14, 2) NOT NULL DEFAULT 0,
  stock_disponible NUMERIC(12, 3),
  bodega          TEXT,
  subtotal        NUMERIC(14, 2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED
);

-- Vista de consulta CPP (filtros laterales)
CREATE OR REPLACE VIEW v_cpp_consulta AS
SELECT
  c.id,
  c.legacy_no,
  c.ref_sap,
  c.marca,
  c.nombre,
  c.cantidad,
  c.frecuencia,
  c.medida,
  c.comentario,
  c.modelo,
  c.parte AS componente,
  c.tipo AS subtipo_componente,
  c.imagen_url,
  c.recomendacion,
  c.adjuntos,
  c.equivalencia1,
  c.equivalencia2,
  c.equivalencia3,
  c.referencia_catalogo_original,
  c.precio_lista,
  c.stock_disponible,
  c.bodega,
  COALESCE(s.precio, c.precio_lista) AS precio_sap,
  COALESCE(s.stock, c.stock_disponible) AS stock_sap,
  COALESCE(s.bodega, c.bodega) AS bodega_sap
FROM cpp_catalogo c
LEFT JOIN cpp_sap_cache s ON s.ref_sap = c.ref_sap
WHERE c.activo = TRUE;
