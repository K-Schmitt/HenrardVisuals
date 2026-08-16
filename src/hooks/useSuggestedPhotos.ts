import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { Category, Photo } from '@/types';

export interface SuggestedPlate {
  photo: Photo;
  /** Plate number as the book prints it, 1-based over sort_order. */
  number: number;
  categoryName: string | null;
}

/**
 * The plates the 404 offers as a way back into the book.
 *
 * Deliberately not useHomeData: that hook pulls a full page of twelve plus
 * the hero, the categories and the profile settings, and a dead end has no
 * business costing more than the page it replaced.
 *
 * Failure is silent by design. The suggestions are a courtesy; a 404 that
 * renders a database error on top of the 404 is worse than one that simply
 * shows fewer ways out.
 */
export function useSuggestedPhotos(count = 3): SuggestedPlate[] {
  const [plates, setPlates] = useState<SuggestedPlate[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const [photosRes, categoriesRes] = await Promise.all([
        supabase
          .from('photos')
          .select('id, title, storage_path, category, width, height, shot_location, shot_year')
          .eq('is_published', true)
          .eq('is_hero', false)
          .order('sort_order', { ascending: true })
          .limit(count),
        supabase.from('categories').select('id, name, slug, sort_order'),
      ]);

      if (cancelled || photosRes.error || !photosRes.data) return;

      const categories = (categoriesRes.data ?? []) as Category[];

      setPlates(
        (photosRes.data as Photo[]).map((photo, index) => ({
          photo,
          number: index + 1,
          categoryName: photo.category
            ? (categories.find((category) => category.slug === photo.category)?.name ?? null)
            : null,
        }))
      );
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [count]);

  return plates;
}
