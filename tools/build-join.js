// Builds join/index.html (invite/install page) with a locally generated QR code. No runtime services.
const fs = require('fs'), Q = require('/workspace/autolog/tools/node_modules/qrcode');
const JOIN = 'https://bigriznizzle.github.io/toollog/join/';
Q.toString(JOIN, { type: 'svg', errorCorrectionLevel: 'M', margin: 1, color: { dark: '#0b1430', light: '#ffffff' } }, (e, svg) => {
  if (e) throw e;
  const t = fs.readFileSync(__dirname + '/join.template.html', 'utf8').replace('{{QR}}', svg.replace(/<\?xml[^>]*>/, ''));
  fs.mkdirSync(__dirname + '/../join', { recursive: true });
  fs.writeFileSync(__dirname + '/../join/index.html', t); console.log('join/index.html', t.length);
});
