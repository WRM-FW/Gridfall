import { launch } from './cdp.mjs';

const APP = process.env.APP_URL || 'https://play-gridfall.pages.dev/uno';
const PORT = 12000 + (process.pid % 30000) + 820;
const R = [];
const t = async (id, fn) => {
  try {
    const d = await fn();
    if (d && typeof d === 'object' && 'pass' in d) R.push({ id, pass: !!d.pass, detail: d.detail });
    else R.push({ id, pass: d === true || d === undefined, detail: typeof d === 'string' ? d : undefined });
  } catch (e) { R.push({ id, pass: false, detail: e.message }); }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const waitFor = async (app, expr, ms = 20000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await app.evaluate(`(() => { try { return !!(${expr}); } catch (e) { return false; } })()`)) return true;
    await sleep(180);
  }
  return false;
};
const clients = [];
for (let i = 0; i < 3; i++) clients.push(await launch(APP, { port: PORT + i }));

try {
  const host = clients[0];
  await host.evaluate(`document.getElementById('btn-online').click()`);
  await sleep(250);
  await host.evaluate(`document.querySelector('.online-count [data-netplayers="3"]').click()`);
  await host.evaluate(`document.getElementById('online-create').click()`);
  if (!await waitFor(host, `!!document.getElementById('online-room-code').textContent.match(/^[A-Z0-9]{6}$/)`)) throw new Error('room code missing');
  const code = await host.evaluate(`document.getElementById('online-room-code').textContent`);

  for (let i = 1; i < 3; i++) {
    const g = clients[i];
    await g.evaluate(`document.getElementById('btn-online').click()`);
    await sleep(150);
    await g.evaluate(`(() => { const el=document.getElementById('online-code'); el.value=${JSON.stringify(code)}; el.dispatchEvent(new Event('input',{bubbles:true})); })()`);
    await g.evaluate(`document.getElementById('online-join').click()`);
    if (!await waitFor(g, `!!document.querySelector('#online-players .online-player')`)) throw new Error('guest ' + i + ' join failed');
  }
  if (!await waitFor(host, `UNO_NET.lobby.length === 3`)) throw new Error('lobby not full');

  await t('live.identity.lobby_rows', async () => {
    const rows = await host.evaluate(`[...document.querySelectorAll('#online-players .online-player span')].map((x) => x.textContent.trim())`);
    const want = ['房主（玩家A）', '玩家B', '玩家C'];
    if (JSON.stringify(rows) !== JSON.stringify(want)) return 'rows ' + JSON.stringify(rows);
    return true;
  });

  await host.evaluate(`document.getElementById('online-start').click()`);
  for (const c of clients) {
    if (!await waitFor(c, `UNO_API.net.started && UNO_API.state.players.length === 3`)) throw new Error('start failed');
  }

  await t('live.identity.seats', async () => {
    const names = await host.evaluate(`UNO_API.state.players.map((p) => p.name)`);
    const seats = await host.evaluate(`[...document.querySelectorAll('#opponents-top .seat-name')].map((x) => x.textContent.trim())`);
    const own = [];
    for (const c of clients) own.push(await c.evaluate(`UNO_API.state.players[0].name`));
    const want = ['房主（玩家A）', '玩家B', '玩家C'];
    if (JSON.stringify(names) !== JSON.stringify(want)) return 'names ' + JSON.stringify(names);
    if (JSON.stringify(seats) !== JSON.stringify(['玩家B', '玩家C'])) return 'seats ' + JSON.stringify(seats);
    if (JSON.stringify(own) !== JSON.stringify(want)) return 'own ' + JSON.stringify(own);
    return true;
  });

  await t('live.identity.no_numeric', async () => {
    const all = await host.evaluate(`JSON.stringify(UNO_API.state.players.map((p) => p.name)) + document.body.innerText`);
    return /玩家\s*[2-4]/.test(all) ? 'numeric label found' : true;
  });
} finally {
  for (const c of clients) { try { await c.close(); } catch (e) {} }
}

const fail = R.filter((r) => !r.pass);
console.log(`IDENTITY-LIVE TOTAL ${R.length} PASS ${R.length - fail.length} FAIL ${fail.length}`);
R.forEach((r) => console.log((r.pass ? 'PASS ' : 'FAIL ') + r.id + (r.detail ? ' :: ' + r.detail : '')));
if (fail.length) process.exitCode = 1;