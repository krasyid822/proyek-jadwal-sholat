// service-worker.js (Versi untuk Vercel, BUKAN Firebase)

self.addEventListener('push', function(event) {
    console.log('[SW] Push message diterima.');
    let payload;
    try {
        // Data yang dikirim dari server Vercel (api/check.js dan api/test.js)
        payload = event.data.json();
    } catch (e) {
        console.error('[SW] Gagal mem-parsing data push sebagai JSON:', e);
        // Fallback jika data tidak bisa di-parse
        payload = {
            title: 'Notifikasi Baru',
            body: 'Anda memiliki pesan baru.',
            tag: 'general'
        };
    }

    const title = payload.title || 'Jadwal Sholat';
    const options = {
        body: payload.body || 'Waktunya Sholat',
        icon: '/favicon.png', // Pastikan path ini benar dan file ada di folder public
        badge: '/favicon.png', // Ikon untuk notifikasi di panel Android
        
        // Kategori notifikasi. Notifikasi dengan tag yang sama akan saling menimpa.
        // Contoh: notifikasi adzan 'dhuhr' akan menimpa notifikasi 'dhuhr' sebelumnya.
        // Notifikasi 'countdown' akan menimpa notifikasi 'countdown' sebelumnya.
        tag: payload.tag || 'general' 
    };

    // Perintah untuk menampilkan notifikasi ke pengguna
    event.waitUntil(self.registration.showNotification(title, options));
});

// Handler saat pengguna mengklik notifikasi
self.addEventListener('notificationclick', function(event) {
    event.notification.close(); // Tutup notifikasi yang diklik
    
    // Buka aplikasi (PWA) atau fokus ke tab yang sudah ada
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            // Jika ada tab aplikasi yang sudah terbuka, fokus ke sana
            for (const client of clientList) {
                if ('focus' in client) {
                    return client.focus();
                }
            }
            // Jika tidak ada tab yang terbuka, buka jendela baru
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});

// Strategi Caching
const cacheName = 'jadwal-sholat-v8-vercel'; // Naikkan versi cache
const assetsToCache = [
    '/',
    'index.html',
    'preview.html',
    'style.css',
    'PrayTimes.js',
    'config.js',
    'engine.js',
    'view.js',
    'app.js',
    'push-manager.js',
    'error-notifier.js',
    'favicon.png',
    'adzan1.mp3',
    'adzan_subuh.mp3',
    'beeps.mp3'
];

self.addEventListener('install', event => {
  event.waitUntil( caches.open(cacheName).then(cache => cache.addAll(assetsToCache)) );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== cacheName)
          .map(key => caches.delete(key))
      )
    )
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      // Jika ada di cache, kembalikan dari cache. Jika tidak, ambil dari jaringan.
      return response || fetch(event.request);
    })
  );
});
