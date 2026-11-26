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
const overlaps = (a, b) => a.left < b.right - 0.75 && a.right > b.left + 0.75 && a.top < b.bottom - 0.75 && a.bottom > b.top + 0.75;

const b = await launch(APP, { port: PORT });
await sleep(600);
await b.evaluate(`(() => { UNO_API.clearTimers(); return true; })()`);

async function viewport(width, height, mobile) {
  await b.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
  await sleep(300);
}

async function reset(turn = 0, drawn = null, reverse = true) {
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
      mk(900005, 'red', ${reverse ? "'reverse'" : "'3'"}),
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
  for (let i = 0; i < 16; i++) {
    if (!await b.evaluate(`document.getElementById('status-pill').classList.contains('event')`)) break;
    await sleep(200);
  }
}

async function rect(sel) {
  return b.evaluate(`(() => { const el=document.querySelector(${JSON.stringify(sel)}); if(!el) return null; const r=el.getBoundingClientRect(); return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}; })()`);
}

async function layout() {
  return b.evaluate(`(() => {
    const r = (sel) => { const el=document.querySelector(sel); if(!el) return null; const x=el.getBoundingClientRect(); return {left:x.left,top:x.top,right:x.right,bottom:x.bottom,width:x.width,height:x.height}; };
    return {
      viewport: { w: innerWidth, h: innerHeight },
      topbar:r('.topbar'), opponents:r('.opponents-top'), statusBanner:r('.status-banner'),
      status:r('#status-pill'), hand:r('.hand-scroll'), controls:r('.player-controls'), dock:r('.player-dock'),
      toastStack: !!document.querySelector('#toast-stack'),
      statusText:document.getElementById('status-text').textContent,
      event:document.getElementById('status-pill').classList.contains('event')
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

await t('uno.ui.event-status-no-overlap', async () => {
  await viewport(1280, 900, false);
  await reset(0, null);
  const before = await layout();
  assert(!before.toastStack, 'legacy toast stack still exists');
  assert(!before.event, 'status event leaked before play');
  await triggerReverse();
  await sleep(100);
  const first = await layout();
  assert(first.event, 'played-card event missing');
  assert(first.statusText.includes('打出了') && first.statusText.includes('反转'), 'unexpected first event: ' + first.statusText);
  assert(same(before.topbar.top, first.topbar.top) && same(before.opponents.bottom, first.opponents.bottom), 'top area moved');
  assert(same(before.hand.top, first.hand.top) && same(before.controls.top, first.controls.top), 'hand dock moved');
  const seat = await rect('.seat-badge');
  for (const area of [seat, first.opponents, first.hand, first.controls]) {
    assert(!overlaps(first.status, area), 'event status overlaps a player/table area');
  }
  await sleep(2000);
  const second = await layout();
  assert(second.event && second.statusText.includes('反转'), 'queued reverse event missing: ' + second.statusText);
  assert(same(before.hand.top, second.hand.top), 'hand moved while switching event');
  await sleep(2000);
  const done = await layout();
  assert(!done.event, 'event status did not clear');
  assert(same(before.hand.top, done.hand.top), 'hand moved after event cleared');
  return { pass: true, detail: 'queue: play -> reverse -> clear' };
});

await t('uno.ui.event-mobile', async () => {
  await viewport(390, 844, true);
  await reset(0, null);
  const before = await layout();
  await triggerReverse();
  await sleep(100);
  const d = await layout();
  assert(d.event && d.statusText.includes('反转'), 'mobile event missing');
  assert(d.status.top >= d.opponents.bottom - 0.75, 'event status overlaps opponents');
  assert(d.status.bottom <= d.controls.top + 0.75, 'event status overlaps controls');
  assert(d.status.bottom <= d.hand.top + 0.75, 'event status overlaps hand');
  assert(d.status.left >= 0 && d.status.right <= d.viewport?.w + 0.75, 'event status leaves viewport');
  assert(same(before.dock.top, d.dock.top), 'mobile dock moved');
  return { pass: true, detail: d.statusText };
});

await t('uno.ui.long-event-fits', async () => {
  await viewport(360, 640, true);
  await reset(0, null);
  const data = await b.evaluate(`(() => {
    const pill=document.getElementById('status-pill');
    const text=document.getElementById('status-text');
    pill.classList.add('event');
    text.textContent='房主（玩家A） 忘记喊 UNO，被罚摸 2 张';
    const p=pill.getBoundingClientRect(), t=text.getBoundingClientRect();
    const sr=document.querySelector('.status-banner').getBoundingClientRect();
    return {pill:{left:p.left,right:p.right,top:p.top,bottom:p.bottom,width:p.width,height:p.height}, text:{scrollWidth:text.scrollWidth,clientWidth:text.clientWidth,height:t.height}, banner:{height:sr.height}, view:[innerWidth,innerHeight]};
  })()`);
  assert(data.pill.left >= 0 && data.pill.right <= data.view[0] + 0.75, 'long event leaves viewport');
  assert(data.text.scrollWidth <= data.text.clientWidth + 1, 'long event is clipped');
  assert(data.pill.height >= 30, 'long event collapsed');
  assert(data.banner.height >= 30, 'status banner collapsed');
  return { pass: true, detail: data.pill.width.toFixed(1) + 'px pill' };
});

await t('uno.ui.event-landscape', async () => {
  for (const [w, h] of [[844, 390], [667, 375]]) {
    await viewport(w, h, true);
    await reset(0, null);
    await triggerReverse();
    await sleep(100);
    const d = await layout();
    assert(d.event && d.statusText.includes('反转'), 'landscape event missing at ' + w + 'x' + h);
    assert(d.status.top >= d.opponents.bottom - 0.75, 'landscape event overlaps opponents at ' + w + 'x' + h);
    assert(d.status.bottom <= d.controls.top + 0.75, 'landscape event overlaps controls at ' + w + 'x' + h);
    assert(d.status.bottom <= d.hand.top + 0.75, 'landscape event overlaps hand at ' + w + 'x' + h);
  }
  return { pass: true, detail: '844x390, 667x375' };
});

const fail = R.filter((r) => !r.pass);
console.log(`UNO-UI TOTAL ${R.length} PASS ${R.length - fail.length} FAIL ${fail.length}`);
fail.forEach((r) => console.log('FAILED ' + r.id + (r.detail ? ' :: ' + r.detail : '')));
await b.close();
if (fail.length) process.exitCode = 1;