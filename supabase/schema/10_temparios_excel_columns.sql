-- ═══════════════════════════════════════════════════════════════════════════════
-- Temparios: columnas adicionales alineadas al Excel de importación
-- TipoItem (ej. Filtro) ≠ de Tipo de item (Repuesto/Consumible/…)
-- Ejecutar en SQL Editor de Supabase
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE temparios_mantenimiento
  ADD COLUMN IF NOT EXISTS tipo_catalogo TEXT;

COMMENT ON COLUMN temparios_mantenimiento.tipo_catalogo IS
  'Derivado de Modelo2: Repuesto→Filtro | Fluido→Aceite | Actividad | Observacion';

COMMENT ON COLUMN temparios_mantenimiento.legacy_id IS
  'ID numérico del Excel de temparios (columna ID).';

COMMENT ON COLUMN temparios_mantenimiento.ref_sap_original IS
  'REF SAP ORIGINAL / REF SAP ORIGINAl del Excel.';
