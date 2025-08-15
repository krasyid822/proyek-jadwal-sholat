import { Pool } from 'pg';
import webpush from 'web-push';
import PrayTimes from './_PrayTimes.js'; // Pastikan path ini benar

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
      const payloadObject = createNotificationPayload(times, prayerNames);

      if (payloadObject) {
        console.log(`Sending notification: ${payloadObject.body}`);
        try {
          // Kirim payload sebagai string JSON
          await webpush.sendNotification(subscriptionData, JSON.stringify(payloadObject));
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
    const now = new Date();
    for (const prayer in prayerTimes) {
        if (!prayerNames[prayer]) continue;
        const [hour, minute] = prayerTimes[prayer].split(':');
        const prayerTime = new Date();
        prayerTime.setHours(parseInt(hour), parseInt(minute), 0, 0);
        if (prayerTime.getHours() === now.getHours() && prayerTime.getMinutes() === now.getMinutes()) {
            return { title: 'Waktu Sholat', body: `Telah masuk waktu sholat ${prayerNames[prayer]}.` };
        }
        const countdownTime = new Date(prayerTime.getTime() - 10 * 60 * 1000);
        if (countdownTime.getHours() === now.getHours() && countdownTime.getMinutes() === now.getMinutes()) {
            return { title: 'Pengingat Sholat', body: `10 menit lagi memasuki waktu ${prayerNames[prayer]}.` };
        }
    }
    return null;
}
