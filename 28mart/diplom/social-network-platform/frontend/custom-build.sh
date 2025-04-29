#!/bin/bash

# Exit immediately if any command fails
set -e

# Print each command before execution for debugging
set -x

# Create necessary directories
mkdir -p dist

# Set environment variables required for the build
export VITE_SUPABASE_URL="https://ohserebigziyxlxpkaib.supabase.co"
export VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oc2VyZWJpZ3ppeXhseHBrYWliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxNjMxMTUsImV4cCI6MjA1NTczOTExNX0.EWSzRxtsyEz9rGdwuPS-0E-vTmZip-q2ZapDyZpx-uI"
export VITE_APP_URL="https://connectme-uqip.onrender.com"
export VITE_PUBLIC_URL="https://connectme-uqip.onrender.com"

# Run Vite build with debug output
npm run build:vite -- --debug

# Check that the dist directory was created and show its contents
if [ -d "dist" ]; then
  echo "==> dist directory exists! Contents:"
  ls -la dist
else
  echo "==> Publish directory dist does not exist!"
  exit 1
fi