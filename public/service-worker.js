// service-worker.js

// Import skrip Firebase
importScripts("https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js");
importScripts("https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js");

// Ganti placeholder dengan konfigurasi Anda yang sudah benar
const firebaseConfig = {
  apiKey: "AIzaSyDrVlBSGKSvSc6OwZeK6bBWZYD3Jo1IdgA",
  authDomain: "pwa-jadwal-sholat.firebaseapp.com",
  projectId: "pwa-jadwal-sholat",
  storageBucket: "pwa-jadwal-sholat.firebasestorage.app",
  messagingSenderId: "381696407215",
  appId: "1:381696407215:web:684f64f27ab78e32ad865a"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Handler untuk notifikasi yang datang saat aplikasi di background
messaging.onBackgroundMessage(function(payload) {
    console.log('[service-worker.js] Menerima pesan di latar belakang: ', payload);

    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/favicon.png'
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Caching strategy (opsional, tapi disarankan)
const cacheName = 'jadwal-sholat-v6-firebase';
const assetsToCache = [ '/', 'index.html', 'style.css', 'PrayTimes.js', 'config.js', 'engine.js', 'view.js', 'app.js', 'push-manager.js', 'firebase-init.js', 'favicon.png' ];

self.addEventListener('install', event => {
  event.waitUntil( caches.open(cacheName).then(cache => cache.addAll(assetsToCache)) );
});

self.addEventListener('activate', event => {
  event.waitUntil( caches.keys().then(keys => Promise.all(keys.filter(key => key !== cacheName).map(key => caches.delete(key)))) );
});

self.addEventListener('fetch', event => {
  event.respondWith( caches.match(event.request).then(response => response || fetch(event.request)) );
});
