// Offline compatibility check: ToolLog records pass through every AutoLog sync.js ever shipped (git history + current)
// and come back unchanged; AutoLog never drops them (so never tombstones them); ToolLog ignores AutoLog's rows.
const fs = require('fs'), vm = require('vm');
function load(file, hookFrom, hookTo) {
  let src = fs.readFileSync(file, 'utf8');
  if (!src.includes(hookFrom)) throw new Error('no hook in ' + file);
  src = src.replace(hookFrom, hookTo);
  const store = {}; const ls = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
  const app = { getDb: () => ({}), replaceDb() {}, onChange() {}, toast() {}, render() {} };
  const window = { AutoLogApp: app, ToolLogApp: app, addEventListener() {}, location: { origin: 'x', href: 'x' }, AUTOLOG_STANDALONE: true };
  const ctx = { window, localStorage: ls, sessionStorage: ls, document: { querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }), head: { appendChild() {} }, getElementById: () => null, visibilityState: 'visible' }, navigator: { onLine: true }, console, setTimeout, clearTimeout, setInterval, clearInterval, Date, JSON, Math, Map, Set, Promise, fetch: async () => { throw new Error('offline'); } };
  ctx.location = { hash: '', origin: 'x', href: 'x', search: '', pathname: '/' }; ctx.history = { replaceState() {} }; ctx.globalThis = ctx; vm.createContext(ctx); vm.runInContext(src, ctx);
  return { ...window.__T, store };
}
const TL = load(__dirname + '/../sync.js', 'window.ToolLogSync = {', 'window.__T = { explode, implode }; window.ToolLogSync = {');
const tdb = { version: 1, settings: { theme: 'dark' },
  items: [{ id: 'i1', kind: 'tool', brand: 'Milwaukee', model: '2767-20', name: 'Impact', price: 299, serial: 'S1', photos: ['p1'] }, { id: 'i2', kind: 'battery', brand: 'RYOBI', model: 'PBP004', ah: 4, kitId: 'k1' }],
  kits: [{ id: 'k1', name: 'Kit', price: 199 }], custom: [{ id: 'c1', brand: 'DeWalt', name: 'Saw' }] };
const tl = TL.explode(tdb);
const res = {}; const ok = (k, c, extra = '') => { res[k] = c ? 'PASS' : 'FAIL ' + extra; };
ok('toollogKeys', [...tl.keys()].every(k => k.startsWith('maint/tl:')) && tl.size === 4 && [...tl.values()].every(r => r.kind === 'maint' && r.data._vid === '__toollog' && r.id.length <= 100), JSON.stringify([...tl.keys()]));
// an AutoLog account's own records
const adb = { version: 10, settings: {}, programs: [{ id: 'pg1' }], vehicles: [{ id: 'v1', name: 'Car', fuel: [{ id: 'f1', gallons: 10 }], maint: { oil: [{ id: 'm1', odo: 5 }] } }], parts: [{ id: 'p1' }], plans: [], inventory: [{ id: 'n1', qty: 2 }], vlib: [] };
const versions = fs.readdirSync('/tmp/alsync').filter(f => f.endsWith('.js'));
for (const f of versions) {
  const A = load('/tmp/alsync/' + f, 'window.AutoLogSync = {', 'window.__T = { explode, implode }; window.AutoLogSync = {');
  const aRecs = A.explode(adb);
  const all = new Map([...aRecs, ...tl]);            // what the server holds for this user
  const aLocal = A.implode({ ...adb, vehicles: [], programs: [] }, all);  // AutoLog pulls everything
  const aRe = A.explode(aLocal);                     // AutoLog's live set (anything missing would be tombstoned)
  const lost = [...tl.keys()].filter(k => !aRe.has(k) || JSON.stringify(aRe.get(k).data) !== JSON.stringify(tl.get(k).data));
  ok(f + ': AutoLog keeps every ToolLog record unchanged', lost.length === 0, lost.join(','));
  ok(f + ': AutoLog data intact', JSON.stringify(aLocal.vehicles) === JSON.stringify(adb.vehicles) && aLocal.vehicles[0].maint.oil.length === 1 && !aLocal.vehicles.some(v => v.maint && v.maint.items));
  const leaked = JSON.stringify(aLocal.vehicles).includes('2767-20') || JSON.stringify(aLocal.inventory || []).includes('2767-20') || JSON.stringify(aLocal.parts || []).includes('2767-20');
  ok(f + ': ToolLog items not shown in AutoLog', !leaked);
  // and ToolLog reading the same server set sees only its own records
  const back = TL.implode({ version: 1, items: [], kits: [], custom: [], settings: tdb.settings }, all);
  ok(f + ': ToolLog round trip / ignores AutoLog rows', JSON.stringify(back.items) === JSON.stringify(tdb.items) && JSON.stringify(back.kits) === JSON.stringify(tdb.kits) && JSON.stringify(back.custom) === JSON.stringify(tdb.custom) && !back.vehicles);
  // AutoLog after a reload (orphans persisted to its own storage) still has them
  const aRe2 = A.explode(A.implode(aLocal, aRe));
  ok(f + ': survives a second AutoLog cycle', [...tl.keys()].every(k => aRe2.has(k)));
}
console.log(JSON.stringify(res, null, 1));
const fails = Object.values(res).filter(x => x !== 'PASS').length; console.log(fails ? fails + ' FAIL' : 'ALL PASS (' + versions.length + ' AutoLog versions)'); process.exit(fails ? 1 : 0);
