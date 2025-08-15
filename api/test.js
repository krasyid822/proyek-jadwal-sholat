// api/test.js
import { Pool } from 'pg';
import webpush from 'web-push';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { endpoint, type, prayer } = req.body;
  if (!endpoint || !type || !prayer) {
    return res.status(400).json({ error: 'Endpoint, type, and prayer are required' });
  }

  // Koneksi database
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
    // Ambil subscription dari DB berdasarkan endpoint
    const { rows } = await pool.query(
      'SELECT subscription_data FROM subscriptions WHERE endpoint = $1',
      [endpoint]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const subscriptionData = rows[0].subscription_data;
    const prayerNames = {
      fajr: "Subuh",
      dhuhr: "Zuhur",
      asr: "Ashar",
      maghrib: "Maghrib",
      isha: "Isya"
    };

    let payloadObject;

    // ✅ Mapping type/prayer → channel/tag
    if (type === 'adhan') {
      const tag = (prayer === 'fajr') ? 'subuh' : 'utama';
      payloadObject = {
        title: `Tes Adzan (${prayerNames[prayer] || ''}) ✅`,
        body: 'Ini adalah notifikasi untuk waktu sholat.',
        tag
      };
    } else if (type === 'countdown') {
      payloadObject = {
        title: 'Tes Pengingat (10 Menit) ✅',
        body: `Hitung mundur menuju waktu ${prayerNames[prayer] || 'sholat'}.`,
        tag: 'countdown'
      };
    } else {
      payloadObject = {
        title: 'Tes Notifikasi',
        body: 'Jenis notifikasi tidak dikenali.',
        tag: 'general'
      };
    }

    console.log(`[API Test] Mengirim notifikasi test dengan tag: "${payloadObject.tag}"`);

    // Kirim notifikasi push
    await webpush.sendNotification(
      subscriptionData,
      JSON.stringify(payloadObject)
    );

    res.status(200).json({ message: 'Test notification sent successfully!' });

  } catch (err) {
    console.error('Error sending test notification:', err);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
}
