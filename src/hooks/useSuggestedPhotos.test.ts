import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

function createQueryMock(resolvedValue: unknown) {
  const p = Promise.resolve(resolvedValue);
  const mock: Record<string, unknown> = {
    then: p.then.bind(p),
    catch: p.catch.bind(p),
    finally: p.finally.bind(p),
  };
  for (const m of ['select', 'eq', 'neq', 'order', 'range', 'maybeSingle', 'single', 'limit']) {
    mock[m] = vi.fn().mockReturnValue(mock);
  }
  return mock;
}

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));

import { useSuggestedPhotos } from './useSuggestedPhotos';

import { supabase } from '@/lib/supabase';
import type { Category, Photo } from '@/types';

const mockFrom = supabase.from as ReturnType<typeof vi.fn>;

const makePhoto = (id: string, overrides: Partial<Photo> = {}): Photo =>
  ({
    id,
    title: `Photo ${id}`,
    storage_path: `photos/${id}.jpg`,
    category: null,
    shot_location: null,
    shot_year: null,
    width: null,
    height: null,
    ...overrides,
  }) as Photo;

const makeCategory = (slug: string, name: string): Category =>
  ({ id: slug, name, slug, sort_order: 0 }) as Category;

function setupMocks({
  photos = [] as Photo[],
  categories = [] as Category[],
  photosError = null as Error | null,
}) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'categories') return createQueryMock({ data: categories, error: null });
    return createQueryMock({ data: photosError ? null : photos, error: photosError });
  });
}

describe('useSuggestedPhotos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts empty', () => {
    setupMocks({});

    const { result } = renderHook(() => useSuggestedPhotos());

    expect(result.current).toEqual([]);
  });

  it('numbers the plates from one, in the order returned', async () => {
    setupMocks({ photos: [makePhoto('a'), makePhoto('b'), makePhoto('c')] });

    const { result } = renderHook(() => useSuggestedPhotos());

    await waitFor(() => expect(result.current).toHaveLength(3));
    expect(result.current.map((plate) => plate.number)).toEqual([1, 2, 3]);
    expect(result.current[0]?.photo.id).toBe('a');
  });

  it('resolves the category slug to its display name', async () => {
    setupMocks({
      photos: [makePhoto('a', { category: 'editorial' })],
      categories: [makeCategory('editorial', 'Éditorial')],
    });

    const { result } = renderHook(() => useSuggestedPhotos());

    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(result.current[0]?.categoryName).toBe('Éditorial');
  });

  it('leaves the category null when the slug matches nothing', async () => {
    setupMocks({ photos: [makePhoto('a', { category: 'gone' })], categories: [] });

    const { result } = renderHook(() => useSuggestedPhotos());

    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(result.current[0]?.categoryName).toBeNull();
  });

  it('stays empty when the query fails, rather than surfacing the error', async () => {
    setupMocks({ photosError: new Error('network down') });

    const { result } = renderHook(() => useSuggestedPhotos());

    await waitFor(() => expect(mockFrom).toHaveBeenCalled());
    expect(result.current).toEqual([]);
  });
});
