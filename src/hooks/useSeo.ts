import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import {
  OG_IMAGE_HEIGHT,
  OG_IMAGE_URL,
  OG_IMAGE_WIDTH,
  canonicalUrlFor,
  resolveRouteSeo,
} from '@/constants/seo';
import { useLanguage } from '@/context/LanguageContext';

const upsertMeta = (attr: 'name' | 'property', key: string, content: string): void => {
  const selector = `meta[${attr}="${key}"]`;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
};

const upsertCanonical = (href: string): void => {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
};

const removeIfPresent = (selector: string): void => {
  document.head.querySelector(selector)?.remove();
};

/**
 * Rewrites the whole document head for the active route and locale.
 *
 * Mounted once, in SiteLayout, which wraps every route — so there is exactly
 * one writer and no ordering question between a page's effect and the
 * layout's. The route table, not the caller, decides the copy.
 *
 * This runs after hydration, so it is not what feeds a link preview: the
 * static file emitted by scripts/prerender.mjs is. What this fixes is the
 * browser tab, the bookmark title, the screen-reader page announcement, the
 * canonical URL a JS-executing crawler reads, and documentElement.lang on a
 * bilingual site whose language otherwise lives only in localStorage.
 */
export function useSeo(): void {
  const { language } = useLanguage();
  const { pathname } = useLocation();

  useEffect(() => {
    const route = resolveRouteSeo(pathname);
    const copy = route[language];
    const canonical = canonicalUrlFor(route);

    document.title = copy.title;
    document.documentElement.lang = language;

    upsertMeta('name', 'description', copy.description);

    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:title', copy.title);
    upsertMeta('property', 'og:description', copy.description);
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('property', 'og:locale', language === 'fr' ? 'fr_FR' : 'en_GB');
    upsertMeta('property', 'og:locale:alternate', language === 'fr' ? 'en_GB' : 'fr_FR');
    upsertMeta('property', 'og:image', OG_IMAGE_URL);
    upsertMeta('property', 'og:image:alt', copy.ogImageAlt);
    upsertMeta('property', 'og:image:width', String(OG_IMAGE_WIDTH));
    upsertMeta('property', 'og:image:height', String(OG_IMAGE_HEIGHT));

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', copy.title);
    upsertMeta('name', 'twitter:description', copy.description);
    upsertMeta('name', 'twitter:image', OG_IMAGE_URL);
    upsertMeta('name', 'twitter:image:alt', copy.ogImageAlt);

    // A canonical on a noindex page is a contradiction: it nominates the page
    // as the preferred version of itself while asking for it to be dropped.
    if (route.noindex) {
      upsertMeta('name', 'robots', 'noindex, nofollow');
      removeIfPresent('link[rel="canonical"]');
    } else {
      removeIfPresent('meta[name="robots"]');
      upsertCanonical(canonical);
    }
  }, [language, pathname]);
}
