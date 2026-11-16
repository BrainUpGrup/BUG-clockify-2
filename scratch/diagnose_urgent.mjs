import fs from 'fs';

const envText = fs.readFileSync('.env.local', 'utf8');
const env = {};
envText.split('\n').forEach(l => {
  const t = l.trim();
  if (t && !t.startsWith('#') && t.includes('=')) {
    const idx = t.indexOf('=');
    env[t.slice(0, idx).trim()] = t.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
  }
});

const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function diagnose() {
  console.log('=== DIAGNÓSTICO URGENTE DE FALLOS ===\n');

  // 1. Probar inserción en time_entries con usuario Montse
  const testEntry = {
    user_id: '755e8812-8e22-43f1-ac6f-f41ce5451fcf',
    company_id: 'a459d042-797f-42b3-aa5f-501990cb1b3f',
    work_date: '2026-11-16',
    duration_minutes: 5,
    description: 'DIAGNOSTIC_TEST'
  };

  const resTime = await fetch(`${baseUrl}/rest/v1/time_entries`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify(testEntry)
  });
  console.log('1. TEST INSERT TIME_ENTRIES:', resTime.status, await resTime.text());

  // 2. Probar authenticate_employee con usuarios conocidos
  const testUsers = [
    { email: 'appadmin@brainupgrup.com', pass: '123456' },
    { email: 'montse@brainupgrup.com', pass: 'cordinadora2026' },
    { email: 'montse@brainupgrup.com', pass: 'montse2026' },
    { email: 'lidia@brainupgrup.com', pass: 'lidia2026' },
    { email: 'peipito@gmail.com', pass: 'gerard2026' },
    { email: 'cristina@brainupgrup.com', pass: 'cristina2026' }
  ];

  for (const u of testUsers) {
    const resAuth = await fetch(`${baseUrl}/rest/v1/rpc/authenticate_employee`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ p_email: u.email, p_password: u.pass })
    });
    const authData = await resAuth.json();
    console.log(`2. AUTH [${u.email}] with '${u.pass}':`, resAuth.status, JSON.stringify(authData));
  }

  // 3. Consultar profiles
  const resProfiles = await fetch(`${baseUrl}/rest/v1/profiles?select=id,email,full_name,role,status,password_configured`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`
    }
  });
  console.log('3. PROFILES STATUS:', resProfiles.status, await resProfiles.json());
}

diagnose();

