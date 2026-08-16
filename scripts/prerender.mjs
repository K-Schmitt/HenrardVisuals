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
