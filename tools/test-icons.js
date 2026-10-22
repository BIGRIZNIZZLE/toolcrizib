// Comic icons + photo thumbnails: assets, mapping, fallbacks, brand/battery badges, camera button, snap prompt, URL lifecycle, offline cache
const puppeteer = require('/workspace/autolog/tools/node_modules/puppeteer-core');
const fs = require('fs'), path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8813/toolcrizib/';
const PHOTO = process.env.PHOTO || '/workspace/shots-fixtures/drill.jpg';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('response', r => { if (r.status() >= 400 && !/favicon/.test(r.url())) errs.push('HTTP ' + r.status() + ' ' + r.url()); });
  await p.goto(BASE + '?nosplash', { waitUntil: 'networkidle0' }); await p.evaluate(() => { localStorage.clear(); });
  await p.goto(BASE + '?nosplash#/dash', { waitUntil: 'networkidle0' });
  const keys = await p.evaluate(() => window.ToolLogApp.CI_KEYS); ok(keys.length === 32, 'icon categories: ' + keys.length);
  const sizes = await p.evaluate(async ks => Promise.all(ks.map(async k => { const r = await fetch('icons/comic/' + k + '.webp', { cache: 'no-store' }); const bl = await r.blob(); return [k, r.status, bl.size, bl.type]; })), keys);
  ok(sizes.every(s => s[1] === 200 && s[3] === 'image/webp'), 'all 32 icons served as WebP');
  ok(sizes.every(s => s[2] <= 15000), 'every icon ≤15 KB (max ' + Math.max(...sizes.map(s => s[2])) + ' B)');
  // every catalog type maps to a real icon
  const map = await p.evaluate(() => { const A = window.ToolLogApp, T = window.TL_TAX.TYPES; return T.map(t => [t, A.iconKey({ type: t, kind: t === 'Battery' ? 'battery' : t === 'Charger / power' ? 'charger' : 'tool' })]); });
  ok(map.every(([, k]) => keys.includes(k)), 'all ' + map.length + ' catalog types map to an icon');
  ok(new Set(map.map(m => m[1])).size >= 25, 'types spread over ' + new Set(map.map(m => m[1])).size + ' icons');
  const ov = await p.evaluate(() => { const f = window.ToolLogApp.iconKey; return [f({ type: 'Other tool', name: 'ONE+ Hedge Trimmer' }), f({ type: 'Specialty tool', name: '18V Heat Gun' }), f({ type: 'Specialty tool', name: 'Glue Gun' }), f({ type: 'Comfort / audio / heated', name: 'Hybrid Fan' }), f({ type: 'Comfort / audio / heated', name: 'Bluetooth Speaker' }), f({ type: 'Other tool', name: 'Rotary Tool' })]; });
  ok(ov.join() === 'hedge,heatgun,gluegun,fan,radio,rotary', 'name overrides: ' + ov.join());
  await p.click('[data-act="sample"]'); await sleep(1500);
  await p.evaluate(() => location.hash = '#/tools?g=brand'); await sleep(400);
  const lst = await p.evaluate(() => { const rows = [...document.querySelectorAll('main a.entry')]; return { rows: rows.length, ic: rows.filter(r => r.querySelector('.cicon img[src^="icons/comic/"]')).length, alt: [...document.querySelectorAll('main .cicon img')].every(i => /^Comic icon: /.test(i.alt)), lazy: [...document.querySelectorAll('main .cicon img')].every(i => i.loading === 'lazy'), brands: [...new Set([...document.querySelectorAll('main .cicon')].map(c => [...c.classList].find(x => x.startsWith('br-'))))].sort(), bat: [...document.querySelectorAll('main .v-badge')].map(x => x.textContent).slice(0, 3), loaded: [...document.querySelectorAll('main .cicon img')].slice(0, 4).every(i => i.complete && i.naturalWidth > 0) }; });
  ok(lst.rows > 10 && lst.ic === lst.rows, 'by-brand: ' + lst.ic + '/' + lst.rows + ' rows fall back to a comic icon');
  ok(lst.alt && lst.lazy && lst.loaded, 'icon alt text + lazy + visible ones decoded');
  ok(lst.brands.includes('br-ryobi') && lst.brands.includes('br-milwaukee'), 'brand tags: ' + lst.brands.join(' '));
  ok(lst.bat.length && lst.bat.every(t => /\d+V.*\d+(\.\d)?Ah/.test(t)), 'battery V/Ah badges: ' + lst.bat.join(' | '));
  const tagCol = await p.evaluate(() => [...['ryobi', 'milwaukee']].map(b => getComputedStyle(document.querySelector('.br-' + b + ' .br-tag')).backgroundImage));
  ok(/198, 217, 43/.test(tagCol[0]) && /212, 38, 47/.test(tagCol[1]), 'RYOBI green / Milwaukee red tags in CSS');
  // every place a thumbnail shows
  for (const [h, sel] of [['#/dash', 'main .cicon'], ['#/power', 'main .tool-chip .cicon'], ['#/print', '.ps-ph .cicon']]) { await p.evaluate(h => location.hash = h, h); await sleep(350); const n = await p.$$eval(sel, x => x.length); ok(n > 0, h + ' shows comic fallbacks: ' + n); }
  const db = await p.evaluate(() => window.ToolLogApp.getDb()); const kit = db.kits[0];
  await p.evaluate(id => location.hash = '#/kit/' + id, kit.id); await sleep(300); ok((await p.$$eval('main .entry .cicon', x => x.length)) > 0, 'kit pieces show icons');
  // picker rows
  await p.evaluate(() => location.hash = '#/tools'); await sleep(200);
  await p.evaluate(() => document.querySelector('[data-act="add"]').click()); await sleep(1200);
  await p.evaluate(() => document.querySelector('[data-pk="brand=Milwaukee"]').click()); await sleep(200);
  const q = await p.$('#picker input[type=search], #picker input'); await q.type('2767-20'); await sleep(500);
  ok((await p.$$eval('#picker .prow .cicon img', x => x.length)) > 0, 'catalog search results show comic icons');
  await p.evaluate(() => document.querySelector('#picker [data-cat]').click()); await sleep(700);
  await p.evaluate(() => { const f = document.querySelector('#sheetForm'); f.elements.price.value = '249'; f.elements.price.dispatchEvent(new Event('input', { bubbles: true })); f.requestSubmit(); }); await sleep(900);
  const after = await p.evaluate(() => ({ h: location.hash, snap: !!document.querySelector('.snap-prompt [data-act="addPhoto"]'), cam: !!document.querySelector('.cam-btn[data-act="addPhoto"]'), hero: !!document.querySelector('.hero-ic img') }));
  ok(/#\/item\//.test(after.h) && after.snap, '“Snap a photo” prompt right after adding');
  ok(after.cam && after.hero, 'camera button + big comic icon on item detail');
  const newId = after.h.split('/')[2];
  const [fc] = await Promise.all([p.waitForFileChooser(), p.click('.snap-prompt [data-act="addPhoto"]')]); await fc.accept([PHOTO]); await sleep(2000);
  const it = await p.evaluate(id => window.ToolLogApp.getDb().items.find(i => i.id === id), newId);
  ok(it.photos && it.photos.length === 1, 'photo saved on the item');
  const det = await p.evaluate(() => ({ snap: !!document.querySelector('.snap-prompt'), big: document.querySelector('.ph.big img')?.src || '' }));
  ok(!det.snap && det.big.startsWith('blob:'), 'prompt gone, photo shown');
  const rec = await p.evaluate(async id => { const r = await window.ToolLogApp.Photos.get(id); return { full: r.full.size, thumb: r.thumb.size }; }, it.photos[0]);
  ok(rec.thumb < 60000 && rec.full < 600000, 'photo compressed: thumb ' + rec.thumb + ' B, full ' + rec.full + ' B (source ' + fs.statSync(PHOTO).size + ' B)');
  await p.evaluate(() => location.hash = '#/tools?g=brand'); await sleep(600);
  await p.evaluate(id => document.querySelector(`main a.entry[href="#/item/${id}"]`)?.scrollIntoView({ block: 'center' }), newId); await sleep(700);
  const row = await p.evaluate(id => { const a = document.querySelector(`main a.entry[href="#/item/${id}"]`); const im = a && a.querySelector('.ph img'); return im ? { src: im.src.slice(0, 5), alt: im.alt, tag: !!a.querySelector('.ph .br-tag') } : null; }, newId);
  ok(row && row.src === 'blob:' && /^Photo of /.test(row.alt) && row.tag, 'list thumbnail is the photo (with brand tag)');
  const urls = await p.evaluate(() => window.ToolLogApp.Photos.urlCount); ok(urls === 1, 'full-size object URL revoked after leaving detail; only the thumb stays cached (' + urls + ')');
  // offline cache has the icons
  const sw = await p.evaluate(async () => { await navigator.serviceWorker.ready; await new Promise(r => setTimeout(r, 1500)); const ks = await caches.keys(); const c = await caches.open('toolcrizib-v3'); const n = (await c.keys()).filter(r => /icons\/comic\//.test(r.url)).length; return { ks, n }; });
  ok(sw.ks.includes('toolcrizib-v3') && sw.n === 32, 'service worker cached ' + sw.n + ' icons in ' + sw.ks.join(','));
  ok(errs.length === 0, 'no console errors ' + JSON.stringify(errs));
  await b.close(); console.log(fails ? `${fails} FAILED` : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
