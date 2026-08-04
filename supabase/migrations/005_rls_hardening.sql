-- =========================================
-- HenrardVisuals — RLS hardening
-- =========================================
-- Idempotent. Safe to apply to a database initialised from the old
-- volumes/db/init/init.sql, from setup-complete.sql, or from a clean
-- 000..004 run. Every CREATE POLICY below is preceded by a matching
-- DROP POLICY IF EXISTS, so the file can be replayed as often as needed.
--
-- Sections 3 and 4 touch storage.objects, which the storage-api service
-- creates — and that service only starts once Postgres reports healthy,
-- which only happens after docker-entrypoint-initdb.d has finished. On
-- the very first boot the table is therefore absent, so those statements
-- sit behind a to_regclass() guard and skip with a NOTICE rather than
-- aborting: an abort kills the container, and on restart Postgres finds
-- an initialised data directory and permanently skips every init script.
-- DROP POLICY IF EXISTS is not enough on its own — IF EXISTS guards the
-- policy name, not the table. Cf. 002_storage_bucket.sql and
-- 003_rls_admin_only.sql for the same guard. Once the full stack is up,
-- the storage section of this file must be replayed once alongside 002
-- and 003 — exact command in README.md, docs/SETUP.md and docs/DEPLOY.md
-- ("Initialize the database").
--
-- Section 1 has the same ordering problem for a different reason:
-- auth.jwt() is created by GoTrue, which also starts only after Postgres
-- is healthy. See the comment there. No replay is needed for it.
-- =========================================

-- ----------------------------------------
-- 1. is_admin(): never NULL, pinned search_path, STABLE
-- ----------------------------------------
-- The previous plpgsql version returned NULL for a JWT with no
-- app_metadata.role. RLS coerces NULL to false, so policies held — but
-- `IF NOT public.is_admin()` guards silently no-opped, because NOT NULL
-- is NULL. COALESCE closes that. SET search_path = '' satisfies Supabase
-- lint 0011 (function_search_path_mutable) and requires every reference
-- to be schema-qualified. sql STABLE instead of plpgsql so the planner
-- can hoist it out of per-row evaluation in RLS quals.
--
-- CREATE OR REPLACE, not DROP + CREATE: the policies from 003 already
-- depend on this function, so DROP FUNCTION aborts with a dependency
-- error. Replacing keeps the signature and rebinds the dependents.
--
-- check_function_bodies is turned off for exactly this statement. Unlike
-- a plpgsql body, a LANGUAGE sql body is parsed and resolved at CREATE
-- time, and auth.jwt() is installed by GoTrue's own migration
-- (20220531120530_add_auth_jwt_function) — a service that, like
-- storage-api, only starts once Postgres reports healthy. At
-- docker-entrypoint-initdb.d time it does not exist yet, so validating
-- the body here would abort the init script and lose every later
-- migration. Off, the body late-binds on first call, exactly as the
-- plpgsql version in 003 did; by then GoTrue has long since run.
SET check_function_bodies = off;

DO $$
BEGIN
  IF to_regprocedure('auth.jwt()') IS NULL THEN
    RAISE NOTICE 'auth.jwt() absent — GoTrue has not started yet, is_admin() created unvalidated and will bind on first call';
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

RESET check_function_bodies;

COMMENT ON FUNCTION public.is_admin() IS
  'True when the caller''s JWT carries app_metadata.role = admin. Only the '
  'service_role can write app_metadata, so a client cannot self-promote. '
  'Returns false, never NULL.';

-- ----------------------------------------
-- 2. handle_updated_at(): pin search_path
-- ----------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ----------------------------------------
-- 3. Drop every permissive write policy, whatever it was named
-- ----------------------------------------
-- Three schema sources created differently-named policies for the same
-- thing. Rather than guess, drop anything on these tables that grants
-- FOR ALL with an unconditional USING (true).
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename IN ('photos', 'categories', 'site_settings')
       AND cmd = 'ALL'
       AND qual = 'true'
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
    RAISE NOTICE 'dropped permissive policy %.% / %', p.schemaname, p.tablename, p.policyname;
  END LOOP;
END
$$;

-- Named drops for the storage policies, which the loop above does not cover.
DO $$
BEGIN
  IF to_regclass('storage.objects') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Utilisateurs authentifiés peuvent uploader" ON storage.objects;
    DROP POLICY IF EXISTS "Utilisateurs authentifiés peuvent modifier" ON storage.objects;
    DROP POLICY IF EXISTS "Utilisateurs authentifiés peuvent supprimer" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can upload"             ON storage.objects;
  ELSE
    RAISE NOTICE 'storage.objects absent — storage-api has not started yet, permissive storage policies not dropped (replay this file once the full stack is up)';
  END IF;
END
$$;

-- ----------------------------------------
-- 4. Re-assert admin-only write policies
-- ----------------------------------------
DROP POLICY IF EXISTS "Admins gèrent les photos"      ON public.photos;
DROP POLICY IF EXISTS "Admins gèrent les catégories"  ON public.categories;
DROP POLICY IF EXISTS "Admins gèrent les paramètres"  ON public.site_settings;

CREATE POLICY "Admins gèrent les photos"
  ON public.photos FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins gèrent les catégories"
  ON public.categories FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins gèrent les paramètres"
  ON public.site_settings FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Admins additionally need to SELECT their own drafts; the public read
-- policy is limited to is_published = true.
DROP POLICY IF EXISTS "Admins lisent tout" ON public.photos;
CREATE POLICY "Admins lisent tout"
  ON public.photos FOR SELECT TO authenticated
  USING (public.is_admin());

DO $$
BEGIN
  IF to_regclass('storage.objects') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admins peuvent uploader" ON storage.objects;
    DROP POLICY IF EXISTS "Admins peuvent modifier" ON storage.objects;
    DROP POLICY IF EXISTS "Admins peuvent supprimer" ON storage.objects;

    CREATE POLICY "Admins peuvent uploader"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'photos' AND public.is_admin());

    CREATE POLICY "Admins peuvent modifier"
      ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = 'photos' AND public.is_admin());

    CREATE POLICY "Admins peuvent supprimer"
      ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'photos' AND public.is_admin());
  ELSE
    RAISE NOTICE 'storage.objects absent — storage-api has not started yet, admin storage policies not created (replay this file once the full stack is up)';
  END IF;
END
$$;

-- ----------------------------------------
-- 5. Least-privilege table grants
-- ----------------------------------------
-- The old init.sql issued GRANT ALL ... TO authenticated. RLS was the only
-- thing standing between a logged-in user and the data; with the permissive
-- policy dropped, the grant is still wider than necessary. Policies remain
-- the real control — this is defence in depth.
REVOKE ALL ON public.photos, public.categories, public.site_settings FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.photos, public.categories, public.site_settings TO authenticated;

REVOKE ALL ON public.photos, public.categories, public.site_settings FROM anon;
GRANT SELECT ON public.photos, public.categories, public.site_settings TO anon;

-- ----------------------------------------
-- 6. FORCE RLS
-- ----------------------------------------
-- PostgREST connects as `postgres`, which owns these tables, and a table
-- owner is exempt from its own RLS unless FORCE is set. Without this, any
-- request that manages to execute as the owner role sees no RLS at all.
ALTER TABLE public.photos        FORCE ROW LEVEL SECURITY;
ALTER TABLE public.categories    FORCE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings FORCE ROW LEVEL SECURITY;

-- ----------------------------------------
-- 7. set_hero_photo(): authorize, pin search_path, revoke from PUBLIC
-- ----------------------------------------
-- Previously callable by anyone: PostgREST exposes public-schema functions
-- as RPC and EXECUTE defaults to PUBLIC. Its first statement is an
-- unconditional global UPDATE, so an unauthenticated POST wiped the hero.
CREATE OR REPLACE FUNCTION public.set_hero_photo(target_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE public.photos SET is_hero = FALSE WHERE is_hero = TRUE;
  UPDATE public.photos SET is_hero = TRUE  WHERE id = target_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_hero_photo(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_hero_photo(UUID) TO authenticated, service_role;

COMMENT ON FUNCTION public.set_hero_photo IS
  'Atomically promotes one photo to hero. Admin-only; raises '
  'insufficient_privilege otherwise.';

-- is_admin() itself must not be callable in a way that leaks; reading it is
-- harmless, but keep the grant explicit rather than inherited from PUBLIC.
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

-- ----------------------------------------
-- 8. Index for the gallery query
-- ----------------------------------------
-- useHomeData filters is_published = true AND is_hero = false, orders by
-- sort_order and takes 12 rows. The single-column indexes from 001 cannot
-- serve that; this partial composite can.
CREATE INDEX IF NOT EXISTS idx_photos_public_gallery
  ON public.photos (sort_order, id)
  WHERE is_published = true AND is_hero = false;

-- =========================================
-- END OF RLS HARDENING
-- =========================================
