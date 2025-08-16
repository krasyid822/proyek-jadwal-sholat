// /pages/api/test.js
import webpush from 'web-push';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
  }

  try {
    const { subscription } = req.body;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ status: 'error', message: 'Invalid subscription object' });
    }

    // Setup VAPID
    webpush.setVapidDetails(
      process.env.VAPID_EMAIL || 'mailto:admin@example.com',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    // Payload notifikasi uji
    const payloadObject = {
      title: '🔔 Tes Notifikasi',
      body: 'Ini adalah notifikasi uji coba dari sistem.',
      icon: '/icon-subuh.png',
      badge: '/badge.png',
      tag: 'test-notification',
      data: { url: '/', timestamp: Date.now() }
    };

    // Kirim push
    await webpush.sendNotification(subscription, JSON.stringify(payloadObject));

    // Log sukses di server
    console.log('[TEST PUSH] Berhasil kirim notifikasi uji →', subscription.endpoint);

    // Response sesuai format dashboard
    return res.status(200).json({
      status: 'ok',
      tag: payloadObject.tag,
      message: 'Test notification sent successfully!'
    });

  } catch (error) {
    console.error('[TEST PUSH] Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to send test notification',
      details: error.message
    });
  }
}
