-- ═══════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- Habilitar después de configurar Supabase Auth
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE temparios_mantenimiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetria_equipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cpp_catalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE importaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotizaciones_preventivo ENABLE ROW LEVEL SECURITY;
ALTER TABLE cpp_cotizaciones ENABLE ROW LEVEL SECURITY;

-- Helper: rol del usuario autenticado
CREATE OR REPLACE FUNCTION auth_user_rol()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT rol FROM perfiles WHERE id = auth.uid()),
    'visualizador'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Perfiles: lectura propia; admin/coordinador leen todos
CREATE POLICY perfiles_select ON perfiles FOR SELECT
  USING (id = auth.uid() OR auth_user_rol() IN ('administrador', 'coordinador'));

CREATE POLICY perfiles_update_self ON perfiles FOR UPDATE
  USING (id = auth.uid());

-- Temparios: lectura todos autenticados; escritura admin/coordinador
CREATE POLICY temparios_select ON temparios_mantenimiento FOR SELECT
  TO authenticated USING (activo = TRUE);

CREATE POLICY temparios_insert ON temparios_mantenimiento FOR INSERT
  TO authenticated WITH CHECK (auth_user_rol() IN ('administrador', 'coordinador'));

CREATE POLICY temparios_update ON temparios_mantenimiento FOR UPDATE
  TO authenticated USING (auth_user_rol() IN ('administrador', 'coordinador'));

-- Telemetría: lectura autenticados; import admin/coordinador
CREATE POLICY telemetria_select ON telemetria_equipos FOR SELECT
  TO authenticated USING (TRUE);

CREATE POLICY telemetria_insert ON telemetria_equipos FOR INSERT
  TO authenticated WITH CHECK (auth_user_rol() IN ('administrador', 'coordinador'));

CREATE POLICY telemetria_update ON telemetria_equipos FOR UPDATE
  TO authenticated USING (auth_user_rol() IN ('administrador', 'coordinador'));

-- CPP catálogo
CREATE POLICY cpp_select ON cpp_catalogo FOR SELECT
  TO authenticated USING (activo = TRUE);

CREATE POLICY cpp_write ON cpp_catalogo FOR ALL
  TO authenticated USING (auth_user_rol() IN ('administrador', 'coordinador'));

-- Importaciones
CREATE POLICY importaciones_select ON importaciones FOR SELECT
  TO authenticated USING (
    user_id = auth.uid() OR auth_user_rol() IN ('administrador', 'coordinador')
  );

CREATE POLICY importaciones_insert ON importaciones FOR INSERT
  TO authenticated WITH CHECK (auth_user_rol() IN ('administrador', 'coordinador'));

-- Cotizaciones: propias o admin
CREATE POLICY cotiz_prev_select ON cotizaciones_preventivo FOR SELECT
  TO authenticated USING (
    user_id = auth.uid() OR auth_user_rol() IN ('administrador', 'coordinador')
  );

CREATE POLICY cotiz_prev_insert ON cotizaciones_preventivo FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY cpp_cotiz_select ON cpp_cotizaciones FOR SELECT
  TO authenticated USING (
    user_id = auth.uid() OR auth_user_rol() IN ('administrador', 'coordinador', 'asesor_comercial')
  );

CREATE POLICY cpp_cotiz_insert ON cpp_cotizaciones FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());
