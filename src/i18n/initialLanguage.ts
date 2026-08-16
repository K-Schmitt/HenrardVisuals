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
