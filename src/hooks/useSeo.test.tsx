import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { LanguageProvider } from '@/context/LanguageContext';
import { useSeo } from '@/hooks/useSeo';

const wrapperFor = (path: string) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[path]}>
        <LanguageProvider>{children}</LanguageProvider>
      </MemoryRouter>
    );
  };

const mountAt = (path: string) => renderHook(() => useSeo(), { wrapper: wrapperFor(path) });

const metaContent = (selector: string): string | null =>
  document.head.querySelector<HTMLMetaElement>(selector)?.content ?? null;

const canonicalHref = (): string | null =>
  document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ?? null;

describe('useSeo', () => {
  beforeEach(() => {
    localStorage.clear();
    document.head.querySelectorAll('meta, link[rel="canonical"]').forEach((el) => el.remove());
    document.title = '';
  });

  it('sets the French title and description for the home route', () => {
    mountAt('/');

    expect(document.title).toBe('Tristan Henrard — Portfolio mannequin | HenrardVisuals');
    expect(metaContent('meta[name="description"]')).toContain('Portfolio de Tristan Henrard');
    expect(document.documentElement.lang).toBe('fr');
  });

  it('gives the contact route its own title, canonical and og:url', () => {
    mountAt('/contact');

    expect(document.title).toBe('Contact — Tristan Henrard | HenrardVisuals');
    expect(canonicalHref()).toBe('https://henrardvisuals.com/contact');
    expect(metaContent('meta[property="og:url"]')).toBe('https://henrardvisuals.com/contact');
  });

  it('mirrors title and description onto the Open Graph and Twitter tags', () => {
    mountAt('/contact');

    const title = 'Contact — Tristan Henrard | HenrardVisuals';
    expect(metaContent('meta[property="og:title"]')).toBe(title);
    expect(metaContent('meta[name="twitter:title"]')).toBe(title);
    expect(metaContent('meta[property="og:description"]')).toBe(
      metaContent('meta[name="twitter:description"]')
    );
  });

  it('advertises the shared share image with dimensions and alt text', () => {
    mountAt('/');

    expect(metaContent('meta[property="og:image"]')).toBe(
      'https://henrardvisuals.com/og-image.jpg'
    );
    expect(metaContent('meta[name="twitter:image"]')).toBe(
      'https://henrardvisuals.com/og-image.jpg'
    );
    expect(metaContent('meta[property="og:image:width"]')).toBe('1200');
    expect(metaContent('meta[property="og:image:height"]')).toBe('630');
    expect(metaContent('meta[property="og:image:alt"]')).toContain('Tristan Henrard');
    expect(metaContent('meta[name="twitter:card"]')).toBe('summary_large_image');
  });

  it('marks the admin route noindex and publishes no canonical for it', () => {
    mountAt('/admin');

    expect(metaContent('meta[name="robots"]')).toBe('noindex, nofollow');
    expect(canonicalHref()).toBeNull();
  });

  it('falls back to the 404 metadata for an unmatched path', () => {
    mountAt('/no-such-page');

    expect(document.title).toBe('Page non trouvée | HenrardVisuals');
    expect(metaContent('meta[name="robots"]')).toBe('noindex, nofollow');
    expect(canonicalHref()).toBeNull();
  });

  it('drops a stale robots tag when moving from a noindex route to an indexable one', () => {
    mountAt('/admin');
    expect(metaContent('meta[name="robots"]')).toBe('noindex, nofollow');

    mountAt('/');
    expect(metaContent('meta[name="robots"]')).toBeNull();
    expect(canonicalHref()).toBe('https://henrardvisuals.com/');
  });

  it('uses the English copy and locale when the stored language is English', () => {
    localStorage.setItem('language', 'en');

    mountAt('/contact');

    expect(document.title).toBe('Contact — Tristan Henrard | HenrardVisuals');
    expect(metaContent('meta[name="description"]')).toContain('Get in touch');
    expect(metaContent('meta[property="og:locale"]')).toBe('en_GB');
    expect(document.documentElement.lang).toBe('en');
  });
});
