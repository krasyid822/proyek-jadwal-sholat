// service-worker.js (Versi untuk Vercel, BUKAN Firebase)

self.addEventListener('push', function(event) {
    console.log('[SW] Push message diterima.');
    let payload;
    try {
        payload = event.data.json();
    } catch (e) {
        console.error('[SW] Gagal mem-parsing data push sebagai JSON:', e);
        payload = {
            title: 'Notifikasi Baru',
            body: 'Anda memiliki pesan baru.',
        };
    }

    const title = payload.title || 'Jadwal Sholat';
    const options = {
        body: payload.body || 'Waktunya Sholat',
        icon: '/favicon.png',
        badge: '/favicon.png'
    };

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

// Strategi Caching
const cacheName = 'jadwal-sholat-v7-vercel';
const assetsToCache = [ '/', 'index.html', 'style.css', 'PrayTimes.js', 'config.js', 'engine.js', 'view.js', 'app.js', 'push-manager.js', 'error-notifier.js', 'favicon.png' ];

self.addEventListener('install', event => {
  event.waitUntil( caches.open(cacheName).then(cache => cache.addAll(assetsToCache)) );
});

self.addEventListener('activate', event => {
  event.waitUntil( caches.keys().then(keys => Promise.all(keys.filter(key => key !== cacheName).map(key => caches.delete(key)))) );
});

self.addEventListener('fetch', event => {
  event.respondWith( caches.match(event.request).then(response => response || fetch(event.request)) );
});
