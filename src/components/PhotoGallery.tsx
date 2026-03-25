import { OptimizedImage } from '@/components/OptimizedImage';
import { useLanguage } from '@/context/LanguageContext';
import { getStorageUrl } from '@/lib/supabase';
import type { Photo, Category } from '@/types';

interface PhotoGalleryProps {
  photos: Photo[];
  categories: Category[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  onPhotoClick: (photo: Photo) => void;
  isLoading: boolean;
  error: string | null;
  currentPage: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function PhotoGallery({
  photos,
  categories,
  activeFilter,
  onFilterChange,
  onPhotoClick,
  isLoading,
  error,
  currentPage,
  totalCount,
  pageSize,
  onPageChange,
}: PhotoGalleryProps) {
  const { t } = useLanguage();
  const totalPages = Math.ceil(totalCount / pageSize);
  const hasPrevious = currentPage > 0;
  const hasNext = currentPage < totalPages - 1;

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
            {t('gallery.all')}
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
            {t('gallery.retry')}
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
          <p className="text-gray-400">{t('gallery.empty')}</p>
        </div>
      )}
      {!isLoading && !error && totalPages > 1 && (
        <div className="flex justify-center items-center gap-6 mt-16">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!hasPrevious}
            className="px-6 py-2 border border-white text-sm uppercase tracking-wider hover:bg-white hover:text-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Page précédente"
          >
            ←
          </button>
          <span className="text-sm text-gray-400 tracking-wider">
            {currentPage + 1} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!hasNext}
            className="px-6 py-2 border border-white text-sm uppercase tracking-wider hover:bg-white hover:text-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Page suivante"
          >
            →
          </button>
        </div>
      )}
    </section>
  );
}

export default PhotoGallery;
