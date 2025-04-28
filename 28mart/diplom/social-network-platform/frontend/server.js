// Simple Express server for production
const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3004;

// Log all requests
app.use((req, res, next) => {
  console.log(`Request: ${req.method} ${req.url}`);
  next();
});

// Serve static files from the dist directory (Vite build output)
app.use(express.static(path.join(__dirname, 'dist')));

// Catch all routes to send index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Serving from: ${path.join(__dirname, 'dist')}`);
}); 