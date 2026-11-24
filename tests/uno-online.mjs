import { launch } from './cdp.mjs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const APP = process.env.APP_URL || pathToFileURL(path.resolve(import.meta.dirname, '..', 'games', 'uno', 'index.html')).href;
const R = [];
const t = async (id, fn) => {
  try {
    const d = await fn();
    if (d && typeof d === 'object' && 'pass' in d) R.push({ id, pass: !!d.pass, detail: d.detail });
    else R.push({ id, pass: d === true || d === undefined, detail: typeof d === 'string' ? d : undefined });
  } catch (e) { R.push({ id, pass: false, detail: e.message }); }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const wait = async (b, expr, ms = 20000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await b.evaluate(`(() => { try { return !!(${expr}); } catch(e) { return false; } })()`)) return true;
    await sleep(200);
  }
  return false;
};

async function runRoom(count) {
  const clients = [];
  const basePort = count === 3 ? 9551 : 9561;
  const details = [];
  try {
    for (let i = 0; i < count; i++) clients.push(await launch(APP, { port: basePort + i }));
    const host = clients[0];
    await host.evaluate(`document.getElementById('btn-online').click()`);
    await sleep(250);
    await host.evaluate(`document.querySelector('.online-count [data-netplayers="${count}"]').click()`);
    await host.evaluate(`document.getElementById('online-create').click()`);
    if (!await wait(host, `!!document.getElementById('online-room-code').textContent.match(/^[A-Z0-9]{6}$/)`)) return { pass: false, detail: 'room code missing' };
    const code = await host.evaluate(`document.getElementById('online-room-code').textContent`);

    for (let i = 1; i < count; i++) {
      const g = clients[i];
      await g.evaluate(`document.getElementById('btn-online').click()`);
      await sleep(150);
      await g.evaluate(`(() => { const el=document.getElementById('online-code'); el.value='${code}'; el.dispatchEvent(new Event('input',{bubbles:true})); })()`);
      await g.evaluate(`document.getElementById('online-join').click()`);
      if (!await wait(g, `!!document.querySelector('#online-players .online-player')`)) return { pass: false, detail: 'guest ' + i + ' join failed' };
    }
    if (!await wait(host, `document.querySelectorAll('#online-players .online-player').length === ${count}`)) return { pass: false, detail: 'lobby not full' };
    if (await host.evaluate(`document.getElementById('online-start').disabled`)) return { pass: false, detail: 'start disabled' };
    await host.evaluate(`document.getElementById('online-start').click()`);
    for (let i = 0; i < count; i++) {
      if (!await wait(clients[i], `window.UNO_API && UNO_API.net.started && UNO_API.state.players.length === ${count}`)) return { pass: false, detail: 'client ' + i + ' not started' };
      const info = await clients[i].evaluate(`({ own: UNO_API.state.players[0].id, my: UNO_API.net.myId, turn: UNO_API.state.currentTurn })`);
      if (info.own !== info.my) return { pass: false, detail: 'rotation ' + i + ' ' + JSON.stringify(info) };
    }

    for (let step = 0; step < count + 1; step++) {
      let who = -1;
      for (let i = 0; i < count; i++) {
        if (await clients[i].evaluate(`UNO_API.state.currentTurn === 0 && !UNO_API.state.gameOver`)) { who = i; break; }
      }
      if (who < 0) return { pass: false, detail: 'no active client at step ' + step };
      const moved = await clients[who].evaluate(`(() => {
        let btn = document.querySelector('.hand-card-btn.playable');
        if (btn) { btn.click(); return 'card'; }
        document.getElementById('draw-pile-btn').click();
        return 'draw';
      })()`);
      await sleep(500);
      if (moved === 'card' && await clients[who].evaluate(`document.getElementById('wild-modal').classList.contains('open')`)) {
        await clients[who].evaluate(`document.querySelector('.color-pick-btn[data-color="red"]').click()`);
      }
      if (moved === 'draw') {
        await sleep(400);
        if (await clients[who].evaluate(`getComputedStyle(document.getElementById('btn-pass')).display !== 'none'`)) {
          await clients[who].evaluate(`document.getElementById('btn-pass').click()`);
        }
      }
      await sleep(700);
      const maps = [];
      for (let i = 0; i < count; i++) {
        maps.push(await clients[i].evaluate(`UNO_API.state.players.map(p => [p.id, p.hand.length])`));
      }
      const sorted = maps.map(m => JSON.stringify(m.slice().sort()));
      const canon = sorted[0];
      if (sorted.some(s => s !== canon)) return { pass: false, detail: 'state mismatch step ' + step + ' ' + JSON.stringify(sorted) };
      details.push(step);
    }
    await host.evaluate(`document.getElementById('btn-restart').click()`);
    for (let i = 0; i < count; i++) {
      if (!await wait(clients[i], `!UNO_API.state.gameOver && UNO_API.state.players.every(p => p.hand.length === 7)`)) {
        return { pass: false, detail: 'rematch failed on client ' + i };
      }
    }
    return { pass: true, detail: `${count}p room ${code}, ${details.length} actions, rematch ok` };
  } finally {
    for (const b of clients) await b.close();
  }
}

await t('uno.room3', () => runRoom(3));
await t('uno.room4', () => runRoom(4));

const fail = R.filter(r => !r.pass);
console.log(`UNO TOTAL ${R.length} PASS ${R.length - fail.length} FAIL ${fail.length}`);
R.forEach(r => console.log((r.pass ? 'PASS ' : 'FAIL ') + r.id + (r.detail ? ' :: ' + r.detail : '')));