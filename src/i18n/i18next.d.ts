import type fr from './fr';

// Augment i18next so that i18n.t() only accepts keys that exist in the
// translation files. Passing an unknown key is a compile-time error.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: typeof fr;
    };
  }
}
