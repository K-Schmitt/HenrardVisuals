import { act, render, screen } from '@testing-library/react';
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

  it('applies srcset and sizes when supplied', () => {
    render(
      <OptimizedImage src="/a.jpg" alt="a" priority srcSet="/a.jpg?w=400 400w" sizes="50vw" />
    );
    const img = screen.getByRole('img');

    expect(img).toHaveAttribute('srcset', '/a.jpg?w=400 400w');
    expect(img).toHaveAttribute('sizes', '50vw');
  });
});
