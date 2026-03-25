import { useState, useEffect, useCallback, useRef } from 'react';

import { DEFAULT_PROFILE_SETTINGS, isProfileSettings } from '@/constants/profileDefaults';
import { supabase } from '@/lib/supabase';
import type { Photo, Category, ProfileSettings } from '@/types';

export const PAGE_SIZE = 12;

export function useHomeData() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [heroPhoto, setHeroPhoto] = useState<Photo | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [profileSettings, setProfileSettings] = useState<ProfileSettings>(DEFAULT_PROFILE_SETTINGS);
  const [activeFilter, setActiveFilterState] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Avoid re-fetching static data (hero, categories, settings) on every page/filter change.
  // Increment staticDataVersion to force a re-fetch (e.g. after admin edits).
  const staticDataLoaded = useRef(false);
  const [staticDataVersion, setStaticDataVersion] = useState(0);

  const refreshStaticData = useCallback(() => {
    staticDataLoaded.current = false;
    setStaticDataVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        if (!staticDataLoaded.current) {
          const [settingsRes, categoriesRes, heroRes] = await Promise.all([
            supabase.from('site_settings').select('value').eq('key', 'profile_settings').maybeSingle(),
            supabase.from('categories').select('*').order('sort_order', { ascending: true }),
            supabase.from('photos').select('*').eq('is_hero', true).eq('is_published', true).maybeSingle(),
          ]);

          const raw = (settingsRes.data as { value: unknown } | null)?.value;
          if (isProfileSettings(raw)) setProfileSettings(raw);
          setCategories((categoriesRes.data ?? []) as Category[]);
          setHeroPhoto(heroRes.data as Photo | null);
          staticDataLoaded.current = true;
        }

        let photosQuery = supabase
          .from('photos')
          .select('*', { count: 'exact' })
          .eq('is_published', true)
          .eq('is_hero', false);

        if (activeFilter !== 'All') {
          photosQuery = photosQuery.eq('category', activeFilter);
        }

        // Offset pagination is appropriate for a portfolio with a small dataset
        // (< a few thousand rows). For larger datasets, keyset pagination using
        // a stable cursor (e.g. sort_order + id) would eliminate the N-row scan
        // overhead and avoid duplicate/skipped rows on concurrent inserts.
        const safePage = Math.max(0, currentPage);
        const { data, count, error: photosError } = await photosQuery
          .order('sort_order', { ascending: true })
          .range(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE - 1);
        if (photosError) throw photosError;

        setPhotos((data ?? []) as Photo[]);
        setTotalCount(count ?? 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [activeFilter, currentPage, staticDataVersion]);

  // Wrap setActiveFilter to reset pagination on filter change.
  // Validates that the requested filter exists in the loaded categories;
  // unknown slugs (e.g. stale bookmarks) fall back to 'All' instead of
  // producing an empty gallery with no feedback.
  const setActiveFilter = useCallback(
    (filter: string) => {
      const isValid = filter === 'All' || categories.some((c) => c.slug === filter);
      setCurrentPage(0);
      setActiveFilterState(isValid ? filter : 'All');
    },
    [categories]
  );

  return {
    photos,
    heroPhoto,
    categories,
    profileSettings,
    activeFilter,
    setActiveFilter,
    currentPage,
    setCurrentPage,
    totalCount,
    pageSize: PAGE_SIZE,
    isLoading,
    error,
    refreshStaticData,
  };
}
