-- ============================================================
-- FIX: businesses_user_id_fkey violation
-- ============================================================
-- Root cause: public.users must have a row for every auth.users
-- row before a business can be inserted.  The trigger
-- on_auth_user_created is supposed to sync them, but
-- – existing users who signed up before the trigger was
--   deployed are missing from public.users, and
-- – if the trigger fires before public.users was created
--   the insert silently fails.
--
-- This migration:
--   1. Ensures public.users has the right structure.
--   2. Back-fills ALL existing auth.users into public.users.
--   3. Recreates the trigger so future sign-ups are synced.
--   4. Replaces rpc_create_business with a version that
--      upserts the caller into public.users first, making
--      business creation self-healing regardless of trigger
--      state.
--
-- Run this once in the Supabase SQL Editor.
-- ============================================================

-- 1. Ensure public.users exists and has required columns
CREATE TABLE IF NOT EXISTS public.users (
  id          uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text        NOT NULL DEFAULT '',
  full_name   text        NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name  text        NOT NULL DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 2. Back-fill any auth.users rows that are missing from public.users
INSERT INTO public.users (id, email, full_name, created_at, updated_at)
SELECT
  au.id,
  COALESCE(au.email, ''),
  COALESCE(au.raw_user_meta_data->>'full_name', SPLIT_PART(COALESCE(au.email,''), '@', 1)),
  COALESCE(au.created_at, NOW()),
  NOW()
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.users pu WHERE pu.id = au.id)
ON CONFLICT (id) DO NOTHING;

-- 3. Re-create the sync trigger (handles future sign-ups)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(COALESCE(NEW.email,''), '@', 1)),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email      = EXCLUDED.email,
    full_name  = COALESCE(EXCLUDED.full_name, public.users.full_name),
    updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Replace rpc_create_business: upsert the caller into
--    public.users before inserting the business so the FK
--    can never fail even if the trigger hasn't run yet.
CREATE OR REPLACE FUNCTION public.rpc_create_business(
  p_name               text,
  p_address            text,
  p_city               text,
  p_state              text,
  p_pincode            text,
  p_phone              text,
  p_email              text,
  p_gstin              text    DEFAULT NULL,
  p_pan                text    DEFAULT NULL,
  p_terms_conditions   text    DEFAULT NULL,
  p_invoice_template   text    DEFAULT 'classic'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id   uuid;
  v_user auth.users%ROWTYPE;
BEGIN
  -- Ensure caller exists in public.users (self-healing sync)
  SELECT * INTO v_user FROM auth.users WHERE id = auth.uid();
  IF FOUND THEN
    INSERT INTO public.users (id, email, full_name, created_at, updated_at)
    VALUES (
      v_user.id,
      COALESCE(v_user.email, ''),
      COALESCE(v_user.raw_user_meta_data->>'full_name', SPLIT_PART(COALESCE(v_user.email,''), '@', 1)),
      COALESCE(v_user.created_at, NOW()),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  INSERT INTO public.businesses (
    user_id, name, address, city, state, pincode, phone, email,
    gstin, pan, terms_conditions, invoice_template
  )
  VALUES (
    auth.uid(),
    p_name,
    COALESCE(p_address, ''),
    COALESCE(p_city,    ''),
    COALESCE(p_state,   ''),
    COALESCE(p_pincode, ''),
    COALESCE(p_phone,   ''),
    COALESCE(p_email,   ''),
    p_gstin,
    p_pan,
    p_terms_conditions,
    COALESCE(p_invoice_template, 'classic')
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- 5. Also update rpc_sync_user_profile so users can manually
--    fix their own sync from the app.
CREATE OR REPLACE FUNCTION public.rpc_sync_user_profile(p_full_name text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_user auth.users%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_user FROM auth.users WHERE id = auth.uid();

  INSERT INTO public.users (id, email, full_name, created_at, updated_at)
  VALUES (
    auth.uid(),
    COALESCE(v_user.email, ''),
    COALESCE(p_full_name, v_user.raw_user_meta_data->>'full_name', SPLIT_PART(COALESCE(v_user.email,''), '@', 1)),
    COALESCE(v_user.created_at, NOW()),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email      = EXCLUDED.email,
    full_name  = COALESCE(p_full_name, EXCLUDED.full_name, public.users.full_name),
    updated_at = NOW();

  RETURN TRUE;
END;
$$;
