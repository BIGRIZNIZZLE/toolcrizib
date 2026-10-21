// Live sync test against the shared Supabase project with throwaway users (deleted at the end).
// ToolLog + AutoLog on the same origin and account: ToolLog rows are namespaced, AutoLog keeps them, nobody deletes the other's data.
const puppeteer = require('/workspace/autolog/tools/node_modules/puppeteer-core');
const A = require('/workspace/autolog/tools/sbadmin');
const ORIGIN = process.env.ORIGIN || 'http://127.0.0.1:8813';
const TL = ORIGIN + '/toollog/index.html', AL = ORIGIN + '/autolog/index.html';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-supabase-api-version, accept-profile, content-profile, prefer', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const r = {}, errors = [], users = [];
const check = (n, c, x) => { r[n] = c ? 'PASS' : 'FAIL' + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 300) : ''); };
async function signIn(p, email, api, hash) {
  await p.goto(p.url().split('#')[0] + hash); await sleep(400);
  await p.setRequestInterception(true); let otp = null;
  const h = q => { if (q.url().includes('/auth/v1/otp')) { if (q.method() === 'OPTIONS') return q.respond({ status: 204, headers: CORS, body: '' }); otp = { ...JSON.parse(q.postData() || '{}'), url: q.url() }; q.respond({ status: 200, contentType: 'application/json', headers: CORS, body: '{}' }); } else q.continue(); };
  p.on('request', h);
  await p.waitForSelector('[name="syncEmail"]', { timeout: 10000 }); await p.type('[name="syncEmail"]', email);
  await p.$eval('[data-sync-form="email"] button[type=submit]', e => e.click());
  await p.waitForSelector('[name="syncCode"]', { timeout: 15000 });
  p.off('request', h); await p.setRequestInterception(false);
  const link = await A.genLink(email); await p.type('[name="syncCode"]', link.email_otp || link.properties.email_otp);
  await p.$eval('[data-sync-form="code"] button[type=submit]', e => e.click());
  await waitIdle(p, api, 30000); return otp;
}
const waitIdle = async (p, api, ms = 20000) => { await p.waitForFunction(api => { const s = window[api].status(); return s.signedIn && s.state === 'idle' && s.pending === 0; }, { timeout: ms, polling: 250 }, api); await sleep(300); };
const syncNow = async (p, api) => { await p.evaluate(api => window[api].sync(), api); await sleep(300); await waitIdle(p, api); };
const rows = async uid => A.sql(`select kind, id, deleted, data->>'_vid' vid from public.records where user_id='${uid}' order by kind, id`);
async function newPage(ctx, label, url) {
  const p = await ctx.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true });
  p.on('console', m => { if (m.type() === 'error') errors.push(`[${label}] ${m.text()}`); }); p.on('pageerror', e => errors.push(`[${label} pageerror] ${e.message}`));
  await p.goto(url + '?nosplash', { waitUntil: 'networkidle0' }); await sleep(300); return p;
}
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const u = await A.createUser(`toollog-test-${Date.now()}@test.invalid`); users.push(u);
  const ctx = await b.createBrowserContext();   // one phone: both apps on the same origin
  // AutoLog first, with its own data, signed in
  const pa = await newPage(ctx, 'AutoLog', AL);
  await pa.$eval('[data-act="loadSample"]', e => e.click()); await sleep(400);
  const alBefore = await pa.evaluate(() => JSON.stringify(window.AutoLogApp.getDb().vehicles));
  await signIn(pa, u.email, 'AutoLogSync', '#/garage');
  const r0 = await rows(u.id); const alRows = r0.filter(x => !x.deleted).length;
  check('AutoLog pushed its rows', alRows > 5 && !r0.some(x => String(x.id).startsWith('tl:')), alRows);
  // ToolLog on the same phone: sample data, sign in (separate auth storage key)
  const pt = await newPage(ctx, 'ToolLog', TL);
  check('ToolLog not signed in by AutoLog session', !(await pt.evaluate(() => window.ToolLogSync.status().signedIn)));
  await pt.evaluate(() => document.querySelector('[data-act="sample"]').click()); await sleep(1500);
  const tlN = await pt.evaluate(() => { const d = window.ToolLogApp.getDb(); return d.items.length + d.kits.length + d.custom.length; });
  const otp = await signIn(pt, u.email, 'ToolLogSync', '#/more');
  check('ToolLog OTP request: email + redirect to toollog', otp && otp.email === u.email && /toollog/.test(decodeURIComponent(otp.url)), otp && decodeURIComponent(otp.url));
  const r1 = await rows(u.id); const tlRows = r1.filter(x => String(x.id).startsWith('tl:'));
  check('ToolLog pushed namespaced rows', tlRows.length === tlN && tlRows.every(x => x.kind === 'maint' && x.vid === '__toollog' && !x.deleted), { tlN, got: tlRows.length });
  check('AutoLog rows untouched by ToolLog', r1.filter(x => !String(x.id).startsWith('tl:') && !x.deleted).length === alRows);
  check('ToolLog local data unchanged after sync', (await pt.evaluate(() => { const d = window.ToolLogApp.getDb(); return d.items.length + d.kits.length + d.custom.length; })) === tlN);
  // AutoLog syncs again (pulls ToolLog rows): must keep them, not show them, not delete them
  await pa.bringToFront(); await pa.reload({ waitUntil: 'networkidle0' }); await sleep(500); await syncNow(pa, 'AutoLogSync');
  await pa.evaluate(() => { location.hash = '#/garage'; }); await sleep(300);
  const alAfter = await pa.evaluate(() => JSON.stringify(window.AutoLogApp.getDb().vehicles));
  check('AutoLog garage unchanged after pulling ToolLog rows', alAfter === alBefore);
  const orph = await pa.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('autolog:sync:orphans') || '{}')).filter(k => k.startsWith('maint/tl:')).length);
  check('AutoLog keeps ToolLog rows as orphans', orph === tlN, orph);
  const r2 = await rows(u.id);
  check('no ToolLog row deleted by AutoLog', r2.filter(x => String(x.id).startsWith('tl:') && !x.deleted).length === tlN);
  // ToolLog change + delete; AutoLog syncs; second ToolLog device gets the exact set
  await pt.bringToFront();
  const gone = await pt.evaluate(() => { const d = JSON.parse(JSON.stringify(window.ToolLogApp.getDb())); const x = d.items.find(i => !i.kitId); d.items = d.items.filter(i => i !== x); d.items[0].serial = 'EDITED-1'; d.items[0].updated = new Date().toISOString(); window.ToolLogApp.replaceDb(d); window.ToolLogSync.changed(); return x.id; });
  await sleep(2500); await waitIdle(pt, 'ToolLogSync');
  const r3 = await rows(u.id);
  check('ToolLog delete = tombstone', r3.some(x => x.id === 'tl:item:' + gone && x.deleted));
  await pa.bringToFront(); await syncNow(pa, 'AutoLogSync');
  check('AutoLog still fine after ToolLog delete', (await pa.evaluate(() => JSON.stringify(window.AutoLogApp.getDb().vehicles))) === alBefore);
  const ctx2 = await b.createBrowserContext(); const p2 = await newPage(ctx2, 'ToolLog-2', TL);
  await signIn(p2, u.email, 'ToolLogSync', '#/more');
  const d2 = await p2.evaluate(() => { const d = window.ToolLogApp.getDb(); return { n: d.items.length + d.kits.length + d.custom.length, edited: d.items.some(i => i.serial === 'EDITED-1'), vehicles: 'vehicles' in d }; });
  check('second device: ToolLog data arrives, no AutoLog data', d2.n === tlN - 1 && d2.edited && !d2.vehicles, d2);
  const r4 = await rows(u.id);
  check('final: AutoLog rows intact', r4.filter(x => !String(x.id).startsWith('tl:') && !x.deleted).length === alRows);
  check('final: ToolLog rows', r4.filter(x => String(x.id).startsWith('tl:') && !x.deleted).length === tlN - 1);
  r.counts = { autologRows: alRows, toollogRows: tlN };
  r.errors = errors.filter(e => !/Failed to load resource/.test(e));
  await b.close();
})().catch(e => { r.fatal = String(e && e.stack || e); }).finally(async () => {
  for (const x of users) { try { await A.deleteUser(x.id); } catch (e) { r['cleanup ' + x.email] = e.message; } }
  try { const left = await A.sql(`select count(*)::int n from public.records where user_id in (${users.map(x => `'${x.id}'`).join(',') || 'null'})`); r.rowsLeftAfterCleanup = left[0].n; const au = await A.sql(`select count(*)::int n from auth.users where email like 'toollog-test-%@test.invalid'`); r.testUsersLeft = au[0].n; } catch (e) { r.cleanupCheck = e.message; }
  console.log(JSON.stringify(r, null, 1)); process.exit(0);
});
