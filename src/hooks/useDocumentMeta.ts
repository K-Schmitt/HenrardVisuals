import { useEffect } from 'react';

import { useLanguage } from '@/context/LanguageContext';

interface DocumentMeta {
  title: string;
  description: string;
  noindex?: boolean;
}

const upsertMeta = (selector: string, attr: string, value: string, content: string): void => {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, value);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
};

/**
 * Per-route document metadata. This is a client-side SPA, so it does not help
 * crawlers that never execute JS — but it does fix the browser tab, the
 * bookmark title, and the screen-reader page announcement, and it keeps
 * documentElement.lang honest for a bilingual site whose language otherwise
 * lives only in localStorage.
 */
export function useDocumentMeta({ title, description, noindex = false }: DocumentMeta): void {
  const { language } = useLanguage();

  useEffect(() => {
    document.title = title;
    document.documentElement.lang = language;

    upsertMeta('meta[name="description"]', 'name', 'description', description);
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', title);
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', description);

    if (noindex) {
      upsertMeta('meta[name="robots"]', 'name', 'robots', 'noindex, nofollow');
    } else {
      document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')?.remove();
    }
  }, [title, description, noindex, language]);
}
