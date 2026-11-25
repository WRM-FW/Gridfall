// Minimal CDP driver: launches headless Edge, exposes evaluate + mouse clicks.
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

export async function launch(url, opts = {}) {
  const port = opts.port || 9333;
  const profile = mkdtempSync(join(tmpdir(), 'gridfall-qa-'));
  const proc = spawn(EDGE, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--disable-gpu',
    '--window-size=1280,900',
    'about:blank',
  ], { stdio: 'ignore' });

  let targets = null;
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/list`);
      targets = await r.json();
      if (targets.some(t => t.type === 'page')) break;
    } catch { /* retry */ }
    await new Promise(r => setTimeout(r, 250));
  }
  if (!targets) throw new Error('no CDP targets on port ' + port);
  const page = targets.find(t => t.type === 'page');
  if (!page) throw new Error('no page target on port ' + port);

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const pending = new Map();
  const events = [];
  ws.onmessage = ev => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result);
    } else if (msg.method) {
      events.push(msg);
    }
  };
  const send = (method, params = {}) => new Promise((res, rej) => {
    const mid = ++id;
    pending.set(mid, { res, rej });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url });
  // wait for load event
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline && !events.some(e => e.method === 'Page.loadEventFired')) {
    await new Promise(r => setTimeout(r, 100));
  }
  await new Promise(r => setTimeout(r, 600)); // let scripts run

  async function evaluate(expr) {
    const r = await send('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true,
      userGesture: true,
    });
    if (r.exceptionDetails) throw new Error('JS error: ' + JSON.stringify(r.exceptionDetails));
    return r.result.value;
  }

  async function clickAt(x, y) {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  }

  await evaluate(`(() => {
    window.__qaErrors = window.__qaErrors || [];
    if (!window.__qaHooked) {
      window.__qaHooked = true;
      window.addEventListener('error', e => window.__qaErrors.push(String(e.message)));
      window.addEventListener('unhandledrejection', e => window.__qaErrors.push('rejection: ' + String(e.reason)));
    }
  })()`);

  // click center of a board cell: boardId + [r,c] + size
  async function clickCell(boardId, n, r, c) {
    const pt = await evaluate(`(() => {
      const el = document.getElementById('${boardId}');
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
      const g = boardGeom(${n});
      const rect = el.getBoundingClientRect();
      return { x: rect.left + (g.pad + ${c} * g.step) / 100 * rect.width,
               y: rect.top + (g.pad + ${r} * g.step) / 100 * rect.height };
    })()`);
    await clickAt(pt.x, pt.y);
    return pt;
  }

  async function clickSel(sel) {
    const pt = await evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(sel)});
      if (!el) return null;
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    })()`);
    if (!pt) throw new Error('no element: ' + sel);
    await clickAt(pt.x, pt.y);
    return pt;
  }

  async function screenshot(path) {
    const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const fs = await import('node:fs/promises');
    await fs.writeFile(path, Buffer.from(r.data, 'base64'));
  }

  async function close() {
    try { ws.close(); } catch {}
    proc.kill();
  }

  return { evaluate, clickAt, clickCell, clickSel, screenshot, close, send };
}