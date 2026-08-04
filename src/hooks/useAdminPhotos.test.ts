import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRemove = vi.fn();

vi.mock('@/lib/supabase', () => {
  const mockFromFn = vi.fn();
  return {
    supabase: {
      from: mockFromFn,
      rpc: vi.fn().mockResolvedValue({ error: null }),
      storage: { from: () => ({ remove: mockRemove }) },
    },
    // typedFrom delegates to supabase.from — keep them in sync in tests
    typedFrom: vi.fn((table: string) => mockFromFn(table)),
    insertRow: vi.fn().mockResolvedValue({ error: null }),
    updateRow: vi.fn().mockResolvedValue({ error: null }),
  };
});

import { useAdminPhotos } from './useAdminPhotos';

import { supabase, updateRow } from '@/lib/supabase';
import type { Photo, UploadedFile } from '@/types';

const mockFrom = supabase.from as ReturnType<typeof vi.fn>;
const mockRpc = supabase.rpc as unknown as ReturnType<typeof vi.fn>;
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
    insert: vi.fn().mockResolvedValue({ error: null }),
    delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    update: vi.fn().mockReturnValue({ neq: vi.fn().mockResolvedValue({ error: null }) }),
  };
}

function setupMocks(photos: Photo[] = []) {
  mockFrom.mockImplementation((table: string) => buildOrderChain(table === 'photos' ? photos : []));
}

const makeUpload = (overrides: Partial<UploadedFile> = {}): UploadedFile => ({
  name: 'photo.jpg',
  path: 'photos/photo.jpg',
  size: 1024,
  publicUrl: '',
  width: null,
  height: null,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockRemove.mockResolvedValue({ error: null });
  mockRpc.mockResolvedValue({ error: null });
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

  it('saveUploadedFiles inserts the whole batch in one round trip', async () => {
    const chain = buildOrderChain([]);
    mockFrom.mockImplementation(() => chain);

    const { result } = renderHook(() => useAdminPhotos());
    await waitFor(() => expect(result.current.loadingPhotos).toBe(false));

    await act(async () => {
      await result.current.saveUploadedFiles([
        makeUpload({ path: 'photos/a.jpg', width: 800, height: 1200 }),
        makeUpload({ path: 'photos/b.jpg' }),
      ]);
    });

    expect(chain.insert).toHaveBeenCalledTimes(1);
    expect(chain.insert).toHaveBeenCalledWith([
      expect.objectContaining({ storage_path: 'photos/a.jpg', width: 800, height: 1200 }),
      expect.objectContaining({ storage_path: 'photos/b.jpg', width: null, height: null }),
    ]);
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

  it('deletePhoto removes the storage object before the row', async () => {
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

    expect(mockRemove).toHaveBeenCalledWith(['photos/1.jpg']);
    expect(deleteEq).toHaveBeenCalledWith('id', '1');
  });

  it('deletePhoto keeps the row when the storage delete fails', async () => {
    const photo = makePhoto('1');
    const deleteEq = vi.fn().mockResolvedValue({ error: null });
    mockRemove.mockResolvedValue({ error: new Error('storage down') });

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

    expect(deleteEq).not.toHaveBeenCalled();
    expect(result.current.message).toMatchObject({ type: 'error' });
  });

  it('toggleHero promotes through the atomic RPC', async () => {
    const photo = makePhoto('1', { is_hero: false });
    const { result } = renderHook(() => useAdminPhotos());
    await waitFor(() => expect(result.current.loadingPhotos).toBe(false));

    await act(async () => {
      await result.current.toggleHero(photo);
    });

    expect(mockRpc).toHaveBeenCalledWith('set_hero_photo', { target_id: '1' });
    expect(mockUpdateRow).not.toHaveBeenCalled();
  });

  it('toggleHero demotes the current hero with a plain update', async () => {
    const photo = makePhoto('1', { is_hero: true });
    const { result } = renderHook(() => useAdminPhotos());
    await waitFor(() => expect(result.current.loadingPhotos).toBe(false));

    await act(async () => {
      await result.current.toggleHero(photo);
    });

    expect(mockUpdateRow).toHaveBeenCalledWith('photos', '1', { is_hero: false });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('message is cleared after timeout', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { result } = renderHook(() => useAdminPhotos());
    await waitFor(() => expect(result.current.loadingPhotos).toBe(false));

    const files: UploadedFile[] = [
      makeUpload({ name: 'p.jpg', path: 'photos/p.jpg', size: 100 }),
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
