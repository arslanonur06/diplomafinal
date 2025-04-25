#!/bin/bash

# Exit on error
set -e

echo "Starting application..."

# Kill any existing processes on ports
for port in 3002 3004 3005; do
  pid=$(lsof -t -i:$port 2>/dev/null) || true
  if [ -n "$pid" ]; then
    echo "Killing process on port $port"
    kill -9 $pid 2>/dev/null || true
  fi
done

# Start translation server in background
echo "Starting translation server..."
node start-translation-server.js &
TRANSLATION_PID=$!

# Wait for translation server to start
sleep 2

# Check if translation server is running
if ! kill -0 $TRANSLATION_PID 2>/dev/null; then
  echo "Warning: Translation server failed to start"
  echo "Starting in mock mode..."
  node -e "
    const express=require('express');
    const app=express();
    app.use(require('cors')());
    app.use(express.json());
    app.post('/google-translate',(req,res)=>res.json({
      translations:[{translatedText:'[MOCK] '+req.body.text}]
    }));
    app.listen(3005,()=>console.log('Mock translation server running on 3005'));
  " &
  TRANSLATION_PID=$!
  sleep 2
fi

# Create cleanup function
cleanup() {
  echo "Shutting down..."
  kill $TRANSLATION_PID 2>/dev/null || true
  exit 0
}

# Set trap for cleanup
trap cleanup EXIT INT TERM

# Start the frontend
echo "Starting frontend..."
npm run dev

# Wait for frontend to exit
wait