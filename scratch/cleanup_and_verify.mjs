const url = 'https://popypyunzkuyighdyjkc.supabase.co';
const key = 'sb_publishable_g5wGBHtlFR1Y7AtUj94_DQ_MSSn_CH7';

async function cleanupAndVerify() {
  // 1. Delete the DIAGNOSTIC_TEST entry
  const delRes = await fetch(`${url}/rest/v1/time_entries?id=eq.355181f4-87fb-4727-afb8-1780d80b650f`, {
    method: 'DELETE',
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Prefer': 'return=representation' }
  });
  console.log('CLEANUP DIAGNOSTIC_TEST:', delRes.status, await delRes.text());

  // 2. Verify remaining logins
  const checks = [
    ['montse@brainupgrup.com', 'coordinadora2026'],
    ['cristina@brainupgrup.com', 'Entrada1%'],
    ['peipito@gmail.com', '123456'],
    ['valeria@brainupgrup.com', 'Elefantes26'],
    ['albert@brainupgrup.com', '12345678'],
    ['malgari@brainupgrup.com', 'malgari2026']
  ];
  for (const [email, pass] of checks) {
    const res = await fetch(`${url}/rest/v1/rpc/authenticate_employee`, {
      method: 'POST',
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_email: email, p_password: pass })
    });
    const d = await res.json();
    console.log(email, pass, '=>', d.success ? 'SUCCESS' : d.error);
  }
}

cleanupAndVerify();

