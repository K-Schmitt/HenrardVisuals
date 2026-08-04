import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const upload = vi.fn();
const getPublicUrl = vi.fn(() => ({ data: { publicUrl: 'https://cdn/x' } }));

// The hook reads its fallback error copy through useLanguage.
vi.mock('@/context/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', setLanguage: vi.fn(), t: (key: string) => key }),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: { storage: { from: () => ({ upload, getPublicUrl }) } },
}));

// Imported after vi.mock so the hook resolves the mocked module.
import { useFileUpload } from '@/hooks/useFileUpload';

const jpeg = () => new File(['x'], 'DSC_0001.jpg', { type: 'image/jpeg' });

beforeEach(() => {
  upload.mockReset().mockResolvedValue({ data: { path: 'p' }, error: null });
  vi.stubGlobal('crypto', { randomUUID: () => '11111111-2222-3333-4444-555555555555' });

  // jsdom hands out object URLs but never decodes them, so neither onload nor
  // onerror fires and readDimensions would sit on its timeout. Resolve the
  // decode immediately with a failure — the upload must proceed regardless,
  // which is exactly what these cases assert.
  vi.stubGlobal(
    'Image',
    class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      naturalWidth = 0;
      naturalHeight = 0;
      set src(_value: string) {
        queueMicrotask(() => this.onerror?.());
      }
    }
  );
});

describe('useFileUpload', () => {
  it('prefixes the stored path with a UUID, not a timestamp', async () => {
    const { result } = renderHook(() => useFileUpload({}));
    await act(async () => {
      await result.current.processFiles([jpeg()]);
    });

    const storedPath = upload.mock.calls[0]?.[0] as string;
    expect(storedPath).toMatch(/^11111111-2222-3333-4444-555555555555-DSC_0001\.jpg$/);
    expect(storedPath).not.toMatch(/^\d{13}-/);
  });

  it('rejects a forged MIME type that merely contains an allowed one', async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useFileUpload({ onError }));
    const forged = new File(['x'], 'e.html', { type: 'xximage/jpegyy' });

    await act(async () => {
      await result.current.processFiles([forged]);
    });

    expect(upload).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
  });

  it('accepts an exactly-matching MIME type', async () => {
    const { result } = renderHook(() => useFileUpload({}));
    await act(async () => {
      await result.current.processFiles([jpeg()]);
    });

    expect(upload).toHaveBeenCalledTimes(1);
  });
});
