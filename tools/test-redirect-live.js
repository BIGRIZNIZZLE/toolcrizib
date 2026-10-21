// Live: old /toollog/ links reach /toolcrizib/ (path, query, hash kept); a real sign-up link from Supabase redirects to /toolcrizib/.
const puppeteer = require('/workspace/autolog/tools/node_modules/puppeteer-core');
const A = require('/workspace/autolog/tools/sbadmin');
const O = 'https://bigriznizzle.github.io';
const r = {}, errors = [], users = []; const sleep = ms => new Promise(x => setTimeout(x, ms));
const check = (n, c, x) => { r[n] = c ? 'PASS' : 'FAIL' + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 300) : ''); };
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  for (const [from, to] of [['/toollog/', '/toolcrizib/'], ['/toollog/index.html', '/toolcrizib/'], ['/toollog/join/', '/toolcrizib/join/'], ['/toollog/?join=1', '/toolcrizib/'], ['/toollog/#/power', '/toolcrizib/#/power'], ['/toollog/join/index.html', '/toolcrizib/join/index.html']]) {
    const ctx = await b.createBrowserContext(); const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(from + ' ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(from + ' ' + m.text()); });
    await p.goto(O + from).catch(() => {}); await p.waitForFunction(() => location.pathname.startsWith('/toolcrizib/'), { timeout: 15000 }).catch(() => {}); await sleep(1500);
    const u = new URL(p.url()); check(`${from} → ${to}`, u.pathname + u.hash === to && /Tool Crizib/.test(await p.title()), p.url());
    await ctx.close();
  }
  // deep unknown path → 404.html → app root path kept
  { const p = await b.newPage(); await p.goto(O + '/toollog/old/deep/link').catch(() => {}); await p.waitForFunction(() => location.pathname.startsWith('/toolcrizib/'), { timeout: 15000 }).catch(() => {}); check('/toollog/old/deep/link → /toolcrizib/old/deep/link', new URL(p.url()).pathname === '/toolcrizib/old/deep/link', p.url()); await p.close(); }
  // the redirect page's link preview shows the new name
  const html = await (await fetch(O + '/toollog/join/')).text();
  check('old /toollog/join/ preview = Tool Crizib OG', /og:title" content="Get Tool Crizib/.test(html) && /og-toolcrizib\.jpg/.test(html));
  await b.close();
  // a real sign-up through Supabase: the emailed link (generated, not sent) must redirect to /toolcrizib/
  const email = `toollog-test-su-${Date.now()}@test.invalid`;
  const pw = require('crypto').randomBytes(24).toString('base64url');
  const g = await A.admin('POST', '/auth/v1/admin/generate_link', { type: 'signup', email, password: pw, redirect_to: O + '/toolcrizib/' });
  users.push({ id: g.id || (g.user && g.user.id), email });
  const link = g.action_link || g.properties.action_link;
  const res = await fetch(link, { redirect: 'manual' }); const loc = res.headers.get('location') || '';
  check('sign-up link redirects to /toolcrizib/', res.status >= 300 && res.status < 400 && loc.startsWith(O + '/toolcrizib/') && /access_token=|code=/.test(loc), { status: res.status, to: loc.split('#')[0] });
  r.signupRedirect = loc.split('#')[0] + (loc.includes('#') ? '#…(tokens)' : '');
  // contrast: a URL that's not on the allow-list falls back to the Site URL (AutoLog)
  const email2 = `toollog-test-su2-${Date.now()}@test.invalid`;
  const g2 = await A.admin('POST', '/auth/v1/admin/generate_link', { type: 'signup', email: email2, password: pw, redirect_to: 'https://example.com/not-allowed/' });
  users.push({ id: g2.id || (g2.user && g2.user.id), email: email2 });
  const res2 = await fetch(g2.action_link || g2.properties.action_link, { redirect: 'manual' }); const loc2 = res2.headers.get('location') || '';
  check('control: an unlisted other-domain URL falls back to the Site URL', loc2.startsWith(O + '/autolog/'), loc2.split('#')[0]);
  r.errors = errors;
})().catch(e => { r.fatal = String(e && e.stack || e); }).finally(async () => {
  try { for (const x of await A.sql(`select id::text, email from auth.users where email like 'toollog-test-%@test.invalid'`)) if (!users.find(u => u.id === x.id)) users.push(x); } catch (e) { r.cleanupList = e.message; }
  for (const x of users) { try { if (x.id) await A.deleteUser(x.id); } catch (e) { r['cleanup ' + x.email] = e.message; } }
  try { const ids = users.filter(x => x.id).map(x => `'${x.id}'`).join(',') || 'null'; r.rowsLeftAfterCleanup = (await A.sql(`select count(*)::int n from public.records where user_id in (${ids})`))[0].n; r.testUsersLeft = (await A.sql(`select count(*)::int n from auth.users where email like 'toollog-test-%@test.invalid'`))[0].n; } catch (e) { r.cleanupCheck = e.message; }
  console.log(JSON.stringify(r, null, 1)); process.exit(0);
});
