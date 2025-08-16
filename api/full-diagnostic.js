// /api/full-diagnostic.js
import { Client } from 'pg';

export default async function handler(req, res) {
  const REQUIRED_VARS = [
    'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
    'VAPID_PRIVATE_KEY',
    'VAPID_EMAIL',
    'DATABASE_URL',
    'PUSH_TEST_ENDPOINT'
  ];

  const missing = REQUIRED_VARS.filter(k => !process.env[k]);
  let dbOK = false;
  let pushOK = false;

  // Tes koneksi DB
  if (process.env.DATABASE_URL) {
    try {
      const client = new Client({ connectionString: process.env.DATABASE_URL });
      await client.connect();
      await client.query('SELECT NOW()');
      dbOK = true;
      await client.end();
    } catch {
      dbOK = false;
    }
  }

  // Tes endpoint Push
  if (process.env.PUSH_TEST_ENDPOINT) {
    try {
      const r = await fetch(process.env.PUSH_TEST_ENDPOINT);
      pushOK = r.ok;
    } catch {
      pushOK = false;
    }
  }

  res.status(200).json({
    envStatus: missing.length === 0 ? '✅ OK' : `❌ Missing: ${missing.join(', ')}`,
    dbStatus: dbOK ? '✅ Connected' : '❌ Fail',
    pushStatus: pushOK ? '✅ OK' : '❌ Fail'
  });
}
