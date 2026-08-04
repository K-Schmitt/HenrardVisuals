/**
 * Image URL construction.
 *
 * Supabase Storage can resize through imgproxy at
 * /storage/v1/render/image/public/<bucket>/<path>?width=…&quality=…
 * That endpoint only exists when the Storage service runs with
 * ENABLE_IMAGE_TRANSFORMATION=true and an IMGPROXY_URL. Availability on a
 * managed instance is not guaranteed, so VITE_IMAGE_TRANSFORM gates it and
 * every helper degrades to the untransformed original.
 *
 * Measured against production on 2026-08-04: a 1,413,981-byte original comes
 * back as 19,099 bytes at width=400&quality=70.
 */

/// <reference types="vite/client" />

import { getStorageUrl } from '@/lib/supabase';

const OBJECT_SEGMENT = '/storage/v1/object/public/';
const RENDER_SEGMENT = '/storage/v1/render/image/public/';

const DEFAULT_QUALITY = 70;

/** Rendered widths for a masonry column. Covers 1x and 2x up to a 3-col grid. */
export const GALLERY_WIDTHS = [400, 600, 800, 1200] as const;

/** The hero occupies half the viewport on desktop, all of it on mobile. */
export const HERO_WIDTHS = [640, 960, 1280, 1920] as const;

/** Admin grid tiles are ~160 px wide; 320 covers 2x. */
export const THUMB_WIDTH = 320;

const transformsEnabled = (): boolean => import.meta.env['VITE_IMAGE_TRANSFORM'] === 'true';

/**
 * A resized public URL, or the original when transforms are unavailable or no
 * width was requested.
 */
export function buildImageUrl(path: string, opts?: { width?: number; quality?: number }): string {
  const original = getStorageUrl(path);
  const width = opts?.width;

  if (!transformsEnabled() || !width) return original;

  const rendered = original.replace(OBJECT_SEGMENT, RENDER_SEGMENT);
  // Nothing to rewrite means the URL shape changed upstream — fail soft.
  if (rendered === original) return original;

  const params = new URLSearchParams({
    width: String(width),
    quality: String(opts?.quality ?? DEFAULT_QUALITY),
    resize: 'contain',
  });

  return `${rendered}?${params.toString()}`;
}

/**
 * A `srcset` value, or '' when transforms are unavailable — callers must omit
 * the attribute entirely on an empty string rather than emitting srcset="".
 */
export function buildImageSrcSet(
  path: string,
  widths: readonly number[],
  quality = DEFAULT_QUALITY
): string {
  if (!transformsEnabled()) return '';

  return widths.map((w) => `${buildImageUrl(path, { width: w, quality })} ${w}w`).join(', ');
}
