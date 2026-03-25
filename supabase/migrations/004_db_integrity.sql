-- =========================================
-- HenrardVisuals - Intégrité référentielle
-- =========================================

-- ----------------------------------------
-- FK: photos.category → categories.slug
-- ----------------------------------------
-- Garantit qu'une photo ne peut pas référencer
-- une catégorie inexistante. Lors de la suppression
-- ou du renommage d'un slug, les photos orphelines
-- sont automatiquement mises à NULL.

ALTER TABLE public.photos
  ADD CONSTRAINT fk_photos_category
  FOREIGN KEY (category)
  REFERENCES public.categories(slug)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- ----------------------------------------
-- Fonction: set_hero_photo(photo_id)
-- ----------------------------------------
-- Opération atomique pour définir l'image héros:
-- 1. Retire is_hero de toutes les photos
-- 2. Active is_hero sur la photo ciblée
-- Les deux opérations sont dans la même transaction.

CREATE OR REPLACE FUNCTION public.set_hero_photo(target_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.photos SET is_hero = FALSE WHERE is_hero = TRUE;
  UPDATE public.photos SET is_hero = TRUE WHERE id = target_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.set_hero_photo IS
  'Définit atomiquement la photo héros en évitant la race condition des deux UPDATE séquentiels côté client.';
