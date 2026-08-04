import { useState } from 'react';

import { useLanguage } from '@/context/LanguageContext';
import { buildImageUrl, THUMB_WIDTH } from '@/lib/imageUrl';
import type { Photo, Category } from '@/types';

interface PhotoCardProps {
  photo: Photo;
  categories: Category[];
  onTogglePublish: (photo: Photo) => void;
  onToggleHero: (photo: Photo) => void;
  onDelete: (photo: Photo) => void;
  onUpdateCategory: (photoId: string, categorySlug: string | null) => void;
}

export function PhotoCard({
  photo,
  categories,
  onTogglePublish,
  onToggleHero,
  onDelete,
  onUpdateCategory,
}: PhotoCardProps) {
  const { t } = useLanguage();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const handleDeleteClick = () => {
    if (confirmingDelete) {
      onDelete(photo);
      setConfirmingDelete(false);
    } else {
      setConfirmingDelete(true);
    }
  };

  return (
    <div className="relative bg-gray-50 border border-gray-200 rounded-elegant overflow-hidden">
      <div className="relative group">
        <img
          src={buildImageUrl(photo.storage_path, { width: THUMB_WIDTH })}
          alt={photo.title}
          loading="lazy"
          decoding="async"
          width={photo.width ?? undefined}
          height={photo.height ?? undefined}
          className="w-full h-40 object-cover"
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
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => onTogglePublish(photo)}
            className="px-3 py-1 bg-accent-500 text-white rounded text-sm hover:bg-accent-600"
          >
            {photo.is_published ? t('admin.photos.unpublish') : t('admin.photos.publish')}
          </button>
          <button
            type="button"
            onClick={() => onToggleHero(photo)}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            {photo.is_hero ? t('admin.photos.removeHero') : t('admin.photos.setHero')}
          </button>
          {confirmingDelete ? (
            <>
              <button
            type="button"
                onClick={handleDeleteClick}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 font-semibold"
              >
                {t('admin.photos.confirm')}
              </button>
              <button
            type="button"
                onClick={() => setConfirmingDelete(false)}
                className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
              >
                {t('admin.photos.cancel')}
              </button>
            </>
          ) : (
            <button
            type="button"
              onClick={handleDeleteClick}
              className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
            >
              {t('admin.photos.delete')}
            </button>
          )}
        </div>
      </div>

      <div className="p-3">
        <p className="text-gray-900 text-sm truncate mb-2">{photo.title}</p>

        <div className="mb-2">
          <label htmlFor={`photo-${photo.id}-category`} className="block text-xs text-gray-500 mb-1">
            {t('admin.photos.category')}
          </label>
          <select
            id={`photo-${photo.id}-category`}
            value={photo.category ?? ''}
            onChange={(e) => onUpdateCategory(photo.id, e.target.value || null)}
            className="w-full text-xs px-2 py-1.5 bg-white border border-gray-200 rounded text-gray-900 focus:outline-none focus:border-black hover:border-gray-400 transition-colors"
          >
            <option value="">{t('admin.photos.uncategorised')}</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.slug}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-xs px-2 py-0.5 rounded ${
              photo.is_published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {photo.is_published ? t('admin.photos.published') : t('admin.photos.draft')}
          </span>
          {photo.is_hero && (
            <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800">{t('admin.photos.hero')}</span>
          )}
          {photo.category && (
            <span className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-800">
              {categories.find((c) => c.slug === photo.category)?.name}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default PhotoCard;
