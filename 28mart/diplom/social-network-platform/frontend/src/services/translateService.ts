// A simple service for translations

export const translateText = async (text: string, targetLang: string, sourceLang?: string) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_APP_URL}/api/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        targetLang,
        sourceLang,
      }),
    });
    
    if (!response.ok) {
      throw new Error('Translation failed');
    }
    
    const data = await response.json();
    return data.translatedText;
  } catch (error) {
    console.error('Translation error:', error);
    return text; // Return original text on failure
  }
};

// For batch translations
export const generateTranslations = async (texts: Record<string, string>, targetLang: string) => {
  try {
    const translatedTexts = await Promise.all(
      Object.entries(texts).map(async ([key, value]) => {
        const translatedText = await translateText(value, targetLang);
        return [key, translatedText];
      })
    );
    
    return Object.fromEntries(translatedTexts);
  } catch (error) {
    console.error('Batch translation error:', error);
    return texts;
  }
};
