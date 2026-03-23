import { OptimizedImage } from '@/components/OptimizedImage';
import { getStorageUrl } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';
import type { Photo, Category } from '@/types';

interface PhotoGalleryProps {
  photos: Photo[];
  categories: Category[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  onPhotoClick: (photo: Photo) => void;
  isLoading: boolean;
  error: string | null;
}

export function PhotoGallery({
  photos,
  categories,
  activeFilter,
  onFilterChange,
  onPhotoClick,
  isLoading,
  error,
}: PhotoGalleryProps) {
  const { t } = useLanguage();

  return (
    <section className="px-8 py-20 lg:px-16">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12 gap-6">
        <h3 className="font-serif text-5xl lg:text-6xl uppercase tracking-tight">Portfolio</h3>

        <div className="flex gap-6 text-sm flex-wrap">
          <button
            onClick={() => onFilterChange('All')}
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
              onClick={() => onFilterChange(cat.slug)}
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

      {isLoading && (
        <div className="text-center py-20">
          <div className="inline-block animate-spin h-12 w-12 border-2 border-white border-t-transparent rounded-full" />
        </div>
      )}

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

      {!isLoading && !error && (
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
          {photos.map((photo) => (
            <div key={photo.id} className="break-inside-avoid">
              <OptimizedImage
                src={getStorageUrl(photo.storage_path)}
                alt={photo.title}
                className="w-full h-auto"
                onClick={() => onPhotoClick(photo)}
                enableZoom={true}
              />
            </div>
          ))}
        </div>
      )}

      {!isLoading && !error && photos.length === 0 && (
        <div className="text-center py-20">
          <p className="text-gray-400">{t('Aucune photo trouvée', 'No photos found')}</p>
        </div>
      )}
    </section>
  );
}

export default PhotoGallery;
