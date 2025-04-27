import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import path from 'path';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.TRANSLATION_SERVER_PORT || 3005;

// CORS configuration
app.use(cors({
  origin: [
    'https://connectme-uqip.onrender.com', // Render static site
    'http://localhost:3004', // Local development
  ],
  methods: ['GET', 'POST', 'OPTIONS'], // Allow specific HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Allow specific headers
  credentials: true, // Allow cookies and credentials
}));

// Ensure preflight requests are handled
app.options('*', cors());

app.use(bodyParser.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Translation endpoint
app.post('/google-translate', async (req, res) => {
  try {
    const { text, texts, target } = req.body;
    
    // Return mock translations for testing
    if (texts && Array.isArray(texts)) {
      return res.json({
        translations: texts.map(t => ({ translatedText: `[${target}] ${t}` }))
      });
    } else if (text) {
      return res.json({
        translatedText: `[${target}] ${text}`
      });
    }
    
    res.status(400).json({ error: 'No text provided' });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Import the translation proxy routes
import translationProxy from './server/dist/translationProxy';
app.use('/api/translation', translationProxy);

app.listen(port, () => {
  console.log(`Translation server running on http://localhost:${port}`);
});
