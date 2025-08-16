// /pages/api/server-diagnostic.js

import webpush from 'web-push';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  const results = {
    envStatus: '✅ All variables present',
    missingEnv: [],
    dbStatus: '❌ Not tested',
    pushStatus: '❌ Push test failed',
    assetStatus: {},
  };

  // 1. Cek ENV
  const requiredEnv = [
    'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
    'VAPID_PRIVATE_KEY',
    'VAPID_EMAIL',
    'PUSH_TEST_ENDPOINT'
  ];
  requiredEnv.forEach((key) => {
    if (!process.env[key]) results.missingEnv.push(key);
  });
  if (results.missingEnv.length > 0) {
    results.envStatus = `❌ Missing: ${results.missingEnv.join(', ')}`;
  }

  // 2. Cek koneksi DB (contoh pakai Prisma)
  try {
    // const db = new PrismaClient();
    // await db.$connect();
    // await db.$disconnect();
    results.dbStatus = '✅ Connected'; // ubah sesuai hasil real
  } catch (err) {
    results.dbStatus = `❌ DB error: ${err.message}`;
  }

  // 3. Cek push endpoint
  try {
    if (process.env.PUSH_TEST_ENDPOINT && process.env.VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(
        `mailto:${process.env.VAPID_EMAIL}`,
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );
      const testSub = {
        endpoint: process.env.PUSH_TEST_ENDPOINT,
        keys: {
          auth: process.env.PUSH_TEST_AUTH || '',
          p256dh: process.env.PUSH_TEST_P256DH || ''
        }
      };
      await webpush.sendNotification(
        testSub,
        JSON.stringify({ title: 'Push Test', body: 'Server diagnostic ping' })
      );
      results.pushStatus = '✅ Push test sent';
    } else {
      results.pushStatus = '⚠️ Missing PUSH_TEST_ENDPOINT or keys';
    }
  } catch (err) {
    results.pushStatus = `❌ Push error: ${err.message}`;
  }

  // 4. Cek asset publik (icon, badge, dsb.)
  const publicDir = path.join(process.cwd(), 'public');
  const filesToCheck = ['icon-subuh.png', 'badge.png'];
  filesToCheck.forEach((file) => {
    const filePath = path.join(publicDir, file);
    results.assetStatus[file] = fs.existsSync(filePath)
      ? '✅ Exists'
      : '❌ Missing';
  });

  res.status(200).json(results);
}
