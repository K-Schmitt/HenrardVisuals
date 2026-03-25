import { renderHook, waitFor } from '@testing-library/react';
import { act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Thenable + fully chainable mock for Supabase query builders.
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

import { useHomeData, PAGE_SIZE } from './useHomeData';
import { supabase } from '@/lib/supabase';
import { DEFAULT_PROFILE_SETTINGS } from '@/constants/profileDefaults';
import type { Photo, Category } from '@/types';

const mockFrom = supabase.from as ReturnType<typeof vi.fn>;

const makePhoto = (id: string, overrides: Partial<Photo> = {}): Photo =>
  ({ id, title: `Photo ${id}`, storage_path: `photos/${id}.jpg`, is_published: true,
     is_hero: false, sort_order: 0, description: null, category: null,
     thumbnail_path: null, width: null, height: null, file_size: null,
     mime_type: null, metadata: {}, created_at: '', updated_at: '', ...overrides }) as Photo;

const makeCategory = (id: string, slug: string): Category =>
  ({ id, name: `Category ${id}`, slug, description: null,
     cover_photo_id: null, sort_order: 0, created_at: '' }) as Category;

function makeRangeQuery(photos: Photo[], count: number, error: Error | null) {
  const resolved = { data: error ? null : photos, count, error };
  const p = Promise.resolve(resolved);
  return { then: p.then.bind(p), catch: p.catch.bind(p), finally: p.finally.bind(p) };
}

function setupMocks({
  photos = [] as Photo[],
  photosCount = 0,
  categories = [] as Category[],
  heroPhoto = null as Photo | null,
  settingsData = null as { value: unknown } | null,
  photosError = null as Error | null,
} = {}) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'site_settings') return createQueryMock({ data: settingsData, error: null });
    if (table === 'categories') return createQueryMock({ data: categories, error: null });
    if (table === 'photos') {
      const chain: Record<string, unknown> = {};
      // maybeSingle() — used for hero fetch
      chain['maybeSingle'] = vi.fn().mockReturnValue(createQueryMock({ data: heroPhoto, error: null }));
      // range() — used for paginated fetch
      chain['range'] = vi.fn().mockReturnValue(makeRangeQuery(photos, photosCount, photosError));
      for (const m of ['select', 'eq', 'neq', 'order']) {
        chain[m] = vi.fn().mockReturnValue(chain);
      }
      return chain;
    }
    return createQueryMock({ data: null, error: null });
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  setupMocks();
});

describe('useHomeData', () => {
  it('starts in loading state', () => {
    const { result } = renderHook(() => useHomeData());
    expect(result.current.isLoading).toBe(true);
  });

  it('resolves photos and totalCount after fetch', async () => {
    const photos = [makePhoto('1'), makePhoto('2')];
    setupMocks({ photos, photosCount: 2 });

    const { result } = renderHook(() => useHomeData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.photos).toHaveLength(2);
    expect(result.current.totalCount).toBe(2);
  });

  it('falls back to DEFAULT_PROFILE_SETTINGS when no settings in DB', async () => {
    const { result } = renderHook(() => useHomeData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.profileSettings).toEqual(DEFAULT_PROFILE_SETTINGS);
  });

  it('sets error state when photos query fails', async () => {
    setupMocks({ photosError: new Error('Network error') });
    const { result } = renderHook(() => useHomeData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('Network error');
  });

  it('currentPage starts at 0 and pageSize equals PAGE_SIZE', async () => {
    const { result } = renderHook(() => useHomeData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.currentPage).toBe(0);
    expect(result.current.pageSize).toBe(PAGE_SIZE);
  });

  it('setActiveFilter resets currentPage to 0', async () => {
    setupMocks({ categories: [makeCategory('cat1', 'editorial')] });
    const { result } = renderHook(() => useHomeData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setCurrentPage(1));
    expect(result.current.currentPage).toBe(1);

    act(() => result.current.setActiveFilter('editorial'));
    expect(result.current.currentPage).toBe(0);
    expect(result.current.activeFilter).toBe('editorial');
  });

  it('setActiveFilter falls back to "All" for unknown slugs', async () => {
    const { result } = renderHook(() => useHomeData()); // no categories loaded
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setActiveFilter('unknown-slug'));
    expect(result.current.activeFilter).toBe('All');
  });

  it('loads categories from DB', async () => {
    const categories = [makeCategory('cat1', 'editorial'), makeCategory('cat2', 'runway')];
    setupMocks({ categories });
    const { result } = renderHook(() => useHomeData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.categories).toHaveLength(2);
  });
});
