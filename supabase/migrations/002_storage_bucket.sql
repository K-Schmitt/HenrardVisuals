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
-- 000_bootstrap crée storage.buckets dans sa forme d'origine : les colonnes
-- public, file_size_limit et allowed_mime_types sont ajoutées plus tard par
-- les migrations de storage-api (0007, 0012, 0013), donc elles n'existent pas
-- encore au premier boot. Écrire dedans sans vérifier faisait échouer ce
-- fichier, et comme l'entrypoint Postgres exécute les .sql avec
-- ON_ERROR_STOP, l'erreur interrompait toute la suite de l'initialisation :
-- 003, 004 et 005 ne tournaient jamais.
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NULL THEN
    RAISE NOTICE 'storage.buckets absent — storage-api pas encore démarré, bucket "photos" non créé (réexécuter ce fichier une fois la stack complète démarrée)';
    RETURN;
  END IF;

  INSERT INTO storage.buckets (id, name)
  VALUES ('photos', 'photos')
  ON CONFLICT (id) DO NOTHING;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'storage' AND table_name = 'buckets'
               AND column_name = 'public') THEN
    UPDATE storage.buckets SET public = true WHERE id = 'photos';
  ELSE
    RAISE NOTICE 'storage.buckets.public absent — rejouer ce fichier après le démarrage de storage-api, sinon les images ne seront pas publiques';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'storage' AND table_name = 'buckets'
               AND column_name = 'file_size_limit') THEN
    UPDATE storage.buckets SET file_size_limit = 52428800 WHERE id = 'photos';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'storage' AND table_name = 'buckets'
               AND column_name = 'allowed_mime_types') THEN
    UPDATE storage.buckets
       SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
     WHERE id = 'photos';
  END IF;
END
$$;

-- ----------------------------------------
-- Policies Storage pour le bucket photos
-- ----------------------------------------
DO $$
BEGIN
  IF to_regclass('storage.objects') IS NOT NULL THEN
    -- Rejouable : sans ces DROP, une seconde exécution échoue sur
    -- "policy already exists" — or ce fichier est fait pour être rejoué une
    -- fois storage-api démarré.
    DROP POLICY IF EXISTS "Images publiques accessibles à tous"      ON storage.objects;
    DROP POLICY IF EXISTS "Utilisateurs authentifiés peuvent uploader"  ON storage.objects;
    DROP POLICY IF EXISTS "Utilisateurs authentifiés peuvent modifier"  ON storage.objects;
    DROP POLICY IF EXISTS "Utilisateurs authentifiés peuvent supprimer" ON storage.objects;

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
