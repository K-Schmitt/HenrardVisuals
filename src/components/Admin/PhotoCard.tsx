import { getStorageUrl } from '@/lib/supabase';
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
  return (
    <div className="relative bg-gray-50 border border-gray-200 rounded-elegant overflow-hidden">
      <div className="relative group">
        <img
          src={getStorageUrl(photo.storage_path)}
          alt={photo.title}
          className="w-full h-40 object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23333" width="100" height="100"/><text x="50" y="50" text-anchor="middle" dy=".3em" fill="%23666">No Image</text></svg>';
          }}
        />
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={() => onTogglePublish(photo)}
            className="px-3 py-1 bg-accent-500 text-white rounded text-sm hover:bg-accent-600"
          >
            {photo.is_published ? 'Unpublish' : 'Publish'}
          </button>
          <button
            onClick={() => onToggleHero(photo)}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            {photo.is_hero ? 'Remove Hero' : 'Set as Hero'}
          </button>
          <button
            onClick={() => onDelete(photo)}
            className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="p-3">
        <p className="text-gray-900 text-sm truncate mb-2">{photo.title}</p>

        <div className="mb-2">
          <label className="block text-xs text-gray-500 mb-1">Catégorie</label>
          <select
            value={photo.category ?? ''}
            onChange={(e) => onUpdateCategory(photo.id, e.target.value || null)}
            className="w-full text-xs px-2 py-1.5 bg-white border border-gray-200 rounded text-gray-900 focus:outline-none focus:border-black hover:border-gray-400 transition-colors"
          >
            <option value="">Sans catégorie</option>
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
            {photo.is_published ? 'Published' : 'Draft'}
          </span>
          {photo.is_hero && (
            <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800">Hero</span>
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
