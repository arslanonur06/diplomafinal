import { supabase } from './supabase';

// Get the translation server URL with a consistent port
// Default to using localhost, but fallback to disabled mode when there are issues
const TRANSLATION_SERVER_URL = import.meta.env.VITE_TRANSLATION_SERVER_URL || 'http://localhost:3005';
const HEALTH_CHECK_ENDPOINT = '/health';
const GOOGLE_TRANSLATE_ENDPOINT = '/google-translate';
const HEALTH_URL = `${TRANSLATION_SERVER_URL}${HEALTH_CHECK_ENDPOINT}`;
const GOOGLE_TRANSLATE_API = `${TRANSLATION_SERVER_URL}${GOOGLE_TRANSLATE_ENDPOINT}`;

// Global variable to track if translation service is available
// Start with disabled=true by default, until we confirm it's available
export let isTranslationDisabled = true;

// Keep track of the last time we checked the translation server to avoid too many checks
let lastTranslationCheck = 0;
const CHECK_INTERVAL = 60000; // Only check once per minute

// Set a maximum number of retries for the entire session
let totalFailedAttempts = 0;
const MAX_TOTAL_ATTEMPTS = 3;

// Function to explicitly enable translation if needed (e.g., based on env var)
export function enableTranslationService() {
  // Only reset if we haven't had too many failures
  if (totalFailedAttempts < MAX_TOTAL_ATTEMPTS) {
    isTranslationDisabled = false;
    console.log('Translation service explicitly enabled.');
    checkTranslationServer();
  } else {
    console.log('Translation service remains disabled due to too many failed attempts.');
  }
}

// Safer fetch function with timeout
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 2000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

// Function to check and retry translation server connection
export async function checkTranslationServer(maxRetries = 2, retryDelay = 1000): Promise<boolean> {
  if (totalFailedAttempts >= MAX_TOTAL_ATTEMPTS) {
    isTranslationDisabled = true;
    return false;
  }

  if (isTranslationDisabled) {
    const now = Date.now();
    if (now - lastTranslationCheck < CHECK_INTERVAL) {
      return false;
    }
  }

  let retries = 0;
  lastTranslationCheck = Date.now();

  while (retries < maxRetries) {
    try {
      const response = await fetchWithTimeout(HEALTH_URL, {
        headers: { 'Cache-Control': 'no-cache' }
      }, 1000);

      if (response.ok) {
        if (isTranslationDisabled) {
          console.log('Translation service reconnected and re-enabled');
          isTranslationDisabled = false;
          totalFailedAttempts = 0;
        }
        return true;
      }

      console.warn(`Translation server health check failed (attempt ${retries + 1}/${maxRetries}): ${response.status}`);
      retries++;
      totalFailedAttempts++;

      if (retries < maxRetries && totalFailedAttempts < MAX_TOTAL_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        isTranslationDisabled = true;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`Translation server connection error (attempt ${retries + 1}/${maxRetries}): ${errorMessage}`);
      retries++;
      totalFailedAttempts++;

      if (retries < maxRetries && totalFailedAttempts < MAX_TOTAL_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        isTranslationDisabled = true;
      }
    }
  }

  isTranslationDisabled = true;
  console.log(`Translation service disabled due to connection issues (total attempts: ${totalFailedAttempts})`);
  return false;
}

// Language code mapping (Google uses different codes)
const languageMapping: Record<string, string> = {
  'EN': 'en',
  'RU': 'ru',
  'KK': 'kk',
  'TR': 'tr'
};

export async function translateText(
  text: string,
  targetLang: 'KK' | 'TR' | 'RU' | 'EN' = 'EN'
): Promise<string> {
  if (!text || text.trim() === '' || targetLang === 'EN' || isTranslationDisabled) {
    return text;
  }

  try {
    // Check translation cache first
    const { data: cached } = await supabase
      .from('translation_cache')
      .select('translated_text')
      .eq('original_text', text)
      .eq('target_lang', targetLang)
      .single();

    if (cached?.translated_text) {
      return cached.translated_text;
    }

    // Check server availability if needed
    const now = Date.now();
    if (now - lastTranslationCheck > CHECK_INTERVAL) {
      const isAvailable = await checkTranslationServer();
      if (!isAvailable) {
        return text;
      }
    }

    const response = await fetchWithTimeout(GOOGLE_TRANSLATE_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Accept': 'application/json'
      },
      mode: 'cors',
      credentials: 'omit',
      body: JSON.stringify({
        text,
        target: languageMapping[targetLang] || targetLang.toLowerCase()
      })
    }, 5000);

    if (!response.ok) {
      console.error('Translation API error:', response.status, response.statusText);
      return text;
    }

    const data = await response.json();
    const translatedText = data.translatedText || (data.translations?.[0]?.translatedText) || text;

    // Cache the translation
    try {
      await supabase.from('translation_cache').insert({
        original_text: text,
        translated_text: translatedText,
        target_lang: targetLang,
        created_at: new Date().toISOString()
      });
    } catch (cacheError) {
      console.warn('Failed to cache translation:', cacheError);
    }

    return translatedText;
  } catch (error) {
    console.error('Translation error:', error);
    return text;
  }
}

export async function translateBatch(
  texts: string[],
  targetLang: 'KK' | 'TR' | 'RU' | 'EN' = 'EN'
): Promise<string[]> {
  if (!texts?.length || targetLang === 'EN' || isTranslationDisabled) {
    return texts;
  }

  try {
    if (texts.length === 1) {
      const result = await translateText(texts[0], targetLang);
      return [result];
    }

    const batchSize = 10;
    const results = [...texts];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const promises = batch.map(text =>
        translateText(text, targetLang).catch(() => text)
      );

      const batchResults = await Promise.all(promises);
      batchResults.forEach((result, index) => {
        results[i + index] = result;
      });
    }

    return results;
  } catch (error) {
    console.error('Batch translation error:', error);
    return texts;
  }
}