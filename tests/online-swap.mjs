import { launch } from './cdp.mjs';
const SHOTS = path.join(import.meta.dirname, 'shots');
mkdirSync(SHOTS, { recursive: true });
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const url = process.env.APP_URL || pathToFileURL(path.join(import.meta.dirname, '..', 'play.html')).href;
const A = await launch(url, { port: 9451 });
const B = await launch(url, { port: 9452 });
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
const clickText = async (app, text) => app.evaluate(`(() => {
  const b = [...document.querySelectorAll('#nSubStatus button')].find(x => x.textContent.trim() === ${JSON.stringify(text)});
  if (!b) return false; b.click(); return true;
})()`);

try {
  await A.clickSel('#tabOnline');
  await B.clickSel('#tabOnline');
  await A.clickSel('#nRuleSeg button[data-v="renju"]');
  await A.clickSel('#nOpeningSeg button[data-v="formal"]');
  await A.clickSel('#nCreate');
  await waitFor(A, 'NET.connected && NET.code', 20000);
  const code = await A.evaluate('NET.code');
  await B.evaluate(`document.getElementById('nCodeInput').value=${JSON.stringify(code)}`);
  await B.clickSel('#nJoin');
  await waitFor(B, 'NET.connected && NET.state', 20000);
  await waitFor(A, 'NET.state', 5000);

  await t('swap.select', async () => {
    await clickText(A, '直接开局 1');
    return await waitFor(B, 'NET.state.phase === "swap"', 8000);
  });

  await t('swap.yes_flips_colors', async () => {
    const ok = await clickText(B, '交换黑白');
    if (!ok) return 'swap button missing';
    if (!await waitFor(A, 'NET.state.phase === "move4" && NET.state.finalHostColor === 2', 8000)) return 'no swap';
    if (!await waitFor(B, 'NET.state.phase === "move4" && NET.state.finalHostColor === 2', 8000)) return 'guest did not get swap';
    const a = await A.evaluate(`({mine:netMyColor(), actor:netActorSide()})`);
    const b = await B.evaluate(`({mine:netMyColor(), actor:netActorSide()})`);
    if (a.mine !== 2 || b.mine !== 1) return 'colors ' + JSON.stringify([a.mine, b.mine]);
    if (a.actor !== 'host' || b.actor !== 'host') return 'actor ' + JSON.stringify([a.actor, b.actor]);
    return true;
  });

  await t('swap.flow_after_flip', async () => {
    await clickNet(A, 6, 6); // 白第4手（房主执白）
    if (!await waitFor(B, 'NET.state.history.length === 4', 8000)) return 'move4';
    await clickNet(B, 4, 4); // 黑候选（对手）
    await sleep(400);
    await clickNet(B, 10, 10);
    if (!await waitFor(A, 'NET.state.phase === "choose5"', 8000)) return 'choose5';
    const pick = await A.evaluate('NET.state.candidates[0].slice()');
    await clickNet(A, pick[0], pick[1]); // 白选（房主）
    if (!await waitFor(B, 'NET.state.phase === "move6" && NET.state.history.length === 5', 8000)) return 'move6';
    await clickNet(A, 3, 3); // 白第6手（房主）
    const ok = await waitFor(B, 'NET.state.phase === "play" && NET.state.history.length === 6', 8000);
    if (!ok) return 'play';
    const a = await A.evaluate(`({b:NET.state.board, h:NET.state.history})`);
    const b = await B.evaluate(`({b:NET.state.board, h:NET.state.history})`);
    return JSON.stringify(a.b) === JSON.stringify(b.b) && JSON.stringify(a.h) === JSON.stringify(b.h) ? true : 'boards diverge';
  });
  await A.screenshot(path.join(SHOTS, 'online-formal-swapped.png'));

  await t('swap.host_leave_closes_room', async () => {
    await A.clickSel('#nLeave');
    const ok = await waitFor(B, `/离开/.test(document.getElementById('nStatus').textContent + document.getElementById('nSubStatus').textContent)`, 25000);
    if (!ok) return 'guest did not see host leave';
    return true;
  });

  const fail = R.filter(r => !r.pass);
  console.log(`ONLINE-SWAP TOTAL ${R.length} PASS ${R.length - fail.length} FAIL ${fail.length}`);
  R.forEach(r => console.log((r.pass ? 'PASS ' : 'FAIL ') + r.id + (r.detail ? ' :: ' + r.detail : '')));
} finally {
  try { await B.close(); } catch (e) {}
  try { await A.close(); } catch (e) {}
}