import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';
import { OptimizedImage } from '@/components/OptimizedImage';
import type { Photo, Category, ProfileSettings } from '@/types';

type PortfolioFilter = 'All' | string;

const DEFAULT_PROFILE_SETTINGS: ProfileSettings = {
  subtitle: 'диво дьявола • Life is but a dream',
  stats: [
    { value: '188', unit: '6\' 2"', label: 'HEIGHT' },
    { value: '94', unit: '37"', label: 'CHEST' },
    { value: '74', unit: '29"', label: 'WAIST' },
    { value: '92', unit: '36"', label: 'HIPS' },
    { value: '44', unit: 'EU', label: 'SHOES' },
  ],
  attributes: 'Hair: Platinum Blonde | Eyes: Blue',
  biography: `Blending the stark elegance of Parisian editorial with the raw, chaotic energy of the underground, Tristan embodies a modern duality.`,
};

export function Home() {
  const { language, t } = useLanguage();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [profileSettings, setProfileSettings] = useState<ProfileSettings>(DEFAULT_PROFILE_SETTINGS);
  const [activeFilter, setActiveFilter] = useState<PortfolioFilter>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [heroPhoto, setHeroPhoto] = useState<Photo | null>(null);

  // Single optimized fetch for all data
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setIsLoading(true);

        // Fetch settings separately to avoid type issues
        const settingsPromise = supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'profile_settings')
          .maybeSingle();

        const categoriesPromise = supabase
          .from('categories')
          .select('*')
          .order('sort_order', { ascending: true });

        const photosPromise = supabase
          .from('photos')
          .select('*')
          .eq('is_published', true)
          .order('sort_order', { ascending: true });

        const [settingsRes, categoriesRes, photosRes] = await Promise.all([
          settingsPromise,
          categoriesPromise,
          photosPromise,
        ]);

        // Handle settings with explicit type guard
        const settingsData = settingsRes.data as { value: ProfileSettings } | null;
        if (settingsData?.value) {
          setProfileSettings(settingsData.value);
        }

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

  // Filter photos by category (memoized)
  const filteredPhotos = useMemo(() => {
    if (activeFilter === 'All') return photos;
    return photos.filter((p) => p.category === activeFilter);
  }, [photos, activeFilter]);

  const closeModal = useCallback(() => setSelectedPhoto(null), []);

  const goToPreviousPhoto = useCallback(() => {
    if (!selectedPhoto || filteredPhotos.length === 0) return;
    const idx = filteredPhotos.findIndex((p) => p.id === selectedPhoto.id);
    setSelectedPhoto(filteredPhotos[idx > 0 ? idx - 1 : filteredPhotos.length - 1]);
  }, [selectedPhoto, filteredPhotos]);

  const goToNextPhoto = useCallback(() => {
    if (!selectedPhoto || filteredPhotos.length === 0) return;
    const idx = filteredPhotos.findIndex((p) => p.id === selectedPhoto.id);
    setSelectedPhoto(filteredPhotos[idx < filteredPhotos.length - 1 ? idx + 1 : 0]);
  }, [selectedPhoto, filteredPhotos]);

  // Keyboard navigation
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

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <section>
        <div className="flex flex-col lg:flex-row lg:min-h-screen">
          {/* Left - Hero Image */}
          <div className="relative lg:w-1/2 min-h-[60vh] lg:min-h-screen lg:sticky lg:top-0 bg-black pt-16 lg:pt-16 pb-4 px-4">
            <div className="h-full flex items-start justify-center">
              {heroPhoto ? (
                <OptimizedImage
                  src={heroPhoto.storage_path}
                  alt={heroPhoto.title}
                  className="w-full h-auto max-h-[calc(100vh-5rem)] object-contain grayscale hover:grayscale-0 transition-all duration-700"
                  priority={true}
                />
              ) : (
                <div className="w-full h-64 bg-black flex items-center justify-center">
                  <div className="animate-spin h-12 w-12 border-2 border-white border-t-transparent rounded-full" />
                </div>
              )}
            </div>
          </div>

          {/* Right - Info */}
          <div className="lg:w-1/2 bg-black px-8 py-12 lg:px-16 lg:py-20 lg:pt-24">
            <h2 className="font-serif text-6xl lg:text-7xl xl:text-8xl text-center uppercase tracking-tight mb-6">
              TRISTAN
              <br />
              HENRARD
            </h2>

            <p className="text-center text-gray-400 text-sm mb-12">
              {language === 'fr'
                ? profileSettings.subtitle
                : profileSettings.subtitle_en || profileSettings.subtitle}
            </p>

            {/* Stats */}
            <div className="flex justify-center items-start gap-8 mb-12 flex-wrap">
              {profileSettings.stats.map((stat, i) => (
                <div key={i} className="flex items-start gap-8">
                  <div className="text-center">
                    <div className="text-3xl font-light text-white mb-1">{stat.value}</div>
                    <div className="text-xs text-gray-500 mb-2">{stat.unit}</div>
                    <div className="text-[10px] text-gray-600 uppercase tracking-widest">
                      {language === 'fr' ? stat.label : stat.label_en || stat.label}
                    </div>
                  </div>
                  {i < profileSettings.stats.length - 1 && (
                    <div className="w-px h-16 bg-gray-800" />
                  )}
                </div>
              ))}
            </div>

            <p className="text-center text-xs uppercase tracking-[0.2em] text-gray-400 mb-12">
              {language === 'fr'
                ? profileSettings.attributes
                : profileSettings.attributes_en || profileSettings.attributes}
            </p>

            <div className="max-w-2xl mx-auto text-gray-400 text-sm leading-relaxed whitespace-pre-line">
              {language === 'fr'
                ? profileSettings.biography
                : profileSettings.biography_en || profileSettings.biography}
            </div>
          </div>
        </div>
      </section>

      {/* Portfolio */}
      <section className="px-8 py-20 lg:px-16">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12 gap-6">
          <h3 className="font-serif text-5xl lg:text-6xl uppercase tracking-tight">Portfolio</h3>

          {/* Filters */}
          <div className="flex gap-6 text-sm flex-wrap">
            <button
              onClick={() => setActiveFilter('All')}
              className={`uppercase tracking-wider transition-colors ${
                activeFilter === 'All'
                  ? 'text-white border-b border-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t('Tout', 'All')}
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveFilter(cat.slug)}
                className={`uppercase tracking-wider transition-colors ${
                  activeFilter === cat.slug
                    ? 'text-white border-b border-white'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-20">
            <div className="inline-block animate-spin h-12 w-12 border-2 border-white border-t-transparent rounded-full" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-center py-20">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 border border-white hover:bg-white hover:text-black transition-colors"
            >
              {t('Réessayer', 'Retry')}
            </button>
          </div>
        )}

        {/* Gallery Grid */}
        {!isLoading && !error && (
          <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
            {filteredPhotos.map((photo) => (
              <div key={photo.id} className="break-inside-avoid">
                <OptimizedImage
                  src={photo.storage_path}
                  alt={photo.title}
                  className="w-full h-auto"
                  onClick={() => setSelectedPhoto(photo)}
                  enableZoom={true}
                />
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && !error && filteredPhotos.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-400">{t('Aucune photo trouvée', 'No photos found')}</p>
          </div>
        )}
      </section>

      {/* Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={closeModal}
        >
          <button
            className="fixed top-6 right-6 p-3 text-gray-300 hover:text-white"
            onClick={closeModal}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <button
            className="fixed left-4 top-1/2 -translate-y-1/2 p-3 text-gray-300 hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              goToPreviousPhoto();
            }}
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <button
            className="fixed right-4 top-1/2 -translate-y-1/2 p-3 text-gray-300 hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              goToNextPhoto();
            }}
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          <div className="fixed top-6 left-6">
            <h2 className="font-serif text-2xl text-white">{selectedPhoto.title}</h2>
            {selectedPhoto.category && (
              <p className="text-sm text-gray-400 mt-1 uppercase tracking-wider">
                {selectedPhoto.category}
              </p>
            )}
          </div>

          <img
            src={selectedPhoto.storage_path}
            alt={selectedPhoto.title}
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          <div className="fixed bottom-6 right-6 text-gray-500 text-sm">
            {filteredPhotos.findIndex((p) => p.id === selectedPhoto.id) + 1} /{' '}
            {filteredPhotos.length}
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
