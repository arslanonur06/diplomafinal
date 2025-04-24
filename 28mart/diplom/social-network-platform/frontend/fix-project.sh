#!/bin/bash

# Fix Project Script
# This script addresses common issues with the project structure and dependencies

set -e

echo "🔧 Starting project repair..."

# Create necessary directories if they don't exist
echo "📁 Creating necessary directories..."
mkdir -p src/lib

# Check if lib/utils.ts exists
if [ ! -f src/lib/utils.ts ]; then
  echo "📝 Creating src/lib/utils.ts..."
  cat > src/lib/utils.ts << 'EOF'
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combine multiple class names using clsx and tailwind-merge
 * This utility is used by the Shadcn UI components
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date to a localized string
 */
export function formatDate(date: Date | string, locale: string = 'en'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a date to relative time (e.g. "2 hours ago")
 */
export function formatRelativeTime(date: Date | string, locale: string = 'en'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInMs = now.getTime() - d.getTime();
  
  const diffInSecs = Math.floor(diffInMs / 1000);
  const diffInMins = Math.floor(diffInSecs / 60);
  const diffInHours = Math.floor(diffInMins / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  
  if (diffInSecs < 60) {
    return 'just now';
  } else if (diffInMins < 60) {
    return `${diffInMins} minute${diffInMins === 1 ? '' : 's'} ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
  } else {
    return formatDate(d, locale);
  }
}

/**
 * Generate initials from a name
 */
export function getInitials(name: string): string {
  if (!name) return '';
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
EOF
fi

# Fix UI component imports
echo "🔄 Fixing UI component imports..."
for file in src/components/ui/*.tsx; do
  # Replace @/lib/utils with ../../lib/utils
  sed -i'.bak' 's|@/lib/utils|../../lib/utils|g' "$file"
done

# Clean up backup files
find src -name "*.bak" -type f -delete

# Create start-translation-server.js with ES module syntax
echo "🌐 Creating translation server..."
cat > start-translation-server.js << 'EOF'
import http from 'http';
import https from 'https';
import { URL } from 'url';
import { Buffer } from 'buffer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const PORT = process.env.TRANSLATION_SERVER_PORT || 3002;
const DEEPL_API_KEY = process.env.VITE_DEEPL_API_KEY;

if (!DEEPL_API_KEY) {
  console.warn('⚠️ Warning: No DeepL API key found in environment variables (VITE_DEEPL_API_KEY)');
  console.warn('💡 Translations will be simulated for development purposes');
}

// Simple in-memory cache for translations to reduce API calls
const translationCache = new Map();

const server = http.createServer((req, res) => {
  // Enable CORS for local development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS requests for CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Only accept POST requests to /translate
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  if (req.method !== 'POST' || parsedUrl.pathname !== '/translate') {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }
  
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  
  req.on('end', () => {
    let requestData;
    try {
      requestData = JSON.parse(body);
    } catch (e) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
      return;
    }
    
    const { text, source_lang = 'EN', target_lang } = requestData;
    
    if (!text || !target_lang) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Missing required fields' }));
      return;
    }
    
    // Generate a cache key
    const cacheKey = `${text}_${source_lang}_${target_lang}`;
    
    // Check if we have a cached translation
    if (translationCache.has(cacheKey)) {
      console.log('✅ Returning cached translation');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        translated_text: translationCache.get(cacheKey),
        source_lang,
        target_lang 
      }));
      return;
    }
    
    // If no API key is provided, simulate a translation
    if (!DEEPL_API_KEY) {
      const simulatedTranslation = `[${target_lang}] ${text}`;
      translationCache.set(cacheKey, simulatedTranslation);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        translated_text: simulatedTranslation,
        source_lang,
        target_lang 
      }));
      return;
    }
    
    // Prepare DeepL API request
    const postData = JSON.stringify({
      text: [text],
      source_lang: source_lang,
      target_lang: target_lang
    });
    
    const options = {
      hostname: 'api-free.deepl.com',
      port: 443,
      path: '/v2/translate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const apiReq = https.request(options, (apiRes) => {
      let responseData = '';
      
      apiRes.on('data', (chunk) => {
        responseData += chunk;
      });
      
      apiRes.on('end', () => {
        try {
          const translationResult = JSON.parse(responseData);
          
          if (translationResult.translations && translationResult.translations.length > 0) {
            const translatedText = translationResult.translations[0].text;
            translationCache.set(cacheKey, translatedText);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              translated_text: translatedText,
              source_lang,
              target_lang
            }));
          } else {
            throw new Error('No translation returned');
          }
        } catch (error) {
          console.error('Error processing translation:', error);
          res.writeHead(500);
          res.end(JSON.stringify({ 
            error: 'Error processing translation',
            details: error.message 
          }));
        }
      });
    });
    
    apiReq.on('error', (error) => {
      console.error('Error making DeepL API request:', error);
      res.writeHead(500);
      res.end(JSON.stringify({ 
        error: 'Failed to connect to translation service',
        details: error.message 
      }));
    });
    
    apiReq.write(postData);
    apiReq.end();
  });
});

server.listen(PORT, () => {
  console.log(`🌐 Translation server running at http://localhost:${PORT}`);
  console.log(`🔄 Endpoint available at http://localhost:${PORT}/translate`);
  console.log(`🔑 Using DeepL API: ${DEEPL_API_KEY ? 'Yes' : 'No (simulation mode)'}`);
});
EOF

# Make this script executable
chmod +x fix-project.sh

# Installation checks
echo "📦 Checking dependencies..."
if ! npm list clsx > /dev/null 2>&1; then
  echo "Installing clsx..."
  npm install clsx
fi

if ! npm list tailwind-merge > /dev/null 2>&1; then
  echo "Installing tailwind-merge..."
  npm install tailwind-merge
fi

if ! npm list dotenv > /dev/null 2>&1; then
  echo "Installing dotenv..."
  npm install dotenv
fi

if ! npm list concurrently > /dev/null 2>&1; then
  echo "Installing concurrently..."
  npm install concurrently --save-dev
fi

echo "✅ Project repair completed!"
echo ""
echo "To run the application:"
echo "1. Start the translation server: node start-translation-server.js"
echo "2. In another terminal, start the frontend: npm run dev"
echo "3. Alternatively, run both with: npm run start"
echo ""
echo "If you encounter database issues, go to the Mock Users page (/admin/mock-users)"
echo "to create test users and groups for development."
echo "" 