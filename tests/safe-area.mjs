import { launch } from './cdp.mjs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(import.meta.dirname, '..');
const PORT = 12000 + (process.pid % 30000) + 600;
const R = [];
const t = async (id, fn) => {
  try {
    const d = await fn();
    if (d && typeof d === 'object' && 'pass' in d) R.push({ id, pass: !!d.pass, detail: d.detail });
    else R.push({ id, pass: d === true || d === undefined, detail: typeof d === 'string' ? d : undefined });
  } catch (e) { R.push({ id, pass: false, detail: e.message }); }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PAGES = [
  { file: 'index.html', name: 'index', bodyTop: 0, bodyLeft: 0, content: '.topnav', hall: false, sticky: 'topnav' },
  { file: 'games/board-club/index.html', name: 'board-club', bodyTop: 0, bodyLeft: 0, content: '.wrap', hall: false, side: true },
  { file: 'games/chinese-chess/index.html', name: 'chinese-chess', bodyTop: 22, bodyLeft: 22, content: '.app', hall: false, mobileTop: 16, mobileLeft: 14 },
  { file: 'games/2048/index.html', name: '2048', bodyTop: 0, bodyLeft: 0, content: '.wrap', hall: true },
  { file: 'games/chinese-checkers/index.html', name: 'chinese-checkers', bodyTop: 0, bodyLeft: 0, content: '.wrap', hall: false },
  { file: 'games/army-chess/index.html', name: 'army-chess', bodyTop: 0, bodyLeft: 0, content: '.wrap', hall: false },
  { file: 'games/minesweeper/index.html', name: 'minesweeper', bodyTop: 0, bodyLeft: 0, content: '.wrap', hall: false },
  { file: 'games/snake/index.html', name: 'snake', bodyTop: 10, bodyLeft: 10, content: 'header', hall: true },
  { file: 'games/sokoban/index.html', name: 'sokoban', bodyTop: 16, bodyLeft: 16, content: 'header', hall: true },
  { file: 'games/tetris/index.html', name: 'tetris', bodyTop: 10, bodyLeft: 10, content: 'header', hall: true },
  { file: 'games/tic-tac-toe/index.html', name: 'tic-tac-toe', bodyTop: 12, bodyLeft: 12, content: 'header', hall: true },
  { file: 'games/jump/index.html', name: 'jump', bodyTop: 0, bodyLeft: 0, content: '.hud-top', hall: false, hud: true },
  { file: 'games/uno/index.html', name: 'uno', bodyTop: 0, bodyLeft: 0, content: '.topbar', hall: false, shell: true }
];

function measureExpr(sel, hall) {
  return `(() => {
    const body = getComputedStyle(document.body);
    const c = document.querySelector(${JSON.stringify(sel)});
    const hall = ${hall ? "document.querySelector('.gf-hall-fixed')" : 'null'};
    const hud = document.querySelector('.hud');
    const pop = document.querySelector('.settings-popover');
    const shell = document.querySelector('.app-shell');
    const topnav = document.querySelector('.topnav');
    const side = document.querySelector('.side');
    const rect = c ? c.getBoundingClientRect() : null;
    return {
      bodyTop: parseFloat(body.paddingTop) || 0,
      bodyLeft: parseFloat(body.paddingLeft) || 0,
      bodyRight: parseFloat(body.paddingRight) || 0,
      contentTop: rect ? rect.top : null,
      contentLeft: rect ? rect.left : null,
      hallTop: hall ? parseFloat(getComputedStyle(hall).top) || 0 : null,
      hallRight: hall ? innerWidth - hall.getBoundingClientRect().right : null,
      hudTop: hud ? parseFloat(getComputedStyle(hud).paddingTop) || 0 : null,
      hudLeft: hud ? parseFloat(getComputedStyle(hud).paddingLeft) || 0 : null,
      popTop: pop ? parseFloat(getComputedStyle(pop).top) || 0 : null,
      shellTop: shell ? parseFloat(getComputedStyle(shell).paddingTop) || 0 : null,
      shellLeft: shell ? parseFloat(getComputedStyle(shell).paddingLeft) || 0 : null,
      navTop: topnav ? parseFloat(getComputedStyle(topnav).top) || 0 : null,
      sideTop: side ? parseFloat(getComputedStyle(side).top) || 0 : null,
      vw: innerWidth,
      vh: innerHeight
    };
  })()`;
}

await t('safe-area.all-pages-head', async () => {
  for (const page of PAGES) {
    const html = (await import('node:fs')).readFileSync(path.join(ROOT, page.file), 'utf8');
    if (!/viewport-fit=cover/.test(html)) return page.name + ' viewport-fit missing';
    if (html.includes('viewport-fit=cover"> />')) return page.name + ' malformed viewport tag';
    if (!html.includes('ios-standalone')) return page.name + ' detection missing';
    if (!html.includes('id="ios-safe-area"')) return page.name + ' safe style missing';
    if (!html.includes('pwa.js')) return page.name + ' pwa.js missing';
  }
  return true;
});

let index = 0;
for (const page of PAGES) {
  const url = pathToFileURL(path.join(ROOT, page.file)).href;
  const b = await launch(url, { port: PORT + index++ });
  try {
    const sel = page.content;
    const base = await b.evaluate(measureExpr(sel, page.hall));
    const errs = await b.evaluate(`window.__qaErrors || []`);
    if (errs.length) {
      R.push({ id: 'safe-area.' + page.name + '.errors', pass: false, detail: JSON.stringify(errs) });
      continue;
    }

    await b.evaluate(`(() => {
      document.documentElement.classList.add('ios-standalone');
      document.documentElement.style.setProperty('--safe-top', '47px');
      document.documentElement.style.setProperty('--safe-left', '0px');
      document.documentElement.style.setProperty('--safe-right', '0px');
    })()`);
    const portrait = await b.evaluate(measureExpr(sel, page.hall));

    await t(`safe-area.${page.name}.portrait`, async () => {
      const bodyDelta = portrait.bodyTop - base.bodyTop;
      const expectedBody = page.hud || page.shell ? 0 : 47;
      if (Math.abs(bodyDelta - expectedBody) > 0.6) return 'body top delta ' + bodyDelta;
      if (portrait.contentTop < 46.5) return 'content under status bar ' + portrait.contentTop;
      if (page.hall && portrait.hallTop - base.hallTop < 46.5) return 'hall top delta ' + (portrait.hallTop - base.hallTop);
      if (page.hud) {
        if (portrait.hudTop - base.hudTop !== 47) return 'hud top delta ' + (portrait.hudTop - base.hudTop);
        if (portrait.popTop - base.popTop !== 47) return 'popover top delta ' + (portrait.popTop - base.popTop);
      }
      if (page.shell) {
        if (portrait.shellTop - base.shellTop !== 47) return 'shell top delta ' + (portrait.shellTop - base.shellTop);
        if (portrait.contentTop < 46.5) return 'uno topbar under status bar ' + portrait.contentTop;
      }
      if (page.sticky === 'topnav') {
        if (portrait.navTop !== 47) return 'nav top ' + portrait.navTop;
        await b.evaluate(`window.scrollTo(0, 640)`);
        await sleep(120);
        const scrolled = await b.evaluate(measureExpr(sel, page.hall));
        await b.evaluate(`window.scrollTo(0, 0)`);
        if (scrolled.contentTop !== 47) return 'sticky nav scrolled to ' + scrolled.contentTop;
      }
      if (page.side) {
        await b.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
        await sleep(100);
        const wide = await b.evaluate(measureExpr(sel, page.hall));
        if (wide.sideTop !== 67) return 'side sticky top ' + wide.sideTop;
      }
      return true;
    });

    await b.evaluate(`(() => {
      document.documentElement.style.setProperty('--safe-top', '0px');
      document.documentElement.style.setProperty('--safe-left', '47px');
      document.documentElement.style.setProperty('--safe-right', '47px');
    })()`);
    const land = await b.evaluate(measureExpr(sel, page.hall));

    await t(`safe-area.${page.name}.landscape`, async () => {
      const bodyTopDelta = land.bodyTop - base.bodyTop;
      const expectedTop = page.hud || page.shell ? 0 : 0;
      if (Math.abs(bodyTopDelta - expectedTop) > 0.6) return 'body top in landscape ' + bodyTopDelta;
      if (page.hall && land.hallRight - base.hallRight < 46.5) return 'hall right inset ' + (land.hallRight - base.hallRight);
      if (page.hud && land.hudLeft - base.hudLeft !== 47) return 'hud left ' + (land.hudLeft - base.hudLeft);
      if (page.shell && land.shellLeft - base.shellLeft !== 47) return 'shell left ' + (land.shellLeft - base.shellLeft);
      if (!page.hud && !page.shell && Math.abs((land.bodyLeft - base.bodyLeft) - 47) > 0.6) return 'body left ' + (land.bodyLeft - base.bodyLeft);
      if (land.contentLeft < 46.5) return 'content under notch ' + land.contentLeft;
      return true;
    });

    await t(`safe-area.${page.name}.safari-baseline`, async () => {
      await b.evaluate(`document.documentElement.classList.remove('ios-standalone')`);
      const plain = await b.evaluate(measureExpr(sel, page.hall));
      if (Math.abs(plain.bodyTop - base.bodyTop) > 0.6) return 'body changed outside iOS standalone';
      if (page.hud && plain.hudTop !== base.hudTop) return 'hud changed outside iOS standalone';
      if (page.shell && plain.shellTop !== base.shellTop) return 'shell changed outside iOS standalone';
      return true;
    });
  } finally {
    await b.close();
  }
}

await t('safe-area.mobile-and-rotation', async () => {
  const b = await launch(pathToFileURL(path.join(ROOT, 'games/chinese-chess/index.html')).href, { port: PORT + index++ });
  try {
    await b.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await sleep(120);
    const base = await b.evaluate(measureExpr('.app', false));
    await b.evaluate(`(() => {
      document.documentElement.classList.add('ios-standalone');
      document.documentElement.style.setProperty('--safe-top', '47px');
      document.documentElement.style.setProperty('--safe-left', '0px');
      document.documentElement.style.setProperty('--safe-right', '0px');
    })()`);
    const p = await b.evaluate(measureExpr('.app', false));
    if (p.bodyTop !== 63) return '390px body top ' + p.bodyTop + ' base ' + base.bodyTop;
    if (p.contentTop < 62) return '390px content top ' + p.contentTop;
    await b.send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 2, mobile: true });
    await b.evaluate(`(() => {
      document.documentElement.style.setProperty('--safe-top', '0px');
      document.documentElement.style.setProperty('--safe-left', '47px');
      document.documentElement.style.setProperty('--safe-right', '47px');
    })()`);
    await sleep(120);
    const l = await b.evaluate(measureExpr('.app', false));
    if (l.bodyLeft !== 61) return 'landscape body left ' + l.bodyLeft;
    if (l.contentLeft < 60) return 'landscape content left ' + l.contentLeft;
    return true;
  } finally { await b.close(); }
});

await t('safe-area.mobile-hall-button', async () => {
  const b = await launch(pathToFileURL(path.join(ROOT, 'games/2048/index.html')).href, { port: PORT + index++ });
  try {
    await b.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await sleep(120);
    await b.evaluate(`(() => {
      document.documentElement.classList.add('ios-standalone');
      document.documentElement.style.setProperty('--safe-top', '47px');
      document.documentElement.style.setProperty('--safe-right', '0px');
    })()`);
    const r = await b.evaluate(measureExpr('.wrap', true));
    if (r.hallTop !== 55) return 'mobile hall top ' + r.hallTop;
    return true;
  } finally { await b.close(); }
});

await t('safe-area.ipad', async () => {
  const b = await launch(pathToFileURL(path.join(ROOT, 'games/board-club/index.html')).href, { port: PORT + index++ });
  try {
    await b.send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 1366, deviceScaleFactor: 2, mobile: true });
    await sleep(150);
    await b.evaluate(`(() => { document.documentElement.classList.add('ios-standalone'); document.documentElement.style.setProperty('--safe-top','24px'); document.documentElement.style.setProperty('--safe-left','0px'); document.documentElement.style.setProperty('--safe-right','0px'); })()`);
    const r = await b.evaluate(measureExpr('.wrap', false));
    if (r.bodyTop !== 24 || r.contentTop < 23.5) return 'ipad board ' + JSON.stringify(r);
    if (r.sideTop !== 44) return 'ipad side top ' + r.sideTop;
    return true;
  } finally { await b.close(); }
});

await t('safe-area.dynamic-island', async () => {
  const b = await launch(pathToFileURL(path.join(ROOT, 'index.html')).href, { port: PORT + index++ });
  try {
    await b.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
    await sleep(150);
    await b.evaluate(`(() => { document.documentElement.classList.add('ios-standalone'); document.documentElement.style.setProperty('--safe-top','59px'); document.documentElement.style.setProperty('--safe-left','0px'); document.documentElement.style.setProperty('--safe-right','0px'); })()`);
    const r = await b.evaluate(measureExpr('.topnav', false));
    if (r.bodyTop !== 59) return 'body top ' + r.bodyTop;
    if (r.navTop !== 59) return 'nav top ' + r.navTop;
    if (r.contentTop < 58.5) return 'nav position ' + r.contentTop;
    return true;
  } finally { await b.close(); }
});

await t('safe-area.fullscreen-containment', async () => {
  for (const name of ['uno', 'snake', 'tetris']) {
    const b = await launch(pathToFileURL(path.join(ROOT, 'games', name, 'index.html')).href, { port: PORT + index++ });
    try {
      await b.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
      await sleep(150);
      await b.evaluate(`(() => { document.documentElement.classList.add('ios-standalone'); document.documentElement.style.setProperty('--safe-top','47px'); document.documentElement.style.setProperty('--safe-left','0px'); document.documentElement.style.setProperty('--safe-right','0px'); })()`);
      await sleep(150);
      const r = await b.evaluate(`(() => {
        const all = [...document.querySelectorAll('body *')].filter(e => { const q=e.getBoundingClientRect(); return q.width>0 && q.height>0; });
        return {
          maxBottom: Math.max(...all.map(e => e.getBoundingClientRect().bottom)),
          sh: document.documentElement.scrollHeight,
          ih: innerHeight,
          ow: document.documentElement.scrollWidth,
          iw: innerWidth
        };
      })()`);
      if (r.maxBottom > r.ih + 1) return name + ' content clipped ' + JSON.stringify(r);
      if (r.ow > r.iw + 1) return name + ' horizontal overflow ' + JSON.stringify(r);
    } finally { await b.close(); }
  }
  return true;
});

await t('safe-area.ios-detection', async () => {
  const b = await launch(pathToFileURL(path.join(ROOT, 'index.html')).href, { port: PORT + index++ });
  try {
    await b.send('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
    await b.send('Page.addScriptToEvaluateOnNewDocument', { source: `try{Object.defineProperty(navigator,'standalone',{get:function(){return true;}});}catch(e){}` });
    await b.send('Page.reload');
    await sleep(800);
    const r = await b.evaluate(`({ cls: document.documentElement.classList.contains('ios-standalone'), pad: getComputedStyle(document.body).paddingTop })`);
    if (!r.cls) return 'standalone class not added';
    if (r.pad !== '0px') return 'desktop emulation should not invent safe area: ' + r.pad;
    return true;
  } finally { await b.close(); }
});

await t('safe-area.ios-safari-no-class', async () => {
  const b = await launch(pathToFileURL(path.join(ROOT, 'index.html')).href, { port: PORT + index++ });
  try {
    await b.send('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
    await b.send('Page.reload');
    await sleep(500);
    const r = await b.evaluate(`({ cls: document.documentElement.classList.contains('ios-standalone'), pad: getComputedStyle(document.body).paddingTop })`);
    if (r.cls) return 'iOS Safari tab incorrectly marked standalone';
    if (r.pad !== '0px') return 'iOS Safari tab padding ' + r.pad;
    return true;
  } finally { await b.close(); }
});

const fail = R.filter((r) => !r.pass);
console.log(`SAFE-AREA TOTAL ${R.length} PASS ${R.length - fail.length} FAIL ${fail.length}`);
R.forEach((r) => console.log((r.pass ? 'PASS ' : 'FAIL ') + r.id + (r.detail ? ' :: ' + r.detail : '')));
if (fail.length) process.exitCode = 1;