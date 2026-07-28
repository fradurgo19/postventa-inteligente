-- Upsert masivo por ID del Excel (legacy_id)
-- UNIQUE permite varios NULL; PostgREST onConflict=legacy_id funciona con esta constraint.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'temparios_legacy_id_uid'
  ) THEN
    ALTER TABLE temparios_mantenimiento
      ADD CONSTRAINT temparios_legacy_id_uid UNIQUE (legacy_id);
  END IF;
EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE 'Hay legacy_id duplicados; limpie duplicados antes de crear la constraint UNIQUE.';
  WHEN duplicate_table THEN
    NULL;
  WHEN duplicate_object THEN
    NULL;
END $$;

COMMENT ON CONSTRAINT temparios_legacy_id_uid ON temparios_mantenimiento IS
  'Clave de upsert para la columna ID del Excel de temparios.';
