/**
 * i18n Configuration
 * 
 * Multi-language internationalization setup using i18next.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// Import translations
import enTranslations from '../locales/en/translation.json';
import esTranslations from '../locales/es/translation.json';
import heTranslations from '../locales/he/translation.json';
import arTranslations from '../locales/ar/translation.json';
import frTranslations from '../locales/fr/translation.json';
import deTranslations from '../locales/de/translation.json';

export const supportedLanguages = {
  en: { name: 'English', nativeName: 'English', dir: 'ltr' },
  es: { name: 'Spanish', nativeName: 'Español', dir: 'ltr' },
  he: { name: 'Hebrew', nativeName: 'עברית', dir: 'rtl' },
  ar: { name: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
  fr: { name: 'French', nativeName: 'Français', dir: 'ltr' },
  de: { name: 'German', nativeName: 'Deutsch', dir: 'ltr' }
};

export const defaultLanguage = 'en';

// RTL languages
export const rtlLanguages = ['he', 'ar'];

i18n
  // Load translation backend
  .use(Backend)
  // Detect user language
  .use(LanguageDetector)
  // Pass i18n to react-i18next
  .use(initReactI18next)
  // Initialize i18next
  .init({
    resources: {
      en: { translation: enTranslations },
      es: { translation: esTranslations },
      he: { translation: heTranslations },
      ar: { translation: arTranslations },
      fr: { translation: frTranslations },
      de: { translation: deTranslations }
    },
    fallbackLng: defaultLanguage,
    supportedLngs: Object.keys(supportedLanguages),
    
    // Language detection options
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng'
    },
    
    interpolation: {
      escapeValue: false // React already escapes
    },
    
    react: {
      useSuspense: true,
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',
      transEmptyNodeValue: '',
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'p']
    },
    
    // Debugging (disable in production)
    debug: process.env.NODE_ENV === 'development',
    
    // Key separator
    keySeparator: '.',
    
    // Namespace separator
    nsSeparator: ':',
    
    // Default namespace
    defaultNS: 'translation'
  });

// Update HTML dir attribute when language changes
i18n.on('languageChanged', (lng) => {
  const direction = rtlLanguages.includes(lng) ? 'rtl' : 'ltr';
  document.documentElement.dir = direction;
  document.documentElement.lang = lng;
});

export default i18n;
