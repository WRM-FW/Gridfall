import { launch } from './cdp.mjs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const APP = process.env.APP_URL || pathToFileURL(path.resolve(import.meta.dirname, '..', 'games', 'uno', 'index.html')).href;
const R = [];
const PORT = 12100 + (process.pid % 30000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
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
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}
const close = (a, b) => Math.abs(a - b) < 0.75;

const b = await launch(APP, { port: PORT });
await sleep(500);
await b.evaluate(`(() => { UNO_API.clearTimers(); return true; })()`);

async function viewport(width, height, mobile) {
  await b.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
  await sleep(300);
}

async function setHand(count, turn, drawn = null) {
  await b.evaluate(`(() => {
    const S = UNO_API.state;
    const colors = ['red', 'blue', 'green', 'yellow'];
    const values = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', 'draw2'];
    const mk = (id, color, value) => ({ id, color, value });
    const hand = [
      mk(900001, 'red', '7'),
      mk(900002, 'blue', '9'),
      mk(900003, 'wild', 'wild'),
      mk(900004, 'green', '2'),
      mk(900005, 'red', 'skip'),
      mk(900006, 'yellow', '1'),
      mk(900007, 'red', '3')
    ];
    let id = 901000;
    while (hand.length < ${count}) hand.push(mk(++id, colors[id % 4], values[id % values.length]));
    S.players = [
      { id: 'p0', name: '房主（玩家A）', hand, isHuman: true, connected: true, auto: false, saidUno: false, vulnerableUno: false },
      { id: 'p1', name: '玩家B', hand: [mk(910001, 'green', '1')], isHuman: true, connected: true, auto: false, saidUno: false, vulnerableUno: false },
      { id: 'p2', name: '玩家C', hand: [mk(920001, 'yellow', '1')], isHuman: true, connected: true, auto: false, saidUno: false, vulnerableUno: false }
    ];
    S.deck = [];
    S.discard = [mk(940001, 'red', '5')];
    S.activeColor = 'red';
    S.currentTurn = ${turn};
    S.direction = 1;
    S.pendingDraw = 0;
    S.pendingDrawType = null;
    S.drawnPlayableCardId = ${drawn === null ? 'null' : drawn};
    S.awaitingWildColor = false;
    S.pendingWildCardId = null;
    S.gameOver = false;
    S.allowStacking = false;
    UNO_API.clearTimers();
    UNO_API.render();
    return true;
  })()`);
  await sleep(380);
}

async function info() {
  return b.evaluate(`(() => {
    const scroll = document.getElementById('hand-scroll');
    const row = document.getElementById('player-hand');
    const dock = document.querySelector('.player-dock');
    const sr = scroll.getBoundingClientRect();
    const rr = row.getBoundingClientRect();
    const cards = [...row.querySelectorAll('.hand-card-btn')].map((node) => {
      const r = node.getBoundingClientRect();
      const cardStyle = getComputedStyle(node.querySelector('.uno-card'));
      const tf = getComputedStyle(node).transform;
      let ty = 0;
      if (tf && tf !== 'none') {
        const m = tf.match(/matrix\\(([^)]+)\\)/);
        if (m) ty = parseFloat(m[1].split(',')[5]);
      }
      return {
        id: node.dataset.cardId,
        classes: node.className,
        playable: node.classList.contains('playable'),
        drawnFocus: node.classList.contains('drawn-focus'),
        ariaDisabled: node.getAttribute('aria-disabled'),
        x: +r.x.toFixed(2),
        y: +r.y.toFixed(2),
        w: +r.width.toFixed(2),
        h: +r.height.toFixed(2),
        ty,
        opacity: cardStyle.opacity,
        filter: cardStyle.filter
      };
    });
    return {
      viewport: { w: innerWidth, h: innerHeight },
      turn: row.dataset.turn,
      step: Number(row.dataset.step),
      count: Number(row.dataset.count),
      row: { x: +rr.x.toFixed(2), right: +rr.right.toFixed(2), width: +rr.width.toFixed(2) },
      scroll: {
        x: +sr.x.toFixed(2),
        right: +sr.right.toFixed(2),
        clientWidth: scroll.clientWidth,
        scrollWidth: scroll.scrollWidth,
        offsetHeight: scroll.offsetHeight,
        scrollHeight: scroll.scrollHeight,
        scrollLeft: scroll.scrollLeft
      },
      dockTop: +dock.getBoundingClientRect().top.toFixed(2),
      dockBottom: +dock.getBoundingClientRect().bottom.toFixed(2),
      cards
    };
  })()`);
}

function assertOpaque(data) {
  for (const card of data.cards) {
    assert(card.opacity === '1' && card.filter === 'none', 'card ' + card.id + ' is translucent/filtered: ' + card.opacity + ' / ' + card.filter);
  }
}
function assertIncreasing(data) {
  for (let i = 1; i < data.cards.length; i++) {
    assert(data.cards[i].x > data.cards[i - 1].x, 'card order broke at ' + i);
  }
}
function assertInViewportStart(data) {
  for (const card of data.cards) {
    assert(card.x >= data.scroll.x - 0.75, 'card ' + card.id + ' starts left of hand scroll');
  }
}

let desktopOwn = null;

await t('uno.hand.own-opaque-lift', async () => {
  await viewport(1280, 900, false);
  await setHand(7, 0);
  desktopOwn = await info();
  assert(desktopOwn.turn === 'own' && desktopOwn.count === 7, 'own hand should have 7 cards');
  assertOpaque(desktopOwn);
  assertIncreasing(desktopOwn);
  const playable = desktopOwn.cards.filter((c) => c.playable);
  const locked = desktopOwn.cards.filter((c) => !c.playable);
  assert(playable.length === 4, 'expected 4 playable cards, got ' + playable.length);
  assert(locked.length === 3, 'expected 3 locked cards');
  assert(playable.every((c) => c.ty < -4), 'playable cards should lift: ' + JSON.stringify(playable.map((c) => c.ty)));
  assert(locked.every((c) => close(c.ty, 0)), 'locked cards should stay level: ' + JSON.stringify(locked.map((c) => c.ty)));
  assert(playable.every((c) => c.ariaDisabled === null), 'playable cards must not be aria-disabled');
  assert(locked.every((c) => c.ariaDisabled === 'true'), 'locked cards should be aria-disabled');
  return { pass: true, detail: 'step ' + desktopOwn.step + ', 4 lifted' };
});

await t('uno.hand.other-compact-opaque', async () => {
  await setHand(7, 1);
  const data = await info();
  assert(data.turn === 'other' && data.count === 7, 'other hand should have 7 cards');
  assertOpaque(data);
  assertIncreasing(data);
  assertInViewportStart(data);
  assert(data.cards.every((c) => !c.playable && !c.drawnFocus), 'other turn must not highlight cards');
  assert(data.cards.every((c) => close(c.ty, 0)), 'other turn cards should all stay level');
  assert(data.step < desktopOwn.step - 8, 'other turn should be more compact: ' + data.step + ' vs ' + desktopOwn.step);
  assert(data.step >= 36, 'desktop cards should keep a readable strip, got ' + data.step);
  assert(data.row.right <= data.scroll.right + 0.75, '7 compact cards should fit the hand area');
  return { pass: true, detail: 'step ' + data.step + ' vs own ' + desktopOwn.step };
});

await t('uno.hand.mobile-compact-fit', async () => {
  await viewport(390, 844, true);
  await setHand(7, 0);
  const own = await info();
  await setHand(7, 1);
  const other = await info();
  assertOpaque(own);
  assertOpaque(other);
  assertInViewportStart(own);
  assertInViewportStart(other);
  assert(own.turn === 'own' && other.turn === 'other', 'turn classes missing');
  assert(own.step >= 40, 'mobile own cards need a readable strip, got ' + own.step);
  assert(other.step >= 28, 'mobile compact cards need a readable strip, got ' + other.step);
  assert(own.step >= other.step + 4, 'mobile turn states should differ: ' + own.step + ' vs ' + other.step);
  assert(own.row.right <= own.scroll.right + 0.75, '7 mobile own cards should fit without clipping');
  assert(other.row.right <= other.scroll.right + 0.75, '7 mobile compact cards should fit without clipping');
  assert(own.dockBottom <= own.viewport.h + 0.75, 'hand dock must stay inside the viewport');
  return { pass: true, detail: 'own ' + own.step + ', other ' + other.step };
});

await t('uno.hand.mobile-many-stable', async () => {
  await setHand(16, 0);
  const own = await info();
  await setHand(16, 1);
  const other = await info();
  assertOpaque(own);
  assertOpaque(other);
  assertInViewportStart(own);
  assertInViewportStart(other);
  assert(own.step >= 40, 'many-card own strip too small: ' + own.step);
  assert(other.step >= 28, 'many-card compact strip too small: ' + other.step);
  assert(close(own.dockTop, other.dockTop), 'turn switch moved the hand dock');
  assert(own.scroll.offsetHeight === other.scroll.offsetHeight, 'hand scroll height changed on turn switch');
  assert(own.scroll.scrollWidth >= own.scroll.clientWidth, '16 cards should be scrollable');
  return { pass: true, detail: 'step ' + own.step + '/' + other.step + ', dock stable' };
});

await t('uno.hand.drawn-focus-solid', async () => {
  await viewport(1280, 900, false);
  await setHand(7, 0, 900002);
  const data = await info();
  assertOpaque(data);
  const playable = data.cards.filter((c) => c.playable);
  assert(playable.length === 1 && playable[0].id === '900002', 'only the drawn card may be playable');
  assert(playable[0].drawnFocus && playable[0].ty < -4, 'drawn card should be focused and lifted');
  assert(data.cards.filter((c) => !c.playable).every((c) => close(c.ty, 0)), 'non-drawn cards should stay level');
  assert(data.cards.filter((c) => !c.playable).every((c) => c.ariaDisabled === 'true'), 'non-drawn cards should be aria-disabled');
  return { pass: true, detail: 'drawn 900002 only' };
});

await t('uno.hand.turn-transition-reuses-nodes', async () => {
  await setHand(7, 0);
  await b.evaluate(`(() => {
    window.__unoHandRefs = [...document.querySelectorAll('#player-hand .hand-card-btn')];
    UNO_API.state.currentTurn = 1;
    UNO_API.render();
    return true;
  })()`);
  await sleep(90);
  const mid = await info();
  const sameAtMid = await b.evaluate(`[...document.querySelectorAll('#player-hand .hand-card-btn')].every((n, i) => n === window.__unoHandRefs[i])`);
  await sleep(320);
  const after = await info();
  const sameAfter = await b.evaluate(`[...document.querySelectorAll('#player-hand .hand-card-btn')].every((n, i) => n === window.__unoHandRefs[i])`);
  assert(sameAtMid && sameAfter, 'turn switch rebuilt hand card nodes');
  assert(after.turn === 'other' && after.cards.every((c) => close(c.ty, 0)), 'hand did not settle flat');
  assertOpaque(mid);
  assertOpaque(after);
  assertInViewportStart(mid);
  assertInViewportStart(after);
  assertIncreasing(mid);
  assertIncreasing(after);
  assert(close(mid.dockTop, after.dockTop), 'dock moved during transition');
  assert(mid.scroll.offsetHeight === after.scroll.offsetHeight, 'hand height changed during transition');
  return { pass: true, detail: 'nodes reused, no dock/height jump' };
});

await t('uno.hand.tablet-many', async () => {
  await viewport(720, 800, false);
  await setHand(16, 0);
  const own = await info();
  await setHand(16, 1);
  const other = await info();
  assertOpaque(own);
  assertOpaque(other);
  assertInViewportStart(own);
  assertInViewportStart(other);
  assert(own.cards.length === 16 && other.cards.length === 16, 'tablet hand lost cards');
  assert(own.dockBottom <= own.viewport.h + 0.75, 'tablet hand dock overflows');
  return { pass: true, detail: '720px step ' + own.step + '/' + other.step };
});

await t('uno.hand.small-screen', async () => {
  await viewport(360, 640, true);
  await setHand(7, 0);
  const own = await info();
  await setHand(7, 1);
  const other = await info();
  assertOpaque(own);
  assertOpaque(other);
  assertInViewportStart(own);
  assertInViewportStart(other);
  assert(own.step >= 36 && other.step >= 28, 'small-screen strips too narrow: ' + own.step + '/' + other.step);
  assert(own.dockBottom <= own.viewport.h + 0.75, 'small-screen hand dock overflows');
  assert(other.dockBottom <= other.viewport.h + 0.75, 'small-screen hand dock overflows');
  return { pass: true, detail: '360px step ' + own.step + '/' + other.step };
});

const fail = R.filter((r) => !r.pass);
console.log(`UNO-HAND TOTAL ${R.length} PASS ${R.length - fail.length} FAIL ${fail.length}`);
fail.forEach((r) => console.log('FAILED ' + r.id + (r.detail ? ' :: ' + r.detail : '')));
await b.close();
if (fail.length) process.exitCode = 1;