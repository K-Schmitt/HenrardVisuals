-- =========================================
-- HenrardVisuals - Configuration Storage
-- Créer le bucket pour les photos
-- =========================================
-- Ce fichier s'exécute automatiquement au premier démarrage de Postgres
-- (docker-entrypoint-initdb.d), avant que le service storage-api n'ait
-- eu la chance de créer son propre schéma (storage.buckets,
-- storage.objects) — ce service ne démarre qu'une fois Postgres déjà
-- prêt. Les deux blocs ci-dessous vérifient donc que ces tables
-- existent avant d'écrire dedans : au tout premier boot ils
-- s'abstiennent (NOTICE) plutôt que d'échouer et de bloquer les
-- migrations suivantes. Une fois la stack complète (storage-api compris)
-- démarrée, ce fichier ET la section storage de 003_rls_admin_only.sql
-- doivent être rejoués une fois pour créer le bucket et ses policies —
-- commande exacte dans README.md, docs/SETUP.md et docs/DEPLOY.md
-- ("Initialize the database").
-- =========================================

-- ----------------------------------------
-- Créer le bucket "photos" s'il n'existe pas
-- ----------------------------------------
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
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
  ELSE
    RAISE NOTICE 'storage.buckets absent — storage-api pas encore démarré, bucket "photos" non créé (réexécuter ce fichier une fois la stack complète démarrée)';
  END IF;
END
$$;

-- ----------------------------------------
-- Policies Storage pour le bucket photos
-- ----------------------------------------
DO $$
BEGIN
  IF to_regclass('storage.objects') IS NOT NULL THEN
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
  ELSE
    RAISE NOTICE 'storage.objects absent — storage-api pas encore démarré, policies non créées (réexécuter ce fichier une fois la stack complète démarrée)';
  END IF;
END
$$;

-- =========================================
-- FIN DE LA CONFIGURATION STORAGE
-- =========================================
