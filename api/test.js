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

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  webpush.setVapidDetails(
    'mailto:your-email@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  try {
    const { rows } = await pool.query('SELECT subscription_data FROM subscriptions WHERE endpoint = $1', [endpoint]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const subscriptionData = rows[0].subscription_data;
    const prayerNames = { fajr: "Subuh", dhuhr: "Zuhur", asr: "Ashar", maghrib: "Maghrib", isha: "Isya" };
    let payloadObject;

    if (type === 'adhan') {
      // PERUBAHAN: Gunakan tag khusus jika sholat yang dites adalah Subuh
      let adhanTag = prayer === 'fajr' ? 'adhan_fajr' : prayer;
      payloadObject = {
        title: `Tes Adzan (${prayerNames[prayer] || ''}) ✅`,
        body: 'Ini adalah notifikasi untuk waktu sholat.',
        tag: adhanTag
      };
    } else { // type === 'countdown'
      payloadObject = {
        title: 'Tes Pengingat (10 Menit) ✅',
        body: 'Ini adalah notifikasi untuk pengingat sebelum sholat.',
        tag: 'countdown'
      };
    }

    await webpush.sendNotification(subscriptionData, JSON.stringify(payloadObject));
    res.status(200).json({ message: 'Test notification sent successfully!' });
  } catch (err) {
    console.error('Error sending test notification:', err);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
}
