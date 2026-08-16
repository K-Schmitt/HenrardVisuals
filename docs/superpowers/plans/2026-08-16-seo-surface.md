# SEO Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every route its own title, description, canonical URL and social-share card — visible to crawlers that do not run JavaScript — and make the 404 a real, designed, `noindex` page that answers HTTP 404.

**Architecture:** The 404 page is built from the design doc's own screen for it (direction 1a, screen 2a "LA PLANCHE MANQUANTE"), not invented. One JSON table (`src/constants/seo.routes.json`) is the single source of truth for per-route metadata in both locales. A typed accessor (`src/constants/seo.ts`) feeds a `useSeo()` hook mounted once in `SiteLayout`, which rewrites the whole head on every route change. A post-build Node script (`scripts/prerender.mjs`) reads the same table and emits one static HTML file per route plus the sitemap, so non-JS consumers see the right tags. nginx serves those files by path and returns a real 404 for anything else.

**Tech Stack:** React 18 + react-router-dom 7, Vite 8, TypeScript 5.3 (strict), Tailwind 3.4, i18next, Vitest 4, Playwright, nginx:alpine.

**Spec:** [docs/superpowers/specs/2026-08-16-seo-surface.md](../specs/2026-08-16-seo-surface.md)

**Design source:** Claude Design project `75bdfafd-e9b5-4ea3-a175-a1832a3bac55`,
file `Refonte HenrardVisuals.dc.html`, **section 2 → option `2a` — "404 — LA
PLANCHE MANQUANTE"**, which belongs to direction **1a "Le Book"**. Read it with
`DesignSync` (`method: get_file`). Direction **1b "PLANCHE CONTACT"** is in the
same document and is **rejected** — ignore every screen belonging to it. Tasks 3
and 4 transcribe 2a's values into tables; those tables are authoritative for
this plan, so no task requires re-reading the doc.

## Global Constraints

- Site origin is exactly `https://henrardvisuals.com` (no trailing slash in the constant).
- Shared OG image is `/og-image.jpg`, 1200×630. Do not add per-route artwork.
- Default locale `fr` → `og:locale` `fr_FR`; alternate `en` → `en_GB`.
- **Commits use Conventional Commits** (`<type>(<scope>): <imperative summary>`, ≤72 chars, no trailing period).
- **NEVER add AI attribution** to any commit message, PR title or PR body — no `Co-Authored-By: Claude`, no `Generated with Claude Code`. This is absolute.
- `pnpm check` (`tsc --noEmit && eslint src --ext .ts,.tsx`) must pass at the end of every task. `noUnusedLocals` and `noUnusedParameters` are on.
- Import order is enforced by `eslint-plugin-import`: external packages first, then `@/` paths, alphabetical within each group, blank line between groups.
- `pnpm test` must pass, including the coverage thresholds declared in `vite.config.ts` (statements 50, branches 35, functions 40, lines 50). **Never lower a threshold to make a build pass.**
- `src/i18n/parity.test.ts` enforces identical key sets in `fr.ts` and `en.ts` and forbids empty values. Every key added to one locale must be added to the other.
- Styling uses only the LE BOOK tokens already in `tailwind.config.js` (`ink`, `bone`, `bone-muted`, `bone-faint`, `bone-hair`, `vermillon`, `font-display`, `text-display`, `text-display-sm`, `micro-caps`, `caption-caps`, `animate-rise`). No new colours, no rounded corners.
- Routes are exactly: `/`, `/contact`, `/admin` (noindex), 404 (noindex).
- The 404's visual design is **fixed by the doc**. Do not redesign it, do not
  substitute a direction-1b treatment, and do not drop elements (corner marks,
  crosshair, struck-through caption, three exits) for being fiddly.

---

### Task 1: Route metadata table and typed accessor

The single source of truth. Everything downstream reads this. JSON rather than
TypeScript because `scripts/prerender.mjs` is a plain Node script and cannot
import a `.ts` module; `resolveJsonModule` is already enabled in
`tsconfig.json`, so the app side stays typed.

**Files:**
- Create: `src/constants/seo.routes.json`
- Create: `src/constants/seo.ts`
- Test: `src/constants/seo.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `SITE_URL: string` — `'https://henrardvisuals.com'`
  - `OG_IMAGE_URL: string` — absolute URL of the shared card image
  - `OG_IMAGE_WIDTH: number`, `OG_IMAGE_HEIGHT: number`
  - `SEO_ROUTES: SeoRoute[]`
  - `resolveRouteSeo(pathname: string): SeoRoute`
  - `type SeoLocale = 'fr' | 'en'`
  - `interface RouteCopy { title: string; description: string; ogImageAlt: string }`
  - `interface SeoRoute { path: string; out: string; noindex: boolean; sitemap: { changefreq: string; priority: string }; fr: RouteCopy; en: RouteCopy }`

- [ ] **Step 1: Write the failing test**

Create `src/constants/seo.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/constants/seo.test.ts`
Expected: FAIL — `Failed to resolve import "@/constants/seo"`.

- [ ] **Step 3: Create the route table**

Create `src/constants/seo.routes.json`:

```json
{
  "siteUrl": "https://henrardvisuals.com",
  "ogImage": "/og-image.jpg",
  "ogImageWidth": 1200,
  "ogImageHeight": 630,
  "routes": [
    {
      "path": "/",
      "out": "index.html",
      "noindex": false,
      "sitemap": { "changefreq": "weekly", "priority": "1.0" },
      "fr": {
        "title": "Tristan Henrard — Portfolio mannequin | HenrardVisuals",
        "description": "Portfolio de Tristan Henrard, mannequin éditorial et mode basé en France. Mensurations, biographie et travaux sélectionnés.",
        "ogImageAlt": "Tristan Henrard, portrait éditorial en noir et blanc"
      },
      "en": {
        "title": "Tristan Henrard — Model Portfolio | HenrardVisuals",
        "description": "Portfolio of Tristan Henrard, editorial and fashion model based in France. Measurements, biography and selected work.",
        "ogImageAlt": "Tristan Henrard, black and white editorial portrait"
      }
    },
    {
      "path": "/contact",
      "out": "contact.html",
      "noindex": false,
      "sitemap": { "changefreq": "monthly", "priority": "0.6" },
      "fr": {
        "title": "Contact — Tristan Henrard | HenrardVisuals",
        "description": "Pour un booking, une collaboration ou un projet photographique : coordonnées et délai de réponse de Tristan Henrard.",
        "ogImageAlt": "Tristan Henrard, portrait éditorial en noir et blanc"
      },
      "en": {
        "title": "Contact — Tristan Henrard | HenrardVisuals",
        "description": "Get in touch for bookings, collaborations and photographic projects: contact details and response time for Tristan Henrard.",
        "ogImageAlt": "Tristan Henrard, black and white editorial portrait"
      }
    },
    {
      "path": "/admin",
      "out": "admin.html",
      "noindex": true,
      "sitemap": { "changefreq": "never", "priority": "0.0" },
      "fr": {
        "title": "Administration | HenrardVisuals",
        "description": "Espace d’administration privé.",
        "ogImageAlt": "HenrardVisuals"
      },
      "en": {
        "title": "Administration | HenrardVisuals",
        "description": "Private administration area.",
        "ogImageAlt": "HenrardVisuals"
      }
    },
    {
      "path": "/404",
      "out": "404.html",
      "noindex": true,
      "sitemap": { "changefreq": "never", "priority": "0.0" },
      "fr": {
        "title": "Page non trouvée | HenrardVisuals",
        "description": "Cette planche ne figure pas dans le book.",
        "ogImageAlt": "HenrardVisuals"
      },
      "en": {
        "title": "Page not found | HenrardVisuals",
        "description": "This plate is not in the book.",
        "ogImageAlt": "HenrardVisuals"
      }
    }
  ]
}
```

- [ ] **Step 4: Create the typed accessor**

Create `src/constants/seo.ts`:

```ts
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
```

Note: `canonicalUrlFor({path: '/'})` yields `https://henrardvisuals.com/` — the
trailing slash comes from the path itself, which is why `SITE_URL` must not
carry one.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/constants/seo.test.ts`
Expected: PASS — 7 tests.

- [ ] **Step 6: Verify the gates**

Run: `pnpm check`
Expected: no output, exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/constants/seo.routes.json src/constants/seo.ts src/constants/seo.test.ts
git commit -m "feat(seo): add per-route metadata table"
```

---

### Task 2: Replace useDocumentMeta with a complete useSeo hook

`useDocumentMeta` is called from three pages with hand-passed strings and only
rewrites two Open Graph tags. `useSeo` derives everything from the router path,
covers the full head, and mounts **once** in `SiteLayout` — which already sits
inside `BrowserRouter` and `LanguageProvider` and already wraps every route,
including the 404. The three per-page call sites and the `meta.*` i18n keys go
away.

**Files:**
- Create: `src/hooks/useSeo.ts`
- Delete: `src/hooks/useDocumentMeta.ts`
- Modify: `src/components/Layout/SiteLayout.tsx` (add the hook call + import)
- Modify: `src/pages/Home.tsx` (remove the hook call + import)
- Modify: `src/pages/Contact.tsx` (remove the hook call + import)
- Modify: `src/pages/Admin.tsx` (remove the hook call + import)
- Modify: `src/i18n/fr.ts`, `src/i18n/en.ts` (delete the `meta` block)
- Test: `src/hooks/useSeo.test.tsx`

**Interfaces:**
- Consumes: `SITE_URL`, `OG_IMAGE_URL`, `OG_IMAGE_WIDTH`, `OG_IMAGE_HEIGHT`, `resolveRouteSeo`, `canonicalUrlFor` from Task 1; `useLanguage()` from `@/context/LanguageContext`; `useLocation()` from `react-router-dom`.
- Produces: `useSeo(): void` — no arguments, no return. Mounted once.

- [ ] **Step 1: Write the failing test**

Create `src/hooks/useSeo.test.tsx`:

```tsx
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/hooks/useSeo.test.tsx`
Expected: FAIL — `Failed to resolve import "@/hooks/useSeo"`.

- [ ] **Step 3: Write the hook**

Create `src/hooks/useSeo.ts`:

```ts
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
```

- [ ] **Step 4: Mount it in SiteLayout**

In `src/components/Layout/SiteLayout.tsx`, add the import alongside the other
`@/` imports (alphabetical — it sorts after `@/context/SiteContentContext`):

```ts
import { useSeo } from '@/hooks/useSeo';
```

and call it as the first hook inside the component, immediately after the
existing `useLanguage()` / `useSiteContent()` destructuring:

```tsx
export function SiteLayout({ children }: SiteLayoutProps) {
  const { language, setLanguage, t } = useLanguage();
  const { contact } = useSiteContent();

  // One writer for the document head, above every route including the 404.
  useSeo();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
```

- [ ] **Step 5: Remove the three per-page call sites**

In `src/pages/Home.tsx`, delete the import line
`import { useDocumentMeta } from '@/hooks/useDocumentMeta';` and the line
`useDocumentMeta({ title: t('meta.home.title'), description: t('meta.home.description') });`.

In `src/pages/Contact.tsx`, delete the same import and
`useDocumentMeta({ title: t('meta.contact.title'), description: t('meta.contact.description') });`.

In `src/pages/Admin.tsx`, delete the same import and the whole call including
its comment:

```tsx
  // noindex: an admin panel has no business in a search index, and robots.txt
  // alone does not stop a page that was linked from somewhere else.
  useDocumentMeta({
    title: t('meta.admin.title'),
    description: t('meta.admin.description'),
    noindex: true,
  });
```

`noUnusedLocals` is on: after the deletion, check whether `t` is still used in
each file. In `Home.tsx` and `Contact.tsx` and `Admin.tsx` `t` is used
elsewhere for UI copy — leave the `useLanguage()` destructuring alone unless
`pnpm check` reports `t` as unused, in which case remove it from the
destructuring in that file only.

- [ ] **Step 6: Delete the old hook and the i18n meta keys**

```bash
git rm src/hooks/useDocumentMeta.ts
```

In `src/i18n/fr.ts`, delete the whole block:

```ts
  meta: {
    home: {
      title: 'Tristan Henrard — Portfolio mannequin | HenrardVisuals',
      description:
        'Portfolio de Tristan Henrard, mannequin éditorial et mode basé en France. Mensurations, biographie et travaux sélectionnés.',
    },
    contact: {
      title: 'Contact — Tristan Henrard | HenrardVisuals',
      description: 'Pour un booking, une collaboration ou un projet photographique.',
    },
    admin: {
      title: 'Administration | HenrardVisuals',
      description: 'Espace d’administration privé.',
    },
  },
```

In `src/i18n/en.ts`, delete the corresponding `meta: { ... }` block. The parity
test enforces that both go together.

- [ ] **Step 7: Confirm nothing still references the old names**

Run: `grep -rn "useDocumentMeta\|meta\.home\|meta\.contact\|meta\.admin" src/ e2e/`
Expected: no output.

- [ ] **Step 8: Run the whole suite**

Run: `pnpm test && pnpm check`
Expected: PASS — including `src/i18n/parity.test.ts` and the coverage thresholds.

- [ ] **Step 9: Commit**

```bash
git add -A src/hooks src/pages src/components/Layout/SiteLayout.tsx src/i18n
git commit -m "feat(seo): rewrite the full head per route and locale"
```

---

### Task 3: The 404 page — design 2a "La planche manquante"

The design doc (direction 1a, screen **2a — 404 — LA PLANCHE MANQUANTE**) already
answers this screen, so nothing here is invented: the missing page becomes a
print pulled from the plate. An empty 4:5 frame with corner marks, a centre
crosshair and the numeral set in Bodoni over the void; a struck-through
technical caption; the statement and three exits beside it. The doc's stated
rule — *"on ne laisse jamais le visiteur en cul-de-sac"* — is why there are
three exits rather than one.

The current inline `NotFound` in `App.tsx` is replaced wholesale. The header
and footer in the doc's mock are already rendered by `SiteLayout`, so this
component owns the space between them.

**Files:**
- Create: `src/components/NotFound/EmptyPlate.tsx`
- Create: `src/pages/NotFound.tsx`
- Modify: `src/App.tsx:26-45` (delete the inline component, lazy-import the page)
- Modify: `src/i18n/fr.ts`, `src/i18n/en.ts` (`notFound` block)
- Test: `src/pages/NotFound.test.tsx`

**Design values transcribed from screen 2a** (desktop 1440 / mobile 390):

| Element | Doc value | Token used |
|---|---|---|
| Frame | `aspect-ratio:4/5`, `background:#151515`, `border:1px solid rgba(242,240,236,.16)` | `aspect-[4/5] bg-frame border border-bone-faint` |
| Corner marks | 14px desktop @10px inset / 12px @9px mobile, `rgba(242,240,236,.40)` | `h-3 w-3 lg:h-3.5 lg:w-3.5`, `border-bone/40` |
| Crosshair | 1px, `rgba(242,240,236,.10)` | `bg-bone/10` |
| Numeral | Bodoni 132px desktop / 104px mobile, `line-height:1`, `letter-spacing:-.02em`, `rgba(242,240,236,.90)` | `font-display text-[clamp(6.5rem,9.2vw,8.25rem)] leading-none tracking-[-0.02em] text-bone/90` |
| Plate caption | 9.5px, `letter-spacing:.2em`, `rgba(242,240,236,.62)`, left span struck through in `#E4462C` | `caption-caps text-bone-muted`, `line-through decoration-vermillon` |
| Eyebrow | 5px `#E4462C` square + 10px `.22em` `rgba(...,.64)` | `h-[5px] w-[5px] bg-vermillon`, `micro-caps text-bone-muted` |
| H1 | Bodoni 400, 88px/`.98`/`-.018em` desktop, 44px/`1.02`/`-.015em` mobile | `font-display text-[clamp(2.75rem,6.1vw,5.5rem)] leading-[1.02] lg:leading-[0.98] tracking-[-0.018em]` |
| Lead | 14.5px/1.75 desktop, 14px/1.8 mobile, `rgba(...,.68)`, `max-width:430px` | `text-[14px] leading-[1.8] lg:text-[14.5px] lg:leading-[1.75] text-bone-muted max-w-[430px]` |
| Exits desktop | 11px `.24em`, `border-bottom` `#E4462C` on the first and `rgba(...,.28)` on the others, `transition:color 400ms` | `tracking-[0.24em]`, `lg:border-b-vermillon` / `lg:border-b-bone/25`, `duration-[400ms]` |
| Exits mobile | full-width rows, `min-height:52px`, `border-top:1px solid rgba(242,240,236,.14)`, trailing `→` | `min-h-[52px] border-t border-bone-hair`, arrow `lg:hidden` |
| Columns | `gap:80px`, plate `460px`, text `max-width:640px`, `padding:118px 40px 0` | `lg:gap-20 lg:w-[460px] lg:max-w-[640px] lg:px-10 lg:pt-[118px]` |

Two deliberate departures, same class as the ones already recorded for the
refonte: the mock's exits point at `#2a` and a hardcoded `mailto:` — here they
point at the real routes and at `contact.email` from `SiteContentContext`; and
the mock draws its own header and footer, which `SiteLayout` already provides.

**Interfaces:**
- Consumes: `useLanguage()` from `@/context/LanguageContext`; `useSiteContent()` from `@/context/SiteContentContext` (for `contact.email`); `Link` from `react-router-dom`.
- Produces:
  - `EmptyPlate` — named export, no props.
  - `NotFound` — named export **and** a `default` export, so `React.lazy` loads it the way `Home`, `Contact` and `Admin` are loaded.

- [ ] **Step 1: Write the failing test**

Create `src/pages/NotFound.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The page reads one field off the site-content context; standing up the real
// provider would drag a Supabase fetch into a markup test.
vi.mock('@/context/SiteContentContext', () => ({
  useSiteContent: () => ({
    contact: { email: 'contact@example.com', instagram: '#', linkedin: '#' },
    text: (key: string) => key,
  }),
}));

import { LanguageProvider } from '@/context/LanguageContext';
import { NotFound } from '@/pages/NotFound';

const renderPage = () =>
  render(
    <MemoryRouter>
      <LanguageProvider>
        <NotFound />
      </LanguageProvider>
    </MemoryRouter>
  );

describe('NotFound', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('states the error in a single level-one heading', () => {
    renderPage();

    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("Cette planche n'est pas au book.");
  });

  it('marks the plate with the doc’s struck-through technical caption', () => {
    renderPage();

    expect(screen.getByText('Réf. inconnue')).toBeInTheDocument();
    expect(screen.getByText('Tirage retiré')).toBeInTheDocument();
  });

  it('keeps the decorative numeral out of the accessibility tree', () => {
    renderPage();

    expect(screen.queryByText('404')).not.toBeInTheDocument();
    expect(screen.getByText('Erreur 404')).toBeInTheDocument();
  });

  it('explains what happened', () => {
    renderPage();

    expect(screen.getByText(/ne correspond à aucune série/)).toBeInTheDocument();
  });

  it('offers the three exits from the doc, in order', () => {
    renderPage();

    const nav = screen.getByRole('navigation');
    const links = screen.getAllByRole('link');

    expect(nav).toBeInTheDocument();
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/',
      '/#portfolio',
      'mailto:contact@example.com',
    ]);
  });

  it('translates when the stored language is English', () => {
    localStorage.setItem('language', 'en');

    renderPage();

    expect(screen.getByText('This plate is not in the book.')).toBeInTheDocument();
    expect(screen.getByText('Unknown ref.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/pages/NotFound.test.tsx`
Expected: FAIL — `Failed to resolve import "@/pages/NotFound"`.

- [ ] **Step 3: Add the copy to both locales**

The French strings are the doc's own, verbatim. `caption-caps` and `micro-caps`
uppercase their text in CSS, so the stored copy stays in sentence case and the
tests can match it literally.

In `src/i18n/fr.ts`, replace the existing `notFound` block with:

```ts
  notFound: {
    eyebrow: 'Erreur 404',
    title: "Cette planche n'est pas au book.",
    lead: "L'adresse demandée ne correspond à aucune série. Elle a peut-être été retirée, ou l'URL comporte une coquille.",
    plateRef: 'Réf. inconnue',
    plateStatus: 'Tirage retiré',
    navLabel: 'Sorties',
    home: "Retour à l'accueil",
    portfolio: 'Voir le portfolio',
    write: 'Écrire',
    suggestionsTitle: 'Peut-être cherchiez-vous',
    suggestionsLabel: 'Extrait du book',
  },
```

In `src/i18n/en.ts`, replace the existing `notFound` block with:

```ts
  notFound: {
    eyebrow: 'Error 404',
    title: 'This plate is not in the book.',
    lead: 'The address you asked for matches no series. It may have been withdrawn, or the URL has a typo.',
    plateRef: 'Unknown ref.',
    plateStatus: 'Print withdrawn',
    navLabel: 'Ways out',
    home: 'Back to home',
    portfolio: 'View the portfolio',
    write: 'Write',
    suggestionsTitle: 'You may have been looking for',
    suggestionsLabel: 'From the book',
  },
```

`suggestionsTitle` and `suggestionsLabel` are consumed in Task 4; they are
added here so the parity test only has to be satisfied once.

The old `message` and `back` keys are gone. Confirm nothing else uses them —
`grep -rn "notFound.message\|notFound.back" src/ e2e/` must print nothing after
Step 6.

- [ ] **Step 4: Build the empty plate**

Create `src/components/NotFound/EmptyPlate.tsx`:

```tsx
import { useLanguage } from '@/context/LanguageContext';

/**
 * Screen 2a's central object: an empty 4:5 frame carrying the corner marks
 * and centre crosshair of a mounting board, the plate number set in Bodoni
 * over the void, and a struck-through technical caption. Same figure syntax
 * as the portfolio frames — a dead end still reads as a page of the book.
 */
export function EmptyPlate() {
  const { t } = useLanguage();

  const corner = 'absolute block h-3 w-3 lg:h-3.5 lg:w-3.5';

  return (
    <figure className="m-0 w-full">
      <div className="relative flex aspect-[4/5] items-center justify-center border border-bone-faint bg-frame">
        <span
          aria-hidden="true"
          className={`${corner} left-[9px] top-[9px] border-l border-t border-bone/40 lg:left-2.5 lg:top-2.5`}
        />
        <span
          aria-hidden="true"
          className={`${corner} right-[9px] top-[9px] border-r border-t border-bone/40 lg:right-2.5 lg:top-2.5`}
        />
        <span
          aria-hidden="true"
          className={`${corner} bottom-[9px] left-[9px] border-b border-l border-bone/40 lg:bottom-2.5 lg:left-2.5`}
        />
        <span
          aria-hidden="true"
          className={`${corner} bottom-[9px] right-[9px] border-b border-r border-bone/40 lg:bottom-2.5 lg:right-2.5`}
        />

        <span aria-hidden="true" className="absolute inset-x-0 top-1/2 block h-px bg-bone/10" />
        <span aria-hidden="true" className="absolute inset-y-0 left-1/2 block w-px bg-bone/10" />

        {/* The eyebrow beside this frame already announces "Erreur 404";
            reading the numeral out a second time adds nothing. */}
        <span
          aria-hidden="true"
          className="relative font-display text-[clamp(6.5rem,9.2vw,8.25rem)] leading-none tracking-[-0.02em] text-bone/90"
        >
          404
        </span>
      </div>

      <figcaption className="caption-caps mt-3 flex items-baseline justify-between gap-4 text-bone-muted lg:mt-3.5">
        <span className="line-through decoration-vermillon">{t('notFound.plateRef')}</span>
        <span className="text-right">{t('notFound.plateStatus')}</span>
      </figcaption>
    </figure>
  );
}
```

- [ ] **Step 5: Build the page**

Create `src/pages/NotFound.tsx`:

```tsx
import { Link } from 'react-router-dom';

import { EmptyPlate } from '@/components/NotFound/EmptyPlate';
import { useLanguage } from '@/context/LanguageContext';
import { useSiteContent } from '@/context/SiteContentContext';

/**
 * Direction 1a, screen 2a — "LA PLANCHE MANQUANTE". Two columns on desktop
 * (the empty plate left, the statement and the exits right), one stack on
 * mobile where the exits become full-width rows separated by hairlines.
 *
 * Three exits rather than one, per the doc: a visitor is never left in a
 * cul-de-sac.
 *
 * Metadata — title, noindex — comes from the route table via useSeo in
 * SiteLayout. This component owns markup and copy only.
 */
export function NotFound() {
  const { t } = useLanguage();
  const { contact } = useSiteContent();

  const exit =
    'flex min-h-[52px] items-center justify-between border-t border-bone-hair text-[11px] uppercase tracking-[0.22em] transition-colors duration-[400ms] lg:min-h-0 lg:justify-start lg:border-t-0 lg:border-b lg:pb-2 lg:tracking-[0.24em]';
  const secondary = 'text-bone-muted hover:text-bone lg:border-b-bone/25 lg:hover:border-b-bone';

  return (
    <div className="min-h-screen bg-ink pt-[58px] lg:pt-[84px]">
      <div className="animate-rise px-5 pt-11 lg:flex lg:items-start lg:gap-20 lg:px-10 lg:pt-[118px]">
        <div className="lg:w-[460px] lg:flex-none">
          <EmptyPlate />
        </div>

        <div className="lg:max-w-[640px] lg:pt-4">
          <div className="mt-11 flex items-center gap-2.5 lg:mt-0 lg:gap-3">
            <span aria-hidden="true" className="block h-[5px] w-[5px] bg-vermillon" />
            <span className="micro-caps text-bone-muted">{t('notFound.eyebrow')}</span>
          </div>

          <h1 className="mt-5 font-display text-[clamp(2.75rem,6.1vw,5.5rem)] font-normal leading-[1.02] tracking-[-0.018em] text-bone lg:mt-[30px] lg:leading-[0.98]">
            {t('notFound.title')}
          </h1>

          <p className="mt-6 max-w-[430px] text-[14px] leading-[1.8] text-bone-muted lg:mt-[34px] lg:text-[14.5px] lg:leading-[1.75]">
            {t('notFound.lead')}
          </p>

          <nav
            aria-label={t('notFound.navLabel')}
            className="mt-9 flex flex-col border-b border-bone-hair lg:mt-12 lg:flex-row lg:gap-10 lg:border-b-0"
          >
            <Link to="/" className={`${exit} text-bone hover:text-vermillon lg:border-b-vermillon`}>
              {t('notFound.home')}
              <span aria-hidden="true" className="text-vermillon lg:hidden">
                →
              </span>
            </Link>

            <Link to="/#portfolio" className={`${exit} ${secondary}`}>
              {t('notFound.portfolio')}
              <span aria-hidden="true" className="text-bone/50 lg:hidden">
                →
              </span>
            </Link>

            {/* mailto leaves the application, so a real anchor — a router Link
                would try to resolve it as a route. */}
            <a href={`mailto:${contact.email}`} className={`${exit} ${secondary}`}>
              {t('notFound.write')}
              <span aria-hidden="true" className="text-bone/50 lg:hidden">
                →
              </span>
            </a>
          </nav>
        </div>
      </div>
    </div>
  );
}

export default NotFound;
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm vitest run src/pages/NotFound.test.tsx`
Expected: PASS — 6 tests.

Run: `grep -rn "notFound.message\|notFound.back" src/ e2e/`
Expected: no output.

- [ ] **Step 7: Wire it into the router**

In `src/App.tsx`, delete the entire inline `NotFound` function (the block
starting `function NotFound() {` and ending with its closing brace, lines 26–45
of the current file).

Add to the lazy-loaded page list:

```tsx
const Home = lazy(() => import('@/pages/Home'));
const Contact = lazy(() => import('@/pages/Contact'));
const Admin = lazy(() => import('@/pages/Admin'));
const NotFound = lazy(() => import('@/pages/NotFound'));
```

The `<Route path="*" element={<NotFound />} />` line stays exactly as it is —
it now resolves to the lazy page.

`useLanguage` was used only by the deleted inline component, so remove it from
the import. The line must end up reading:

```tsx
import { LanguageProvider } from '@/context/LanguageContext';
```

- [ ] **Step 8: Add e2e coverage**

Create `e2e/seo.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

/**
 * Runs against the Vite dev server, which serves index.html for every path —
 * so this asserts what the client renders, not the HTTP status. The status
 * code is an nginx concern and is verified against the production image.
 */
test.describe('SEO surface', () => {
  test('gives the home page its own title and description', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle('Tristan Henrard — Portfolio mannequin | HenrardVisuals');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      /Portfolio de Tristan Henrard/
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://henrardvisuals.com/'
    );
  });

  test('gives the contact page a distinct title and canonical', async ({ page }) => {
    await page.goto('/contact');

    await expect(page).toHaveTitle('Contact — Tristan Henrard | HenrardVisuals');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://henrardvisuals.com/contact'
    );
  });

  test('renders the designed 404 view for an unknown path and marks it noindex', async ({
    page,
  }) => {
    await page.goto('/this-route-does-not-exist');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      "Cette planche n'est pas au book."
    );
    await expect(page.getByText('Erreur 404')).toBeVisible();
    await expect(page).toHaveTitle('Page non trouvée | HenrardVisuals');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow'
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  });

  test('returns to the home page from the 404 without a full reload', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');

    // A value on window survives a router navigation and dies on a document
    // load — which is the difference between <Link> and the old <a href>.
    await page.evaluate(() => {
      (window as unknown as { __spaMarker?: boolean }).__spaMarker = true;
    });

    await page.getByRole('link', { name: /Retour à l'accueil/ }).click();

    await expect(page).toHaveURL('/');

    const survived = await page.evaluate(
      () => (window as unknown as { __spaMarker?: boolean }).__spaMarker === true
    );
    expect(survived).toBe(true);
  });
});
```

- [ ] **Step 9: Run every gate**

Run: `pnpm test && pnpm check`
Expected: PASS.

Run: `pnpm e2e -- e2e/seo.spec.ts`
Expected: PASS — 4 tests. Playwright starts its own Vite dev server; none of
these four touch Supabase data.

- [ ] **Step 10: Look at it**

Run: `pnpm dev` and open `http://localhost:5173/nope` at 1440px and at 390px.

Check against screen 2a: the plate is a 4:5 empty frame with four corner marks
and a faint crosshair, the numeral sits in Bodoni over the centre, the caption
reads `RÉF. INCONNUE` struck through in vermillion beside `TIRAGE RETIRÉ`, the
statement is set in Bodoni beside it on desktop and under it on mobile, and the
three exits are inline on desktop / stacked rows with arrows on mobile.

- [ ] **Step 11: Commit**

```bash
git add -A src/pages src/components/NotFound src/App.tsx src/i18n e2e/seo.spec.ts
git commit -m "feat(404): build the missing-plate error page"
```

---

### Task 4: The "Peut-être cherchiez-vous" plate strip

The second half of screen 2a: three real plates from the book under the error
statement, so the page is an offer rather than an apology. This is the part of
the mock that is data-driven where the doc is static — the doc hardcodes
plates 01, 04 and 06; the site reads whatever is published.

Kept separate from Task 3 because it is the only piece that touches the
database, and a reviewer can reasonably accept the error page while rejecting
a Supabase call on a 404.

**Files:**
- Create: `src/hooks/useSuggestedPhotos.ts`
- Create: `src/components/NotFound/SuggestedPlates.tsx`
- Modify: `src/pages/NotFound.tsx` (render the strip)
- Test: `src/hooks/useSuggestedPhotos.test.ts`

**Design values transcribed from screen 2a:**

| Element | Doc value | Token used |
|---|---|---|
| Section heading | Bodoni **italic** 26px desktop / 19px mobile, `rgba(242,240,236,.86)` | `font-display italic text-[19px] lg:text-[26px] text-bone/[0.86]` |
| Rule under it | `border-bottom:1px solid rgba(242,240,236,.16)`, `padding-bottom:18px` | `border-b border-bone-faint pb-4 lg:pb-[18px]` |
| Right label | `EXTRAIT DU BOOK — 03` desktop, `03` mobile, 9.5px `.2em` | `caption-caps text-bone-muted`, prefix `hidden lg:inline` |
| Plates | three equal columns, `gap:24px` desktop / `12px` mobile, `aspect-ratio:4/5`, `background:#151515` | `flex gap-3 lg:gap-6`, `flex-1`, `aspect="4/5"`, `bg-frame` |
| Plate caption | `01 — ÉDITORIAL` / `PARIS, 2025`, 9.5px `.2em` `rgba(...,.62)` | `caption-caps text-bone-muted`, same shape as `PhotoGallery`'s `Frame` |
| Section offset | `padding:140px 40px 0` desktop | `px-5 pt-16 lg:px-10 lg:pt-[140px]` |

**Interfaces:**
- Consumes: `supabase` from `@/lib/supabase`; `Photo`, `Category` from `@/types`; `OptimizedImage`; `buildImageUrl`, `buildImageSrcSet`, `GALLERY_WIDTHS` from `@/lib/imageUrl`; the `notFound.suggestionsTitle` / `notFound.suggestionsLabel` keys added in Task 3.
- Produces:
  - `interface SuggestedPlate { photo: Photo; number: number; categoryName: string | null }`
  - `useSuggestedPhotos(count?: number): SuggestedPlate[]` — defaults to 3, returns `[]` until loaded and on any failure.
  - `SuggestedPlates` — named export, no props, renders `null` when there is nothing to show.

- [ ] **Step 1: Write the failing test**

Create `src/hooks/useSuggestedPhotos.test.ts`. The Supabase mock follows the
shape already used by `src/hooks/useHomeData.test.ts` — a thenable that also
answers every builder method:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/hooks/useSuggestedPhotos.test.ts`
Expected: FAIL — cannot resolve `./useSuggestedPhotos`.

- [ ] **Step 3: Write the hook**

Create `src/hooks/useSuggestedPhotos.ts`:

```ts
import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { Category, Photo } from '@/types';

export interface SuggestedPlate {
  photo: Photo;
  /** Plate number as the book prints it, 1-based over sort_order. */
  number: number;
  categoryName: string | null;
}

/**
 * The plates the 404 offers as a way back into the book.
 *
 * Deliberately not useHomeData: that hook pulls a full page of twelve plus
 * the hero, the categories and the profile settings, and a dead end has no
 * business costing more than the page it replaced.
 *
 * Failure is silent by design. The suggestions are a courtesy; a 404 that
 * renders a database error on top of the 404 is worse than one that simply
 * shows fewer ways out.
 */
export function useSuggestedPhotos(count = 3): SuggestedPlate[] {
  const [plates, setPlates] = useState<SuggestedPlate[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const [photosRes, categoriesRes] = await Promise.all([
        supabase
          .from('photos')
          .select('id, title, storage_path, category, width, height, shot_location, shot_year')
          .eq('is_published', true)
          .eq('is_hero', false)
          .order('sort_order', { ascending: true })
          .limit(count),
        supabase.from('categories').select('id, name, slug, sort_order'),
      ]);

      if (cancelled || photosRes.error || !photosRes.data) return;

      const categories = (categoriesRes.data ?? []) as Category[];

      setPlates(
        (photosRes.data as Photo[]).map((photo, index) => ({
          photo,
          number: index + 1,
          categoryName: photo.category
            ? (categories.find((category) => category.slug === photo.category)?.name ?? null)
            : null,
        }))
      );
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [count]);

  return plates;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/hooks/useSuggestedPhotos.test.ts`
Expected: PASS — 5 tests.

- [ ] **Step 5: Build the strip**

Create `src/components/NotFound/SuggestedPlates.tsx`:

```tsx
import { Link } from 'react-router-dom';

import { OptimizedImage } from '@/components/OptimizedImage';
import { useLanguage } from '@/context/LanguageContext';
import { useSuggestedPhotos } from '@/hooks/useSuggestedPhotos';
import { GALLERY_WIDTHS, buildImageSrcSet, buildImageUrl } from '@/lib/imageUrl';

/** "01", "02" … the frame number as the book prints it. */
const plateNumber = (n: number) => String(n).padStart(2, '0');

/**
 * "Peut-être cherchiez-vous" — three real plates under the error statement.
 *
 * Renders nothing at all when there is nothing to show: an empty gallery or
 * an unreachable API should leave a clean page, not a heading and a rule over
 * three grey boxes.
 */
export function SuggestedPlates() {
  const { t } = useLanguage();
  const plates = useSuggestedPhotos(3);

  if (plates.length === 0) return null;

  return (
    <section className="px-5 pt-16 lg:px-10 lg:pt-[140px]">
      <div className="flex items-end justify-between gap-4 border-b border-bone-faint pb-4 lg:pb-[18px]">
        {/* Level 2: the error statement is this page's h1. */}
        <h2 className="font-display text-[19px] italic text-bone/[0.86] lg:text-[26px]">
          {t('notFound.suggestionsTitle')}
        </h2>
        <span className="caption-caps whitespace-nowrap text-bone-muted">
          <span className="hidden lg:inline">{t('notFound.suggestionsLabel')} — </span>
          {plateNumber(plates.length)}
        </span>
      </div>

      <div className="mt-6 flex gap-3 lg:mt-10 lg:gap-6">
        {plates.map(({ photo, number, categoryName }) => {
          const place = [photo.shot_location, photo.shot_year].filter(Boolean).join(', ');

          return (
            <figure key={photo.id} className="m-0 flex-1">
              {/* No deep link to a single plate exists, so the strip returns
                  the visitor to the gallery rather than nowhere. */}
              <Link to="/#portfolio" aria-label={photo.title} className="block overflow-hidden bg-frame">
                <OptimizedImage
                  src={buildImageUrl(photo.storage_path, { width: 800 })}
                  fallbackSrc={buildImageUrl(photo.storage_path)}
                  srcSet={buildImageSrcSet(photo.storage_path, GALLERY_WIDTHS)}
                  sizes="30vw"
                  alt={photo.title}
                  width={photo.width ?? undefined}
                  height={photo.height ?? undefined}
                  aspect="4/5"
                  className="h-full w-full object-cover object-[50%_32%]"
                />
              </Link>
              <figcaption className="caption-caps mt-2 flex items-baseline justify-between gap-2 text-bone-muted lg:mt-3">
                <span>
                  {plateNumber(number)}
                  {categoryName ? ` — ${categoryName}` : ''}
                </span>
                {place && <span className="hidden text-right lg:inline">{place}</span>}
              </figcaption>
            </figure>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Render it on the page**

In `src/pages/NotFound.tsx`, add the import beside the existing `EmptyPlate`
one (alphabetical within the `@/` group — `EmptyPlate` then `SuggestedPlates`):

```tsx
import { SuggestedPlates } from '@/components/NotFound/SuggestedPlates';
```

and place the strip after the two-column block, still inside the outermost
`div`, so it sits between the statement and `SiteLayout`'s footer:

```tsx
      </div>

      <SuggestedPlates />
    </div>
  );
}
```

- [ ] **Step 7: Keep the page test honest**

`NotFound.test.tsx` now mounts a component that queries Supabase. Add the same
module mock at the top of that file, next to the `SiteContentContext` one, so
the markup test stays a markup test:

```tsx
vi.mock('@/hooks/useSuggestedPhotos', () => ({
  useSuggestedPhotos: () => [],
}));
```

With the hook stubbed to `[]`, `SuggestedPlates` renders `null` and the
existing assertion that the page exposes exactly three links still holds.

- [ ] **Step 8: Run every gate**

Run: `pnpm test && pnpm check`
Expected: PASS.

Run: `pnpm e2e -- e2e/seo.spec.ts`
Expected: PASS — the 404 e2e specs are unaffected; with no Supabase instance
behind the dev server the strip renders nothing.

- [ ] **Step 9: Look at it with real data**

With a Supabase instance reachable, run `pnpm dev` and open
`http://localhost:5173/nope`. Expected against screen 2a: an italic Bodoni
"Peut-être cherchiez-vous" on the left of a hairline rule, `EXTRAIT DU BOOK — 03`
on its right, and three 4:5 plates below with `01 — <catégorie>` /
`<lieu>, <année>` captions.

- [ ] **Step 10: Commit**

```bash
git add -A src/hooks/useSuggestedPhotos.ts src/hooks/useSuggestedPhotos.test.ts src/components/NotFound src/pages
git commit -m "feat(404): offer three plates from the book"
```

---

### Task 5: Prerender one static HTML file per route

The whole point of the exercise. Vite emits a single `dist/index.html` whose
head describes the home page; this step stamps a per-route head into a copy of
it for each route, and regenerates `sitemap.xml` from the same table so the two
cannot drift.

**Files:**
- Modify: `index.html` (wrap the SEO block in marker comments)
- Create: `scripts/prerender.mjs`
- Test: `scripts/prerender.test.mjs`
- Modify: `package.json` (`build` script)
- Delete: `public/sitemap.xml` (now generated)

**Interfaces:**
- Consumes: `src/constants/seo.routes.json` from Task 1, read with `JSON.parse` — not the TypeScript accessor, which this plain-Node script cannot import.
- Produces (named exports, so the pure parts are testable):
  - `buildSeoBlock(config: object, route: object): string`
  - `renderRouteHtml(template: string, config: object, route: object): string`
  - `renderSitemap(config: object): string`
  - `SEO_START = '<!--seo-->'`, `SEO_END = '<!--/seo-->'`
  - Files written: `dist/index.html`, `dist/contact.html`, `dist/admin.html`, `dist/404.html`, `dist/sitemap.xml`

- [ ] **Step 1: Write the failing test**

Create `scripts/prerender.test.mjs`:

```js
import { describe, expect, it } from 'vitest';

import { buildSeoBlock, renderRouteHtml, renderSitemap } from './prerender.mjs';

const CONFIG = {
  siteUrl: 'https://example.com',
  ogImage: '/og-image.jpg',
  ogImageWidth: 1200,
  ogImageHeight: 630,
  routes: [
    {
      path: '/',
      out: 'index.html',
      noindex: false,
      sitemap: { changefreq: 'weekly', priority: '1.0' },
      fr: { title: 'Accueil', description: 'Desc « fr »', ogImageAlt: 'Alt fr' },
      en: { title: 'Home', description: 'Desc en', ogImageAlt: 'Alt en' },
    },
    {
      path: '/contact',
      out: 'contact.html',
      noindex: false,
      sitemap: { changefreq: 'monthly', priority: '0.6' },
      fr: { title: 'Contact "officiel"', description: 'Nous <écrire>', ogImageAlt: 'Alt fr' },
      en: { title: 'Contact', description: 'Write us', ogImageAlt: 'Alt en' },
    },
    {
      path: '/admin',
      out: 'admin.html',
      noindex: true,
      sitemap: { changefreq: 'never', priority: '0.0' },
      fr: { title: 'Admin', description: 'Privé', ogImageAlt: 'Alt fr' },
      en: { title: 'Admin', description: 'Private', ogImageAlt: 'Alt en' },
    },
  ],
};

const TEMPLATE = [
  '<!DOCTYPE html><html lang="fr"><head>',
  '<!--seo-->',
  '  <title>placeholder</title>',
  '<!--/seo-->',
  '<script type="module" src="/assets/index-abc123.js"></script>',
  '</head><body><div id="root"></div></body></html>',
].join('\n');

const route = (path) => CONFIG.routes.find((r) => r.path === path);

describe('buildSeoBlock', () => {
  it('emits the French title, since French is the default locale', () => {
    expect(buildSeoBlock(CONFIG, route('/'))).toContain('<title>Accueil</title>');
  });

  it('builds absolute canonical and og:url from the route path', () => {
    const block = buildSeoBlock(CONFIG, route('/contact'));

    expect(block).toContain('<link rel="canonical" href="https://example.com/contact" />');
    expect(block).toContain(
      '<meta property="og:url" content="https://example.com/contact" />'
    );
  });

  it('points every route at the one shared share image', () => {
    const block = buildSeoBlock(CONFIG, route('/contact'));

    expect(block).toContain(
      '<meta property="og:image" content="https://example.com/og-image.jpg" />'
    );
    expect(block).toContain(
      '<meta name="twitter:image" content="https://example.com/og-image.jpg" />'
    );
    expect(block).toContain('<meta property="og:image:width" content="1200" />');
  });

  it('gives a noindex route a robots tag and no canonical or hreflang', () => {
    const block = buildSeoBlock(CONFIG, route('/admin'));

    expect(block).toContain('<meta name="robots" content="noindex, nofollow" />');
    expect(block).not.toContain('rel="canonical"');
    expect(block).not.toContain('hreflang');
  });

  it('escapes characters that would break out of an attribute', () => {
    const block = buildSeoBlock(CONFIG, route('/contact'));

    expect(block).toContain('Contact &quot;officiel&quot;');
    expect(block).toContain('Nous &lt;écrire&gt;');
    expect(block).not.toContain('content="Nous <écrire>"');
  });
});

describe('renderRouteHtml', () => {
  it('replaces only the marked block and keeps the hashed asset tags', () => {
    const html = renderRouteHtml(TEMPLATE, CONFIG, route('/contact'));

    expect(html).toContain('/assets/index-abc123.js');
    expect(html).toContain('<title>Contact &quot;officiel&quot;</title>');
    expect(html).not.toContain('<title>placeholder</title>');
    expect(html).toContain('<div id="root"></div>');
  });

  it('leaves exactly one title element', () => {
    const html = renderRouteHtml(TEMPLATE, CONFIG, route('/'));

    expect(html.match(/<title>/g)).toHaveLength(1);
  });

  it('fails loudly when the markers are missing', () => {
    expect(() => renderRouteHtml('<head></head>', CONFIG, route('/'))).toThrow(
      /<!--seo--> markers/
    );
  });
});

describe('renderSitemap', () => {
  it('lists the indexable routes and omits the noindex ones', () => {
    const xml = renderSitemap(CONFIG);

    expect(xml).toContain('<loc>https://example.com/</loc>');
    expect(xml).toContain('<loc>https://example.com/contact</loc>');
    expect(xml).not.toContain('/admin');
  });

  it('carries the per-route sitemap hints and the language alternates', () => {
    const xml = renderSitemap(CONFIG);

    expect(xml).toContain('<changefreq>monthly</changefreq>');
    expect(xml).toContain('<priority>1.0</priority>');
    expect(xml).toContain(
      '<xhtml:link rel="alternate" hreflang="en" href="https://example.com/contact?lang=en" />'
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run scripts/prerender.test.mjs`
Expected: FAIL — cannot resolve `./prerender.mjs`.

(Vitest's default `include` glob matches `**/*.test.?(c|m)[jt]s?(x)`, and
`vite.config.ts`'s `exclude` only skips `node_modules`, `e2e` and `.claude` —
so this file is picked up without any config change. Its coverage `include` is
`src/**`, so `scripts/` does not affect the thresholds.)

- [ ] **Step 3: Write the prerender script**

Create `scripts/prerender.mjs`:

```js
#!/usr/bin/env node
/**
 * Stamps a per-route <head> into the built index.html.
 *
 * The app is client-rendered, so every consumer that does not execute
 * JavaScript — link previews in Slack, Discord, Twitter, LinkedIn, WhatsApp,
 * and every crawler that is not Google — reads whatever static tags shipped in
 * the HTML. One file for four routes meant one description for four routes.
 *
 * The static copy is French: it is the default locale. `?lang=en` is handled
 * client-side, which is why the English alternate is advertised via hreflang
 * rather than prerendered — a query string does not map to a static file.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = resolve(ROOT, 'dist');
const TABLE = resolve(ROOT, 'src/constants/seo.routes.json');

export const SEO_START = '<!--seo-->';
export const SEO_END = '<!--/seo-->';

/** Attribute-safe escaping. Copy comes from a JSON file, but it contains
    quotes and angle brackets and a broken attribute is a silent bug. */
const esc = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const urlFor = (config, route) => `${config.siteUrl}${route.path}`;

export function buildSeoBlock(config, route) {
  const url = urlFor(config, route);
  const image = `${config.siteUrl}${config.ogImage}`;
  const copy = route.fr;

  const lines = [
    `<title>${esc(copy.title)}</title>`,
    `<meta name="description" content="${esc(copy.description)}" />`,
    `<meta name="author" content="HenrardVisuals" />`,
  ];

  if (route.noindex) {
    lines.push(`<meta name="robots" content="noindex, nofollow" />`);
  } else {
    lines.push(
      `<link rel="canonical" href="${url}" />`,
      `<link rel="alternate" hreflang="fr" href="${url}" />`,
      `<link rel="alternate" hreflang="en" href="${url}?lang=en" />`,
      `<link rel="alternate" hreflang="x-default" href="${url}" />`
    );
  }

  lines.push(
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${esc(copy.title)}" />`,
    `<meta property="og:description" content="${esc(copy.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:locale" content="fr_FR" />`,
    `<meta property="og:locale:alternate" content="en_GB" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:alt" content="${esc(copy.ogImageAlt)}" />`,
    `<meta property="og:image:width" content="${config.ogImageWidth}" />`,
    `<meta property="og:image:height" content="${config.ogImageHeight}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(copy.title)}" />`,
    `<meta name="twitter:description" content="${esc(copy.description)}" />`,
    `<meta name="twitter:image" content="${image}" />`,
    `<meta name="twitter:image:alt" content="${esc(copy.ogImageAlt)}" />`
  );

  return lines.map((line) => `  ${line}`).join('\n');
}

export function renderRouteHtml(template, config, route) {
  const start = template.indexOf(SEO_START);
  const end = template.indexOf(SEO_END);

  if (start === -1 || end === -1 || end < start) {
    throw new Error('index.html is missing the <!--seo--> markers');
  }

  return (
    template.slice(0, start + SEO_START.length) +
    '\n' +
    buildSeoBlock(config, route) +
    '\n' +
    template.slice(end)
  );
}

export function renderSitemap(config) {
  const entries = config.routes
    .filter((route) => !route.noindex)
    .map((route) => {
      const url = urlFor(config, route);
      return [
        '  <url>',
        `    <loc>${url}</loc>`,
        `    <changefreq>${route.sitemap.changefreq}</changefreq>`,
        `    <priority>${route.sitemap.priority}</priority>`,
        `    <xhtml:link rel="alternate" hreflang="fr" href="${url}" />`,
        `    <xhtml:link rel="alternate" hreflang="en" href="${url}?lang=en" />`,
        '  </url>',
      ].join('\n');
    });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries,
    '</urlset>',
    '',
  ].join('\n');
}

async function main() {
  const config = JSON.parse(await readFile(TABLE, 'utf8'));

  // Read the template before writing anything: the home route overwrites
  // dist/index.html, which is the template itself.
  const template = await readFile(resolve(DIST, 'index.html'), 'utf8');

  for (const route of config.routes) {
    await writeFile(resolve(DIST, route.out), renderRouteHtml(template, config, route), 'utf8');
    console.log(`prerender: ${route.path} -> dist/${route.out}`);
  }

  await writeFile(resolve(DIST, 'sitemap.xml'), renderSitemap(config), 'utf8');
  console.log('prerender: sitemap.xml');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run scripts/prerender.test.mjs`
Expected: PASS — 10 tests.

- [ ] **Step 5: Add the markers to index.html**

In `index.html`, wrap the block that currently starts at
`<!-- SEO Meta Tags -->` and ends at the closing `<meta name="twitter:image" ... />`
line. Replace that whole span with:

```html
  <!-- SEO Meta Tags -->
  <!-- No keywords meta: no major engine has used it since 2009. -->
  <!-- Everything between the markers is replaced per route by
       scripts/prerender.mjs at build time, from src/constants/seo.routes.json.
       What is written here is the dev-server fallback and the home page's
       values; editing it does not change what ships. -->
  <!--seo-->
  <title>Tristan Henrard — Portfolio mannequin | HenrardVisuals</title>
  <meta name="description"
    content="Portfolio de Tristan Henrard, mannequin éditorial et mode basé en France. Mensurations, biographie et travaux sélectionnés." />
  <meta name="author" content="HenrardVisuals" />
  <link rel="canonical" href="https://henrardvisuals.com/" />
  <link rel="alternate" hreflang="fr" href="https://henrardvisuals.com/" />
  <link rel="alternate" hreflang="en" href="https://henrardvisuals.com/?lang=en" />
  <link rel="alternate" hreflang="x-default" href="https://henrardvisuals.com/" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="Tristan Henrard — Portfolio mannequin" />
  <meta property="og:description"
    content="Portfolio de Tristan Henrard, mannequin éditorial et mode basé en France." />
  <meta property="og:url" content="https://henrardvisuals.com/" />
  <meta property="og:locale" content="fr_FR" />
  <meta property="og:locale:alternate" content="en_GB" />
  <meta property="og:image" content="https://henrardvisuals.com/og-image.jpg" />
  <meta property="og:image:alt" content="Tristan Henrard, portrait éditorial en noir et blanc" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Tristan Henrard — Portfolio mannequin" />
  <meta name="twitter:description"
    content="Portfolio de Tristan Henrard, mannequin éditorial et mode basé en France." />
  <meta name="twitter:image" content="https://henrardvisuals.com/og-image.jpg" />
  <meta name="twitter:image:alt" content="Tristan Henrard, portrait éditorial en noir et blanc" />
  <!--/seo-->
```

Leave everything else in `<head>` untouched — the critical CSS, the
`%VITE_SUPABASE_URL%` preconnect hints, the font preloads, `theme-color` and
the `Person` JSON-LD all sit outside the markers on purpose. The JSON-LD
describes the person, not the page, so it is identical on every route.

- [ ] **Step 6: Wire it into the build and drop the hand-written sitemap**

In `package.json`, change the `build` script:

```json
    "build": "tsc && vite build && node scripts/prerender.mjs",
```

Then:

```bash
git rm public/sitemap.xml
```

- [ ] **Step 7: Build and inspect the output**

Run:

```bash
pnpm build
ls dist/*.html dist/sitemap.xml
for f in index contact admin 404; do
  printf '%s: ' "$f"
  grep -o '<title>[^<]*</title>' "dist/$f.html"
done
grep -c 'rel="canonical"' dist/404.html || true
grep -o '<meta name="robots"[^>]*>' dist/admin.html
grep -o '<meta property="og:url"[^>]*>' dist/contact.html
```

Expected:
- `dist/index.html dist/contact.html dist/admin.html dist/404.html dist/sitemap.xml` all present
- four distinct titles, matching `src/constants/seo.routes.json`'s French copy
- `grep -c` on `dist/404.html` prints `0` (no canonical on a noindex page)
- `<meta name="robots" content="noindex, nofollow" />` in `dist/admin.html`
- `<meta property="og:url" content="https://henrardvisuals.com/contact" />` in `dist/contact.html`

Also confirm the hashed bundle is still referenced in a non-home file:

Run: `grep -o 'src="/assets/[^"]*"' dist/contact.html`
Expected: a `/assets/index-<hash>.js` reference identical to the one in `dist/index.html`.

- [ ] **Step 8: Run the gates**

Run: `pnpm test && pnpm check`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add -A scripts index.html package.json public
git commit -m "build(seo): prerender per-route html and the sitemap"
```

---

### Task 6: Serve the prerendered files and return real 404s

The prerendered files are useless until nginx stops answering `/index.html` for
everything. This is also what turns the soft-404 into a real one.

**Files:**
- Modify: `nginx/default.conf` (the `location /` catch-all + a new `error_page`)
- Modify: `public/robots.txt`

**Interfaces:**
- Consumes: `dist/index.html`, `dist/contact.html`, `dist/admin.html`, `dist/404.html` from Task 5.
- Produces: HTTP contract — `/` `/contact` `/admin` → 200 with their own document and no redirect; anything else → 404 with the 404 document as the body.

- [ ] **Step 1: Replace the SPA catch-all**

In `nginx/default.conf`, replace this block:

```nginx
    # ---- SPA catch-all ----
    location / {
        include /etc/nginx/security-headers.conf;
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-store, must-revalidate" always;
    }
```

with:

```nginx
    # ---- Routes ----
    # scripts/prerender.mjs emits one HTML file per route, each with its own
    # title, description and Open Graph block. $uri.html is what turns
    # /contact into contact.html without an external redirect, so the URL a
    # visitor sees stays the canonical one — a `$uri/` directory match would
    # have bounced /contact to /contact/ with a 301.
    #
    # The final =404 is the point of the change: the old `/index.html` fallback
    # answered 200 for every unknown path, so the SPA's 404 view rendered
    # inside a 200 and crawlers indexed soft-404s.
    location / {
        include /etc/nginx/security-headers.conf;
        try_files $uri $uri.html $uri/ =404;
        add_header Cache-Control "no-store, must-revalidate" always;
    }

    # The 404 document is the same bundle as every other route; React reads the
    # path on load and renders the NotFound view, so the body matches the
    # status instead of contradicting it.
    error_page 404 /404.html;

    location = /404.html {
        include /etc/nginx/security-headers.conf;
        internal;
        add_header Cache-Control "no-store, must-revalidate" always;
    }
```

Known and accepted consequence: a request for a missing hashed asset now
returns the 404 HTML document as its body instead of nginx's stock page. The
status code is still 404, nothing parses that body, and every asset URL the app
emits is content-hashed by Vite — so scoping `error_page` per location to avoid
it would add configuration for no observable gain.

Leave the `location ~ ^/(api|wp-admin|wp-login|\.env|\.git)` block in place —
it short-circuits probe traffic before the try_files chain runs. Update only
its trailing comment, which now describes a problem that no longer exists:

```nginx
    # ---- Probe traffic: refuse before the route chain runs ----
    # These paths will never be a route. The catch-all below would 404 them
    # anyway; refusing here keeps them out of the try_files stat calls.
    location ~ ^/(api|wp-admin|wp-login|\.env|\.git) {
        include /etc/nginx/security-headers.conf;
        return 404;
    }
```

- [ ] **Step 2: Update robots.txt**

Replace `public/robots.txt` with:

```
User-agent: *
Allow: /
Disallow: /admin
# The prerendered error document is reachable by its own filename; it is a
# status-code body, not a page, and has no business in an index.
Disallow: /404.html

Sitemap: https://henrardvisuals.com/sitemap.xml
```

- [ ] **Step 3: Build the production image**

Run:

```bash
pnpm build
docker build --target production -t henrardvisuals:seo-check .
```

Expected: build succeeds. (No `VITE_*` build args are needed for this check —
the head tags under test are static and do not depend on the Supabase origin.)

- [ ] **Step 4: Verify the HTTP contract**

Run:

```bash
docker run -d --rm -p 8088:80 --name seo-check henrardvisuals:seo-check
sleep 2
for path in / /contact /admin /this-does-not-exist /robots.txt /sitemap.xml; do
  printf '%-24s %s\n' "$path" \
    "$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:8088$path")"
done
```

Expected, exactly:

```
/                        200
/contact                 200
/admin                   200
/this-does-not-exist     404
/robots.txt              200
/sitemap.xml             200
```

- [ ] **Step 5: Verify no redirect and the right document per path**

Run:

```bash
curl -s -o /dev/null -w 'redirects=%{num_redirects} final=%{url_effective}\n' -L http://localhost:8088/contact
for path in / /contact /admin /this-does-not-exist; do
  printf '%-24s ' "$path"
  curl -s "http://localhost:8088$path" | grep -o '<title>[^<]*</title>'
done
curl -s http://localhost:8088/this-does-not-exist | grep -o '<meta name="robots"[^>]*>'
```

Expected:
- `redirects=0 final=http://localhost:8088/contact` — no trailing-slash 301
- `/` → `Tristan Henrard — Portfolio mannequin | HenrardVisuals`
- `/contact` → `Contact — Tristan Henrard | HenrardVisuals`
- `/admin` → `Administration | HenrardVisuals`
- `/this-does-not-exist` → `Page non trouvée | HenrardVisuals`
- `<meta name="robots" content="noindex, nofollow" />` on the 404 body

- [ ] **Step 6: Confirm the security headers survived**

The headers are re-included per location and nginx drops inherited
`add_header` in any block that declares its own — the new `location = /404.html`
is exactly the case that regresses silently.

Run:

```bash
curl -s -D - -o /dev/null http://localhost:8088/this-does-not-exist \
  | grep -iE 'HTTP/|content-security-policy|x-frame-options|x-content-type-options'
curl -s -D - -o /dev/null http://localhost:8088/contact \
  | grep -iE 'HTTP/|content-security-policy|x-frame-options'
```

Expected: `HTTP/1.1 404` on the first, `HTTP/1.1 200` on the second, and the
CSP / `X-Frame-Options: DENY` / `X-Content-Type-Options: nosniff` headers
present on **both**. If any header is missing from the 404 response, the
`include /etc/nginx/security-headers.conf;` line is missing from
`location = /404.html`.

- [ ] **Step 7: Tear down**

Run: `docker stop seo-check`

- [ ] **Step 8: Commit**

```bash
git add nginx/default.conf public/robots.txt
git commit -m "fix(nginx): serve prerendered routes and real 404s"
```

---

### Task 7: Make `?lang=` select the locale

`index.html`, every prerendered file and the sitemap all advertise
`?lang=en` as the English alternate. Nothing reads it — the language comes from
`localStorage` only, so that URL serves French. Either the hreflang goes or the
parameter starts working; the parameter is four lines.

**Files:**
- Modify: `src/context/LanguageContext.tsx` (initial state)
- Modify: `src/i18n/index.ts` (i18next's own initial language)
- Test: `src/context/LanguageContext.test.tsx`

**Interfaces:**
- Consumes: `window.location.search`.
- Produces: no API change. `LanguageProvider`'s initial `language` is `?lang=fr|en` when present and valid, otherwise `localStorage.language`, otherwise `'fr'`.

- [ ] **Step 1: Write the failing test**

Create `src/context/LanguageContext.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LanguageProvider, useLanguage } from '@/context/LanguageContext';

function Probe() {
  const { language } = useLanguage();
  return <span data-testid="lang">{language}</span>;
}

const renderAt = (search: string) => {
  window.history.replaceState({}, '', `/${search}`);
  return render(
    <LanguageProvider>
      <Probe />
    </LanguageProvider>
  );
};

describe('LanguageProvider initial language', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('defaults to French with no query and no stored preference', () => {
    renderAt('');

    expect(screen.getByTestId('lang')).toHaveTextContent('fr');
  });

  it('honours the stored preference when there is no query parameter', () => {
    localStorage.setItem('language', 'en');

    renderAt('');

    expect(screen.getByTestId('lang')).toHaveTextContent('en');
  });

  it('lets an explicit ?lang= win over the stored preference', () => {
    localStorage.setItem('language', 'fr');

    renderAt('?lang=en');

    expect(screen.getByTestId('lang')).toHaveTextContent('en');
  });

  it('ignores a ?lang= value that is not a supported locale', () => {
    localStorage.setItem('language', 'en');

    renderAt('?lang=de');

    expect(screen.getByTestId('lang')).toHaveTextContent('en');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/context/LanguageContext.test.tsx`
Expected: FAIL — the third test reports `fr`, because the query parameter is
ignored.

- [ ] **Step 3: Read the query parameter in both initialisers**

Create `src/i18n/initialLanguage.ts`:

```ts
/**
 * Resolves the locale the app starts in.
 *
 * The query parameter wins because the static HTML and the sitemap both
 * advertise `?lang=en` as the English alternate — a stored French preference
 * silently serving French at that URL would make the hreflang a lie.
 */
const STORAGE_KEY = 'language';

export type Language = 'fr' | 'en';

const isLanguage = (value: string | null): value is Language => value === 'fr' || value === 'en';

export function resolveInitialLanguage(): Language {
  const fromQuery = new URLSearchParams(window.location.search).get('lang');
  if (isLanguage(fromQuery)) return fromQuery;

  const stored = localStorage.getItem(STORAGE_KEY);
  if (isLanguage(stored)) return stored;

  return 'fr';
}
```

In `src/i18n/index.ts`, replace:

```ts
const STORAGE_KEY = 'language';
const savedLanguage = localStorage.getItem(STORAGE_KEY);
const initialLanguage = savedLanguage === 'en' ? 'en' : 'fr';
```

with:

```ts
import { resolveInitialLanguage } from './initialLanguage';

const initialLanguage = resolveInitialLanguage();
```

placing the import with the other relative imports (`./en`, `./fr`,
`./initialLanguage` — alphabetical).

In `src/context/LanguageContext.tsx`, replace:

```ts
type Language = 'fr' | 'en';
```

with a re-export of the shared type, and replace the state initialiser:

```ts
import { resolveInitialLanguage, type Language } from '@/i18n/initialLanguage';
```

```ts
  const [language, setLanguageState] = useState<Language>(resolveInitialLanguage);
```

Keep `const STORAGE_KEY = 'language';` in `LanguageContext.tsx` — `setLanguage`
still writes to it.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/context/LanguageContext.test.tsx`
Expected: PASS — 4 tests.

- [ ] **Step 5: Run every gate**

Run: `pnpm test && pnpm check`
Expected: PASS. Watch `src/i18n/parity.test.ts` and the existing
`Login.test.tsx` / `PhotoLightbox.test.tsx` suites, which render inside
`LanguageProvider` and now go through the new initialiser.

- [ ] **Step 6: Verify end to end**

Run: `pnpm e2e -- e2e/seo.spec.ts`
Expected: PASS.

Then check the parameter by hand:

```bash
pnpm build
pnpm preview &
sleep 2
curl -s http://localhost:4173/ > /dev/null && echo "preview up"
```

Open `http://localhost:4173/?lang=en` in a browser: the page must render in
English on first paint, without touching the language toggle. Then stop the
preview server.

- [ ] **Step 7: Commit**

```bash
git add src/context/LanguageContext.tsx src/context/LanguageContext.test.tsx src/i18n
git commit -m "fix(i18n): honour the lang query parameter on load"
```

---

## Done criteria

- `pnpm test` passes, coverage thresholds unchanged and met.
- `pnpm check` clean.
- `pnpm e2e -- e2e/seo.spec.ts` passes.
- `pnpm build` emits `dist/{index,contact,admin,404}.html` with four distinct
  titles and `dist/sitemap.xml` listing only the two indexable routes.
- The production image answers 200 / 200 / 200 / **404** for
  `/` `/contact` `/admin` `/nope`, with no redirect on `/contact` and the full
  security-header set on every response.
- `grep -rn "useDocumentMeta" src/` returns nothing.
- The 404 matches screen 2a at 1440px and at 390px: empty 4:5 plate with corner
  marks and crosshair, Bodoni numeral, `RÉF. INCONNUE` struck through in
  vermillion beside `TIRAGE RETIRÉ`, the Bodoni statement, three exits, and the
  "Peut-être cherchiez-vous" strip when photos are reachable.
- Sharing `https://henrardvisuals.com/contact` in a link-preview client shows
  the contact title, the contact description and the shared 1200×630 card.
