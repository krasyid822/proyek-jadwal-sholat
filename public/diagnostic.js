async function runFullDiagnostic() {
  const clientResults = await runNotificationDiagnostic(); // fungsi existing-mu
  let serverResults = { envStatus: '—', dbStatus: '—', pushStatus: '—' };

  try {
    const res = await fetch('/api/full-diagnostic');
    const json = await res.json();
    serverResults = json;
  } catch {
    serverResults = { envStatus: '❌ Server error', dbStatus: '❌', pushStatus: '❌' };
  }

  renderFullDashboard(clientResults, serverResults);
}

function renderFullDashboard(client, server) {
  const allResults = {
    ...client,
    'ENV Status (Server)': server.envStatus,
    'DB Status': server.dbStatus,
    'Push Endpoint Status': server.pushStatus
  };

  const statusColor = (val) => {
    if (String(val).startsWith('✅')) return 'green';
    if (String(val).startsWith('⚠️')) return 'orange';
    return 'red';
  };

  const rows = Object.entries(allResults).map(([key, val]) => `
    <tr>
      <td style="padding:4px 8px; font-weight:bold;">${key}</td>
      <td style="padding:4px 8px; color:${statusColor(val)};">${val || '—'}</td>
    </tr>
  `).join('');

  const html = `
    <h3>📊 Dashboard Diagnostik Lengkap</h3>
    <table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse; min-width:350px;">
      <thead style="background:#f4f4f4;">
        <tr><th>Komponen</th><th>Status</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  document.getElementById('diagnostic-output').innerHTML = html;
}
