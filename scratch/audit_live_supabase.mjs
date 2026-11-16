const url = 'https://popypyunzkuyighdyjkc.supabase.co';
const key = 'sb_publishable_g5wGBHtlFR1Y7AtUj94_DQ_MSSn_CH7';

const tables = [
  'profiles',
  'companies',
  'time_entries',
  'profile_passwords',
  'user_credentials',
  'hosting_services',
  'taskflow_items',
  'taskflow_lists',
  'taskflow_postits',
  'audit_logs',
  'client_portal_access',
  'internal_work_files',
  'internal_file_versions',
  'client_deliverables',
  'client_briefings',
];

async function probe() {
  console.log('=== AUDITORIA LIVE SUPABASE TABLES ===');
  for (const t of tables) {
    try {
      const res = await fetch(`${url}/rest/v1/${t}?select=*&limit=1`, {
        headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact' }
      });
      const range = res.headers.get('content-range');
      const body = await res.text();
      console.log(`[${t}] HTTP ${res.status} | range=${range} | info=${res.status < 300 && body.startsWith('[') ? Object.keys(JSON.parse(body)[0] || {}).join(',') : body.slice(0, 120)}`);
    } catch (e) {
      console.log(`[${t}] ERR: ${e.message}`);
    }
  }
}

probe();