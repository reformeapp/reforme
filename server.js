const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;

// Serve the main app
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'reforme-live-app.html'));
});

// Handle invite links with query params
app.get('/join', (req, res) => {
  res.sendFile(path.join(__dirname, 'reforme-live-app.html'));
});

// Health check for Railway
app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'Reformé' });
});

app.listen(PORT, () => {
  console.log(`Reformé running on port ${PORT}`);
});
