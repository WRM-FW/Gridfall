import { launch } from './cdp.mjs';
const SHOTS = path.join(import.meta.dirname, 'shots');
mkdirSync(SHOTS, { recursive: true });
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(import.meta.dirname, '..');
const home = pathToFileURL(path.join(ROOT, 'index.html')).href;
const play = pathToFileURL(path.join(ROOT, 'games', 'board-club', 'index.html')).href;
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
    if (r.title !== 'Gridfall') return 'title ' + r.title;
    if (r.cards !== 12 || r.live !== 12 || r.soon !== 0) return 'cards ' + JSON.stringify(r);
    if (r.err.length) return 'errors ' + JSON.stringify(r.err);
    return true;
  });
  await b.screenshot(path.join(SHOTS, 'home-desktop.png'));

  await t('home.covers', async () => {
    const sel = '.gv-cover-img, .roadmap-cover img, .co-build-art img';
    const ok = await waitFor(`document.querySelectorAll('${sel}').length === 16 && [...document.querySelectorAll('${sel}')].every(i => i.complete && i.naturalWidth > 0)`, 10000);
    if (!ok) return 'covers not loaded';
    const r = await b.evaluate(`[...document.querySelectorAll('${sel}')].map(i => ({ src: i.getAttribute('src'), w: i.naturalWidth, h: i.naturalHeight }))`);
    const bad = r.filter(i => i.w !== 1200 || i.h !== 600 || i.src.indexOf('./assets/covers/') !== 0);
    if (bad.length) return JSON.stringify(bad);
    if (new Set(r.map(i => i.src)).size !== 16) return 'duplicate cover';
    return true;
  });
  await b.evaluate(`document.getElementById('games').scrollIntoView({ block: 'start', behavior: 'instant' })`);
  await sleep(400);
  await b.screenshot(path.join(SHOTS, 'home-covers.png'));
  await b.evaluate(`document.getElementById('soon').scrollIntoView({ block: 'start', behavior: 'instant' })`);
  await sleep(400);
  await b.screenshot(path.join(SHOTS, 'home-roadmap.png'));
  await b.evaluate(`window.scrollTo({ top: 0, behavior: 'instant' })`);
  await sleep(200);

  await t('home.roadmap', async () => {
    const r = await b.evaluate(`({
      n: document.querySelectorAll('.roadmap-card').length,
      names: [...document.querySelectorAll('.roadmap-card h3')].map(h => h.textContent.replace(/\\s+/g, ' ').trim()),
      panel: !!document.querySelector('.co-build-panel'),
      img: !!document.querySelector('.co-build-art img'),
      orderLinks: document.querySelectorAll('.roadmap-body a').length
    })`);
    if (r.n !== 3) return 'roadmap cards ' + r.n;
    if (!r.names.some(n => n.includes('四子棋'))) return 'no connect4 ' + JSON.stringify(r.names);
    if (!r.panel || !r.img) return 'co-build panel ' + JSON.stringify(r);
    if (r.orderLinks !== 0) return 'order links ' + r.orderLinks;
    return true;
  });

  await t('home.topnav', async () => {
    const r = await b.evaluate(`(() => {
      const links = [...document.querySelectorAll('nav.navlinks a')].map(a => a.textContent.trim());
      const gh = document.querySelector('.nav-github');
      return {
        links: links,
        ghHref: gh ? gh.getAttribute('href') : '',
        ghTarget: gh ? gh.getAttribute('target') : '',
        ghRel: gh ? gh.getAttribute('rel') : '',
        ghIcon: gh ? !!gh.querySelector('svg') : false
      };
    })()`);
    if (r.links.includes('联机开房')) return 'nav still has 联机开房';
    const i = r.links.indexOf('扫雷');
    if (i < 0 || r.links[i + 1] !== '跳一跳') return 'jump not after minesweeper ' + JSON.stringify(r.links);
    if (r.ghHref !== 'https://github.com/WRM-FW/Gridfall' || r.ghTarget !== '_blank' || r.ghRel.indexOf('noopener') < 0 || !r.ghIcon) return 'github ' + JSON.stringify(r);
    return true;
  });

  await t('home.footer', async () => {
    const r = await b.evaluate(`(() => {
      const f = document.querySelector('footer');
      if (!f) return { ok: false };
      const nav = [...f.querySelectorAll('.fcol[aria-label="站内导航"] a')].map(a => ({ text: a.textContent.trim(), href: a.getAttribute('href') }));
      const online = [...f.querySelectorAll('.fcol[aria-label="联机游戏"] a')].map(a => ({ text: a.textContent.trim(), href: a.getAttribute('href') }));
      const external = [...f.querySelectorAll('.fcol a')].filter(a => /^(Poki|4399游戏)/.test(a.textContent.trim())).map(a => ({ text: a.textContent.trim(), href: a.getAttribute('href'), target: a.getAttribute('target'), rel: a.getAttribute('rel') }));
      const cats = [...f.querySelectorAll('.fcats li')].map(li => li.textContent.trim());
      return {
        brand: f.querySelector('.fbrand')?.textContent.trim() || '',
        tag: f.querySelector('.ftag')?.textContent.trim() || '',
        intro: f.querySelector('.fintro')?.textContent.trim() || '',
        nav, online, external, cats,
        fnote: !!f.querySelector('.fnote'),
        text: f.innerText
      };
    })()`);
    if (r.brand !== 'Gridfall') return 'brand ' + r.brand;
    if (!r.tag || !r.intro) return 'brand copy missing';
    if (JSON.stringify(r.nav.map(x => x.text)) !== JSON.stringify(['首页', '全部游戏', '玩法一览', '下一批游戏'])) return 'site nav ' + JSON.stringify(r.nav);
    if (JSON.stringify(r.online.map(x => x.text)) !== JSON.stringify(['黑白棋社', '中国象棋', 'UNO'])) return 'online nav ' + JSON.stringify(r.online);
    if (r.external.length !== 2) return 'external ' + JSON.stringify(r.external);
    if (r.external[0].href !== 'https://poki.com/' || r.external[1].href !== 'https://www.4399.com/') return 'external hrefs ' + JSON.stringify(r.external);
    if (r.external.some(x => x.target !== '_blank' || !x.rel || x.rel.indexOf('noopener') < 0)) return 'external target ' + JSON.stringify(r.external);
    if (r.cats.length !== 4 || !r.cats.some(x => x.includes('棋类')) || !r.cats.some(x => x.includes('联机'))) return 'categories ' + JSON.stringify(r.cats);
    if (r.fnote) return 'old dense footer note remains';
    if (r.text.includes('游戏大厅')) return 'footer still says 游戏大厅';
    return true;
  });

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
    const clickChip = f => b.evaluate(`[...document.querySelectorAll('.chip')].find(c=>c.dataset.filter==='${f}').click()`);
    const visible = () => b.evaluate(`[...document.querySelectorAll('.game-card')].filter(c=>c.style.display !== 'none').length`);
    await clickChip('online'); await sleep(200);
    let r = await visible();
    if (r !== 3) return 'online filter ' + r;
    const onlineNames = await b.evaluate(`[...document.querySelectorAll('.game-card')].filter(c=>c.style.display !== 'none').map(c=>c.getAttribute('data-name'))`);
    if (!onlineNames.some(n => n.includes('UNO'))) return 'online filter missing UNO ' + JSON.stringify(onlineNames);
    if (!onlineNames.some(n => n.includes('黑白棋社')) || !onlineNames.some(n => n.includes('中国象棋'))) return 'online filter missing board/xiangqi ' + JSON.stringify(onlineNames);
    await clickChip('board'); await sleep(200);
    r = await visible();
    if (r !== 5) return 'board filter ' + r;
    await clickChip('puzzle'); await sleep(200);
    r = await visible();
    if (r !== 4) return 'puzzle filter ' + r;
    await clickChip('action'); await sleep(200);
    r = await visible();
    if (r !== 3) return 'action filter ' + r;
    await clickChip('cards'); await sleep(200);
    r = await visible();
    if (r !== 1) return 'cards filter ' + r;
    await clickChip('all');
    await b.evaluate(`(() => { const i=document.getElementById('gameSearch'); i.value='围棋'; i.dispatchEvent(new Event('input')); })()`);
    await sleep(200);
    r = await visible();
    if (r !== 1) return 'search go ' + r;
    await b.evaluate(`(() => { const i=document.getElementById('gameSearch'); i.value='联机'; i.dispatchEvent(new Event('input')); })()`);
    await sleep(200);
    r = await visible();
    if (r !== 3) return 'search online ' + r;
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
    return r.title === 'Gridfall' && r.hall ? true : 'back failed ' + JSON.stringify(r);
  });

  await t('home.xiangqiLink', async () => {
    await b.evaluate(`document.querySelectorAll('.game-card[data-status="live"] .play-link')[1].click()`);
    const ok = await waitFor('document.title.includes("中国象棋") && typeof state !== "undefined"');
    if (!ok) return 'did not open xiangqi: ' + await b.evaluate('location.href');
    const r = await b.evaluate(`({ mode: state.mode, canvas: !!document.getElementById('board'), hall: !!document.querySelector('.hall-link'), online: [...document.querySelectorAll('#modeSeg .seg-btn')].some(b=>b.dataset.mode==='online') })`);
    if (r.mode !== 'ai' || !r.canvas || !r.hall || !r.online) return JSON.stringify(r);
    await b.clickSel('.hall-link');
    await sleep(900);
    return (await b.evaluate('document.title')) === 'Gridfall' ? true : 'back failed';
  });

  await t('home.minigameLinks', async () => {
    const games = [
      ['./games/2048/index.html', '2048 · Gridfall'],
      ['./games/minesweeper/index.html', '扫雷 · Gridfall'],
      ['./games/chinese-checkers/index.html', '跳棋 · Gridfall'],
      ['./games/army-chess/index.html', '军棋 · Gridfall'],
      ['./games/snake/index.html', '贪吃蛇 · Gridfall'],
      ['./games/sokoban/index.html', '推箱子 · Gridfall'],
      ['./games/tetris/index.html', '俄罗斯方块 · Gridfall'],
      ['./games/tic-tac-toe/index.html', '井字棋 · Gridfall'],
      ['./games/jump/index.html', '跳一跳 · Gridfall'],
      ['./games/uno/index.html', 'UNO · Gridfall']
    ];
    for (const [local, title] of games) {
      await goto(home);
      await waitFor(`document.querySelectorAll('.game-card').length === 12`, 8000);
      const clicked = await b.evaluate(`(() => { const a = document.querySelector('.game-card a[data-local="${local}"]'); if (!a) return false; a.click(); return true; })()`);
      if (!clicked) return 'card missing ' + local;
      if (!await waitFor(`document.title.includes(${JSON.stringify(title)})`, 8000)) return 'did not open ' + local;
      if (!await waitFor(`!!document.querySelector('a[title="返回 Gridfall 首页"]')`, 5000)) return 'no hall pill ' + local;
      await b.clickSel('a[title="返回 Gridfall 首页"]');
      if (!await waitFor(`document.title === 'Gridfall'`, 8000)) return 'back failed ' + local;
    }
    return true;
  });

  await t('home.coBuildCard', async () => {
    if (!await waitFor(`!!document.querySelector('.co-build-panel')`, 8000)) return 'co-build panel missing';
    const r = await b.evaluate(`({
      mails: [...document.querySelectorAll('.co-build-panel a[href^="mailto:"]')].map(a => a.getAttribute('href')),
      pr: !!document.querySelector('.co-build-panel a[href*="CONTRIBUTING.md"]'),
      note: document.querySelector('.co-build-panel .co-note') ? document.querySelector('.co-build-panel .co-note').textContent : '',
      card: !!document.querySelector('.co-build-panel')
    })`);
    if (!r.card) return 'co-build panel missing';
    if (!r.mails.includes('mailto:3391792088@qq.com')) return 'email link missing ' + JSON.stringify(r.mails);
    if (!r.pr) return 'PR link missing';
    if (!r.note.includes('PR') || !r.note.includes('开发说明')) return 'note ' + r.note;
    if (r.note.includes('AI Agent')) return 'note still prescribes AI Agent: ' + r.note;
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