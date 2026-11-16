async function checkProd() {
  const paths = ['/', '/login', '/hub', '/apps/archivos', '/api/database/status', '/api/audit/logs', '/api/files-hub/internal'];
  for (const p of paths) {
    try {
      const res = await fetch(`https://bugclockify.iaiahub.com${p}`, { redirect: 'manual' });
      const text = await res.text();
      console.log(`[PROD ${p}] HTTP ${res.status} | loc=${res.headers.get('location') || '-'} | len=${text.length} | head=${text.slice(0, 100).replace(/\s+/g, ' ')}`);
    } catch (e) {
      console.log(`[PROD ${p}] ERR: ${e.message}`);
    }
  }
}
checkProd();

