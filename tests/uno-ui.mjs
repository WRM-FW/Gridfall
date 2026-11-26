import { launch } from './cdp.mjs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const APP = process.env.APP_URL || pathToFileURL(path.resolve(import.meta.dirname, '..', 'games', 'uno', 'index.html')).href;
const R = [];
const PORT = 12200 + (process.pid % 30000);
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
const same = (a, b) => Math.abs(a - b) < 0.75;
const overlaps = (a, b) => a && b && a.left < b.right - 0.75 && a.right > b.left + 0.75 && a.top < b.bottom - 0.75 && a.bottom > b.top + 0.75;

const b = await launch(APP, { port: PORT });
await sleep(600);
await b.evaluate(`(() => { UNO_API.clearTimers(); return true; })()`);

async function viewport(width, height, mobile) {
  await b.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
  await sleep(300);
}

async function reset(turn = 0, drawn = null) {
  await b.evaluate(`(() => {
    UNO_API.startGame(3);
    UNO_API.clearTimers();
    const S = UNO_API.state;
    const mk = (id, color, value) => ({ id, color, value });
    const hand = [
      mk(900001, 'red', '7'),
      mk(900002, 'blue', '9'),
      mk(900003, 'wild', 'wild'),
      mk(900004, 'green', '2'),
      mk(900005, 'red', 'reverse'),
      mk(900006, 'yellow', '1'),
      mk(900007, 'red', '3')
    ];
    S.players[0].hand = hand;
    S.players[0].isHuman = true;
    S.players[0].connected = true;
    S.players[1].hand = [mk(910001, 'green', '1')];
    S.players[2].hand = [mk(920001, 'yellow', '1')];
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
    S.lang = 'zh';
    UNO_API.clearTimers();
    UNO_API.render();
    return true;
  })()`);
  await sleep(380);
}

async function layout() {
  return b.evaluate(`(() => {
    const r = (sel) => { const el=document.querySelector(sel); if(!el) return null; const x=el.getBoundingClientRect(); return {left:x.left,top:x.top,right:x.right,bottom:x.bottom,width:x.width,height:x.height}; };
    const log=document.getElementById('game-log');
    const items=[...document.querySelectorAll('#game-log-list .game-log-text')].map((x)=>x.textContent);
    return {
      viewport:{w:innerWidth,h:innerHeight},
      topbar:r('.topbar'), opponents:r('.opponents-top'), center:r('.center-stage'), ring:r('.direction-ring'),
      seats:[...document.querySelectorAll('.seat-badge')].map((el)=>{const x=el.getBoundingClientRect();return {left:x.left,top:x.top,right:x.right,bottom:x.bottom};}),
      status:r('#status-pill'), statusText:document.getElementById('status-text').textContent,
      log:r('#game-log'), logHidden:log.classList.contains('hidden'), logLandscape:log.classList.contains('landscape'),
      logItems:items, logText:items.join(' | '), logScroll:{scrollHeight:document.getElementById('game-log-list').scrollHeight,clientHeight:document.getElementById('game-log-list').clientHeight,scrollWidth:document.getElementById('game-log-list').scrollWidth,clientWidth:document.getElementById('game-log-list').clientWidth},
      hand:r('.hand-scroll'), controls:r('.player-controls'), dock:r('.player-dock'),
      toastStack:!!document.querySelector('#toast-stack')
    };
  })()`);
}

async function buttonInfo(selector) {
  return b.evaluate(`(() => {
    const btn=document.querySelector(${JSON.stringify(selector)});
    const br=btn.getBoundingClientRect();
    const range=document.createRange(); range.selectNodeContents(btn);
    const tr=range.getBoundingClientRect();
    const cs=getComputedStyle(btn);
    return {
      display:cs.display, alignItems:cs.alignItems, justify:cs.justifyContent,
      box:{left:br.left,top:br.top,right:br.right,bottom:br.bottom,width:br.width,height:br.height},
      text:{left:tr.left,top:tr.top,right:tr.right,bottom:tr.bottom,width:tr.width,height:tr.height},
      lineHeight:cs.lineHeight, fontSize:cs.fontSize
    };
  })()`);
}

async function triggerReverse() {
  await b.evaluate(`document.querySelector('#player-hand .hand-card-btn[data-card-id="900005"]').click()`);
  await b.evaluate(`UNO_API.clearTimers()`);
  await sleep(100);
}

function assertLogClearOfPlayers(data) {
  const areas = [data.opponents, data.ring, data.hand, data.controls, ...data.seats];
  for (const area of areas) {
    assert(!overlaps(data.log, area), 'game log overlaps a player/table area');
  }
}

await t('uno.ui.pass-button-centered', async () => {
  const results = [];
  for (const [w, h, mobile] of [[1280, 900, false], [390, 844, true], [360, 640, true], [844, 390, true]]) {
    await viewport(w, h, mobile);
    await reset(0, 900002);
    const d = await buttonInfo('#btn-pass');
    assert(d.display !== 'none' && d.box.width > 0 && d.box.height > 0, 'pass button hidden at ' + w + 'x' + h);
    assert(d.alignItems === 'center' && d.justify === 'center', 'pass button is not centered at ' + w + 'x' + h + ': ' + d.alignItems + '/' + d.justify);
    const bx = (d.box.left + d.box.right) / 2;
    const by = (d.box.top + d.box.bottom) / 2;
    const tx = (d.text.left + d.text.right) / 2;
    const ty = (d.text.top + d.text.bottom) / 2;
    assert(Math.abs(bx - tx) < 1.5, 'pass text is not horizontally centered at ' + w + 'x' + h + ': ' + (bx - tx));
    assert(Math.abs(by - ty) < 1.5, 'pass text is not vertically centered at ' + w + 'x' + h + ': ' + (by - ty));
    results.push(w + 'x' + h);
  }
  return { pass: true, detail: results.join(', ') };
});

await t('uno.ui.log-immediate-and-separate', async () => {
  await viewport(1280, 900, false);
  await reset(0, null);
  const before = await layout();
  assert(!before.toastStack, 'legacy toast stack still exists');
  assert(!before.logHidden && before.log, 'event log is not visible');
  await triggerReverse();
  const after = await layout();
  assert(after.logItems.some((x) => x.includes('打出了') && x.includes('反转')), 'played event missing from log');
  assert(after.logItems.some((x) => x.includes('出牌方向已反转')), 'reverse event missing from log');
  assert(!after.statusText.includes('打出了'), 'event text leaked back into the turn status');
  assert(after.statusText.length > 0, 'turn status disappeared');
  assert(same(before.log.top, after.log.top) && same(before.log.height, after.log.height), 'log panel jumped after events');
  assert(same(before.hand.top, after.hand.top) && same(before.controls.top, after.controls.top), 'hand dock moved after events');
  assertLogClearOfPlayers(after);
  return { pass: true, detail: after.logItems.slice(-2).join(' / ') };
});

await t('uno.ui.log-mobile', async () => {
  await viewport(390, 844, true);
  await reset(0, null);
  const before = await layout();
  await triggerReverse();
  const after = await layout();
  assert(!after.logHidden && after.log, 'mobile event log is not visible');
  assert(after.logItems.some((x) => x.includes('反转')), 'mobile event log missing event');
  assert(after.log.top >= after.opponents.bottom, 'mobile log overlaps opponents');
  assert(after.log.bottom <= after.controls.top, 'mobile log overlaps controls');
  assert(after.log.bottom <= after.hand.top, 'mobile log overlaps hand');
  assertLogClearOfPlayers(after);
  assert(same(before.dock.top, after.dock.top), 'mobile dock moved');
  return { pass: true, detail: after.logItems.slice(-1)[0] };
});

await t('uno.ui.log-long-text', async () => {
  await viewport(360, 640, true);
  await reset(0, null);
  const long = '房主（玩家A） 忘记喊 UNO，被罚摸 2 张，当前手牌仍然很多，请继续出牌';
  const data = await b.evaluate(`(() => {
    const S=UNO_API.state;
    S.eventSeq += 1;
    S.events.push({id:S.eventSeq,text:${JSON.stringify(long)}});
    UNO_API.render();
    return true;
  })()`);
  await sleep(100);
  const after = await layout();
  assert(data && after.logItems.includes(long), 'long log event missing');
  assert(after.log.left >= 0 && after.log.right <= after.viewport.w + 0.75, 'long log leaves viewport');
  assert(after.logScroll.scrollWidth <= after.logScroll.clientWidth + 1, 'long log has horizontal overflow');
  assert(after.logScroll.scrollHeight >= after.logScroll.clientHeight, 'log list has invalid height');
  assertLogClearOfPlayers(after);
  return { pass: true, detail: long.slice(0, 18) + '…' };
});

await t('uno.ui.log-laptop', async () => {
  for (const [w, h] of [[1280, 720], [1024, 768]]) {
    await viewport(w, h, false);
    await reset(0, null);
    await triggerReverse();
    const d = await layout();
    assert(!d.logHidden && d.log, 'laptop log is not visible at ' + w + 'x' + h);
    assert(d.log.top >= d.center.bottom - 0.75, 'laptop log overlaps table at ' + w + 'x' + h);
    assert(d.log.bottom <= d.controls.top + 0.75, 'laptop log overlaps controls at ' + w + 'x' + h);
    assert(!overlaps(d.log, d.ring), 'laptop log overlaps table ring at ' + w + 'x' + h);
    assertLogClearOfPlayers(d);
  }
  return { pass: true, detail: '1280x720, 1024x768' };
});

await t('uno.ui.log-landscape', async () => {
  for (const [w, h] of [[844, 390], [667, 375], [640, 360]]) {
    await viewport(w, h, true);
    await reset(0, null);
    await triggerReverse();
    const d = await layout();
    assert(!d.logHidden && d.logLandscape, 'landscape log is not visible at ' + w + 'x' + h);
    assert(!overlaps(d.log, d.opponents), 'landscape log overlaps opponents at ' + w + 'x' + h);
    assert(!overlaps(d.log, d.ring), 'landscape log overlaps table at ' + w + 'x' + h);
    assert(!overlaps(d.log, d.controls), 'landscape log overlaps controls at ' + w + 'x' + h);
    assert(!overlaps(d.log, d.hand), 'landscape log overlaps hand at ' + w + 'x' + h);
    for (const seat of d.seats) assert(!overlaps(d.log, seat), 'landscape log overlaps a seat at ' + w + 'x' + h);
    assert(d.log.top >= d.opponents.bottom, 'landscape log starts above opponent row at ' + w + 'x' + h);
    assert(d.logItems.some((x) => x.includes('反转')), 'landscape log missing event at ' + w + 'x' + h);
  }
  return { pass: true, detail: '844x390, 667x375, 640x360' };
});

const fail = R.filter((r) => !r.pass);
console.log(`UNO-UI TOTAL ${R.length} PASS ${R.length - fail.length} FAIL ${fail.length}`);
fail.forEach((r) => console.log('FAILED ' + r.id + (r.detail ? ' :: ' + r.detail : '')));
await b.close();
if (fail.length) process.exitCode = 1;