// Screenshots (dark + light) of the main screens, iPhone-sized viewport
const puppeteer = require('/workspace/autolog/tools/node_modules/puppeteer-core');
const BASE = process.env.BASE || 'http://127.0.0.1:8813/toolcrizib/';
const OUT = __dirname + '/../screenshots/'; require('fs').mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const errs = [];
  for (const theme of ['dark', 'light']) {
    const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }]);
    await p.goto(BASE + '?nosplash', { waitUntil: 'networkidle0' }); await p.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await p.goto(BASE + '#/dash', { waitUntil: 'networkidle0' }); await sleep(700);
    await p.screenshot({ path: OUT + `01-splash-${theme}.png` }); await sleep(2600);
    await p.evaluate(() => document.querySelector('.splash, #splash')?.remove());
    await p.evaluate(() => document.querySelector('[data-act="sample"]').click()); await sleep(1500);
    await p.evaluate(() => { location.hash = '#/dash'; scrollTo(0, 0); document.getElementById('toast')?.classList.remove('show'); }); await sleep(3200);
    await p.screenshot({ path: OUT + `02-dashboard-${theme}.png` });
    const shot = async (hash, name, prep) => { await p.evaluate(h => { location.hash = h; }, hash); await sleep(450); await p.evaluate(() => scrollTo(0, 0)); if (prep) await prep(); await sleep(250); await p.screenshot({ path: OUT + name + `-${theme}.png` }); };
    // real photos on a couple of items so lists show photos mixed with comic icons
    const withPh = await p.evaluate(async () => { const A = window.ToolLogApp, db = A.getDb(); const pick = re => db.items.find(i => re.test(i.type || '') && !(i.photos || []).length);
      const out = []; for (const [re, f] of [[/^Drill/, 'drill.jpg'], [/^Circular saw/, 'saw.jpg']]) { const it = pick(re); if (!it) continue; const b = await (await fetch('/shots-fixtures/' + f)).blob(); it.photos = [await A.Photos.add(new File([b], f, { type: 'image/jpeg' }))]; out.push(it.id); }
      localStorage.setItem('toollog:data:v1', JSON.stringify(db)); A.render(); return out; });
    await shot('#/tools?g=brand', '03-by-brand');
    await shot('#/tools?g=brand', '03b-by-brand-scrolled', async () => { await p.evaluate(() => scrollTo(0, 900)); await sleep(500); });
    await shot('#/tools?g=type', '04-by-type');
    await shot('#/power', '06-battery-platforms');
    const db = await p.evaluate(() => window.ToolLogApp.getDb());
    const bat = db.items.find(i => i.model === '48-11-1880') || db.items.find(i => i.kind === 'battery');
    await shot('#/item/' + bat.id, '07-item-detail');
    if (withPh[0]) await shot('#/item/' + withPh[0], '07b-item-detail-photo');
    await shot('#/about', '10-icon-sheet', async () => { await p.evaluate(() => document.getElementById('icons').scrollIntoView({ block: 'start' })); await sleep(700); });
    { await p.evaluate(() => document.querySelectorAll('header, .topbar, #tabbar, .tabbar, #fab').forEach(e => { e.style.visibility = 'hidden'; })); const el = await p.$('#icons'); if (el) await el.screenshot({ path: OUT + `10b-icon-sheet-full-${theme}.png` }); }
    await shot('#/export', '08-insurance-export');
    await shot('#/print', '08b-insurance-print');
    await p.evaluate(() => { location.hash = '#/tools'; }); await sleep(300);
    await p.evaluate(() => document.querySelector('[data-act="add"]').click()); await sleep(900);
    await p.evaluate(() => document.querySelector('[data-pk="brand=Milwaukee"]').click()); await sleep(200);
    await p.evaluate(() => document.querySelector('[data-pk="plat=mil-m18"]')?.click()); await sleep(300);
    await p.screenshot({ path: OUT + `05-add-from-catalog-${theme}.png` });
    await p.close();
    const j = await b.newPage(); await j.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
    await j.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }]);
    await j.goto(BASE + 'join/', { waitUntil: 'networkidle0' }); await sleep(400);
    await j.screenshot({ path: OUT + `09-join-${theme}.png` }); await j.close();
  }
  console.log('errors', errs); await b.close();
})();
