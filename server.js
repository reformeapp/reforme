const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;

// Serve firebase service worker at root
app.get('/firebase-messaging-sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'firebase-messaging-sw.js'));
});

// Serve the main app
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'reforme-live-app.html'));
});

// Handle invite links
app.get('/join', (req, res) => {
  res.sendFile(path.join(__dirname, 'reforme-live-app.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'Reformé' });
});

app.listen(PORT, () => {
  console.log(`Reformé running on port ${PORT}`);
});
