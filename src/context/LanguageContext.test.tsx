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
