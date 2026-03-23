import { getStorageUrl } from '@/lib/supabase';
import type { Photo } from '@/types';

interface PhotoLightboxProps {
  photo: Photo;
  index: number;
  total: number;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
}

export function PhotoLightbox({ photo, index, total, onClose, onPrevious, onNext }: PhotoLightboxProps) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      <button className="fixed top-6 right-6 p-3 text-gray-300 hover:text-white" onClick={onClose}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <button
        className="fixed left-4 top-1/2 -translate-y-1/2 p-3 text-gray-300 hover:text-white"
        onClick={(e) => {
          e.stopPropagation();
          onPrevious();
        }}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <button
        className="fixed right-4 top-1/2 -translate-y-1/2 p-3 text-gray-300 hover:text-white"
        onClick={(e) => {
          e.stopPropagation();
          onNext();
        }}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      <div className="fixed top-6 left-6">
        <h2 className="font-serif text-2xl text-white">{photo.title}</h2>
        {photo.category && (
          <p className="text-sm text-gray-400 mt-1 uppercase tracking-wider">{photo.category}</p>
        )}
      </div>

      <img
        src={getStorageUrl(photo.storage_path)}
        alt={photo.title}
        className="max-w-[90vw] max-h-[90vh] object-contain"
        onClick={(e) => e.stopPropagation()}
      />

      <div className="fixed bottom-6 right-6 text-gray-500 text-sm">
        {index + 1} / {total}
      </div>
    </div>
  );
}

export default PhotoLightbox;
