const { Pool } = require('pg');
const webpush = require('web-push');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { subscription, location } = req.body;
  if (!subscription || !location) {
    return res.status(400).json({ error: 'Data tidak lengkap' });
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const query = `
    INSERT INTO subscriptions (endpoint, subscription_data, location)
    VALUES ($1, $2, $3)
    ON CONFLICT (endpoint) DO UPDATE SET
        subscription_data = EXCLUDED.subscription_data,
        location = EXCLUDED.location;
  `;

  try {
    await pool.query(query, [subscription.endpoint, subscription, location]);
    res.status(201).json({ message: 'Subscription tersimpan' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menyimpan subscription' });
  }
}
