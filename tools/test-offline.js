// Service worker: installs, app shell + catalog work offline, caches are toollog-only (AutoLog's untouched on the same origin)
const puppeteer = require('/workspace/autolog/tools/node_modules/puppeteer-core');
const BASE = process.env.BASE || 'http://127.0.0.1:8813/toollog/';
const sleep = ms => new Promise(r => setTimeout(r, ms)); const r = {};
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + '?nosplash', { waitUntil: 'networkidle0' });
  await p.evaluate(async () => { await caches.open('autolog-v99-sentinel').then(c => c.put('/autolog/x', new Response('x'))); });
  await p.evaluate(() => navigator.serviceWorker.ready); await sleep(800);
  await p.evaluate(() => window.ToolLogApp.loadCatalog()); await sleep(500);
  await p.reload({ waitUntil: 'networkidle0' }); await sleep(500);
  r.controlled = await p.evaluate(() => !!navigator.serviceWorker.controller);
  r.scope = await p.evaluate(async () => (await navigator.serviceWorker.getRegistration()).scope);
  await p.setOfflineMode(true);
  await p.goto(BASE + '?nosplash#/dash', { waitUntil: 'load' }); await sleep(600);
  r.offlineShell = await p.evaluate(() => !!document.querySelector('main') && document.body.innerText.includes('ToolLog'));
  r.offlineCatalog = await p.evaluate(async () => { try { const c = await window.ToolLogApp.loadCatalog(); return (c.items || c).length; } catch (e) { return 'ERR ' + e.message; } });
  await p.setOfflineMode(false);
  r.caches = await p.evaluate(() => caches.keys());
  r.autologCacheKept = r.caches.includes('autolog-v99-sentinel');
  await p.evaluate(() => caches.delete('autolog-v99-sentinel'));
  r.errors = errs; console.log(JSON.stringify(r, null, 1)); await b.close();
})();
