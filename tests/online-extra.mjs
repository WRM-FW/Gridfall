import { launch } from './cdp.mjs';
const SHOTS = path.join(import.meta.dirname, 'shots');
mkdirSync(SHOTS, { recursive: true });
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const url = process.env.APP_URL || pathToFileURL(path.join(import.meta.dirname, '..', 'games', 'board-club', 'index.html')).href;
const A = await launch(url, { port: 9431 });
let B = await launch(url, { port: 9432 });
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
const clickText = async (app, selector, text) => {
  const ok = await app.evaluate(`(() => {
    const b = [...document.querySelectorAll(${JSON.stringify(selector)})].find(x => x.textContent.trim() === ${JSON.stringify(text)});
    if (!b) return false;
    b.click(); return true;
  })()`);
  return ok;
};
const leave = async app => { try { await app.clickSel('#nLeave'); } catch (e) {} await sleep(600); };

try {
  await A.clickSel('#tabOnline');
  await B.clickSel('#tabOnline');

  /* ---------------- Renju 正式开局 ---------------- */
  await A.clickSel('#nRuleSeg button[data-v="renju"]');
  await A.clickSel('#nOpeningSeg button[data-v="formal"]');
  await A.clickSel('#nCreate');
  await waitFor(A, 'NET.connected && NET.code', 15000);
  const codeF = await A.evaluate('NET.code');
  await B.evaluate(`document.getElementById('nCodeInput').value=${JSON.stringify(codeF)}`);
  await B.clickSel('#nJoin');
  const joinedF = await waitFor(B, 'NET.connected && NET.state && NET.state.phase === "select"', 15000);
  if (!joinedF) throw new Error('formal: guest did not reach select');
  await waitFor(A, 'NET.state && NET.state.phase === "select"', 5000);

  await t('online.renju_formal_select', async () => {
    const opened = await clickText(A, '#nSubStatus .openings button', '直接开局 1');
    if (!opened) return 'opening button missing';
    const ok = await waitFor(B, 'NET.state.phase === "swap" && NET.state.history.length === 3', 8000);
    if (!ok) return 'guest did not get opening';
    return true;
  });

  await t('online.renju_formal_swap', async () => {
    const clicked = await clickText(B, '#nSubStatus button', '不交换');
    if (!clicked) return 'swap button missing';
    const okA = await waitFor(A, 'NET.state.phase === "move4"', 8000);
    const okB = await waitFor(B, 'NET.state.phase === "move4"', 8000);
    if (!okA || !okB) return 'move4 not reached';
    const c = await B.evaluate('netMyColor()');
    if (c !== 2) return 'guest should be white, got ' + c;
    return true;
  });

  await t('online.renju_formal_moves', async () => {
    await clickNet(B, 6, 6); // 白第 4 手
    if (!await waitFor(A, 'NET.state.history.length === 4', 8000)) return 'move4 not synced';
    await clickNet(A, 4, 4); // 黑候选 1
    await sleep(400);
    await clickNet(A, 10, 10); // 黑候选 2
    if (!await waitFor(B, 'NET.state.phase === "choose5" && NET.state.candidates.length === 2', 8000)) return 'candidates not synced';
    const pick = await B.evaluate('NET.state.candidates[0].slice()');
    await clickNet(B, pick[0], pick[1]); // 白选第五手
    if (!await waitFor(A, 'NET.state.phase === "move6" && NET.state.history.length === 5', 8000)) return 'choose5 not synced';
    if (!await waitFor(B, 'NET.state.phase === "move6" && !NET.busy', 8000)) return 'guest did not reach move6';
    await clickNet(B, 3, 3); // 白第 6 手
    const ok = await waitFor(A, 'NET.state.phase === "play" && NET.state.history.length === 6', 8000);
    const okB2 = await waitFor(B, 'NET.state.phase === "play" && NET.state.history.length === 6', 8000);
    if (!ok || !okB2) return 'move6 not synced';
    const a = await A.evaluate(`({b:NET.state.board, h:NET.state.history, phase:NET.state.phase})`);
    const b = await B.evaluate(`({b:NET.state.board, h:NET.state.history, phase:NET.state.phase})`);
    if (JSON.stringify(a.b) !== JSON.stringify(b.b)) return 'boards diverge A=' + JSON.stringify(a.h) + ' B=' + JSON.stringify(b.h);
    if (JSON.stringify(a.h) !== JSON.stringify(b.h)) return 'histories diverge';
    return true;
  });
  await A.screenshot(path.join(SHOTS, 'online-renju-formal.png'));

  await leave(A); await leave(B);

  /* ---------------- 围棋 9 路 + 双停终局 ---------------- */
  await A.clickSel('#nGameSeg button[data-v="go"]');
  await A.clickSel('#nSizeSeg button[data-v="9"]');
  await A.clickSel('#nCreate');
  await waitFor(A, 'NET.connected && NET.code', 15000);
  const codeG = await A.evaluate('NET.code');
  await B.evaluate(`document.getElementById('nCodeInput').value=${JSON.stringify(codeG)}`);
  await B.clickSel('#nJoin');
  const joinedG = await waitFor(B, 'NET.connected && NET.state && NET.state.game === "go" && NET.state.size === 9', 15000);
  if (!joinedG) throw new Error('go: guest did not join');

  await t('online.go_moves_and_pass_score', async () => {
    await clickNet(A, 4, 4);
    if (!await waitFor(B, 'NET.state.history.length === 1', 8000)) return 'go host move not synced';
    await clickNet(B, 5, 5);
    if (!await waitFor(A, 'NET.state.history.length === 2', 8000)) return 'go guest move not synced';
    await A.clickSel('#nPass');
    if (!await waitFor(B, 'NET.state.passes === 1', 8000)) return 'host pass not synced';
    await B.clickSel('#nPass');
    const ok = await waitFor(A, 'NET.state.over && NET.state.score', 8000);
    const okB = await waitFor(B, 'NET.state.over && NET.state.score', 8000);
    if (!ok || !okB) return 'double pass did not end';
    const a = await A.evaluate(`({score:NET.state.score, win:NET.state.winner, text:document.getElementById('nResult').textContent})`);
    const b = await B.evaluate(`({score:NET.state.score, win:NET.state.winner, text:document.getElementById('nResult').textContent})`);
    if (a.win !== b.win) return 'winner diverge A=' + JSON.stringify(a) + ' B=' + JSON.stringify(b);
    if (a.score.black !== b.score.black || a.score.white !== b.score.white) return 'score diverge';
    if (!a.text.includes('黑 ') || !a.text.includes('白 ')) return 'score text missing: ' + a.text;
    return true;
  });
  await A.screenshot(path.join(SHOTS, 'online-go-score.png'));

  /* ---------------- 掉线重连 ---------------- */
  await t('online.rejoin_same_room', async () => {
    const oldCid = await B.evaluate('NET.clientId');
    await B.close();
    const gone = await waitFor(A, 'NET.opponentGone', 30000);
    if (!gone) return 'host did not notice guest gone';
    B = await launch(url, { port: 9432 });
    // Same tab/session reconnects to the reserved seat 2; a brand-new client
    // id would be a spectator by design.
    await B.evaluate(`sessionStorage.setItem('gridfall_cid', ${JSON.stringify(oldCid)}); NET.clientId = ${JSON.stringify(oldCid)};`);
    await B.clickSel('#tabOnline');
    await B.evaluate(`document.getElementById('nCodeInput').value=${JSON.stringify(codeG)}`);
    await B.clickSel('#nJoin');
    const ok = await waitFor(B, 'NET.connected && NET.state && NET.state.history.length >= 2', 15000);
    if (!ok) return 'guest rejoin did not get state';
    return true;
  });

  const fail = R.filter(r => !r.pass);
  console.log(`ONLINE-EXTRA TOTAL ${R.length} PASS ${R.length - fail.length} FAIL ${fail.length}`);
  R.forEach(r => console.log((r.pass ? 'PASS ' : 'FAIL ') + r.id + (r.detail ? ' :: ' + r.detail : '')));
} finally {
  try { await B.close(); } catch (e) {}
  try { await A.close(); } catch (e) {}
}