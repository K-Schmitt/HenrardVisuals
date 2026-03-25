import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

import i18n from '@/i18n';

// Activate i18next module augmentation so t() only accepts valid keys.
import '@/i18n/i18next.d.ts';

type Language = 'fr' | 'en';

// Derive valid key type from the augmented i18n.t signature — callers of
// useLanguage().t() get compile-time key checking at no extra cost.
type TKey = Parameters<typeof i18n.t>[0];
type TOptions = Record<string, unknown>;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TKey, options?: TOptions) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'language';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(
    () => (localStorage.getItem(STORAGE_KEY) as Language | null) ?? 'fr'
  );

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    i18n.changeLanguage(lang);
  };

  // Memoised so consumers only re-render when the language actually changes,
  // not on every render of the provider.
  const t = useCallback(
    // Cast required: i18n.t overloads are too narrow for the union TKey.
    // Type safety is enforced at the interface level above.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (key: TKey, options?: TOptions) => i18n.t(key as any, options as any) as string,
    // language is the only reactive dependency — when it changes, i18n.t
    // will return translations for the new locale on the next render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
