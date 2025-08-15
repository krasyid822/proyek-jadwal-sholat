import { Pool } from 'pg';
import webpush from 'web-push';

export default async function handler(req, res) {
  // Hanya izinkan metode POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Ambil data yang dikirim dari frontend (PWA)
  const { endpoint, type, prayer } = req.body;
  if (!endpoint || !type || !prayer) {
    return res.status(400).json({ error: 'Endpoint, type, and prayer are required' });
  }

  // Konfigurasi koneksi database dari Environment Variables
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  // Konfigurasi VAPID keys dari Environment Variables
  webpush.setVapidDetails(
    'mailto:your-email@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  try {
    // Cari data subscription lengkap di database berdasarkan endpoint
    const { rows } = await pool.query('SELECT subscription_data FROM subscriptions WHERE endpoint = $1', [endpoint]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const subscriptionData = rows[0].subscription_data;
    const prayerNames = { fajr: "Subuh", dhuhr: "Zuhur", asr: "Ashar", maghrib: "Maghrib", isha: "Isya" };
    let payloadObject;

    // Buat payload notifikasi berdasarkan tipe tes yang diminta
    if (type === 'adhan') {
      payloadObject = {
        title: `Tes Adzan (${prayerNames[prayer] || ''}) ✅`,
        body: 'Ini adalah notifikasi untuk waktu sholat.',
        tag: prayer // Kategori notifikasi berdasarkan nama sholat (e.g., 'fajr', 'dhuhr')
      };
    } else { // type === 'countdown'
      payloadObject = {
        title: 'Tes Pengingat (10 Menit) ✅',
        body: 'Ini adalah notifikasi untuk pengingat sebelum sholat.',
        tag: 'countdown' // Kategori tunggal untuk semua pengingat
      };
    }

    // Kirim notifikasi push
    await webpush.sendNotification(subscriptionData, JSON.stringify(payloadObject));

    res.status(200).json({ message: 'Test notification sent successfully!' });
  } catch (err) {
    console.error('Error sending test notification:', err);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
}
