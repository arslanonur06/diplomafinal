import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
// Remove the import for the large translations file
// import { translations } from './locales/translations'; 

// Import individual JSON files for each language
import enTranslations from './locales/en.json';
import ruTranslations from './locales/ru.json';
import kkTranslations from './locales/kk.json';
import trTranslations from './locales/tr.json';

const resources = {
  en: {
    translation: enTranslations
  },
  ru: {
    // Use the imported JSON file
    translation: ruTranslations 
  },
  kk: {
    // Use the imported JSON file
    translation: kkTranslations 
  },
  tr: {
    // Use the imported JSON file
    translation: trTranslations 
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // Default language
    fallbackLng: 'en', // Fallback language if detection fails
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'], // Detect language from localStorage first, then browser
      caches: ['localStorage'], // Cache the detected language in localStorage
    },
    returnObjects: true,
    returnEmptyString: false,
    // If a key is missing, return the key itself for easier debugging
    parseMissingKeyHandler: (key) => `Missing translation: ${key}`,
    debug: process.env.NODE_ENV === 'development' // Enable debug logging in development
  });

export default i18n;
