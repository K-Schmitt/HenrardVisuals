-- RLS regression tests. Run via supabase/tests/run-rls-tests.sh.
-- Any failed assertion raises and aborts with a non-zero exit code.
--
-- The harness runs this file twice: once against a clean 000..005 run and
-- once after a legacy database has been upgraded by re-applying 005, so the
-- seed below is idempotent rather than append-only.

\set ON_ERROR_STOP on

-- Seed one published and one draft photo as the owner. postgres is a
-- superuser here, so RLS (including FORCE) does not apply to the seed.
TRUNCATE public.photos, public.categories;

INSERT INTO public.categories (name, slug, sort_order)
  VALUES ('Editorial', 'editorial', 0);
INSERT INTO public.photos (title, storage_path, category, is_published, is_hero)
  VALUES ('published', 'a.jpg', 'editorial', true,  false),
         ('draft',     'b.jpg', 'editorial', false, false);

-- ---------------------------------------------------------------
-- 1. is_admin() returns false (never NULL) for a claimless JWT
-- ---------------------------------------------------------------
SELECT set_config('request.jwt.claims', '{}', false);
DO $$
BEGIN
  IF public.is_admin() IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'FAIL 1: is_admin() returned % for a claimless JWT, expected false',
      COALESCE(public.is_admin()::text, 'NULL');
  END IF;
END $$;

-- ---------------------------------------------------------------
-- 2. anon can read published photos but not drafts
-- ---------------------------------------------------------------
-- SET, not SET LOCAL: psql is in autocommit, so SET LOCAL would warn and
-- leave the session running as the superuser, quietly voiding the test.
SET ROLE anon;
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.photos;
  IF n <> 1 THEN
    RAISE EXCEPTION 'FAIL 2: anon sees % photos, expected 1 (published only)', n;
  END IF;
END $$;
RESET ROLE;

-- ---------------------------------------------------------------
-- 3. anon cannot write
-- ---------------------------------------------------------------
SET ROLE anon;
DO $$
BEGIN
  BEGIN
    INSERT INTO public.photos (title, storage_path) VALUES ('evil', 'x.jpg');
    RAISE EXCEPTION 'FAIL 3: anon INSERT into photos succeeded';
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    NULL; -- expected
  END;
END $$;
RESET ROLE;

-- ---------------------------------------------------------------
-- 4. A non-admin authenticated user cannot write.
--    This is the assertion that fails without 005 — the orphaned
--    "Authenticated users can manage photos" policy allowed it.
-- ---------------------------------------------------------------
SELECT set_config('request.jwt.claims', '{"app_metadata":{"role":"viewer"}}', false);
SET ROLE authenticated;
DO $$
BEGIN
  BEGIN
    INSERT INTO public.photos (title, storage_path) VALUES ('evil', 'y.jpg');
    RAISE EXCEPTION 'FAIL 4a: non-admin INSERT into photos succeeded';
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    NULL;
  END;

  BEGIN
    DELETE FROM public.photos;
    IF (SELECT count(*) FROM public.photos) = 0 THEN
      RAISE EXCEPTION 'FAIL 4b: non-admin DELETE removed rows';
    END IF;
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  BEGIN
    UPDATE public.site_settings SET value = '"pwned"' WHERE key = 'site_title';
    IF (SELECT value FROM public.site_settings WHERE key = 'site_title') = '"pwned"' THEN
      RAISE EXCEPTION 'FAIL 4c: non-admin UPDATE on site_settings succeeded';
    END IF;
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END $$;
RESET ROLE;

-- ---------------------------------------------------------------
-- 5. A non-admin cannot call set_hero_photo()
-- ---------------------------------------------------------------
SET ROLE authenticated;
DO $$
BEGIN
  BEGIN
    PERFORM public.set_hero_photo('00000000-0000-0000-0000-000000000000'::uuid);
    RAISE EXCEPTION 'FAIL 5: non-admin set_hero_photo() succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END $$;
RESET ROLE;

-- ---------------------------------------------------------------
-- 6. anon has no EXECUTE on set_hero_photo() at all
-- ---------------------------------------------------------------
DO $$
BEGIN
  IF has_function_privilege('anon', 'public.set_hero_photo(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL 6: anon still holds EXECUTE on set_hero_photo()';
  END IF;
END $$;

-- ---------------------------------------------------------------
-- 7. An admin CAN write, and set_hero_photo() is atomic
-- ---------------------------------------------------------------
SELECT set_config('request.jwt.claims', '{"app_metadata":{"role":"admin"}}', false);
SET ROLE authenticated;
DO $$
DECLARE target uuid; heroes int;
BEGIN
  IF public.is_admin() IS NOT TRUE THEN
    RAISE EXCEPTION 'FAIL 7a: is_admin() false for an admin JWT';
  END IF;

  INSERT INTO public.photos (title, storage_path, is_published)
    VALUES ('admin-made', 'c.jpg', true) RETURNING id INTO target;

  PERFORM public.set_hero_photo(target);

  SELECT count(*) INTO heroes FROM public.photos WHERE is_hero;
  IF heroes <> 1 THEN
    RAISE EXCEPTION 'FAIL 7b: % hero photos after set_hero_photo(), expected 1', heroes;
  END IF;
END $$;
RESET ROLE;

-- ---------------------------------------------------------------
-- 8. No permissive FOR ALL policy survives on the content tables
-- ---------------------------------------------------------------
DO $$
DECLARE leftover text;
BEGIN
  SELECT string_agg(format('%s.%s', tablename, policyname), ', ')
    INTO leftover
    FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename IN ('photos', 'categories', 'site_settings')
     AND cmd = 'ALL'
     AND qual = 'true';
  IF leftover IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL 8: permissive USING(true) FOR ALL policies remain: %', leftover;
  END IF;
END $$;

SELECT 'ALL RLS TESTS PASSED' AS result;
