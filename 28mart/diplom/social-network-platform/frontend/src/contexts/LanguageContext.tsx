import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Language } from '../components/shared/LanguageSwitcher';
import { translateBatch, isTranslationDisabled } from '../services/googleTranslateService';
import { toast } from 'react-hot-toast';

// Create storage key for local storage
const LANGUAGE_STORAGE_KEY = 'app_language';

// Get initial language from localStorage or default to 'EN'
const getInitialLanguage = (): Language => {
  if (typeof window === 'undefined') return 'EN';
  
  const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (savedLanguage && ['EN', 'RU', 'KK', 'TR'].includes(savedLanguage)) {
    return savedLanguage as Language;
  }
  
  // Default to English
  return 'EN';
};

// Types for context
interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => Promise<void>;
  isTranslating: boolean;
  forceRefreshTranslations: () => Promise<void>;
  translateText: (text: string, lang?: Language) => Promise<string>;
  tWithTemplate: (key: string, template?: Record<string, any>) => string;
  currentLanguage: string;
  setCurrentLanguage: (lang: string) => void;
  t: (key: string) => string;
}

// Create context with default values
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t, i18n } = useTranslation();
  const [language, setLanguageState] = useState<Language>(getInitialLanguage());
  const [isTranslating, setIsTranslating] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('en');

  // Cache for storing translations
  const translationCache = useCallback(() => {
    const cache = new Map<string, string>();
    return {
      get: (key: string) => cache.get(key),
      set: (key: string, value: string) => cache.set(key, value),
      has: (key: string) => cache.has(key),
      clear: () => cache.clear()
    };
  }, [])();

  const translateText = useCallback(
    async (text: string, targetLang?: Language): Promise<string> => {
      if (!text) return '';
      
      const langToUse = targetLang || language;
      if (langToUse === 'EN') return text;
      
      // Check if translation is disabled globally
      if (isTranslationDisabled) {
        return text;
      }
      
      // Check cache first
      const cacheKey = `${text}:${langToUse}`;
      if (translationCache.has(cacheKey)) {
        return translationCache.get(cacheKey) || text;
      }
      
      try {
        // Translate text using Google Translate API
        const translated = await translateBatch([text], langToUse, 'EN');
        
        if (translated && translated.length > 0) {
          const translatedText = translated[0];
          // Cache the result
          translationCache.set(cacheKey, translatedText);
          return translatedText;
        }
        
        return text;
      } catch (error) {
        console.error('Error translating text:', error);
        return text;
      }
    },
    [language, translationCache]
  );

  // Function to translate all dynamic content in the app
  const translateDynamicContent = useCallback(async () => {
    if (language === 'EN' || isTranslationDisabled) return;
    
    try {
      // Find all elements with data-i18n attribute
      const elementsToTranslate = document.querySelectorAll('[data-i18n]');
      if (elementsToTranslate.length === 0) return;
      
      // Extract text from elements
      const textsToTranslate: string[] = [];
      const elementMap: Map<number, HTMLElement> = new Map();
      
      elementsToTranslate.forEach((element) => {
        const text = element.textContent?.trim();
        if (text && text.length > 0) {
          textsToTranslate.push(text);
          elementMap.set(textsToTranslate.length - 1, element as HTMLElement);
        }
      });
      
      if (textsToTranslate.length === 0) return;
      
      // Translate texts in batch
      const translations = await translateBatch(textsToTranslate, language, 'EN');
      
      // Update elements with translations
      if (translations && translations.length > 0) {
        translations.forEach((translatedText, index) => {
          const element = elementMap.get(index);
          if (element) {
            // Save original text as data attribute for reference
            if (!element.getAttribute('data-i18n-original')) {
              element.setAttribute('data-i18n-original', textsToTranslate[index]);
            }
            
            // Update text content
            element.textContent = translatedText;
          }
        });
      }
    } catch (error) {
      console.error('Error translating dynamic content:', error);
    }
  }, [language]);

  // Function to force refresh of translations
  const forceRefreshTranslations = useCallback(async () => {
    // Clear translation cache
    translationCache.clear();
    
    // Reload i18next translations
    await i18n.reloadResources();
    
    // Translate dynamic content
    await translateDynamicContent();
    
    // Dispatch a custom event to notify components
    window.dispatchEvent(new CustomEvent('languageChanged'));
  }, [i18n, translateDynamicContent, translationCache]);

  // Function to set language with side effects
  const setLanguage = useCallback(
    async (newLanguage: Language) => {
      if (newLanguage === language) return;
      
      setIsTranslating(true);
      
      try {
        // First update local state
        setLanguageState(newLanguage);
        
        // Update localStorage
        localStorage.setItem(LANGUAGE_STORAGE_KEY, newLanguage);
        
        // Change language in i18next
        const i18nLang = newLanguage.toLowerCase();
        await i18n.changeLanguage(i18nLang);
        
        // Clear translation cache
        translationCache.clear();
        
        // Translate dynamic content after language change
        if (newLanguage !== 'EN') {
          await translateDynamicContent();
        }
        
        // Dispatch a custom event to notify components
        window.dispatchEvent(new CustomEvent('languageChanged'));
      } catch (error) {
        console.error('Error changing language:', error);
        toast.error('Error changing language. Some translations may be missing.');
      } finally {
        setIsTranslating(false);
      }
    },
    [language, i18n, translateDynamicContent, translationCache]
  );

  // When language changes, update document attributes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language.toLowerCase();
      document.documentElement.dir = ['AR', 'FA', 'HE', 'UR'].includes(language) ? 'rtl' : 'ltr';
      
      // Add/remove RTL class for styling
      if (['AR', 'FA', 'HE', 'UR'].includes(language)) {
        document.documentElement.classList.add('rtl');
      } else {
        document.documentElement.classList.remove('rtl');
      }
    }
  }, [language]);

  // Init and add event listeners
  useEffect(() => {
    // Initialize with current language
    const initLanguage = async () => {
      const currentLang = getInitialLanguage();
      
      // Only change if not already set
      if (i18n.language !== currentLang.toLowerCase()) {
        await i18n.changeLanguage(currentLang.toLowerCase());
      }
      
      // Translate dynamic content on init for non-English languages
      if (currentLang !== 'EN') {
        setTimeout(() => translateDynamicContent(), 500);
      }
    };
    
    initLanguage();
    
    // Add mutation observer to detect dynamically added content
    const observer = new MutationObserver((mutations) => {
      let shouldTranslate = false;
      
      mutations.forEach(mutation => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as HTMLElement;
              if (element.querySelector('[data-i18n]') || element.hasAttribute('data-i18n')) {
                shouldTranslate = true;
              }
            }
          });
        }
      });
      
      if (shouldTranslate && language !== 'EN') {
        translateDynamicContent();
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    return () => {
      observer.disconnect();
    };
  }, [i18n, language, translateDynamicContent]);

  // Function for template translation with variable substitution
  const tWithTemplate = useCallback(
    (key: string, template?: Record<string, any>): string => {
      try {
        if (!key) return '';
        
        const translated = t(key, template);
        
        if (translated === key || (translated.startsWith(key.charAt(0)) && translated.endsWith(key.charAt(key.length - 1)))) {
          return key;
        }
        
        return translated;
      } catch (error) {
        console.error(`Error translating key: ${key}`, error);
        return key;
      }
    },
    [t]
  );

  // Function to change language
  const handleLanguageChange = (lang: string) => {
    setCurrentLanguage(lang);
  };

  // Context value
  const contextValue = {
    language,
    setLanguage,
    isTranslating,
    forceRefreshTranslations,
    translateText,
    tWithTemplate,
    currentLanguage,
    setCurrentLanguage: handleLanguageChange,
    t
  };

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

// Hook to use the language context
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
