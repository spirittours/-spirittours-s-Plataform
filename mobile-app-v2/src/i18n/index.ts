/**
 * Internationalization Configuration
 * Supports Spanish and English
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as RNLocalize from 'react-native-localize';
import en from './translations/en.json';
import es from './translations/es.json';

const resources = {
  en: { translation: en },
  es: { translation: es },
};

const languageDetector = {
  type: 'languageDetector' as const,
  async: true,
  detect: (callback: (lng: string) => void) => {
    const locales = RNLocalize.getLocales();
    const bestLanguage = locales[0]?.languageCode || 'en';
    callback(bestLanguage);
  },
  init: () => {},
  cacheUserLanguage: () => {},
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    compatibilityJSON: 'v3',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
