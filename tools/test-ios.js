// ToolLog iOS/WebKit audit (adapted from AutoLog) (Playwright WebKit, iPhone 13 emulation): every form control ≥16px (no zoom-on-focus),
// sheets fit the visible viewport and scroll inside themselves, page behind is locked while open and restored after,
// window can always return to the top, custom dropdown lists scroll inside themselves.
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/workspace/pw/node_modules/playwright'); }
const { webkit, devices } = pw;
const BASE = process.env.BASE || 'http://127.0.0.1:8813/toollog/index.html';
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await webkit.launch(); const c = await b.newContext({ ...devices['iPhone 13'] }); const p = await c.newPage();
  const errors = []; p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const res = {}, bad = { font: [], scroll: [], fit: [], lock: [] }; let n = 0;
  await p.goto(BASE + '?nosplash'); await p.evaluate(() => { localStorage.clear(); sessionStorage.setItem('toollog:splash', '1'); });
  await p.waitForLoadState('networkidle'); await p.evaluate(() => document.querySelector('[data-act="sample"]').click()); await sleep(1500);
  const go = async hash => { await p.goto(BASE + '?nosplash&r=' + (++n) + hash); await p.waitForLoadState('networkidle'); await sleep(250); };
  const fontAudit = async where => { const f = await p.evaluate(() => [...document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=range]), select, textarea')].filter(e => e.offsetParent || e.getClientRects().length).map(e => ({ n: e.name || e.className || e.type, s: parseFloat(getComputedStyle(e).fontSize) })).filter(x => x.s < 16)); f.forEach(x => bad.font.push(`${where}: ${x.n} ${x.s}px`)); };
  // scroll the page down, open a sheet, poke every control, close: page must come back where it was and still reach the top
  const sheetAudit = async (where, open) => {
    await p.evaluate(() => window.scrollTo(0, 400)); await sleep(100); const y0 = await p.evaluate(() => scrollY);
    await open(); await sleep(350);
    const open1 = await p.evaluate(() => !!document.querySelector('dialog[open]')); if (!open1) { bad.scroll.push(where + ': sheet did not open'); return; }
    await fontAudit(where);
    const fit = await p.evaluate(() => { const s = document.querySelector('dialog[open] .sheet-inner, dialog[open] .confirm-inner, dialog[open]'); const r = s.getBoundingClientRect(), vv = window.visualViewport; const body = document.querySelector('dialog[open] .sheet-body'); return { top: r.top, bottom: r.bottom, vh: vv ? vv.height : innerHeight, ob: body ? getComputedStyle(body).overscrollBehaviorY : 'n/a', oy: body ? getComputedStyle(body).overflowY : 'n/a', html: getComputedStyle(document.documentElement).overflowY, bodyPos: getComputedStyle(document.body).position }; });
    if (fit.top < -1 || fit.bottom > fit.vh + 1) bad.fit.push(`${where}: sheet ${Math.round(fit.top)}..${Math.round(fit.bottom)} vs viewport ${fit.vh}`);
    if (fit.ob !== 'contain' && fit.ob !== 'n/a') bad.fit.push(`${where}: sheet-body overscroll ${fit.ob}`);
    if (fit.html !== 'hidden' && fit.bodyPos !== 'fixed') bad.lock.push(`${where}: page behind not locked (${fit.html}/${fit.bodyPos})`);
    const ctrls = await p.$$('dialog[open] select:visible, dialog[open] input[type=text]:visible, dialog[open] input[type=number]:visible, dialog[open] textarea:visible, dialog[open] input[type=search]:visible');
    for (const el of ctrls.slice(0, 40)) { try { await el.scrollIntoViewIfNeeded({ timeout: 500 }); await el.focus(); await sleep(30); } catch (e) { /* hidden */ } }
    const yIn = await p.evaluate(() => scrollY);
    await p.keyboard.press('Escape'); await sleep(80); if (await p.evaluate(() => !!document.querySelector('dialog[open]'))) { await p.keyboard.press('Escape'); await sleep(80); }
    await p.evaluate(() => document.querySelector('dialog[open]')?.close()); await sleep(250);
    const after = await p.evaluate(() => ({ y: scrollY, html: getComputedStyle(document.documentElement).overflowY, pos: getComputedStyle(document.body).position, top: document.body.style.top }));
    if (Math.abs(after.y - y0) > 2) bad.scroll.push(`${where}: page moved ${y0}→${yIn} while open, ${after.y} after close`);
    if (after.html === 'hidden' || after.pos === 'fixed') bad.lock.push(`${where}: scroll lock left on after close`);
    await p.evaluate(() => window.scrollTo(0, 0)); await sleep(60);
    const top = await p.evaluate(() => ({ y: scrollY, hdr: document.querySelector('header, .topbar, .app-head')?.getBoundingClientRect().top ?? 0 }));
    if (top.y !== 0 || top.hdr < -1) bad.scroll.push(`${where}: can't get back to top (${JSON.stringify(top)})`);
  };
  const fab = () => p.evaluate(() => document.getElementById('fab').click());
  const act = (a, sel = '') => () => p.evaluate(([a, sel]) => document.querySelector(`[data-act="${a}"]${sel}`).click(), [a, sel]);
  const ids = await p.evaluate(() => { const d = window.ToolLogApp.getDb(); return { item: d.items.find(i => i.kind === 'battery').id, kit: d.kits[0] && d.kits[0].id }; });
  for (const h of ['#/dash', '#/tools', '#/tools?g=type', '#/tools?g=platform', '#/power', '#/item/' + ids.item, '#/kit/' + ids.kit, '#/export', '#/more', '#/about']) { await go(h); await fontAudit(h); }
  await go('#/tools'); await sheetAudit('Catalog picker', fab);
  await go('#/tools'); await sheetAudit('Add my own', async () => { await fab(); await sleep(900); await p.evaluate(() => document.querySelector('[data-own]').click()); await sleep(200); });
  await go('#/item/' + ids.item); await sheetAudit('Edit item', act('editItem'));
  await go('#/kit/' + ids.kit); await sheetAudit('Edit kit', act('editKit'));
  // picker search input
  await go('#/tools'); await fab(); await sleep(900);
  res.pickerSearch16 = await p.evaluate(() => { const i = document.querySelector('#picker input'); return i && parseFloat(getComputedStyle(i).fontSize) >= 16 ? 'PASS' : 'FAIL'; });
  await p.evaluate(() => document.querySelector('dialog[open]')?.close()); await sleep(200);
  // searchable combo with "my own" option
  await go('#/tools'); await fab(); await sleep(900); await p.evaluate(() => document.querySelector('[data-own]').click()); await sleep(300);
  await p.focus('#sheetForm [name="store"]'); await p.keyboard.type('Zzz Hardware'); await sleep(200);
  res.comboOwnOption = await p.evaluate(() => /my own/i.test(document.querySelector('#sheetForm [data-k="store"] .combo-list')?.innerText || '') ? 'PASS' : 'FAIL ' + (document.querySelector('#sheetForm [data-k="store"]')?.innerText || 'no field').slice(0, 120));
  await p.evaluate(() => document.querySelector('dialog[open]')?.close()); await sleep(200);
  res.viewportMeta = await p.evaluate(() => { const m = document.querySelector('meta[name=viewport]').content; return /width=device-width/.test(m) && !/user-scalable=no|maximum-scale=1(\D|$)/.test(m) ? 'PASS' : 'FAIL ' + m; });
  res.noVhOnScrollers = await p.evaluate(() => { const bad = []; for (const sh of document.styleSheets) { let rules; try { rules = sh.cssRules; } catch (e) { continue; } const walk = rs => { for (const r of rs) { if (r.cssRules) walk(r.cssRules); if (r.style && /\d(vh)\b/.test(r.cssText) && !/dvh|svh|lvh/.test(r.cssText)) bad.push(r.selectorText); } }; walk(rules); } return bad.length ? 'FAIL ' + bad.join(', ') : 'PASS'; });
  for (const k of Object.keys(bad)) res[k] = bad[k].length ? 'FAIL ' + JSON.stringify([...new Set(bad[k])].slice(0, 12)) : 'PASS';
  res.errors = errors.length ? 'FAIL ' + JSON.stringify(errors.slice(0, 5)) : 'PASS';
  console.log(JSON.stringify(res, null, 1)); const f = Object.values(res).filter(x => x !== 'PASS').length; console.log(f ? f + ' FAIL' : 'ALL PASS');
  await b.close(); process.exit(f ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
