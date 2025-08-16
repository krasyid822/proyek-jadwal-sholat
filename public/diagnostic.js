// diagnostic.js

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

  // 1. Permission
  if (Notification.permission !== 'granted') {
    alert('Notifikasi belum diizinkan.');
    return results;
  }

  // 2. Service Worker + Subscription
  if ('serviceWorker' in navigator) {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) {
      results.serviceWorker = '✅ Registered';
      results.swVersion = reg.active?.scriptURL || '—';
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        results.subscription = '✅ Subscribed';
        results.endpoint = sub.endpoint;
      }
    }
  }

  // 3. Server time check
  try {
    const resTime = await fetch('/api/time');
    const jsonTime = await resTime.json();
    results.serverTime = jsonTime?.serverTime || '⚠️ Invalid response';
  } catch {
    results.serverTime = '❌ Server error';
  }

  // 4. Test endpoint
  try {
    const resTest = await fetch('/api/test');
    const jsonTest = await resTest.json();
    results.testResponse = jsonTest?.status === 'ok' ? '✅ Server responded' : '⚠️ Unexpected response';
    results.testTag = jsonTest?.tag || '—';
  } catch {
    results.testResponse = '❌ Server error';
  }

  // 5. Asset checks
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

  return results;
}

async function runFullDiagnostic() {
  const clientResults = await runNotificationDiagnostic();

  let serverResults = { envStatus: '—', dbStatus: '—', pushStatus: '—' };
  try {
    const res = await fetch('/api/full-diagnostic');
    serverResults = await res.json();
  } catch {
    serverResults = { envStatus: '❌ Server error', dbStatus: '❌', pushStatus: '❌' };
  }

  const allResults = {
    ...clientResults,
    'ENV Status (Server)': serverResults.envStatus,
    'DB Status': serverResults.dbStatus,
    'Push Endpoint Status': serverResults.pushStatus
  };

  renderFullDashboard(allResults);
}

function renderFullDashboard(results) {
  const statusColor = (val) => {
    if (String(val).startsWith('✅')) return 'green';
    if (String(val).startsWith('⚠️')) return 'orange';
    return 'red';
  };

  const rows = Object.entries(results).map(([key, val]) => `
    <tr>
      <td style="padding:4px 8px; font-weight:bold;">${key}</td>
      <td style="padding:4px 8px; color:${statusColor(String(val))};">${val || '—'}</td>
    </tr>
  `).join('');

  document.getElementById('diagnostic-output').innerHTML = `
    <h3>📊 Dashboard Diagnostik Lengkap</h3>
    <table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse; min-width:350px;">
      <thead style="background:#f4f4f4;">
        <tr><th>Komponen</th><th>Status</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}
