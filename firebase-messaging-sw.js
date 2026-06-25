importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBOxNjOZ0a5mR7xOdoShEX2tZhbIKA09-M",
  authDomain: "reforme-3f82c.firebaseapp.com",
  projectId: "reforme-3f82c",
  storageBucket: "reforme-3f82c.firebasestorage.app",
  messagingSenderId: "304977464183",
  appId: "1:304977464183:web:f68313c6fdebc8ec1d6f72",
  measurementId: "G-GYEQWV49HN"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Background message received:', payload);
  const { title, body, icon } = payload.notification;
  self.registration.showNotification(title, {
    body,
    icon: icon || '/icon.png',
    badge: '/icon.png',
    vibrate: [200, 100, 200],
    data: payload.data
  });
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('https://reforme-production.up.railway.app')
  );
});
