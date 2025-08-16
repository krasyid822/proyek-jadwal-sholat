import { db } from './_lib/database.js'; // <-- PERUBAHAN DI SINI
import webpush from 'web-push';
import PrayTimes from './_lib/PrayTimes.js'; // <-- PERUBAHAN DI SINI
import moment from 'moment-timezone';

// Konfigurasi VAPID dari environment variables
webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Fungsi helper untuk mengirim notifikasi ke semua pelanggan
async function sendToAll(subscribers, payloadObject) {
    for (const sub of subscribers) {
      try {
        await webpush.sendNotification(
          sub.subscription_data,
          JSON.stringify(payloadObject)
        );
      } catch (err) {
        // Jika subscription tidak valid (misal: 410 Gone), kita bisa hapus dari DB
        if (err.statusCode === 410) {
            await db.query('DELETE FROM subscriptions WHERE endpoint = $1', [sub.subscription_data.endpoint]);
        } else {
            console.error('Push error:', err.message);
        }
      }
    }
}


export default async function handler(req, res) {
  // 1. KEAMANAN: Pastikan hanya cron-job.org yang bisa mengakses
  const authHeader = req.headers.authorization || '';
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.warn('Akses cron tidak sah terdeteksi.');
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }

  // 2. LOGIKA INTI
  try {
    const timezone = 'Asia/Jakarta';
    const lat = -6.2088; // Latitude Jakarta
    const lon = 106.8456; // Longitude Jakarta

    // Inisialisasi PrayTimes
    const pt = new PrayTimes('Karachi');
    pt.adjust({ fajr: 20, isha: 18 });
    const times = pt.getTimes(new Date(), [lat, lon], 7);

    const prayerOrder = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    const prayerNames = { fajr: 'Subuh', dhuhr: 'Zuhur', asr: 'Ashar', maghrib: 'Maghrib', isha: 'Isya' };
    const now = moment().tz(timezone);
    const currentTime = now.format('HH:mm');

    // Ambil semua pelanggan dari database
    const { rows: subs } = await db.query('SELECT subscription_data FROM subscriptions');
    if (subs.length === 0) {
        return res.status(200).json({ message: 'Tidak ada pelanggan, tidak ada notifikasi dikirim.' });
    }
    
    // Iterasi untuk setiap waktu sholat
    for (const prayer of prayerOrder) {
      const prayerTime = times[prayer];

      // Kirim notifikasi TEPAT WAKTU
      if (currentTime === prayerTime) {
        const payload = {
          title: `🕌 Waktu Sholat ${prayerNames[prayer]}`,
          body: `Saatnya menunaikan sholat ${prayerNames[prayer]} untuk wilayah Jakarta dan sekitarnya.`,
          tag: prayer === 'fajr' ? 'subuh' : 'utama'
        };
        await sendToAll(subs, payload);
      }

      // Kirim notifikasi PENGINGAT 10 MENIT
      const countdownTime = moment.tz(prayerTime, 'HH:mm', timezone).subtract(10, 'minutes').format('HH:mm');
      if (currentTime === countdownTime) {
        const payload = {
          title: `⏳ 10 Menit Menuju ${prayerNames[prayer]}`,
          body: `Segera bersiap untuk menunaikan sholat ${prayerNames[prayer]}.`,
          tag: 'countdown'
        };
        await sendToAll(subs, payload);
      }
    }

    res.status(200).json({ status: 'ok', message: 'Pengecekan selesai.' });

  } catch (err) {
    console.error('Error di proses cron:', err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
}
