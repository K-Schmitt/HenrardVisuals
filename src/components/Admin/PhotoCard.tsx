import { useState } from 'react';

import { useLanguage } from '@/context/LanguageContext';
import type { PhotoCredits } from '@/hooks/useAdminPhotos';
import { buildImageUrl, THUMB_WIDTH } from '@/lib/imageUrl';
import type { Photo, Category } from '@/types';

interface PhotoCardProps {
  photo: Photo;
  categories: Category[];
  onTogglePublish: (photo: Photo) => void;
  onToggleHero: (photo: Photo) => void;
  onDelete: (photo: Photo) => void;
  onUpdateCategory: (photoId: string, categorySlug: string | null) => void;
  onUpdateCredits: (photoId: string, credits: PhotoCredits) => void;
}

const YEAR_MIN = 1900;
const YEAR_MAX = 2200;

const FIELD =
  'w-full border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-900 transition-colors focus:border-accent-500 focus:outline-none hover:border-gray-400';
const LABEL = 'mb-1 block text-[10px] uppercase tracking-[0.16em] text-gray-500';

export function PhotoCard({
  photo,
  categories,
  onTogglePublish,
  onToggleHero,
  onDelete,
  onUpdateCategory,
  onUpdateCredits,
}: PhotoCardProps) {
  const { t } = useLanguage();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [draft, setDraft] = useState<{
    description: string;
    shot_location: string;
    shot_year: string;
    photographer: string;
  }>({
    description: photo.description ?? '',
    shot_location: photo.shot_location ?? '',
    shot_year: photo.shot_year === null ? '' : String(photo.shot_year),
    photographer: photo.photographer ?? '',
  });

  const handleDeleteClick = () => {
    if (confirmingDelete) {
      onDelete(photo);
      setConfirmingDelete(false);
    } else {
      setConfirmingDelete(true);
    }
  };

  // An empty field clears the column; anything outside the range the CHECK
  // constraint enforces is rejected here rather than at the database.
  const trimmedYear = draft.shot_year.trim();
  const parsedYear = trimmedYear === '' ? null : Number(trimmedYear);
  const yearInvalid =
    parsedYear !== null &&
    (!Number.isInteger(parsedYear) || parsedYear < YEAR_MIN || parsedYear > YEAR_MAX);

  const blankToNull = (value: string) => (value.trim() === '' ? null : value.trim());

  const handleSaveCredits = () => {
    if (yearInvalid) return;
    onUpdateCredits(photo.id, {
      description: blankToNull(draft.description),
      shot_location: blankToNull(draft.shot_location),
      shot_year: parsedYear,
      photographer: blankToNull(draft.photographer),
    });
  };

  return (
    <div className="relative overflow-hidden border border-gray-200 bg-gray-50">
      <div className="group relative">
        <img
          src={buildImageUrl(photo.storage_path, { width: THUMB_WIDTH })}
          alt={photo.title}
          loading="lazy"
          decoding="async"
          width={photo.width ?? undefined}
          height={photo.height ?? undefined}
          className="h-40 w-full object-cover"
          onError={(e) => {
            // imgproxy refuses sources above IMGPROXY_MAX_SRC_RESOLUTION, so a
            // failed thumbnail usually means the transform, not the file. Try
            // the original before falling back to the placeholder.
            const el = e.currentTarget;
            if (el.dataset['fallback'] !== 'done') {
              el.dataset['fallback'] = 'done';
              el.src = buildImageUrl(photo.storage_path);
              return;
            }
            el.src =
              'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23333" width="100" height="100"/><text x="50" y="50" text-anchor="middle" dy=".3em" fill="%23666">-</text></svg>';
          }}
        />
        {/* group-focus-within too: without it a keyboard user tabs into five
            permanently invisible buttons per card. */}
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-ink/70 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
          <button
            type="button"
            onClick={() => onTogglePublish(photo)}
            className="bg-accent-500 px-3 py-1 text-xs uppercase tracking-[0.12em] text-white hover:bg-accent-600"
          >
            {photo.is_published ? t('admin.photos.unpublish') : t('admin.photos.publish')}
          </button>
          <button
            type="button"
            onClick={() => onToggleHero(photo)}
            className="border border-white/70 px-3 py-1 text-xs uppercase tracking-[0.12em] text-white hover:bg-white hover:text-ink"
          >
            {photo.is_hero ? t('admin.photos.removeHero') : t('admin.photos.setHero')}
          </button>
          {confirmingDelete ? (
            <>
              <button
                type="button"
                onClick={handleDeleteClick}
                className="bg-red-600 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white hover:bg-red-700"
              >
                {t('admin.photos.confirm')}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="border border-white/70 px-3 py-1 text-xs uppercase tracking-[0.12em] text-white hover:bg-white hover:text-ink"
              >
                {t('admin.photos.cancel')}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleDeleteClick}
              className="border border-red-400 px-3 py-1 text-xs uppercase tracking-[0.12em] text-red-200 hover:bg-red-600 hover:text-white"
            >
              {t('admin.photos.delete')}
            </button>
          )}
        </div>
      </div>

      <div className="p-3">
        <p className="mb-2 truncate text-sm text-gray-900">{photo.title}</p>

        <div className="mb-2">
          <label htmlFor={`photo-${photo.id}-category`} className={LABEL}>
            {t('admin.photos.category')}
          </label>
          <select
            id={`photo-${photo.id}-category`}
            value={photo.category ?? ''}
            onChange={(e) => onUpdateCategory(photo.id, e.target.value || null)}
            className={FIELD}
          >
            <option value="">{t('admin.photos.uncategorised')}</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.slug}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* The caption block the book prints under each frame. Collapsed by
            default so the grid stays scannable. */}
        <div className="mb-2 border-t border-gray-200 pt-2">
          <button
            type="button"
            onClick={() => setCreditsOpen((open) => !open)}
            aria-expanded={creditsOpen}
            aria-controls={`photo-${photo.id}-credits`}
            className="flex w-full items-center justify-between text-[10px] uppercase tracking-[0.16em] text-gray-500 hover:text-gray-900"
          >
            {t('admin.photos.credits')}
            <span aria-hidden="true">{creditsOpen ? '−' : '+'}</span>
          </button>

          {creditsOpen && (
            <div id={`photo-${photo.id}-credits`} className="mt-3 space-y-2">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label htmlFor={`photo-${photo.id}-location`} className={LABEL}>
                    {t('admin.photos.shotLocation')}
                  </label>
                  <input
                    id={`photo-${photo.id}-location`}
                    type="text"
                    value={draft.shot_location}
                    placeholder={t('admin.photos.shotLocationPlaceholder')}
                    onChange={(e) => setDraft((d) => ({ ...d, shot_location: e.target.value }))}
                    className={FIELD}
                  />
                </div>
                <div className="w-20">
                  <label htmlFor={`photo-${photo.id}-year`} className={LABEL}>
                    {t('admin.photos.shotYear')}
                  </label>
                  <input
                    id={`photo-${photo.id}-year`}
                    type="number"
                    inputMode="numeric"
                    min={YEAR_MIN}
                    max={YEAR_MAX}
                    value={draft.shot_year}
                    placeholder={t('admin.photos.shotYearPlaceholder')}
                    aria-invalid={yearInvalid}
                    aria-describedby={yearInvalid ? `photo-${photo.id}-year-error` : undefined}
                    onChange={(e) => setDraft((d) => ({ ...d, shot_year: e.target.value }))}
                    className={`${FIELD} ${yearInvalid ? 'border-red-500' : ''}`}
                  />
                </div>
              </div>
              {yearInvalid && (
                <p id={`photo-${photo.id}-year-error`} className="text-[11px] text-red-600">
                  {t('admin.photos.shotYearInvalid')}
                </p>
              )}

              <div>
                <label htmlFor={`photo-${photo.id}-photographer`} className={LABEL}>
                  {t('admin.photos.photographer')}
                </label>
                <input
                  id={`photo-${photo.id}-photographer`}
                  type="text"
                  value={draft.photographer}
                  placeholder={t('admin.photos.photographerPlaceholder')}
                  onChange={(e) => setDraft((d) => ({ ...d, photographer: e.target.value }))}
                  className={FIELD}
                />
              </div>

              <div>
                <label htmlFor={`photo-${photo.id}-quote`} className={LABEL}>
                  {t('admin.photos.pullQuote')}
                </label>
                <textarea
                  id={`photo-${photo.id}-quote`}
                  rows={3}
                  value={draft.description}
                  placeholder={t('admin.photos.pullQuotePlaceholder')}
                  onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                  className={FIELD}
                />
              </div>

              <button
                type="button"
                onClick={handleSaveCredits}
                disabled={yearInvalid}
                className="w-full bg-gray-900 px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-white transition-colors hover:bg-accent-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t('admin.photos.saveCredits')}
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] ${
              photo.is_published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {photo.is_published ? t('admin.photos.published') : t('admin.photos.draft')}
          </span>
          {photo.is_hero && (
            <span className="bg-accent-500 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-white">
              {t('admin.photos.hero')}
            </span>
          )}
          {photo.category && (
            <span className="bg-gray-200 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-gray-800">
              {categories.find((c) => c.slug === photo.category)?.name}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default PhotoCard;
