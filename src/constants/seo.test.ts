import { describe, expect, it } from 'vitest';

import {
  OG_IMAGE_URL,
  SEO_ROUTES,
  SITE_URL,
  resolveRouteSeo,
  type SeoLocale,
} from '@/constants/seo';

describe('seo route table', () => {
  it('exposes the production origin without a trailing slash', () => {
    expect(SITE_URL).toBe('https://henrardvisuals.com');
  });

  it('exposes an absolute Open Graph image URL', () => {
    expect(OG_IMAGE_URL).toBe('https://henrardvisuals.com/og-image.jpg');
  });

  it('covers every application route exactly once', () => {
    expect(SEO_ROUTES.map((route) => route.path).sort()).toEqual([
      '/',
      '/404',
      '/admin',
      '/contact',
    ]);
  });

  it('resolves a known path to its own entry', () => {
    expect(resolveRouteSeo('/contact').out).toBe('contact.html');
    expect(resolveRouteSeo('/').out).toBe('index.html');
  });

  it('falls back to the 404 entry for an unknown path', () => {
    const route = resolveRouteSeo('/does-not-exist');

    expect(route.path).toBe('/404');
    expect(route.noindex).toBe(true);
  });

  it('marks the private and error routes noindex, and the public ones indexable', () => {
    expect(resolveRouteSeo('/admin').noindex).toBe(true);
    expect(resolveRouteSeo('/404').noindex).toBe(true);
    expect(resolveRouteSeo('/').noindex).toBe(false);
    expect(resolveRouteSeo('/contact').noindex).toBe(false);
  });

  it('carries non-empty copy in both locales for every route', () => {
    const locales: SeoLocale[] = ['fr', 'en'];

    for (const route of SEO_ROUTES) {
      for (const locale of locales) {
        expect(route[locale].title.trim(), `${route.path}.${locale}.title`).not.toBe('');
        expect(
          route[locale].description.trim(),
          `${route.path}.${locale}.description`
        ).not.toBe('');
        expect(
          route[locale].ogImageAlt.trim(),
          `${route.path}.${locale}.ogImageAlt`
        ).not.toBe('');
      }
    }
  });

  it('gives every route a distinct title in each locale', () => {
    for (const locale of ['fr', 'en'] as SeoLocale[]) {
      const titles = SEO_ROUTES.map((route) => route[locale].title);
      expect(new Set(titles).size, `duplicate ${locale} titles`).toBe(titles.length);
    }
  });
});
