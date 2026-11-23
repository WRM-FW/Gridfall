import { launch } from './cdp.mjs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';

const ROOT = path.resolve(import.meta.dirname, '..');
const SHOTS = path.join(import.meta.dirname, 'shots');
mkdirSync(SHOTS, { recursive: true });
const home = pathToFileURL(path.join(ROOT, 'index.html')).href;
const pages = [
  ['board-club', 'games/board-club/index.html'],
  ['chinese-chess', 'games/chinese-chess/index.html'],
  ['chinese-checkers', 'games/chinese-checkers/index.html'],
  ['2048', 'games/2048/index.html'],
  ['army-chess', 'games/army-chess/index.html'],
  ['minesweeper', 'games/minesweeper/index.html'],
  ['snake', 'games/snake/index.html'],
  ['sokoban', 'games/sokoban/index.html'],
  ['tetris', 'games/tetris/index.html'],
  ['tic-tac-toe', 'games/tic-tac-toe/index.html']
];
const b = await launch(home, { port: 9466 });
const R = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const waitFor = async (expr, ms = 10000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await b.evaluate(`(() => { try { return !!(${expr}); } catch(e) { return false; } })()`)) return true;
    await sleep(120);
  }
  return false;
};
try {
  for (const [name, rel] of pages) {
    await b.send('Page.navigate', { url: pathToFileURL(path.join(ROOT, rel)).href });
    const ok = await waitFor(`!!document.querySelector('a[title="返回 Gridfall 游戏大厅"]')`);
    let detail = '';
    if (!ok) detail = 'no hall link';
    else {
      const r = await b.evaluate(`(() => { const a=document.querySelector('a[title="返回 Gridfall 游戏大厅"]'); const x=a.getBoundingClientRect(); return { href:a.getAttribute('href'), x:x.x, y:x.y, w:x.width, h:x.height, sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth }; })()`);
      if (!/index\.html$/.test(r.href)) detail = 'href ' + r.href;
      else if (r.sw > r.cw + 2) detail = 'overflow ' + JSON.stringify(r);
      else if (r.x < 0 || r.y < 0 || r.x + r.w > 1281) detail = 'offscreen ' + JSON.stringify(r);
      else {
        await b.evaluate(`document.querySelector('a[title="返回 Gridfall 游戏大厅"]').click()`);
        if (!await waitFor(`document.title.includes('Game') || document.title.includes('游戏大厅')`)) detail = 'back failed';
      }
    }
    R.push({ id: 'hall.' + name, pass: !detail, detail });
  }

  // mobile widths for every hall button
  await b.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  for (const [name, rel] of pages) {
    await b.send('Page.navigate', { url: pathToFileURL(path.join(ROOT, rel)).href });
    const r = await b.evaluate(`(() => { const a=document.querySelector('a[title="返回 Gridfall 游戏大厅"]'); if(!a) return null; const x=a.getBoundingClientRect(); return { x:x.x, y:x.y, right:x.right, bottom:x.bottom, sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth }; })()`);
    const bad = !r || r.sw > r.cw + 2 || r.x < 0 || r.right > 391 || r.bottom > 845;
    R.push({ id: 'hall.mobile.' + name, pass: !bad, detail: bad ? JSON.stringify(r) : '' });
  }
  await b.screenshot(path.join(SHOTS, 'hall-mobile.png'));

  const fail = R.filter(r => !r.pass);
  console.log(`HALL TOTAL ${R.length} PASS ${R.length - fail.length} FAIL ${fail.length}`);
  R.forEach(r => console.log((r.pass ? 'PASS ' : 'FAIL ') + r.id + (r.detail ? ' :: ' + r.detail : '')));
} finally { await b.close(); }