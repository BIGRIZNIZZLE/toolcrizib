const puppeteer = require('/workspace/autolog/tools/node_modules/puppeteer-core');
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--allow-file-access-from-files'] });
  const p = await b.newPage(); await p.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  await p.goto('file://' + __dirname + '/og.template.html', { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 400));
  await p.screenshot({ path: __dirname + '/../img/og-toollog.jpg', type: 'jpeg', quality: 88 });
  await b.close();
})();
