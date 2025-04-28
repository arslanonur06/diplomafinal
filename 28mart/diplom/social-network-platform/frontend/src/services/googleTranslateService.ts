// Get the translation server URL with a consistent port
// Default to using localhost, but fallback to disabled mode when there are issues
const TRANSLATION_SERVER_URL = 'http://localhost:3005';
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
export async function checkTranslationServer(maxRetries = 1, retryDelay = 1000): Promise<boolean> {
  // If we've reached the maximum total failed attempts, don't bother checking
  if (totalFailedAttempts >= MAX_TOTAL_ATTEMPTS) {
    isTranslationDisabled = true;
    return false;
  }

  // If translation is already marked as disabled, only check again after a cooldown period
  if (isTranslationDisabled) {
    const now = Date.now();
    // Don't check again if we checked recently
    if (now - lastTranslationCheck < CHECK_INTERVAL) {
      return false;
    }
  }
  
  let retries = 0;
  lastTranslationCheck = Date.now();
  
  while (retries < maxRetries) {
    try {
      const response = await fetchWithTimeout(HEALTH_URL, {
        // Add no-cache to prevent cached responses
        headers: { 'Cache-Control': 'no-cache' }
      }, 1000); // Shorter timeout to fail faster
      
      if (response.ok) {
        // If we were previously disabled but now it's working, re-enable
        if (isTranslationDisabled) {
          console.log('Translation service reconnected and re-enabled');
          isTranslationDisabled = false;
          // Reset failed attempts counter on success
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
        // If we've reached max retries or total attempts, disable translations
        isTranslationDisabled = true;
      }
    } catch (error) {
      // Improve error handling to prevent "Load failed" errors from reaching the UI
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Translation server connection error (attempt ${retries + 1}/${maxRetries}): ${errorMessage}`);
      retries++;
      totalFailedAttempts++;
      
      if (retries < maxRetries && totalFailedAttempts < MAX_TOTAL_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        // If we've reached max retries or total attempts, disable translations
        isTranslationDisabled = true;
      }
    }
  }
  
  // Set the global flag to disable translation attempts
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
  targetLang: 'KK' | 'TR' | 'RU' | 'EN',
  sourceLang: string = 'EN'
): Promise<string> {
  // Don't translate if target language is English (source language)
  if (targetLang === 'EN') {
    return text;
  }
  
  // Don't translate empty or whitespace-only text
  if (!text || text.trim() === '') {
    return text;
  }
  
  // If translation is disabled, return original text without trying
  if (isTranslationDisabled) {
    return text;
  }

  try {
    // Check if we should recheck the server (cooldown elapsed)
    const now = Date.now();
    if (now - lastTranslationCheck > CHECK_INTERVAL) {
      const isAvailable = await checkTranslationServer(1, 500);
      if (!isAvailable) {
        return text; // Return original if server is not available
      }
    }
    
    // Attempt actual translation with proper error handling
    try {
      const response = await fetchWithTimeout(GOOGLE_TRANSLATE_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Accept': 'application/json'
        },
        mode: 'cors',
        credentials: 'omit', // Don't send credentials for cross-origin requests
        body: JSON.stringify({
          text,
          target: languageMapping[targetLang] || targetLang.toLowerCase(),
          source: languageMapping[sourceLang] || sourceLang.toLowerCase(),
        })
      }, 5000); // 5 second timeout
      
      if (!response.ok) {
        console.error('Translation API error:', response.status, response.statusText);
        return text;
      }

      const data = await response.json();
      
      if (data.translatedText) {
        return data.translatedText;
      } else if (data.translations && data.translations.length > 0) {
        return data.translations[0].translatedText;
      }
      
      // Fallback
      console.warn('Translation returned unexpected format:', data);
      return text;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Translation request error: ${errorMessage}`);
      return text;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Translation health check error: ${errorMessage}`);
    isTranslationDisabled = true; // Disable for future calls
    return text; // Return original text on error
  }
}

export async function translateBatch(
  texts: string[],
  targetLang: 'KK' | 'TR' | 'RU' | 'EN',
  sourceLang: string = 'EN'
): Promise<string[]> {
  // Don't attempt to translate empty arrays
  if (!texts || texts.length === 0) {
    return [];
  }

  // Don't translate if target language is English (source language)
  if (targetLang === 'EN') {
    return texts;
  }
  
  // If translation is disabled, return original texts
  if (isTranslationDisabled) {
    return texts;
  }

  try {
    // For single items, just use the single text translation
    if (texts.length === 1) {
      const result = await translateText(texts[0], targetLang, sourceLang);
      return [result];
    }
    
    // Check if translation service is available
    const now = Date.now();
    if (now - lastTranslationCheck > CHECK_INTERVAL) {
      const isAvailable = await checkTranslationServer(1, 500);
      if (!isAvailable) {
        return texts; // Return originals if server is not available
      }
    }
    
    // For batch processing, we'll process them in parallel but with a limit
    try {
      // Process in batches of 10 to prevent too many concurrent requests
      const batchSize = 10;
      const results: string[] = [...texts]; // Start with original texts
      
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const promises = batch.map(text => 
          translateText(text, targetLang, sourceLang)
            .catch(err => {
              console.error(`Error translating batch item: ${err}`);
              return text; // Return original on error
            })
        );
        
        const batchResults = await Promise.all(promises);
        
        // Update results with translated texts
        for (let j = 0; j < batchResults.length; j++) {
          results[i + j] = batchResults[j];
        }
      }
      
      return results;
    } catch (error) {
      console.error('Batch translation error:', error);
      return texts; // Return original texts on error
    }
  } catch (error) {
    console.error('Translation batch processing error:', error);
    return texts; // Return original texts on error
  }
} 