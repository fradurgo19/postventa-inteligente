-- PARTEQUIPOS SAS — Posventa Inteligente
-- Ejecutar en Supabase SQL Editor (en orden numérico).
-- NO se ejecuta automáticamente desde la app.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Roles de aplicación (referencia para RLS)
-- administrador | coordinador | asesor_comercial | tecnico | visualizador
