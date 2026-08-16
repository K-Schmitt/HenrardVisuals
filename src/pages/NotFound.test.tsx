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

// SuggestedPlates queries Supabase directly; stub it to [] so this stays a
// markup test rather than one that drags a database call along.
vi.mock('@/hooks/useSuggestedPhotos', () => ({
  useSuggestedPhotos: () => [],
}));

// SuggestedPlates also imports @/lib/imageUrl for its (unreached) image URLs,
// which imports @/lib/supabase — that throws at import time without env vars,
// so the module needs a stub even though the mocked hook above never calls it.
vi.mock('@/lib/supabase', () => ({
  getStorageUrl: (path: string) => `https://cdn.example.com/${path}`,
}));

import { LanguageProvider } from '@/context/LanguageContext';
import i18n from '@/i18n';
import { NotFound } from '@/pages/NotFound';

const renderPage = () =>
  render(
    <MemoryRouter>
      <LanguageProvider>
        <NotFound />
      </LanguageProvider>
    </MemoryRouter>
  );

// src/test/setup.ts switches i18n to English for the whole suite, so every
// assertion below is the English copy by default — see the locale-switch
// test at the end of this file for the French strings.
describe('NotFound', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('states the error in a single level-one heading', () => {
    renderPage();

    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('This plate is not in the book.');
  });

  it('marks the plate with the doc’s struck-through technical caption', () => {
    renderPage();

    expect(screen.getByText('Unknown ref.')).toBeInTheDocument();
    expect(screen.getByText('Print withdrawn')).toBeInTheDocument();
  });

  it('keeps the decorative numeral out of the accessibility tree', () => {
    renderPage();

    expect(screen.getByText('404', { selector: 'span' })).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('Error 404')).toBeInTheDocument();
  });

  it('explains what happened', () => {
    renderPage();

    expect(screen.getByText(/matches no series/)).toBeInTheDocument();
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

  it('renders the French copy when the locale is switched', async () => {
    try {
      await i18n.changeLanguage('fr');
      renderPage();

      expect(screen.getByText("Cette planche n'est pas au book.")).toBeInTheDocument();
      expect(screen.getByText('Réf. inconnue')).toBeInTheDocument();
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});
