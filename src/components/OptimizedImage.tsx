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
  /**
   * Black and white at rest, colour under the pointer — the book's one
   * recurring photographic gesture. On touch, where there is no pointer, the
   * reveal keys off the frame reaching the middle of the viewport instead.
   */
  reveal?: boolean;
  /** Intrinsic pixel width, used for the reserved aspect ratio. */
  width?: number;
  /** Intrinsic pixel height, used for the reserved aspect ratio. */
  height?: number;
  /**
   * A frame ratio the layout imposes, e.g. '4 / 5'. Unlike the intrinsic
   * ratio this is never released after load: the composed rows only hold
   * their bottom alignment because every frame in a row keeps its declared
   * shape. Pair it with object-cover.
   */
  aspect?: string;
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
  reveal = false,
  width,
  height,
  aspect,
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

  // Touch devices have no hover, so the colour effect keys off the image being
  // near the centre of the viewport instead. Bail before allocating anything
  // on pointer devices.
  useEffect(() => {
    if (!reveal || !containerRef.current) return;

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
  }, [reveal]);

  const hasIntrinsicSize = Boolean(width && height);

  // A guessed ratio must not outlive the image. Where no frame ratio is
  // imposed, reserve the box while it matters — for lazy loading and to avoid
  // the initial shift — then hand layout back to the image's real proportions.
  const reservedAspect =
    aspect ??
    (hasIntrinsicSize ? `${width} / ${height}` : isLoaded ? undefined : FALLBACK_ASPECT);

  // The transformed variant can legitimately 404/422 — imgproxy refuses any
  // source above IMGPROXY_MAX_SRC_RESOLUTION (16.8 MP by default), and the
  // JSON error body is blocked by ORB rather than rendered. Serving the
  // original is heavier but correct; a missing photo is not an option.
  const activeSrc = useFallback && fallbackSrc ? fallbackSrc : src;
  const activeSrcSet = useFallback ? undefined : srcSet;

  // The treatment lives in CSS (see index.css) rather than an inline filter.
  // Inline styles outrank class names, so the old version's unconditional
  // `filter: grayscale(0)` silently cancelled every grayscale utility a caller
  // passed in — the hero was never black and white.
  const treatment = reveal
    ? `photo-treatment ${isActive ? 'photo-treatment--active' : ''}`
    : '';

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-frame ${onClick ? 'cursor-pointer' : ''}`}
      style={{ aspectRatio: reservedAspect }}
      onMouseEnter={reveal ? () => setIsActive(true) : undefined}
      onMouseLeave={reveal ? () => setIsActive(false) : undefined}
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
          className={`${treatment} ${className}`}
          style={{
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease-out',
          }}
        />
      )}
    </div>
  );
}
