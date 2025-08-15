// service-worker.js (Versi untuk Vercel, BUKAN Firebase)

self.addEventListener('push', function(event) {
    console.log('[SW] Push message diterima.');
    let payload;
    try {
        // Data dari Vercel datang sebagai JSON
        payload = event.data.json();
    } catch (e) {
        console.error('[SW] Gagal mem-parsing data push sebagai JSON:', e);
        // Fallback jika parsing gagal
        payload = {
            title: 'Notifikasi Baru',
            body: 'Anda memiliki pesan baru.',
            tag: 'general'
        };
    }

    const title = payload.title || 'Jadwal Sholat';
    const options = {
        body: payload.body || 'Waktunya Sholat',
        icon: '/favicon.png', // Pastikan path ini benar
        badge: '/favicon.png', // Ikon untuk notifikasi di Android
        tag: payload.tag || 'general' // Menggunakan tag dari server
    };

    console.log(`[SW] Menampilkan notifikasi dengan tag: "${options.tag}"`);
    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            for (const client of clientList) {
                if ('focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});

// --- Caching Strategy ---
const cacheName = 'jadwal-sholat-v10-no-ext';
// Daftar aset yang lengkap dan benar untuk di-cache
const assetsToCache = [
    '/',
    'index.html',
    'preview.html',
    'style.css',
    'PrayTimes.js',
    'config.js',
    'engine.js',
    'view.js',
    'error-notifier.js',
    'push-manager.js',
    'app.js',
    'previewHijri.js',
    'favicon.png',
    'adzan1',
    'adzan_subuh',
    'beeps'
];

self.addEventListener('install', event => {
  event.waitUntil( caches.open(cacheName).then(cache => {
      console.log('[SW] Caching semua aset...');
      return cache.addAll(assetsToCache);
  }).catch(err => {
      console.error('[SW] Gagal melakukan caching aset:', err);
  }));
});

self.addEventListener('activate', event => {
  event.waitUntil( caches.keys().then(keys => Promise.all(keys.filter(key => key !== cacheName).map(key => caches.delete(key)))) );
});

self.addEventListener('fetch', event => {
  event.respondWith( caches.match(event.request).then(response => response || fetch(event.request)) );
});
