-- Re-creates the pre-hardening state that a database initialised from the
-- old volumes/db/init/init.sql still carries: English-named permissive
-- policies that 003's French-named DROPs never matched, blanket table
-- grants, an is_admin() that returns NULL for a claimless JWT, and an
-- unauthenticated-callable set_hero_photo().
--
-- Test-only. Never applied to a real database. The harness applies this
-- after the full migration run, then re-applies 005_rls_hardening.sql, so
-- the assertions run a second time against an upgraded legacy database.
-- That also proves 005 is re-runnable.

-- ----------------------------------------
-- Defect 2: permissive FOR ALL policies under names 003 never dropped
-- ----------------------------------------
DROP POLICY IF EXISTS "Authenticated users can manage photos" ON public.photos;
CREATE POLICY "Authenticated users can manage photos"
  ON public.photos FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can manage categories" ON public.categories;
CREATE POLICY "Authenticated users can manage categories"
  ON public.categories FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can manage settings" ON public.site_settings;
CREATE POLICY "Authenticated users can manage settings"
  ON public.site_settings FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
CREATE POLICY "Authenticated users can upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'photos');

-- ----------------------------------------
-- The blanket grants the old init.sql issued
-- ----------------------------------------
GRANT ALL ON public.photos, public.categories, public.site_settings TO authenticated;
GRANT ALL ON public.photos, public.categories, public.site_settings TO anon;

-- ----------------------------------------
-- Defect 4: is_admin() returns NULL for a claimless JWT
-- ----------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------
-- Defect 3: set_hero_photo() unauthorised and callable by PUBLIC
-- ----------------------------------------
CREATE OR REPLACE FUNCTION public.set_hero_photo(target_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.photos SET is_hero = FALSE WHERE is_hero = TRUE;
  UPDATE public.photos SET is_hero = TRUE WHERE id = target_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.set_hero_photo(UUID) TO PUBLIC;
