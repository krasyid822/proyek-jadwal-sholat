// app.js

const App = {
    countdownInterval: null,

    init: function() {
        document.addEventListener("DOMContentLoaded", () => {
            UIManager.init(this);
            PrayerTimeManager.init();
            PushManager.init(); // Inisialisasi Push Manager baru

            this.run();
        });
    },

    run: function(userCalibration = null) {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }

        LocationService.getUserLocation(locationData => {
            window.currentLocationData = locationData; // Penting untuk PushManager
            UIManager.updateLocation(locationData);
            
            const times = PrayerTimeManager.calculateTimes(locationData, userCalibration);

            if (!times || !times.fajr) {
                UIManager.showError("Gagal memuat jadwal. Pastikan izin lokasi diberikan dan koneksi internet stabil.");
                return;
            }
            
            UIManager.updatePrayerTimes(times);
            
            this.countdownInterval = setInterval(() => {
                const diff = PrayerTimeManager.getCountdownDiff();
                if (diff <= 0) {
                    clearInterval(this.countdownInterval);
                    setTimeout(() => this.run(), 2000);
                    return;
                }
                UIManager.updateCountdown(diff);
            }, 1000);
        });
    }
};

App.init();