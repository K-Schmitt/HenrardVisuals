-- =========================================
-- HenrardVisuals - Crédits de prise de vue
--
-- La refonte « LE BOOK » légende chaque cadre avec un lieu et une année
-- (« 01 — ÉDITORIAL » / « PARIS, 2025 ») et crédite le photographe dans la
-- visionneuse. Ces trois informations n'existaient nulle part en base : elles
-- étaient figées dans la maquette. Cette migration leur donne des colonnes.
--
-- Toutes nullables, sans valeur par défaut : le front omet purement et
-- simplement la partie de légende qui n'est pas renseignée, donc les photos
-- déjà en ligne restent valides sans reprise.
-- =========================================

ALTER TABLE public.photos
    ADD COLUMN IF NOT EXISTS shot_location VARCHAR(120),
    ADD COLUMN IF NOT EXISTS shot_year     SMALLINT,
    ADD COLUMN IF NOT EXISTS photographer  VARCHAR(120);

COMMENT ON COLUMN public.photos.shot_location IS
    'Lieu de prise de vue, affiché en légende (ex. « Paris », « Studio »)';
COMMENT ON COLUMN public.photos.shot_year IS
    'Année de prise de vue, affichée en légende à côté du lieu';
COMMENT ON COLUMN public.photos.photographer IS
    'Crédit photographe, affiché dans la visionneuse';

-- Une année à quatre chiffres, et rien d'autre. La borne haute est volontairement
-- large plutôt que NOW() : une contrainte CHECK ne peut pas être immutable et
-- dépendante de la date du jour.
ALTER TABLE public.photos
    DROP CONSTRAINT IF EXISTS photos_shot_year_range;
ALTER TABLE public.photos
    ADD CONSTRAINT photos_shot_year_range
    CHECK (shot_year IS NULL OR (shot_year BETWEEN 1900 AND 2200));

-- Aucun GRANT à rejouer : 005 accorde les droits au niveau table
-- (GRANT SELECT, INSERT, UPDATE, DELETE ON public.photos TO authenticated ;
-- GRANT SELECT ... TO anon), ce qui couvre les colonnes ajoutées ensuite.
-- Les policies RLS de 005 sont elles aussi table-wide et restent valables.

-- =========================================
-- FIN DE LA MIGRATION
-- =========================================
