const puppeteer = require('/workspace/autolog/tools/node_modules/puppeteer-core');
const BASE = process.env.BASE || 'http://127.0.0.1:8813/toollog/';
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text()); });
  await p.goto(BASE + '?nosplash', { waitUntil: 'networkidle0' });
  await p.evaluate(() => localStorage.clear());
  await p.goto(BASE + '?nosplash#/dash', { waitUntil: 'networkidle0' });
  const out = {};
  out.dash0 = await p.$eval('#app, main', e => e.innerText.slice(0, 300)).catch(e => 'ERR ' + e.message);
  // load sample
  const r = await p.evaluate(async () => { const a = window.ToolLogApp; if (!a) return 'no app'; await a.loadCatalog(); return Object.keys(a).join(','); });
  out.api = r;
  for (const h of ['#/dash', '#/tools?g=brand', '#/tools?g=type', '#/tools?g=platform', '#/tools?g=location', '#/tools?g=kit', '#/power', '#/export', '#/print', '#/more', '#/about']) {
    await p.evaluate(h => { location.hash = h; }, h); await new Promise(r => setTimeout(r, 300));
    out[h] = await p.evaluate(() => (document.querySelector('main') || document.body).innerText.replace(/\s+/g, ' ').slice(0, 160));
  }
  console.log(JSON.stringify(out, null, 1)); console.log('ERRORS', errs);
  await b.close();
})();
