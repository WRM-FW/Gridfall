import { launch } from './cdp.mjs';
import path from 'node:path';
import { mkdirSync } from 'node:fs';

const SHOTS = path.join(import.meta.dirname, 'shots');
mkdirSync(SHOTS, { recursive: true });
const BASE = 'https://play-gridfall.pages.dev';
const games = [
  { route: '/chinese-checkers', title: '跳棋', name: 'chinese-checkers' },
  { route: '/2048', title: '2048 · 游戏', name: '2048' },
  { route: '/army-chess', title: '军棋 · 陆战棋', name: 'army-chess' },
  { route: '/minesweeper', title: '扫雷', name: 'minesweeper' },
  { route: '/snake', title: '贪吃蛇', name: 'snake' },
  { route: '/sokoban', title: '推箱子', name: 'sokoban' },
  { route: '/tetris', title: '俄罗斯方块', name: 'tetris' },
  { route: '/tic-tac-toe', title: '井字棋', name: 'tic-tac-toe' },
  { route: '/jump', title: '跳一跳', name: 'jump' },
  { route: '/uno', title: 'UNO', name: 'uno' }
];
const b = await launch(BASE + '/', { port: 9611 });
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
  for (const g of games) {
    await t('miniroute' + g.route.replace('/', '.') + '.entry', async () => {
      await b.send('Page.navigate', { url: BASE + g.route });
      const ok = await waitFor(`document.title.includes(${JSON.stringify(g.title)}) && location.pathname === ${JSON.stringify(g.route)}`, 12000);
      if (!ok) return 'entry ' + await b.evaluate('location.href + " | " + document.title');
      if (!await waitFor(`!!document.querySelector('a[title="返回 Gridfall 游戏大厅"]')`, 10000)) return 'no hall pill';
      const r = await b.evaluate(`({ pill: !!document.querySelector('a[title="返回 Gridfall 游戏大厅"]'), download: !!document.getElementById('btnDownload') })`);
      if (!r.pill) return 'no hall pill';
      if (r.download) return 'download button present';
      await b.send('Page.reload'); await sleep(1000);
      if (!await waitFor(`document.title.includes(${JSON.stringify(g.title)}) && location.pathname === ${JSON.stringify(g.route)}`, 12000)) return 'refresh failed';
      return true;
    });
    await t('miniroute' + g.route.replace('/', '.') + '.trailing', async () => {
      await b.evaluate(`location.href = ${JSON.stringify(g.route + '/')}`); await sleep(1200);
      const p = await b.evaluate('location.pathname');
      return p === g.route ? true : 'path ' + p;
    });
  }
  await t('miniroute.home_cards', async () => {
    await b.send('Page.navigate', { url: BASE + '/' });
    await waitFor(`document.querySelectorAll('.game-card[data-status="live"]').length === 12`, 12000);
    const links = await b.evaluate(`[...document.querySelectorAll('.game-card[data-status="live"] .play-link')].map(a => a.getAttribute('href'))`);
    const want = ['./board-club', './chinese-chess', './2048', './minesweeper', './chinese-checkers', './army-chess', './snake', './sokoban', './tetris', './tic-tac-toe', './jump', './uno'];
    if (JSON.stringify(links) !== JSON.stringify(want)) return 'links ' + JSON.stringify(links);
    await b.evaluate(`document.querySelector('.game-card a[href="./2048"]').click()`);
    if (!await waitFor(`document.title.includes('2048') && location.pathname === '/2048'`, 12000)) return '2048 card failed';
    await b.evaluate('history.back()');
    if (!await waitFor(`document.title.includes('游戏大厅')`, 10000)) return 'back failed';
    return true;
  });
  const fail = R.filter(r => !r.pass);
  console.log(`MINIGAMES-ROUTE TOTAL ${R.length} PASS ${R.length - fail.length} FAIL ${fail.length}`);
  R.forEach(r => console.log((r.pass ? 'PASS ' : 'FAIL ') + r.id + (r.detail ? ' :: ' + r.detail : '')));
} finally { await b.close(); }
