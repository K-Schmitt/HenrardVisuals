import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/supabase', () => {
  const mockFromFn = vi.fn();
  return {
    supabase: { from: mockFromFn },
    // typedFrom delegates to supabase.from — keep them in sync in tests
    typedFrom: vi.fn((table: string) => mockFromFn(table)),
    insertRow: vi.fn().mockResolvedValue({ error: null }),
    updateRow: vi.fn().mockResolvedValue({ error: null }),
  };
});

import { useAdminPhotos } from './useAdminPhotos';
import { supabase, insertRow, updateRow } from '@/lib/supabase';
import type { Photo, UploadedFile } from '@/types';

const mockFrom = supabase.from as ReturnType<typeof vi.fn>;
const mockInsertRow = insertRow as ReturnType<typeof vi.fn>;
const mockUpdateRow = updateRow as ReturnType<typeof vi.fn>;

const makePhoto = (id: string, overrides: Partial<Photo> = {}): Photo =>
  ({ id, title: `Photo ${id}`, storage_path: `photos/${id}.jpg`,
     is_published: false, is_hero: false, sort_order: 0, description: null,
     category: null, thumbnail_path: null, width: null, height: null,
     file_size: null, mime_type: null, metadata: {}, created_at: '', updated_at: '',
     ...overrides }) as Photo;

function buildOrderChain(data: unknown[]) {
  return {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data, error: null }),
    delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    update: vi.fn().mockReturnValue({ neq: vi.fn().mockResolvedValue({ error: null }) }),
  };
}

function setupMocks(photos: Photo[] = []) {
  mockFrom.mockImplementation((table: string) => buildOrderChain(table === 'photos' ? photos : []));
}

beforeEach(() => {
  vi.clearAllMocks();
  setupMocks();
});

describe('useAdminPhotos', () => {
  it('fetches photos and categories on mount', async () => {
    const photos = [makePhoto('1'), makePhoto('2')];
    setupMocks(photos);

    const { result } = renderHook(() => useAdminPhotos());
    await waitFor(() => expect(result.current.loadingPhotos).toBe(false));
    expect(result.current.photos).toHaveLength(2);
  });

  it('saveUploadedFiles calls insertRow for each file', async () => {
    const { result } = renderHook(() => useAdminPhotos());
    await waitFor(() => expect(result.current.loadingPhotos).toBe(false));

    const files: UploadedFile[] = [
      { name: 'photo.jpg', path: 'photos/photo.jpg', size: 1024, publicUrl: '' },
    ];

    await act(async () => {
      await result.current.saveUploadedFiles(files);
    });

    expect(mockInsertRow).toHaveBeenCalledWith(
      'photos',
      expect.objectContaining({ storage_path: 'photos/photo.jpg', is_published: false })
    );
    expect(result.current.message).toMatchObject({ type: 'success' });
  });

  it('togglePublish calls updateRow with inverted is_published', async () => {
    const photo = makePhoto('1', { is_published: false });
    const { result } = renderHook(() => useAdminPhotos());
    await waitFor(() => expect(result.current.loadingPhotos).toBe(false));

    await act(async () => {
      await result.current.togglePublish(photo);
    });

    expect(mockUpdateRow).toHaveBeenCalledWith('photos', '1', { is_published: true });
  });

  it('deletePhoto calls delete on the DB (confirmation handled by PhotoCard)', async () => {
    const photo = makePhoto('1');
    const deleteEq = vi.fn().mockResolvedValue({ error: null });

    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      delete: vi.fn().mockReturnValue({ eq: deleteEq }),
      update: vi.fn().mockReturnValue({ neq: vi.fn().mockResolvedValue({ error: null }) }),
    }));

    const { result } = renderHook(() => useAdminPhotos());
    await waitFor(() => expect(result.current.loadingPhotos).toBe(false));

    await act(async () => {
      await result.current.deletePhoto(photo);
    });

    expect(deleteEq).toHaveBeenCalledWith('id', '1');
  });

  it('toggleHero calls updateRow to set is_hero', async () => {
    const photo = makePhoto('1', { is_hero: false });
    const { result } = renderHook(() => useAdminPhotos());
    await waitFor(() => expect(result.current.loadingPhotos).toBe(false));

    await act(async () => {
      await result.current.toggleHero(photo);
    });

    expect(mockUpdateRow).toHaveBeenCalledWith('photos', '1', { is_hero: true });
  });

  it('message is cleared after timeout', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { result } = renderHook(() => useAdminPhotos());
    await waitFor(() => expect(result.current.loadingPhotos).toBe(false));

    const files: UploadedFile[] = [
      { name: 'p.jpg', path: 'photos/p.jpg', size: 100, publicUrl: '' },
    ];

    await act(async () => {
      await result.current.saveUploadedFiles(files);
    });

    expect(result.current.message).not.toBeNull();

    act(() => { vi.runAllTimers(); });
    expect(result.current.message).toBeNull();

    vi.useRealTimers();
  });
});
