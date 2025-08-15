import { Pool } from 'pg';
import webpush from 'web-push';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { endpoint } = req.body;
  if (!endpoint) {
    return res.status(400).json({ error: 'Endpoint is required' });
  }

  // Konfigurasi Database dan VAPID dari Environment Variables
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
    // Cari data subscription lengkap di database berdasarkan endpoint
    const { rows } = await pool.query('SELECT subscription_data FROM subscriptions WHERE endpoint = $1', [endpoint]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const subscriptionData = rows[0].subscription_data;
    
    // Siapkan dan kirim notifikasi tes
    const payload = JSON.stringify({
      title: 'Notifikasi Tes ✅',
      body: 'Jika Anda menerima ini, sistem notifikasi bekerja dengan sempurna!',
    });

    await webpush.sendNotification(subscriptionData, payload);

    res.status(200).json({ message: 'Test notification sent successfully!' });
  } catch (err) {
    console.error('Error sending test notification:', err);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
}
