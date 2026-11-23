import { launch } from './cdp.mjs';
import path from 'node:path';
import { mkdirSync } from 'node:fs';

const SHOTS = path.join(import.meta.dirname, 'shots');
mkdirSync(SHOTS, { recursive: true });
const HOME = 'https://play-gridfall.pages.dev/';
const ENTRY = 'https://play-gridfall.pages.dev/HBQS';
const b = await launch(ENTRY, { port: 9501 });
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
  await t('route.entry_loads', async () => {
    const r = await b.evaluate(`({ path: location.pathname, title: document.title, g: typeof G, tab: !document.getElementById('secGomoku').classList.contains('hidden') })`);
    if (r.path !== '/HBQS') return 'path ' + r.path;
    if (r.title !== '黑白棋社 · Gridfall') return 'title ' + r.title;
    if (r.g !== 'object' || !r.tab) return JSON.stringify(r);
    return true;
  });
  await b.screenshot(path.join(SHOTS, 'route-hbqs.png'));

  await t('route.refresh', async () => {
    await b.send('Page.reload');
    await sleep(1200);
    const ok = await waitFor('typeof G !== "undefined"');
    if (!ok) return 'no game after reload';
    const r = await b.evaluate(`({ path: location.pathname, title: document.title })`);
    return r.path === '/HBQS' && r.title === '黑白棋社 · Gridfall' ? true : JSON.stringify(r);
  });

  await t('route.query_game_go', async () => {
    await b.evaluate(`location.href = './HBQS?game=go'`);
    const ok = await waitFor('typeof W !== "undefined" && W.size === 19 && !document.getElementById("secGo").classList.contains("hidden")');
    if (!ok) return 'go not open';
    const p = await b.evaluate('location.pathname');
    return p === '/HBQS' ? true : 'path ' + p;
  });

  await t('route.query_online', async () => {
    await b.evaluate(`location.href = './HBQS?online=1&game=gomoku'`);
    const ok = await waitFor('typeof NET !== "undefined" && !document.getElementById("secOnline").classList.contains("hidden")');
    if (!ok) return 'online not open';
    return await b.evaluate('location.pathname') === '/HBQS' ? true : 'path';
  });

  await t('route.trailing_slash', async () => {
    await b.evaluate(`location.href = './HBQS/'`);
    await sleep(1500);
    const p = await b.evaluate('location.pathname');
    return p === '/HBQS' ? true : 'path ' + p;
  });

  await t('route.home_to_entry_back_forward', async () => {
    await b.evaluate(`location.href = ${JSON.stringify(HOME)}`);
    await waitFor(`document.title.includes('游戏大厅')`, 10000);
    await b.clickSel('.game-card[data-status="live"] .play-link');
    if (!await waitFor(`typeof G !== "undefined" && location.pathname === '/HBQS'`, 12000)) return 'card did not enter /HBQS';
    await b.evaluate('history.back()');
    if (!await waitFor(`document.title.includes('游戏大厅')`, 10000)) return 'back failed';
    await b.evaluate('history.forward()');
    if (!await waitFor(`typeof G !== "undefined" && location.pathname === '/HBQS'`, 12000)) return 'forward failed';
    return true;
  });

  await t('route.entry_url_copy', async () => {
    const r = await b.evaluate(`({ href: location.href, path: location.pathname, search: location.search })`);
    if (r.path !== '/HBQS') return JSON.stringify(r);
    return true;
  });

  const fail = R.filter(r => !r.pass);
  console.log(`ROUTE TOTAL ${R.length} PASS ${R.length - fail.length} FAIL ${fail.length}`);
  R.forEach(r => console.log((r.pass ? 'PASS ' : 'FAIL ') + r.id + (r.detail ? ' :: ' + r.detail : '')));
} finally {
  await b.close();
}
