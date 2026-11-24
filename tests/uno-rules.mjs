import { launch } from './cdp.mjs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const APP = process.env.APP_URL || pathToFileURL(path.resolve(import.meta.dirname, '..', 'games', 'uno', 'index.html')).href;
const R = [];
const PORT = 12000 + (process.pid % 30000);
const t = async (id, fn) => {
  console.log('RUN  ' + id);
  try {
    const d = await fn();
    const row = (d && typeof d === 'object' && 'pass' in d)
      ? { id, pass: !!d.pass, detail: d.detail }
      : { id, pass: d === true || d === undefined, detail: typeof d === 'string' ? d : undefined };
    R.push(row);
    console.log((row.pass ? 'PASS ' : 'FAIL ') + id + (row.detail ? ' :: ' + row.detail : ''));
  } catch (e) {
    R.push({ id, pass: false, detail: e.message });
    console.log('FAIL ' + id + ' :: ' + e.message);
  }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function wait(client, expr, ms = 12000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await client.evaluate(`(() => { try { return !!(${expr}); } catch (e) { return false; } })()`)) return true;
    await sleep(150);
  }
  return false;
}
async function waitAll(clients, expr, ms = 12000) {
  for (const c of clients) {
    if (!await wait(c, expr, ms)) return false;
  }
  return true;
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}
function card(id, color, value) {
  return [id, color, value];
}

const SIG = `(() => {
  const S = UNO_API.state;
  const ord = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  const hand = S.players.map((p) => [p.id, p.hand.map((c) => c.id).sort((a, b) => a - b)]).sort((a, b) => ord(a[0], b[0]));
  const uno = S.players.map((p) => [p.id, !!p.saidUno, !!p.vulnerableUno, p.connected !== false, !!p.auto]).sort((a, b) => ord(a[0], b[0]));
  const turn = S.players[S.currentTurn] ? S.players[S.currentTurn].id : null;
  return {
    turn,
    direction: S.direction,
    activeColor: S.activeColor,
    pendingDraw: S.pendingDraw,
    pendingDrawType: S.pendingDrawType,
    drawnPlayableCardId: S.drawnPlayableCardId,
    gameOver: S.gameOver,
    allowStacking: !!S.allowStacking,
    deck: S.deck.map((c) => c.id).sort((a, b) => a - b),
    discard: S.discard.map((c) => c.id),
    hand,
    uno
  };
})()`;

async function getSig(client) {
  return client.evaluate(SIG);
}
async function waitConsistent(clients, label = '', ms = 12000) {
  const end = Date.now() + ms;
  let last = null;
  while (Date.now() < end) {
    last = await Promise.all(clients.map((c) => getSig(c)));
    const canon = JSON.stringify(last[0]);
    if (last.every((s) => JSON.stringify(s) === canon)) return last[0];
    await sleep(150);
  }
  throw new Error('state mismatch ' + label + ' :: ' + JSON.stringify(last));
}
async function setupRoom(count) {
  const clients = [];
  const basePort = PORT + (count === 3 ? 100 : 200);
  for (let i = 0; i < count; i++) clients.push(await launch(APP, { port: basePort + i }));
  const host = clients[0];
  await host.evaluate(`document.getElementById('btn-online').click()`);
  await sleep(250);
  await host.evaluate(`document.querySelector('.online-count [data-netplayers="${count}"]').click()`);
  await host.evaluate(`document.getElementById('online-create').click()`);
  if (!await wait(host, `!!document.getElementById('online-room-code').textContent.match(/^[A-Z0-9]{6}$/)`)) throw new Error('room code missing');
  const code = await host.evaluate(`document.getElementById('online-room-code').textContent`);

  for (let i = 1; i < count; i++) {
    const g = clients[i];
    await g.evaluate(`document.getElementById('btn-online').click()`);
    await sleep(150);
    await g.evaluate(`(() => { const el=document.getElementById('online-code'); el.value=${JSON.stringify(code)}; el.dispatchEvent(new Event('input',{bubbles:true})); })()`);
    await g.evaluate(`document.getElementById('online-join').click()`);
    if (!await wait(g, `!!document.querySelector('#online-players .online-player')`)) throw new Error('guest ' + i + ' join failed');
  }
  if (!await wait(host, `document.querySelectorAll('#online-players .online-player').length === ${count}`)) throw new Error('lobby not full');
  await host.evaluate(`document.getElementById('online-start').click()`);
  for (let i = 0; i < count; i++) {
    if (!await wait(clients[i], `window.UNO_API && UNO_API.net.started && UNO_API.state.players.length === ${count}`)) {
      throw new Error('client ' + i + ' not started');
    }
    const info = await clients[i].evaluate(`({ own: UNO_API.state.players[0].id, my: UNO_API.net.myId })`);
    if (info.own !== info.my) throw new Error('rotation bad on client ' + i);
  }
  const ids = await host.evaluate(`UNO_API.state.players.map((p) => p.id)`);
  const byId = new Map();
  for (const c of clients) {
    const my = await c.evaluate(`UNO_API.net.myId`);
    byId.set(my, c);
  }
  for (const id of ids) {
    if (!byId.has(id)) throw new Error('client id not found: ' + id);
  }
  // The host's player array is [host, guest1, guest2, ...] because lobby order is preserved.
  return { clients, host, code, ids, byId };
}

function scenario(host, clients, spec, label) {
  return (async () => {
    const payload = JSON.stringify(spec);
    const v = await host.evaluate(`(() => {
      const S = UNO_API.state;
      const spec = ${payload};
      UNO_API.clearTimers();
      const mk = (c) => ({ id: c[0], color: c[1], value: c[2] });
      S.players.forEach((p, i) => {
        p.hand = (spec.hands[i] || []).map(mk);
        p.saidUno = !!spec.saidUno;
        p.vulnerableUno = false;
        p.isHuman = true;
        p.connected = true;
        p.auto = false;
      });
      S.deck = (spec.deck || []).map(mk);
      S.discard = (spec.discard || [spec.top]).map(mk);
      S.currentTurn = spec.turn || 0;
      S.direction = spec.direction || 1;
      S.activeColor = spec.activeColor || spec.top[1];
      S.pendingDraw = spec.pendingDraw || 0;
      S.pendingDrawType = spec.pendingDrawType || null;
      S.drawnPlayableCardId = spec.drawnPlayableCardId === undefined ? null : spec.drawnPlayableCardId;
      S.allowStacking = !!spec.allowStacking;
      S.gameOver = false;
      S.awaitingWildColor = false;
      S.pendingWildCardId = null;
      S.unoGraceTimer = null;
      UNO_API.net.overShown = false;
      ['wild-modal', 'gameover-modal', 'online-modal'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('open');
      });
      UNO_API.render();
      UNO_API.syncState();
      return UNO_API.net.version;
    })()`);
    const guests = clients.filter((c) => c !== host);
    if (!await waitAll(guests, `UNO_API.net.lastVersion >= ${v}`, 8000)) throw new Error('scenario broadcast timeout ' + label);
    return waitConsistent(clients, label);
  })();
}

async function doAction(actor, expr, label) {
  const before = await host.evaluate(`UNO_API.net.version`);
  await actor.evaluate(expr);
  const end = Date.now() + 8000;
  let bumped = false;
  while (Date.now() < end) {
    if (await host.evaluate(`UNO_API.net.version`) > before) { bumped = true; break; }
    await sleep(100);
  }
  if (!bumped) throw new Error('action was not broadcast: ' + label);
  return waitConsistent(clients, label);
}

await t('uno.local.no-syntax-errors', async () => {
  const b = await launch(APP, { port: PORT + 900 });
  try {
    const errs = await b.evaluate(`window.__qaErrors || []`);
    if (errs.length) return { pass: false, detail: errs.join(' | ') };
    return { pass: await b.evaluate(`!!window.UNO_API && UNO_API.state.players.length === 3`) };
  } finally { await b.close(); }
});


await t('uno.offline.initial-effect', async () => {
  const b = await launch(APP, { port: PORT + 901 });
  try {
    let hit = null;
    for (let i = 0; i < 240; i++) {
      const info = await b.evaluate(`(() => {
        UNO_API.startGame(3);
        const S = UNO_API.state;
        return { top: S.discard[0].value, turn: S.currentTurn, over: S.gameOver };
      })()`);
      if (!info.over && info.turn !== 0 && (info.top === 'skip' || info.top === 'draw2')) { hit = info; break; }
    }
    if (!hit) throw new Error('could not produce an initial skip/draw2 within 240 deals');
    // The AI should take the skipped/penalized seat's turn without any human click.
    const acted = await wait(b, `UNO_API.state.currentTurn === 0 || UNO_API.state.gameOver`, 6000);
    assert(acted, 'offline AI did not start after initial ' + hit.top + ' (turn ' + hit.turn + ')');
    return { pass: true, detail: 'initial ' + hit.top + ' auto-started AI' };
  } finally { await b.close(); }
});

let room = null;
let host = null;
let clients = null;
let ids = null;
let byId = null;
let c1 = null;
let c2 = null;

await t('uno.setup.3p', async () => {
  room = await setupRoom(3);
  host = room.host;
  clients = room.clients;
  ids = room.ids;
  byId = room.byId;
  c1 = byId.get(ids[1]);
  c2 = byId.get(ids[2]);
  return { pass: true, detail: ids.join(',') };
});

await t('uno.rules.match', async () => {
  await scenario(host, clients, {
    top: card(700001, 'red', '5'),
    hands: [
      [card(700011, 'green', '3')],
      [card(700012, 'blue', '9')],
      [card(700013, 'yellow', '1')]
    ],
    turn: 0
  }, 'match');
  const r = await host.evaluate(`(() => {
    const c = (color, value) => ({ id: 1, color, value });
    return {
      sameColor: UNO_API.canPlayCard(c('red', '9')),
      sameValue: UNO_API.canPlayCard(c('green', '5')),
      mismatch: UNO_API.canPlayCard(c('blue', '3')),
      wild: UNO_API.canPlayCard(c('wild', 'wild')),
      wild4: UNO_API.canPlayCard(c('wild', 'wild4')),
      pendingRed: UNO_API.canPlayCard(c('red', '9'))
    };
  })()`);
  assert(r.sameColor && r.sameValue && !r.mismatch && r.wild && r.wild4, 'basic match rules');
  assert(r.sameColor && r.pendingRed, 'red number should match active color');
  const g = await c1.evaluate(`(() => {
    const c = (color, value) => ({ id: 1, color, value });
    return { sameColor: UNO_API.canPlayCard(c('red', '9')), mismatch: UNO_API.canPlayCard(c('blue', '3')) };
  })()`);
  assert(g.sameColor && !g.mismatch, 'guest match rules');
  return true;
});

await t('uno.rules.stacking-gate', async () => {
  await scenario(host, clients, {
    top: card(701001, 'red', '5'),
    hands: [[card(701011, 'red', 'draw2')], [card(701012, 'red', 'draw2'), card(701013, 'green', '7')], [card(701014, 'blue', '3')]],
    turn: 1,
    allowStacking: true,
    pendingDraw: 2,
    pendingDrawType: 'draw2'
  }, 'stack-gate');
  const r = await host.evaluate(`(() => {
    const c = (color, value) => ({ id: 1, color, value });
    return {
      redNumber: UNO_API.canPlayCard(c('red', '9')),
      red5: UNO_API.canPlayCard(c('red', '5')),
      draw2: UNO_API.canPlayCard(c('red', 'draw2')),
      wild4: UNO_API.canPlayCard(c('wild', 'wild4')),
      wild: UNO_API.canPlayCard(c('wild', 'wild'))
    };
  })()`);
  assert(!r.redNumber && !r.red5 && r.draw2 && r.wild4 && !r.wild, 'draw2 stack gate: ' + JSON.stringify(r));
  const g = await c1.evaluate(`(() => {
    const c = (color, value) => ({ id: 1, color, value });
    return { red5: UNO_API.canPlayCard(c('red', '5')), draw2: UNO_API.canPlayCard(c('red', 'draw2')), wild: UNO_API.canPlayCard(c('wild', 'wild')) };
  })()`);
  assert(!g.red5 && g.draw2 && !g.wild, 'guest stack gate: ' + JSON.stringify(g));
  const playable = await c1.evaluate(`Array.from(document.querySelectorAll('#player-hand .hand-card-btn.playable')).map((b) => Number(b.dataset.cardId))`);
  assert(playable.length === 1 && playable[0] === 701012, 'guest UI should only highlight the stack card: ' + JSON.stringify(playable));

  await scenario(host, clients, {
    top: card(702001, 'red', '5'),
    hands: [[card(702011, 'red', '2')], [card(702012, 'red', 'draw2')], [card(702013, 'blue', '3')]],
    turn: 0,
    allowStacking: true,
    pendingDraw: 4,
    pendingDrawType: 'wild4'
  }, 'wild4-gate');
  const r2 = await host.evaluate(`(() => {
    const c = (color, value) => ({ id: 1, color, value });
    return { draw2: UNO_API.canPlayCard(c('red', 'draw2')), wild4: UNO_API.canPlayCard(c('wild', 'wild4')), red: UNO_API.canPlayCard(c('red', '9')) };
  })()`);
  assert(!r2.draw2 && r2.wild4 && !r2.red, 'wild4 stack gate: ' + JSON.stringify(r2));

  await scenario(host, clients, {
    top: card(703001, 'red', '5'),
    hands: [[card(703011, 'red', '2')], [card(703012, 'red', 'draw2')], [card(703013, 'blue', '3')]],
    turn: 0,
    allowStacking: false,
    pendingDraw: 2,
    pendingDrawType: 'draw2'
  }, 'no-stack-gate');
  const r3 = await host.evaluate(`(() => {
    const c = (color, value) => ({ id: 1, color, value });
    return { red: UNO_API.canPlayCard(c('red', '9')), draw2: UNO_API.canPlayCard(c('red', 'draw2')), wild4: UNO_API.canPlayCard(c('wild', 'wild4')) };
  })()`);
  assert(!r3.red && !r3.draw2 && !r3.wild4, 'non-stacking pending must force a draw: ' + JSON.stringify(r3));
  return true;
});

await t('uno.turn.normal-skip-reverse', async () => {
  let sig = await scenario(host, clients, {
    top: card(710001, 'red', '5'),
    hands: [[card(710011, 'red', '7'), card(710012, 'blue', '9')], [card(710013, 'green', '2'), card(710014, 'green', '3')], [card(710015, 'yellow', '1'), card(710016, 'yellow', '2')]],
    turn: 0
  }, 'turn-normal');
  assert(sig.turn === ids[0], 'host should start');
  sig = await doAction(host, `UNO_API.handClick(710011)`, 'turn-normal-after');
  assert(sig.turn === ids[1], 'normal card should pass to player 2, got ' + sig.turn);

  sig = await scenario(host, clients, {
    top: card(711001, 'red', '5'),
    hands: [[card(711011, 'red', 'skip'), card(711012, 'blue', '9')], [card(711013, 'green', '2'), card(711014, 'green', '3')], [card(711015, 'yellow', '1'), card(711016, 'yellow', '2')]],
    turn: 0
  }, 'turn-skip');
  sig = await doAction(host, `UNO_API.handClick(711011)`, 'turn-skip-after');
  assert(sig.turn === ids[2], 'skip should pass to player 3, got ' + sig.turn);
  assert(JSON.stringify(sig.hand.find((h) => h[0] === ids[1])[1]) === JSON.stringify([711013, 711014]), 'skipped player hand must not change');

  sig = await scenario(host, clients, {
    top: card(712001, 'red', '5'),
    hands: [[card(712011, 'red', 'reverse'), card(712012, 'blue', '9')], [card(712013, 'green', '2'), card(712014, 'green', '3')], [card(712015, 'yellow', '1'), card(712016, 'yellow', '2')]],
    turn: 0
  }, 'turn-reverse');
  sig = await doAction(host, `UNO_API.handClick(712011)`, 'turn-reverse-after');
  assert(sig.direction === -1, 'reverse should flip direction');
  assert(sig.turn === ids[2], 'reverse should pass to player 3, got ' + sig.turn);
  return true;
});

await t('uno.turn.draw2-wild4', async () => {
  let sig = await scenario(host, clients, {
    top: card(720001, 'red', '5'),
    hands: [[card(720011, 'red', 'draw2'), card(720012, 'blue', '9')], [card(720013, 'green', '2'), card(720014, 'green', '3'), card(720015, 'green', '4')], [card(720016, 'yellow', '1'), card(720017, 'yellow', '2')]],
    deck: [card(720100, 'blue', '7'), card(720101, 'blue', '8')],
    turn: 0,
    allowStacking: false
  }, 'draw2');
  sig = await doAction(host, `UNO_API.handClick(720011)`, 'draw2-after');
  assert(sig.turn === ids[2], 'draw2 should skip the victim, got ' + sig.turn);
  assert(sig.hand.find((h) => h[0] === ids[1])[1].length === 5, 'victim should draw 2');

  sig = await scenario(host, clients, {
    top: card(721001, 'red', '5'),
    hands: [[card(721011, 'wild', 'wild4'), card(721012, 'blue', '9')], [card(721013, 'green', '2'), card(721014, 'green', '3'), card(721015, 'green', '4')], [card(721016, 'yellow', '1'), card(721017, 'yellow', '2')]],
    deck: [card(721100, 'blue', '7'), card(721101, 'blue', '8')],
    turn: 0,
    allowStacking: false
  }, 'wild4');
  sig = await doAction(host, `UNO_API.act('play', { cardId: 721011, color: 'green' })`, 'wild4-after');
  assert(sig.activeColor === 'green', 'wild4 should set chosen color');
  assert(sig.turn === ids[2], 'wild4 should skip the victim, got ' + sig.turn);
  assert(sig.hand.find((h) => h[0] === ids[1])[1].length === 6, 'victim should draw 4');
  return true;
});

await t('uno.stack.play-and-penalty', async () => {
  let sig = await scenario(host, clients, {
    top: card(730001, 'red', '5'),
    hands: [
      [card(730011, 'red', 'draw2'), card(730012, 'blue', '9')],
      [card(730013, 'red', 'draw2'), card(730014, 'green', '7')],
      [card(730015, 'blue', '3'), card(730016, 'yellow', '4')]
    ],
    deck: [card(730100, 'blue', '1'), card(730101, 'blue', '2'), card(730102, 'blue', '6'), card(730103, 'blue', '8')],
    turn: 0,
    allowStacking: true
  }, 'stack-play');
  sig = await doAction(host, `UNO_API.handClick(730011)`, 'stack-play-after');
  assert(sig.pendingDraw === 2 && sig.pendingDrawType === 'draw2', 'pending +2 expected');
  assert(sig.turn === ids[1], 'stack should pass one seat');

  // Illegal matched card during a pending stack must be rejected by the host.
  const before = JSON.stringify(sig);
  sig = await doAction(c1, `UNO_API.act('play', { cardId: 730014 })`, 'stack-illegal');
  assert(JSON.stringify(sig) === before, 'matching card must not bypass a pending stack');
  assert(await c1.evaluate(`document.querySelectorAll('#player-hand .hand-card-btn.playable').length === 1`), 'only the stackable card should be playable');

  sig = await doAction(c1, `UNO_API.handClick(730013)`, 'stack-2');
  assert(sig.pendingDraw === 4 && sig.pendingDrawType === 'draw2', 'pending +4 expected');
  assert(sig.turn === ids[2], 'second +2 should pass to player 3');

  const canDraw = await c2.evaluate(`!document.getElementById('draw-pile-btn').disabled`);
  assert(canDraw, 'player without a stack card must be able to draw');
  const playableCount = await c2.evaluate(`document.querySelectorAll('#player-hand .hand-card-btn.playable').length`);
  assert(playableCount === 0, 'no hand card should be playable while +4 is pending');

  sig = await doAction(c2, `UNO_API.act('draw')`, 'stack-penalty');
  assert(sig.pendingDraw === 0 && sig.pendingDrawType === null, 'penalty should clear');
  assert(sig.turn === ids[0], 'after drawing the penalty turn should pass to host');
  assert(sig.hand.find((h) => h[0] === ids[2])[1].length === 6, 'player 3 should draw 4 cards');
  return true;
});

await t('uno.draw.once', async () => {
  const sig = await scenario(host, clients, {
    top: card(740001, 'red', '5'),
    hands: [
      [card(740011, 'green', '1'), card(740012, 'green', '2')],
      [card(740013, 'red', '7'), card(740014, 'blue', '9')],
      [card(740015, 'yellow', '1'), card(740016, 'yellow', '2')]
    ],
    deck: [card(740100, 'yellow', '9'), card(740101, 'red', '3')],
    turn: 1
  }, 'draw-once');
  assert(sig.turn === ids[1], 'guest 1 should be on turn');
  // Fire two draws back-to-back; the host must accept only the first one.
  await c1.evaluate(`UNO_API.act('draw'); UNO_API.act('draw');`);
  await sleep(1200);
  const after = await waitConsistent(clients, 'draw-once-after');
  const hand = after.hand.find((h) => h[0] === ids[1])[1];
  assert(hand.length === 3, 'only one card should be drawn, got hand ' + JSON.stringify(hand));
  assert(after.drawnPlayableCardId === 740101, 'drawn card should be marked playable');
  assert(after.turn === ids[1], 'turn must stay with the drawer');
  assert(after.deck.length === 1, 'only one card should leave the deck');
  const focus = await c1.evaluate(`document.querySelectorAll('#player-hand .hand-card-btn.drawn-focus').length`);
  assert(focus === 1, 'drawn card should be focused');
  // After drawing, only the drawn card may be played; another otherwise-legal card is locked.
  const locked = await doAction(c1, `UNO_API.act('play', { cardId: 740013 })`, 'draw-once-locked');
  assert(locked.hand.find((h) => h[0] === ids[1])[1].length === 3, 'non-drawn card must not be playable after drawing');
  assert(locked.turn === ids[1] && locked.drawnPlayableCardId === 740101, 'drawn-card lock should keep the turn');
  const passed = await doAction(c1, `UNO_API.act('pass')`, 'draw-once-pass');
  assert(passed.turn === ids[2] && passed.drawnPlayableCardId === null, 'keep & pass should advance exactly one seat');
  return true;
});


await t('uno.draw.non-playable', async () => {
  const sig = await scenario(host, clients, {
    top: card(741001, 'red', '5'),
    hands: [
      [card(741011, 'green', '1'), card(741012, 'green', '2')],
      [card(741013, 'green', '2')],
      [card(741015, 'yellow', '1'), card(741016, 'yellow', '2')]
    ],
    deck: [card(741100, 'yellow', '9'), card(741101, 'blue', '9')],
    turn: 1
  }, 'draw-nonplayable');
  assert(sig.turn === ids[1], 'guest 1 should be on turn');
  const after = await doAction(c1, `UNO_API.act('draw')`, 'draw-nonplayable-after');
  assert(after.hand.find((h) => h[0] === ids[1])[1].length === 2, 'non-playable draw should add exactly one card');
  assert(after.turn === ids[2], 'non-playable draw should advance exactly one seat, got ' + after.turn);
  assert(after.drawnPlayableCardId === null, 'non-playable draw must not lock the hand');
  return true;
});

await t('uno.deck.reshuffle', async () => {
  const sig = await scenario(host, clients, {
    top: card(706003, 'red', '5'),
    discard: [card(706001, 'blue', '1'), card(706002, 'green', '2'), card(706003, 'red', '5')],
    hands: [
      [card(706011, 'green', '1')],
      [card(706012, 'green', '9')],
      [card(706013, 'yellow', '1'), card(706014, 'yellow', '2')]
    ],
    deck: [],
    turn: 1
  }, 'reshuffle');
  assert(sig.turn === ids[1], 'guest 1 should be on turn');
  const after = await doAction(c1, `UNO_API.act('draw')`, 'reshuffle-after');
  assert(after.hand.find((h) => h[0] === ids[1])[1].length === 2, 'reshuffle draw should add one card');
  assert(after.turn === ids[2], 'reshuffle draw should advance one seat');
  assert(after.discard.length === 1 && after.discard[0] === 706003, 'discard top must stay in place while recycling');
  assert(after.deck.length === 1, 'one recycled card should remain in the deck');
  return true;
});

await t('uno.wild.invalid-color', async () => {
  const sig = await scenario(host, clients, {
    top: card(742001, 'red', '5'),
    hands: [
      [card(742011, 'wild', 'wild'), card(742012, 'blue', '9')],
      [card(742013, 'green', '2'), card(742014, 'green', '3')],
      [card(742015, 'yellow', '1'), card(742016, 'yellow', '2')]
    ],
    turn: 0
  }, 'wild-invalid');
  const before = JSON.stringify(sig);
  const after = await doAction(host, `UNO_API.act('play', { cardId: 742011, color: 'purple' })`, 'wild-invalid-after');
  assert(JSON.stringify(after) === before, 'invalid wild color must not change state');
  assert(after.hand.find((h) => h[0] === ids[0])[1].length === 2, 'wild card must stay in hand');
  assert(after.activeColor === 'red', 'invalid color must not change the active color');
  return true;
});

await t('uno.concurrent.double-play', async () => {
  const sig = await scenario(host, clients, {
    top: card(745001, 'red', '5'),
    hands: [
      [card(745011, 'green', '1'), card(745012, 'green', '2')],
      [card(745013, 'red', '7'), card(745014, 'red', '8'), card(745015, 'blue', '9')],
      [card(745016, 'yellow', '1'), card(745017, 'yellow', '2')]
    ],
    turn: 1
  }, 'double-play');
  assert(sig.turn === ids[1], 'guest 1 should be on turn');
  await c1.evaluate(`UNO_API.act('play', { cardId: 745013 }); UNO_API.act('play', { cardId: 745014 });`);
  await sleep(1500);
  const after = await waitConsistent(clients, 'double-play-after');
  const hand = after.hand.find((h) => h[0] === ids[1])[1];
  assert(hand.length === 2, 'only one of two rapid plays may apply, got ' + JSON.stringify(hand));
  assert(after.turn === ids[2], 'rapid double play should advance only one seat, got ' + after.turn);
  assert([745013, 745014].indexOf(after.discard[after.discard.length - 1]) >= 0, 'one of the two cards must be on top');
  return true;
});

await t('uno.illegal.out-of-turn', async () => {
  const sig = await scenario(host, clients, {
    top: card(750001, 'red', '5'),
    hands: [
      [card(750011, 'red', '7'), card(750012, 'blue', '9')],
      [card(750013, 'red', '8'), card(750014, 'green', '2')],
      [card(750015, 'red', '9'), card(750016, 'yellow', '2')]
    ],
    turn: 0
  }, 'out-of-turn');
  const before = JSON.stringify(sig);
  const after = await doAction(c1, `UNO_API.act('play', { cardId: 750013 })`, 'out-of-turn-after');
  assert(JSON.stringify(after) === before, 'out-of-turn play must not change state');
  return true;
});

await t('uno.stale-client.resync', async () => {
  const sig = await scenario(host, clients, {
    top: card(760001, 'red', '5'),
    hands: [
      [card(760011, 'red', '7'), card(760012, 'blue', '9')],
      [card(760013, 'green', '2'), card(760014, 'green', '3')],
      [card(760015, 'red', '9'), card(760016, 'yellow', '2')]
    ],
    turn: 0
  }, 'resync');
  assert(sig.turn === ids[0], 'host should be on turn');
  // Corrupt only the guest's local view, simulating a lost/stale snapshot.
  await c2.evaluate(`(() => { UNO_API.state.currentTurn = 0; UNO_API.render(); })()`);
  assert(await c2.evaluate(`UNO_API.state.currentTurn === 0`), 'local corruption failed');
  const after = await doAction(c2, `UNO_API.act('play', { cardId: 760015 })`, 'resync-after');
  assert(after.turn === ids[0], 'rejected stale action must resync to host turn');
  assert(JSON.stringify(after) === JSON.stringify(sig), 'stale action must not change authoritative state');
  return true;
});

await t('uno.uno.rescue-and-catch', async () => {
  // Rescue: a player who forgot UNO can still shout it after the turn moves on.
  let sig = await scenario(host, clients, {
    top: card(770001, 'red', '5'),
    hands: [
      [card(770011, 'green', '1'), card(770012, 'green', '2')],
      [card(770013, 'red', '7'), card(770014, 'blue', '9')],
      [card(770015, 'yellow', '2'), card(770016, 'yellow', '3')]
    ],
    turn: 1
  }, 'uno-rescue');
  sig = await doAction(c1, `UNO_API.handClick(770013)`, 'uno-rescue-1');
  const uno1 = sig.uno.find((u) => u[0] === ids[1]);
  assert(uno1[1] === false && uno1[2] === true, 'forgetting UNO should leave the player vulnerable, got ' + JSON.stringify(uno1));
  assert(await c2.evaluate(`document.querySelectorAll('.catch-btn').length === 1`), 'opponents must see a Catch UNO button');
  // No automatic penalty may happen in online mode.
  await sleep(3200);
  const late = await getSig(c1);
  assert(late.hand.find((h) => h[0] === ids[1])[1].length === 1, 'online UNO must not auto-penalize');
  assert(late.uno.find((u) => u[0] === ids[1])[2] === true, 'vulnerability should persist until caught');
  const rescued = await doAction(c1, `UNO_API.act('uno')`, 'uno-rescue-2');
  const uno2 = rescued.uno.find((u) => u[0] === ids[1]);
  assert(uno2[1] === true && uno2[2] === false, 'off-turn UNO rescue should work, got ' + JSON.stringify(uno2));

  // Catch: an opponent clicking the seat button applies the +2.
  sig = await scenario(host, clients, {
    top: card(771001, 'red', '5'),
    hands: [
      [card(771011, 'green', '1'), card(771012, 'green', '2')],
      [card(771013, 'red', '7'), card(771014, 'blue', '9')],
      [card(771015, 'yellow', '2'), card(771016, 'yellow', '3')]
    ],
    deck: [card(771100, 'blue', '7'), card(771101, 'blue', '8')],
    turn: 1
  }, 'uno-catch');
  sig = await doAction(c1, `UNO_API.handClick(771013)`, 'uno-catch-1');
  assert(sig.uno.find((u) => u[0] === ids[1])[2] === true, 'guest must be vulnerable before catch');
  const caught = await doAction(c2, `(() => { const b=document.querySelector('.catch-btn'); if (b) b.click(); })()`, 'uno-catch-2');
  const hand2 = caught.hand.find((h) => h[0] === ids[1])[1];
  assert(hand2.length === 3, 'caught player should draw 2, got ' + JSON.stringify(hand2));
  assert(caught.uno.find((u) => u[0] === ids[1])[2] === false, 'catch should close vulnerability');

  // Arming UNO before playing the second-to-last card prevents vulnerability.
  sig = await scenario(host, clients, {
    top: card(772001, 'red', '5'),
    hands: [
      [card(772011, 'green', '1'), card(772012, 'green', '2')],
      [card(772013, 'red', '7'), card(772014, 'blue', '9')],
      [card(772015, 'yellow', '2'), card(772016, 'yellow', '3')]
    ],
    turn: 1
  }, 'uno-arm');
  await doAction(c1, `UNO_API.act('uno')`, 'uno-arm');
  const armed = await doAction(c1, `UNO_API.handClick(772013)`, 'uno-arm-after');
  const uno3 = armed.uno.find((u) => u[0] === ids[1]);
  assert(uno3[1] === true && uno3[2] === false, 'armed UNO should not be vulnerable, got ' + JSON.stringify(uno3));
  return true;
});

await t('uno.gameover.rematch', async () => {
  let sig = await scenario(host, clients, {
    top: card(780001, 'red', '5'),
    hands: [
      [card(780011, 'green', '1'), card(780012, 'green', '2')],
      [card(780013, 'red', '7')],
      [card(780015, 'yellow', '2'), card(780016, 'yellow', '3')]
    ],
    turn: 1
  }, 'gameover');
  sig = await doAction(c1, `UNO_API.handClick(780013)`, 'gameover-after');
  assert(sig.gameOver === true, 'game should be over');
  assert(sig.hand.find((h) => h[0] === ids[1])[1].length === 0, 'winner hand should be empty');
  assert(await c1.evaluate(`document.getElementById('gameover-title').textContent.includes('赢')`), 'winner should see win title');
  assert(await c2.evaluate(`document.getElementById('gameover-title').textContent.length > 0`), 'other players should see a result title');
  // Host starts the rematch; all clients reset to 7 cards and clear overShown.
  const reset = await doAction(host, `UNO_API.restart()`, 'rematch');
  assert(reset.gameOver === false, 'rematch should clear game over');
  assert(reset.hand.every((h) => h[1].length >= 7), 'rematch should deal at least 7 cards each');
  assert(await wait(c1, `UNO_API.net.overShown === false`), 'guest overShown should reset');
  assert(await c1.evaluate(`!document.getElementById('gameover-modal').classList.contains('open')`), 'guest result modal should close');
  return true;
});

await t('uno.leave.takeover-reconnect', async () => {
  const sig = await scenario(host, clients, {
    top: card(790001, 'red', '5'),
    hands: [
      [card(790011, 'green', '1'), card(790012, 'green', '2')],
      [card(790013, 'blue', '2'), card(790014, 'blue', '3')],
      [card(790015, 'red', '8'), card(790016, 'yellow', '2'), card(790017, 'yellow', '3')]
    ],
    turn: 2
  }, 'leave');
  assert(sig.turn === ids[2], 'guest 2 should be on turn');
  await host.evaluate(`UNO_API.net.takeoverDelay = 1500`);

  // Graceful leave: bye + unsubscribe, as the real leave button does.
  await c2.evaluate(`UNO_API.net.channel.send({ type: 'broadcast', event: 'bye', payload: { id: UNO_API.net.myId } })`);
  await c2.evaluate(`UNO_API.net.channel.unsubscribe()`);
  if (!await wait(host, `UNO_API.state.players.find((p) => p.id === ${JSON.stringify(ids[2])}).connected === false`, 5000)) {
    throw new Error('host did not mark the guest offline');
  }
  assert(await wait(c1, `UNO_API.state.players.find((p) => p.id === ${JSON.stringify(ids[2])}).connected === false`, 5000), 'remaining guest should see the offline tag');
  const offTag = await c1.evaluate(`document.querySelectorAll('.seat-offline-tag').length`);
  assert(offTag >= 1, 'offline seat tag should render');

  // After the takeover delay the host should auto-play the missing seat and move the turn.
  if (!await wait(host, `UNO_API.state.players.find((p) => p.id === ${JSON.stringify(ids[2])}).auto === true`, 6000)) {
    throw new Error('takeover did not start');
  }
  await sleep(1800);
  const afterBot = await waitConsistent([host, c1], 'takeover-after');
  assert(afterBot.turn !== ids[2], 'auto-play should move the turn away from the missing player');
  assert(afterBot.uno.find((u) => u[0] === ids[2])[4] === true, 'missing player should be marked auto');

  // Reconnect with the same session id; the host should restore the seat.
  await c2.evaluate(`UNO_API.connect(${JSON.stringify(room.code)}, false)`);
  if (!await wait(c2, `UNO_API.net.started && UNO_API.state.players[0].id === UNO_API.net.myId`, 12000)) {
    throw new Error('guest reconnect failed');
  }
  if (!await wait(host, `UNO_API.state.players.find((p) => p.id === ${JSON.stringify(ids[2])}).connected === true`, 6000)) {
    throw new Error('host did not restore the reconnecting guest');
  }
  const back = await waitConsistent(clients, 'reconnect');
  assert(back.uno.find((u) => u[0] === ids[2])[1] !== undefined, 'reconnected guest state missing');
  assert(back.uno.find((u) => u[0] === ids[2])[4] === false, 'reconnected guest should no longer be auto');
  return true;
});

await t('uno.join.started-denied', async () => {
  const fourth = await launch(APP, { port: 9741 });
  try {
    await fourth.evaluate(`document.getElementById('btn-online').click()`);
    await sleep(200);
    await fourth.evaluate(`(() => { const el=document.getElementById('online-code'); el.value=${JSON.stringify(room.code)}; el.dispatchEvent(new Event('input',{bubbles:true})); })()`);
    await fourth.evaluate(`document.getElementById('online-join').click()`);
    const denied = await wait(fourth, `UNO_API.net.denied === true`, 8000);
    assert(denied, 'late joiner should be denied');
    const status = await fourth.evaluate(`document.getElementById('online-status').textContent`);
    assert(status.indexOf('开始') >= 0 || status.indexOf('无法加入') >= 0 || status.indexOf('本局玩家') >= 0, 'deny message missing: ' + status);
    const hostCount = await host.evaluate(`UNO_API.state.players.length`);
    assert(hostCount === 3, 'late joiner must not change the running roster');
    return true;
  } finally { await fourth.close(); }
});


await t('uno.4p.order', async () => {
  for (const c of clients) await c.close();
  const r4 = await setupRoom(4);
  host = r4.host;
  clients = r4.clients;
  ids = r4.ids;
  byId = r4.byId;
  c1 = byId.get(ids[1]);
  c2 = byId.get(ids[2]);
  const c3 = byId.get(ids[3]);

  let sig = await scenario(host, clients, {
    top: card(800001, 'red', '5'),
    hands: [
      [card(800011, 'red', 'reverse'), card(800012, 'blue', '9')],
      [card(800013, 'green', '2'), card(800014, 'green', '3')],
      [card(800015, 'yellow', '1'), card(800016, 'yellow', '2')],
      [card(800017, 'red', '1'), card(800018, 'blue', '2')]
    ],
    turn: 0
  }, '4p-reverse');
  assert(sig.direction === 1 && sig.turn === ids[0], '4p setup invalid');
  sig = await doAction(host, `UNO_API.handClick(800011)`, '4p-reverse-after');
  assert(sig.direction === -1, '4p reverse should flip direction');
  assert(sig.turn === ids[3], '4p reverse should pass to index 3, got ' + sig.turn);
  sig = await doAction(c3, `UNO_API.handClick(800017)`, '4p-reverse-next');
  assert(sig.direction === -1, '4p reverse order should stay flipped');
  assert(sig.turn === ids[2], '4p reverse order should go 3 -> 2, got ' + sig.turn);

  sig = await scenario(host, clients, {
    top: card(801001, 'red', '5'),
    hands: [
      [card(801011, 'red', 'skip'), card(801012, 'blue', '9')],
      [card(801013, 'green', '2'), card(801014, 'green', '3')],
      [card(801015, 'yellow', '1'), card(801016, 'yellow', '2')],
      [card(801017, 'blue', '1'), card(801018, 'blue', '2')]
    ],
    turn: 0
  }, '4p-skip');
  sig = await doAction(host, `UNO_API.handClick(801011)`, '4p-skip-after');
  assert(sig.turn === ids[2], '4p skip should pass to index 2, got ' + sig.turn);
  return { pass: true, detail: '4p reverse + skip order' };
});


await t('uno.join.full-room-pre-start', async () => {
  const cs = [];
  for (let i = 0; i < 4; i++) cs.push(await launch(APP, { port: PORT + 300 + i }));
  const h = cs[0];
  try {
    await h.evaluate(`document.getElementById('btn-online').click()`);
    await sleep(250);
    await h.evaluate(`document.querySelector('.online-count [data-netplayers="3"]').click()`);
    await h.evaluate(`document.getElementById('online-create').click()`);
    if (!await wait(h, `!!document.getElementById('online-room-code').textContent.match(/^[A-Z0-9]{6}$/)`)) throw new Error('room code missing');
    const code = await h.evaluate(`document.getElementById('online-room-code').textContent`);
    for (let i = 1; i <= 2; i++) {
      const g = cs[i];
      await g.evaluate(`document.getElementById('btn-online').click()`);
      await sleep(150);
      await g.evaluate(`(() => { const el=document.getElementById('online-code'); el.value=${JSON.stringify(code)}; el.dispatchEvent(new Event('input',{bubbles:true})); })()`);
      await g.evaluate(`document.getElementById('online-join').click()`);
      if (!await wait(h, `UNO_NET.lobby.length === ${i + 1}`, 8000)) throw new Error('lobby did not reach ' + (i + 1));
    }
    const g3 = cs[3];
    await g3.evaluate(`document.getElementById('btn-online').click()`);
    await sleep(150);
    await g3.evaluate(`(() => { const el=document.getElementById('online-code'); el.value=${JSON.stringify(code)}; el.dispatchEvent(new Event('input',{bubbles:true})); })()`);
    await g3.evaluate(`document.getElementById('online-join').click()`);
    if (!await wait(g3, `UNO_API.net.denied === true && UNO_API.net.denyReason === 'full'`, 10000)) {
      throw new Error('fourth player should be denied by capacity');
    }
    const hostLobby = await h.evaluate(`UNO_NET.lobby.length`);
    assert(hostLobby === 3, 'host lobby must stay at 3, got ' + hostLobby);
    const startDisabled = await h.evaluate(`document.getElementById('online-start').disabled`);
    assert(startDisabled === false, 'start should be enabled with 3/3');
    await cs[3].close();
    await sleep(600);
    await h.evaluate(`document.getElementById('online-start').click()`);
    for (let i = 0; i < 3; i++) {
      if (!await wait(cs[i], `UNO_API.net.started && UNO_API.state.players.length === 3`, 10000)) {
        throw new Error('3p room did not start after the extra player left');
      }
    }
    return { pass: true, detail: '4th denied, 3p started' };
  } finally {
    for (const c of cs.slice(0, 3)) { try { await c.close(); } catch (_) {} }
  }
});

const fail = R.filter((r) => !r.pass);
console.log(`UNO-RULES TOTAL ${R.length} PASS ${R.length - fail.length} FAIL ${fail.length}`);
fail.forEach((r) => console.log('FAILED ' + r.id + (r.detail ? ' :: ' + r.detail : '')));

for (const c of clients || []) await c.close();
if (fail.length) process.exitCode = 1;