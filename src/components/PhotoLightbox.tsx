import { useEffect, useRef } from 'react';

import { useLanguage } from '@/context/LanguageContext';
import { buildImageUrl, LIGHTBOX_QUALITY } from '@/lib/imageUrl';
import type { Photo } from '@/types';

interface PhotoLightboxProps {
  photo: Photo;
  index: number;
  total: number;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
}

const TITLE_ID = 'lightbox-title';

export function PhotoLightbox({
  photo,
  index,
  total,
  onClose,
  onPrevious,
  onNext,
}: PhotoLightboxProps) {
  const { t } = useLanguage();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);

  // Escape and arrow keys are already handled by useLightbox. This effect owns
  // focus and scroll only.
  useEffect(() => {
    restoreFocusTo.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
      restoreFocusTo.current?.focus();
    };
  }, []);

  // Tab must not escape to the gallery behind the overlay.
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !dialogRef.current) return;

    const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
      'button:not([tabindex="-1"]), [href], [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={TITLE_ID}
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
    >
      {/* Click-outside-to-close, for the mouse only. It is hidden from
          assistive technology and out of the tab order on purpose: exposing it
          would publish a second control with the same name as the close
          button below, which is the one keyboard and screen reader users
          actually get. */}
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />

      <button
        ref={closeRef}
        type="button"
        aria-label={t('lightbox.close')}
        onClick={onClose}
        className="fixed top-6 right-6 z-10 p-3 text-gray-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
      >
        <svg
          aria-hidden="true"
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
        type="button"
        aria-label={t('lightbox.previous')}
        onClick={onPrevious}
        className="fixed left-4 top-1/2 -translate-y-1/2 z-10 p-3 text-gray-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
      >
        <svg
          aria-hidden="true"
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
        type="button"
        aria-label={t('lightbox.next')}
        onClick={onNext}
        className="fixed right-4 top-1/2 -translate-y-1/2 z-10 p-3 text-gray-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
      >
        <svg
          aria-hidden="true"
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

      <div className="fixed top-6 left-6 z-10">
        <h2 id={TITLE_ID} className="font-serif text-2xl text-white">
          {photo.title}
        </h2>
        {photo.category && (
          <p className="text-sm text-gray-400 mt-1 uppercase tracking-wider">{photo.category}</p>
        )}
      </div>

      <img
        src={buildImageUrl(photo.storage_path, { width: 1920, quality: LIGHTBOX_QUALITY })}
        alt={photo.title}
        className="relative max-w-[90vw] max-h-[90vh] object-contain"
        onError={(e) => {
          // Same ceiling as the gallery: fall back to the original rather than
          // leave the lightbox empty.
          const el = e.currentTarget;
          if (el.dataset['fallback'] === 'done') return;
          el.dataset['fallback'] = 'done';
          el.src = buildImageUrl(photo.storage_path);
        }}
      />

      {/* text-gray-500 measured 4.34:1 on black, under the 4.5:1 AA floor. */}
      <p className="fixed bottom-6 right-6 z-10 text-gray-400 text-sm" aria-live="polite">
        {t('lightbox.position', { current: index + 1, total })}
      </p>
    </div>
  );
}

export default PhotoLightbox;
