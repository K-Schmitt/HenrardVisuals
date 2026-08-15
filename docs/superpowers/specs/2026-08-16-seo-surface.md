# SEO Surface — Spec

**Date:** 2026-08-16
**Status:** approved (decisions taken 2026-08-16)

## Problem

The site already carries most of an SEO surface, but the pieces do not hold
together:

1. **Per-route metadata is client-only.** `useDocumentMeta` runs in a `useEffect`.
   Any consumer that does not execute JavaScript — Slack, Discord, Twitter,
   LinkedIn, WhatsApp, Bluesky link previews, and every non-Google crawler —
   sees only the static tags in `index.html`, which describe the home page.
   Sharing `https://henrardvisuals.com/contact` produces a home-page card.

2. **`useDocumentMeta` is incomplete.** It rewrites `og:title` and
   `og:description` only. `canonical`, `og:url`, `og:image`, `og:image:alt`,
   `og:locale` and every `twitter:*` tag keep their `index.html` values on every
   route, so a shared `/contact` URL advertises `og:url = https://henrardvisuals.com/`.

3. **The 404 route has no metadata at all** and is not marked `noindex`. It also
   lives inline in `App.tsx`, uses a raw `<a href="/">` (full page reload,
   discarding the SPA), and has no test.

4. **404 answers HTTP 200.** `nginx/default.conf`'s SPA catch-all
   (`try_files $uri $uri/ /index.html`) returns 200 for every unknown path. The
   404 view renders inside a 200 response — a soft-404, which crawlers index.

5. **Metadata is duplicated across three files** — `index.html`, `src/i18n/fr.ts`
   and `src/i18n/en.ts` (`meta.*` keys) — with no mechanism keeping them equal.

6. **`hreflang` lies.** `index.html` and `sitemap.xml` both advertise
   `https://henrardvisuals.com/?lang=en` as the English alternate, but
   `LanguageProvider` and `src/i18n/index.ts` read the language from
   `localStorage` only. `?lang=en` serves French.

## Decisions

Taken by the repository owner on 2026-08-16:

- **Build-time prerender.** A post-build Node script emits one static HTML file
  per route, each carrying its own title, description and Open Graph block. No
  runtime SSR, no framework migration.
- **One shared Open Graph image.** The existing `public/og-image.jpg`
  (verified 1200×630) is reused on every route. No per-route artwork, no
  build-time image composition. Routes differ by `og:image:alt` only.
- **The 404 page is extracted, hardened and rebuilt from the design doc.** New
  file, real metadata, `noindex`, router-aware links, tests — and the doc's own
  404 screen (direction 1a, option `2a` "LA PLANCHE MANQUANTE") in place of the
  current bare numeral. See R4.

## Requirements

### R1 — Single source of truth for route metadata

One file holds `title`, `description` and `og:image:alt` for every route, in
both locales, plus the indexability flag and sitemap hints. Both the React app
and the prerender script read it. `index.html`'s inline tags become a dev-time
fallback only. The `meta.*` keys disappear from `src/i18n/{fr,en}.ts`.

### R2 — Complete per-route metadata at runtime

On every route change the document must carry, for the active locale: `title`,
`description`, `canonical` (indexable routes only), `og:title`,
`og:description`, `og:url`, `og:image`, `og:image:alt`, `og:locale`,
`twitter:title`, `twitter:description`, `twitter:image`, `twitter:image:alt`,
and `robots: noindex, nofollow` on `/admin` and the 404 view. `<html lang>`
tracks the active locale.

### R3 — Complete per-route metadata in static HTML

`pnpm build` emits `dist/index.html`, `dist/contact.html`, `dist/admin.html`
and `dist/404.html`. Each carries the French metadata for its route (French is
the default locale). `/admin` and `/404` carry `noindex` and no canonical.
`sitemap.xml` is generated from the same table, excluding `noindex` routes.

### R4 — The 404 page from the design doc

The design doc already contains a 404 screen for direction 1a — section 2,
option `2a`, **"404 — LA PLANCHE MANQUANTE"**. It is the design; nothing is
invented.

Its stated intent: *"Le langage du book pris au mot : la page absente devient
un tirage retiré de la planche. Cadre vide au ratio 4:5 avec repères de coin et
légende technique barrée, exactement la même syntaxe que les figures du
portfolio. Le 404 est en Bodoni sur le vide, pas en gros bloc décoratif. Trois
sorties utiles en bas, dont deux vraies images du book — on ne laisse jamais le
visiteur en cul-de-sac."*

Required elements:
- Empty 4:5 frame, `#151515` ground, `rgba(242,240,236,.16)` border, four corner
  marks and a centre crosshair; the numeral set in Bodoni over the void
  (132px desktop / 104px mobile), not as a decorative slab.
- Caption `RÉF. INCONNUE` struck through in `#E4462C`, beside `TIRAGE RETIRÉ`.
- Vermillion 5px square + `ERREUR 404` eyebrow; Bodoni statement
  *"Cette planche n'est pas au book."*; the doc's lead paragraph.
- Three exits — home, portfolio, write — inline on desktop, full-width rows with
  a trailing arrow on mobile.
- A `Peut-être cherchiez-vous` strip of three real plates from the book.

Departures allowed, and only these: the mock's `#2a` hrefs become the real
routes and `contact.email`; the mock draws its own header and footer, which
`SiteLayout` already provides; the three suggested plates come from the
database rather than being the doc's hardcoded 01/04/06.

Links use `react-router-dom`'s `Link` (the current inline 404 uses a raw
`<a href>` and reloads the whole bundle). Bilingual copy. Unit test + e2e
coverage.

Direction 1b's screens are rejected and must not be used.

### R5 — Honest HTTP status codes

`/` , `/contact`, `/admin` answer 200 from their own prerendered file, with no
external redirect (no trailing-slash 301 — the canonical URL stays
`/contact`). Any unknown path answers **404** with the 404 document as its body.

### R6 — robots.txt

Keeps the existing allow-all + `Disallow: /admin` + sitemap pointer. Adds a
`Disallow` for the prerendered 404 document so it cannot be indexed as a page
in its own right.

### R7 — `?lang=` actually switches language

`?lang=en` / `?lang=fr` selects the initial locale, so the `hreflang` alternates
advertised in the static HTML and sitemap are not a lie. Explicit query wins
over the `localStorage` preference; `localStorage` remains the fallback.

## Out of scope

- Server-side rendering or a framework migration.
- Per-route Open Graph artwork.
- Prerendering an English HTML variant (query strings do not map to static
  files; `?lang=en` is handled client-side, which Google executes).
- Structured data beyond the existing site-wide `Person` JSON-LD.
- Image sitemaps, `lastmod` tracking from the database.

## Design source

Claude Design project `75bdfafd-e9b5-4ea3-a175-a1832a3bac55`, file
`Refonte HenrardVisuals.dc.html`, readable through the `DesignSync` tool
(`method: get_file`). Section 2 holds the 404; section 1 holds the two
competing directions. Only **1a "Le Book"** is live — see the standing note that
1b "PLANCHE CONTACT" was rejected and still sits in the same document.

## Non-negotiable values

- Site origin: `https://henrardvisuals.com`
- Shared OG image: `/og-image.jpg`, 1200×630
- Default locale: `fr` (`fr_FR`); alternate `en` (`en_GB`)
- Routes: `/`, `/contact`, `/admin` (noindex), 404 (noindex)
