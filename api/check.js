// api/check.js
import { Pool } from 'pg';
import webpush from 'web-push';
import prayTimes from 'praytimes'; // Pastikan package ini terpasang
import moment from 'moment-timezone';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Koneksi ke database
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  // Konfigurasi VAPID
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL || 'default@example.com'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  try {
    // Tentukan zona waktu & lokasi default
    const timezone = process.env.PRAYER_TIMEZONE || 'Asia/Jakarta';
    const lat = parseFloat(process.env.PRAYER_LAT || '-6.2');
    const lon = parseFloat(process.env.PRAYER_LON || '106.8');

    // Hitung jadwal sholat hari ini
    const pt = new prayTimes('Karachi');
    const times = pt.getTimes(new Date(), [lat, lon], +7);

    const prayerOrder = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    const prayerNames = {
      fajr: 'Subuh',
      dhuhr: 'Zuhur',
      asr: 'Ashar',
      maghrib: 'Maghrib',
      isha: 'Isya'
    };

    const now = moment().tz(timezone);

    // Ambil semua subscriber
    const { rows: subs } = await pool.query('SELECT subscription_data FROM subscriptions');

    for (const prayer of prayerOrder) {
      const prayerTime = moment.tz(times[prayer], 'HH:mm', timezone);

      // Notifikasi Adzan (tepat waktu)
      if (now.format('HH:mm') === prayerTime.format('HH:mm')) {
        const tag = (prayer === 'fajr') ? 'subuh' : 'utama';
        const payloadObject = {
          title: `Waktu Sholat ${prayerNames[prayer]} 🕌`,
          body: `Sudah masuk waktu sholat ${prayerNames[prayer]}.`,
          tag
        };
        await sendToAll(subs, payloadObject);
      }

      // Notifikasi Countdown (10 menit sebelum)
      const countdownTime = prayerTime.clone().subtract(10, 'minutes');
      if (now.format('HH:mm') === countdownTime.format('HH:mm')) {
        const payloadObject = {
          title: `Pengingat ${prayerNames[prayer]} ⏳`,
          body: `10 menit menuju waktu sholat ${prayerNames[prayer]}.`,
          tag: 'countdown'
        };
        await sendToAll(subs, payloadObject);
      }
    }

    res.status(200).json({ message: 'Check completed successfully' });

  } catch (err) {
    console.error('Error in check.js:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

// Helper kirim ke semua subscriber
async function sendToAll(subscribers, payloadObject) {
  for (const sub of subscribers) {
    try {
      await webpush.sendNotification(
        sub.subscription_data,
        JSON.stringify(payloadObject)
      );
      console.log(`[API Check] Sent: "${payloadObject.title}" | Tag: "${payloadObject.tag}"`);
    } catch (err) {
      console.error('Push error:', err);
    }
  }
}
