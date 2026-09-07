-- ═══════════════════════════════════════════════════════════════════════════════
-- Seed: usuarios operativos PARTEQUIPOS (Auth + perfiles)
--
-- Contraseña temporal (todos): Partequipos2026!
-- Cambiar en el primer ingreso / desde Administración.
--
-- Roles:
--   dgomez@partequipos.com → administrador
--   resto → visualizador
--   servicio3@partequipos.com NO se incluye (usuario ya existente: NATALIA ANDREA ZAPATA GOMEZ)
--
-- Ejecutar en: Supabase Dashboard → SQL Editor → Run
-- Prerequisitos: 04_shared.sql, 07_auth_trigger.sql
-- Idempotente: si el correo ya existe, actualiza contraseña + perfil.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
  r RECORD;
  v_user_id UUID;
  v_encrypted TEXT;
  v_password CONSTANT TEXT := 'Partequipos2026!';
  v_created INT := 0;
  v_updated INT := 0;
BEGIN
  CREATE TEMP TABLE _seed_ops_users (
    email TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    rol TEXT NOT NULL,
    sede TEXT
  ) ON COMMIT DROP;

  INSERT INTO _seed_ops_users (email, nombre, rol, sede) VALUES
    ('planeador.serviciosgr@partequipos.com', 'JOSE DANIEL PUERTA SUAREZ', 'visualizador', NULL),
    ('soporte.servicio3@partequipos.com', 'VICTOR GABRIEL LEON VILLALBA', 'visualizador', NULL),
    ('soporte.servicio02@partequipos.com', 'HERNAN FELIPE DIAZ VELASCO', 'visualizador', NULL),
    ('soporte.servicio01@partequipos.com', 'JUAN CAMILO RODRIGUEZ', 'visualizador', NULL),
    ('planeador.serviciobg2@partequipos.com', 'JOHN EDISON PADILLA ALVAREZ', 'visualizador', 'Bogotá'),
    ('jrojas@partequipos.com', 'JUAN SEBASTIAN ROJAS SUAREZ', 'visualizador', NULL),
    ('jefe.mantenimientogr@partequipos.com', 'DEVIS JOSE DUEÑAS DE LA HOZ', 'visualizador', NULL),
    ('jefe.mantenimiento@partequipos.com', 'WILLIAM GONZALEZ CASTRO', 'visualizador', NULL),
    ('planeador.servicioscl@partequipos.com', 'LEONARDO SEDIEL VIDAL', 'visualizador', 'Cali'),
    ('jefe.serviciocl@partequipos.com', 'JUAN MANUEL GUTIERREZ OLARTE', 'visualizador', 'Cali'),
    ('cguerrero@partequipos.com', 'MARIA CAMILA GUERRERO', 'visualizador', NULL),
    ('vdiaz@partequipos.com', 'VALENTINA ANDREA DIAZ MORA', 'visualizador', NULL),
    ('soportemq@partequipos.com', 'ESTIVEN MANCIPE CASTAÑEDA', 'visualizador', NULL),
    ('ebedoya@partequipos.com', 'ELIANA VICTORIA BEDOYA HOYOS', 'visualizador', NULL),
    ('auxiliargarantias2@partequipos.com', 'KAROLL VALENTINA ROJAS PEREZ', 'visualizador', NULL),
    ('almacen.medellin@partequipos.com', 'YAIDER CARVAJAL TORO', 'visualizador', 'Medellín'),
    ('servicio2@partequipos.com', 'RICHARD DAVID SUAREZ SIERRA', 'visualizador', NULL),
    ('servicio1@partequipos.com', 'DIANA MILENA PINILLA', 'visualizador', NULL),
    ('produccion@partequipos.com', 'LUIS HERNAN MONSALVE BERRIO', 'visualizador', NULL),
    ('centrodemonitoreo@partequipos.com', 'ANGIE NATALIA CARREÑO LOPEZ', 'visualizador', NULL),
    ('jestrada@partequipos.com', 'JOHN ALVARO ANDRES ESTRADA', 'visualizador', NULL),
    ('scalderon@partequipos.com', 'SANTIAGO CALDERON', 'visualizador', NULL),
    ('jefepatio@partequipos.com', 'MAURICIO GIL BONILLA', 'visualizador', NULL),
    ('planeador.serviciosbq@partequipos.com', 'DANIEL IGUARAN', 'visualizador', 'Barranquilla'),
    ('planeador.serviciosbg@partequipos.com', 'LUIS ALEJANDRO PERDOMO', 'visualizador', 'Bogotá'),
    ('planeador@partequipos.com', 'ANA MARÍA URIBE LOPEZ', 'visualizador', NULL),
    ('jefe.serviciosbg@partequipos.com', 'WILLIAM ORLANDO PRADA TORRES', 'visualizador', 'Bogotá'),
    ('dgomez@partequipos.com', 'JUAN DAVID GOMEZ AVELLA', 'administrador', NULL);

  v_encrypted := crypt(v_password, gen_salt('bf'));

  FOR r IN
    SELECT email, nombre, rol, sede FROM _seed_ops_users ORDER BY email
  LOOP
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE lower(email) = lower(r.email)
    LIMIT 1;

    IF v_user_id IS NULL THEN
      v_user_id := gen_random_uuid();

      INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        invited_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        created_at,
        updated_at,
        phone,
        phone_confirmed_at,
        email_change_token_current,
        email_change_confirm_status,
        banned_until,
        reauthentication_token,
        is_sso_user,
        deleted_at,
        is_anonymous
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        v_user_id,
        'authenticated',
        'authenticated',
        lower(r.email),
        v_encrypted,
        NOW(),
        NULL,
        '',
        '',
        '',
        '',
        jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
        jsonb_build_object('nombre', r.nombre, 'rol', r.rol),
        FALSE,
        NOW(),
        NOW(),
        NULL,
        NULL,
        '',
        0,
        NULL,
        '',
        FALSE,
        NULL,
        FALSE
      );

      INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        v_user_id,
        jsonb_build_object(
          'sub', v_user_id::text,
          'email', lower(r.email),
          'email_verified', true,
          'phone_verified', false
        ),
        'email',
        v_user_id::text,
        NOW(),
        NOW(),
        NOW()
      );

      v_created := v_created + 1;
    ELSE
      UPDATE auth.users
      SET
        encrypted_password = v_encrypted,
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
          || jsonb_build_object('nombre', r.nombre, 'rol', r.rol),
        updated_at = NOW()
      WHERE id = v_user_id;

      IF NOT EXISTS (
        SELECT 1 FROM auth.identities
        WHERE user_id = v_user_id AND provider = 'email'
      ) THEN
        INSERT INTO auth.identities (
          id,
          user_id,
          identity_data,
          provider,
          provider_id,
          last_sign_in_at,
          created_at,
          updated_at
        ) VALUES (
          gen_random_uuid(),
          v_user_id,
          jsonb_build_object(
            'sub', v_user_id::text,
            'email', lower(r.email),
            'email_verified', true,
            'phone_verified', false
          ),
          'email',
          v_user_id::text,
          NOW(),
          NOW(),
          NOW()
        );
      END IF;

      v_updated := v_updated + 1;
    END IF;

    INSERT INTO public.perfiles (id, email, nombre, rol, sede, activo)
    VALUES (
      v_user_id,
      lower(r.email),
      r.nombre,
      r.rol,
      r.sede,
      TRUE
    )
    ON CONFLICT (id) DO UPDATE
    SET
      email = EXCLUDED.email,
      nombre = EXCLUDED.nombre,
      rol = EXCLUDED.rol,
      sede = COALESCE(EXCLUDED.sede, public.perfiles.sede),
      activo = TRUE,
      updated_at = NOW();
  END LOOP;

  RAISE NOTICE 'Usuarios operativos: creados=% actualizados=% password_temp=Partequipos2026!',
    v_created, v_updated;
END $$;

-- Verificación
SELECT
  u.email,
  p.nombre,
  p.rol,
  p.sede,
  p.activo,
  u.email_confirmed_at IS NOT NULL AS email_ok
FROM auth.users u
INNER JOIN public.perfiles p ON p.id = u.id
WHERE lower(u.email) IN (
  'planeador.serviciosgr@partequipos.com',
  'soporte.servicio3@partequipos.com',
  'soporte.servicio02@partequipos.com',
  'soporte.servicio01@partequipos.com',
  'planeador.serviciobg2@partequipos.com',
  'jrojas@partequipos.com',
  'jefe.mantenimientogr@partequipos.com',
  'jefe.mantenimiento@partequipos.com',
  'planeador.servicioscl@partequipos.com',
  'jefe.serviciocl@partequipos.com',
  'cguerrero@partequipos.com',
  'vdiaz@partequipos.com',
  'soportemq@partequipos.com',
  'ebedoya@partequipos.com',
  'auxiliargarantias2@partequipos.com',
  'almacen.medellin@partequipos.com',
  'servicio2@partequipos.com',
  'servicio1@partequipos.com',
  'produccion@partequipos.com',
  'centrodemonitoreo@partequipos.com',
  'jestrada@partequipos.com',
  'scalderon@partequipos.com',
  'jefepatio@partequipos.com',
  'planeador.serviciosbq@partequipos.com',
  'planeador.serviciosbg@partequipos.com',
  'planeador@partequipos.com',
  'jefe.serviciosbg@partequipos.com',
  'dgomez@partequipos.com'
)
ORDER BY u.email;
