import { launch } from './cdp.mjs';
import path from 'node:path';
import { mkdirSync } from 'node:fs';

const SHOTS = path.join(import.meta.dirname, 'shots');
mkdirSync(SHOTS, { recursive: true });
const HOME = 'https://play-gridfall.pages.dev/';
const ENTRY = 'https://play-gridfall.pages.dev/board-club';
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
    if (r.path !== '/board-club') return 'path ' + r.path;
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
    return r.path === '/board-club' && r.title === '黑白棋社 · Gridfall' ? true : JSON.stringify(r);
  });

  await t('route.query_game_go', async () => {
    await b.evaluate(`location.href = './board-club?game=go'`);
    const ok = await waitFor('typeof W !== "undefined" && W.size === 19 && !document.getElementById("secGo").classList.contains("hidden")');
    if (!ok) return 'go not open';
    const p = await b.evaluate('location.pathname');
    return p === '/board-club' ? true : 'path ' + p;
  });

  await t('route.query_online', async () => {
    await b.evaluate(`location.href = './board-club?online=1&game=gomoku'`);
    const ok = await waitFor('typeof NET !== "undefined" && !document.getElementById("secOnline").classList.contains("hidden")');
    if (!ok) return 'online not open';
    return await b.evaluate('location.pathname') === '/board-club' ? true : 'path';
  });

  await t('route.trailing_slash', async () => {
    await b.evaluate(`location.href = './board-club/'`);
    await sleep(1500);
    const p = await b.evaluate('location.pathname');
    return p === '/board-club' ? true : 'path ' + p;
  });

  await t('route.home_to_entry_back_forward', async () => {
    await b.evaluate(`location.href = ${JSON.stringify(HOME)}`);
    await waitFor(`document.title === 'Gridfall'`, 10000);
    await b.clickSel('.game-card[data-status="live"] .play-link');
    if (!await waitFor(`typeof G !== "undefined" && location.pathname === '/board-club'`, 12000)) return 'card did not enter /board-club';
    await b.evaluate('history.back()');
    if (!await waitFor(`document.title === 'Gridfall'`, 10000)) return 'back failed';
    await b.evaluate('history.forward()');
    if (!await waitFor(`typeof G !== "undefined" && location.pathname === '/board-club'`, 12000)) return 'forward failed';
    return true;
  });

  await t('route.entry_url_copy', async () => {
    const r = await b.evaluate(`({ href: location.href, path: location.pathname, search: location.search })`);
    if (r.path !== '/board-club') return JSON.stringify(r);
    return true;
  });

  await t('route.legacy_HBQS_query', async () => {
    await b.send('Page.navigate', { url: 'https://play-gridfall.pages.dev/HBQS?game=go' });
    const ok = await waitFor(`typeof W !== "undefined" && location.pathname === '/board-club' && location.search.includes('game=go')`, 15000);
    if (!ok) return JSON.stringify(await b.evaluate(`({path:location.pathname,search:location.search,size:typeof W!=='undefined'?W.size:null})`));
    return true;
  });

  await t('route.legacy_play_html', async () => {
    await b.send('Page.navigate', { url: 'https://play-gridfall.pages.dev/play.html' });
    const ok = await waitFor(`typeof G !== "undefined" && location.pathname === '/board-club'`, 15000);
    return ok ? true : 'path ' + await b.evaluate('location.pathname');
  });

  const fail = R.filter(r => !r.pass);
  console.log(`ROUTE TOTAL ${R.length} PASS ${R.length - fail.length} FAIL ${fail.length}`);
  R.forEach(r => console.log((r.pass ? 'PASS ' : 'FAIL ') + r.id + (r.detail ? ' :: ' + r.detail : '')));
} finally {
  await b.close();
}
