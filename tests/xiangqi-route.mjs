import { launch } from './cdp.mjs';
import path from 'node:path';
import { mkdirSync } from 'node:fs';

const SHOTS = path.join(import.meta.dirname, 'shots');
mkdirSync(SHOTS, { recursive: true });
const HOME = 'https://play-gridfall.pages.dev/';
const ENTRY = 'https://play-gridfall.pages.dev/ZGXQ';
const b = await launch(ENTRY, { port: 9561 });
const R = [];
const t = async (id, fn) => {
  try {
    const d = await fn();
    if (d && typeof d === 'object' && 'pass' in d) R.push({ id, pass: !!d.pass, detail: d.detail });
    else R.push({ id, pass: d === true || d === undefined, detail: typeof d === 'string' ? d : undefined });
  } catch (e) { R.push({ id, pass: false, detail: e.message }); }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const waitFor = async (expr, ms = 15000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await b.evaluate(`(() => { try { return !!(${expr}); } catch(e) { return false; } })()`)) return true;
    await sleep(150);
  }
  return false;
};
try {
  await t('xqroute.entry', async () => {
    const r = await b.evaluate(`({ path: location.pathname, title: document.title, canvas: !!document.getElementById('board'), modes: document.querySelectorAll('#modeSeg .seg-btn').length, download: !!document.getElementById('btnDownload') })`);
    if (r.path !== '/ZGXQ') return 'path ' + r.path;
    if (r.title !== '中国象棋 · Xiangqi | Gridfall') return 'title ' + r.title;
    if (!r.canvas || r.modes !== 3) return JSON.stringify(r);
    if (r.download) return 'download button present';
    return true;
  });
  await b.screenshot(path.join(SHOTS, 'xqroute.png'));
  await t('xqroute.refresh', async () => {
    await b.send('Page.reload'); await sleep(1200);
    const ok = await waitFor('typeof state !== "undefined"');
    if (!ok) return 'no state';
    return await b.evaluate('location.pathname') === '/ZGXQ' ? true : 'path';
  });
  await t('xqroute.trailing_slash', async () => {
    await b.evaluate(`location.href = './ZGXQ/'`); await sleep(1500);
    return await b.evaluate('location.pathname') === '/ZGXQ' ? true : 'path ' + await b.evaluate('location.pathname');
  });
  await t('xqroute.home_card_back_forward', async () => {
    await b.evaluate(`location.href = ${JSON.stringify(HOME)}`);
    await waitFor(`document.title.includes('游戏大厅') && document.querySelectorAll('.game-card').length === 9`, 12000);
    await b.evaluate(`document.querySelectorAll('.game-card[data-status="live"] .play-link')[1].click()`);
    if (!await waitFor(`document.title.includes('中国象棋') && location.pathname === '/ZGXQ'`, 12000)) return 'card enter failed';
    await b.evaluate('history.back()');
    if (!await waitFor(`document.title.includes('游戏大厅') && document.querySelectorAll('.game-card').length === 9`, 12000)) return 'back failed';
    await b.evaluate('history.forward()');
    if (!await waitFor(`document.title.includes('中国象棋') && location.pathname === '/ZGXQ'`, 12000)) return 'forward failed';
    return true;
  });
  const fail = R.filter(r => !r.pass);
  console.log(`XQ-ROUTE TOTAL ${R.length} PASS ${R.length - fail.length} FAIL ${fail.length}`);
  R.forEach(r => console.log((r.pass ? 'PASS ' : 'FAIL ') + r.id + (r.detail ? ' :: ' + r.detail : '')));
} finally { await b.close(); }
