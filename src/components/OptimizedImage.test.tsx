import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { OptimizedImage } from '@/components/OptimizedImage';

// jsdom has no IntersectionObserver; capture instances so tests can fire them.
const observers: Array<(entries: Partial<IntersectionObserverEntry>[]) => void> = [];

beforeEach(() => {
  observers.length = 0;
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb: (e: Partial<IntersectionObserverEntry>[]) => void) {
        observers.push(cb);
      }
      observe() {}
      disconnect() {}
      unobserve() {}
    }
  );
});

describe('OptimizedImage', () => {
  it('reserves space from width and height before the image loads', () => {
    const { container } = render(
      <OptimizedImage src="/a.jpg" alt="a" width={800} height={1200} />
    );
    const box = container.firstElementChild as HTMLElement;

    expect(box.style.aspectRatio).toBe('800 / 1200');
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('falls back to a portrait ratio when dimensions are unknown', () => {
    const { container } = render(<OptimizedImage src="/a.jpg" alt="a" />);
    expect((container.firstElementChild as HTMLElement).style.aspectRatio).toBe('2 / 3');
  });

  it('renders the image immediately when priority is set', () => {
    render(<OptimizedImage src="/a.jpg" alt="a" priority />);
    const img = screen.getByRole('img');

    expect(img).toHaveAttribute('src', '/a.jpg');
    expect(img).toHaveAttribute('fetchpriority', 'high');
    expect(img).toHaveAttribute('loading', 'eager');
  });

  it('renders the image only after it intersects', () => {
    render(<OptimizedImage src="/a.jpg" alt="a" />);
    expect(screen.queryByRole('img')).toBeNull();

    // React 18 will not flush a state update fired outside act().
    act(() => observers[0]?.([{ isIntersecting: true }]));
    expect(screen.getByRole('img')).toHaveAttribute('src', '/a.jpg');
  });

  it('omits srcset entirely when the value is empty', () => {
    render(<OptimizedImage src="/a.jpg" alt="a" priority srcSet="" />);
    expect(screen.getByRole('img')).not.toHaveAttribute('srcset');
  });

  it('falls back to the original when the transformed variant fails', () => {
    render(
      <OptimizedImage
        src="/a.jpg?width=800"
        fallbackSrc="/a.jpg"
        alt="a"
        priority
        srcSet="/a.jpg?width=400 400w"
      />
    );

    // imgproxy answers 422 for sources above its resolution ceiling, and the
    // JSON body trips ORB — so the element errors and must retry the original.
    fireEvent.error(screen.getByRole('img'));

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', '/a.jpg');
    expect(img).not.toHaveAttribute('srcset');
  });

  it('releases the fallback ratio once loaded so masonry can stagger', () => {
    const { container } = render(<OptimizedImage src="/a.jpg" alt="a" priority />);
    const box = container.firstElementChild as HTMLElement;
    expect(box.style.aspectRatio).toBe('2 / 3');

    fireEvent.load(screen.getByRole('img'));
    expect(box.style.aspectRatio).toBe('');
  });

  it('keeps a known ratio pinned after load', () => {
    const { container } = render(
      <OptimizedImage src="/a.jpg" alt="a" priority width={800} height={1200} />
    );
    fireEvent.load(screen.getByRole('img'));
    expect((container.firstElementChild as HTMLElement).style.aspectRatio).toBe('800 / 1200');
  });

  it('applies srcset and sizes when supplied', () => {
    render(
      <OptimizedImage src="/a.jpg" alt="a" priority srcSet="/a.jpg?w=400 400w" sizes="50vw" />
    );
    const img = screen.getByRole('img');

    expect(img).toHaveAttribute('srcset', '/a.jpg?w=400 400w');
    expect(img).toHaveAttribute('sizes', '50vw');
  });
});
