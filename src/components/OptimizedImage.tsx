/**
 * Lazily-loaded image that reserves its layout box before the bytes arrive.
 *
 * The previous version rendered nothing until the observer fired, so every
 * container was 0 px tall. With a CSS multi-column gallery that stacked all
 * items at the same y, they all intersected at once and lazy loading never
 * deferred anything. Reserving space via aspect-ratio fixes the layout shift
 * and makes the deferral real.
 */

import { useState, useRef, useEffect } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
  priority?: boolean;
  enableZoom?: boolean;
  /** Intrinsic pixel width, used for the reserved aspect ratio. */
  width?: number;
  /** Intrinsic pixel height, used for the reserved aspect ratio. */
  height?: number;
  /** Pass '' to omit the attribute — see buildImageSrcSet. */
  srcSet?: string;
  sizes?: string;
  /** Untransformed URL, used when the resized variant cannot be produced. */
  fallbackSrc?: string;
}

/** Portrait default: this is a model portfolio, most frames are 2:3. */
const FALLBACK_ASPECT = '2 / 3';

export function OptimizedImage({
  src,
  alt,
  className = '',
  onClick,
  priority = false,
  enableZoom = false,
  width,
  height,
  srcSet,
  sizes,
  fallbackSrc,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [isActive, setIsActive] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (priority || !containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      // 200px was chosen when containers had no height; with a reserved box
      // it prefetches roughly one viewport ahead, which is the intent.
      { rootMargin: '300px 0px', threshold: 0 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [priority]);

  // Touch devices have no hover, so the colour/zoom effect keys off the image
  // being near the centre of the viewport instead. Bail before allocating
  // anything on pointer devices.
  useEffect(() => {
    if (!enableZoom || !containerRef.current) return;

    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!isTouch) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsActive(Boolean(entry?.isIntersecting)),
      // A single band across the middle of the viewport — one threshold
      // instead of five, so this fires twice per item per scroll pass.
      { rootMargin: '-35% 0px -35% 0px', threshold: 0 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [enableZoom]);

  const hasIntrinsicSize = Boolean(width && height);

  // A guessed ratio must not outlive the image. The gallery is a CSS
  // multi-column masonry: if every tile keeps the same fallback ratio after
  // loading, all tiles end up the same height and the stagger disappears.
  // Reserve the box while it matters — for lazy loading and to avoid the
  // initial shift — then hand layout back to the image's real proportions.
  const reservedAspect = hasIntrinsicSize
    ? `${width} / ${height}`
    : isLoaded
      ? undefined
      : FALLBACK_ASPECT;

  // The transformed variant can legitimately 404/422 — imgproxy refuses any
  // source above IMGPROXY_MAX_SRC_RESOLUTION (16.8 MP by default), and the
  // JSON error body is blocked by ORB rather than rendered. Serving the
  // original is heavier but correct; a missing photo is not an option.
  const activeSrc = useFallback && fallbackSrc ? fallbackSrc : src;
  const activeSrcSet = useFallback ? undefined : srcSet;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-neutral-900 ${onClick ? 'cursor-pointer' : ''}`}
      style={{ aspectRatio: reservedAspect }}
      onMouseEnter={enableZoom ? () => setIsActive(true) : undefined}
      onMouseLeave={enableZoom ? () => setIsActive(false) : undefined}
      onClick={onClick}
    >
      {isInView && (
        <img
          src={activeSrc}
          {...(activeSrcSet ? { srcSet: activeSrcSet } : {})}
          {...(sizes ? { sizes } : {})}
          {...(width ? { width } : {})}
          {...(height ? { height } : {})}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            if (fallbackSrc && !useFallback) setUseFallback(true);
          }}
          className={className}
          style={{
            transform: enableZoom && isActive ? 'scale(1.05)' : 'scale(1)',
            filter: enableZoom && !isActive ? 'grayscale(1)' : 'grayscale(0)',
            opacity: isLoaded ? 1 : 0,
            transition: 'transform 0.7s ease-out, opacity 0.3s ease-out, filter 0.5s ease-out',
          }}
        />
      )}
    </div>
  );
}
