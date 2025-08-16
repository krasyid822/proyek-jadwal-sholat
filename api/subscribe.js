import { db } from './_lib/database.js'; // <-- PERUBAHAN DI SINI

export default async function handler(req, res) {
  // Hanya izinkan metode POST
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
  }

  const { subscription } = req.body;

  // Validasi input
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ status: 'error', message: 'Subscription object tidak valid.' });
  }

  const query = `
    INSERT INTO subscriptions (endpoint, subscription_data)
    VALUES ($1, $2)
    ON CONFLICT (endpoint) DO UPDATE SET
      subscription_data = EXCLUDED.subscription_data;
  `;

  try {
    await db.query(query, [subscription.endpoint, subscription]);
    res.status(201).json({ status: 'ok', message: 'Subscription berhasil disimpan.' });
  } catch (err) {
    console.error('Gagal menyimpan subscription:', err);
    res.status(500).json({ status: 'error', message: 'Gagal menyimpan subscription ke database.' });
  }
}
