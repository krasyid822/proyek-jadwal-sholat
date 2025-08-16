async function runNotificationDiagnostic() {
  const results = {
    permission: Notification.permission,
    serviceWorker: '❌ Not registered',
    swVersion: '—',
    subscription: '❌ No subscription',
    endpoint: null,
    testResponse: '❌ Not tested',
    testTag: '—',
    localTime: new Date().toLocaleString(),
    serverTime: '❌ Not fetched',
    iconStatus: '❌ Not checked',
    badgeStatus: '❌ Not checked',
  };

  // 1. Notification Permission
  if (Notification.permission !== 'granted') {
    alert('Notifikasi belum diizinkan. Silakan klik "Izinkan" di browser.');
    return results;
  }

  // 2. Service Worker
  if ('serviceWorker' in navigator) {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) {
      results.serviceWorker = '✅ Registered';
      results.swVersion = reg.active?.scriptURL || '—';

      // 3. Subscription
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        results.subscription = '✅ Subscribed';
        results.endpoint = sub.endpoint;
      }
    }
  }

  // 4. Server Time
  try {
    const resTime = await fetch('/api/time');
    const jsonTime = await resTime.json();
    results.serverTime = jsonTime?.serverTime || '⚠️ Invalid response';
  } catch (err) {
    results.serverTime = '❌ Server error';
  }

  // 5. Test Notification
  try {
    const resTest = await fetch('/api/test');
    const jsonTest = await resTest.json();
    results.testResponse = jsonTest?.status === 'ok' ? '✅ Server responded' : '⚠️ Unexpected response';
    results.testTag = jsonTest?.tag || '—';
  } catch (err) {
    results.testResponse = '❌ Server error';
  }

  // 6. Icon & Badge Check
  const checkImage = async (url) => {
    try {
      const res = await fetch(url);
      return res.ok ? '✅ Accessible' : '❌ Not found';
    } catch {
      return '❌ Error';
    }
  };
  results.iconStatus = await checkImage('/icon-subuh.png');
  results.badgeStatus = await checkImage('/badge.png');

  // 7. Display Results
  console.table(results);
  const output = `
    <h3>🔍 Diagnostik Sistem Notifikasi</h3>
    <ul>
      <li><strong>Permission:</strong> ${results.permission}</li>
      <li><strong>Service Worker:</strong> ${results.serviceWorker}</li>
      <li><strong>SW Version:</strong> ${results.swVersion}</li>
      <li><strong>Subscription:</strong> ${results.subscription}</li>
      <li><strong>Endpoint:</strong> ${results.endpoint || '—'}</li>
      <li><strong>Local Time:</strong> ${results.localTime}</li>
      <li><strong>Server Time:</strong> ${results.serverTime}</li>
      <li><strong>Test Response:</strong> ${results.testResponse}</li>
      <li><strong>Test Tag:</strong> ${results.testTag}</li>
      <li><strong>Icon Status:</strong> ${results.iconStatus}</li>
      <li><strong>Badge Status:</strong> ${results.badgeStatus}</li>
    </ul>
  `;
  document.getElementById('diagnostic-output').innerHTML = output;

  return results;
}
