import { launch } from './cdp.mjs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';

const SHOTS = path.join(import.meta.dirname, 'shots');
mkdirSync(SHOTS, { recursive: true });
const url = process.env.APP_URL || pathToFileURL(path.join(import.meta.dirname, '..', 'games', 'chinese-chess', 'index.html')).href;
const A = await launch(url, { port: 9551 });
const B = await launch(url, { port: 9552 });
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
const clickText = async (app, text) => app.evaluate(`(() => {
  var b = [...document.querySelectorAll('#xSub button')].find(function(x){ return x.textContent.trim() === ${JSON.stringify(text)}; });
  if (!b) return false; b.click(); return true;
})()`);

try {
  await A.clickSel('#modeSeg button[data-mode="online"]');
  await B.clickSel('#modeSeg button[data-mode="online"]');
  await A.clickSel('#xCreate');
  await waitFor(A, 'XNET.connected && XNET.code', 20000);
  const code = await A.evaluate('XNET.code');
  await B.evaluate(`document.getElementById('xCode').value=${JSON.stringify(code)}`);
  await B.clickSel('#xJoin');
  const joined = await waitFor(B, 'XNET.connected && XNET.hasGame', 20000);
  if (!joined) throw new Error('guest did not join xiangqi');
  await waitFor(A, 'XNET.hasGame', 8000);

  await t('xq.colors', async () => {
    const a = await A.evaluate('xMyColor()');
    const b = await B.evaluate('xMyColor()');
    if (a !== 0 || b !== 1) return 'colors ' + JSON.stringify([a, b]);
    return true;
  });

  await t('xq.identity', async () => {
    const a = await A.evaluate(`({ id: document.getElementById('xIdentity').textContent, status: document.getElementById('xStatus').textContent })`);
    const b = await B.evaluate(`({ id: document.getElementById('xIdentity').textContent, status: document.getElementById('xStatus').textContent })`);
    if (a.id !== '房主（玩家A）' || b.id !== '玩家B') return 'identity ' + JSON.stringify([a.id, b.id]);
    if (!b.status.includes('房主（玩家A）')) return 'guest waiting status ' + b.status;
    if (/玩家\s*[2-4]/.test(a.id + b.id + a.status + b.status)) return 'numeric label remains';
    return true;
  });

  await t('xq.host_move_syncs', async () => {
    await A.evaluate('onPoint(6,0)'); await sleep(100); await A.evaluate('onPoint(5,0)');
    if (!await waitFor(B, 'state.history.length === 1', 8000)) return 'guest did not get host move';
    const r = await B.evaluate('({board:state.board[5*9+0], turn:state.turn})');
    if (!(r.board && r.board !== 0 && r.turn === 1)) return JSON.stringify(r);
    const a = await A.evaluate(`document.getElementById('xStatus').textContent`);
    if (!a.includes('玩家B')) return 'host waiting status ' + a;
    return true;
  });

  await t('xq.guest_move_syncs', async () => {
    await B.evaluate('onPoint(3,0)'); await sleep(100); await B.evaluate('onPoint(4,0)');
    if (!await waitFor(A, 'state.history.length === 2', 8000)) return 'host did not get guest move';
    const r = await A.evaluate('({board:state.board[4*9+0], turn:state.turn})');
    return r.board && r.board !== 0 && r.turn === 0 ? true : JSON.stringify(r);
  });
  await A.screenshot(path.join(SHOTS, 'xiangqi-online-game.png'));

  await t('xq.resign_rematch', async () => {
    await A.clickSel('#xResign');
    if (!await waitFor(B, 'state.over', 8000)) return 'guest did not see resign';
    const r = await B.evaluate('({result:state.result, reason:state.reason})');
    if (r.result !== '黑方胜') return 'result ' + JSON.stringify(r);
    await A.clickSel('#xRematch'); await sleep(400); await B.clickSel('#xRematch');
    if (!await waitFor(A, 'XNET.hasGame && !state.over && state.history.length === 0', 10000)) return 'rematch failed';
    if (!await waitFor(B, '!state.over && state.history.length === 0', 10000)) return 'guest rematch failed';
    return true;
  });

  await t('xq.swap', async () => {
    await A.clickSel('#xSwap');
    if (!await waitFor(B, 'XNET.swapRequest && XNET.swapRequest.from === "host"', 8000)) return 'guest did not see swap';
    const ok = await clickText(B, '同意换方');
    if (!ok) return 'accept button missing';
    if (!await waitFor(A, 'XNET.hostColor === 1', 8000)) return 'host not swapped';
    if (!await waitFor(B, 'XNET.hostColor === 1', 8000)) return 'guest not swapped';
    const a = await A.evaluate('xMyColor()');
    const b = await B.evaluate('xMyColor()');
    if (a !== 1 || b !== 0) return 'colors ' + JSON.stringify([a, b]);
    if (await A.evaluate('state.turn') !== 0) return 'turn not red';
    return true;
  });

  await t('xq.guest_red_moves', async () => {
    await B.evaluate('onPoint(6,0)'); await sleep(100); await B.evaluate('onPoint(5,0)');
    if (!await waitFor(A, 'state.history.length === 1', 8000)) return 'host did not get red move';
    return true;
  });

  await t('xq.sound_removed', async () => {
    const r = await A.evaluate(`({
      btn: !!document.getElementById('soundBtn'),
      iconBtns: document.querySelectorAll('.icon-btn').length,
      hasSoundState: Object.prototype.hasOwnProperty.call(state, 'sound'),
      hasPlaySound: typeof playSound !== 'undefined'
    })`);
    return (!r.btn && r.iconBtns === 0 && !r.hasSoundState && !r.hasPlaySound) ? true : JSON.stringify(r);
  });

  const fail = R.filter(r => !r.pass);
  console.log(`XQ TOTAL ${R.length} PASS ${R.length - fail.length} FAIL ${fail.length}`);
  R.forEach(r => console.log((r.pass ? 'PASS ' : 'FAIL ') + r.id + (r.detail ? ' :: ' + r.detail : '')));
} finally {
  try { await B.close(); } catch (e) {}
  try { await A.close(); } catch (e) {}
}