/* Tool Crizib optional cross-device sync (Supabase), shared with AutoLog's project and table.
   Namespacing: every Tool Crizib record is stored as kind 'maint' with id 'tl:<type>:<id>' and data._vid = '__toollog'.
   - The table's kind check only allows AutoLog's kinds, so a new kind would be rejected; 'maint' is allowed.
   - AutoLog clients keep a 'maint' row whose _vid matches none of their vehicles as an orphan (never rebuilt, never tombstoned),
     so AutoLog can't delete Tool Crizib data, and Tool Crizib only reads/writes ids starting with 'tl:' so it can't touch AutoLog's.
   Merge is per record, newest updated_at wins (enforced server-side by the records_lww trigger); deletes are tombstones.
   Photos stay on the device (IndexedDB); only their ids sync. */
(function () {
  'use strict';
  const SB_URL = 'https://mzaviklrqweptobljfoo.supabase.co';
  const SB_KEY = 'sb_publishable_kmoYy1rvzRC4o1TQX7ozhw_YevXIZ_I'; // public (publishable) key; row-level security protects data
  const AUTH_KEY = 'sb-mzaviklrqweptobljfoo-toollog-auth'; // own session: AutoLog shares this origin's storage
  const META = 'toollog:sync:meta', CONFLICTS = 'toollog:sync:conflicts', PRESYNC = 'toollog:backup:presync', DATA_KEY = 'toollog:data:v1';
  const EPOCH = '1970-01-01T00:00:00.000Z';
  const OWNER = '__toollog', NS = 'tl:';
  const TYPES = [['item', 'items'], ['kit', 'kits'], ['custom', 'custom']];
  const App = window.ToolLogApp;
  if (!App) return;

  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const readJSON = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } };
  const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { console.warn('sync storage', e); return false; } };
  const nowISO = () => new Date().toISOString();
  const later = (a, b) => Date.parse(a) > Date.parse(b);
  const stable = o => Array.isArray(o) ? '[' + o.map(stable).join(',') + ']'
    : (o && typeof o === 'object') ? '{' + Object.keys(o).filter(k => o[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + stable(o[k])).join(',') + '}'
    : JSON.stringify(o ?? null);
  const hash = o => { const str = stable(o); let h1 = 0xdeadbeef, h2 = 0x41c6ce57; for (let i = 0; i < str.length; i++) { const c = str.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); } h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909); return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36); };
  const clone = o => JSON.parse(JSON.stringify(o));
  const mine = k => k.startsWith('maint/' + NS);

  /* ---------- db <-> records ---------- */
  function explode(db) {
    const m = new Map();
    for (const [t, key] of TYPES) for (const x of db[key] || []) if (x && x.id) { const id = NS + t + ':' + x.id; if (id.length <= 100) m.set('maint/' + id, { kind: 'maint', id, data: { ...clone(x), _vid: OWNER, _sec: t } }); }
    return m;
  }
  function implode(base, recs) {
    const out = clone(base);
    for (const [t, key] of TYPES) {
      const ord = new Map((base[key] || []).map((x, i) => [x.id, i]));
      out[key] = [...recs.values()].filter(r => r.kind === 'maint' && r.id.startsWith(NS + t + ':') && r.data && r.data._vid === OWNER)
        .map(r => { const { _vid, _sec, ...x } = clone(r.data); x.id = r.id.slice((NS + t + ':').length); return x; })
        .sort((a, b) => (ord.get(a.id) ?? 1e9) - (ord.get(b.id) ?? 1e9) || String(a.created || '').localeCompare(String(b.created || '')));
    }
    return out;
  }

  /* ---------- state ---------- */
  const S = { client: null, loading: null, session: null, state: 'signedout', error: '', running: false, again: false, timer: null, lastRun: 0, cooldownUntil: 0 };
  const getMeta = () => readJSON(META, null);
  const setMeta = m => writeJSON(META, m);
  const pendingCount = () => { const m = getMeta(); return m && S.session && m.user === S.session.user.id ? Object.values(m.recs).filter(r => r.d).length : 0; };
  const dialogOpen = () => !!document.querySelector('dialog[open]');

  function loadLib() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve();
    if (S.loading) return S.loading;
    S.loading = new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = 'vendor/supabase.js'; s.async = true;
      s.onload = () => res(); s.onerror = () => { S.loading = null; rej(new Error('Couldn’t load the sync library. Check your connection.')); };
      document.head.appendChild(s);
    });
    return S.loading;
  }
  async function client() {
    if (S.client) return S.client;
    await loadLib();
    S.client = window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit', storageKey: AUTH_KEY } });
    S.client.auth.onAuthStateChange((ev, session) => {
      S.session = session || null;
      if (session) { if (S.state === 'signedout' || S.state === 'codeSent' || S.state === 'connecting') S.state = 'idle'; setTimeout(() => sync(), 0); }
      else if (ev === 'SIGNED_OUT') S.state = 'signedout';
      paint();
    });
    return S.client;
  }

  /* ---------- change detection ---------- */
  function detect(meta) {
    const local = explode(App.getDb());
    const now = nowISO();
    const bump = m => (m && m.u && !later(now, m.u)) ? new Date(Date.parse(m.u) + 1).toISOString() : now;
    for (const [k, r] of local) {
      const h = hash(r.data), m = meta.recs[k];
      if (m && m.first) { m.h = h; continue; }
      if (!m || m.del || m.h !== h) meta.recs[k] = { h, u: bump(m), d: 1 };
    }
    for (const [k, m] of Object.entries(meta.recs)) {
      if (local.has(k) || m.del) continue;
      if (m.first) { delete meta.recs[k]; continue; }
      meta.recs[k] = { h: 'del', u: bump(m), d: 1, del: 1 };
    }
    return local;
  }

  /* ---------- the sync cycle ---------- */
  async function pull(c, uid, cursor) {
    const rows = []; const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      let q = c.from('records').select('kind,id,data,updated_at,deleted,server_updated_at').eq('user_id', uid).eq('kind', 'maint').like('id', NS + '%');
      if (cursor) q = q.gt('server_updated_at', new Date(Date.parse(cursor) - 60000).toISOString()); // 1 min overlap; LWW makes repeats harmless
      const { data, error } = await q.order('server_updated_at').order('kind').order('id').range(from, from + PAGE - 1);
      if (error) throw error;
      rows.push(...data);
      if (data.length < PAGE) return rows;
    }
  }
  async function push(c, uid, meta, local) {
    const dirty = Object.entries(meta.recs).filter(([k, m]) => m.d && mine(k)); // never write anything outside the tl: namespace
    const live = [], dead = [], sent = [];
    for (const [k, m] of dirty) {
      const [kind, ...rest] = k.split('/'); const id = rest.join('/');
      if (m.del) dead.push({ user_id: uid, kind, id, updated_at: m.u, deleted: true });
      else { const r = local.get(k); if (!r) continue; live.push({ user_id: uid, kind, id, data: r.data, updated_at: m.u, deleted: false }); }
      sent.push([k, m.u]);
    }
    for (const rows of [live, dead]) for (let i = 0; i < rows.length; i += 500) {
      const { error } = await c.from('records').upsert(rows.slice(i, i + 500), { onConflict: 'user_id,kind,id', ignoreDuplicates: false, defaultToNull: false });
      if (error) throw error;
    }
    for (const [k, u] of sent) { const m = meta.recs[k]; if (m && m.u === u) delete m.d; }
    return sent.length;
  }
  async function sync() {
    if (!S.session) return;
    if (S.running) { S.again = true; return; }
    if (!navigator.onLine) { S.state = 'offline'; const m = getMeta(); if (m && m.user === S.session.user.id) { detect(m); setMeta(m); } paint(); return; }
    if (dialogOpen()) { clearTimeout(S.timer); S.timer = setTimeout(sync, 4000); return; } // don't swap data under an open form
    S.running = true; S.state = 'syncing'; S.error = ''; paint();
    try {
      const c = await client(); const uid = S.session.user.id;
      let meta = getMeta();
      if (!meta || meta.user !== uid) {
        // First sync for this account on this device: keep a raw copy of local data, then merge.
        try { if (!localStorage.getItem(PRESYNC)) localStorage.setItem(PRESYNC, localStorage.getItem(DATA_KEY) || '{}'); } catch (e) { /* quota: merge never deletes local records anyway */ }
        meta = { user: uid, cursor: null, lastSync: null, recs: {} };
        for (const [k, r] of explode(App.getDb())) meta.recs[k] = { h: hash(r.data), u: EPOCH, d: 1, first: 1 };
      }
      let local = detect(meta);
      const rows = await pull(c, uid, meta.cursor);
      if (dialogOpen()) { setMeta(meta); S.state = 'idle'; S.again = true; return; }
      local = explode(App.getDb()); // re-read: the user may have changed something while we were fetching
      detect(meta);
      let cursor = meta.cursor, applied = [];
      const conflicts = [];
      for (const row of rows) {
        const k = row.kind + '/' + row.id, m = meta.recs[k];
        if (!mine(k)) continue; // belt and braces: the query already filters to tl: rows
        if (!cursor || later(row.server_updated_at, cursor)) cursor = row.server_updated_at;
        if (m && m.first) {
          if (row.deleted) { delete m.first; m.u = nowISO(); continue; } // deleted in the cloud but still here: keep it and re-upload
          if (hash(row.data) === m.h) { meta.recs[k] = { h: m.h, u: row.updated_at }; continue; }
          if (local.has(k)) conflicts.push({ key: k, local: local.get(k).data, cloudUpdated: row.updated_at, at: nowISO() });
        } else if (m && !later(row.updated_at, m.u)) continue; // ours is the same or newer
        if (row.deleted) { local.delete(k); meta.recs[k] = { h: 'del', u: row.updated_at, del: 1 }; }
        else { local.set(k, { kind: row.kind, id: row.id, data: row.data }); meta.recs[k] = { h: hash(row.data), u: row.updated_at }; }
        applied.push(k);
      }
      for (const m of Object.values(meta.recs)) if (m.first) { delete m.first; m.u = nowISO(); }
      if (conflicts.length) writeJSON(CONFLICTS, [...readJSON(CONFLICTS, []), ...conflicts].slice(-500));
      if (applied.length) {
        App.replaceDb(implode(App.getDb(), local));
        const post = explode(App.getDb());
        for (const k of applied) { const m = meta.recs[k]; if (!m.del && post.has(k)) m.h = hash(post.get(k).data); }
      }
      meta.cursor = cursor;
      setMeta(meta);
      await push(c, uid, meta, explode(App.getDb()));
      meta.lastSync = nowISO(); setMeta(meta);
      S.state = 'idle'; S.lastRun = Date.now();
      if (applied.length) App.toast(`Synced ${applied.length} change${applied.length === 1 ? '' : 's'} from your other devices`);
    } catch (e) {
      console.warn('sync failed', e);
      S.state = navigator.onLine ? 'error' : 'offline';
      S.error = friendly(e);
    } finally {
      S.running = false; paint();
      if (S.again) { S.again = false; clearTimeout(S.timer); S.timer = setTimeout(sync, 800); }
    }
  }
  const schedule = (ms = 2000) => { clearTimeout(S.timer); S.timer = setTimeout(sync, ms); };
  function friendly(e) {
    const msg = String((e && (e.message || e.error_description)) || e || '');
    if (/rate limit|429|too many/i.test(msg) || (e && e.status === 429)) return 'Too many sign-in emails in the last hour. Supabase’s free email sender only allows about 2 per hour for this app. Please try again later.';
    if (/expired|invalid/i.test(msg) && /otp|token|code|link/i.test(msg)) return 'That code or link is invalid or has expired. Request a new one.';
    if (/fetch|network|load failed|connection/i.test(msg)) return 'Couldn’t reach the sync server. Check your connection; changes are saved on this device and will sync later.';
    return msg || 'Something went wrong.';
  }

  /* ---------- sign in with an emailed code (or the pasted sign-in link) ---------- */
  const PEND = 'toollog:sync:pendingEmail';
  async function sendCode(email) {
    email = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { S.error = 'Enter a valid email address.'; paint(); return; }
    if (!navigator.onLine) { S.error = 'You’re offline. Connect to the internet to sign in.'; paint(); return; }
    S.error = ''; S.busy = true; paint();
    try {
      const c = await client();
      const { error } = await c.auth.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo: new URL('./', location.href).href } });
      if (error) throw error;
      sessionStorage.setItem(PEND, email); S.state = 'codeSent'; S.cooldownUntil = Date.now() + 60000;
    } catch (e) { S.error = friendly(e); }
    S.busy = false; paint();
  }
  function parseLink(text) {
    const m = String(text).match(/https?:\/\/\S+/); if (!m) return null;
    try {
      const u = new URL(m[0].replace(/[>)\].,]+$/, ''));
      const token = u.searchParams.get('token') || u.searchParams.get('token_hash'); if (!token) return null;
      const t = u.searchParams.get('type');
      return { token_hash: token, type: ['signup', 'magiclink', 'invite', 'email'].includes(t) ? t : 'email' };
    } catch { return null; }
  }
  async function verify(input) {
    const email = sessionStorage.getItem(PEND) || '';
    const raw = String(input || '').trim(), digits = raw.replace(/\s/g, '');
    S.error = ''; S.busy = true; paint();
    try {
      const c = await client(); let res;
      if (/^\d{6,10}$/.test(digits)) { if (!email) throw new Error('Enter your email again, then the new code.'); res = await c.auth.verifyOtp({ email, token: digits, type: 'email' }); }
      else { const l = parseLink(raw); if (!l) throw new Error('Paste the whole sign-in link from the email (or the 6-digit code, if it shows one).'); res = await c.auth.verifyOtp(l); }
      if (res.error) throw res.error;
      sessionStorage.removeItem(PEND);
      S.session = res.data.session; S.state = 'idle'; App.toast('Signed in. Syncing your data…');
      setTimeout(sync, 0);
    } catch (e) { S.error = friendly(e); }
    S.busy = false; paint();
  }
  async function signOut() {
    try { const c = await client(); await c.auth.signOut({ scope: 'local' }); } catch (e) { console.warn(e); try { localStorage.removeItem(AUTH_KEY); } catch { } }
    S.session = null; S.state = 'signedout'; S.error = ''; paint();
    App.toast('Signed out. Your data stays on this device.');
  }

  /* ---------- UI (Settings > Account & sync) ---------- */
  const tfmt = iso => { if (!iso) return 'never'; const d = new Date(iso), s = (Date.now() - d) / 1000; const t = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); if (s < 45) return 'just now'; if (s < 3600) return `${Math.round(s / 60)} min ago`; return d.toDateString() === new Date().toDateString() ? `today at ${t}` : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${t}`; };
  function cardHTML() {
    const err = S.error ? `<div class="sync-err" role="alert">${esc(S.error)}</div>` : '';
    const head = `<div class="card-head"><h3>☁️ Account &amp; sync</h3>${S.session ? '<span class="tag">Signed in</span>' : '<span class="tag">Optional</span>'}</div>`;
    if (S.state === 'connecting' && !S.session) return `<section class="card sync">${head}<p class="muted" style="margin:0">Connecting to your account…</p></section>`;
    if (S.session) {
      const m = getMeta(), pend = pendingCount();
      const pill = S.state === 'syncing' ? '<span class="pill soon">Syncing…</span>' : S.state === 'offline' ? '<span class="pill none">Offline</span>' : S.state === 'error' ? '<span class="pill over">Sync problem</span>' : '<span class="pill ok">Up to date</span>';
      return `<section class="card sync">${head}
        <div class="sync-row"><div><b>${esc(S.session.user.email || 'Signed in')}</b><small class="muted">Last synced ${esc(tfmt(m && m.user === S.session.user.id ? m.lastSync : null))}${pend ? ` · ${pend} change${pend === 1 ? '' : 's'} waiting` : ''}</small></div>${pill}</div>
        ${S.state === 'offline' ? '<p class="muted sync-note">You’re offline. Changes are saved on this device and will sync when you’re back online.</p>' : ''}${err}
        <div class="btn-row"><button type="button" class="btn small primary" data-sync="now" ${S.state === 'syncing' ? 'disabled' : ''}>⟳ Sync now</button><button type="button" class="btn small" data-sync="signout">Sign out</button></div>
        <p class="muted sync-note">Your items, kits and custom products sync to your private account. Photos stay on each device (back them up with Export). Same account as AutoLog if you use it.</p></section>`;
    }
    if (S.state === 'codeSent') {
      const email = sessionStorage.getItem(PEND) || '';
      const wait = Math.max(0, Math.ceil((S.cooldownUntil - Date.now()) / 1000));
      return `<section class="card sync">${head}
        <p class="sync-lead">We emailed <b>${esc(email)}</b>. New here? It’s titled “Confirm your email address”; after that, “Your sign-in link”. Paste the link from that email here. If your email shows a 6-digit code instead, type the code.</p>
        <form data-sync-form="code" class="sync-form" novalidate>
          <label class="field"><span class="lbl">Sign-in link or code</span><input name="syncCode" autocomplete="one-time-code" autocapitalize="off" spellcheck="false" placeholder="Paste the link (https://…) or code" required></label>
          ${err}<button type="submit" class="btn primary block" ${S.busy ? 'disabled' : ''}>${S.busy ? 'Checking…' : 'Sign in'}</button>
        </form>
        <div class="sync-tip"><b>How to copy the link:</b> in the email, press and hold the link (<b>Sign in</b>, or <b>Confirm email address</b> the first time), tap <b>Copy Link</b>, then paste it above. On iPhone Home Screen apps, don’t tap the link: it would sign in Safari, not this app. In a regular browser, tapping it works too.</div>
        <div class="btn-row"><button type="button" class="btn small" data-sync="resend" ${wait ? 'disabled' : ''}>${wait ? `Resend in ${wait}s` : 'Resend email'}</button><button type="button" class="btn small" data-sync="restart">Use a different email</button></div></section>`;
    }
    return `<section class="card sync">${head}
      <p class="sync-lead">Sign in with your email to keep your tools and batteries in sync on your phone and other devices. You don’t need an account: without one, everything stays on this device, as it does now.</p>
      <form data-sync-form="email" class="sync-form" novalidate>
        <label class="field"><span class="lbl">Email</span><input type="email" name="syncEmail" autocomplete="email" inputmode="email" autocapitalize="off" spellcheck="false" placeholder="you@example.com" required value="${esc(sessionStorage.getItem(PEND) || '')}"></label>
        ${err}<button type="submit" class="btn primary block" ${S.busy ? 'disabled' : ''}>${S.busy ? 'Sending…' : 'Email me a sign-in link'}</button>
      </form>
      <p class="muted sync-note">No password needed. Data already on this device is merged into your account, never erased.</p></section>`;
  }
  function paint() { const el = document.getElementById('syncCard'); if (el) el.innerHTML = cardHTML(); }
  setInterval(() => { if (S.state === 'codeSent' && S.cooldownUntil > Date.now() - 1500) { const b = document.querySelector('[data-sync="resend"]'); if (b) { const w = Math.max(0, Math.ceil((S.cooldownUntil - Date.now()) / 1000)); b.disabled = !!w; b.textContent = w ? `Resend in ${w}s` : 'Resend email'; } } }, 1000);

  document.addEventListener('submit', e => {
    const f = e.target.closest('[data-sync-form]'); if (!f) return; e.preventDefault();
    if (f.dataset.syncForm === 'email') sendCode(f.elements.syncEmail.value);
    else verify(f.elements.syncCode.value);
  });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-sync]'); if (!b) return; e.preventDefault();
    const a = b.dataset.sync;
    if (a === 'now') sync();
    else if (a === 'signout') signOut();
    else if (a === 'resend') sendCode(sessionStorage.getItem(PEND));
    else if (a === 'restart') { sessionStorage.removeItem(PEND); S.state = 'signedout'; S.error = ''; paint(); }
  });

  /* ---------- triggers ---------- */
  window.addEventListener('online', () => { if (S.session) schedule(500); });
  window.addEventListener('offline', () => { if (S.session) { S.state = 'offline'; paint(); } });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.session && Date.now() - S.lastRun > 20000) schedule(300); });
  setInterval(() => { if (document.visibilityState === 'visible' && S.session && !S.running && Date.now() - S.lastRun > 180000) sync(); }, 60000);

  window.ToolLogSync = {
    cardHTML,
    changed() { if (!S.session) return; const m = getMeta(); if (m && m.user === S.session.user.id) { detect(m); setMeta(m); } paint(); schedule(navigator.onLine ? 2000 : 0); },
    sync, status: () => ({ state: S.state, signedIn: !!S.session, user: S.session && S.session.user.email, pending: pendingCount(), lastSync: (getMeta() || {}).lastSync || null, error: S.error }),
    _client: () => client(), // used by the automated tests
  };

  /* ---------- start: only touch the network if this device is signed in or returning from a sign-in link ---------- */
  const h = location.hash;
  const fromLink = /access_token=|error_description=/.test(h);
  if (fromLink || localStorage.getItem(AUTH_KEY)) {
    S.state = 'connecting';
    client().then(async c => {
      const { data } = await c.auth.getSession();
      S.session = data.session || null;
      if (fromLink) {
        const err = new URLSearchParams(h.replace(/^#\/?/, '')).get('error_description');
        if (err) S.error = /expired|invalid/i.test(err) ? 'That sign-in link is invalid or has expired. Request a new one.' : err;
        history.replaceState(null, '', location.pathname + location.search + '#/more'); window.dispatchEvent(new HashChangeEvent('hashchange'));
        if (S.session) App.toast('Signed in. Syncing your data…');
      }
      if (!S.session && S.state === 'connecting') S.state = 'signedout';
      paint(); if (S.session) sync();
    }).catch(e => { S.state = 'error'; S.error = friendly(e); paint(); });
  }
  paint();
})();
