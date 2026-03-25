import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { useLightbox } from './useLightbox';

import type { Photo } from '@/types';

const makePhoto = (id: string): Photo =>
  ({
    id,
    title: `Photo ${id}`,
    storage_path: `photos/${id}.jpg`,
    is_published: true,
    is_hero: false,
    sort_order: 0,
    description: null,
    category: null,
    thumbnail_path: null,
    width: null,
    height: null,
    file_size: null,
    mime_type: null,
    metadata: {},
    created_at: '',
    updated_at: '',
  }) as Photo;

const PHOTOS = [makePhoto('a'), makePhoto('b'), makePhoto('c')];

describe('useLightbox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Remove any stale event listeners
    vi.restoreAllMocks();
  });

  it('starts with no selected photo', () => {
    const { result } = renderHook(() => useLightbox(PHOTOS));
    expect(result.current.selectedPhoto).toBeNull();
  });

  it('setSelectedPhoto updates selected photo', () => {
    const { result } = renderHook(() => useLightbox(PHOTOS));
    act(() => {
      result.current.setSelectedPhoto(PHOTOS[0]);
    });
    expect(result.current.selectedPhoto).toEqual(PHOTOS[0]);
  });

  it('closeModal sets selected photo to null', () => {
    const { result } = renderHook(() => useLightbox(PHOTOS));
    act(() => {
      result.current.setSelectedPhoto(PHOTOS[1]);
    });
    act(() => {
      result.current.closeModal();
    });
    expect(result.current.selectedPhoto).toBeNull();
  });

  it('goToNextPhoto advances to the next photo', () => {
    const { result } = renderHook(() => useLightbox(PHOTOS));
    act(() => {
      result.current.setSelectedPhoto(PHOTOS[0]);
    });
    act(() => {
      result.current.goToNextPhoto();
    });
    expect(result.current.selectedPhoto).toEqual(PHOTOS[1]);
  });

  it('goToNextPhoto wraps around to the first photo', () => {
    const { result } = renderHook(() => useLightbox(PHOTOS));
    act(() => {
      result.current.setSelectedPhoto(PHOTOS[2]);
    });
    act(() => {
      result.current.goToNextPhoto();
    });
    expect(result.current.selectedPhoto).toEqual(PHOTOS[0]);
  });

  it('goToPreviousPhoto goes to the previous photo', () => {
    const { result } = renderHook(() => useLightbox(PHOTOS));
    act(() => {
      result.current.setSelectedPhoto(PHOTOS[2]);
    });
    act(() => {
      result.current.goToPreviousPhoto();
    });
    expect(result.current.selectedPhoto).toEqual(PHOTOS[1]);
  });

  it('goToPreviousPhoto wraps around to the last photo', () => {
    const { result } = renderHook(() => useLightbox(PHOTOS));
    act(() => {
      result.current.setSelectedPhoto(PHOTOS[0]);
    });
    act(() => {
      result.current.goToPreviousPhoto();
    });
    expect(result.current.selectedPhoto).toEqual(PHOTOS[2]);
  });

  it('Escape key closes the modal', () => {
    const { result } = renderHook(() => useLightbox(PHOTOS));
    act(() => {
      result.current.setSelectedPhoto(PHOTOS[0]);
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(result.current.selectedPhoto).toBeNull();
  });

  it('ArrowRight key advances to next photo', () => {
    const { result } = renderHook(() => useLightbox(PHOTOS));
    act(() => {
      result.current.setSelectedPhoto(PHOTOS[0]);
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    });
    expect(result.current.selectedPhoto).toEqual(PHOTOS[1]);
  });

  it('ArrowLeft key goes to previous photo', () => {
    const { result } = renderHook(() => useLightbox(PHOTOS));
    act(() => {
      result.current.setSelectedPhoto(PHOTOS[2]);
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    });
    expect(result.current.selectedPhoto).toEqual(PHOTOS[1]);
  });

  it('keyboard listener is not active when no photo is selected', () => {
    const { result } = renderHook(() => useLightbox(PHOTOS));
    // No photo selected; ArrowRight should not throw or change state.
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    });
    expect(result.current.selectedPhoto).toBeNull();
  });

  it('removes keyboard listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { result, unmount } = renderHook(() => useLightbox(PHOTOS));
    act(() => {
      result.current.setSelectedPhoto(PHOTOS[0]);
    });
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });
});
