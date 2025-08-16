(function () {
  'use strict';

  // --- CONFIGURATION ---
  const Config = {
    VAPID_PUBLIC_KEY: 'BBLwDppUq609cl8GmiPUn0C3e3Ab4e9HuBgOqTFwlEo_VKZIiUv5eir-hRGlllHP2pOZJY_oLTOeBbFnk_Gblkw',
    DEFAULT_LOCATION: { lat: -6.2088, lng: 106.8456, text: 'Jakarta' },
    PRAYER_NAMES: {
      imsak: 'Imsak', fajr: 'Subuh', sunrise: 'Terbit',
      dhuhr: 'Zuhur', asr: 'Ashar', maghrib: 'Maghrib', isha: 'Isya'
    }
  };

  // --- DOM ELEMENTS ---
  const DOMElements = {
    locationInfo: document.getElementById('location-info'),
    countdown: document.getElementById('countdown'),
    jadwalContainer: document.getElementById('jadwal-container'),
    subscribeBtn: document.getElementById('btn-subscribe'),
  };

  // --- UTILITIES ---
  const Utils = {
    pad: (num) => ('0' + Math.floor(num)).slice(-2),
    urlBase64ToUint8Array: (base64String) => {
      const padding = '='.repeat((4 - base64String.length % 4) % 4);
      const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    },
    showToast: (message, type = 'error', duration = 5000) => {
      const oldToast = document.querySelector('.toast');
      if (oldToast) oldToast.remove();
      
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.innerHTML = `<p class="toast-message">${message}</p>`;
      document.body.appendChild(toast);

      setTimeout(() => toast.classList.add('show'), 100);
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
      }, duration);
    }
  };

  // --- CORE LOGIC MODULE ---
  const AppCore = {
    prayTimes: new PrayTimes('Karachi'),
    location: null,
    times: {},
    countdownInterval: null,

    init() {
      this.prayTimes.adjust({ fajr: 20, isha: 18 });
      this.getLocation();
      PushManager.init();
    },

    getLocation() {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            this.location = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              text: 'Lokasi Anda'
            };
            this.updateSchedule();
          },
          () => {
            Utils.showToast('Gagal mendapatkan lokasi. Menggunakan lokasi default.', 'info');
            this.location = Config.DEFAULT_LOCATION;
            this.updateSchedule();
          }
        );
      } else {
        this.location = Config.DEFAULT_LOCATION;
        this.updateSchedule();
      }
    },

    updateSchedule() {
      DOMElements.locationInfo.textContent = this.location.text;
      const today = new Date();
      this.times = this.prayTimes.getTimes(today, [this.location.lat, this.location.lng], 7);
      this.renderTimes();
      this.startCountdown();
    },
    
    getNextPrayer() {
        const now = new Date();
        const prayers = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];
        
        const parseTime = (timeStr) => {
            if (!timeStr || timeStr.includes('-')) return null;
            const [h, m] = timeStr.split(':');
            return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
        };
        
        for (const prayer of prayers) {
            const prayerDate = parseTime(this.times[prayer]);
            if (prayerDate && prayerDate > now) return { name: prayer, time: prayerDate };
        }
        
        const nextDayFajr = parseTime(this.times.fajr);
        if (nextDayFajr) nextDayFajr.setDate(nextDayFajr.getDate() + 1);
        return { name: "fajr", time: nextDayFajr };
    },

    startCountdown() {
      if (this.countdownInterval) clearInterval(this.countdownInterval);
      
      this.countdownInterval = setInterval(() => {
        const nextPrayer = this.getNextPrayer();
        if (!nextPrayer || !nextPrayer.time) {
          DOMElements.countdown.textContent = 'Jadwal hari ini telah selesai.';
          return;
        }

        const diff = nextPrayer.time - new Date();
        if (diff < 0) {
            this.updateSchedule(); // Refresh schedule if time has passed
            return;
        }

        const hours = diff / (1000 * 60 * 60);
        const minutes = (diff % (1000 * 60 * 60)) / (1000 * 60);
        const seconds = (diff % (1000 * 60)) / 1000;
        
        DOMElements.countdown.innerHTML = `Menuju <b>${Config.PRAYER_NAMES[nextPrayer.name]}</b> dalam ${Utils.pad(hours)}:${Utils.pad(minutes)}:${Utils.pad(seconds)}`;
        this.highlightNextPrayer(nextPrayer.name);
      }, 1000);
    },

    renderTimes() {
        const prayerOrder = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
        let html = '<div class="prayer-grid">';
        prayerOrder.forEach(prayer => {
            html += `
                <div class="prayer-time" id="prayer-${prayer}">
                    <span class="prayer-name">${Config.PRAYER_NAMES[prayer]}</span>
                    <span class="prayer-value">${this.times[prayer]}</span>
                </div>
            `;
        });
        html += '</div>';
        DOMElements.jadwalContainer.innerHTML = html;
    },

    highlightNextPrayer(nextPrayerName) {
        document.querySelectorAll('.prayer-time').forEach(el => el.classList.remove('next'));
        const nextPrayerEl = document.getElementById(`prayer-${nextPrayerName}`);
        if (nextPrayerEl) nextPrayerEl.classList.add('next');
    }
  };
  
  // --- PUSH NOTIFICATION MODULE ---
  const PushManager = {
      swRegistration: null,
      isSubscribed: false,

      async init() {
          if (!('serviceWorker' in navigator && 'PushManager' in window)) {
              Utils.showToast('Push Notifikasi tidak didukung browser ini.', 'info');
              return;
          }
          
          try {
              this.swRegistration = await navigator.serviceWorker.ready;
              const subscription = await this.swRegistration.pushManager.getSubscription();
              this.isSubscribed = !!subscription;
              this.updateUI();
          } catch (error) {
              console.error('Service Worker tidak siap:', error);
              Utils.showToast('Gagal menginisialisasi fitur notifikasi.');
          }
      },

      updateUI() {
          DOMElements.subscribeBtn.style.display = 'block';
          if (this.isSubscribed) {
              DOMElements.subscribeBtn.textContent = 'Nonaktifkan Notifikasi';
              DOMElements.subscribeBtn.classList.add('subscribed');
              DOMElements.subscribeBtn.onclick = () => this.unsubscribe();
          } else {
              DOMElements.subscribeBtn.textContent = 'Aktifkan Notifikasi';
              DOMElements.subscribeBtn.classList.remove('subscribed');
              DOMElements.subscribeBtn.onclick = () => this.subscribe();
          }
      },

      async subscribe() {
          const applicationServerKey = Utils.urlBase64ToUint8Array(Config.VAPID_PUBLIC_KEY);
          try {
              const subscription = await this.swRegistration.pushManager.subscribe({
                  userVisibleOnly: true,
                  applicationServerKey
              });
              
              await this.sendSubscriptionToServer(subscription);
              Utils.showToast('Notifikasi berhasil diaktifkan!', 'info');
              this.isSubscribed = true;
              this.updateUI();

          } catch (err) {
              console.error('Gagal subscribe:', err);
              Utils.showToast('Gagal mengaktifkan notifikasi. Pastikan izin tidak diblokir.');
              this.isSubscribed = false;
              this.updateUI();
          }
      },

      async unsubscribe() {
          const subscription = await this.swRegistration.pushManager.getSubscription();
          if (subscription) {
              await subscription.unsubscribe();
              // Opsional: kirim info unsubscribe ke server untuk menghapus data
              this.isSubscribed = false;
              Utils.showToast('Notifikasi telah dinonaktifkan.', 'info');
              this.updateUI();
          }
      },

      async sendSubscriptionToServer(subscription) {
          try {
              const response = await fetch('/api/subscribe', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ subscription })
              });
              if (!response.ok) throw new Error('Server response not ok.');
          } catch(err) {
              console.error('Gagal mengirim subscription ke server:', err);
              // Jika gagal, batalkan subscription di client agar UI konsisten
              await this.unsubscribe(); 
              Utils.showToast('Gagal menyimpan pendaftaran notifikasi di server.');
          }
      }
  };


  // --- INITIALIZE APP ---
  document.addEventListener('DOMContentLoaded', () => AppCore.init());

})();
