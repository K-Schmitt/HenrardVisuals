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

/**
 * The book abandons masonry for three composed row archetypes, cycled in
 * order. Masonry produced a saw-toothed lower edge that fought the printed
 * register the design is after; these rows align along their feet instead.
 *
 * The column tracks are the doc's pixel widths expressed as `fr`, which keeps
 * the proportions exact at any width and lets the grid absorb the gutter.
 */
type RowKind = 'triptych' | 'centre' | 'diptych';

interface Row {
  kind: RowKind;
  photos: Photo[];
  /** Index of the first photo in the row, within the whole collection. */
  offset: number;
}

const CYCLE: { kind: RowKind; capacity: number }[] = [
  { kind: 'triptych', capacity: 3 },
  { kind: 'centre', capacity: 1 },
  { kind: 'diptych', capacity: 2 },
];

/**
 * Walks the cycle over the page's photos. A trailing row that cannot be
 * filled degrades to the archetype that fits what is left, so the last row of
 * an odd collection is never a half-empty diptych.
 */
export function planRows(photos: Photo[]): Row[] {
  const rows: Row[] = [];
  let index = 0;
  let step = 0;

  while (index < photos.length) {
    const remaining = photos.length - index;
    const wanted = CYCLE[step % CYCLE.length]!;
    const take = Math.min(wanted.capacity, remaining);
    const kind: RowKind = take === wanted.capacity ? wanted.kind : take === 2 ? 'diptych' : 'centre';

    rows.push({ kind, photos: photos.slice(index, index + take), offset: index });
    index += take;
    step += 1;
  }

  return rows;
}

/** "01", "02" … the frame number as the book prints it. */
const frameNumber = (n: number) => String(n).padStart(2, '0');

interface FrameProps {
  photo: Photo;
  number: number;
  ratio: string;
  /** Mirrors the grid track this frame occupies, for `sizes`. */
  sizes: string;
  categoryName: string | null;
  onClick: (photo: Photo) => void;
  openLabel: string;
  className?: string;
  /** Frames in the centre row carry their caption in the neighbouring cell. */
  showCaption?: boolean;
}

function Frame({
  photo,
  number,
  ratio,
  sizes,
  categoryName,
  onClick,
  openLabel,
  className = '',
  showCaption = true,
}: FrameProps) {
  const place = [photo.shot_location, photo.shot_year].filter(Boolean).join(', ');

  return (
    <figure className={`m-0 ${className}`}>
      {/* A real button, not a div with onClick: activation by Enter and Space,
          focus and role all come for free. */}
      <button
        type="button"
        onClick={() => onClick(photo)}
        aria-label={openLabel}
        className="block w-full text-left"
      >
        <OptimizedImage
          src={buildImageUrl(photo.storage_path, { width: 800 })}
          fallbackSrc={buildImageUrl(photo.storage_path)}
          srcSet={buildImageSrcSet(photo.storage_path, GALLERY_WIDTHS)}
          sizes={sizes}
          alt={photo.title}
          width={photo.width ?? undefined}
          height={photo.height ?? undefined}
          aspect={ratio}
          className="h-full w-full object-cover object-[50%_32%]"
          reveal
        />
      </button>
      {showCaption && (
        <figcaption className="caption-caps mt-3.5 flex items-baseline justify-between gap-4 text-bone-muted">
          <span>
            {frameNumber(number)}
            {categoryName ? ` — ${categoryName}` : ''}
          </span>
          {place && <span className="text-right">{place}</span>}
        </figcaption>
      )}
    </figure>
  );
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

  // Numbering runs across the whole collection, not the visible page — the
  // captions read as plate numbers in a book, so page two starts at 13.
  const pageOffset = currentPage * pageSize;
  const rows = planRows(photos);

  // The plate denominator must never contradict what is on screen. totalCount
  // comes from a separate exact count, and a request that returns rows with no
  // count header would otherwise print "04 / 00".
  const plateTotal = Math.max(totalCount, pageOffset + photos.length);

  const categoryName = (slug: string | null) =>
    slug ? categories.find((c) => c.slug === slug)?.name ?? null : null;

  const filters = [
    { key: 'All', label: t('gallery.all') },
    ...categories.map((cat) => ({ key: cat.slug, label: cat.name })),
  ];

  const frameProps = (photo: Photo, indexInRow: number, row: Row, ratio: string, sizes: string) => ({
    photo,
    number: pageOffset + row.offset + indexInRow + 1,
    ratio,
    sizes,
    categoryName: categoryName(photo.category),
    onClick: onPhotoClick,
    openLabel: t('gallery.openPhoto', { title: photo.title }),
  });

  return (
    <section id="portfolio" className="px-5 pt-[100px] lg:px-10 lg:pt-[150px]">
      <div className="flex flex-col items-start justify-between gap-6 border-b border-bone-faint pb-5 lg:flex-row lg:items-end">
        {/* Level 2: the hero's name is the page's h1. */}
        <div className="flex items-baseline gap-5">
          <h2 className="font-display text-section-title">Portfolio</h2>
          {totalCount > 0 && (
            <span className="micro-caps text-bone-muted">
              {t(totalCount === 1 ? 'gallery.seriesOne' : 'gallery.seriesMany', {
                count: frameNumber(totalCount),
              })}
            </span>
          )}
        </div>

        <div className="hide-scrollbar -mx-5 flex max-w-full gap-7 overflow-x-auto px-5 lg:mx-0 lg:gap-9 lg:overflow-visible lg:px-0">
          {filters.map((filter) => {
            const isActive = activeFilter === filter.key;
            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => onFilterChange(filter.key)}
                aria-pressed={isActive}
                className={`shrink-0 whitespace-nowrap border-b-2 pb-2 text-[12.5px] uppercase tracking-[0.2em] transition-colors duration-300 ${
                  isActive
                    ? 'border-vermillon text-bone'
                    : 'border-transparent text-bone-muted hover:text-bone'
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading && (
        <div className="py-20 text-center">
          <div
            role="status"
            aria-label={t('gallery.loading')}
            className="inline-block h-12 w-12 animate-spin rounded-full border-2 border-bone border-t-transparent"
          />
        </div>
      )}

      {error && (
        <div className="py-20 text-center">
          <p className="mb-6 text-vermillon">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="micro-caps border-b border-bone-faint pb-2 text-bone transition-colors duration-300 hover:border-vermillon"
          >
            {t('gallery.retry')}
          </button>
        </div>
      )}

      {!isLoading && !error && (
        <div aria-live="polite" aria-busy={isLoading} className="mt-14 lg:mt-20">
          {rows.map((row) => {
            const key = row.photos[0]?.id ?? row.offset;

            if (row.kind === 'triptych') {
              const [a, b, c] = row.photos;
              return (
                <div
                  key={key}
                  className="mb-[88px] grid grid-cols-1 gap-6 last:mb-0 lg:mb-[150px] lg:grid-cols-[568fr_404fr_340fr] lg:items-start"
                >
                  {a && (
                    <Frame
                      {...frameProps(a, 0, row, '4 / 5', '(min-width: 1024px) 42vw, 100vw')}
                    />
                  )}
                  {/* self-end is what makes the offset frame land on the same
                      baseline as its neighbour rather than float mid-row. */}
                  {b && (
                    <Frame
                      {...frameProps(b, 1, row, '3 / 4', '(min-width: 1024px) 30vw, 78vw')}
                      className="ml-auto w-[78%] lg:ml-0 lg:w-auto lg:self-end"
                    />
                  )}
                  {c && (
                    <Frame
                      {...frameProps(c, 2, row, '2 / 3', '(min-width: 1024px) 25vw, 78vw')}
                      className="mr-auto w-[78%] lg:mr-0 lg:w-auto"
                    />
                  )}
                </div>
              );
            }

            if (row.kind === 'diptych') {
              return (
                <div
                  key={key}
                  className="mb-[88px] grid grid-cols-1 gap-6 last:mb-0 lg:mb-[150px] lg:grid-cols-2 lg:items-start"
                >
                  {row.photos.map((photo, i) => (
                    <Frame
                      key={photo.id}
                      {...frameProps(photo, i, row, '4 / 5', '(min-width: 1024px) 49vw, 100vw')}
                    />
                  ))}
                </div>
              );
            }

            // Centre — a single frame given room to breathe, flanked by the
            // pull quote on one side and the plate reference on the other.
            const photo = row.photos[0];
            if (!photo) return null;
            const number = pageOffset + row.offset + 1;
            const place = [photo.shot_location, photo.shot_year].filter(Boolean).join(', ');
            const name = categoryName(photo.category);

            return (
              <div
                key={key}
                className="mb-[88px] grid grid-cols-1 gap-6 last:mb-0 lg:mb-[150px] lg:grid-cols-[340fr_596fr_376fr] lg:items-center"
              >
                <div className="lg:pt-5">
                  <div className="micro-caps mb-5 text-vermillon">
                    {t('gallery.frameCount', {
                      current: frameNumber(number),
                      total: frameNumber(plateTotal),
                    })}
                  </div>
                  {photo.description && (
                    <blockquote className="m-0 font-serif text-[22px] italic leading-[1.32] text-bone/90 lg:text-[30px]">
                      « {photo.description} »
                    </blockquote>
                  )}
                  {place && <div className="caption-caps mt-6 text-bone-muted">{place}</div>}
                </div>

                <Frame
                  {...frameProps(photo, 0, row, '4 / 5', '(min-width: 1024px) 44vw, 100vw')}
                  showCaption={false}
                />

                <div className="lg:self-end lg:pb-1.5">
                  <div className="caption-caps flex justify-between gap-4 border-t border-bone-faint pt-4 text-bone-muted">
                    <span>
                      {frameNumber(number)}
                      {name ? ` — ${name}` : ''}
                    </span>
                    <span>
                      {frameNumber(number)} / {frameNumber(plateTotal)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && !error && photos.length === 0 && (
        <div className="py-20 text-center">
          <p className="text-bone-muted">{t('gallery.empty')}</p>
        </div>
      )}

      {!isLoading && !error && totalPages > 1 && (
        <nav
          aria-label={t('gallery.pagination')}
          className="mt-24 flex items-center justify-center gap-8"
        >
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!hasPrevious}
            className="micro-caps border-b border-bone-faint pb-2 text-bone transition-colors duration-300 hover:border-vermillon disabled:pointer-events-none disabled:opacity-30"
            aria-label={t('gallery.previousPage')}
          >
            ←
          </button>
          {/* The visible "01 / 03" is decorative; the sentence is what gets
              announced when the page changes. */}
          <span className="micro-caps text-bone-muted" aria-hidden="true">
            {frameNumber(currentPage + 1)} / {frameNumber(totalPages)}
          </span>
          <span className="sr-only" aria-live="polite">
            {t('gallery.pagePosition', { current: currentPage + 1, total: totalPages })}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!hasNext}
            className="micro-caps border-b border-bone-faint pb-2 text-bone transition-colors duration-300 hover:border-vermillon disabled:pointer-events-none disabled:opacity-30"
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
