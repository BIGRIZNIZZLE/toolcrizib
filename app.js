/* ToolLog · RIZNOSS Chamber 02 — power tool & battery inventory. Data lives in localStorage (records) + IndexedDB (photos). */
'use strict';
const KEY = 'toollog:data:v1', BAK = 'toollog:backup:v1', APP_VERSION = '1';
const TAX = window.TL_TAX;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayISO = () => iso(new Date());
const parseD = s => { if (!s || !/^\d{4}-\d{2}-\d{2}/.test(s)) return null; const [y, m, d] = s.slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
const addMonths = (s, n) => { const d = parseD(s); if (!d || n == null) return null; const day = d.getDate(); d.setMonth(d.getMonth() + Number(n)); if (d.getDate() < day) d.setDate(0); return iso(d); };
const daysBetween = (a, b) => Math.round((parseD(b) - parseD(a)) / 864e5);
const num = v => { if (v === '' || v == null) return null; const n = Number(v); return isFinite(n) ? n : null; };
const fmt = (n, d = 0) => n == null || !isFinite(n) ? '—' : Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const money = (n, d = 2) => n == null || !isFinite(n) ? '—' : (n < 0 ? '-$' : '$') + fmt(Math.abs(n), d);
const money0 = n => money(n, n != null && Math.abs(n) >= 1000 ? 0 : 2);
const fdate = s => { const d = parseD(s); return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'; };
const plural = (n, w, p) => `${fmt(n)} ${n === 1 ? w : (p || w + 's')}`;
const norm = s => String(s || '').toLowerCase().replace(/[™®]/g, '').replace(/[^a-z0-9.+/ -]/g, ' ').replace(/\s+/g, ' ').trim();

/* ---------- icons ---------- */
const svg = p => `<svg viewBox="0 0 24 24" class="ic" aria-hidden="true">${p}</svg>`;
const I = {
  plus: svg('<path d="M12 5v14M5 12h14"/>'), close: svg('<path d="M18 6 6 18M6 6l12 12"/>'), check: svg('<path d="M20 6 9 17l-5-5"/>'),
  back: svg('<path d="m15 18-6-6 6-6"/>'), chev: svg('<path d="m6 9 6 6 6-6"/>'), right: svg('<path d="m9 18 6-6-6-6"/>'),
  trash: svg('<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>'), edit: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>'), camera: svg('<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3.5"/>'),
  drill: svg('<path d="M3 7h11l2 2v3H9l-1 2H6l1-2H3z"/><path d="M16 9h3"/><path d="M19 8v2"/><path d="M8 14l-1 7h4l1-7"/>'),
  battery: svg('<rect x="3" y="7" width="16" height="11" rx="2"/><path d="M21 11v3"/><path d="M7 11v3M11 11v3M15 11v3"/>'),
  bolt: svg('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'), plug: svg('<path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0z"/><path d="M12 18v4"/>'),
  box: svg('<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>'), shield: svg('<path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z"/>'),
  gauge: svg('<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>'), list: svg('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
  doc: svg('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>'),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  download: svg('<path d="M12 3v12m0 0-4-4m4 4 4-4M4 21h16"/>'), upload: svg('<path d="M12 21V9m0 0-4 4m4-4 4 4M4 3h16"/>'),
  share: svg('<path d="M12 3v12"/><path d="m8 7 4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/>'),
  hand: svg('<path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-5.9-2.3l-3.6-3.6a2 2 0 0 1 2.8-2.8L7 15"/>'),
  cal: svg('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'), print: svg('<path d="M6 9V2h12v7"/><rect x="2" y="9" width="20" height="9" rx="2"/><path d="M6 14h12v8H6z"/>'),
  copy: svg('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>'), bell: svg('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>'),
};
const KIND_IC = { tool: I.drill, battery: I.battery, charger: I.plug, other: I.box };

/* ---------- data ---------- */
const KINDS = [['tool', 'Tool'], ['battery', 'Battery'], ['charger', 'Charger'], ['other', 'Other']];
const kindL = k => (KINDS.find(x => x[0] === k) || KINDS[0])[1];
const kindByL = l => (KINDS.find(x => x[1] === l) || KINDS[0])[0];
const CONDITIONS = ['New', 'Good', 'Fair', 'Needs repair', 'Broken'];
const STATUSES = ['Active', 'Sold', 'Lost / stolen', 'Retired'];
const LOCATIONS = ['Garage', 'Truck', 'Jobsite', 'Shop', 'Basement', 'Shed', 'Trailer', 'Storage unit'];
const STORES = ['The Home Depot', 'Lowe’s', 'Amazon', 'Walmart', 'Acme Tools', 'Ace Hardware', 'Menards', 'Northern Tool', 'Tractor Supply', 'Zoro', 'Milwaukee Tool', 'RYOBI direct', 'Facebook Marketplace', 'Pawn shop', 'Gift'];
const BAT_TYPES = { RYOBI: ['Standard', 'LITHIUM+', 'HIGH PERFORMANCE', 'HP', 'HP EDGE', 'EDGE'], Milwaukee: ['REDLITHIUM CP', 'REDLITHIUM XC', 'REDLITHIUM HD', 'HIGH OUTPUT CP', 'HIGH OUTPUT XC', 'HIGH OUTPUT HD', 'FORGE', 'FORGE XC', 'FORGE HD', 'MX FUEL CP', 'MX FUEL XC', 'MX FUEL HD'] };
const HEALTH = ['', 'Like new', 'Good', 'Fading', 'Weak', 'Dead'];
function blank() { return { version: 1, items: [], kits: [], custom: [], settings: { theme: 'auto', owner: '', group: 'brand' } }; }
function normalize(j) {
  const d = { ...blank(), ...(j && typeof j === 'object' ? j : {}) };
  d.items = Array.isArray(d.items) ? d.items.filter(x => x && x.id) : [];
  d.kits = Array.isArray(d.kits) ? d.kits.filter(x => x && x.id) : [];
  d.custom = Array.isArray(d.custom) ? d.custom.filter(x => x && x.id) : [];
  d.settings = { ...blank().settings, ...(d.settings || {}) };
  for (const it of d.items) { if (!it.kind) it.kind = 'tool'; if (!it.status) it.status = 'Active'; if (!Array.isArray(it.photos)) it.photos = []; if (!it.created) it.created = new Date().toISOString(); }
  d.version = 1;
  return d;
}
function load() {
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch (e) { /* private mode */ }
  if (!raw) return blank();
  try {
    const j = JSON.parse(raw);
    // keep a copy of whatever an older version wrote before upgrading it (non-destructive migrations)
    if ((j.version || 0) < 1) try { localStorage.setItem(BAK, raw); } catch (e) { /* quota */ }
    return normalize(j);
  } catch (e) {
    try { localStorage.setItem(BAK + ':corrupt', raw); } catch (e2) { /* quota */ }
    return blank();
  }
}
let db = load();
let DBV = 0;
function save() {
  DBV++;
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { toast('Couldn’t save. Your browser storage may be full.'); }
  try { window.ToolLogSync && window.ToolLogSync.changed(); } catch (e) { console.warn(e); }
}
const itemById = id => db.items.find(x => x.id === id) || null;
const kitById = id => db.kits.find(x => x.id === id) || null;
const active = it => (it.status || 'Active') === 'Active';
const kitItems = k => db.items.filter(x => x.kitId === k.id);
function itemCost(it) {
  const k = it.kitId && kitById(it.kitId);
  if (k) {
    const mates = kitItems(k), price = k.free ? 0 : (num(k.price) || 0);
    if (num(it.kitShare) != null) return num(it.kitShare);
    const fixed = mates.filter(x => num(x.kitShare) != null), rest = mates.length - fixed.length;
    return rest ? Math.max(0, price - fixed.reduce((t, x) => t + num(x.kitShare), 0)) / rest : 0;
  }
  return it.free ? 0 : num(it.price);
}
// value = price paid for the given items, plus kits that have no pieces logged yet (so a kit's cost is never lost)
const totalValue = (list = db.items.filter(active)) => list.reduce((t, x) => t + (itemCost(x) || 0), 0) + db.kits.filter(k => !kitItems(k).length && !k.free).reduce((t, k) => t + (num(k.price) || 0), 0);
const missingPrice = it => !it.kitId && !it.free && !(num(it.price) > 0);

/* ---------- platforms ---------- */
const PL = Object.fromEntries(TAX.PLATFORMS.map(p => [p.id, p]));
const platKey = (brand, label) => { const b = String(brand || '').trim(), l = String(label || '').trim(); const hit = TAX.PLATFORMS.find(p => p.brand.toLowerCase() === b.toLowerCase() && (p.name.toLowerCase() === l.toLowerCase() || p.short.toLowerCase() === l.toLowerCase())); return hit ? hit.id : l ? 'x:' + norm(b) + ':' + norm(l) : ''; };
const platLabel = (id, it) => PL[id] ? PL[id].name : (it && it.platformL) || (id ? id.split(':').slice(2).join(':') : '');
const platFull = (id, it) => PL[id] ? `${PL[id].brand} ${PL[id].name}` : [it && it.brand, platLabel(id, it)].filter(Boolean).join(' ');
const platNone = id => !!(PL[id] && PL[id].none);
const brandPlatforms = brand => TAX.PLATFORMS.filter(p => p.brand.toLowerCase() === String(brand || '').toLowerCase());
const itemPlats = it => [it.platform, ...(Array.isArray(it.alsoP) ? it.alsoP : [])].filter(Boolean);
function warrantyEnd(it) {
  const k = it.kitId && kitById(it.kitId);
  const start = it.purchased || (k && k.purchased), mo = num(it.warrantyMo) ?? (k ? num(k.warrantyMo) : null);
  return start && mo ? addMonths(start, mo) : null;
}
function warrantyState(it) {
  const end = warrantyEnd(it); if (!end) return { level: 'none', label: 'No warranty info', end: null };
  const d = daysBetween(todayISO(), end);
  if (d < 0) return { level: 'over', label: 'Warranty expired', end, d };
  if (d <= 60) return { level: 'soon', label: `Warranty ends in ${plural(d, 'day')}`, end, d };
  return { level: 'ok', label: 'Under warranty', end, d };
}
const itemTitle = it => it.name || [it.brand, it.model].filter(Boolean).join(' ') || 'Item';
const itemSub = it => [it.brand, platNone(it.platform) ? '' : platLabel(it.platform, it), it.model].filter(Boolean).join(' · ');

/* ---------- photos (IndexedDB; compressed JPEG + thumbnail) ---------- */
const Photos = (() => {
  let dbp = null; const urls = new Map();
  const open = () => dbp || (dbp = new Promise((res, rej) => { if (!('indexedDB' in window)) return rej(new Error('no idb')); const r = indexedDB.open('toollog-photos', 1); r.onupgradeneeded = () => r.result.createObjectStore('p', { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }));
  const tx = async (mode, fn) => { const d = await open(); return new Promise((res, rej) => { const t = d.transaction('p', mode), s = t.objectStore('p'); const out = fn(s); t.oncomplete = () => res(out && out.result !== undefined ? out.result : out); t.onerror = () => rej(t.error); }); };
  async function shrink(file, max, q) {
    let bmp; try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { bmp = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = URL.createObjectURL(file); }); }
    const w0 = bmp.width, h0 = bmp.height, s = Math.min(1, max / Math.max(w0, h0)), w = Math.round(w0 * s), h = Math.round(h0 * s);
    const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(bmp, 0, 0, w, h);
    return new Promise(res => c.toBlob(b => res(b), 'image/jpeg', q));
  }
  return {
    async add(file) { const id = 'ph_' + uid(); const [full, thumb] = await Promise.all([shrink(file, 1600, 0.74), shrink(file, 360, 0.7)]); await tx('readwrite', s => s.put({ id, full, thumb, t: Date.now() })); return id; },
    async get(id) { try { return await tx('readonly', s => s.get(id)); } catch (e) { return null; } },
    async url(id, which = 'thumb') { const k = id + ':' + which; if (urls.has(k)) return urls.get(k); const r = await this.get(id); if (!r || !r[which]) return null; const u = URL.createObjectURL(r[which]); urls.set(k, u); return u; },
    async del(id) { try { await tx('readwrite', s => s.delete(id)); } catch (e) { /* ignore */ } },
    async all() { try { const d = await open(); return await new Promise((res, rej) => { const r = d.transaction('p').objectStore('p').getAll(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); } catch (e) { return []; } },
    async putRaw(rec) { await tx('readwrite', s => s.put(rec)); },
  };
})();
// fill every <img data-ph="id"> on screen
function paintPhotos(root = document) { $$('img[data-ph]', root).forEach(async im => { if (im.dataset.done) return; im.dataset.done = 1; const u = await Photos.url(im.dataset.ph, im.dataset.full ? 'full' : 'thumb'); if (u) im.src = u; else im.closest('.ph')?.classList.add('missing'); }); }
const blobToData = b => new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(b); });
const dataToBlob = async d => (await fetch(d)).blob();

/* ---------- catalog (lazy, cached offline by the service worker) ---------- */
let CAT = null, catP = null;
function loadCatalog() {
  if (CAT) return Promise.resolve(CAT);
  if (window.TL_CATALOG) { CAT = window.TL_CATALOG; return Promise.resolve(CAT); }
  return catP || (catP = fetch('catalog.json').then(r => { if (!r.ok) throw new Error('catalog ' + r.status); return r.json(); }).then(j => { CAT = j; CAT.items.forEach(x => { x._s = norm([x.n, x.m, x.t, x.l, x.bt].join(' ')) + ' ' + String(x.m || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }); return CAT; }).catch(e => { catP = null; throw e; }));
}
const catByModel = (brand, m) => CAT && CAT.items.find(x => x.b === brand && String(x.m).toUpperCase() === String(m).toUpperCase());
const customAsCat = () => db.custom.map(c => ({ id: 'my:' + c.id, b: c.brand, p: c.platform, t: c.type, k: c.kind, m: c.model, n: c.name, v: c.voltage, ah: c.ah, bt: c.batType, l: c.line, mine: 1, _s: norm([c.name, c.model, c.type].join(' ')) }));

/* ---------- UI helpers ---------- */
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600); }
const stat = (k, v, u = '') => `<div class="stat"><div class="k">${esc(k)}</div><div class="v">${v}${u ? `<small>${u}</small>` : ''}</div></div>`;
const pill = st => `<span class="pill ${st.level}">${esc(st.label)}</span>`;
/* iOS / WebKit: pin the page behind any open dialog so focusing a field or opening a list never scrolls the document
   under the sheet; restore the scroll position when the last dialog closes. */
const scrollLock = (() => {
  let y = 0, on = false;
  const lock = () => { if (on) return; on = true; y = window.scrollY || 0; const st = document.body.style; document.documentElement.classList.add('modal-open'); st.position = 'fixed'; st.top = `-${y}px`; st.left = '0'; st.right = '0'; st.width = '100%'; };
  const unlock = () => { if (!on) return; on = false; const st = document.body.style; document.documentElement.classList.remove('modal-open'); st.position = ''; st.top = ''; st.left = ''; st.right = ''; st.width = ''; window.scrollTo(0, y); };
  const sync = () => { if ([...document.querySelectorAll('dialog')].some(d => d.open)) lock(); else unlock(); };
  const watch = () => { const mo = new MutationObserver(sync); document.querySelectorAll('dialog').forEach(d => { mo.observe(d, { attributes: true, attributeFilter: ['open'] }); d.addEventListener('close', () => setTimeout(sync, 0)); }); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
  ['pageshow', 'hashchange', 'orientationchange'].forEach(ev => window.addEventListener(ev, () => setTimeout(sync, 0)));
  return { sync, isOn: () => on };
})();
function ask({ title, msg = '', buttons, typeToConfirm }) {
  return new Promise(res => {
    const d = $('#confirm'), box = $('#confirmInner');
    box.innerHTML = `<h3>${esc(title)}</h3><p>${msg}</p>${typeToConfirm ? `<label class="field"><span class="lbl">Type <b>${esc(typeToConfirm)}</b> to confirm</span><input id="typeConfirm" autocomplete="off" autocapitalize="characters"></label>` : ''}
      <div class="btns">${buttons.map((b, i) => `<button type="button" class="btn ${b.cls || ''}" data-i="${i}" ${typeToConfirm && b.needsType ? 'disabled' : ''}>${esc(b.label)}</button>`).join('')}</div>`;
    const done = val => { d.close(); res(val); };
    box.onclick = e => { const b = e.target.closest('button[data-i]'); if (b) done(buttons[b.dataset.i].value); };
    d.oncancel = e => { e.preventDefault(); done(null); };
    if (typeToConfirm) { const inp = $('#typeConfirm'); inp.oninput = () => $$('button[data-i]', box).forEach((b, i) => { if (buttons[i].needsType) b.disabled = inp.value.trim().toLowerCase() !== typeToConfirm.toLowerCase(); }); }
    d.showModal();
  });
}
const confirmDanger = (title, msg, label = 'Delete') => ask({ title, msg, buttons: [{ label, value: true, cls: 'danger' }, { label: 'Cancel', value: false }] });
function download(name, data, type = 'application/json') { const b = data instanceof Blob ? data : new Blob([data], { type }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }

/* ---------- forms ---------- */
const has = (arr, x) => Array.isArray(arr) && arr.includes(x);
function fieldHTML(f, vals) {
  if (f.t === 'h') return `<div class="fhead" data-k="${f.k || ''}">${esc(f.l)}</div>`;
  if (f.t === 'hint') return `<div class="field hint" data-k="${f.k}">${f.html || esc(f.l)}</div>`;
  const val = vals[f.k], name = `name="${f.k}"`, cls = `field${f.half ? ' half' : ''}`;
  const lbl = `<span class="lbl">${esc(f.l)}${f.req ? ' *' : ''}</span>`;
  const hint = f.hint ? `<small class="muted fhint">${esc(f.hint)}</small>` : '';
  const ph = f.ph ? `placeholder="${esc(f.ph)}"` : '';
  let inner = '';
  switch (f.t) {
    case 'text': inner = `<input type="text" ${name} value="${esc(val)}" ${ph} autocomplete="off" ${f.caps ? 'autocapitalize="characters" spellcheck="false"' : ''}>`; break;
    case 'num': { const inp = `<input type="number" inputmode="decimal" ${name} value="${esc(val)}" step="${f.step || 'any'}" min="0" ${ph}>`; inner = f.unit ? `<div class="unit">${inp}<em>${esc(f.unit)}</em></div>` : f.pre ? `<div class="unit pre">${inp}<em>${esc(f.pre)}</em></div>` : inp; break; }
    case 'date': inner = `<input type="date" ${name} value="${esc(val)}">`; break;
    case 'textarea': inner = `<textarea ${name} ${ph}>${esc(val)}</textarea>`; break;
    case 'select': { const opts = typeof f.opts === 'function' ? f.opts(vals) : f.opts; inner = `<select ${name}>${opts.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${String(val ?? '') === String(v) ? 'selected' : ''}>${esc(l || '—')}</option>`; }).join('')}</select>`; break; }
    case 'seg': return `<div class="${cls}" data-k="${f.k}" role="radiogroup" aria-label="${esc(f.l)}">${lbl}<div class="seg">${f.opts.map(o => `<label><input type="radio" ${name} value="${esc(o)}" ${String(val) === o ? 'checked' : ''}><span>${esc(o)}</span></label>`).join('')}</div>${hint}</div>`;
    case 'check': return `<div class="${cls}" data-k="${f.k}"><label class="toggle"><span>${esc(f.l)}${f.sub ? `<small>${esc(f.sub)}</small>` : ''}</span><input type="checkbox" role="switch" ${name} ${val ? 'checked' : ''}></label></div>`;
    case 'combo': return `<div class="${cls} combo-f" data-k="${f.k}">${lbl}<div class="combo"><input type="text" ${name} value="${esc(val)}" ${ph} autocomplete="off" spellcheck="false" role="combobox" aria-expanded="false" aria-autocomplete="list" aria-label="${esc(f.l)}" data-combo="${f.k}"><button type="button" class="combo-btn" data-combo-open="${f.k}" aria-label="Show ${esc(f.l.toLowerCase())} list" tabindex="-1">${I.chev}</button></div><div class="combo-list" role="listbox" hidden></div>${hint}</div>`;
    case 'photos': return `<div class="${cls}" data-k="${f.k}">${lbl}<div class="ph-row" data-phrow="${f.k}"></div><input type="file" accept="image/*" ${f.single ? '' : 'multiple'} hidden data-phfile="${f.k}">${hint}</div>`;
  }
  return `<label class="${cls}" data-k="${f.k}">${lbl}${inner}${hint}</label>`;
}
function readForm(form, fields) {
  const o = {};
  for (const f of fields) {
    if (!f.k || f.t === 'h' || f.t === 'hint') continue;
    const el = form.elements[f.k];
    switch (f.t) {
      case 'num': o[f.k] = num(el && el.value); break;
      case 'seg': o[f.k] = ($(`input[name="${f.k}"]:checked`, form) || {}).value || ''; break;
      case 'check': o[f.k] = !!(el && el.checked); break;
      case 'photos': o[f.k] = [...(form._ph?.[f.k] || [])]; break;
      default: o[f.k] = ((el && el.value) || '').trim();
    }
  }
  return o;
}
function setField(form, k, v) {
  const el = form.elements[k]; if (!el) return;
  if (el instanceof RadioNodeList) { [...el].forEach(r => { r.checked = r.value === v; }); return; }
  if (el.type === 'checkbox') el.checked = !!v; else el.value = v ?? '';
}
// searchable dropdown with "type my own": every combo field's options come from f.opts(vals)
function wireCombos(form, fields, refresh) {
  const C = { open: null, idx: -1, rows: [] };
  const fOf = k => fields.find(f => f.k === k);
  const list = k => $(`[data-k="${k}"] .combo-list`, form);
  function paint(k) {
    const f = fOf(k), box = list(k), inp = form.elements[k]; if (!box || !f) return;
    const vals = readForm(form, fields), q = norm(inp.value);
    const all = [...new Set((typeof f.opts === 'function' ? f.opts(vals) : f.opts || []).filter(Boolean))];
    let rows = q ? all.filter(o => norm(o).includes(q)).sort((a, b) => (norm(b).startsWith(q) - norm(a).startsWith(q))) : all;
    const more = Math.max(0, rows.length - 80); rows = rows.slice(0, 80).map(v => ({ v }));
    if (q && !all.some(o => norm(o) === q)) rows.push({ v: inp.value.trim(), own: 1 });
    C.rows = rows; if (C.idx >= rows.length) C.idx = rows.length - 1;
    box.innerHTML = rows.map((o, i) => `<div class="combo-opt${i === C.idx ? ' on' : ''}${o.own ? ' own' : ''}" role="option" data-copt="${i}" aria-selected="${i === C.idx}">${o.own ? `<span class="ot">Use “<b>${esc(o.v)}</b>”</span><span class="otag mine">my own</span>` : `<span class="ot">${esc(o.v)}</span>`}</div>`).join('')
      + (more ? `<div class="combo-note">${fmt(more)} more. Keep typing to narrow.</div>` : '') + (!q ? `<div class="combo-opt own" role="option" data-cother>Other / type my own</div>` : '');
    box.hidden = false; inp.setAttribute('aria-expanded', 'true');
    const r = box.getBoundingClientRect(); box.classList.toggle('right', r.right > window.innerWidth - 4);
  }
  const close = () => { if (!C.open) return; const b = list(C.open); if (b) b.hidden = true; form.elements[C.open]?.setAttribute('aria-expanded', 'false'); C.open = null; };
  const openC = k => { if (C.open && C.open !== k) close(); C.open = k; C.idx = -1; paint(k); };
  const pick = (k, v) => { setField(form, k, v); close(); const f = fOf(k); f && f.onPick && f.onPick(v, form); refresh(); };
  form.addEventListener('focusin', e => { const k = e.target.dataset?.combo; if (k) openC(k); });
  form.addEventListener('focusout', e => { if (e.target.dataset?.combo) setTimeout(() => { if (!document.activeElement || !document.activeElement.dataset?.combo) close(); }, 180); });
  form.addEventListener('pointerdown', e => { if (e.target.closest('.combo-list')) e.preventDefault(); });
  form.addEventListener('input', e => { const k = e.target.dataset?.combo; if (k) { C.idx = -1; if (C.open !== k) openC(k); else paint(k); } });
  form.addEventListener('keydown', e => {
    const k = e.target.dataset?.combo; if (!k || C.open !== k) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); C.idx = Math.min(C.rows.length - 1, C.idx + 1); paint(k); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); C.idx = Math.max(-1, C.idx - 1); paint(k); }
    else if (e.key === 'Enter' && C.idx >= 0) { e.preventDefault(); pick(k, C.rows[C.idx].v); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
  });
  form.addEventListener('click', e => {
    const o = e.target.closest('[data-copt]'); if (o) { const k = C.open; if (k) pick(k, C.rows[+o.dataset.copt].v); return; }
    if (e.target.closest('[data-cother]')) { const k = C.open; close(); const inp = form.elements[k]; inp.value = ''; inp.placeholder = 'Type your own'; inp.focus(); return; }
    const ob = e.target.closest('[data-combo-open]'); if (ob) { e.preventDefault(); const k = ob.dataset.comboOpen; if (C.open === k) close(); else { form.elements[k].focus(); openC(k); } }
  });
  return { close };
}
function wirePhotos(form, fields, vals) {
  form._ph = {}; form._phNew = [];
  fields.filter(f => f.t === 'photos').forEach(f => {
    form._ph[f.k] = [...(Array.isArray(vals[f.k]) ? vals[f.k] : vals[f.k] ? [vals[f.k]] : [])];
    const row = $(`[data-phrow="${f.k}"]`, form), file = $(`[data-phfile="${f.k}"]`, form);
    const paintRow = () => { row.innerHTML = form._ph[f.k].map((id, i) => `<div class="ph sm"><img data-ph="${id}" alt=""><button type="button" class="ph-x" data-phdel="${f.k}:${i}" aria-label="Remove photo">${I.close}</button></div>`).join('')
      + (f.single && form._ph[f.k].length ? '' : `<button type="button" class="ph-add" data-phadd="${f.k}">${I.camera}<span>${esc(f.addL || 'Add photo')}</span></button>`); paintPhotos(row); };
    paintRow();
    file.onchange = async () => {
      const files = [...file.files]; file.value = ''; if (!files.length) return;
      toast(files.length > 1 ? `Saving ${files.length} photos…` : 'Saving photo…');
      for (const fl of files) { try { const id = await Photos.add(fl); form._phNew.push(id); if (f.single) form._ph[f.k] = [id]; else form._ph[f.k].push(id); } catch (e) { console.warn(e); toast('Couldn’t read that photo'); } }
      paintRow();
    };
    row.addEventListener('click', e => {
      if (e.target.closest(`[data-phadd="${f.k}"]`)) { e.preventDefault(); file.click(); }
      const x = e.target.closest('[data-phdel]'); if (x) { e.preventDefault(); const i = +x.dataset.phdel.split(':')[1]; form._ph[f.k].splice(i, 1); paintRow(); }
    });
  });
}
function openForm({ title, fields, values = {}, onSave, onDelete, saveLabel = 'Save', isNew, onReady, top = '' }) {
  const d = $('#sheet'), form = $('#sheetForm');
  form.innerHTML = `<div class="sheet-head"><h3>${esc(title)}</h3><button type="button" class="icon-btn" data-close aria-label="Close">${I.close}</button></div>
    <div class="sheet-body">${top}${fields.map(f => fieldHTML(f, values)).join('')}
    ${onDelete ? `<button type="button" class="btn ghost-danger block" data-del style="margin-top:6px">${I.trash} Delete</button>` : ''}</div>
    <div class="sheet-foot"><button type="button" class="btn" data-close>Cancel</button><button type="submit" class="btn primary">${I.check} ${esc(saveLabel)}</button></div>`;
  const before = JSON.stringify(values.photos || []) + JSON.stringify(values.receipt || []);
  const applyShow = () => { const vals = readForm(form, fields); fields.forEach(f => { const el = $(`[data-k="${f.k}"]`, form); if (!el) return; if (f.showIf) el.hidden = !f.showIf(vals); if (f.lblFn) { const l = $('.lbl', el); if (l) l.textContent = f.lblFn(vals) + (f.req || f.reqFn?.(vals) ? ' *' : ''); } }); };
  const combos = wireCombos(form, fields, applyShow);
  wirePhotos(form, fields, values);
  let saved = false;
  if (onReady) onReady(form, applyShow);
  applyShow();
  form.oninput = () => applyShow();
  form.onchange = () => applyShow();
  form.onclick = async e => {
    if (e.target.closest('[data-close]')) { e.preventDefault(); d.close(); }
    if (e.target.closest('[data-del]')) { e.preventDefault(); if (await confirmDanger('Delete this?', 'This can’t be undone. Export a backup first if you might want it back.')) { saved = true; onDelete(); d.close(); render(); toast('Deleted'); } }
  };
  d.onclose = () => { combos.close(); if (!saved) (form._phNew || []).forEach(id => Photos.del(id)); d.onclose = null; };
  form.onsubmit = e => {
    e.preventDefault();
    const vals = readForm(form, fields);
    fields.forEach(f => { if (f.showIf && !f.showIf(vals)) delete vals[f.k]; });
    const miss = fields.find(f => (f.req || f.reqFn?.(vals)) && (vals[f.k] == null || vals[f.k] === '') && (!f.showIf || f.showIf(vals)));
    if (miss) { toast(`${(miss.lblFn ? miss.lblFn(vals) : miss.l)} is required`); const el = form.elements[miss.k]; if (el && el.focus) el.focus(); return; }
    if (onSave(vals, form) === false) return;
    saved = true;
    // photos removed in this edit are deleted from storage
    const kept = new Set([...(vals.photos || []), ...(vals.receipt || [])]);
    JSON.parse('[' + before.replace('][', '],[') + ']').flat().forEach(id => { if (!kept.has(id)) Photos.del(id); });
    save(); d.close(); render();
  };
  d.onclick = e => { if (e.target === d) d.close(); };
  d.showModal();
  $('.sheet-body', form).scrollTop = 0;
  return form;
}

/* ---------- item form ---------- */
const usedVals = k => [...new Set(db.items.map(x => x[k]).filter(Boolean))];
const brandOpts = () => [...new Set([...TAX.BRANDS, ...usedVals('brand'), ...db.custom.map(c => c.brand)])];
const platOpts = vals => { const b = vals.brand || ''; const own = brandPlatforms(b).map(p => p.name); const used = db.items.filter(x => (x.brand || '').toLowerCase() === b.toLowerCase()).map(x => platLabel(x.platform, x)); return [...new Set([...own, ...used])]; };
const typeOpts = vals => { const k = kindByL(vals.kindL); const base = k === 'battery' ? ['Battery', 'Battery & charger kit'] : k === 'charger' ? ['Charger / power'] : TAX.TYPES.filter(t => t !== 'Battery' && t !== 'Charger / power'); return [...new Set([...base, ...usedVals('type')])]; };
const kitOpts = () => [['', '— Not part of a kit —'], ...db.kits.map(k => [k.id, `${k.name}${k.price != null ? ` (${money0(k.free ? 0 : k.price)})` : ''}`]), ['__new', '＋ New kit / bundle…']];
const ITEM_FIELDS = [
  { t: 'h', l: 'What is it' },
  { k: 'kindL', l: 'Kind', t: 'seg', opts: KINDS.map(x => x[1]) },
  { k: 'brand', l: 'Brand', t: 'combo', half: 1, req: 1, opts: brandOpts, ph: 'RYOBI, Milwaukee…' },
  { k: 'platformL', l: 'Battery platform', t: 'combo', half: 1, opts: platOpts, ph: 'ONE+ 18V, M18…', hint: '' },
  { k: 'name', l: 'Name', t: 'text', req: 1, ph: 'e.g. M18 FUEL 1/2" Hammer Drill/Driver' },
  { k: 'model', l: 'Model #', t: 'text', half: 1, caps: 1, ph: 'e.g. 2904-20' },
  { k: 'type', l: 'Tool type', t: 'combo', half: 1, opts: typeOpts, ph: 'Pick or type' },
  { k: 'line', l: 'Line / series', t: 'text', half: 1, ph: 'FUEL, HP, Brushless…' },
  { k: 'voltage', l: 'Voltage', t: 'num', half: 1, unit: 'V' },
  { k: 'ah', l: 'Capacity', t: 'num', half: 1, unit: 'Ah', showIf: x => kindByL(x.kindL) === 'battery' },
  { k: 'batType', l: 'Battery type', t: 'combo', half: 1, opts: v => [...(BAT_TYPES[v.brand] || [...BAT_TYPES.RYOBI, ...BAT_TYPES.Milwaukee]), ...usedVals('batType')], showIf: x => kindByL(x.kindL) === 'battery', ph: 'HIGH OUTPUT, FORGE…' },
  { k: 'inService', l: 'In service since', t: 'date', half: 1, showIf: x => kindByL(x.kindL) === 'battery' },
  { k: 'cycles', l: 'Charge cycles (approx.)', t: 'num', half: 1, step: 1, showIf: x => kindByL(x.kindL) === 'battery' },
  { k: 'health', l: 'Battery health', t: 'select', opts: HEALTH, showIf: x => kindByL(x.kindL) === 'battery' },
  { t: 'h', l: 'Purchase' },
  { k: 'kitId', l: 'Part of a kit / bundle?', t: 'select', opts: kitOpts, hint: 'Bought as a kit? Put every piece in the same kit and the kit price is split across them.' },
  { k: 'kitName', l: 'Kit name', t: 'text', showIf: x => x.kitId === '__new', reqFn: x => x.kitId === '__new', ph: 'e.g. M18 FUEL 2-Tool Combo Kit' },
  { k: 'kitModel', l: 'Kit model #', t: 'text', half: 1, caps: 1, showIf: x => x.kitId === '__new' },
  { k: 'kitPrice', l: 'Kit price paid', t: 'num', half: 1, pre: '$', showIf: x => x.kitId === '__new' && !x.kitFree },
  { k: 'kitFree', l: 'Kit was free / a gift', t: 'check', showIf: x => x.kitId === '__new' },
  { k: 'purchased', l: 'Purchase date', t: 'date', half: 1 },
  { k: 'store', l: 'Store', t: 'combo', half: 1, opts: () => [...new Set([...usedVals('store'), ...db.kits.map(k => k.store).filter(Boolean), ...STORES])], ph: 'Where you bought it' },
  { k: 'price', l: 'Price paid', t: 'num', half: 1, pre: '$', showIf: x => !x.kitId && !x.free, hint: 'Out-the-door, with tax if you know it.' },
  { k: 'kitShare', l: 'Share of kit price', t: 'num', half: 1, pre: '$', showIf: x => x.kitId && x.kitId !== '__new', hint: 'Optional. Blank splits the kit price evenly.' },
  { k: 'free', l: 'Free / gift / came free', t: 'check', sub: 'Counts as $0. Use the kit option instead if it came in a kit.', showIf: x => !x.kitId },
  { k: 'warrantyMo', l: 'Warranty', t: 'num', half: 1, step: 1, unit: 'months', hint: 'From the box or the maker’s site, e.g. 60 for 5 years.' },
  { k: 'serial', l: 'Serial #', t: 'text', half: 1, caps: 1, hint: 'On the tool’s label. Key for theft and insurance claims.' },
  { t: 'h', l: 'Where & condition' },
  { k: 'condition', l: 'Condition', t: 'seg', opts: CONDITIONS },
  { k: 'location', l: 'Location', t: 'combo', half: 1, opts: () => [...new Set([...usedVals('location'), ...LOCATIONS])] },
  { k: 'status', l: 'Status', t: 'select', half: 1, opts: STATUSES },
  { k: 'loanedTo', l: 'Loaned to', t: 'text', half: 1, ph: 'Who has it?' },
  { k: 'loanedOn', l: 'Loaned on', t: 'date', half: 1, showIf: x => !!x.loanedTo },
  { k: 'photos', l: 'Photos', t: 'photos', addL: 'Add photo', hint: 'Stored on this device only, compressed.' },
  { k: 'receipt', l: 'Receipt', t: 'photos', single: 1, addL: 'Receipt photo' },
  { k: 'notes', l: 'Notes', t: 'textarea', ph: 'Accessories, repairs, anything' },
];
function itemForm(existing, preset = {}) {
  const it = existing || null;
  const vals = it ? { ...it, kindL: kindL(it.kind), platformL: platLabel(it.platform, it), receipt: it.receipt ? [it.receipt] : [] }
    : { kindL: kindL(preset.kind || 'tool'), condition: 'New', status: 'Active', purchased: todayISO(), photos: [], receipt: [], ...preset, platformL: preset.platform ? platLabel(preset.platform, preset) : preset.platformL || '' };
  if (!it && preset.kitId && kitById(preset.kitId)) { const k = kitById(preset.kitId); vals.purchased = k.purchased || vals.purchased; vals.store = k.store || vals.store; vals.warrantyMo = vals.warrantyMo ?? k.warrantyMo; }
  const src = preset.src || (it && it.src);
  const top = !it && preset.catId ? `<div class="catpick"><span class="otag ${preset.mine ? 'mine' : 'cat'}">${preset.mine ? 'my own' : 'catalog'}</span><b>${esc(preset.name)}</b><small>${esc([preset.brand, preset.platform && platLabel(preset.platform), preset.model].filter(Boolean).join(' · '))}</small>${preset.includes?.length ? `<div class="incl"><b>Came in the box</b>${preset.includes.map((x, i) => `<label class="pick-all"><input type="checkbox" name="inc_${i}" checked> ${x.qty > 1 ? x.qty + '× ' : ''}${esc(x.n)} <small class="muted">${esc(x.m)}</small></label>`).join('')}<small class="muted">Checked pieces are added too, grouped in one kit so the price is split across them.</small></div>` : ''}</div>` : '';
  openForm({
    title: it ? 'Edit item' : 'Add item', fields: ITEM_FIELDS, values: vals, isNew: !it, top, saveLabel: it ? 'Save' : 'Add to inventory',
    onReady: (form, refresh) => {
      // fresh kit when this catalog product came with pieces
      if (!it && preset.includes?.length && !preset.kitId) { setField(form, 'kitId', '__new'); setField(form, 'kitName', preset.name); setField(form, 'kitModel', preset.model); }
      form.addEventListener('change', e => { if (e.target.name && e.target.name.startsWith('inc_')) { const anyInc = $$('input[name^="inc_"]:checked', form).length; if (anyInc && form.elements.kitId.value === '') { setField(form, 'kitId', '__new'); setField(form, 'kitName', preset.name); setField(form, 'kitModel', preset.model); } refresh(); } });
    },
    onSave: (v, form) => {
      const kind = kindByL(v.kindL);
      let kitId = v.kitId || '';
      if (kitId === '__new') {
        if (!v.kitFree && !(v.kitPrice > 0)) { toast('Enter the kit price you paid, or tick “Kit was free / a gift”'); form.elements.kitPrice?.focus(); return false; }
        const k = { id: uid(), name: v.kitName, model: v.kitModel || '', brand: v.brand, price: v.kitFree ? 0 : v.kitPrice, free: !!v.kitFree, purchased: v.purchased, store: v.store, warrantyMo: v.warrantyMo, created: new Date().toISOString(), updated: new Date().toISOString() };
        db.kits.push(k); kitId = k.id;
      }
      if (!kitId && !v.free && !(v.price > 0)) {
        if (!it || !missingPrice(it) || v.price === 0) { toast(v.price === 0 ? 'For $0, tick “Free / gift / came free”' : 'Enter the price you paid, or tick “Free / gift / came free”'); form.elements.price?.focus(); return false; }
      }
      const pKey = platKey(v.brand, v.platformL);
      const rec = { ...(it || {}), kind, brand: v.brand, platform: pKey, platformL: PL[pKey] ? '' : v.platformL, name: v.name, model: v.model, type: v.type || (kind === 'battery' ? 'Battery' : kind === 'charger' ? 'Charger / power' : ''), line: v.line, voltage: v.voltage,
        ah: kind === 'battery' ? v.ah : null, batType: kind === 'battery' ? v.batType : '', inService: kind === 'battery' ? v.inService : '', cycles: kind === 'battery' ? v.cycles : null, health: kind === 'battery' ? v.health : '',
        kitId, kitShare: kitId ? v.kitShare : null, purchased: v.purchased, store: v.store, price: kitId ? null : (v.free ? 0 : v.price), free: kitId ? false : !!v.free, warrantyMo: v.warrantyMo, serial: v.serial,
        condition: v.condition, location: v.location, status: v.status || 'Active', loanedTo: v.loanedTo, loanedOn: v.loanedTo ? (v.loanedOn || todayISO()) : '', photos: v.photos || [], receipt: (v.receipt || [])[0] || '', notes: v.notes, updated: new Date().toISOString() };
      // a catalog kit with its pieces ticked is stored as the kit + its pieces, not as an extra "kit" item (no double counting)
      const nInc = (preset.includes || []).filter((x, i) => form.elements['inc_' + i]?.checked).length;
      const kitOnly = !it && nInc > 0 && v.kitId === '__new';
      if (!it && !kitOnly) { rec.id = uid(); rec.created = rec.updated; if (preset.catId) { rec.catId = preset.catId; rec.src = src || ''; } if (preset.alsoP) rec.alsoP = preset.alsoP; db.items.push(rec); }
      else if (it) Object.assign(it, rec);
      // remember non-catalog products for next time
      if (!preset.catId && !it && v.name && v.brand) {
        const key = norm(v.brand) + '|' + norm(v.model || v.name);
        if (!db.custom.some(c => norm(c.brand) + '|' + norm(c.model || c.name) === key)) db.custom.push({ id: uid(), brand: v.brand, platform: pKey, platformL: rec.platformL, kind, type: rec.type, model: v.model, name: v.name, voltage: v.voltage, ah: rec.ah, batType: rec.batType, line: v.line, created: rec.updated, updated: rec.updated });
      }
      // add the checked "in the box" pieces
      let extra = 0;
      (preset.includes || []).forEach((x, i) => { if (!form.elements['inc_' + i]?.checked) return; for (let q = 0; q < (x.qty || 1); q++) { const c = x.cat; db.items.push({ id: uid(), kind: c ? c.k || 'tool' : 'tool', brand: v.brand, platform: c ? c.p : pKey, name: c ? c.n : x.n, model: x.m, type: c ? c.t : '', line: c ? c.l || '' : '', voltage: c ? c.v ?? null : null, ah: c ? c.ah ?? null : null, batType: c ? c.bt || '' : '', alsoP: c && c.p2 ? c.p2 : undefined, kitId, purchased: v.purchased, store: v.store, warrantyMo: c && c.w ? c.w : v.warrantyMo, condition: v.condition, location: v.location, status: 'Active', photos: [], catId: c ? c.id : '', src: c ? c.u : '', created: rec.updated, updated: rec.updated, inService: c && c.k === 'battery' ? v.purchased : '' }); extra++; } });
      if (kitOnly) { const k = kitById(kitId); if (k && preset.catId) { k.catId = preset.catId; k.src = src || ''; } }
      toast(it ? 'Saved' : kitOnly ? `Added ${plural(extra, 'item')} in one kit` : extra ? `Added ${plural(extra + 1, 'item')} in one kit` : 'Added to your arsenal');
      if (!it) setTimeout(() => { location.hash = kitOnly ? '#/kit/' + kitId : '#/item/' + rec.id; }, 0);
    },
    onDelete: it ? () => { (it.photos || []).concat(it.receipt || []).forEach(id => Photos.del(id)); db.items = db.items.filter(x => x !== it); } : null,
  });
}
function kitForm(k) {
  const F = [
    { k: 'name', l: 'Kit name', t: 'text', req: 1 }, { k: 'model', l: 'Kit model #', t: 'text', half: 1, caps: 1 }, { k: 'brand', l: 'Brand', t: 'combo', half: 1, opts: brandOpts },
    { k: 'price', l: 'Kit price paid', t: 'num', half: 1, pre: '$', showIf: x => !x.free }, { k: 'free', l: 'Free / gift', t: 'check' },
    { k: 'purchased', l: 'Purchase date', t: 'date', half: 1 }, { k: 'store', l: 'Store', t: 'combo', half: 1, opts: () => [...new Set([...usedVals('store'), ...STORES])] },
    { k: 'warrantyMo', l: 'Warranty', t: 'num', half: 1, unit: 'months', step: 1, hint: 'Used for pieces that don’t have their own.' },
    { k: 'receipt', l: 'Receipt', t: 'photos', single: 1, addL: 'Receipt photo' }, { k: 'notes', l: 'Notes', t: 'textarea' },
  ];
  openForm({ title: k ? 'Edit kit' : 'New kit', fields: F, values: k ? { ...k, receipt: k.receipt ? [k.receipt] : [] } : { purchased: todayISO() }, isNew: !k,
    onSave: (v, form) => {
      if (!v.free && !(v.price > 0)) { toast('Enter the kit price you paid, or tick “Free / gift”'); form.elements.price?.focus(); return false; }
      const rec = { ...(k || {}), ...v, price: v.free ? 0 : v.price, receipt: (v.receipt || [])[0] || '', updated: new Date().toISOString() };
      if (k) Object.assign(k, rec); else { rec.id = uid(); rec.created = rec.updated; db.kits.push(rec); setTimeout(() => { location.hash = '#/kit/' + rec.id; }, 0); }
      toast('Kit saved');
    },
    onDelete: k ? () => { kitItems(k).forEach(x => { x.kitId = ''; x.price = itemCost(x); x.updated = new Date().toISOString(); }); db.kits = db.kits.filter(x => x !== k); if (k.receipt) Photos.del(k.receipt); } : null });
}

/* ---------- add from catalog ---------- */
const PK = { brand: 'RYOBI', plat: '', type: '', q: '', kind: '' };
async function addFlow(preset = {}) {
  const d = $('#sheet'), form = $('#sheetForm');
  if (preset.brand) PK.brand = preset.brand; if (preset.plat !== undefined) PK.plat = preset.plat; PK.type = ''; PK.q = ''; PK.kind = preset.kind || '';
  form.innerHTML = `<div class="sheet-head"><h3>Add to your arsenal</h3><button type="button" class="icon-btn" data-close aria-label="Close">${I.close}</button></div>
    <div class="sheet-body picker" id="picker"><div class="combo-note">Loading the catalog…</div></div>
    <div class="sheet-foot"><button type="button" class="btn" data-close>Cancel</button><button type="button" class="btn primary" data-own>${I.edit} Add my own</button></div>`;
  form.onsubmit = e => e.preventDefault(); form.oninput = null; form.onchange = null;
  d.onclose = null; d.onclick = e => { if (e.target === d) d.close(); };
  form.onclick = e => {
    if (e.target.closest('[data-close]')) { e.preventDefault(); d.close(); return; }
    if (e.target.closest('[data-own]')) { e.preventDefault(); d.close(); setTimeout(() => itemForm(null, { brand: PK.brand === 'Other' ? '' : PK.brand, platform: PK.plat && PL[PK.plat] ? PK.plat : '', kind: PK.kind || 'tool', kitId: preset.kitId }), 60); return; }
    const b = e.target.closest('[data-pk]'); if (b) { e.preventDefault(); const [k, v] = b.dataset.pk.split('='); PK[k] = PK[k] === v && k !== 'brand' ? '' : v; if (k === 'brand') { PK.plat = ''; PK.type = ''; } if (k === 'plat') PK.type = ''; paintPicker(); return; }
    const r = e.target.closest('[data-cat]'); if (r) { e.preventDefault(); chooseCat(r.dataset.cat, preset); }
  };
  if (!d.open) d.showModal();
  try { await loadCatalog(); } catch (e) { $('#picker').innerHTML = `<div class="empty"><div class="big">Catalog unavailable</div><p>You’re offline and the catalog hasn’t been saved on this device yet. You can still add anything with <b>Add my own</b>.</p></div>`; return; }
  paintPicker(true);
}
function pickerPool() {
  const all = [...CAT.items, ...customAsCat()];
  return all.filter(x => (PK.brand === 'Other' ? !TAX.BRANDS.includes(x.b) : x.b === PK.brand) && (!PK.kind || (x.k || 'tool') === PK.kind || (PK.kind === 'battery' && x.t === 'Battery & charger kit')));
}
function paintPicker(first) {
  const box = $('#picker'); if (!box) return;
  const pool = pickerPool();
  const plats = PK.brand === 'Other' ? [] : brandPlatforms(PK.brand).map(p => [p.id, p.short || p.name, pool.filter(x => x.p === p.id).length]).filter(x => x[2]);
  const inPlat = pool.filter(x => !PK.plat || x.p === PK.plat);
  const types = [...new Set(inPlat.map(x => x.t))].map(t => [t, inPlat.filter(x => x.t === t).length]).sort((a, b) => TAX.GROUPS.indexOf(TAX.groupOf(a[0])) - TAX.GROUPS.indexOf(TAX.groupOf(b[0])) || b[1] - a[1]);
  const q = norm(PK.q), qq = q.replace(/[^a-z0-9]/g, '');
  let rows = inPlat.filter(x => !PK.type || x.t === PK.type);
  if (q) rows = rows.filter(x => q.split(' ').every(w => x._s.includes(w)) || (qq.length > 2 && x._s.includes(qq)));
  rows.sort((a, b) => (b.mine || 0) - (a.mine || 0) || (q && String(a.m).toLowerCase().startsWith(q) ? -1 : 0) || String(a.n).localeCompare(String(b.n)));
  const shown = rows.slice(0, 120);
  const chip = (k, v, l, n, on) => `<button type="button" class="pchip${on ? ' on' : ''}" data-pk="${k}=${esc(v)}">${esc(l)}${n != null ? `<small>${fmt(n)}</small>` : ''}</button>`;
  const html = `
    <div class="pk-row brands">${[...TAX.BRANDS, 'Other'].map(b => chip('brand', b, b === 'Other' ? 'Other brands' : b, null, PK.brand === b)).join('')}</div>
    <div class="pk-row">${chip('kind', '', 'Everything', null, !PK.kind)}${chip('kind', 'tool', 'Tools', null, PK.kind === 'tool')}${chip('kind', 'battery', 'Batteries', null, PK.kind === 'battery')}${chip('kind', 'charger', 'Chargers', null, PK.kind === 'charger')}</div>
    ${plats.length ? `<div class="pk-lbl">Platform</div><div class="pk-row scroll">${plats.map(([id, l, n]) => chip('plat', id, l, n, PK.plat === id)).join('')}</div>` : ''}
    ${types.length > 1 ? `<div class="pk-lbl">Type</div><div class="pk-row scroll">${types.map(([t, n]) => chip('type', t, t, n, PK.type === t)).join('')}</div>` : ''}
    <label class="search pk-search">${I.search}<input type="search" id="pkq" value="${esc(PK.q)}" placeholder="Search name or model #" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" aria-label="Search the catalog"></label>
    <div class="pick-results" role="list">${shown.map(x => `<button type="button" class="prow" role="listitem" data-cat="${esc(x.id)}"><span class="sicon">${KIND_IC[x.k || 'tool']}</span><span class="pr-main"><b>${esc(x.n)}</b><small>${esc([x.m, PL[x.p] ? PL[x.p].short : x.p, x.ah ? x.ah + 'Ah' : '', x.bt].filter(Boolean).join(' · '))}</small></span>${x.mine ? '<span class="otag mine">my own</span>' : x.kit ? '<span class="otag">kit</span>' : ''}</button>`).join('')
      || `<div class="empty"><div class="big">Nothing matches</div><p>${PK.brand === 'Other' ? 'Other brands aren’t in the catalog. Tap <b>Add my own</b> and type it in; it’s saved for next time.' : 'Try fewer words, or tap <b>Add my own</b>.'}</p></div>`}
      ${rows.length > shown.length ? `<div class="combo-note">${fmt(rows.length - shown.length)} more. Keep typing or pick a type to narrow.</div>` : ''}</div>
    <p class="muted pk-foot">${PK.brand === 'Other' ? '' : `${fmt(pool.filter(x => !x.mine).length)} ${esc(PK.brand)} products from ${esc(PK.brand === 'RYOBI' ? 'ryobitools.com' : 'milwaukeetool.com')}, checked ${esc(CAT.generated || '')}.`}</p>`;
  const had = document.activeElement && document.activeElement.id === 'pkq', pos = had ? document.activeElement.selectionStart : null;
  box.innerHTML = html;
  const inp = $('#pkq');
  inp.oninput = () => { PK.q = inp.value; clearTimeout(paintPicker.t); paintPicker.t = setTimeout(() => paintPicker(), 120); };
  if (had) { inp.focus(); try { inp.setSelectionRange(pos, pos); } catch (e) { /* ignore */ } }
  if (first) box.scrollTop = 0;
}
function chooseCat(id, preset = {}) {
  const x = id.startsWith('my:') ? customAsCat().find(c => c.id === id) : CAT.items.find(c => c.id === id); if (!x) return;
  const includes = (x.inc || []).map(([m, qty]) => { const c = catByModel(x.b, m); return { m, qty, n: c ? c.n : m, cat: c }; }).filter(i => i.m !== x.m);
  $('#sheet').close();
  setTimeout(() => itemForm(null, { catId: x.id, mine: x.mine, brand: x.b, platform: x.p, platformL: x.mine ? x.p && !PL[x.p] ? x.p.split(':').slice(2).join(' ') : '' : '', name: x.n, model: x.m, type: x.t, kind: x.k || 'tool', line: x.l || '', voltage: x.v ?? (PL[x.p] && PL[x.p].v) ?? null, ah: x.ah ?? null, batType: x.bt || '', warrantyMo: x.w ?? null, src: x.u, alsoP: x.p2, includes: preset.kitId ? [] : includes, kitId: preset.kitId || '' }), 60);
}

/* ---------- views ---------- */
const thumb = (it, cls = '') => it.photos && it.photos[0] ? `<span class="ph ${cls}"><img data-ph="${esc(it.photos[0])}" alt=""></span>` : `<span class="sicon k-${it.kind}">${KIND_IC[it.kind] || I.box}</span>`;
function itemRow(it) {
  const w = warrantyState(it), c = itemCost(it);
  const tags = [it.kind === 'battery' && it.ah ? `<span class="tag accent">${fmt(it.ah, it.ah % 1 ? 1 : 0)}Ah${it.batType ? ' ' + esc(it.batType) : ''}</span>` : '',
    it.loanedTo ? `<span class="tag warn">Loaned · ${esc(it.loanedTo)}</span>` : '', w.level === 'soon' ? '<span class="tag warn">Warranty ending</span>' : '',
    !active(it) ? `<span class="tag">${esc(it.status)}</span>` : '', it.kitId ? `<span class="tag">Kit</span>` : '', missingPrice(it) ? '<span class="tag warn">No price</span>' : ''].join('');
  return `<a class="entry" href="#/item/${it.id}">${thumb(it)}<div class="e-main"><b>${esc(itemTitle(it))}</b><div class="e-sub">${esc(itemSub(it))}</div>${tags ? `<div class="tags">${tags}</div>` : ''}</div>
    <div class="e-side"><b>${c != null ? money0(c) : '—'}</b><small>${esc(it.location || '')}</small></div></a>`;
}
const bars = (rows, total, fmtV = v => fmt(v)) => `<div class="bars">${rows.map(([l, v, sub, href]) => `<a class="bar-row" ${href ? `href="${href}"` : ''}><span class="bl">${esc(l)}${sub ? `<small>${esc(sub)}</small>` : ''}</span><span class="bt"><i style="width:${total ? Math.max(3, Math.round(v / total * 100)) : 0}%"></i></span><b>${fmtV(v)}</b></a>`).join('')}</div>`;
const groupBy = (list, fn) => { const m = new Map(); list.forEach(x => { const k = fn(x); if (!m.has(k)) m.set(k, []); m.get(k).push(x); }); return m; };
function platStats() {
  const act = db.items.filter(active), m = new Map();
  const get = (id, it) => { if (!m.has(id)) m.set(id, { id, label: platFull(id, it), brand: PL[id] ? PL[id].brand : it.brand, none: platNone(id), bats: [], tools: [], chargers: [], other: [] }); return m.get(id); };
  act.forEach(it => {
    if (!it.platform) return;
    const s = get(it.platform, it);
    if (it.kind === 'battery') s.bats.push(it); else if (it.kind === 'charger') s.chargers.push(it); else if (it.kind === 'tool') s.tools.push(it); else s.other.push(it);
    if (it.kind === 'charger') (it.alsoP || []).forEach(p => { if (PL[p] || p) get(p, it).chargers.push(it); });
  });
  const order = id => { const i = TAX.PLATFORMS.findIndex(p => p.id === id); return i < 0 ? 99 : i; };
  return [...m.values()].sort((a, b) => order(a.id) - order(b.id) || a.label.localeCompare(b.label));
}
function reminders() {
  const out = [];
  db.items.filter(active).forEach(it => {
    const w = warrantyState(it);
    if (w.level === 'soon' || (w.level === 'over' && w.d >= -30)) out.push({ key: 'w:' + it.id + ':' + w.end, it, level: w.level, t: w.level === 'soon' ? `Warranty ends ${fdate(w.end)}` : `Warranty ended ${fdate(w.end)}` });
    if (it.loanedTo && it.loanedOn && daysBetween(it.loanedOn, todayISO()) >= 30) out.push({ key: 'l:' + it.id + ':' + it.loanedOn, it, level: 'soon', t: `Loaned to ${it.loanedTo} for ${plural(daysBetween(it.loanedOn, todayISO()), 'day')}` });
  });
  return out.sort((a, b) => (a.level === 'over') - (b.level === 'over'));
}
function emptyState() {
  return `<section class="card empty-hero"><div class="hero-empty"></div><div class="big">Your arsenal starts here</div>
    <p class="muted">Log every tool, battery and charger: serials, price paid, warranty, where it lives and who borrowed it. RYOBI and Milwaukee catalogs are built in.</p>
    <div class="btn-row"><button class="btn primary" data-act="add">${I.plus} Add your first tool</button><button class="btn" data-act="sample">Try sample data</button></div></section>`;
}
function viewDash() {
  const act = db.items.filter(active);
  if (!db.items.length) return emptyState() + rzFoot();
  const total = totalValue(act), tools = act.filter(x => x.kind === 'tool').length, bats = act.filter(x => x.kind === 'battery');
  const byBrand = [...groupBy(act, x => x.brand || 'Unknown')].map(([b, l]) => [b, l.reduce((t, x) => t + (itemCost(x) || 0), 0), `${plural(l.length, 'item')}`, '#/tools?g=brand&f=' + encodeURIComponent(b)]).sort((a, b) => b[1] - a[1]);
  const byType = [...groupBy(act.filter(x => x.kind === 'tool'), x => TAX.groupOf(x.type))].map(([g, l]) => [g, l.length, '', '#/tools?g=type&f=' + encodeURIComponent(g)]).sort((a, b) => b[1] - a[1]);
  const ps = platStats().filter(p => !p.none);
  const rem = reminders(), loaned = act.filter(x => x.loanedTo), noPrice = act.filter(missingPrice), noSerial = act.filter(x => x.kind !== 'other' && !x.serial).length;
  const ahTot = bats.reduce((t, x) => t + (num(x.ah) || 0), 0);
  return `${joinCoach()}
  <section class="card hero dash-hero"><div class="hero-top"><div><div class="eyebrow">Arsenal value</div><div class="big-num">${money(total, 0)}</div><small class="muted">price paid, ${plural(act.length, 'active item')}${db.kits.length ? ` · ${plural(db.kits.length, 'kit')}` : ''}</small></div></div>
    <div class="stats">${stat('Tools', fmt(tools))}${stat('Batteries', fmt(bats.length), ahTot ? ` · ${fmt(ahTot, ahTot % 1 ? 1 : 0)}Ah` : '')}${stat('Chargers', fmt(act.filter(x => x.kind === 'charger').length))}</div>
    <div class="row-actions"><button class="btn primary" data-act="add">${I.plus} Add</button><a class="btn" href="#/export">${I.shield} Insurance list</a></div></section>
  ${rem.length ? `<section class="card"><div class="card-head"><h3>${I.bell} Heads up</h3><span class="tag warn">${fmt(rem.length)}</span></div><div class="list">${rem.slice(0, 6).map(r => `<a class="srow" href="#/item/${r.it.id}">${thumb(r.it)}<div class="sbody"><b>${esc(itemTitle(r.it))}</b><small>${esc(r.t)}</small></div><span class="pill ${r.level}">${r.level === 'over' ? 'Expired' : 'Soon'}</span></a>`).join('')}</div></section>` : ''}
  <section class="card"><div class="card-head"><h3>${I.battery} Battery platforms</h3><a href="#/power" class="link sm">All ${I.right}</a></div>
    ${ps.length ? `<div class="plat-tiles">${ps.map(p => `<a class="plat-tile b-${esc(norm(p.brand).replace(/\s/g, '-'))}" href="#/power#${esc(p.id)}"><span class="pt-name">${esc(p.label)}</span><span class="pt-big">${fmt(p.bats.length)}<small> batt${p.bats.length === 1 ? '' : 's'}</small></span><span class="pt-sub">${fmt(p.bats.reduce((t, x) => t + (num(x.ah) || 0), 0), 1)}Ah · ${plural(p.tools.length, 'tool')}</span>${p.tools.length && !p.bats.length ? '<span class="tag warn">No batteries logged</span>' : ''}</a>`).join('')}</div>` : '<p class="muted">Add tools and batteries to see which platforms you run.</p>'}</section>
  <section class="card"><div class="card-head"><h3>By brand</h3><a href="#/tools?g=brand" class="link sm">Inventory ${I.right}</a></div>${bars(byBrand, Math.max(...byBrand.map(x => x[1]), 1), v => money0(v))}</section>
  ${byType.length ? `<section class="card"><div class="card-head"><h3>By tool type</h3><a href="#/tools?g=type" class="link sm">Inventory ${I.right}</a></div>${bars(byType, Math.max(...byType.map(x => x[1]), 1))}</section>` : ''}
  ${loaned.length ? `<section class="card"><h3>${I.hand} Loaned out</h3><div class="list">${loaned.map(itemRow).join('')}</div></section>` : ''}
  ${noPrice.length || noSerial ? `<section class="card"><h3>Make your list claim-ready</h3><ul class="insights">${noPrice.length ? `<li class="warn">${plural(noPrice.length, 'item')} ${noPrice.length === 1 ? 'has' : 'have'} no price paid. Insurers ask for it.</li>` : ''}${noSerial ? `<li class="warn">${plural(noSerial, 'item')} ${noSerial === 1 ? 'has' : 'have'} no serial number. Snap the label and add it.</li>` : ''}<li>Add a photo of each tool and the receipt. Photos stay on this device.</li></ul></section>` : ''}
  <section class="card"><h3>Recently added</h3><div class="list">${[...db.items].sort((a, b) => String(b.created).localeCompare(String(a.created))).slice(0, 4).map(itemRow).join('')}</div></section>
  ${rzFoot()}`;
}
const INV = { g: null, q: '', kind: '', f: '', retired: false };
const GROUPINGS = [['brand', 'Brand'], ['type', 'Type'], ['platform', 'Platform'], ['location', 'Location'], ['kit', 'Kit']];
const groupKey = (it, g) => g === 'brand' ? (it.brand || 'Unknown') : g === 'type' ? (it.kind === 'battery' ? 'Batteries' : it.kind === 'charger' ? 'Chargers & Power' : TAX.groupOf(it.type)) : g === 'platform' ? (it.platform ? platFull(it.platform, it) : 'No platform') : g === 'location' ? (it.location || 'No location') : (it.kitId && kitById(it.kitId) ? kitById(it.kitId).name : 'Bought on its own');
function viewTools(params) {
  if (params.g) INV.g = params.g; if (params.f !== undefined) INV.f = params.f || ''; if (params.kind !== undefined) INV.kind = params.kind;
  const g = INV.g || db.settings.group || 'brand';
  if (!db.items.length) return emptyState();
  const q = norm(INV.q);
  let list = db.items.filter(x => (INV.retired || active(x)) && (!INV.kind || x.kind === INV.kind));
  if (q) list = list.filter(x => q.split(' ').every(w => norm([x.name, x.model, x.brand, platLabel(x.platform, x), x.type, x.serial, x.location, x.loanedTo, x.notes, x.store].join(' ')).includes(w)));
  if (INV.f) list = list.filter(x => groupKey(x, g) === INV.f || (g === 'platform' && itemPlats(x).some(p => platFull(p, x) === INV.f)));
  const groups = [...groupBy(list, x => groupKey(x, g))];
  const order = g === 'type' ? k => { const i = TAX.GROUPS.indexOf(k); return i < 0 ? 98 : i; } : g === 'platform' ? k => { const p = TAX.PLATFORMS.findIndex(pp => `${pp.brand} ${pp.name}` === k); return p < 0 ? 98 : p; } : () => 0;
  groups.sort((a, b) => order(a[0]) - order(b[0]) || (g === 'kit' ? (a[0] === 'Bought on its own') - (b[0] === 'Bought on its own') : 0) || b[1].length - a[1].length || a[0].localeCompare(b[0]));
  const kinds = [['', 'All'], ['tool', 'Tools'], ['battery', 'Batteries'], ['charger', 'Chargers'], ['other', 'Other']];
  const retiredN = db.items.filter(x => !active(x)).length;
  return `<div class="page-title"><h2>Inventory</h2><button class="btn small primary" data-act="add">${I.plus} Add</button></div>
    <label class="search">${I.search}<input type="search" id="invq" value="${esc(INV.q)}" placeholder="Search name, model, serial, who has it…" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Search inventory"></label>
    <div class="seg scope" role="radiogroup" aria-label="Group by">${GROUPINGS.map(([k, l]) => `<label><input type="radio" name="invg" value="${k}" ${g === k ? 'checked' : ''} data-invg><span>${l}</span></label>`).join('')}</div>
    <div class="vt-filter" role="group" aria-label="Show">${kinds.map(([k, l]) => `<label><input type="radio" name="invk" value="${k}" ${INV.kind === k ? 'checked' : ''} data-invk><span>${l}<small>${fmt(db.items.filter(x => (INV.retired || active(x)) && (!k || x.kind === k)).length)}</small></span></label>`).join('')}</div>
    ${INV.f ? `<div class="banner"><span>Showing <b>${esc(INV.f)}</b></span><button class="btn small" data-act="clearF">Show all</button></div>` : ''}
    ${groups.length ? groups.map(([k, l]) => `<div class="vt-group"><h3>${esc(k)}</h3><span class="vt-rule"></span><small class="muted">${plural(l.length, 'item')} · ${money0(l.reduce((t, x) => t + (itemCost(x) || 0), 0))}</small></div>
      ${g === 'kit' && l[0].kitId ? `<a class="kit-link" href="#/kit/${l[0].kitId}">${I.box} Open kit</a>` : ''}<div class="list">${l.sort((a, b) => (a.kind > b.kind) - (a.kind < b.kind) || String(a.name).localeCompare(String(b.name))).map(itemRow).join('')}</div>`).join('')
      : `<div class="empty"><div class="big">No matches</div><p>Try another search${INV.kind ? ' or show All' : ''}.</p></div>`}
    ${retiredN ? `<p class="muted center"><button class="btn small" data-act="toggleRetired">${INV.retired ? 'Hide' : 'Show'} ${plural(retiredN, 'sold / retired item')}</button></p>` : ''}`;
}
function viewPower() {
  const ps = platStats();
  if (!db.items.length) return emptyState();
  const card = p => {
    const ah = p.bats.reduce((t, x) => t + (num(x.ah) || 0), 0), pl = PL[p.id];
    const byAh = [...groupBy(p.bats, x => (x.ah ? fmt(x.ah, x.ah % 1 ? 1 : 0) + 'Ah' : '?Ah') + (x.batType ? ' ' + x.batType : ''))].sort((a, b) => (num(b[1][0].ah) || 0) - (num(a[1][0].ah) || 0));
    const weak = p.bats.filter(x => x.health === 'Weak' || x.health === 'Dead' || x.health === 'Fading').length;
    return `<section class="card plat-card b-${esc(norm(p.brand).replace(/\s/g, '-'))}" id="${esc(p.id)}"><div class="card-head"><h3>${esc(p.label)}</h3><a class="link sm" href="#/tools?g=platform&f=${encodeURIComponent(p.label)}">List ${I.right}</a></div>
      <div class="stats four">${stat('Batteries', fmt(p.bats.length))}${stat('Total Ah', fmt(ah, ah % 1 ? 1 : 0))}${stat('Tools', fmt(p.tools.length))}${stat('Chargers', fmt(p.chargers.length))}</div>
      ${p.tools.length && p.bats.length ? `<p class="ratio">${p.tools.length >= p.bats.length ? `${fmt(p.tools.length / p.bats.length, 1)} tools per battery` : `${fmt(p.bats.length / p.tools.length, 1)} batteries per tool`}${p.chargers.length ? '' : ' · <b>no charger logged</b>'}</p>` : p.tools.length ? `<p class="ratio warn">${plural(p.tools.length, 'tool')} but no ${esc(pl ? pl.name : p.label)} batteries logged.</p>` : ''}
      ${byAh.length ? `<div class="fhead">Batteries</div><div class="bat-chips">${byAh.map(([k, l]) => `<span class="bat-chip"><b>${l.length}×</b> ${esc(k)}</span>`).join('')}</div>` : ''}
      ${weak ? `<p class="muted" style="margin:8px 0 0">${plural(weak, 'battery', 'batteries')} marked fading, weak or dead.</p>` : ''}
      ${p.tools.length ? `<div class="fhead">Runs on these batteries</div><div class="tool-chips">${p.tools.sort((a, b) => String(a.name).localeCompare(String(b.name))).map(t => `<a href="#/item/${t.id}" class="tool-chip">${esc(t.name)}${t.model ? `<small>${esc(t.model)}</small>` : ''}</a>`).join('')}</div>` : ''}
      ${p.chargers.length ? `<div class="fhead">Chargers</div><div class="tool-chips">${p.chargers.map(t => `<a href="#/item/${t.id}" class="tool-chip">${esc(t.name)}${t.model ? `<small>${esc(t.model)}</small>` : ''}</a>`).join('')}</div>` : ''}
      ${pl && pl.note ? `<p class="muted plat-note">${esc(pl.note)}</p>` : ''}</section>`;
  };
  const live = ps.filter(p => !p.none), none = ps.filter(p => p.none);
  return `<div class="page-title"><h2>Battery platforms</h2><button class="btn small primary" data-act="addBattery">${I.plus} Battery</button></div>
    <p class="muted lead">Which tools run on which batteries, and how much power you have for each platform.</p>
    ${live.map(card).join('') || '<div class="empty"><div class="big">No battery platforms yet</div><p>Add a tool or battery with a platform like ONE+ 18V or M18.</p></div>'}
    ${none.length ? `<section class="card"><h3>No battery needed</h3><div class="tool-chips">${none.flatMap(p => [...p.tools, ...p.other]).map(t => `<a href="#/item/${t.id}" class="tool-chip">${esc(t.name)}</a>`).join('')}</div></section>` : ''}`;
}
function viewItem(id) {
  const it = itemById(id); if (!it) return `<a href="#/tools" class="back">${I.back} Inventory</a><div class="empty"><div class="big">Item not found</div><p>It may have been deleted on another device.</p></div>`;
  const k = it.kitId && kitById(it.kitId), w = warrantyState(it), c = itemCost(it);
  const row = (l, v) => v ? `<div class="kv"><span>${esc(l)}</span><b>${v}</b></div>` : '';
  const age = it.purchased ? daysBetween(it.purchased, todayISO()) : null;
  const ageT = age == null ? '' : age < 60 ? plural(age, 'day') : age < 730 ? `${Math.round(age / 30.4)} mo` : `${fmt(age / 365.25, 1)} yr`;
  const peers = it.platform ? db.items.filter(x => x !== it && active(x) && itemPlats(x).includes(it.platform)) : [];
  return `<a href="#/tools" class="back">${I.back} Inventory</a>
    <section class="card item-hero">
      ${it.photos && it.photos.length ? `<div class="gallery">${it.photos.map((p, i) => `<span class="ph ${i ? 'sm' : 'big'}"><img data-ph="${esc(p)}" ${i ? '' : 'data-full="1"'} alt="Photo of ${esc(itemTitle(it))}"></span>`).join('')}</div>` : `<button class="ph-empty" data-act="addPhoto">${I.camera}<span>Add a photo</span></button>`}
      <div class="eyebrow">${esc([it.brand, platLabel(it.platform, it), kindL(it.kind)].filter(Boolean).join(' · '))}</div>
      <h2>${esc(itemTitle(it))}</h2>${it.model ? `<p class="model">Model ${esc(it.model)}</p>` : ''}
      <div class="tags">${pill(w)}${it.condition ? `<span class="tag">${esc(it.condition)}</span>` : ''}${!active(it) ? `<span class="tag warn">${esc(it.status)}</span>` : ''}${it.loanedTo ? `<span class="tag warn">With ${esc(it.loanedTo)} since ${esc(fdate(it.loanedOn))}</span>` : ''}</div>
      <div class="stats">${stat('Paid', c != null ? money(c) : '—')}${stat('Owned', ageT || '—')}${stat(w.level === 'over' ? 'Expired' : 'Warranty', w.end ? new Date(w.end + 'T12:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—')}</div>
      <div class="row-actions"><button class="btn primary" data-act="editItem" data-id="${it.id}">${I.edit} Edit</button><button class="btn" data-act="lend" data-id="${it.id}">${I.hand} ${it.loanedTo ? 'Returned' : 'Lend'}</button></div></section>
    <section class="card"><h3>Details</h3>
      ${row('Serial #', it.serial ? `<span class="mono">${esc(it.serial)}</span>` : '<span class="muted">Add it for insurance</span>')}${row('Tool type', esc(it.type || ''))}${row('Line', esc(it.line || ''))}${row('Voltage', it.voltage ? esc(it.voltage + 'V') : '')}
      ${it.kind === 'battery' ? row('Capacity', it.ah ? esc(fmt(it.ah, it.ah % 1 ? 1 : 0) + 'Ah') : '') + row('Battery type', esc(it.batType || '')) + row('In service', it.inService ? esc(fdate(it.inService)) : '') + row('Charge cycles', it.cycles != null ? esc(fmt(it.cycles)) : '') + row('Health', esc(it.health || '')) : ''}
      ${row('Purchased', it.purchased ? esc(fdate(it.purchased)) : '')}${row('Store', esc(it.store || ''))}${row('Price paid', k ? `${money(c)} <small class="muted">share of kit</small>` : it.free ? '$0 <small class="muted">free / gift</small>' : esc(money(num(it.price))))}
      ${row('Warranty', it.warrantyMo || (k && k.warrantyMo) ? `${esc(fmt(num(it.warrantyMo) ?? num(k.warrantyMo)))} months${w.end ? ` · until ${esc(fdate(w.end))}` : ''}` : '')}
      ${row('Location', esc(it.location || ''))}${k ? row('Kit', `<a href="#/kit/${k.id}">${esc(k.name)}</a>`) : ''}
      ${it.notes ? `<p class="notes">${esc(it.notes)}</p>` : ''}
      ${it.receipt ? `<div class="fhead">Receipt</div><span class="ph receipt"><img data-ph="${esc(it.receipt)}" data-full="1" alt="Receipt"></span>` : ''}
      ${it.src ? `<p class="muted src">Catalog source: <a href="${esc(it.src)}" target="_blank" rel="noopener">${esc(new URL(it.src).hostname)}</a></p>` : ''}</section>
    ${peers.length && it.platform && !platNone(it.platform) ? `<section class="card"><h3>Also on ${esc(platFull(it.platform, it))}</h3><div class="tool-chips">${peers.slice(0, 30).map(t => `<a href="#/item/${t.id}" class="tool-chip">${t.kind === 'battery' ? '🔋 ' : ''}${esc(t.name)}</a>`).join('')}</div></section>` : ''}
    <section class="card"><div class="btn-row">${w.end ? `<button class="btn small" data-act="ics" data-id="${it.id}">${I.cal} Warranty reminder</button>` : ''}<button class="btn small" data-act="dup" data-id="${it.id}">${I.copy} Add another like this</button>${!k ? `<button class="btn small" data-act="toKit" data-id="${it.id}">${I.box} Add kit pieces</button>` : `<button class="btn small" data-act="addToKit" data-id="${k.id}">${I.plus} Add to this kit</button>`}</div></section>`;
}
function viewKit(id) {
  const k = kitById(id); if (!k) return `<a href="#/tools?g=kit" class="back">${I.back} Inventory</a><div class="empty"><div class="big">Kit not found</div></div>`;
  const l = kitItems(k), price = k.free ? 0 : num(k.price) || 0;
  return `<a href="#/tools?g=kit" class="back">${I.back} Inventory</a>
    <section class="card hero"><div class="eyebrow">Kit / bundle</div><h2>${esc(k.name)}</h2>${k.model ? `<p class="model">Model ${esc(k.model)}</p>` : ''}
      <div class="stats">${stat('Kit price', money(price))}${stat('Pieces', fmt(l.length))}${stat('Per piece', l.length ? money(price / l.length) : '—')}</div>
      <p class="muted" style="margin:10px 0 0">${esc([k.store, k.purchased && fdate(k.purchased)].filter(Boolean).join(' · '))}${l.some(x => num(x.kitShare) != null) ? ' · some pieces have a set share; the rest split evenly.' : ' · split evenly across pieces.'}</p>
      <div class="row-actions"><button class="btn primary" data-act="addToKit" data-id="${k.id}">${I.plus} Add piece</button><button class="btn" data-act="editKit" data-id="${k.id}">${I.edit} Edit kit</button></div></section>
    <section class="card"><h3>In this kit</h3><div class="list">${l.map(itemRow).join('') || '<p class="muted">No pieces yet. Add the tools, batteries and charger that came in it.</p>'}</div>
    ${k.receipt ? `<div class="fhead">Receipt</div><span class="ph receipt"><img data-ph="${esc(k.receipt)}" data-full="1" alt="Receipt"></span>` : ''}${k.notes ? `<p class="notes">${esc(k.notes)}</p>` : ''}</section>`;
}

/* ---------- insurance export ---------- */
const CSV_COLS = [['Brand', x => x.brand], ['Platform', x => platLabel(x.platform, x)], ['Kind', x => kindL(x.kind)], ['Type', x => x.type], ['Name', x => x.name], ['Model #', x => x.model], ['Serial #', x => x.serial],
  ['Purchase date', x => x.purchased], ['Store', x => x.store], ['Price paid', x => { const c = itemCost(x); return c == null ? '' : c.toFixed(2); }], ['Kit', x => x.kitId && kitById(x.kitId) ? kitById(x.kitId).name : ''],
  ['Kit price', x => x.kitId && kitById(x.kitId) ? (num(kitById(x.kitId).price) || 0).toFixed(2) : ''], ['Warranty months', x => x.warrantyMo ?? (x.kitId && kitById(x.kitId) ? kitById(x.kitId).warrantyMo ?? '' : '')], ['Warranty ends', x => warrantyEnd(x) || ''], ['Battery Ah', x => x.kind === 'battery' ? x.ah ?? '' : ''],
  ['Battery type', x => x.batType], ['Condition', x => x.condition], ['Status', x => x.status], ['Location', x => x.location], ['Loaned to', x => x.loanedTo], ['Photos', x => (x.photos || []).length], ['Receipt photo', x => x.receipt ? 'yes' : ''], ['Notes', x => x.notes]];
const csvCell = v => { const s = String(v ?? ''); return /[",\n\r]/.test(s) || /^[=+\-@]/.test(s) ? '"' + (/^[=+\-@]/.test(s) ? "'" : '') + s.replace(/"/g, '""') + '"' : s; };
function exportCSV(all) {
  const list = db.items.filter(x => all || active(x));
  const csv = [CSV_COLS.map(c => c[0]).join(','), ...list.map(x => CSV_COLS.map(c => csvCell(c[1](x))).join(','))].join('\r\n');
  download(`toollog-insurance-${todayISO()}.csv`, '\ufeff' + csv, 'text/csv'); toast(`CSV with ${plural(list.length, 'item')} downloaded`);
}
function viewExport() {
  const act = db.items.filter(active), total = totalValue(act);
  const ser = act.filter(x => x.serial).length, ph = act.filter(x => x.photos && x.photos.length).length, rc = act.filter(x => x.receipt || (x.kitId && kitById(x.kitId)?.receipt)).length;
  const pct = n => act.length ? Math.round(n / act.length * 100) : 0;
  return `<div class="page-title"><h2>Insurance &amp; export</h2></div>
    <section class="card hero"><div class="eyebrow">For theft, fire or a claim</div><div class="big-num">${money(total, 0)}</div><small class="muted">${plural(act.length, 'active item')}, price paid</small>
      <div class="meter-list">${[['Serial numbers', ser], ['Photos', ph], ['Receipts', rc]].map(([l, n]) => `<div class="meter"><span>${l}</span><span class="bt"><i style="width:${pct(n)}%"></i></span><b>${fmt(n)}/${fmt(act.length)}</b></div>`).join('')}</div></section>
    <section class="card"><h3>${I.print} Printable list</h3><p class="muted">A clean list with photos, serials and prices. Print it or save it as a PDF from the print screen.</p>
      <label class="field"><span class="lbl">Owner name on the list</span><input type="text" id="ownerName" value="${esc(db.settings.owner || '')}" placeholder="Optional" autocomplete="name"></label>
      <div class="btn-row" style="margin-top:10px"><a class="btn primary" href="#/print">${I.print} Open printable list</a></div></section>
    <section class="card"><h3>${I.doc} Spreadsheet (CSV)</h3><p class="muted">Every field for each item, ready for Excel, Numbers or Google Sheets.</p>
      <div class="btn-row"><button class="btn small primary" data-act="csv">${I.download} Active items</button><button class="btn small" data-act="csvAll">${I.download} Include sold / retired</button></div></section>
    <section class="card"><h3>${I.shield} Backup</h3><p class="muted">One file with all your items, kits and (optionally) photos. Import it on any device.</p>
      <div class="btn-row"><button class="btn small primary" data-act="export">${I.download} Backup with photos</button><button class="btn small" data-act="exportLite">${I.download} Without photos</button><button class="btn small" data-act="import">${I.upload} Import backup</button></div></section>`;
}
function viewPrint() {
  const act = db.items.filter(active).sort((a, b) => String(a.brand).localeCompare(String(b.brand)) || String(a.name).localeCompare(String(b.name)));
  const total = totalValue(act);
  return `<div class="print-bar no-print"><a href="#/export" class="back">${I.back} Back</a><button class="btn primary small" data-act="print">${I.print} Print / Save PDF</button></div>
    <article class="print-sheet"><header class="ps-head"><img src="img/riznoss-crest-solid.webp" alt="" width="34" height="39"><div><h1>Tool &amp; equipment inventory</h1><p>${db.settings.owner ? esc(db.settings.owner) + ' · ' : ''}Generated ${esc(fdate(todayISO()))} with ToolLog</p></div>
      <div class="ps-tot"><span>${plural(act.length, 'item')}</span><b>${money(total)}</b></div></header>
      <table class="ps-t"><thead><tr><th>Photo</th><th>Item</th><th>Serial #</th><th>Purchased</th><th class="r">Paid</th></tr></thead><tbody>
      ${act.map(x => { const k = x.kitId && kitById(x.kitId); return `<tr><td class="ps-ph">${x.photos && x.photos[0] ? `<img data-ph="${esc(x.photos[0])}" alt="">` : ''}</td><td><b>${esc(itemTitle(x))}</b><small>${esc([x.brand, platLabel(x.platform, x), x.model && 'Model ' + x.model].filter(Boolean).join(' · '))}${k ? `<br>Part of ${esc(k.name)}${k.model ? ' (' + esc(k.model) + ')' : ''}` : ''}${x.condition ? ` · ${esc(x.condition)}` : ''}${x.location ? ` · ${esc(x.location)}` : ''}</small></td><td class="mono">${esc(x.serial || '—')}</td><td>${esc(x.purchased ? fdate(x.purchased) : '—')}<small>${esc(x.store || '')}</small></td><td class="r">${esc(money(itemCost(x)))}${x.free ? '<small>free</small>' : k ? '<small>kit share</small>' : ''}</td></tr>`; }).join('')}
      </tbody><tfoot><tr><td colspan="4">Total price paid</td><td class="r">${esc(money(total))}</td></tr></tfoot></table>
      <footer class="ps-foot">RIZNOSS · Chamber 02 · ToolLog. Values are what the owner paid, not replacement cost.</footer></article>`;
}

/* ---------- backup ---------- */
async function exportJSON(withPhotos) {
  const out = { app: 'ToolLog', exported: new Date().toISOString(), ...db };
  if (withPhotos) { toast('Packing photos…'); const ids = new Set(db.items.flatMap(x => [...(x.photos || []), x.receipt]).concat(db.kits.map(k => k.receipt)).filter(Boolean)); out.photoData = {}; for (const r of await Photos.all()) if (ids.has(r.id)) out.photoData[r.id] = { full: await blobToData(r.full), thumb: await blobToData(r.thumb) }; }
  download(`toollog-backup-${todayISO()}.json`, JSON.stringify(out)); toast('Backup downloaded');
}
async function importJSON(file) {
  try {
    const j = JSON.parse(await file.text());
    if (!j || (j.app && j.app !== 'ToolLog') || !Array.isArray(j.items)) throw new Error('not a ToolLog backup');
    const inc = normalize(j);
    const ok = await ask({ title: 'Import this backup?', msg: `${plural(inc.items.length, 'item')} and ${plural(inc.kits.length, 'kit')}. Items already here are kept; the newer copy of each one wins. A copy of your current data is saved first.`, buttons: [{ label: 'Import', value: true, cls: 'primary' }, { label: 'Cancel', value: false }] });
    if (!ok) return;
    try { localStorage.setItem(BAK, JSON.stringify(db)); } catch (e) { /* quota */ }
    for (const key of ['items', 'kits', 'custom']) for (const r of inc[key]) { const i = db[key].findIndex(x => x.id === r.id); if (i < 0) db[key].push(r); else if (String(r.updated || '') > String(db[key][i].updated || '')) db[key][i] = r; }
    let n = 0; for (const [id, p] of Object.entries(j.photoData || {})) { try { await Photos.putRaw({ id, full: await dataToBlob(p.full), thumb: await dataToBlob(p.thumb), t: Date.now() }); n++; } catch (e) { console.warn(e); } }
    save(); render(); toast(`Imported${n ? ` with ${plural(n, 'photo')}` : ''}`);
  } catch (e) { console.warn(e); toast('That file isn’t a ToolLog backup'); }
}

/* ---------- reminders: calendar + notifications ---------- */
function icsFor(list) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const ev = list.map(it => { const end = warrantyEnd(it); if (!end) return ''; const d = end.replace(/-/g, ''); const nx = (() => { const x = parseD(end); x.setDate(x.getDate() + 1); return iso(x).replace(/-/g, ''); })();
    return ['BEGIN:VEVENT', `UID:toollog-w-${it.id}@riznoss`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${nx}`, `SUMMARY:Warranty ends: ${itemTitle(it).replace(/[,;\\]/g, ' ')}`, `DESCRIPTION:${[it.brand, it.model, it.serial && 'S/N ' + it.serial].filter(Boolean).join(' ').replace(/[,;\\]/g, ' ')}`, 'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Warranty ends in 30 days', 'TRIGGER:-P30D', 'END:VALARM', 'END:VEVENT'].join('\r\n'); }).filter(Boolean);
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//RIZNOSS//ToolLog//EN', 'CALSCALE:GREGORIAN', ...ev, 'END:VCALENDAR'].join('\r\n');
}
function notifyDue() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  let sent = {}; try { sent = JSON.parse(localStorage.getItem('toollog:notified') || '{}'); } catch (e) { /* ignore */ }
  const due = reminders().filter(r => !sent[r.key] || Date.now() - sent[r.key] > 7 * 864e5).slice(0, 3);
  due.forEach(r => { try { new Notification('ToolLog: ' + itemTitle(r.it), { body: r.t, icon: 'icons/icon-192.png', tag: r.key }); sent[r.key] = Date.now(); } catch (e) { /* iOS needs the SW route */ navigator.serviceWorker?.ready.then(reg => reg.showNotification('ToolLog: ' + itemTitle(r.it), { body: r.t, icon: 'icons/icon-192.png', tag: r.key })).catch(() => {}); sent[r.key] = Date.now(); } });
  try { localStorage.setItem('toollog:notified', JSON.stringify(sent)); } catch (e) { /* ignore */ }
}
function updateBell() { const n = reminders().length, b = $('#bellCount'); if (b) { b.hidden = !n; b.textContent = n > 9 ? '9+' : n; } }

/* ---------- settings / about ---------- */
const rzFoot = () => `<a href="#/about" class="rz-foot"><img src="img/riznoss-crest-solid.webp" alt="" width="26" height="30" loading="lazy" decoding="async"><b>RIZNOSS · Chamber 02</b><span>ToolLog v${APP_VERSION} · works offline · your data stays yours</span><i>Protect ya data.</i></a>`;
function viewMore() {
  const th = db.settings.theme || 'auto', perm = 'Notification' in window ? Notification.permission : 'unsupported';
  return `<div class="page-title"><h2>Settings</h2></div>
    <div id="syncCard">${window.ToolLogSync ? window.ToolLogSync.cardHTML() : ''}</div>
    <section class="card"><h3>Appearance</h3><div class="seg" role="radiogroup" aria-label="Theme">${[['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']].map(([k, l]) => `<label><input type="radio" name="theme" value="${k}" ${th === k ? 'checked' : ''} data-theme-pick><span>${l}</span></label>`).join('')}</div>
      <div class="field" style="margin-top:12px"><span class="lbl">Inventory groups by default</span><div class="seg">${GROUPINGS.map(([k, l]) => `<label><input type="radio" name="defg" value="${k}" ${(db.settings.group || 'brand') === k ? 'checked' : ''} data-defg><span>${l}</span></label>`).join('')}</div></div></section>
    <section class="card"><h3>${I.bell} Reminders</h3><p class="muted">Warranty end dates and tools loaned out 30+ days show on the dashboard. ToolLog can also notify you when you open it, or add warranty dates to your calendar.</p>
      <div class="btn-row">${perm === 'default' ? `<button class="btn small primary" data-act="notif">Turn on notifications</button>` : perm === 'granted' ? '<span class="tag good">Notifications on</span>' : perm === 'denied' ? '<span class="tag">Notifications blocked in browser settings</span>' : ''}<button class="btn small" data-act="icsAll">${I.cal} All warranty dates (.ics)</button></div></section>
    <section class="card"><h3>Data</h3><div class="btn-row"><button class="btn small" data-act="export">${I.download} Backup</button><button class="btn small" data-act="import">${I.upload} Import</button><a class="btn small" href="#/export">${I.shield} Insurance export</a>${db.items.length ? '' : '<button class="btn small" data-act="sample">Load sample data</button>'}</div>
      <div class="setting danger"><b>Danger zone</b><div><button class="btn small ghost-danger" data-act="eraseAll" ${db.items.length || db.kits.length ? '' : 'disabled'}>${I.trash} Erase all data on this device</button></div></div></section>
    <section class="card"><a class="srow" href="#/about"><span class="sicon rz">${'<img src="img/riznoss-crest-solid.webp" alt="" width="22" height="25">'}</span><div class="sbody"><b>About ToolLog</b><small>RIZNOSS Chamber 02 · share the app</small></div>${I.right}</a></section>
    ${rzFoot()}`;
}
function viewAbout() {
  const synced = !!(window.ToolLogSync && window.ToolLogSync.status().signedIn);
  return `<a href="#/more" class="back">${I.back} Settings</a>
    <section class="card rz-about"><img src="img/riznoss-lockup.webp" alt="RIZNOSS" width="220" height="213" decoding="async">
      <p class="rz-ch">RIZNOSS presents · Chamber 02</p><h2>ToolLog</h2><p class="rz-alias">The Shaolin Arsenal</p>
      <p class="rz-copy">Every tool, battery and charger you own: serials, price paid, warranty, platform and who borrowed it. On your own device, no ads, no tracking. Sync only happens if you sign in.</p>
      <div class="rz-meta"><div><span>Version</span><b>v${APP_VERSION}</b></div><div><span>Your data</span><b>${synced ? 'This device + your account' : 'This device only'}</b></div><div><span>Items</span><b>${fmt(db.items.length)}</b></div><div><span>Catalog</span><b>${CAT ? fmt(CAT.items.length) + ' products' : 'RYOBI + Milwaukee'}</b></div></div>
      <div class="rz-sign">Protect ya data.</div></section>
    <section class="card"><h3>Share ToolLog</h3><p class="muted" style="margin:6px 0 10px">Send the invite page. It walks people through opening it in Safari, adding it to their Home Screen and signing up.</p><div class="btn-row"><button class="btn small primary" data-act="shareApp">${I.share} Share ToolLog</button></div><p class="muted" style="font-size:.8rem;margin:8px 0 0;word-break:break-all">${JOIN_URL}</p></section>
    <section class="card"><h3>Catalog sources</h3><p class="muted" style="margin:6px 0 0">Model numbers come from the makers’ public product pages (ryobitools.com, milwaukeetool.com). Product names are trademarks of their owners; ToolLog isn’t affiliated with RYOBI, Techtronic Industries or Milwaukee Tool.</p></section>
    <section class="card"><h3>Also from RIZNOSS</h3><a class="srow" href="../autolog/"><span class="sicon">${svg('<path d="M5 16V11l2-5h10l2 5v5"/><path d="M3 16h18v3H3z"/>')}</span><div class="sbody"><b>AutoLog · Chamber 01</b><small>Fuel, maintenance and cost of ownership</small></div>${I.right}</a></section>`;
}
const JOIN_URL = 'https://bigriznizzle.github.io/toollog/join/';
(function () { try { if (/[?&]join(=[^&]*)?(&|$)/.test(location.search)) { sessionStorage.setItem('toollog:join', '1'); const q = location.search.slice(1).split('&').filter(x => x && !/^join(=|$)/.test(x)).join('&'); history.replaceState(null, '', location.pathname + (q ? '?' + q : '') + location.hash); } } catch (e) { /* ignore */ } })();
const isStandalone = () => navigator.standalone === true || !!(window.matchMedia && matchMedia('(display-mode: standalone)').matches);
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
function joinCoach() {
  let on = false; try { on = sessionStorage.getItem('toollog:join') === '1'; } catch (e) { /* ignore */ }
  if (!on || isStandalone()) return '';
  const how = isIOS() ? 'Tap <b>Share</b> (the square with the arrow; tap <b>•••</b> first if you don’t see it), then <b>Add to Home Screen</b>, then <b>Add</b>.' : /Android/i.test(navigator.userAgent) ? 'Tap Chrome’s <b>⋮</b> menu, then <b>Install app</b> (or <b>Add to Home screen</b>).' : 'Use your browser’s <b>Install</b> option, or just use it here.';
  return `<section class="card join-coach"><div class="card-head"><h3>📲 Almost there</h3><button type="button" class="btn small" data-act="joinDone" aria-label="Dismiss">✕</button></div><p>${how}</p><p class="muted" style="margin:6px 0 0">Then open ToolLog from your Home Screen. To create an account, go to <b>Settings</b> → <b>Account &amp; sync</b>.</p></section>`;
}
async function shareApp() {
  const data = { title: 'ToolLog · RIZNOSS Chamber 02', text: 'ToolLog keeps every power tool and battery you own: serials, warranty, platforms, insurance list. Free, private, works offline.', url: JOIN_URL };
  if (navigator.share) { try { await navigator.share(data); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
  try { await navigator.clipboard.writeText(JOIN_URL); toast('Invite link copied'); } catch (e) { prompt('Copy this link:', JOIN_URL); }
}
function showSplash() {
  try { if (sessionStorage.getItem('toollog:splash') || /[?&]nosplash\b/.test(location.search)) return; sessionStorage.setItem('toollog:splash', '1'); } catch (e) { return; }
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = document.createElement('div'); el.className = 'rz-splash'; el.setAttribute('role', 'presentation');
  el.innerHTML = `<div class="rz-in"><img src="img/riznoss-lockup.webp" alt="RIZNOSS" width="236" height="228" decoding="async"><p class="rz-presents"><b>RIZNOSS</b> presents · Chamber 02</p><p class="rz-app">ToolLog</p><p class="rz-alias2">The Shaolin Arsenal</p></div><div class="rz-skip">Tap to skip</div>`;
  let done = false; const close = () => { if (done) return; done = true; el.classList.add('out'); setTimeout(() => el.remove(), reduce ? 0 : 380); document.removeEventListener('keydown', close, true); };
  el.addEventListener('pointerdown', close); document.addEventListener('keydown', close, true);
  document.body.appendChild(el); setTimeout(close, reduce ? 900 : 1600);
}

/* ---------- sample data (real catalog models; serials are obviously fake) ---------- */
const SAMPLE = [
  { kit: { b: 'Milwaukee', m: '3697-22', price: 399, store: 'The Home Depot', days: 410, warrantyMo: 60 }, loc: 'Truck' },
  { b: 'Milwaukee', m: '2767-20', price: 299, store: 'Acme Tools', days: 300, loc: 'Truck', warrantyMo: 60 },
  { b: 'Milwaukee', m: '48-11-1880', price: 199, store: 'Lowe’s', days: 120, loc: 'Truck', warrantyMo: 36 },
  { b: 'Milwaukee', m: '2552-20', price: 179, store: 'Acme Tools', days: 700, loc: 'Garage', warrantyMo: 60, loanedTo: 'Dre', loanedDays: 41 },
  { b: 'Milwaukee', m: '48-11-2440', price: 89, store: 'Amazon', days: 690, loc: 'Garage', warrantyMo: 36 },
  { b: 'Milwaukee', m: '2821-20', price: 249, store: 'The Home Depot', days: 1750, loc: 'Garage', warrantyMo: 60, cond: 'Good' },
  { b: 'RYOBI', m: 'PBLDD01B', price: 99, store: 'The Home Depot', days: 200, loc: 'Garage', warrantyMo: 36 },
  { b: 'RYOBI', m: 'PBLID01B', price: 99, store: 'The Home Depot', days: 200, loc: 'Garage', warrantyMo: 36 },
  { b: 'RYOBI', m: 'PBP004', price: 129, store: 'The Home Depot', days: 200, loc: 'Garage', warrantyMo: 36 },
  { b: 'RYOBI', m: 'PBP007', price: 0, free: 1, store: 'The Home Depot', days: 200, loc: 'Garage', warrantyMo: 36 },
  { b: 'RYOBI', m: 'PCG004', price: 59, store: 'The Home Depot', days: 1100, loc: 'Garage', warrantyMo: 24 },
  { b: 'RYOBI', m: 'RY401010BTL', price: 229, store: 'Lowe’s', days: 1650, loc: 'Shed', warrantyMo: 60, cond: 'Good' },
  { b: 'RYOBI', m: 'OP4050A', price: 149, store: 'The Home Depot', days: 1650, loc: 'Shed', warrantyMo: 36, health: 'Fading', cycles: 180 },
];
async function loadSample() {
  try { await loadCatalog(); } catch (e) { toast('Sample data needs the catalog; go online once'); return; }
  const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };
  const now = new Date().toISOString(); let n = 0, sn = 1000;
  const mk = (c, extra) => ({ id: uid(), kind: c.k || 'tool', brand: c.b, platform: c.p, name: c.n, model: c.m, type: c.t, line: c.l || '', voltage: c.v ?? (PL[c.p] && PL[c.p].v) ?? null, ah: c.ah ?? null, batType: c.bt || '', alsoP: c.p2, catId: c.id, src: c.u, condition: 'New', status: 'Active', photos: [], serial: 'DEMO-' + (sn++), created: now, updated: now, ...extra });
  for (const s of SAMPLE) {
    if (s.kit) {
      const c = catByModel(s.kit.b, s.kit.m); if (!c) continue;
      const k = { id: uid(), name: c.n, model: c.m, brand: c.b, price: s.kit.price, purchased: daysAgo(s.kit.days), store: s.kit.store, warrantyMo: s.kit.warrantyMo, created: now, updated: now }; db.kits.push(k);
      for (const [m, q] of c.inc || []) { const p = catByModel(c.b, m); if (!p) continue; for (let i = 0; i < q; i++) { db.items.push(mk(p, { kitId: k.id, purchased: k.purchased, store: k.store, location: s.loc, inService: p.k === 'battery' ? k.purchased : '' })); n++; } }
      continue;
    }
    const c = catByModel(s.b, s.m); if (!c) continue;
    db.items.push(mk(c, { price: s.free ? 0 : s.price, free: !!s.free, purchased: daysAgo(s.days), store: s.store, location: s.loc, warrantyMo: s.warrantyMo ?? c.w ?? null, condition: s.cond || 'Good', loanedTo: s.loanedTo || '', loanedOn: s.loanedTo ? daysAgo(s.loanedDays) : '', health: s.health || '', cycles: s.cycles ?? null, inService: c.k === 'battery' ? daysAgo(s.days) : '', notes: s.free ? 'Free with the drill + impact promo.' : '' }));
    n++;
  }
  save(); render(); toast(`Loaded ${plural(n, 'sample item')}`);
}

/* ---------- router / render ---------- */
const TABS = { dash: 'dash', tools: 'tools', item: 'tools', kit: 'tools', power: 'power', export: 'export', print: 'export', more: 'more', about: 'more' };
function route() {
  const h = location.hash.replace(/^#\/?/, '') || 'dash';
  const [path, qs] = h.split('?'), [name, arg] = path.split('/');
  const params = Object.fromEntries(new URLSearchParams(qs || ''));
  return { name: TABS[name] ? name : 'dash', arg, params };
}
function applyTheme() {
  const t = db.settings.theme || 'auto', root = document.documentElement;
  if (t === 'auto') root.removeAttribute('data-theme'); else root.dataset.theme = t;
  const dark = t === 'dark' || (t === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  $('#themeColor')?.setAttribute('content', dark ? '#07090f' : '#f3f5f9');
}
let lastRoute = '';
function render() {
  const r = route(), app = $('#app');
  const views = { dash: viewDash, tools: () => viewTools(r.params), item: () => viewItem(r.arg), kit: () => viewKit(r.arg), power: viewPower, export: viewExport, print: viewPrint, more: viewMore, about: viewAbout };
  const key = location.hash;
  const y = key === lastRoute ? window.scrollY : 0;
  app.innerHTML = views[r.name]();
  document.body.classList.toggle('printing', r.name === 'print');
  $$('#tabbar a').forEach(a => a.classList.toggle('on', a.dataset.tab === TABS[r.name]));
  $('#fab').hidden = !['dash', 'tools', 'power'].includes(r.name) || !db.items.length;
  paintPhotos(app); updateBell();
  if (key !== lastRoute) { if (!scrollLock.isOn()) { const anchor = location.hash.split('#')[2]; const el = anchor && document.getElementById(anchor); if (el) setTimeout(() => el.scrollIntoView({ block: 'start' }), 0); else window.scrollTo(0, 0); } }
  else if (!scrollLock.isOn()) window.scrollTo(0, y);
  lastRoute = key;
  const inv = $('#invq'); if (inv) inv.oninput = () => { INV.q = inv.value; clearTimeout(render.t); render.t = setTimeout(() => { const pos = inv.selectionStart; render(); const n = $('#invq'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { /* ignore */ } } }, 160); };
  const on = $('#ownerName'); if (on) on.onchange = () => { db.settings.owner = on.value.trim(); save(); };
}
const ACTIONS = {
  add: () => addFlow(), addBattery: () => addFlow({ kind: 'battery' }), sample: loadSample,
  editItem: b => { const it = itemById(b.dataset.id); if (it) itemForm(it); },
  editKit: b => { const k = kitById(b.dataset.id); if (k) kitForm(k); },
  addToKit: b => { const k = kitById(b.dataset.id); if (k) addFlow({ kitId: k.id, brand: TAX.BRANDS.includes(k.brand) ? k.brand : undefined }); },
  toKit: b => { const it = itemById(b.dataset.id); if (!it) return; const k = { id: uid(), name: it.name + ' kit', model: '', brand: it.brand, price: it.free ? 0 : num(it.price) || 0, free: !!it.free, purchased: it.purchased, store: it.store, warrantyMo: it.warrantyMo, created: new Date().toISOString(), updated: new Date().toISOString() }; db.kits.push(k); it.kitId = k.id; it.price = null; it.free = false; it.updated = k.updated; save(); toast('Made a kit. Add the other pieces and the price is split.'); location.hash = '#/kit/' + k.id; },
  dup: b => { const it = itemById(b.dataset.id); if (!it) return; const { id, serial, photos, receipt, created, updated, loanedTo, loanedOn, ...rest } = it; itemForm(null, { ...rest, catId: it.catId || undefined, src: it.src }); },
  lend: async b => { const it = itemById(b.dataset.id); if (!it) return; if (it.loanedTo) { it.loanedTo = ''; it.loanedOn = ''; it.updated = new Date().toISOString(); save(); render(); toast('Marked as returned'); return; }
    const who = prompt('Who are you lending it to?'); if (!who || !who.trim()) return; it.loanedTo = who.trim(); it.loanedOn = todayISO(); it.updated = new Date().toISOString(); save(); render(); toast(`Loaned to ${it.loanedTo}`); },
  addPhoto: () => { const it = itemById(route().arg); if (!it) return; const f = document.createElement('input'); f.type = 'file'; f.accept = 'image/*'; f.multiple = true; f.onchange = async () => { for (const fl of f.files) { try { it.photos = [...(it.photos || []), await Photos.add(fl)]; } catch (e) { toast('Couldn’t read that photo'); } } it.updated = new Date().toISOString(); save(); render(); }; f.click(); },
  ics: b => { const it = itemById(b.dataset.id); if (it) download(`warranty-${norm(it.model || it.name).replace(/\s/g, '-')}.ics`, icsFor([it]), 'text/calendar'); },
  icsAll: () => { const l = db.items.filter(x => active(x) && warrantyEnd(x) && warrantyEnd(x) >= todayISO()); if (!l.length) { toast('No upcoming warranty dates yet'); return; } download(`toollog-warranties-${todayISO()}.ics`, icsFor(l), 'text/calendar'); toast(`${plural(l.length, 'warranty date')} exported`); },
  notif: async () => { try { const p = await Notification.requestPermission(); if (p === 'granted') { toast('Notifications on'); notifyDue(); } render(); } catch (e) { toast('This browser can’t show notifications'); } },
  csv: () => exportCSV(false), csvAll: () => exportCSV(true), export: () => exportJSON(true), exportLite: () => exportJSON(false), import: () => $('#importFile').click(),
  print: () => window.print(), clearF: () => { INV.f = ''; history.replaceState(null, '', '#/tools'); render(); }, toggleRetired: () => { INV.retired = !INV.retired; render(); },
  eraseAll: async () => { const ok = await ask({ title: 'Erase all data?', msg: 'This deletes every item, kit and photo on this device. If you’re signed in, your account keeps a copy until you sync this change.', typeToConfirm: 'ERASE', buttons: [{ label: 'Erase everything', value: true, cls: 'danger', needsType: 1 }, { label: 'Cancel', value: false }] }); if (ok) { try { localStorage.setItem(BAK, JSON.stringify(db)); } catch (e) { /* quota */ } (await Photos.all()).forEach(r => Photos.del(r.id)); db = { ...blank(), settings: db.settings }; save(); render(); toast('All data erased'); } },
  shareApp: () => shareApp(), joinDone: () => { try { sessionStorage.removeItem('toollog:join'); } catch (e) { /* ignore */ } render(); },
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (b && ACTIONS[b.dataset.act]) { e.preventDefault(); ACTIONS[b.dataset.act](b); }
});
document.addEventListener('change', e => {
  if (e.target.matches('[data-invg]')) { INV.g = e.target.value; INV.f = ''; history.replaceState(null, '', '#/tools'); render(); }
  else if (e.target.matches('[data-invk]')) { INV.kind = e.target.value; render(); }
  else if (e.target.matches('[data-theme-pick]')) { db.settings.theme = e.target.value; save(); applyTheme(); }
  else if (e.target.matches('[data-defg]')) { db.settings.group = e.target.value; INV.g = null; save(); toast('Saved'); }
  else if (e.target.id === 'importFile') { const f = e.target.files[0]; e.target.value = ''; if (f) importJSON(f); }
});
$('#fab').addEventListener('click', () => addFlow(route().name === 'power' ? { kind: 'battery' } : {}));
window.addEventListener('hashchange', render);
window.addEventListener('storage', e => { if (e.key === KEY) { db = load(); render(); } });
if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);

/* ---------- service worker + update prompt ---------- */
let swUpdating = false;
function registerSW() {
  if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
  navigator.serviceWorker.register('sw.js').then(reg => {
    const show = () => { const b = $('#updateBar'); b.hidden = false; b.onclick = () => { swUpdating = true; b.textContent = 'Updating…'; (reg.waiting || reg.installing)?.postMessage({ type: 'SKIP_WAITING' }); setTimeout(() => location.reload(), 4000); }; };
    if (reg.waiting && navigator.serviceWorker.controller) show();
    reg.addEventListener('updatefound', () => { const w = reg.installing; if (w) w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) show(); }); });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  }).catch(e => console.warn('sw', e));
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (swUpdating) location.reload(); });
}

/* ---------- public API for sync.js + tests ---------- */
window.ToolLogApp = {
  getDb: () => db, replaceDb: d => { db = normalize(d); try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { toast('Couldn’t save synced data. Storage may be full.'); } render(); },
  toast, render, loadCatalog, Photos, version: APP_VERSION,
};
applyTheme(); showSplash(); render(); registerSW();
setTimeout(notifyDue, 2500);
