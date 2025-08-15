const PushManager = {
    // Kunci publik VAPID Anda.
    VAPID_PUBLIC_KEY: 'BBLwDppUq609cl8GmiPUn0C3e3Ab4e9HuBgOqTFwlEo_VKZIiUv5eir-hRGlllHP2pOZJY_oLTOeBbFnk_Gblkw',
    
    // URL Endpoint API Vercel Anda.
    API_ENDPOINT: 'https://proyek-jadwal-sholat.vercel.app/api/subscribe',
    API_TEST_ENDPOINT: 'https://proyek-jadwal-sholat.vercel.app/api/test',
    
    isSubscribed: false,
    swRegistration: null,

    init: function() {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            navigator.serviceWorker.ready.then(reg => {
                this.swRegistration = reg;
                this.updateSubscriptionState();
            });
        } else {
            console.warn('Push messaging tidak didukung oleh browser atau koneksi ini.');
            this.showUnsupportedUI();
        }
    },

    showUnsupportedUI: function() {
        const menu = DOMElements.notificationMenu;
        if (!menu) return;
        
        const dynamicContent = document.createElement('div');
        dynamicContent.innerHTML = '<h2>Notifikasi Latar Belakang</h2><p>Fitur ini tidak didukung oleh browser Anda atau memerlukan koneksi HTTPS yang aman.</p>';
        menu.prepend(dynamicContent);
    },

    updateSubscriptionState: async function() {
        if (!this.swRegistration) return;
        const subscription = await this.swRegistration.pushManager.getSubscription();
        this.isSubscribed = !!subscription;
        this.updateUI();
    },
    
    updateUI: function() {
        const menu = DOMElements.notificationMenu;
        if (!menu) return;

        const dynamicContent = menu.querySelector('.dynamic-content');
        if (dynamicContent) dynamicContent.remove();

        const dynamicContainer = document.createElement('div');
        dynamicContainer.className = 'dynamic-content';
        
        const btnToggle = document.createElement('button');
        btnToggle.id = 'btn-subscribe-toggle';
        btnToggle.className = 'btn';
        
        if (this.isSubscribed) {
            btnToggle.textContent = 'Nonaktifkan Notifikasi Latar Belakang';
            btnToggle.style.backgroundColor = '#dc3545';
            btnToggle.onclick = () => this.unsubscribeUser();
            dynamicContainer.innerHTML = '<h2>Notifikasi Latar Belakang</h2><p>Status: <b>Aktif</b>.</p>';

            const nextPrayer = PrayerTimeManager.getNextPrayer();
            const nextPrayerName = nextPrayer ? nextPrayer.name : 'berikutnya';
            const prayerNameText = AppConfig.prayerNames[nextPrayerName] || 'Sholat';

            const btnTestAdhan = document.createElement('button');
            btnTestAdhan.className = 'btn';
            btnTestAdhan.textContent = `Uji Notifikasi Adzan (${prayerNameText})`;
            btnTestAdhan.style.backgroundColor = '#009688';
            btnTestAdhan.onclick = () => this.testNotification('adhan', nextPrayerName);
            dynamicContainer.appendChild(btnTestAdhan);

            const btnTestCountdown = document.createElement('button');
            btnTestCountdown.className = 'btn';
            btnTestCountdown.textContent = 'Uji Notifikasi Pengingat (10 Menit)';
            btnTestCountdown.style.backgroundColor = '#ff9800';
            btnTestCountdown.onclick = () => this.testNotification('countdown', nextPrayerName);
            dynamicContainer.appendChild(btnTestCountdown);
            
        } else {
            btnToggle.textContent = 'Aktifkan Notifikasi Latar Belakang';
            btnToggle.style.backgroundColor = '#28a745';
            btnToggle.onclick = () => this.subscribeUser();
            dynamicContainer.innerHTML = '<h2>Notifikasi Latar Belakang</h2><p>Aktifkan untuk menerima notifikasi bahkan saat aplikasi ditutup.</p>';
        }
        dynamicContainer.appendChild(btnToggle);
        menu.prepend(dynamicContainer);
    },

    testNotification: async function(type, prayer) {
        const sub = await this.swRegistration.pushManager.getSubscription();
        if (!sub) {
            ErrorNotifier.show('Anda belum terdaftar notifikasi.', 'Aktifkan notifikasi terlebih dahulu.');
            return;
        }

        ErrorNotifier.show('Mengirim notifikasi tes...', 'Silakan periksa panel notifikasi Anda dalam beberapa detik.', 'info', 4000);

        try {
            await fetch(this.API_TEST_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    endpoint: sub.endpoint,
                    type: type,
                    prayer: prayer
                }),
            });
        } catch(err) {
            console.error('Gagal mengirim notifikasi tes:', err);
            ErrorNotifier.show('Gagal mengirim notifikasi tes.', 'Pastikan koneksi internet stabil dan server berjalan.');
        }
    },

    subscribeUser: async function() {
        const applicationServerKey = this.urlBase64ToUint8Array(this.VAPID_PUBLIC_KEY);
        try {
            const subscription = await this.swRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: applicationServerKey
            });
            await this.sendSubscriptionToServer(subscription);
            this.isSubscribed = true;
            this.updateUI();
        } catch (err) {
            console.error('Gagal melakukan subscribe: ', err);
            ErrorNotifier.show('Gagal mengaktifkan notifikasi.', 'Pastikan izin notifikasi tidak diblokir di browser Anda.');
            this.isSubscribed = false;
            this.updateUI();
        }
    },

    unsubscribeUser: async function() {
        const subscription = await this.swRegistration.pushManager.getSubscription();
        if (subscription) {
            await subscription.unsubscribe();
            this.isSubscribed = false;
            console.log('User is unsubscribed.');
            this.updateUI();
        }
    },

    sendSubscriptionToServer: async function(subscription) {
        if (!window.currentLocationData) {
            ErrorNotifier.show('Lokasi belum terdeteksi.', 'Izinkan akses lokasi lalu coba aktifkan notifikasi lagi.');
            return;
        }
        try {
            const response = await fetch(this.API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subscription: subscription,
                    location: window.currentLocationData
                })
            });
            if (!response.ok) {
                throw new Error('Server merespon dengan error.');
            }
        } catch(err) {
            console.error('Gagal mengirim subscription ke server: ', err);
            ErrorNotifier.show('Gagal menghubungi server.', 'Periksa koneksi internet Anda atau coba lagi nanti.');
        }
    },

    urlBase64ToUint8Array: function(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }
};
