async function run() {
  const html = await fetch('https://bugclockify.iaiahub.com/login').then(r => r.text());
  const matches = [...html.matchAll(/\/_next\/static\/chunks\/[^"']+\.js/g)].map(m => m[0]);
  console.log('Chunks:', matches.length);
  for (const chunk of matches) {
    const js = await fetch('https://bugclockify.iaiahub.com' + chunk).then(r => r.text());
    const urls = js.match(/https:\/\/[a-z0-9-]+\.supabase\.co/g);
    const urls2 = js.match(/https:\/\/[a-z0-9.-]*supabase[a-z0-9.-]*/g);
    if (urls || urls2) {
      console.log(chunk, '=>', [...new Set([...(urls || []), ...(urls2 || [])])]);
    }
  }
}
run().catch(console.error);

