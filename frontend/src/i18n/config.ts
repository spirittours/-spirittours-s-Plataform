/**
 * i18n Configuration for Spirit Tours
 * Supports: English, Spanish, Hebrew, Arabic
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// Import translations
import enTranslations from './locales/en/translation.json';
import esTranslations from './locales/es/translation.json';
import heTranslations from './locales/he/translation.json';
import arTranslations from './locales/ar/translation.json';

export const SUPPORTED_LANGUAGES = {
  en: { name: 'English', nativeName: 'English', dir: 'ltr' },
  es: { name: 'Spanish', nativeName: 'Español', dir: 'ltr' },
  he: { name: 'Hebrew', nativeName: 'עברית', dir: 'rtl' },
  ar: { name: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
};

export const DEFAULT_LANGUAGE = 'en';

// Configure i18next
i18n
  // Load translation using http backend
  .use(Backend)
  // Detect user language
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  // Init i18next
  .init({
    resources: {
      en: { translation: enTranslations },
      es: { translation: esTranslations },
      he: { translation: heTranslations },
      ar: { translation: arTranslations },
    },
    
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: Object.keys(SUPPORTED_LANGUAGES),
    
    // Debug mode (disable in production)
    debug: process.env.NODE_ENV === 'development',
    
    // Detection options
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    
    // Interpolation options
    interpolation: {
      escapeValue: false, // React already does escaping
      formatSeparator: ',',
    },
    
    // React specific options
    react: {
      useSuspense: true,
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',
      transEmptyNodeValue: '',
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'p'],
    },
    
    // Backend options
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
      addPath: '/locales/{{lng}}/{{ns}}.missing.json',
    },
    
    // Namespaces
    ns: ['translation'],
    defaultNS: 'translation',
    
    // Return null for missing keys
    returnNull: false,
    returnEmptyString: false,
    
    // Key separator
    keySeparator: '.',
    nsSeparator: ':',
  });

// Update HTML direction based on language
i18n.on('languageChanged', (lng) => {
  const dir = SUPPORTED_LANGUAGES[lng as keyof typeof SUPPORTED_LANGUAGES]?.dir || 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.lang = lng;
});

export default i18n;
