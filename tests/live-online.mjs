import { launch } from './cdp.mjs';
const SHOTS = path.join(import.meta.dirname, 'shots');
mkdirSync(SHOTS, { recursive: true });
import path from 'node:path';
import { mkdirSync } from 'node:fs';

const URL = process.env.APP_URL || 'https://play-gridfall.pages.dev/play.html';
const A = await launch(URL, { port: 9441 });
const B = await launch(URL, { port: 9442 });
const R = [];
const t = async (id, fn) => {
  try {
    const d = await fn();
    if (d && typeof d === 'object' && 'pass' in d) R.push({ id, pass: !!d.pass, detail: d.detail });
    else R.push({ id, pass: d === true || d === undefined, detail: typeof d === 'string' ? d : undefined });
  } catch (e) { R.push({ id, pass: false, detail: e.message }); }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const waitFor = async (app, expr, ms = 15000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await app.evaluate(`(() => { try { return !!(${expr}); } catch(e) { return false; } })()`)) return true;
    await sleep(150);
  }
  return false;
};
const clickNet = async (app, r, c) => {
  const size = await app.evaluate('NET.state.size');
  const pt = await app.evaluate(`(() => {
    const el = document.getElementById('nBoard');
    el.scrollIntoView({block:'center'});
    const rect = el.getBoundingClientRect();
    const cell = (1240 - 92*2) / (${size} - 1);
    return { x: rect.left + (92 + ${c} * cell) / 1240 * rect.width,
             y: rect.top + (92 + ${r} * cell) / 1240 * rect.height };
  })()`);
  await app.clickAt(pt.x, pt.y);
};

try {
  await t('live.page_loads', async () => {
    const r = await A.evaluate(`(() => {
      const c = document.getElementById('gBoard');
      const d = c.getContext('2d').getImageData(92, 620, 1, 1).data;
      return { title: document.title, canvas: [c.width, c.height], px: [d[0], d[1], d[2], d[3]], status: document.getElementById('gStatus').textContent };
    })()`);
    if (r.title !== '棋盘 · Gridfall') return 'title ' + r.title;
    if (!r.px[3]) return 'canvas not drawn';
    return true;
  });
  await A.screenshot(path.join(SHOTS, 'live-home.png'));

  await A.clickSel('#tabOnline');
  await B.clickSel('#tabOnline');
  await A.clickSel('#nCreate');
  const okA = await waitFor(A, 'NET.connected && NET.code', 20000);
  if (!okA) throw new Error('host connect failed');
  const code = await A.evaluate('NET.code');
  console.log('live room', code);
  await B.evaluate(`document.getElementById('nCodeInput').value=${JSON.stringify(code)}`);
  await B.clickSel('#nJoin');
  const okB = await waitFor(B, 'NET.connected && NET.state', 20000);
  if (!okB) throw new Error('guest join failed');
  await waitFor(A, 'NET.state', 10000);

  await t('live.two_clients_colors', async () => {
    const a = await A.evaluate(`({c:netMyColor(), conn:NET.connected, err:window.__qaErrors||[]})`);
    const b = await B.evaluate(`({c:netMyColor(), conn:NET.connected, err:window.__qaErrors||[]})`);
    if (a.c !== 1 || b.c !== 2) return 'colors ' + JSON.stringify([a.c, b.c]);
    if (a.err.length || b.err.length) return 'errors ' + JSON.stringify([a.err, b.err]);
    return true;
  });
  await A.screenshot(path.join(SHOTS, 'live-online-joined.png'));

  await t('live.full_game_sync', async () => {
    const seq = [[A,7,7],[B,7,8],[A,7,6],[B,8,8],[A,7,5],[B,9,9],[A,7,4],[B,10,10],[A,7,3]];
    for (const [app, r, c] of seq) {
      await clickNet(app, r, c);
      await sleep(500);
    }
    const okA = await waitFor(A, 'NET.state.over', 10000);
    const okB = await waitFor(B, 'NET.state.over', 10000);
    if (!okA || !okB) return 'game not over';
    const a = await A.evaluate(`({win:NET.state.winner, hist:NET.state.history.length, text:document.getElementById('nResult').textContent})`);
    const b = await B.evaluate(`({win:NET.state.winner, hist:NET.state.history.length, text:document.getElementById('nResult').textContent})`);
    if (a.win !== 1 || b.win !== 1) return 'winner ' + JSON.stringify([a.win, b.win]);
    if (a.hist !== 9 || b.hist !== 9) return 'hist ' + JSON.stringify([a.hist, b.hist]);
    if (!a.text.includes('你赢了') || !b.text.includes('你输了')) return 'text';
    return true;
  });
  await A.screenshot(path.join(SHOTS, 'live-online-win.png'));

  await t('live.rematch_resign', async () => {
    await A.clickSel('#nRematch'); await sleep(400);
    await B.clickSel('#nRematch');
    if (!await waitFor(A, 'NET.state && !NET.state.over && NET.state.history.length === 0', 10000)) return 'rematch';
    await clickNet(A, 7, 7); await sleep(500);
    await A.clickSel('#nResign');
    if (!await waitFor(B, 'NET.state.over', 8000)) return 'resign';
    const b = await B.evaluate(`({win:NET.state.winner, text:document.getElementById('nResult').textContent})`);
    if (b.win !== 2 || !b.text.includes('你赢了')) return 'resign state ' + JSON.stringify(b);
    return true;
  });

  const fail = R.filter(r => !r.pass);
  console.log(`LIVE TOTAL ${R.length} PASS ${R.length - fail.length} FAIL ${fail.length}`);
  R.forEach(r => console.log((r.pass ? 'PASS ' : 'FAIL ') + r.id + (r.detail ? ' :: ' + r.detail : '')));
} finally {
  try { await B.close(); } catch (e) {}
  try { await A.close(); } catch (e) {}
}