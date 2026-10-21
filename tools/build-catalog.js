// Build catalog.json from the raw crawl files (tools/ryobi-raw.jsonl, tools/milwaukee-raw.jsonl).
// Only products verified on the maker's own product page are included; every entry keeps its source URL.
const fs = require('fs'), path = require('path');
const T = require('../taxonomy.js');
const dir = __dirname, out = path.join(dir, '..', 'catalog.json');
const read = f => fs.existsSync(path.join(dir, f)) ? fs.readFileSync(path.join(dir, f), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)).filter(x => !x.error && x.model && x.title) : [];
const clean = s => String(s || '').replace(/[™®]/g, '').replace(/[\u201c\u201d]/g, '"').replace(/\s+/g, ' ').replace(/\s+([,)])/g, '$1').trim().replace(/^"([\s\S]*)"$/, '$1').trim().replace(/(\d)\s+"/g, '$1"').replace(/""/g, '"').replace(/\s+"$/, '').trim();
const ACC_CAT = /bits?\b|accessor|blades?\b|refills|brush heads|bags?\b|filters?\b|nozzles|pads\b|dowel|pins|rods|jigs|compound|spools?|parts|covers?|guards?|stands?\b|hoses?|wheels|discs|attachments|storage|organization|cases?\b|apparel|safety glasses|hearing|cleaners? accessor/i;
const ACC_NAME = /compound|\bblades?\b|bit set|\bbits?\b|accessory|accessories|refill|replacement|spool|trimmer line|\bline\b|filter|\bbag\b|sanding (pad|sheet)|\bpads?\b|\bstand\b|\bhose\b|\bcover\b|nozzle|attachment|brush head|guide bar|key lock|lock box|alarm|wall mount|shelf|caddy|organizer|tool box|holster|belt clip|sheath|paint brush cleaner|soap|detergent|cleaning solution|\bpack of\b|\(\d+ ?pc\.?\)|\d+ pc\.? (set|kit)(?!.*(drill|driver|tool))/i;
// hand tools / non-powered items that sit in the same sitemaps
const HAND = /hobby knife|\bmallet\b|plier|socket set|mechanics set|wrench set|screwdriver set|hacksaw|hole saw|grinding stone|hanging mount|misting kit|tape measure|utility knife|\bhammer\b(?!.*(drill|rotary|demolition|sds))|usb-c cable|\bcable\b(?!.*(stripper|cutter|puller|tie))|wall adapter|\bhoist\b(?!.*m1[28])|chalk|clamp|spark plug|tweezers|hand saw|connector|end plug|flexible tubing|cleaning formula|\bbucket\b|sand disc|squeegee|marker|pencil|door stabilizer|garage door remote|scissors|\bknife\b|socket adaptor|driving set|earphones|bump feed|saw horse|sawhorse|workbench|knee pad|tool belt|cooler bag/i;
const WAR = { 'One Year': 12, 'Two Years': 24, 'Three Years': 36, 'Five Years': 60 };
const items = new Map(), stats = {};
function add(x) { const k = x.b + '|' + x.m.toUpperCase(); if (!items.has(k)) items.set(k, x); }
function typeFor(name, hint) { let c = T.classify(name); if (c.type === 'Other tool' && hint) { const h = T.classify(hint); if (h.type !== 'Other tool') c = h; } return c; }
// ---------- RYOBI ----------
for (const r of read('ryobi-raw.jsonl')) {
  const name = clean(r.title), tags = r.tags || [], sys = (tags.find(t => t.startsWith('filter_system:')) || '').split(':')[1] || '';
  if (/LINK Storage/i.test(sys)) continue;
  if ((r.category && ACC_CAT.test(r.category)) || ACC_NAME.test(name) || HAND.test(name)) continue;
  if (!sys && !r.category && !/\b(18V|40V|80V|USB|12V|9\.6V|4V)\b/.test(name) && !/drill|saw|sander|driver|grinder|router|planer|nailer|mower|trimmer|blower|vac|washer|light|battery|charger|generator|compressor|inflator/i.test(name)) continue;
  const c = typeFor(name, r.category);
  const p = T.platformOf('RYOBI', name, sys);
  const isKit = tags.includes('filter_purchase_options:Kit') || /\bkit\b|combo|super combo/i.test(name);
  let ah = null, specs = [];
  try { specs = JSON.parse(r.specs || '[]'); } catch (e) { /* ignore */ }
  const own = specs.find(g => String(g.spec_group_name || '').toUpperCase().startsWith(String(r.model).toUpperCase())) || (specs.length === 1 ? specs[0] : null);
  const cap = own && own.spec_group_properties && own.spec_group_properties.Capacity;
  let kind = T.kindOf(c.type);
  if (kind === 'battery' || c.type === 'Battery & charger kit') ah = cap ? parseFloat(cap) : T.ahOf(name);
  if (c.type === 'Battery & charger kit') kind = 'battery';
  let inc = [];
  try { inc = JSON.parse(r.includes || '[]').map(s => { const m = String(s).match(/^\((\d+)\)\s*([A-Z0-9][A-Z0-9-]+)\s*-/i); return m ? [m[2].toUpperCase(), +m[1]] : null; }).filter(Boolean).filter(x => x[0] !== r.model.toUpperCase()); } catch (e) { /* ignore */ }
  add({ id: 'r:' + r.model, b: 'RYOBI', p, t: c.type, k: kind, m: r.model, n: name, v: T.PLATFORMS.find(x => x.id === p)?.v ?? null, ah: ah || null, bt: kind === 'battery' ? T.batTypeOf(name) : '', l: T.lineOf(name), kit: isKit ? 1 : 0, inc: inc.length && isKit ? inc : undefined, w: WAR[r.warranty] || undefined, u: r.url, p2: c.type === 'Charger / power' && T.alsoPlatforms('RYOBI', name, p).length ? T.alsoPlatforms('RYOBI', name, p) : undefined });
}
// ---------- Milwaukee ----------
const MW_OK = /^(Power Tools|Batteries and Chargers|Outdoor Power Equipment|Lighting|Instruments|Equipment|Safety Solutions|Sewer and Drain Maintenance)$/;
for (const r of read('milwaukee-raw.jsonl')) {
  const name = clean(r.title).replace(/ - Cordless Power Tool$/i, ''), crumbs = r.crumbs || [];
  if (crumbs[1] && !MW_OK.test(crumbs[1])) continue;
  if ((ACC_NAME.test(name) || HAND.test(name)) && !/battery|charger/i.test(name)) continue;
  if (/hand tools|accessor|storage|work gear|apparel/i.test(crumbs.join(' '))) continue;
  const hint = crumbs.slice(-1)[0] || '';
  let c = typeFor(name, hint);
  const p = T.platformOf('Milwaukee', name);
  if (/^48-11-/.test(r.model) && c.type !== 'Battery & charger kit') c = { type: 'Battery', group: 'Batteries' };
  let kind = T.kindOf(c.type); if (c.type === 'Battery & charger kit') kind = 'battery';
  const isKit = /\bkit\b/i.test(name) || /-2[1-9][A-Z]*$/.test(r.model) && !/^48-/.test(r.model);
  const inc = (r.includes || []).filter(i => i.sku && i.sku !== r.model).map(i => [i.sku.toUpperCase(), i.qty || 1]);
  add({ id: 'm:' + r.model, b: 'Milwaukee', p, t: c.type, k: kind, m: r.model, n: name, v: T.PLATFORMS.find(x => x.id === p)?.v ?? null, ah: kind === 'battery' ? T.ahOf(name) : null, bt: kind === 'battery' ? T.batTypeOf(name) : '', l: T.lineOf(name), kit: isKit ? 1 : 0, inc: inc.length && isKit ? inc : undefined, u: r.url, p2: (c.type === 'Charger / power' || c.type === 'Battery & charger kit') && T.alsoPlatforms('Milwaukee', name, p).length ? T.alsoPlatforms('Milwaukee', name, p) : undefined });
}
const list = [...items.values()].map(x => { Object.keys(x).forEach(k => (x[k] === undefined || x[k] === null || x[k] === '' || x[k] === 0 && k === 'kit') && delete x[k]); return x; })
  .sort((a, b) => a.b.localeCompare(b.b) || a.n.localeCompare(b.n));
for (const x of list) { const k = `${x.b} ${(T.PLATFORMS.find(p => p.id === x.p) || {}).name || x.p}`; stats[k] = stats[k] || { total: 0, tools: 0, batteries: 0, chargers: 0, kits: 0 }; stats[k].total++; stats[k][x.k === 'battery' ? 'batteries' : x.k === 'charger' ? 'chargers' : 'tools']++; if (x.kit) stats[k].kits++; }
const now = new Date();
const cat = { generated: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), generatedISO: now.toISOString(),
  sources: { RYOBI: 'https://www.ryobitools.com/sitemap.xml → product pages (JSON-LD + page data)', Milwaukee: 'https://www.milwaukeetool.com/sitemap.xml → product pages (JSON-LD)' },
  note: 'Model numbers and names as published on the manufacturer pages linked in each entry (u). Battery Ah from the product name or spec table. Tool type is Tool Crizib’s own grouping.',
  counts: stats, items: list };
fs.writeFileSync(out, JSON.stringify(cat));
console.log(list.length, 'products ->', out, (fs.statSync(out).size / 1024).toFixed(0) + ' KB');
console.table(stats);
