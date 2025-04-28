import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3002;

// Log env variables (excluding sensitive data)
console.log('Environment variables:', {
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  DEEPL_API_KEY_EXISTS: !!process.env.DEEPL_API_KEY,
  VITE_DEEPL_API_KEY_EXISTS: !!process.env.VITE_DEEPL_API_KEY
});

// Configure CORS with specific options
app.use(cors({
  origin: ['http://localhost:3002', 'http://127.0.0.1:3002'],
  methods: ['POST', 'GET'],
  allowedHeaders: ['Content-Type'],
  credentials: true
}));

app.use(express.json());

interface TranslationRequest {
  text: string | string[];
  target_lang: string;
  source_lang: string;
}

const DEEPL_API_URL = 'https://api-free.deepl.com/v2/translate';
// Try to use DEEPL_API_KEY first, fall back to VITE_DEEPL_API_KEY
const DEEPL_API_KEY = process.env.DEEPL_API_KEY || process.env.VITE_DEEPL_API_KEY;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    apiKeyConfigured: !!DEEPL_API_KEY
  });
});

app.post('/translate', async (req, res) => {
  try {
    // Validate request body
    const { text, target_lang, source_lang } = req.body;
    if (!text || !target_lang) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate API key
    if (!DEEPL_API_KEY) {
      console.error('DeepL API key is not configured');
      return res.status(500).json({ error: 'Translation service is not configured' });
    }

    const response = await fetch(DEEPL_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: Array.isArray(text) ? text : [text],
        target_lang,
        source_lang: source_lang || 'EN'
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepL API error:', errorText);
      throw new Error(`Translation failed: ${response.statusText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ 
      error: 'Translation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    details: err.message
  });
});

app.listen(port, () => {
  console.log(`Translation proxy server running at http://localhost:${port}`);
  console.log('CORS enabled for:', ['http://localhost:3002', 'http://127.0.0.1:3002']);
});
