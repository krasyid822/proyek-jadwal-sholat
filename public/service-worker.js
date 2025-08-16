// Nama cache untuk PWA
const CACHE_NAME = 'jadwal-sholat-cache-v1';
// Aset yang akan di-cache saat instalasi
const assetsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/lib/PrayTimes.js',
  '/favicon.png'
  // Tambahkan ikon dan audio jika ingin di-cache
  // '/assets/icons/icon-utama.png',
  // '/assets/audio/adzan1.mp3',
];

// Event: Install
// Melakukan caching aset inti
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching assets...');
        return cache.addAll(assetsToCache);
      })
      .catch(err => {
        console.error('[SW] Gagal caching assets:', err);
      })
  );
});

// Event: Activate
// Membersihkan cache lama yang tidak digunakan lagi
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  );
});

// Event: Fetch
// Menyajikan aset dari cache terlebih dahulu (Cache-First Strategy)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Jika ada di cache, kembalikan dari cache. Jika tidak, ambil dari network.
        return response || fetch(event.request);
      })
  );
});

// Event: Push
// Menangani notifikasi push yang diterima dari server
self.addEventListener('push', event => {
  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    payload = { title: 'Notifikasi Baru', body: 'Anda memiliki pesan baru.', tag: 'general' };
  }

  const title = payload.title || 'Jadwal Sholat';
  const options = {
    body: payload.body || 'Waktunya Sholat',
    icon: '/favicon.png', // Ikon default
    badge: '/favicon.png', // Badge untuk Android
    tag: payload.tag || 'general', // Tag untuk mengelompokkan notifikasi
    renotify: true, // Izinkan notifikasi baru dengan tag yang sama untuk bergetar
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Event: Notification Click
// Menangani apa yang terjadi saat pengguna mengklik notifikasi
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Jika aplikasi sudah terbuka, fokus ke jendela tersebut
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // Jika aplikasi belum terbuka, buka jendela baru
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
