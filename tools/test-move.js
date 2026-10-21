// Rename check: an installed ToolLog (old /toollog/ app + its service worker + signed in) lands on /toolcrizib/
// with the same data and session, and the old worker/cache are retired. SWAP is a shell command that replaces /toollog/ with the redirect site.
const puppeteer = require('/workspace/autolog/tools/node_modules/puppeteer-core');
const A = require('/workspace/autolog/tools/sbadmin');
const { execSync } = require('child_process');
const ORIGIN = process.env.ORIGIN || 'http://127.0.0.1:8814';
const SWAP = process.env.SWAP || 'ln -sfn /workspace/toollog-redirect /tmp/mig/toollog';
const UNSWAP = process.env.UNSWAP || 'ln -sfn /tmp/mig/old /tmp/mig/toollog';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-supabase-api-version, accept-profile, content-profile, prefer', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const sleep = ms => new Promise(r => setTimeout(r, ms)); const r = {}, errors = [], users = [];
const check = (n, c, x) => { r[n] = c ? 'PASS' : 'FAIL' + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 300) : ''); };
(async () => {
  execSync(UNSWAP);
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await b.createBrowserContext(); const p = await ctx.newPage(); await p.setViewport({ width: 390, height: 844, isMobile: true });
  p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await p.goto(ORIGIN + '/toollog/index.html?nosplash', { waitUntil: 'networkidle0' });
  await p.evaluate(() => document.querySelector('[data-act="sample"]').click()); await sleep(1500);
  await p.evaluate(() => navigator.serviceWorker.ready); await p.reload({ waitUntil: 'networkidle0' }); await sleep(400);
  check('old app installed + controlled by /toollog/ SW', await p.evaluate(() => !!navigator.serviceWorker.controller && navigator.serviceWorker.controller.scriptURL.includes('/toollog/sw.js')));
  // sign in on the old app
  const u = await A.createUser(`toollog-test-mv-${Date.now()}@test.invalid`); users.push(u);
  await p.goto(ORIGIN + '/toollog/index.html?nosplash#/more'); await sleep(500);
  await p.setRequestInterception(true);
  const h = q => { if (q.url().includes('/auth/v1/otp')) { if (q.method() === 'OPTIONS') return q.respond({ status: 204, headers: CORS, body: '' }); q.respond({ status: 200, contentType: 'application/json', headers: CORS, body: '{}' }); } else q.continue(); };
  p.on('request', h); await p.type('[name="syncEmail"]', u.email); await p.$eval('[data-sync-form="email"] button[type=submit]', e => e.click());
  await p.waitForSelector('[name="syncCode"]', { timeout: 15000 }); p.off('request', h); await p.setRequestInterception(false);
  const link = await A.genLink(u.email); await p.type('[name="syncCode"]', link.email_otp || link.properties.email_otp);
  await p.$eval('[data-sync-form="code"] button[type=submit]', e => e.click());
  await p.waitForFunction(() => { const s = window.ToolLogSync.status(); return s.signedIn && s.state === 'idle' && s.pending === 0; }, { timeout: 30000, polling: 250 });
  const before = await p.evaluate(() => ({ keys: Object.keys(localStorage).filter(k => /toollog/.test(k)).sort(), n: window.ToolLogApp.getDb().items.length, data: localStorage.getItem('toollog:data:v1').length }));
  // the move: /toollog/ becomes the redirect site
  execSync(SWAP);
  await p.goto(ORIGIN + '/toollog/index.html', { waitUntil: 'networkidle0' }).catch(() => {}); // what a home-screen icon opens
  await p.waitForFunction(() => location.pathname.startsWith('/toolcrizib/'), { timeout: 15000 }).catch(() => {});
  await sleep(2500);
  check('home-screen start URL lands on /toolcrizib/', new URL(p.url()).pathname === '/toolcrizib/', p.url());
  const after = await p.evaluate(() => ({ keys: Object.keys(localStorage).filter(k => /toollog/.test(k)).sort(), n: window.ToolLogApp && window.ToolLogApp.getDb().items.length, signed: window.ToolLogSync && window.ToolLogSync.status().signedIn, title: document.title, regs: null }));
  check('same data after the move', after.n === before.n && after.n > 0, { before: before.n, after: after.n });
  check('storage keys kept (no migration)', before.keys.every(k => after.keys.includes(k)), { before: before.keys, after: after.keys });
  check('still signed in on Tool Crizib', after.signed === true);
  check('new name shown', /Tool Crizib/.test(after.title), after.title);
  const sw = await p.evaluate(async () => ({ regs: (await navigator.serviceWorker.getRegistrations()).map(x => new URL(x.scope).pathname), caches: await caches.keys() }));
  check('old /toollog/ worker retired', !sw.regs.includes('/toollog/'), sw.regs);
  check('old cache removed, new cache present', !sw.caches.includes('toollog-v1') && sw.caches.includes('toolcrizib-v2'), sw.caches);
  for (const [from, to] of [['/toollog/join/', '/toolcrizib/join/'], ['/toollog/?join=1', '/toolcrizib/'], ['/toollog/#/power', '/toolcrizib/#/power'], ['/toollog/', '/toolcrizib/']]) {
    const q = await ctx.newPage(); await q.goto(ORIGIN + from).catch(() => {}); await q.waitForFunction(() => location.pathname.startsWith('/toolcrizib/'), { timeout: 10000 }).catch(() => {});
    const got = new URL(q.url()); if (!got.pathname.startsWith('/toolcrizib/')) r['dbg ' + from] = await q.evaluate(() => document.title + ' | ' + (navigator.serviceWorker.controller && navigator.serviceWorker.controller.scriptURL)); check(`${from} → ${to}`, (got.pathname + got.hash) === to.replace('?join=1', ''), q.url()); await q.close();
  }
  await p.evaluate(() => window.ToolLogSync.sync()); await sleep(1500);
  check('sync still works after move', await p.evaluate(() => { const s = window.ToolLogSync.status(); return s.signedIn && !s.error; }));
  r.errors = errors; await b.close();
})().catch(e => { r.fatal = String(e && e.stack || e); }).finally(async () => {
  try { execSync(UNSWAP); } catch (e) { /* ignore */ }
  for (const x of users) { try { await A.deleteUser(x.id); } catch (e) { r['cleanup ' + x.email] = e.message; } }
  try { const left = await A.sql(`select count(*)::int n from public.records where user_id in (${users.map(x => `'${x.id}'`).join(',') || 'null'})`); r.rowsLeftAfterCleanup = left[0].n; } catch (e) { r.cleanupCheck = e.message; }
  console.log(JSON.stringify(r, null, 1)); process.exit(0);
});
