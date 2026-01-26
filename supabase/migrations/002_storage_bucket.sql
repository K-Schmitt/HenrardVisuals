-- =========================================
-- HenrardVisuals - Configuration Storage
-- Créer le bucket pour les photos
-- =========================================

-- ----------------------------------------
-- Créer le bucket "photos" s'il n'existe pas
-- ----------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'photos',
    'photos',
    true,  -- Bucket public pour afficher les images
    52428800,  -- 50MB max par fichier
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- ----------------------------------------
-- Policies Storage pour le bucket photos
-- ----------------------------------------

-- Lecture publique des images
CREATE POLICY "Images publiques accessibles à tous"
ON storage.objects FOR SELECT
USING (bucket_id = 'photos');

-- Upload pour utilisateurs authentifiés
CREATE POLICY "Utilisateurs authentifiés peuvent uploader"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'photos');

-- Mise à jour pour utilisateurs authentifiés
CREATE POLICY "Utilisateurs authentifiés peuvent modifier"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'photos');

-- Suppression pour utilisateurs authentifiés
CREATE POLICY "Utilisateurs authentifiés peuvent supprimer"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'photos');

-- =========================================
-- FIN DE LA CONFIGURATION STORAGE
-- =========================================
