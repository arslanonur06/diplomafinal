import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

// Always use the same port for consistency
const port = 3005;

const app = express();

// Initialize server state
const serverState = {
  googleApiKey: process.env.VITE_GOOGLE_TRANSLATE_API_KEY || '',
  apiKeyConfigured: false,
  startTime: new Date(),
  totalRequests: 0,
  successfulTranslations: 0,
  failedTranslations: 0,
  lastError: null
};

// Check if Google Translate API key is configured
const checkGoogleApiKey = () => {
  const apiKey = serverState.googleApiKey;
  const isConfigured = apiKey && apiKey.length > 10;
  serverState.apiKeyConfigured = isConfigured;
  
  console.log(`Google Translate API key ${isConfigured ? 'is' : 'is NOT'} configured`);
  return isConfigured;
};

// Check API key on startup
checkGoogleApiKey();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    'http://localhost:3004',
    'http://localhost:3005',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:3004',
    'https://diplomafinalx.onrender.com',
    'http://127.0.0.1:5173'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Accept'],
  credentials: true
}));
app.use(express.json());

// Log requests
app.use((req, res, next) => {
  const { method, path, body } = req;
  console.log(`${new Date().toISOString()} - ${method} ${path}`);
  
  // Increment request counter
  serverState.totalRequests++;
  
  // For translation requests, log the target language
  if (path === '/google-translate' && body) {
    const targetLang = body.target || body.target_lang;
    console.log(`Translation request: ${targetLang ? `to ${targetLang}` : 'language not specified'}`);
    
    // Log the number of texts to translate
    if (Array.isArray(body.texts)) {
      console.log(`Translating ${body.texts.length} texts`);
    } else if (body.text) {
      console.log(`Translating single text`);
    }
  }
  
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  const isApiKeyConfigured = checkGoogleApiKey();
  
  // Return server status
  res.json({
    status: 'ok',
    apiKeyConfigured: isApiKeyConfigured,
    uptime: Math.floor((new Date() - serverState.startTime) / 1000),
    stats: {
      totalRequests: serverState.totalRequests,
      successfulTranslations: serverState.successfulTranslations,
      failedTranslations: serverState.failedTranslations,
    },
    lastError: serverState.lastError
  });
});

// Google Translate API endpoint
app.post('/google-translate', async (req, res) => {
  const { text, texts, target, source = 'en' } = req.body;
  
  // Check if Google API key is configured
  if (!checkGoogleApiKey()) {
    serverState.lastError = 'Google Translate API key is not configured';
    console.error(serverState.lastError);
    serverState.failedTranslations++;
    
    // Return simulated translations for testing if API key is not available
    if (texts && Array.isArray(texts)) {
      return res.json({
        simulated: true,
        translations: texts.map(t => ({ translatedText: `[${target}] ${t}` }))
      });
    } else if (text) {
      return res.json({
        simulated: true,
        translatedText: `[${target}] ${text}`
      });
    } else {
      return res.status(400).json({ error: 'No text provided for translation' });
    }
  }
  
  try {
    const apiKey = serverState.googleApiKey;
    
    // Handling batch translations
    if (texts && Array.isArray(texts)) {
      // Google Translate API can handle multiple texts in one request
      const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: texts,
          target: target,
          source: source,
          format: 'text'
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `API Error: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.data && data.data.translations) {
        serverState.successfulTranslations += texts.length;
        return res.json({
          translations: data.data.translations
        });
      } else {
        throw new Error('Unexpected response format from Google Translate API');
      }
    }
    // Handling single text translation
    else if (text) {
      const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          target: target,
          source: source,
          format: 'text'
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `API Error: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.data && data.data.translations && data.data.translations.length > 0) {
        serverState.successfulTranslations++;
        return res.json({
          translatedText: data.data.translations[0].translatedText
        });
      } else {
        throw new Error('Unexpected response format from Google Translate API');
      }
    } else {
      return res.status(400).json({ error: 'No text provided for translation' });
    }
  } catch (error) {
    console.error('Translation error:', error);
    serverState.lastError = error.message;
    serverState.failedTranslations++;
    
    // Return error response
    return res.status(500).json({
      error: `Translation failed: ${error.message}`,
      originalText: text || texts
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`\n========================================`);
  console.log(`Translation server running at http://localhost:${port}`);
  console.log(`Health check available at http://localhost:${port}/health`);
  console.log(`Google Translate endpoint available at http://localhost:${port}/google-translate\n`);
  
  // Log configuration status
  if (serverState.apiKeyConfigured) {
    console.log(`\n✅ Google Translate API key is configured and ready to use`);
    console.log(`🔑 Key: ${serverState.googleApiKey.substring(0, 8)}...${serverState.googleApiKey.slice(-4)}`);
  } else {
    console.warn(`\n⚠️ WARNING: Google Translate API key is NOT configured.`);
    console.warn(`💡 Set VITE_GOOGLE_TRANSLATE_API_KEY in your .env file to enable translation.`);
    console.warn(`🔄 Using simulated translations for now.`);
  }
  console.log(`========================================\n`);
});
