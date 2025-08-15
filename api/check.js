const { Pool } = require('pg');
const webpush = require('web-push');
const PrayTimes = require('./_PrayTimes.js');

export default async function handler(req, res) {
  console.log('Cron job started...');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  webpush.setVapidDetails(
    'mailto:your-email@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const prayTimes = new PrayTimes('MWL');
  prayTimes.adjust({ fajr: 20, isha: 18 });
  const prayerNames = { fajr: "Subuh", dhuhr: "Zuhur", asr: "Ashar", maghrib: "Maghrib", isha: "Isya" };

  try {
    const { rows: allSubscriptions } = await pool.query('SELECT * FROM subscriptions');
    console.log(`Checking ${allSubscriptions.length} subscriptions...`);

    for (const sub of allSubscriptions) {
      const { location, subscription_data: subscriptionData } = sub;
      const times = prayTimes.getTimes(new Date(), [location.lat, location.lng, location.altitude || 0], 7);
      const payload = createNotificationPayload(times, prayerNames);

      if (payload) {
        console.log(`Sending notification: ${payload.body}`);
        try {
          await webpush.sendNotification(subscriptionData, JSON.stringify(payload));
        } catch (error) {
          if (error.statusCode === 410) {
            console.log('Subscription tidak valid, menghapus.');
            await pool.query('DELETE FROM subscriptions WHERE id = $1', [sub.id]);
          } else {
            console.error('Gagal mengirim notifikasi:', error.body || error);
          }
        }
      }
    }
    res.status(200).json({ message: `Checked ${allSubscriptions.length} subscriptions.` });
  } catch (dbError) {
    console.error("Database error:", dbError);
    res.status(500).json({ error: 'Database query failed.' });
  }
}

function createNotificationPayload(prayerTimes, prayerNames) {
    // Fungsi ini tidak berubah dari kode server sebelumnya
    const now = new Date();
    for (const prayer in prayerTimes) {
        if (!prayerNames[prayer]) continue;
        const [hour, minute] = prayerTimes[prayer].split(':');
        const prayerTime = new Date();
        prayerTime.setHours(parseInt(hour), parseInt(minute), 0, 0);
        if (prayerTime.getHours() === now.getHours() && prayerTime.getMinutes() === now.getMinutes()) {
            return { type: 'adhan', prayer: prayer, title: 'Waktu Sholat', body: `Telah masuk waktu sholat ${prayerNames[prayer]}.` };
        }
        const countdownTime = new Date(prayerTime.getTime() - 10 * 60 * 1000);
        if (countdownTime.getHours() === now.getHours() && countdownTime.getMinutes() === now.getMinutes()) {
            return { type: 'countdown', prayer: prayer, title: 'Pengingat Sholat', body: `10 menit lagi memasuki waktu ${prayerNames[prayer]}.` };
        }
    }
    return null;
}
