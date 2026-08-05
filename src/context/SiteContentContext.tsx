import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import {
  DEFAULT_CONTACT_DETAILS,
  DEFAULT_SITE_COPY,
  mergeContactDetails,
  mergeSiteCopy,
  resolveText,
} from '@/constants/siteContentDefaults';
import { useLanguage } from '@/context/LanguageContext';
import { supabase } from '@/lib/supabase';
import type { ContactDetails, SiteCopy, SiteCopyField } from '@/types';

/**
 * Operator-editable content, fetched once for the whole app.
 *
 * It sits above the router rather than inside a page because the footer, the
 * menu overlay and both contact blocks all need it. The three rows come back
 * in a single request; `profile_settings` is deliberately left to
 * `useHomeData`, which already fetches it alongside the hero and categories.
 */
interface SiteContentValue {
  copy: SiteCopy;
  contact: ContactDetails;
  /** Copy resolved for the active language, with the French fallback applied. */
  text: (field: SiteCopyField) => string;
  isLoading: boolean;
  /** Re-reads the rows — the admin panel calls this after a save. */
  refresh: () => void;
}

const SiteContentContext = createContext<SiteContentValue | undefined>(undefined);

const CONTENT_KEYS = ['site_copy', 'contact_email', 'social_links'] as const;

export function SiteContentProvider({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  const [copy, setCopy] = useState<SiteCopy>(DEFAULT_SITE_COPY);
  const [contact, setContact] = useState<ContactDetails>(DEFAULT_CONTACT_DETAILS);
  const [isLoading, setIsLoading] = useState(true);
  const [version, setVersion] = useState(0);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('key, value')
          .in('key', CONTENT_KEYS as unknown as string[]);

        if (cancelled || error) return;

        const rows = new Map((data ?? []).map((row) => [row.key, row.value]));
        setCopy(mergeSiteCopy(rows.get('site_copy')));
        setContact(mergeContactDetails(rows.get('contact_email'), rows.get('social_links')));
      } catch {
        // The defaults are already in state and they are the shipped copy, so
        // a failure here leaves the site reading exactly as it would offline.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [version]);

  const text = useCallback(
    (field: SiteCopyField) => resolveText(copy[field], language),
    [copy, language]
  );

  const value = useMemo(
    () => ({ copy, contact, text, isLoading, refresh }),
    [copy, contact, text, isLoading, refresh]
  );

  return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>;
}

export function useSiteContent() {
  const context = useContext(SiteContentContext);
  if (!context) {
    throw new Error('useSiteContent must be used within a SiteContentProvider');
  }
  return context;
}
