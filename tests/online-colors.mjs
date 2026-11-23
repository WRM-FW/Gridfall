import { launch } from './cdp.mjs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const url = process.env.APP_URL || pathToFileURL(path.join(import.meta.dirname, '..', 'play.html')).href;
const A = await launch(url, { port: 9531 });
const B = await launch(url, { port: 9532 });
const R = [];
const t = async (id, fn) => {
  try {
    const d = await fn();
    if (d && typeof d === 'object' && 'pass' in d) R.push({ id, pass: !!d.pass, detail: d.detail });
    else R.push({ id, pass: d === true || d === undefined, detail: typeof d === 'string' ? d : undefined });
  } catch (e) { R.push({ id, pass: false, detail: e.message }); }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const waitFor = async (app, expr, ms = 12000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await app.evaluate(`(() => { try { return !!(${expr}); } catch(e) { return false; } })()`)) return true;
    await sleep(120);
  }
  return false;
};
const clickText = async (app, sel, text) => app.evaluate(`(() => {
  var b = [...document.querySelectorAll(${JSON.stringify(sel)})].find(function(x){ return x.textContent.trim() === ${JSON.stringify(text)}; });
  if (!b) return false; b.click(); return true;
})()`);
const clickNet = async (app, r, c) => {
  const size = await app.evaluate('NET.state.size');
  const pt = await app.evaluate(`(() => {
    const el = document.getElementById('nBoard'); el.scrollIntoView({block:'center'});
    const rect = el.getBoundingClientRect(); const cell = (1240 - 92*2) / (${size} - 1);
    return { x: rect.left + (92 + ${c} * cell) / 1240 * rect.width, y: rect.top + (92 + ${r} * cell) / 1240 * rect.height };
  })()`);
  await app.clickAt(pt.x, pt.y);
};

let code;
try {
  await A.clickSel('#tabOnline'); await B.clickSel('#tabOnline');
  await A.clickSel('#nCreate');
  await waitFor(A, 'NET.connected && NET.code', 20000);
  code = await A.evaluate('NET.code');
  await B.evaluate(`document.getElementById('nCodeInput').value=${JSON.stringify(code)}`);
  await B.clickSel('#nJoin');
  await waitFor(B, 'NET.connected && NET.state', 20000);
  await waitFor(A, 'NET.state', 8000);

  await t('colors.default_host_black', async () => {
    const a = await A.evaluate('netMyColor()');
    const b = await B.evaluate('netMyColor()');
    return a === 1 && b === 2 ? true : JSON.stringify([a, b]);
  });

  await t('colors.host_request_guest_accepts', async () => {
    await A.clickSel('#nSwap');
    if (!await waitFor(B, 'NET.state.swapRequest && NET.state.swapRequest.from === "host"', 8000)) return 'guest did not see request';
    const txt = await B.evaluate('document.getElementById("nSubStatus").textContent');
    if (!txt.includes('对方申请换方')) return 'request text ' + txt;
    const ok = await clickText(B, '#nSubStatus button', '同意换方');
    if (!ok) return 'accept button missing';
    if (!await waitFor(A, 'NET.state.finalHostColor === 2', 8000)) return 'host color not flipped';
    if (!await waitFor(B, 'NET.state.finalHostColor === 2', 8000)) return 'guest color not flipped';
    const a = await A.evaluate('netMyColor()');
    const b = await B.evaluate('netMyColor()');
    if (a !== 2 || b !== 1) return 'colors ' + JSON.stringify([a, b]);
    if (await A.evaluate('NET.state.turn') !== 1) return 'turn should be black';
    return true;
  });

  await t('colors.guest_black_moves', async () => {
    await clickNet(B, 7, 7);
    if (!await waitFor(A, 'NET.state.history.length === 1', 8000)) return 'host did not receive move';
    const r = await A.evaluate('({board:NET.state.board[7][7], turn:NET.state.turn})');
    if (r.board !== 1 || r.turn !== 2) return JSON.stringify(r);
    return true;
  });

  await t('colors.blocked_after_move', async () => {
    const a = await A.evaluate('({dis:document.getElementById("nSwap").disabled, hid:document.getElementById("nSwap").classList.contains("hidden")})');
    if (!a.dis) return 'swap button still enabled ' + JSON.stringify(a);
    return true;
  });

  await t('colors.decline_keeps_colors', async () => {
    // fresh room (host black by default), then decline a host request
    await A.clickSel('#nLeave'); await B.clickSel('#nLeave'); await sleep(600);
    await A.clickSel('#nCreate');
    await waitFor(A, 'NET.connected && NET.code', 20000);
    const c2 = await A.evaluate('NET.code');
    await B.evaluate(`document.getElementById('nCodeInput').value=${JSON.stringify(c2)}`);
    await B.clickSel('#nJoin');
    await waitFor(B, 'NET.connected && NET.state', 20000);
    await waitFor(A, 'NET.state', 8000);
    const before = await A.evaluate('netMyColor()');
    await A.clickSel('#nSwap');
    if (!await waitFor(B, 'NET.state.swapRequest', 8000)) return 'no request';
    const ok = await clickText(B, '#nSubStatus button', '拒绝');
    if (!ok) return 'decline button missing';
    if (!await waitFor(A, '!NET.state.swapRequest', 8000)) return 'request not cleared';
    if (!await waitFor(B, '!NET.state.swapRequest && !NET.busy', 8000)) return 'guest request state not cleared';
    const after = await A.evaluate('netMyColor()');
    return before === after ? true : 'colors changed ' + before + '->' + after;
  });

  await t('colors.guest_request_host_accepts', async () => {
    await B.clickSel('#nSwap');
    if (!await waitFor(A, 'NET.state.swapRequest && NET.state.swapRequest.from === "guest"', 8000)) return 'host did not see request';
    const ok = await clickText(A, '#nSubStatus button', '同意换方');
    if (!ok) return 'host accept missing';
    if (!await waitFor(A, 'NET.state.finalHostColor === 2', 8000)) return 'host not swapped to white';
    if (!await waitFor(B, 'NET.state.finalHostColor === 2', 8000)) return 'guest not swapped';
    const a = await A.evaluate('netMyColor()');
    const b = await B.evaluate('netMyColor()');
    return a === 2 && b === 1 ? true : 'colors ' + JSON.stringify([a, b]);
  });

  const fail = R.filter(r => !r.pass);
  console.log(`COLORS TOTAL ${R.length} PASS ${R.length - fail.length} FAIL ${fail.length}`);
  R.forEach(r => console.log((r.pass ? 'PASS ' : 'FAIL ') + r.id + (r.detail ? ' :: ' + r.detail : '')));
} finally {
  try { await B.close(); } catch (e) {}
  try { await A.close(); } catch (e) {}
}