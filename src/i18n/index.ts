import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en';
import fr from './fr';

const STORAGE_KEY = 'language';
const savedLanguage = localStorage.getItem(STORAGE_KEY);
const initialLanguage = savedLanguage === 'en' ? 'en' : 'fr';

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
