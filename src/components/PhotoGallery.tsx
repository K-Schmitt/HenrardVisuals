import { OptimizedImage } from '@/components/OptimizedImage';
import { useLanguage } from '@/context/LanguageContext';
import { buildImageUrl, buildImageSrcSet, GALLERY_WIDTHS } from '@/lib/imageUrl';
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
        {/* Level 2: the hero's name is the page's h1. */}
        <h2 className="font-serif text-5xl lg:text-6xl uppercase tracking-tight">Portfolio</h2>

        <div className="flex gap-6 text-sm flex-wrap">
          <button
            type="button"
            onClick={() => onFilterChange('All')}
            aria-pressed={activeFilter === 'All'}
            className={`uppercase tracking-wider transition-colors ${
              activeFilter === 'All'
                ? 'text-white border-b border-white'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {t('gallery.all')}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onFilterChange(cat.slug)}
              aria-pressed={activeFilter === cat.slug}
              className={`uppercase tracking-wider transition-colors ${
                activeFilter === cat.slug
                  ? 'text-white border-b border-white'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-20">
          <div
            role="status"
            aria-label={t('gallery.loading')}
            className="inline-block animate-spin h-12 w-12 border-2 border-white border-t-transparent rounded-full"
          />
        </div>
      )}

      {error && (
        <div className="text-center py-20">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-6 py-2 border border-white hover:bg-white hover:text-black transition-colors"
          >
            {t('gallery.retry')}
          </button>
        </div>
      )}

      {!isLoading && !error && (
        <div
          aria-live="polite"
          aria-busy={isLoading}
          className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6"
        >
          {photos.map((photo) => (
            <div key={photo.id} className="break-inside-avoid">
              {/* A real button, not a div with onClick: activation by Enter
                  and Space, focus and role all come for free. */}
              <button
                type="button"
                onClick={() => onPhotoClick(photo)}
                aria-label={t('gallery.openPhoto', { title: photo.title })}
                className="block w-full text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-white"
              >
                <OptimizedImage
                  src={buildImageUrl(photo.storage_path, { width: 800 })}
                  srcSet={buildImageSrcSet(photo.storage_path, GALLERY_WIDTHS)}
                  // Mirrors the columns-1 md:columns-2 lg:columns-3 breakpoints
                  // above. If those change, this must change with them.
                  sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                  alt={photo.title}
                  width={photo.width ?? undefined}
                  height={photo.height ?? undefined}
                  className="w-full h-auto"
                  enableZoom
                />
              </button>
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
        <nav
          aria-label={t('gallery.pagination')}
          className="flex justify-center items-center gap-6 mt-16"
        >
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!hasPrevious}
            className="px-6 py-2 border border-white text-sm uppercase tracking-wider hover:bg-white hover:text-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label={t('gallery.previousPage')}
          >
            ←
          </button>
          {/* The visible "1 / 3" is decorative; the sentence is what gets
              announced when the page changes. */}
          <span className="text-sm text-gray-400 tracking-wider" aria-hidden="true">
            {currentPage + 1} / {totalPages}
          </span>
          <span className="sr-only" aria-live="polite">
            {t('gallery.pagePosition', { current: currentPage + 1, total: totalPages })}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!hasNext}
            className="px-6 py-2 border border-white text-sm uppercase tracking-wider hover:bg-white hover:text-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label={t('gallery.nextPage')}
          >
            →
          </button>
        </nav>
      )}
    </section>
  );
}

export default PhotoGallery;
