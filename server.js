const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  next();
});

app.get('/app.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'app.js'));
});

app.get('/firebase-messaging-sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'firebase-messaging-sw.js'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'reforme-live-app.html'));
});

app.get('/join', (req, res) => {
  res.sendFile(path.join(__dirname, 'reforme-live-app.html'));
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'Reformé', version: Date.now() });
});

app.listen(PORT, () => console.log(`Reformé on port ${PORT}`));
