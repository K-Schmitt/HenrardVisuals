import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  getStorageUrl: (path: string) => `https://cdn.example.com/storage/v1/object/public/photos/${path}`,
}));

// The flag is read at call time, but resetModules keeps each case honest about
// module-level state rather than relying on evaluation order.
const load = async () => {
  vi.resetModules();
  return import('@/lib/imageUrl');
};

describe('buildImageUrl', () => {
  const original = import.meta.env['VITE_IMAGE_TRANSFORM'];

  beforeEach(() => {
    import.meta.env['VITE_IMAGE_TRANSFORM'] = 'true';
  });

  afterEach(() => {
    import.meta.env['VITE_IMAGE_TRANSFORM'] = original;
  });

  it('returns a render URL with width and quality when transforms are enabled', async () => {
    const { buildImageUrl } = await load();
    const url = buildImageUrl('a.jpg', { width: 640, quality: 70 });

    expect(url).toContain('/storage/v1/render/image/public/photos/a.jpg');
    expect(url).toContain('width=640');
    expect(url).toContain('quality=70');
  });

  it('defaults quality to 70 when not supplied', async () => {
    const { buildImageUrl } = await load();
    expect(buildImageUrl('a.jpg', { width: 640 })).toContain('quality=70');
  });

  it('falls back to the original object URL when transforms are disabled', async () => {
    import.meta.env['VITE_IMAGE_TRANSFORM'] = 'false';
    const { buildImageUrl } = await load();
    const url = buildImageUrl('a.jpg', { width: 640 });

    expect(url).toBe('https://cdn.example.com/storage/v1/object/public/photos/a.jpg');
    expect(url).not.toContain('width=');
  });

  it('returns the original URL when no width is requested', async () => {
    const { buildImageUrl } = await load();
    expect(buildImageUrl('a.jpg')).toBe(
      'https://cdn.example.com/storage/v1/object/public/photos/a.jpg'
    );
  });
});

describe('buildImageSrcSet', () => {
  const original = import.meta.env['VITE_IMAGE_TRANSFORM'];

  beforeEach(() => {
    import.meta.env['VITE_IMAGE_TRANSFORM'] = 'true';
  });

  afterEach(() => {
    import.meta.env['VITE_IMAGE_TRANSFORM'] = original;
  });

  it('emits one comma-separated candidate per width with a w descriptor', async () => {
    const { buildImageSrcSet } = await load();
    const parts = buildImageSrcSet('a.jpg', [400, 800]).split(', ');

    expect(parts).toHaveLength(2);
    expect(parts[0]).toContain('width=400');
    expect(parts[0]?.endsWith(' 400w')).toBe(true);
    expect(parts[1]?.endsWith(' 800w')).toBe(true);
  });

  it('returns an empty string when transforms are disabled', async () => {
    import.meta.env['VITE_IMAGE_TRANSFORM'] = 'false';
    const { buildImageSrcSet } = await load();
    expect(buildImageSrcSet('a.jpg', [400, 800])).toBe('');
  });
});
