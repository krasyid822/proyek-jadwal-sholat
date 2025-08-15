const PushManager = {
    // Kunci publik VAPID Anda.
    VAPID_PUBLIC_KEY: 'BBLwDppUq609cl8GmiPUn0C3e3Ab4e9HuBgOqTFwlEo_VKZIiUv5eir-hRGlllHP2pOZJY_oLTOeBbFnk_Gblkw',
    
    // URL Endpoint API Vercel Anda yang sudah benar.
    API_ENDPOINT: 'https://proyek-jadwal-sholat.vercel.app/api/subscribe',
    
    isSubscribed: false,
    swRegistration: null,

    init: function() {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            navigator.serviceWorker.ready.then(reg => {
                this.swRegistration = reg;
                this.updateSubscriptionState();
            });
        } else {
            console.warn('Push messaging tidak didukung oleh browser ini.');
            const menu = DOMElements.notificationMenu;
            if(menu) menu.innerHTML = '<h2>Notifikasi Latar Belakang</h2><p>Fitur ini tidak didukung oleh browser Anda.</p>';
        }
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

        // Hapus tombol lama untuk mencegah duplikasi
        const oldBtn = document.getElementById('btn-subscribe-toggle');
        if (oldBtn) oldBtn.remove();
        
        const btn = document.createElement('button');
        btn.id = 'btn-subscribe-toggle';
        btn.className = 'btn';
        
        if (this.isSubscribed) {
            btn.textContent = 'Nonaktifkan Notifikasi Latar Belakang';
            btn.style.backgroundColor = '#dc3545'; // Warna merah
            btn.onclick = () => this.unsubscribeUser();
            menu.innerHTML = '<h2>Notifikasi Latar Belakang</h2><p>Status: <b>Aktif</b>.</p>';
        } else {
            btn.textContent = 'Aktifkan Notifikasi Latar Belakang';
            btn.style.backgroundColor = '#28a745'; // Warna hijau
            btn.onclick = () => this.subscribeUser();
            menu.innerHTML = '<h2>Notifikasi Latar Belakang</h2><p>Aktifkan untuk menerima notifikasi bahkan saat aplikasi ditutup.</p>';
        }
        menu.appendChild(btn);
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