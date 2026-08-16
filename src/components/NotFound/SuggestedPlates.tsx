import { Link } from 'react-router-dom';

import { OptimizedImage } from '@/components/OptimizedImage';
import { useLanguage } from '@/context/LanguageContext';
import { useSuggestedPhotos } from '@/hooks/useSuggestedPhotos';
import { GALLERY_WIDTHS, buildImageSrcSet, buildImageUrl } from '@/lib/imageUrl';

/** "01", "02" … the frame number as the book prints it. */
const plateNumber = (n: number) => String(n).padStart(2, '0');

/**
 * "Peut-être cherchiez-vous" — three real plates under the error statement.
 *
 * Renders nothing at all when there is nothing to show: an empty gallery or
 * an unreachable API should leave a clean page, not a heading and a rule over
 * three grey boxes.
 */
export function SuggestedPlates() {
  const { t } = useLanguage();
  const plates = useSuggestedPhotos(3);

  if (plates.length === 0) return null;

  return (
    <section className="px-5 pt-16 lg:px-10 lg:pt-[140px]">
      <div className="flex items-end justify-between gap-4 border-b border-bone-faint pb-4 lg:pb-[18px]">
        {/* Level 2: the error statement is this page's h1. */}
        <h2 className="font-display text-[19px] italic text-bone/[0.86] lg:text-[26px]">
          {t('notFound.suggestionsTitle')}
        </h2>
        <span className="caption-caps whitespace-nowrap text-bone-muted">
          <span className="hidden lg:inline">{t('notFound.suggestionsLabel')} — </span>
          {plateNumber(plates.length)}
        </span>
      </div>

      <div className="mt-6 flex gap-3 lg:mt-10 lg:gap-6">
        {plates.map(({ photo, number, categoryName }) => {
          const place = [photo.shot_location, photo.shot_year].filter(Boolean).join(', ');

          return (
            <figure key={photo.id} className="m-0 flex-1">
              {/* No deep link to a single plate exists, so the strip returns
                  the visitor to the gallery rather than nowhere. */}
              <Link
                to="/#portfolio"
                aria-label={`${photo.title} — ${t('notFound.portfolio')}`}
                className="block overflow-hidden bg-frame"
              >
                <OptimizedImage
                  src={buildImageUrl(photo.storage_path, { width: 800 })}
                  fallbackSrc={buildImageUrl(photo.storage_path)}
                  srcSet={buildImageSrcSet(photo.storage_path, GALLERY_WIDTHS)}
                  sizes="30vw"
                  alt={photo.title}
                  width={photo.width ?? undefined}
                  height={photo.height ?? undefined}
                  aspect="4/5"
                  className="h-full w-full object-cover object-[50%_32%]"
                />
              </Link>
              <figcaption className="caption-caps mt-2 flex items-baseline justify-between gap-2 text-bone-muted lg:mt-3">
                <span>
                  {plateNumber(number)}
                  {categoryName ? ` — ${categoryName}` : ''}
                </span>
                {place && <span className="hidden text-right lg:inline">{place}</span>}
              </figcaption>
            </figure>
          );
        })}
      </div>
    </section>
  );
}
