#!/bin/bash

# Exit on error
set -e

# Print commands for debugging
set -x

echo "Starting ConnectMe application..."

# Ensure we're in the correct directory
cd "$(dirname "$0")"

# Check for the translation server file
TRANSLATION_SERVER_FILE="start-translation-server.js"
if [ ! -f "$TRANSLATION_SERVER_FILE" ]; then
  echo "Error: Translation server file ($TRANSLATION_SERVER_FILE) not found."
  echo "Creating a translation server file with basic functionality..."
  
  # Create a basic translation server script if it doesn't exist
  cat > "$TRANSLATION_SERVER_FILE" << 'EOF'
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Starting translation server with auto-restart capability...');

// Configuration
const MAX_RESTARTS = 10;
const RESTART_DELAY = 3000; // 3 seconds
let restartCount = 0;

// Function to start the server
function startServer() {
  console.log(`Starting translation server (attempt ${restartCount + 1})...`);
  
  // First try to use ts-node-esm, if it fails, try alternatives
  const server = exec(`npx ts-node-esm server/src/translationProxy.ts || npx ts-node server/src/translationProxy.ts`, {
    env: { ...process.env }
  });
  
  server.stdout.on('data', (data) => { console.log(`Translation Server: ${data.trim()}`); });
  server.stderr.on('data', (data) => { console.error(`Translation Server Error: ${data.trim()}`); });
  
  server.on('exit', (code) => {
    console.log(`Translation server exited with code ${code}`);
    
    if (code !== 0 && restartCount < MAX_RESTARTS) {
      restartCount++;
      console.log(`Restarting translation server in ${RESTART_DELAY / 1000} seconds...`);
      setTimeout(startServer, RESTART_DELAY);
    } else if (restartCount >= MAX_RESTARTS) {
      console.error(`Translation server crashed ${MAX_RESTARTS} times. Giving up.`);
    }
  });
  
  return server;
}

const serverProcess = startServer();

process.on('SIGINT', () => {
  console.log('Translation server shutting down...');
  if (serverProcess) serverProcess.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Translation server shutting down...');
  if (serverProcess) serverProcess.kill();
  process.exit(0);
});
EOF

  echo "Created basic translation server script."
fi

# Ensure server directory exists
if [ ! -d "server" ]; then
  echo "Warning: server directory not found. Creating basic structure..."
  mkdir -p server/src
  
  # Create a basic translation proxy file
  cat > server/src/translationProxy.ts << 'EOF'
import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// DeepL API endpoint
const DEEPL_API_URL = 'https://api-free.deepl.com/v2/translate';

// Simple health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', message: 'Translation server is running' });
});

// Translation endpoint
app.post('/translate', async (req, res) => {
  try {
    const { text, target_lang } = req.body;
    
    if (!text || !target_lang) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    const API_KEY = process.env.DEEPL_API_KEY || req.headers['x-deepl-api-key'];
    
    if (!API_KEY) {
      return res.status(401).json({ error: 'DeepL API key is required' });
    }
    
    // Use a mock response if we're in development without a real API key
    if (API_KEY === 'mock' || API_KEY === 'MOCK_API_KEY') {
      return res.json({
        translations: Array.isArray(text)
          ? text.map(t => ({ text: `[${target_lang}] ${t}` }))
          : [{ text: `[${target_lang}] ${text}` }]
      });
    }
    
    // Make request to DeepL API
    const response = await axios.post(
      DEEPL_API_URL,
      {
        text: text,
        target_lang: target_lang,
      },
      {
        headers: {
          'Authorization': `DeepL-Auth-Key ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    res.json(response.data);
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ error: 'Translation service error', details: error.message });
  }
});

// Batch translation endpoint
app.post('/translate-batch', async (req, res) => {
  try {
    const { texts, target_lang } = req.body;
    
    if (!texts || !Array.isArray(texts) || !target_lang) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    const API_KEY = process.env.DEEPL_API_KEY || req.headers['x-deepl-api-key'];
    
    if (!API_KEY) {
      return res.status(401).json({ error: 'DeepL API key is required' });
    }
    
    // Use a mock response if we're in development without a real API key
    if (API_KEY === 'mock' || API_KEY === 'MOCK_API_KEY') {
      return res.json({
        translations: texts.map(t => ({ text: `[${target_lang}] ${t}` }))
      });
    }
    
    // Make request to DeepL API
    const response = await axios.post(
      DEEPL_API_URL,
      {
        text: texts,
        target_lang: target_lang,
      },
      {
        headers: {
          'Authorization': `DeepL-Auth-Key ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    res.json(response.data);
  } catch (error) {
    console.error('Batch translation error:', error);
    res.status(500).json({ error: 'Translation service error', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Translation server running on port ${PORT}`);
});
EOF

  # Create a package.json in the server directory
  cat > server/package.json << 'EOF'
{
  "name": "translation-server",
  "version": "1.0.0",
  "description": "Translation server for ConnectMe",
  "main": "src/translationProxy.ts",
  "type": "module",
  "scripts": {
    "dev": "ts-node-esm src/translationProxy.ts",
    "start": "ts-node-esm src/translationProxy.ts"
  },
  "dependencies": {
    "axios": "^1.3.4",
    "cors": "^2.8.5",
    "express": "^4.18.2"
  },
  "devDependencies": {
    "@types/cors": "^2.8.13",
    "@types/express": "^4.17.17",
    "ts-node": "^10.9.1",
    "typescript": "^5.0.2"
  }
}
EOF

  echo "Created basic server structure with translation proxy."
  
  # Install dependencies for the server
  echo "Installing server dependencies..."
  if [ -f "package.json" ]; then
    npm install axios cors express
    npm install --save-dev @types/cors @types/express ts-node typescript
  fi
fi

# Kill any existing processes on the required ports
echo "Checking for processes on required ports..."
for port in 3000 3001 3002 3003 3004 3005 3006; do
  pid=$(lsof -t -i:$port 2>/dev/null) || true
  if [ -n "$pid" ]; then
    echo "Killing process $pid on port $port"
    kill -9 $pid 2>/dev/null || true
  fi
done

# Start translation server in the background with multiple fallback options
echo "Starting translation server..."
(node start-translation-server.js || npx ts-node-esm server/src/translationProxy.ts || npx ts-node server/src/translationProxy.ts) &
TRANSLATION_SERVER_PID=$!

# Give the translation server time to start
echo "Waiting for translation server to start..."
sleep 3

# Verify translation server is running
if ! ps -p $TRANSLATION_SERVER_PID > /dev/null; then
  echo "Warning: Translation server may have failed to start. Attempting alternate methods..."
  
  # Try more alternative methods to start the translation server
  node -e "const http=require('http');const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({translations:[{text:'[MOCK] Translation service fallback'}]}))});server.listen(3002,()=>console.log('Mock translation server running on port 3002'));" &
  TRANSLATION_SERVER_PID=$!
  
  echo "Started a minimal mock translation server on port 3002."
  sleep 2
fi

# Create a trap to ensure cleanup on exit
trap 'echo "Shutting down application..."; kill $TRANSLATION_SERVER_PID 2>/dev/null || true; echo "Application stopped."' EXIT INT TERM

# Start the frontend application
echo "Starting frontend application..."
npm run dev

# If frontend exits, the trap will handle killing the translation server 