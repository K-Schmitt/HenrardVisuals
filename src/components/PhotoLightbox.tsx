import { useEffect, useRef, useState } from 'react';

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
  /** Storage paths of the adjacent plates, warmed so a step is instant. */
  neighbourPaths?: readonly string[];
}

const TITLE_ID = 'lightbox-title';

/** Below this, a touch is a tap or a scroll, not a step through the book. */
const SWIPE_THRESHOLD_PX = 48;

const frameNumber = (n: number) => String(n).padStart(2, '0');

const plateUrl = (path: string) =>
  buildImageUrl(path, { width: 1920, quality: LIGHTBOX_QUALITY });

/**
 * Remounted on every plate — the parent keys it by photo id, so the loaded and
 * fallback flags reset without an effect, and the browser gets a fresh element
 * rather than repainting the previous photograph until the next one decodes.
 * That stale frame was the whole problem: stepping through the book looked
 * like nothing had happened.
 */
function Plate({ photo, loadingLabel }: { photo: Photo; loadingLabel: string }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  return (
    <>
      {!isLoaded && (
        <div
          role="status"
          aria-label={loadingLabel}
          className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 animate-spin rounded-full border border-bone-faint border-t-bone"
        />
      )}
      <img
        src={useFallback ? buildImageUrl(photo.storage_path) : plateUrl(photo.storage_path)}
        alt={photo.title}
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          // Same ceiling as the gallery: imgproxy refuses sources above its
          // resolution limit, so fall back to the original rather than leave
          // the sheet empty.
          if (!useFallback) setUseFallback(true);
          else setIsLoaded(true);
        }}
        className={`relative max-h-[78vh] max-w-[86vw] object-contain transition-opacity duration-300 lg:max-h-[80vh] ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </>
  );
}

export function PhotoLightbox({
  photo,
  index,
  total,
  onClose,
  onPrevious,
  onNext,
  neighbourPaths = [],
}: PhotoLightboxProps) {
  const { t } = useLanguage();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  // Warm the plates on either side. The decode, not the request, is what made
  // a step feel slow, and the browser keeps these in its image cache.
  const neighbourKey = neighbourPaths.join('|');
  useEffect(() => {
    if (!neighbourKey) return;
    const warmed = neighbourKey.split('|').map((path) => {
      const img = new Image();
      img.src = plateUrl(path);
      return img;
    });
    // Dropping the references is enough to cancel an in-flight prefetch that
    // is no longer wanted; the cache keeps whatever already arrived.
    return () => warmed.forEach((img) => (img.src = ''));
  }, [neighbourKey]);

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

  // Touch navigation. The arrows are a 12 px glyph on a phone; a horizontal
  // drag is what a book of photographs invites, and without this the gesture
  // was silently doing nothing at all.
  const handleTouchStart = (e: React.TouchEvent) => {
    const point = e.touches[0];
    touchStart.current = point ? { x: point.clientX, y: point.clientY } : null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current;
    const point = e.changedTouches[0];
    touchStart.current = null;
    if (!start || !point) return;

    const dx = point.clientX - start.x;
    const dy = point.clientY - start.y;
    // Vertical intent wins ties, so a scroll or a pull-to-refresh never steps.
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) <= Math.abs(dy)) return;

    if (dx < 0) onNext();
    else onPrevious();
  };

  const place = [photo.shot_location, photo.shot_year].filter(Boolean).join(', ');

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={TITLE_ID}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      // A shade below the page ground, so the sheet reads as a plate laid on
      // the book rather than a panel floating over it.
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#060606]"
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

      <div className="pointer-events-none absolute left-6 top-6 z-10">
        <span className="micro-caps text-bone">
          {frameNumber(index + 1)} <span className="text-bone-muted">/ {frameNumber(total)}</span>
        </span>
      </div>

      <button
        ref={closeRef}
        type="button"
        aria-label={t('lightbox.close')}
        onClick={onClose}
        className="absolute right-5 top-5 z-10 p-3 text-bone-muted transition-colors duration-300 hover:text-bone"
      >
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        >
          <line x1="1" y1="1" x2="15" y2="15" />
          <line x1="15" y1="1" x2="1" y2="15" />
        </svg>
      </button>

      <button
        type="button"
        aria-label={t('lightbox.previous')}
        onClick={onPrevious}
        className="absolute left-3 top-1/2 z-10 -translate-y-1/2 p-4 text-bone-muted transition-colors duration-300 hover:text-bone"
      >
        <span
          aria-hidden="true"
          className="block h-3 w-3 rotate-45 border-b border-l border-current"
        />
      </button>

      <button
        type="button"
        aria-label={t('lightbox.next')}
        onClick={onNext}
        className="absolute right-3 top-1/2 z-10 -translate-y-1/2 p-4 text-bone-muted transition-colors duration-300 hover:text-bone"
      >
        <span
          aria-hidden="true"
          className="block h-3 w-3 rotate-45 border-r border-t border-current"
        />
      </button>

      <Plate key={photo.id} photo={photo} loadingLabel={t('lightbox.loading')} />

      <div className="pointer-events-none absolute inset-x-5 bottom-5 z-10 flex items-end justify-between gap-6 lg:inset-x-6 lg:bottom-6">
        <div className="caption-caps leading-[2] text-bone-muted">
          {/* The title is the accessible name of the dialog; the plate line
              beneath it is the credit. */}
          <h2 id={TITLE_ID} className="caption-caps text-bone">
            {photo.title}
            {place ? ` — ${place}` : ''}
          </h2>
          {photo.photographer && <span>{t('lightbox.credit', { name: photo.photographer })}</span>}
        </div>

        <span className="caption-caps hidden text-right text-bone-muted lg:block">
          {t('lightbox.hint')}
        </span>
      </div>

      <p className="sr-only" aria-live="polite">
        {t('lightbox.position', { current: index + 1, total })}
      </p>
    </div>
  );
}

export default PhotoLightbox;
