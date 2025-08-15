// public/service-worker.js (Versi untuk Vercel, mendukung 3 channel notifikasi)

// --- Push Notification Handler ---
self.addEventListener('push', function(event) {
    console.log('[SW] Push message diterima.');
    let payload;
    try {
        // Data dari server dikirim sebagai JSON
        payload = event.data.json();
    } catch (e) {
        console.error('[SW] Gagal mem-parsing data push:', e);
        // Fallback jika parsing gagal
        payload = {
            title: 'Notifikasi Baru',
            body: 'Anda memiliki pesan baru.',
            tag: 'general'
        };
    }

    // Default options
    let title = payload.title || 'Jadwal Sholat';
    let options = {
        body: payload.body || 'Waktunya Sholat',
        icon: '/favicon.png', // Ikon default
        badge: '/favicon.png', // Ikon kecil di Android
        tag: payload.tag || 'general'
    };

    // Customisasi berdasarkan channel/tag
    switch (payload.tag) {
        case 'subuh':
            options.icon = '/icon-subuh.png';
            options.badge = '/icon-subuh.png';
            title = title || 'Waktunya Sholat Subuh';
            break;
        case 'utama':
            options.icon = '/icon-utama.png';
            options.badge = '/icon-utama.png';
            title = title || 'Waktu Sholat';
            break;
        case 'countdown':
            options.icon = '/icon-countdown.png';
            options.badge = '/icon-countdown.png';
            title = title || 'Pengingat Sholat (10 Menit Lagi)';
            break;
        default:
            console.warn(`[SW] Tag tidak dikenali: "${payload.tag}", menggunakan default.`);
    }

    console.log(`[SW] Menampilkan notifikasi dengan channel: "${options.tag}"`);
    event.waitUntil(self.registration.showNotification(title, options));
});

// --- Klik Notifikasi ---
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
const cacheName = 'jadwal-sholat-v11-with-channels';
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
    'beeps',
    'icon-subuh.png',
    'icon-utama.png',
    'icon-countdown.png'
];

// Install: cache semua asset
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(cacheName).then(cache => {
            console.log('[SW] Caching semua aset...');
            return cache.addAll(assetsToCache);
        }).catch(err => {
            console.error('[SW] Gagal melakukan caching aset:', err);
        })
    );
});

// Activate: hapus cache lama
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(key => key !== cacheName).map(key => caches.delete(key)))
        )
    );
});

// Fetch: coba dari cache dulu, kalau tidak ada ambil dari network
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => response || fetch(event.request))
    );
});
