const url = 'https://popypyunzkuyighdyjkc.supabase.co';
const key = 'sb_publishable_g5wGBHtlFR1Y7AtUj94_DQ_MSSn_CH7';
async function testUpdate() {
  const res = await fetch(`${url}/rest/v1/profiles?id=eq.0dd46db9-a6fa-42f7-8e13-a85881cbbe11`, {
    method: 'PATCH',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ department: 'Test' })
  });
  console.log('UPDATE STATUS:', res.status, await res.text());
}
testUpdate();

