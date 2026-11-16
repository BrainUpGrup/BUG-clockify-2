const url = 'https://popypyunzkuyighdyjkc.supabase.co';
const key = 'sb_publishable_g5wGBHtlFR1Y7AtUj94_DQ_MSSn_CH7';

async function run() {
  console.log('=== VERIFICACION LIVE POST-SELLADO ===\n');

  // 1. Verificar cierre de profile_passwords
  const pwRes = await fetch(`${url}/rest/v1/profile_passwords?select=*`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  console.log('1. GET /rest/v1/profile_passwords:', pwRes.status, await pwRes.text());

  // 2. Verificar SELECT * en profiles y cero contraseñas expuestas
  const profRes = await fetch(`${url}/rest/v1/profiles?select=*`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  const profs = await profRes.json();
  const leaked = Array.isArray(profs) ? profs.filter(p => p.custom_password || p.temp_password) : [];
  console.log('2. GET /rest/v1/profiles?select=*:', profRes.status, `| rows=${Array.isArray(profs) ? profs.length : 'ERR'} | leaked=${leaked.length}`);

  // 3. Verificar todas las contraseñas en authenticate_employee
  const creds = [
    ['appadmin@brainupgrup.com', '123456'],
    ['montse@brainupgrup.com', 'cordinadora2026'],
    ['montse@brainupgrup.com', 'coordinadora2026'],
    ['lidia@brainupgrup.com', 'lidia2026'],
    ['peipito@gmail.com', '123456'],
    ['cristina@brainupgrup.com', 'Entrada1%'],
    ['valeria@brainupgrup.com', 'Elefantes26'],
    ['albert@brainupgrup.com', '12345678'],
    ['malgari@brainupgrup.com', 'malgari2026']
  ];
  console.log('3. AUTH CHECKS:');
  for (const [email, pass] of creds) {
    const r = await fetch(`${url}/rest/v1/rpc/authenticate_employee`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_email: email, p_password: pass })
    });
    const d = await r.json();
    console.log(`   - ${email} => ${r.status} ${d.success ? 'SUCCESS' : d.error}`);
  }

  // 4. Verificar INSERT y DELETE en time_entries
  const insRes = await fetch(`${url}/rest/v1/time_entries`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify({
      user_id: '755e8812-8e22-43f1-ac6f-f41ce5451fcf',
      company_id: 'a459d042-797f-42b3-aa5f-501990cb1b3f',
      work_date: '2026-11-16',
      duration_minutes: 1,
      description: 'VERIFY_SEAL_TEST'
    })
  });
  const insText = await insRes.text();
  console.log('4. INSERT time_entries:', insRes.status, insText.slice(0, 120));
  if (insRes.status === 201) {
    const created = JSON.parse(insText)[0];
    const delRes = await fetch(`${url}/rest/v1/time_entries?id=eq.${created.id}`, {
      method: 'DELETE',
      headers: { apikey: key, Authorization: `Bearer ${key}` }
    });
    console.log('5. CLEANUP test time_entry:', delRes.status);
  }
}

run().catch(console.error);
