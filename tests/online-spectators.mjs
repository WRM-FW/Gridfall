import { launch } from './cdp.mjs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const url = process.env.APP_URL || pathToFileURL(path.join(import.meta.dirname, '..', 'games', 'board-club', 'index.html')).href;
const PORT = 12000 + (process.pid % 30000);
const R = [];
const t = async (id, fn) => {
  try {
    const d = await fn();
    if (d && typeof d === 'object' && 'pass' in d) R.push({ id, pass: !!d.pass, detail: d.detail });
    else R.push({ id, pass: d === true || d === undefined, detail: typeof d === 'string' ? d : undefined });
  } catch (e) { R.push({ id, pass: false, detail: e.message }); }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const waitFor = async (app, expr, ms = 12000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await app.evaluate(`(() => { try { return !!(${expr}); } catch (e) { return false; } })()`)) return true;
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

const host = await launch(url, { port: PORT + 500 });
const p2 = await launch(url, { port: PORT + 501 });
const watcher = await launch(url, { port: PORT + 502 });

try {
  await host.clickSel('#tabOnline');
  await p2.clickSel('#tabOnline');
  await watcher.clickSel('#tabOnline');
  await host.clickSel('#nCreate');
  if (!await waitFor(host, 'NET.connected && NET.code', 15000)) throw new Error('host did not connect');
  const code = await host.evaluate('NET.code');

  await p2.evaluate(`document.getElementById('nCodeInput').value=${JSON.stringify(code)}`);
  await p2.clickSel('#nJoin');
  if (!await waitFor(p2, 'NET.connected && NET.state', 15000)) throw new Error('guest 1 did not join');
  if (!await waitFor(host, 'NET.state && NET.guestClientId', 8000)) throw new Error('host has no formal guest');
  const hostId = await host.evaluate('NET.clientId');
  const p2Id = await p2.evaluate('NET.clientId');
  if (!await waitFor(p2, 'NET.seatKnown && !NET.spectator', 8000)) throw new Error('guest 1 was not assigned a player seat');

  await watcher.evaluate(`document.getElementById('nCodeInput').value=${JSON.stringify(code)}`);
  await watcher.clickSel('#nJoin');
  if (!await waitFor(watcher, 'NET.connected && NET.spectator === true && NET.seatKnown', 12000)) {
    throw new Error('guest 2 was not assigned spectator status');
  }
  if (!await waitFor(watcher, 'NET.state', 8000)) throw new Error('spectator did not receive the board');

  await t('spectator.seat_roles', async () => {
    if (!await waitFor(host, 'NET.roster.spectators.length === 1', 8000)) return 'host roster did not include the spectator';
    const h = await host.evaluate(`({ guest: NET.guestClientId, specs: NET.roster.spectators.slice(), formal: NET.formalGuestPresent })`);
    const a = await p2.evaluate(`({ spec: NET.spectator, color: netMyColor(), mine: netIsMyTurn() })`);
    const b = await watcher.evaluate(`({ spec: NET.spectator, color: netMyColor(), mine: netIsMyTurn() })`);
    if (h.guest !== p2Id) return 'first guest is not seat 2: ' + JSON.stringify(h);
    if (h.specs.length !== 1 || h.specs[0] !== (await watcher.evaluate('NET.clientId'))) return 'spectator roster wrong: ' + JSON.stringify(h);
    if (a.spec !== false || a.color === 0) return 'guest 1 should be a player: ' + JSON.stringify(a);
    if (b.spec !== true || b.color !== 0 || b.mine !== false) return 'guest 2 should be a spectator: ' + JSON.stringify(b);
    return true;
  });

  await t('spectator.roster_ui', async () => {
    if (!await waitFor(watcher, 'NET.roster.spectators.length === 1', 8000)) return 'spectator did not receive its roster row';
    const r = await host.evaluate(`(() => {
      const rows = [...document.querySelectorAll('#nRoster .rr')].map(x => x.textContent.replace(/\\s+/g,' ').trim());
      return { rows, hidden: document.getElementById('nRoster').classList.contains('hidden') };
    })()`);
    if (r.hidden || r.rows.length !== 3) return JSON.stringify(r);
    if (!r.rows.some(x => x.includes('房主（玩家A）')) || !r.rows.some(x => x.includes('玩家B')) || !r.rows.some(x => x.includes('观战 1'))) {
      return 'roles missing ' + JSON.stringify(r.rows);
    }
    const s = await watcher.evaluate(`(() => {
      const rows = [...document.querySelectorAll('#nRoster .rr')];
      const me = rows.filter(x => x.classList.contains('me'));
      return { n: rows.length, me: me.length, meText: me.map(x => x.textContent).join('|'), color: document.getElementById('nColor').textContent, status: document.getElementById('nStatus').textContent };
    })()`);
    if (s.n !== 3 || s.me !== 1 || !s.meText.includes('观战')) return 'spectator row missing ' + JSON.stringify(s);
    if (s.color !== '观战' || !s.status.includes('观战')) return 'spectator labels wrong ' + JSON.stringify(s);
    return true;
  });

  await t('spectator.controls_blocked', async () => {
    const r = await watcher.evaluate(`({
      resign: document.getElementById('nResign').disabled,
      rematch: document.getElementById('nRematch').disabled,
      pass: document.getElementById('nPass').disabled,
      swapHidden: document.getElementById('nSwap').classList.contains('hidden')
    })`);
    if (!r.resign || !r.rematch || !r.pass || !r.swapHidden) return JSON.stringify(r);
    const before = await host.evaluate('NET.state.history.length');
    await watcher.evaluate('netUserMove(7, 7)');
    await sleep(400);
    const after = await host.evaluate('NET.state.history.length');
    const toast = await watcher.evaluate(`document.getElementById('toast').textContent`);
    if (after !== before) return 'spectator move changed history';
    if (!toast.includes('观战')) return 'missing spectator toast: ' + toast;
    // Bypass the UI guard and send a raw intent: the host must still reject it.
    await watcher.evaluate(`NET.channel.send({ type: 'broadcast', event: 'intent', payload: { from: NET.clientId, fromSide: 'guest', type: 'move', r: 7, c: 8 } })`);
    await sleep(600);
    const raw = await host.evaluate('NET.state.history.length');
    if (raw !== before) return 'raw spectator intent changed history';
    await watcher.evaluate('netBroadcastBye()');
    await sleep(500);
    const bye = await host.evaluate(`({ gone: NET.opponentGone, status: document.getElementById('nStatus').textContent })`);
    if (bye.gone || bye.status.includes('玩家B已离开')) return 'spectator bye marked player B offline: ' + JSON.stringify(bye);
    return true;
  });

  await t('guest.pending_stone_is_opaque', async () => {
    // Host opens with black; then the formal guest (white) may move.
    await host.evaluate('netUserMove(7, 7)');
    if (!await waitFor(host, 'NET.state.history.length === 1', 8000)) return 'host move failed';
    if (!await waitFor(p2, 'NET.state.history.length === 1 && netIsMyTurn()', 8000)) return 'guest did not reach its turn';

    const prep = await p2.evaluate(`(() => {
      window.__drawRecs = [];
      window.__origDrawStone = window.drawStone;
      window.drawStone = function(g, cx, cy, r, color, alpha){
        window.__drawRecs.push({ color: color, alpha: alpha === undefined ? 1 : alpha });
        return window.__origDrawStone.apply(this, arguments);
      };
      window.__origSend = NET.channel.send.bind(NET.channel);
      window.__heldMove = null;
      NET.channel.send = function(msg){
        if (msg && msg.event === 'intent' && msg.payload && msg.payload.type === 'move') { window.__heldMove = msg; return Promise.resolve('held'); }
        return window.__origSend(msg);
      };
      return true;
    })()`);
    if (!prep) return 'could not patch renderer';

    await p2.evaluate('netUserMove(7, 8)');
    await sleep(200);
    const r = await p2.evaluate(`(() => {
      const recs = window.__drawRecs || [];
      const last = recs[recs.length - 1] || null;
      return { pending: NET.pending, hover: NET.hover, last: last, held: !!window.__heldMove, hist: NET.state.history.length };
    })()`);
    const hostHist = await host.evaluate('NET.state.history.length');
    await p2.evaluate(`(() => {
      window.drawStone = window.__origDrawStone;
      NET.channel.send = window.__origSend;
      window.__heldMove = null;
      NET.pending = null;
      NET.busy = false;
      netRender();
    })()`);

    if (!r.held) return 'intent was not held for inspection';
    if (!r.pending || r.pending.r !== 7 || r.pending.c !== 8 || r.pending.color !== 2) return 'pending missing ' + JSON.stringify(r.pending);
    if (r.hover !== null) return 'hover was not cleared';
    if (!r.last || r.last.color !== 2 || r.last.alpha !== 1) return 'pending stone not opaque ' + JSON.stringify(r.last);
    if (hostHist !== 1) return 'held send reached host, hist ' + hostHist;

    // Now send the real move and verify the authoritative state arrives.
    await p2.evaluate('netUserMove(7, 8)');
    if (!await waitFor(host, 'NET.state.history.length === 2', 8000)) return 'real move did not sync';
    if (!await waitFor(p2, 'NET.state.history.length === 2 && NET.pending === null', 8000)) return 'guest state did not catch up';
    return true;
  });

  await t('about.always_open', async () => {
    const r = await host.evaluate(`(() => {
      const d = document.querySelector('details.pages');
      const p = document.querySelector('.pages');
      const t = document.querySelector('.pages .pages-title');
      const ol = document.querySelector('.pages ol');
      return {
        details: !!d,
        summary: !!document.querySelector('.pages summary'),
        title: t ? t.textContent.trim() : '',
        visible: !!(p && p.offsetHeight > 0 && ol && ol.offsetHeight > 0),
        text: ol ? ol.textContent : ''
      };
    })()`);
    if (r.details || r.summary) return 'still collapsible ' + JSON.stringify(r);
    if (!r.title.includes('关于联机与部署') || !r.visible) return 'about not visible ' + JSON.stringify(r);
    if (!r.text.includes('观战席') || !r.text.includes('正式席位')) return 'about copy stale';
    return true;
  });

  await t('spectator.no_promotion_after_player_leaves', async () => {
    await p2.evaluate('netBroadcastBye()');
    await p2.close();
    if (!await waitFor(host, 'NET.formalGuestPresent === false', 25000)) return 'host did not notice player 2 leaving';
    const r = await host.evaluate(`({ guest: NET.guestClientId, specs: NET.roster.spectators.slice(), status: document.getElementById('nStatus').textContent + ' | ' + document.getElementById('nSubStatus').textContent })`);
    const b = await watcher.evaluate(`({ spec: NET.spectator, color: netMyColor() })`);
    if (r.guest !== p2Id) return 'seat 2 was reassigned: ' + JSON.stringify(r);
    if (r.specs.length !== 1) return 'spectator list changed: ' + JSON.stringify(r);
    if (!r.status.includes('玩家B') || !r.status.includes('离开')) return 'status missing: ' + r.status;
    if (b.spec !== true || b.color !== 0) return 'spectator was promoted: ' + JSON.stringify(b);
    return true;
  });

  await host.screenshot(path.join(import.meta.dirname, 'shots', 'online-spectator.png'));
} finally {
  for (const app of [host, p2, watcher]) {
    try { await app.close(); } catch (e) {}
  }
}

const fail = R.filter((r) => !r.pass);
console.log(`ONLINE-SPECTATORS TOTAL ${R.length} PASS ${R.length - fail.length} FAIL ${fail.length}`);
R.forEach((r) => console.log((r.pass ? 'PASS ' : 'FAIL ') + r.id + (r.detail ? ' :: ' + r.detail : '')));
if (fail.length) process.exitCode = 1;