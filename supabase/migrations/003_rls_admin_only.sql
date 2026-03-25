-- =========================================
-- HenrardVisuals - RLS Admin Only
-- Restreint les opérations d'écriture aux
-- utilisateurs avec app_metadata.role = 'admin'
-- =========================================
-- À appliquer via : supabase db push
-- ou l'éditeur SQL du dashboard Supabase
-- =========================================

-- ----------------------------------------
-- Helpers
-- ----------------------------------------

-- Fonction utilitaire pour vérifier le rôle admin
-- Lit app_metadata.role dans le JWT — seul Supabase
-- (service_role) peut écrire dans app_metadata,
-- ce qui garantit que l'utilisateur ne peut pas
-- s'auto-promouvoir admin côté client.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------
-- Policies photos — remplacement
-- ----------------------------------------

DROP POLICY IF EXISTS "Utilisateurs authentifiés gèrent les photos" ON public.photos;

CREATE POLICY "Admins gèrent les photos"
    ON public.photos
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ----------------------------------------
-- Policies categories — remplacement
-- ----------------------------------------

DROP POLICY IF EXISTS "Utilisateurs authentifiés gèrent les catégories" ON public.categories;

CREATE POLICY "Admins gèrent les catégories"
    ON public.categories
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ----------------------------------------
-- Policies site_settings — remplacement
-- ----------------------------------------

DROP POLICY IF EXISTS "Utilisateurs authentifiés gèrent les paramètres" ON public.site_settings;

CREATE POLICY "Admins gèrent les paramètres"
    ON public.site_settings
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ----------------------------------------
-- Policies storage — remplacement
-- ----------------------------------------

DROP POLICY IF EXISTS "Utilisateurs authentifiés peuvent uploader" ON storage.objects;
DROP POLICY IF EXISTS "Utilisateurs authentifiés peuvent modifier" ON storage.objects;
DROP POLICY IF EXISTS "Utilisateurs authentifiés peuvent supprimer" ON storage.objects;

CREATE POLICY "Admins peuvent uploader"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'photos' AND public.is_admin());

CREATE POLICY "Admins peuvent modifier"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'photos' AND public.is_admin());

CREATE POLICY "Admins peuvent supprimer"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'photos' AND public.is_admin());

-- =========================================
-- Pour promouvoir un utilisateur admin :
--
-- UPDATE auth.users
-- SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'
-- WHERE email = 'ton-email@example.com';
--
-- OU via l'API Admin Supabase (recommandé) :
-- supabase.auth.admin.updateUserById(userId, {
--   app_metadata: { role: 'admin' }
-- })
-- =========================================
