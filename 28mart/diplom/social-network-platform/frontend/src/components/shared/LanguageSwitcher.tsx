import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { FaGlobe, FaSpinner } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { checkTranslationServer } from '../../services/googleTranslateService';

// Use the same translation server URL fetching logic as the service
const getTranslationServerUrl = () => {
  // Check for environment variable first
  if (typeof process !== 'undefined' && process.env && process.env.TRANSLATION_SERVER_URL) {
    return process.env.TRANSLATION_SERVER_URL;
  }
  
  // Check if browser has a configured URL
  if (typeof window !== 'undefined' && (window as any).TRANSLATION_SERVER_URL) {
    return (window as any).TRANSLATION_SERVER_URL;
  }
  
  // Get the translation server port from environment or fallback
  const port = typeof process !== 'undefined' && process.env && process.env.TRANSLATION_SERVER_PORT 
    ? process.env.TRANSLATION_SERVER_PORT 
    : typeof window !== 'undefined' && (window as any).TRANSLATION_SERVER_PORT 
      ? (window as any).TRANSLATION_SERVER_PORT 
      : 3005;
  
  // Default fallback to localhost with the port
  return `http://localhost:${port}`;
};

const TRANSLATION_SERVER_URL = getTranslationServerUrl();

export type Language = 'EN' | 'RU' | 'KK' | 'TR';

export const languages: Language[] = ['EN', 'RU', 'KK', 'TR'];

interface LanguageExamples {
  hello: string;
  welcome: string;
  button_example: string;
}

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage, isTranslating } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [examples, setExamples] = useState<LanguageExamples | null>(null);
  const [serverStatus, setServerStatus] = useState<'checking' | 'available' | 'unavailable'>('unavailable'); // Default to unavailable
  const [lastError, setLastError] = useState<string | null>("Translation disabled - working in fallback mode");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [checkCount, setCheckCount] = useState(0); // Track how many times we've checked

  useEffect(() => {
    // Only try checking once during startup to avoid constant errors
    checkServerStatus();
  }, []);

  // Check translation server status without repetitive retries
  const checkServerStatus = async () => {
    // Don't check more than 3 times to prevent flood of errors
    if (checkCount >= 3) {
      return;
    }
    
    setCheckCount(prevCount => prevCount + 1);
    setServerStatus('checking');
    
    try {
      const isAvailable = await checkTranslationServer();
      setServerStatus(isAvailable ? 'available' : 'unavailable');
      
      if (!isAvailable) {
        setLastError('Translation server is offline - using fallback mode');
      } else {
        setLastError(null);
      }
    } catch (error) {
      console.error('Error checking translation server:', error);
      setServerStatus('unavailable');
      setLastError('Error connecting to translation service');
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Load example text when dropdown is opened
  useEffect(() => {
    if (isOpen) {
      // These examples help users understand what the language looks like
      const languageExamples: Record<Language, LanguageExamples> = {
        EN: {
          hello: 'Hello',
          welcome: 'Welcome',
          button_example: 'Submit'
        },
        RU: {
          hello: 'Привет',
          welcome: 'Добро пожаловать',
          button_example: 'Отправить'
        },
        KK: {
          hello: 'Сәлем',
          welcome: 'Қош келдіңіз',
          button_example: 'Жіберу'
        },
        TR: {
          hello: 'Merhaba',
          welcome: 'Hoş geldiniz',
          button_example: 'Gönder'
        }
      };
      
      setExamples(languageExamples[language]);
    }
  }, [isOpen, language]);

  const handleLanguageChange = async (newLanguage: Language) => {
    if (language === newLanguage) {
      setIsOpen(false);
      return;
    }
    
    // In offline mode, just change the language without checking server
    if (serverStatus === 'unavailable') {
      setLanguage(newLanguage);
      setIsOpen(false);
      
      toast.success(`Language changed to ${newLanguage} (translations disabled)`, {
        icon: '🌐',
        duration: 2000,
      });
      return;
    }
    
    // Try checking server status before changing language
    try {
      const isAvailable = await checkTranslationServer();
      setServerStatus(isAvailable ? 'available' : 'unavailable');
      
      if (!isAvailable) {
        toast('Translation server is offline. Using original text.', {
          icon: '⚠️',
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Error checking translation server:', error);
    }
    
    // Change language regardless
    setLanguage(newLanguage);
    setIsOpen(false);
    
    toast.success(`Language changed to ${newLanguage}`, {
      icon: '🌐',
      duration: 2000,
    });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center text-gray-600 dark:text-white/70 hover:text-gray-800 dark:hover:text-white transition-colors duration-200"
        aria-label="Change Language"
        title={`Change Language (${serverStatus === 'available' ? 'Online' : 'Offline mode'})`}
      >
        {isTranslating ? (
          <FaSpinner className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <FaGlobe className="w-5 h-5" />
            {/* Server status indicator dot */}
            <span className={`absolute top-0 right-0 block w-2 h-2 rounded-full ${
              serverStatus === 'available' 
                ? 'bg-green-400' 
                : serverStatus === 'unavailable' 
                  ? 'bg-red-400' 
                  : 'bg-yellow-400 animate-pulse'
            }`} />
          </>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-xl shadow-lg py-1 z-50">
          {lastError && (
            <div className="px-4 py-2 text-xs text-red-500 border-b border-gray-200 dark:border-gray-700">
              {lastError}
            </div>
          )}
          
          {/* Server status indicator */}
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Translation server
              </span>
              <span className={`flex items-center text-xs ${
                serverStatus === 'available' 
                  ? 'text-green-500 dark:text-green-400' 
                  : serverStatus === 'unavailable' 
                    ? 'text-red-500 dark:text-red-400' 
                    : 'text-yellow-500 dark:text-yellow-400'
              }`}>
                <span className={`inline-block w-2 h-2 rounded-full mr-1 ${
                  serverStatus === 'available' 
                    ? 'bg-green-500 dark:bg-green-400' 
                    : serverStatus === 'unavailable' 
                      ? 'bg-red-500 dark:bg-red-400' 
                      : 'bg-yellow-500 dark:bg-yellow-400 animate-pulse'
                }`} />
                {serverStatus === 'available' 
                  ? 'Online' 
                  : serverStatus === 'unavailable' 
                    ? 'Offline' 
                    : 'Checking...'}
              </span>
            </div>
            {checkCount < 3 && (
              <div className="mt-1 text-xs text-gray-500">
                <button 
                  onClick={checkServerStatus}
                  className="text-blue-500 hover:underline"
                >
                  Test connection
                </button>
              </div>
            )}
          </div>
          
          {/* Current language info */}
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current: {language.toUpperCase()}</div>
            {examples && (
              <div className="text-xs">
                <div><span className="text-gray-500">Hello:</span> {examples.hello}</div>
                <div><span className="text-gray-500">Welcome:</span> {examples.welcome}</div>
                <div><span className="text-gray-500">Button:</span> {examples.button_example}</div>
              </div>
            )}
          </div>

          {/* Language options */}
          <div className="py-1">
            {languages.map((lang) => (
              <button
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                className={`block w-full text-left px-4 py-2 text-sm ${
                  language === lang
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800/80'
                }`}
                disabled={isTranslating}
              >
                {lang === 'EN' && 'English 🇬🇧'}
                {lang === 'RU' && 'Русский 🇷🇺'}
                {lang === 'KK' && 'Қазақша 🇰🇿'}
                {lang === 'TR' && 'Türkçe 🇹🇷'}
              </button>
            ))}
          </div>
          
          {/* Debug option */}
          <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                // Force reload translations
                window.location.reload();
              }}
              className="w-full text-xs text-center text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
            >
              Reload app
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
