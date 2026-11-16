const url = 'https://popypyunzkuyighdyjkc.supabase.co';
const key = 'sb_publishable_g5wGBHtlFR1Y7AtUj94_DQ_MSSn_CH7';

async function test(email, pass) {
  const res = await fetch(`${url}/rest/v1/rpc/authenticate_employee`, {
    method: 'POST',
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_email: email, p_password: pass })
  });
  const data = await res.json();
  console.log(email, pass, '=>', data.success ? 'SUCCESS' : data.error);
}

async function run() {
  await test('cristina@brainupgrup.com', 'eNTRADA1%');
  await test('cristina@brainupgrup.com', 'cristina2026');
  await test('cristina@brainupgrup.com', '123456');
  await test('peipito@gmail.com', '123456');
  await test('peipito@gmail.com', 'gerard2026');
  await test('valeria@brainupgrup.com', 'Elefantes26');
  await test('albert@brainupgrup.com', '12345678');
  await test('malgari@brainupgrup.com', 'malgari2026');
  await test('malgari@brainupgrup.com', '123456');
}

run();

