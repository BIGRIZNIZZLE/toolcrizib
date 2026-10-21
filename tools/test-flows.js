// End-to-end flows in Chrome (mobile viewport): sample data, catalog add (kit w/ pieces), price rule, views, CSV, print, migration
const puppeteer = require('/workspace/autolog/tools/node_modules/puppeteer-core');
const BASE = process.env.BASE || 'http://127.0.0.1:8813/toolcrizib/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/^Failed to load resource/.test(m.text())) errs.push(m.text()); }); p.on('response', r => { if (r.status() >= 400 && !/8813\/favicon/.test(r.url())) errs.push('HTTP ' + r.status() + ' ' + r.url()); });
  const dl = '/tmp/tl-dl'; require('fs').rmSync(dl, { recursive: true, force: true }); require('fs').mkdirSync(dl);
  const cdp = await b.target().createCDPSession(); await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dl });
  await p.goto(BASE + '?nosplash', { waitUntil: 'networkidle0' }); await p.evaluate(() => localStorage.clear());
  await p.goto(BASE + '?nosplash#/dash', { waitUntil: 'networkidle0' });
  await p.click('[data-act="sample"]'); await sleep(1500);
  const db = await p.evaluate(() => window.ToolLogApp.getDb());
  ok(db.items.length >= 15, 'sample loaded ' + db.items.length + ' items, ' + db.kits.length + ' kits');
  ok(db.items.every(i => i.model && i.src), 'every sample item has model + source URL');
  const kitPieces = db.items.filter(i => i.kitId); ok(kitPieces.length >= 4, 'kit pieces ' + kitPieces.length);
  const dash = await p.evaluate(() => document.querySelector('main').innerText);
  ok(/\$[\d,]+/.test(dash), 'dashboard shows value'); ok(/M18/.test(dash) && /ONE\+|18V/.test(dash), 'dashboard platforms');
  for (const g of ['brand', 'type', 'platform', 'location', 'kit']) {
    await p.evaluate(g => location.hash = '#/tools?g=' + g, g); await sleep(250);
    const n = await p.$$eval('main a.entry', a => a.length); ok(n > 0, 'inventory by ' + g + ': ' + n + ' rows');
  }
  await p.evaluate(() => location.hash = '#/power'); await sleep(300);
  const pw = await p.evaluate(() => document.querySelector('main').innerText); ok(/Ah/.test(pw) && /M18/.test(pw), 'battery platform view');
  // item detail
  const id = db.items.find(i => i.kind === 'battery').id; await p.evaluate(id => location.hash = '#/item/' + id, id); await sleep(300);
  ok(/Ah/.test(await p.evaluate(() => document.querySelector('main').innerText)), 'item detail');
  // add from catalog: search a RYOBI kit with includes
  await p.evaluate(() => location.hash = '#/tools'); await sleep(200);
  await p.evaluate(() => document.querySelector('[data-act="add"]').click()); await sleep(1200);
  await p.evaluate(() => document.querySelector('[data-pk="brand=Milwaukee"]').click()); await sleep(200);
  const qsel = await p.$('#picker input[type=search], #picker input'); await qsel.type('2691-22'); await sleep(500);
  const rows = await p.$$eval('#picker [data-cat]', r => r.map(x => x.dataset.cat)); ok(rows.includes('m:2691-22'), 'picker search finds 2691-22');
  await p.evaluate(() => document.querySelector('[data-cat="m:2691-22"]').click()); await sleep(600);
  const form = await p.evaluate(() => ({ t: document.querySelector('#sheetForm').innerText.slice(0, 600), inc: document.querySelectorAll('#sheetForm input[name^="inc_"]').length, kit: document.querySelector('#sheetForm [name=kitId]')?.value }));
  ok(form.inc >= 3 && form.kit === '__new', 'catalog kit prefill: ' + form.inc + ' include boxes, kitId=' + form.kit);
  // try saving without price -> must block
  await p.evaluate(() => { const f = document.querySelector('#sheetForm'); ['price', 'kitPrice'].forEach(k => { if (f.elements[k]) f.elements[k].value = ''; }); f.requestSubmit(); }); await sleep(400);
  ok(await p.evaluate(() => document.querySelector('#sheet').open), 'save blocked without price');
  await p.evaluate(() => { const f = document.querySelector('#sheetForm'); const el = f.elements.kitPrice || f.elements.price; el.value = '199'; el.dispatchEvent(new Event('input', { bubbles: true })); if (f.elements.serial) f.elements.serial.value = 'TEST-1'; f.requestSubmit(); }); await sleep(600);
  const db2 = await p.evaluate(() => window.ToolLogApp.getDb());
  const nk = db2.kits.find(k => k.model === '2691-22'); ok(!!nk, 'kit created');
  const pieces = db2.items.filter(i => nk && i.kitId === nk.id); ok(pieces.length >= 3 && !pieces.some(x => x.model === '2691-22'), 'kit pieces created (kit itself not double-counted): ' + pieces.map(x => x.model).join(','));
  // export CSV
  await p.evaluate(() => location.hash = '#/export'); await sleep(300);
  const csvBtn = await p.$('[data-act="csv"]'); ok(!!csvBtn, 'csv button'); await p.evaluate(() => { const o = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (this.download) { window.__dl = { name: this.download, href: this.href }; return; } return o.call(this); }; });
  if (csvBtn) { await p.evaluate(() => document.querySelector('[data-act="csv"]').click()); await sleep(500); }
  const got = await p.evaluate(async () => window.__dl && { name: window.__dl.name, text: new TextDecoder('utf-8', { ignoreBOM: true }).decode(await (await fetch(window.__dl.href)).arrayBuffer()) });
  ok(got && /\.csv$/.test(got.name), 'csv download ' + (got && got.name));
  if (got) { ok(/2606-20/.test(got.text) && /DEMO-1000/.test(got.text) && got.text.charCodeAt(0) === 0xfeff, 'csv content (BOM, serials, models)'); console.log(got.text.split('\n').slice(0, 3).join('\n')); }
  await p.evaluate(() => location.hash = '#/print'); await sleep(400);
  ok((await p.$$('main tr, .print-sheet tr')).length > 10, 'print list rows');
  // migration: old-shaped data keeps items
  await p.goto(BASE + 'manifest.json'); errs.length = 0; await p.evaluate(() => { localStorage.setItem('toollog:data:v1', JSON.stringify({ items: [{ id: 'x1', name: 'Old drill', brand: 'RYOBI' }] })); });
  await p.goto(BASE + '?nosplash#/tools', { waitUntil: 'networkidle0' }); await sleep(300);
  const db3 = await p.evaluate(() => window.ToolLogApp.getDb()); ok(db3.items.length === 1 && db3.version && Array.isArray(db3.kits), 'migration keeps old item');
  ok(errs.length === 0, 'no console errors ' + JSON.stringify(errs));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
