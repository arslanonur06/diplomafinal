// Simple Express server to test serving files
const express = require('express');
const path = require('path');
const app = express();
const port = 8000;

// Log all requests
app.use((req, res, next) => {
  console.log(`Request: ${req.method} ${req.url}`);
  next();
});

// Serve static files from the current directory
app.use(express.static(__dirname));

// Catch all route to send index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Test server running at http://localhost:${port}`);
  console.log(`Current directory: ${__dirname}`);
}); 