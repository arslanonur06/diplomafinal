import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { FaCheck, FaLanguage, FaGlobe, FaTimes, FaExchangeAlt, FaCode, FaInfoCircle } from 'react-icons/fa';

const LanguageTest: React.FC = () => {
  const { language, translateText, tWithTemplate, t, isTranslating } = useLanguage();
  
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslatingInput, setIsTranslatingInput] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<'checking' | 'valid' | 'invalid'>('checking');
  const [apiResponse, setApiResponse] = useState<any>(null);

  // Sample translation keys that should exist in your translation files
  const commonPhrases = [
    'common.welcome',
    'common.search',
    'common.submit',
    'common.cancel',
    'common.save',
    'common.loading',
    'auth.sign_in',
    'auth.sign_up',
    'nav.home',
    'nav.profile',
    'nav.settings'
  ];

  // Some sample dynamic content to test real-time translation
  const dynamicContent = {
    en: "This is dynamic content that should be translated in real-time.",
    greeting: "Hello, welcome to our platform!",
    instructions: "Please follow the instructions to complete your profile."
  };

  // Check if Google Translate API key is available
  useEffect(() => {
    const checkTranslationKey = async () => {
      try {
        setApiKeyStatus('checking');
        // Try to translate a simple text as a test
        const result = await translateText("Hello world", language as any);
        // If we got back the same text for EN or some translation for other languages, consider it a success
        if ((language === 'EN' && result === "Hello world") || 
            (language !== 'EN' && result !== "Hello world")) {
          setApiKeyStatus('valid');
          setApiResponse({
            input: "Hello world",
            output: result,
            language,
            timestamp: new Date().toISOString()
          });
        } else {
          setApiKeyStatus('invalid');
        }
      } catch (error) {
        console.error("Translation API check failed:", error);
        setApiKeyStatus('invalid');
      }
    };
    
    checkTranslationKey();
  }, [language, translateText]);

  // Handle direct translation
  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    
    try {
      setIsTranslatingInput(true);
      const result = await translateText(inputText, language as any);
      setTranslatedText(result);
      setApiResponse({
        input: inputText,
        output: result,
        language,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Translation failed:", error);
      setTranslatedText("Translation failed. Please try again.");
    } finally {
      setIsTranslatingInput(false);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
          <FaLanguage className="mr-2 text-blue-500" size={24} />
          Language Test Panel
        </h2>
        <div className="flex items-center space-x-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full font-medium">
          <FaGlobe size={14} />
          <span>{language}</span>
          {isTranslating && (
            <span className="ml-2 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
          )}
        </div>
      </div>

      {/* Google Translate API Test */}
      <div className="border dark:border-gray-700 rounded-lg p-4 mb-6">
        <h3 className="font-semibold mb-3 text-gray-800 dark:text-gray-200 flex items-center">
          <FaExchangeAlt className="mr-2 text-green-500" />
          Google Translate API Test
        </h3>
        
        <div className="mb-2 flex items-center">
          <span className="text-sm mr-2">API Status:</span>
          {apiKeyStatus === 'checking' ? (
            <span className="text-yellow-500 text-sm flex items-center">
              <span className="animate-pulse mr-1">●</span> Checking...
            </span>
          ) : apiKeyStatus === 'valid' ? (
            <span className="text-green-500 text-sm flex items-center">
              <span className="mr-1">●</span> Connected and working
            </span>
          ) : (
            <span className="text-red-500 text-sm flex items-center">
              <span className="mr-1">●</span> Not working or not configured
            </span>
          )}
        </div>
        
        <div className="mt-4">
          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Enter text to translate:
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type something to translate..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={3}
            />
          </div>
          
          <button
            onClick={handleTranslate}
            disabled={isTranslatingInput || !inputText.trim()}
            className="mb-4 px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-400 hover:bg-blue-700 transition-colors flex items-center"
          >
            {isTranslatingInput ? (
              <>
                <span className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></span>
                Translating...
              </>
            ) : (
              <>Translate to {language}</>
            )}
          </button>
          
          {translatedText && (
            <div className="mt-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Translated text:
              </label>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md text-gray-800 dark:text-gray-200 min-h-[60px]">
                {translatedText}
              </div>
            </div>
          )}
          
          {apiResponse && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <details className="text-xs text-gray-500 dark:text-gray-400">
                <summary className="cursor-pointer">API Response Details</summary>
                <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded overflow-auto text-left">
                  {JSON.stringify(apiResponse, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      </div>

      {/* Developer Guide */}
      <div className="border dark:border-gray-700 rounded-lg p-4 mb-6">
        <h3 className="font-semibold mb-3 text-gray-800 dark:text-gray-200 flex items-center">
          <FaCode className="mr-2 text-purple-500" />
          Developer Guide: Using Google Translate API
        </h3>
        
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md mb-4 flex items-start">
            <FaInfoCircle className="text-blue-600 dark:text-blue-400 mt-1 mr-2 flex-shrink-0" />
            <p className="text-sm text-blue-700 dark:text-blue-300 m-0">
              This application has Google Translate API integration already set up. You can use it in two ways: 
              through static translations in language files, or through dynamic real-time translation.
            </p>
          </div>
          
          <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 mt-4">1. Using the API in your components</h4>
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md overflow-auto mb-4">
            <pre className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
{`// Import the useLanguage hook
import { useLanguage } from '../contexts/LanguageContext';

// Inside your component
const { translateText, t, language } = useLanguage();

// For static translated keys
<button>{t('common.submit')}</button>

// For dynamic text translation
const translatedText = await translateText("Text to translate", language);

// For automatic translation of content
<div data-i18n>This content will be automatically translated</div>`}
            </pre>
          </div>
          
          <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 mt-4">2. How it works</h4>
          <ul className="list-disc pl-5 space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li>The app runs a translation server on port 3003 (configured in <code>.env</code>)</li>
            <li>The Google Translate API key is stored in <code>VITE_GOOGLE_TRANSLATE_API_KEY</code></li>
            <li>The <code>LanguageContext</code> provides hooks for translation</li>
            <li>Elements with <code>data-i18n</code> attribute are automatically translated when language changes</li>
            <li>The <code>translate</code> function can be used for programmatic translation</li>
          </ul>
          
          <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 mt-4">3. Adding new translations</h4>
          <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li>Add new translation keys to <code>src/locales/en.json</code> (and other language files)</li>
            <li>Use the <code>t('key')</code> function to access translations</li>
            <li>For dynamic content, use <code>data-i18n</code> attribute or <code>translateText</code> function</li>
          </ol>
          
          <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 mt-4">4. Translation Server</h4>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            The translation server is automatically started with <code>npm run dev</code>. If you need to start it manually:
          </p>
          <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded-md overflow-auto mb-4">
            <code className="text-xs text-gray-800 dark:text-gray-200">npm run translation-server</code>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Translation Keys Test */}
        <div className="border dark:border-gray-700 rounded-lg p-4">
          <h3 className="font-semibold mb-3 text-gray-800 dark:text-gray-200">Translation Keys</h3>
          <div className="space-y-2">
            {commonPhrases.map((key) => (
              <div key={key} className="flex justify-between items-center">
                <code className="text-sm text-gray-600 dark:text-gray-400">{key}</code>
                <div className="ml-auto font-medium text-gray-900 dark:text-white">{t(key)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Content Test */}
        <div className="border dark:border-gray-700 rounded-lg p-4">
          <h3 className="font-semibold mb-3 text-gray-800 dark:text-gray-200">Dynamic Content</h3>
          <div className="space-y-3">
            <div data-i18n className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
              {dynamicContent.en}
            </div>
            <div data-i18n className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
              {dynamicContent.greeting}
            </div>
            <div data-i18n className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
              {dynamicContent.instructions}
            </div>
          </div>
        </div>
      </div>

      {/* UI Elements Test */}
      <div className="mt-6 border dark:border-gray-700 rounded-lg p-4">
        <h3 className="font-semibold mb-4 text-gray-800 dark:text-gray-200">UI Elements</h3>
        <div className="flex flex-wrap gap-3">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors">
            {t('common.submit')}
          </button>
          <button className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg shadow hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
            {t('common.cancel')}
          </button>
          <button className="px-4 py-2 flex items-center bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition-colors">
            <FaCheck className="mr-2" /> {t('common.save')}
          </button>
          <button className="px-4 py-2 flex items-center bg-red-600 text-white rounded-lg shadow hover:bg-red-700 transition-colors">
            <FaTimes className="mr-2" /> {t('common.delete')}
          </button>
        </div>
      </div>

      <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
        <p>Current language: <span className="font-medium text-gray-700 dark:text-gray-300">{language}</span></p>
        <p>
          Translation functionality: 
          <span className={`ml-1 font-medium ${isTranslating ? 'text-yellow-500' : 'text-green-500'}`}>
            {isTranslating ? 'Working...' : 'Ready'}
          </span>
        </p>
      </div>
    </div>
  );
};

export default LanguageTest; 