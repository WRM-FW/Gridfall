import { launch } from './cdp.mjs';
const SHOTS = path.join(import.meta.dirname, 'shots');
mkdirSync(SHOTS, { recursive: true });
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(import.meta.dirname, '..');
const home = pathToFileURL(path.join(ROOT, 'index.html')).href;
const play = pathToFileURL(path.join(ROOT, 'play.html')).href;
const b = await launch(home, { port: 9461 });
const R = [];
const t = async (id, fn) => {
  try {
    const d = await fn();
    if (d && typeof d === 'object' && 'pass' in d) R.push({ id, pass: !!d.pass, detail: d.detail });
    else R.push({ id, pass: d === true || d === undefined, detail: typeof d === 'string' ? d : undefined });
  } catch (e) { R.push({ id, pass: false, detail: e.message }); }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const waitFor = async (expr, ms = 8000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await b.evaluate(`(() => { try { return !!(${expr}); } catch(e) { return false; } })()`)) return true;
    await sleep(120);
  }
  return false;
};
const goto = async (url) => { await b.send('Page.navigate', { url }); await sleep(900); };

try {
  await t('home.loads', async () => {
    const r = await b.evaluate(`({
      title: document.title,
      h1: document.querySelector('h1.hero-title').textContent.replace(/\\s+/g,' ').trim(),
      cards: document.querySelectorAll('.game-card').length,
      live: document.querySelectorAll('.game-card[data-status="live"]').length,
      soon: document.querySelectorAll('.game-card[data-status="soon"]').length,
      err: window.__qaErrors || []
    })`);
    if (!r.title.includes('游戏大厅')) return 'title ' + r.title;
    if (r.cards !== 9 || r.live !== 6 || r.soon !== 3) return 'cards ' + JSON.stringify(r);
    if (r.err.length) return 'errors ' + JSON.stringify(r.err);
    return true;
  });
  await b.screenshot(path.join(SHOTS, 'home-desktop.png'));

  await t('home.miniBoard', async () => {
    const before = await b.evaluate(`document.querySelectorAll('#cells button').length`);
    if (before !== 81) return 'cells ' + before;
    const n0 = await b.evaluate(`document.getElementById('stoneCount').textContent`);
    const pt = await b.evaluate(`(() => { const el = document.querySelector('#cells button:nth-child(5)'); el.scrollIntoView({block:'center'}); const r = el.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; })()`);
    await b.clickAt(pt.x, pt.y);
    await sleep(200);
    const n1 = await b.evaluate(`document.getElementById('stoneCount').textContent`);
    if (Number(n1) !== Number(n0) + 1) return 'count ' + n0 + '->' + n1;
    await b.clickSel('#resetBoard');
    const n2 = await b.evaluate(`document.getElementById('stoneCount').textContent`);
    return Number(n2) === 5 ? true : 'reset ' + n2;
  });

  await t('home.filterSearch', async () => {
    await b.evaluate(`[...document.querySelectorAll('.chip')].find(c=>c.dataset.filter==='soon').click()`);
    await sleep(200);
    let r = await b.evaluate(`[...document.querySelectorAll('.game-card')].filter(c=>c.style.display !== 'none').length`);
    if (r !== 3) return 'soon filter ' + r;
    await b.evaluate(`[...document.querySelectorAll('.chip')].find(c=>c.dataset.filter==='all').click()`);
    await b.evaluate(`(() => { const i=document.getElementById('gameSearch'); i.value='围棋'; i.dispatchEvent(new Event('input')); })()`);
    await sleep(200);
    r = await b.evaluate(`[...document.querySelectorAll('.game-card')].filter(c=>c.style.display !== 'none').length`);
    if (r !== 1) return 'search go ' + r;
    await b.evaluate(`(() => { const i=document.getElementById('gameSearch'); i.value='联机'; i.dispatchEvent(new Event('input')); })()`);
    await sleep(200);
    r = await b.evaluate(`[...document.querySelectorAll('.game-card')].filter(c=>c.style.display !== 'none').length`);
    if (r !== 2) return 'search online ' + r;
    await b.evaluate(`(() => { const i=document.getElementById('gameSearch'); i.value=''; i.dispatchEvent(new Event('input')); })()`);
    return true;
  });

  await t('home.cardGomokuLink', async () => {
    await b.clickSel('.game-card[data-status="live"] .play-link');
    await waitFor('typeof G !== "undefined" && G.rule === "free" && !document.getElementById("secGomoku").classList.contains("hidden")');
    const r = await b.evaluate(`({rule:G.rule, opp:G.opp, tab:document.getElementById('tabGomoku').className, err:window.__qaErrors||[]})`);
    if (r.rule !== 'free' || r.opp !== 'ai') return JSON.stringify(r);
    if (r.err.length) return 'errors ' + JSON.stringify(r.err);
    return true;
  });
  await b.screenshot(path.join(SHOTS, 'home-gomoku-entry.png'));

  await t('game.backToHall', async () => {
    await b.clickSel('.hall-link');
    await sleep(900);
    const r = await b.evaluate(`({title:document.title, hall:!!document.querySelector('.game-card')})`);
    return r.title.includes('游戏大厅') && r.hall ? true : 'back failed ' + JSON.stringify(r);
  });

  await t('home.xiangqiLink', async () => {
    await b.evaluate(`document.querySelectorAll('.game-card[data-status="live"] .play-link')[1].click()`);
    const ok = await waitFor('document.title.includes("中国象棋") && typeof state !== "undefined"');
    if (!ok) return 'did not open xiangqi: ' + await b.evaluate('location.href');
    const r = await b.evaluate(`({ mode: state.mode, canvas: !!document.getElementById('board'), hall: !!document.querySelector('.hall-link'), online: [...document.querySelectorAll('#modeSeg .seg-btn')].some(b=>b.dataset.mode==='online') })`);
    if (r.mode !== 'ai' || !r.canvas || !r.hall || !r.online) return JSON.stringify(r);
    await b.clickSel('.hall-link');
    await sleep(900);
    return (await b.evaluate('document.title')).includes('游戏大厅') ? true : 'back failed';
  });

  await t('home.minigameLinks', async () => {
    const games = [
      ['./game2048.html', '2048 · 游戏'],
      ['./saolei.html', '扫雷'],
      ['./tiaoqi.html', '跳棋'],
      ['./junqi.html', '军棋 · 陆战棋']
    ];
    for (const [local, title] of games) {
      await goto(home);
      await waitFor(`document.querySelectorAll('.game-card').length === 9`, 8000);
      const clicked = await b.evaluate(`(() => { const a = document.querySelector('.game-card a[data-local="${local}"]'); if (!a) return false; a.click(); return true; })()`);
      if (!clicked) return 'card missing ' + local;
      if (!await waitFor(`document.title.includes(${JSON.stringify(title)})`, 8000)) return 'did not open ' + local;
      if (!await b.evaluate(`!!document.querySelector('a[title="返回 Gridfall 游戏大厅"]')`)) return 'no hall pill ' + local;
      await b.clickSel('a[title="返回 Gridfall 游戏大厅"]');
      if (!await waitFor(`document.title.includes('游戏大厅')`, 8000)) return 'back failed ' + local;
    }
    return true;
  });

  await t('home.renjuFormalLink', async () => {
    await goto(play + '?game=gomoku&rule=renju&opening=formal');
    const ok = await waitFor('typeof G !== "undefined" && G.rule === "renju" && G.openingMode === "formal" && G.phase === "select"');
    if (!ok) return 'state ' + JSON.stringify(await b.evaluate(`({rule:G.rule,opening:G.openingMode,phase:G.phase})`));
    const n = await b.evaluate(`document.querySelectorAll('#gOpenings button').length`);
    if (n !== 26) return 'openings ' + n;
    return true;
  });
  await b.screenshot(path.join(SHOTS, 'home-renju-entry.png'));

  await t('home.goLink', async () => {
    await goto(play + '?game=go&size=9');
    const ok = await waitFor('typeof W !== "undefined" && W.size === 9 && !document.getElementById("secGo").classList.contains("hidden")');
    if (!ok) return 'go state ' + JSON.stringify(await b.evaluate(`({size:W.size, hidden:document.getElementById("secGo").classList.contains("hidden")})`));
    return true;
  });
  await b.screenshot(path.join(SHOTS, 'home-go-entry.png'));

  await t('home.onlineLink', async () => {
    await goto(play + '?online=1&game=gomoku');
    const ok = await waitFor('typeof NET !== "undefined" && !document.getElementById("secOnline").classList.contains("hidden")');
    if (!ok) return 'online tab not open';
    const r = await b.evaluate(`({game:NET.settings.game, status:document.getElementById('nStatus').textContent})`);
    if (r.game !== 'gomoku') return 'settings ' + JSON.stringify(r);
    return true;
  });
  await b.screenshot(path.join(SHOTS, 'home-online-entry.png'));

  /* mobile homepage */
  await b.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await goto(home);
  await sleep(600);
  await b.screenshot(path.join(SHOTS, 'home-mobile.png'));
  await t('home.mobile_noHorizontalScroll', async () => {
    const r = await b.evaluate(`({sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth})`);
    return r.sw <= r.cw + 2 ? true : 'overflow ' + JSON.stringify(r);
  });

  const fail = R.filter(r => !r.pass);
  console.log(`HOME TOTAL ${R.length} PASS ${R.length - fail.length} FAIL ${fail.length}`);
  R.forEach(r => console.log((r.pass ? 'PASS ' : 'FAIL ') + r.id + (r.detail ? ' :: ' + r.detail : '')));
} finally {
  await b.close();
}