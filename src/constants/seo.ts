import table from './seo.routes.json';

/**
 * Per-route metadata, in one place, read by two consumers: the `useSeo` hook
 * at runtime and `scripts/prerender.mjs` at build time. It lives in JSON
 * rather than TypeScript precisely so the build script — plain Node, no
 * transpiler — can read it without a second copy drifting out of sync.
 */

export type SeoLocale = 'fr' | 'en';

export interface RouteCopy {
  title: string;
  description: string;
  ogImageAlt: string;
}

export interface SeoRoute {
  /** Router path. `/404` is the synthetic entry for anything unmatched. */
  path: string;
  /** Filename the prerender step writes into `dist/`. */
  out: string;
  noindex: boolean;
  sitemap: { changefreq: string; priority: string };
  fr: RouteCopy;
  en: RouteCopy;
}

export const SITE_URL: string = table.siteUrl;
export const OG_IMAGE_URL = `${table.siteUrl}${table.ogImage}`;
export const OG_IMAGE_WIDTH: number = table.ogImageWidth;
export const OG_IMAGE_HEIGHT: number = table.ogImageHeight;
export const SEO_ROUTES = table.routes as SeoRoute[];

const NOT_FOUND_ROUTE = SEO_ROUTES.find((route) => route.path === '/404') as SeoRoute;

/**
 * Unknown paths resolve to the 404 entry, which mirrors the router: every
 * path that is not one of the three real routes renders the NotFound view.
 */
export function resolveRouteSeo(pathname: string): SeoRoute {
  return SEO_ROUTES.find((route) => route.path === pathname) ?? NOT_FOUND_ROUTE;
}

/** Absolute canonical URL for a route. */
export function canonicalUrlFor(route: SeoRoute): string {
  return `${SITE_URL}${route.path}`;
}
