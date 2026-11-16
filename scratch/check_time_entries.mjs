const url = 'https://popypyunzkuyighdyjkc.supabase.co';
const key = 'sb_publishable_g5wGBHtlFR1Y7AtUj94_DQ_MSSn_CH7';
async function test() {
  const res = await fetch(`${url}/rest/v1/time_entries?select=id&limit=1`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  console.log('STATUS:', res.status, await res.text());
}
test();

