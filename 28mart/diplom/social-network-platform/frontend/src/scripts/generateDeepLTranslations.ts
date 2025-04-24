import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import * as deepl from 'deepl-node';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const translator = new deepl.Translator(process.env.VITE_DEEPL_API_KEY || '');

interface TranslationNode {
  [key: string]: string | TranslationNode;
}

async function flattenTranslations(obj: TranslationNode, prefix = ''): Promise<{ key: string; value: string }[]> {
  const result: { key: string; value: string }[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'string') {
      result.push({ key: newKey, value });
    } else {
      const nested = await flattenTranslations(value as TranslationNode, newKey);
      result.push(...nested);
    }
  }

  return result;
}

async function unflattenTranslations(
  flatTranslations: { key: string; value: string }[]
): Promise<TranslationNode> {
  const result: TranslationNode = {};

  for (const { key, value } of flatTranslations) {
    const parts = key.split('.');
    let current = result;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part] as TranslationNode;
    }

    current[parts[parts.length - 1]] = value;
  }

  return result;
}

async function generateTranslations() {
  try {
    // Read the current translations file
    const translationsPath = path.resolve(__dirname, '../locales/translations.ts');
    console.log('Reading translations from:', translationsPath);
    const fileContent = await fs.readFile(translationsPath, 'utf-8');
    
    // Extract the English translations object using regex
    const match = fileContent.match(/en:\s*({[\s\S]*?}),\s*kz:/);
    if (!match) {
      throw new Error('Could not find English translations in the file');
    }

    // Parse the English translations by evaluating the matched string
    const enTranslationsStr = match[1].replace(/\n\s+\/\/[^\n]*/g, ''); // Remove comments
    const enTranslations = eval(`(${enTranslationsStr})`);
    
    // Flatten the translations
    const flatTranslations = await flattenTranslations(enTranslations);
    
    // Extract just the text values
    const textsToTranslate = flatTranslations.map(item => item.value);
    
    // Translate to Kazakh
    console.log('Translating to Kazakh...');
    const kazakhResults = await translator.translateText(
      textsToTranslate,
      'en',
      'bg' // Using Bulgarian as a temporary replacement since Kazakh is not supported
    );
    const kazakhTranslations = Array.isArray(kazakhResults) 
      ? kazakhResults.map(r => r.text)
      : [kazakhResults.text];
    
    // Translate to Turkish
    console.log('Translating to Turkish...');
    const turkishResults = await translator.translateText(
      textsToTranslate,
      'en',
      'tr'
    );
    const turkishTranslations = Array.isArray(turkishResults)
      ? turkishResults.map(r => r.text)
      : [turkishResults.text];
    
    // Create translation objects for each language
    const kzTranslations = await unflattenTranslations(
      flatTranslations.map((item, index) => ({
        key: item.key,
        value: kazakhTranslations[index],
      }))
    );
    
    const trTranslations = await unflattenTranslations(
      flatTranslations.map((item, index) => ({
        key: item.key,
        value: turkishTranslations[index],
      }))
    );
    
    // Generate the new translations file content
    const newTranslations = `export const translations = {
  en: ${JSON.stringify(enTranslations, null, 2)},
  
  kz: ${JSON.stringify(kzTranslations, null, 2)},
  
  tr: ${JSON.stringify(trTranslations, null, 2)}
};`;
    
    // Write the new translations back to the file
    await fs.writeFile(translationsPath, newTranslations, 'utf-8');
    
    console.log('Translations generated successfully!');
  } catch (error) {
    console.error('Error generating translations:', error);
  }
}

generateTranslations();
