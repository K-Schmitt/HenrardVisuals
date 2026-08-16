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
