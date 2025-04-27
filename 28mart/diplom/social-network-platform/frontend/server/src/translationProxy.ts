import express from 'express';
import { Request, Response } from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const router = express.Router();

// CORS configuration
router.use(cors({
  origin: [
    'https://connectme-uqip.onrender.com', // Production frontend
    'http://localhost:3004', // Local frontend
  ],
  methods: ['GET', 'POST', 'OPTIONS'], // Allow specific HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Allow specific headers
  credentials: true, // Allow cookies and credentials
}));

interface TranslationRequest {
  text: string;
  targetLang: string;
}

router.post('/translate', async (req: Request<{}, {}, TranslationRequest>, res: Response) => {
  try {
    const { text, targetLang } = req.body;
    
    if (!text || !targetLang) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const translatedText = `Translated: ${text}`;
    
    res.json({ translatedText });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ error: 'Translation service error' });
  }
});

export default router;
