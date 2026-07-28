-- ═══════════════════════════════════════════════════════════════════════════════
-- Seed: usuario administrador de pruebas
-- Email: admin@partequipos.com
-- Password: password123
--
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- Prerequisitos: 04_shared.sql, 07_auth_trigger.sql
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
  v_user_id UUID;
  v_encrypted TEXT;
BEGIN
  -- Si ya existe, solo asegurar rol administrador en perfiles
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower('admin@partequipos.com')
  LIMIT 1;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    v_encrypted := crypt('password123', gen_salt('bf'));

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
      'admin@partequipos.com',
      v_encrypted,
      NOW(),
      NULL,
      '',
      '',
      '',
      '',
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      jsonb_build_object(
        'nombre', 'Administrador PARTEQUIPOS',
        'rol', 'administrador'
      ),
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

    -- Identidad email (requerida por Auth v2)
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
        'email', 'admin@partequipos.com',
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

  -- Perfil con rol administrador (trigger puede haber creado visualizador)
  INSERT INTO public.perfiles (id, email, nombre, rol, sede, activo)
  VALUES (
    v_user_id,
    'admin@partequipos.com',
    'Administrador PARTEQUIPOS',
    'administrador',
    'Principal',
    TRUE
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    nombre = EXCLUDED.nombre,
    rol = 'administrador',
    activo = TRUE,
    updated_at = NOW();
END $$;

-- Verificación
SELECT
  u.id,
  u.email,
  u.email_confirmed_at IS NOT NULL AS email_ok,
  p.nombre,
  p.rol,
  p.activo
FROM auth.users u
LEFT JOIN public.perfiles p ON p.id = u.id
WHERE lower(u.email) = lower('admin@partequipos.com');
