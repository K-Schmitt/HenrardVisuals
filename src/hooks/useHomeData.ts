import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { Photo, Category, ProfileSettings } from '@/types';

const DEFAULT_PROFILE: ProfileSettings = {
  subtitle: 'диво дьявола • Life is but a dream',
  stats: [
    { value: '188', unit: "6' 2\"", label: 'HEIGHT' },
    { value: '94', unit: '37"', label: 'CHEST' },
    { value: '74', unit: '29"', label: 'WAIST' },
    { value: '92', unit: '36"', label: 'HIPS' },
    { value: '44', unit: 'EU', label: 'SHOES' },
  ],
  attributes: 'Hair: Platinum Blonde | Eyes: Blue',
  biography:
    'Blending the stark elegance of Parisian editorial with the raw, chaotic energy of the underground, Tristan embodies a modern duality.',
};

export function useHomeData() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [heroPhoto, setHeroPhoto] = useState<Photo | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [profileSettings, setProfileSettings] = useState<ProfileSettings>(DEFAULT_PROFILE);
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [settingsRes, categoriesRes, photosRes] = await Promise.all([
          supabase.from('site_settings').select('value').eq('key', 'profile_settings').maybeSingle(),
          supabase.from('categories').select('*').order('sort_order', { ascending: true }),
          supabase
            .from('photos')
            .select('*')
            .eq('is_published', true)
            .order('sort_order', { ascending: true }),
        ]);

        const settingsData = settingsRes.data as { value: ProfileSettings } | null;
        if (settingsData?.value) setProfileSettings(settingsData.value);

        setCategories((categoriesRes.data ?? []) as Category[]);

        const allPhotos = (photosRes.data ?? []) as Photo[];
        setHeroPhoto(allPhotos.find((p) => p.is_hero) ?? null);
        setPhotos(allPhotos.filter((p) => !p.is_hero));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, []);

  const filteredPhotos = useMemo(
    () => (activeFilter === 'All' ? photos : photos.filter((p) => p.category === activeFilter)),
    [photos, activeFilter]
  );

  const closeModal = useCallback(() => setSelectedPhoto(null), []);

  const goToPreviousPhoto = useCallback(() => {
    if (!selectedPhoto) return;
    const idx = filteredPhotos.findIndex((p) => p.id === selectedPhoto.id);
    setSelectedPhoto(filteredPhotos[idx > 0 ? idx - 1 : filteredPhotos.length - 1]);
  }, [selectedPhoto, filteredPhotos]);

  const goToNextPhoto = useCallback(() => {
    if (!selectedPhoto) return;
    const idx = filteredPhotos.findIndex((p) => p.id === selectedPhoto.id);
    setSelectedPhoto(filteredPhotos[idx < filteredPhotos.length - 1 ? idx + 1 : 0]);
  }, [selectedPhoto, filteredPhotos]);

  useEffect(() => {
    if (!selectedPhoto) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
      else if (e.key === 'ArrowLeft') goToPreviousPhoto();
      else if (e.key === 'ArrowRight') goToNextPhoto();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPhoto, closeModal, goToPreviousPhoto, goToNextPhoto]);

  return {
    filteredPhotos,
    heroPhoto,
    categories,
    profileSettings,
    activeFilter,
    setActiveFilter,
    selectedPhoto,
    setSelectedPhoto,
    closeModal,
    goToPreviousPhoto,
    goToNextPhoto,
    isLoading,
    error,
  };
}
