import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en';
import fr from './fr';
import { resolveInitialLanguage } from './initialLanguage';

const initialLanguage = resolveInitialLanguage();

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
  },
  lng: initialLanguage,
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
});

export default i18n;
