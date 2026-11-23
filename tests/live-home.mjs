import { launch } from './cdp.mjs';
const SHOTS = path.join(import.meta.dirname, 'shots');
mkdirSync(SHOTS, { recursive: true });
import path from 'node:path';
import { mkdirSync } from 'node:fs';

const HOME = 'https://play-gridfall.pages.dev/';
const b = await launch(HOME, { port: 9481 });
const R = [];
const t = async (id, fn) => {
  try {
    const d = await fn();
    if (d && typeof d === 'object' && 'pass' in d) R.push({ id, pass: !!d.pass, detail: d.detail });
    else R.push({ id, pass: d === true || d === undefined, detail: typeof d === 'string' ? d : undefined });
  } catch (e) { R.push({ id, pass: false, detail: e.message }); }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const waitFor = async (expr, ms = 12000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await b.evaluate(`(() => { try { return !!(${expr}); } catch(e) { return false; } })()`)) return true;
    await sleep(150);
  }
  return false;
};
try {
  await t('livehome.loads', async () => {
    const r = await b.evaluate(`({ title: document.title, live: document.querySelectorAll('.game-card[data-status="live"]').length, cards: document.querySelectorAll('.game-card').length })`);
    if (!r.title.includes('游戏大厅') || r.live !== 6 || r.cards !== 9) return JSON.stringify(r);
    return true;
  });
  await b.screenshot(path.join(SHOTS, 'live-home.png'));

  await t('livehome.gomoku_card', async () => {
    await b.clickSel('.game-card[data-status="live"] .play-link');
    const ok = await waitFor('typeof G !== "undefined" && !document.getElementById("secGomoku").classList.contains("hidden")');
    if (!ok) return 'did not navigate: ' + await b.evaluate('location.href');
    const r = await b.evaluate(`({ url: location.href, path: location.pathname, rule: G.rule, opp: G.opp })`);
    if (r.path !== '/HBQS') return 'entry path ' + JSON.stringify(r);
    if (r.rule !== 'free' || r.opp !== 'ai') return JSON.stringify(r);
    return true;
  });
  await b.screenshot(path.join(SHOTS, 'live-home-gomoku.png'));

  await t('livehome.back', async () => {
    await b.clickSel('.hall-link');
    const ok = await waitFor(`document.title.includes('游戏大厅')`, 10000);
    if (!ok) return 'no back';
    return true;
  });

  await t('livehome.xiangqi_card', async () => {
    await waitFor(`document.title.includes('游戏大厅') && document.querySelectorAll('.game-card').length === 9`, 12000);
    await b.evaluate(`document.querySelectorAll('.game-card[data-status="live"] .play-link')[1].click()`);
    const ok = await waitFor(`document.title.includes('中国象棋') && location.pathname === '/ZGXQ' && typeof state !== 'undefined'`, 12000);
    if (!ok) return 'did not open /ZGXQ: ' + await b.evaluate('location.href');
    const r = await b.evaluate(`({ title: document.title, mode: state.mode, online: [...document.querySelectorAll('#modeSeg .seg-btn')].some(b=>b.dataset.mode==='online') })`);
    if (r.mode !== 'ai' || !r.online) return JSON.stringify(r);
    await b.clickSel('.hall-link');
    await waitFor(`document.title.includes('游戏大厅')`, 10000);
    return true;
  });

  await t('livehome.renju_deeplink', async () => {
    await b.evaluate(`location.href = './HBQS?game=gomoku&rule=renju&opening=formal'`);
    const ok = await waitFor('typeof G !== "undefined" && G.rule === "renju" && G.phase === "select"');
    if (!ok) return 'state ' + JSON.stringify(await b.evaluate(`({rule:G.rule,phase:G.phase,url:location.href})`));
    const p = await b.evaluate('location.pathname');
    return p === '/HBQS' ? true : 'path ' + p;
  });

  await t('livehome.online_entry', async () => {
    await b.evaluate(`location.href = './HBQS?online=1&game=gomoku'`);
    const ok = await waitFor('typeof NET !== "undefined" && !document.getElementById("secOnline").classList.contains("hidden")');
    if (!ok) return 'online not open';
    const r = await b.evaluate(`({ game: NET.settings.game, status: document.getElementById('nStatus').textContent })`);
    if (r.game !== 'gomoku') return JSON.stringify(r);
    return true;
  });
  await b.screenshot(path.join(SHOTS, 'live-home-online.png'));

  const fail = R.filter(r => !r.pass);
  console.log(`LIVE-HOME TOTAL ${R.length} PASS ${R.length - fail.length} FAIL ${fail.length}`);
  R.forEach(r => console.log((r.pass ? 'PASS ' : 'FAIL ') + r.id + (r.detail ? ' :: ' + r.detail : '')));
} finally {
  await b.close();
}