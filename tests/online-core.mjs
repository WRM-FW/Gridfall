import { launch } from './cdp.mjs';
const SHOTS = path.join(import.meta.dirname, 'shots');
mkdirSync(SHOTS, { recursive: true });
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { writeFileSync, mkdirSync } from 'node:fs';

const url = pathToFileURL(path.join(import.meta.dirname, '..', 'games', 'board-club', 'index.html')).href;
const A = await launch(url, { port: 9411 });
const B = await launch(url, { port: 9412 });
const R = [];
const t = async (id, fn) => {
  try {
    const d = await fn();
    if (d && typeof d === 'object' && 'pass' in d) R.push({ id, pass: !!d.pass, detail: d.detail });
    else R.push({ id, pass: d === true || d === undefined, detail: typeof d === 'string' ? d : undefined });
  } catch (e) { R.push({ id, pass: false, detail: e.message }); }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const waitFor = async (app, expr, ms = 10000) => {
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
const host = A, guest = B;

try {
  await host.clickSel('#tabOnline');
  await guest.clickSel('#tabOnline');
  await host.clickSel('#nCreate');
  const gotCode = await waitFor(host, 'NET.connected && NET.code', 15000);
  if (!gotCode) throw new Error('host did not connect: ' + await host.evaluate('NET.connected + "|" + (window.__qaErrors||[]).join(";")'));
  const code = await host.evaluate('NET.code');
  console.log('room', code);

  await guest.evaluate(`document.getElementById('nCodeInput').value=${JSON.stringify(code)}`);
  await guest.clickSel('#nJoin');
  const joined = await waitFor(guest, 'NET.connected && NET.state', 15000);
  if (!joined) throw new Error('guest did not join: ' + await guest.evaluate('NET.connected + "|" + (window.__qaErrors||[]).join(";")'));
  await waitFor(host, 'NET.state', 5000);

  await t('online.both_connected', async () => {
    const a = await host.evaluate(`({role:NET.role, conn:NET.connected, state:!!NET.state, color:netMyColor(), guest:NET.guestPresent, err:window.__qaErrors||[]})`);
    const b = await guest.evaluate(`({role:NET.role, conn:NET.connected, state:!!NET.state, color:netMyColor(), host:NET.hostPresent, err:window.__qaErrors||[]})`);
    if (a.role !== 'host' || b.role !== 'guest') return 'roles wrong';
    if (a.color !== 1 || b.color !== 2) return 'colors wrong ' + JSON.stringify([a.color, b.color]);
    if (a.err.length || b.err.length) return 'errors ' + JSON.stringify([a.err, b.err]);
    return true;
  });
  await host.screenshot(path.join(SHOTS, 'online-joined.png'));

  await t('online.guest_cannot_move_out_of_turn', async () => {
    await clickNet(guest, 9, 9); // guest is white, black to move
    await sleep(500);
    const h = await host.evaluate('NET.state.history.length');
    const g = await guest.evaluate('NET.state.history.length');
    if (h !== 0 || g !== 0) return 'out-of-turn move accepted ' + h + '/' + g;
    return true;
  });

  await t('online.host_move_syncs', async () => {
    await clickNet(host, 7, 7);
    const ok = await waitFor(guest, 'NET.state.history.length === 1', 8000);
    if (!ok) return 'guest did not receive host move';
    const r = await guest.evaluate(`({b:NET.state.board[7][7], turn:NET.state.turn, mine:netIsMyTurn()})`);
    if (r.b !== 1 || r.turn !== 2 || !r.mine) return 'guest state wrong ' + JSON.stringify(r);
    return true;
  });

  await t('online.guest_move_syncs', async () => {
    await clickNet(guest, 7, 8);
    const ok = await waitFor(host, 'NET.state.history.length === 2', 8000);
    if (!ok) return 'host did not receive guest move';
    const r = await host.evaluate(`({b:NET.state.board[7][8], turn:NET.state.turn, mine:netIsMyTurn()})`);
    if (r.b !== 2 || r.turn !== 1 || !r.mine) return 'host state wrong ' + JSON.stringify(r);
    return true;
  });
  await guest.screenshot(path.join(SHOTS, 'online-two-moves.png'));

  await t('online.black_wins_and_rematch', async () => {
    const seqs = [
      [host, 7, 6], [guest, 8, 8], [host, 7, 5], [guest, 9, 9],
      [host, 7, 4], [guest, 10, 10], [host, 7, 3]
    ];
    for (const [app, r, c] of seqs) {
      await clickNet(app, r, c);
      await sleep(450);
    }
    const okA = await waitFor(host, 'NET.state.over', 6000);
    const okB = await waitFor(guest, 'NET.state.over', 6000);
    if (!okA || !okB) return 'game did not end';
    const a = await host.evaluate(`({win:NET.state.winner, text:document.getElementById('nResult').textContent})`);
    const b = await guest.evaluate(`({win:NET.state.winner, text:document.getElementById('nResult').textContent})`);
    if (a.win !== 1 || b.win !== 1) return 'winner wrong ' + JSON.stringify([a, b]);
    if (!a.text.includes('你赢了') || !b.text.includes('你输了')) return 'result text ' + JSON.stringify([a.text, b.text]);
    await host.screenshot(path.join(SHOTS, 'online-win.png'));
    // rematch both ready
    await host.clickSel('#nRematch');
    await sleep(300);
    await guest.clickSel('#nRematch');
    const reset = await waitFor(host, 'NET.state && !NET.state.over && NET.state.history.length === 0', 8000);
    if (!reset) return 'rematch did not start';
    const g = await waitFor(guest, 'NET.state && !NET.state.over && NET.state.history.length === 0', 8000);
    return g || 'guest rematch state missing';
  });

  await t('online.resign', async () => {
    await clickNet(host, 7, 7);
    await sleep(500);
    await host.clickSel('#nResign');
    const okA = await waitFor(host, 'NET.state.over', 5000);
    const okB = await waitFor(guest, 'NET.state.over', 5000);
    if (!okA || !okB) return 'resign not synced';
    const a = await host.evaluate(`({win:NET.state.winner, text:document.getElementById('nResult').textContent})`);
    const b = await guest.evaluate(`({win:NET.state.winner, text:document.getElementById('nResult').textContent})`);
    if (a.win !== 2) return 'resign winner ' + a.win;
    if (!a.text.includes('你输了') || !b.text.includes('你赢了')) return 'resign text';
    return true;
  });

  // disconnect guest, host should see it
  await t('online.guest_leave_detected', async () => {
    await guest.close();
    const ok = await waitFor(host, `/离线|离开/.test(document.getElementById('nStatus').textContent + document.getElementById('nSubStatus').textContent)`, 40000);
    if (!ok) return 'host did not detect guest leave: ' + await host.evaluate(`document.getElementById('nStatus').textContent + ' | ' + document.getElementById('nSubStatus').textContent`);
    return true;
  });

  writeFileSync(path.join(SHOTS, 'online-core-results.json'), JSON.stringify(R, null, 2));
  const fail = R.filter(r => !r.pass);
  console.log(`ONLINE-CORE TOTAL ${R.length} PASS ${R.length - fail.length} FAIL ${fail.length}`);
  R.forEach(r => console.log((r.pass ? 'PASS ' : 'FAIL ') + r.id + (r.detail ? ' :: ' + r.detail : '')));
} finally {
  try { await guest.close(); } catch (e) {}
  try { await host.close(); } catch (e) {}
}