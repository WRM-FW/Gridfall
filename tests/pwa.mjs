import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { launch } from './cdp.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', 'dist');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};
const R = [];
const t = async (id, fn) => {
  try {
    const d = await fn();
    if (d && typeof d === 'object' && 'pass' in d) R.push({ id, pass: !!d.pass, detail: d.detail });
    else R.push({ id, pass: d === true || d === undefined, detail: typeof d === 'string' ? d : undefined });
  } catch (e) { R.push({ id, pass: false, detail: e.message }); }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const waitFor = async (app, expr, ms = 15000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await app.evaluate(`(() => { try { return !!(${expr}); } catch (e) { return false; } })()`)) return true;
    await sleep(150);
  }
  return false;
};

function serve(req, res) {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch (e) { res.writeHead(400); res.end('bad'); return; }
  if (pathname === '/') pathname = '/index.html';
  const clean = pathname.match(/^\/(board-club|chinese-chess|chinese-checkers|2048|army-chess|minesweeper|snake|sokoban|tetris|tic-tac-toe|jump|uno)$/);
  if (clean) pathname = '/games/' + clean[1] + '/index.html';
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = path.resolve(ROOT, '.' + pathname);
  if (!file.startsWith(ROOT)) { res.writeHead(403); res.end('forbidden'); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('not found'); return; }
    const ext = path.extname(file).toLowerCase();
    const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream' };
    if (file.endsWith('sw.js')) headers['Service-Worker-Allowed'] = '/';
    if (file.endsWith('sw.js') || file.endsWith('.webmanifest') || file.endsWith('.html')) headers['Cache-Control'] = 'no-store';
    res.writeHead(200, headers);
    res.end(data);
  });
}

function pngSize(buf) {
  if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

const PORT = 12000 + (process.pid % 30000) + 700;
const server = http.createServer(serve);
await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${PORT}/`;
const manifestUrl = new URL('manifest.webmanifest', base).href;
const b = await launch(base, { port: PORT + 20 });

try {
  await t('pwa.manifest.response', async () => {
    const res = await fetch(manifestUrl);
    const ct = res.headers.get('content-type') || '';
    const data = await res.json();
    if (!res.ok) return 'status ' + res.status;
    if (!/manifest\+json|application\/json/.test(ct)) return 'content-type ' + ct;
    if (data.name !== 'Gridfall' || data.short_name !== 'Gridfall') return 'name ' + JSON.stringify(data);
    if (data.display !== 'standalone' || data.start_url !== './' || data.scope !== './') return 'display/start/scope ' + JSON.stringify(data);
    if (!data.icons || data.icons.length < 4) return 'icons ' + JSON.stringify(data.icons);
    return true;
  });

  await t('pwa.icons', async () => {
    for (const [file, size] of [
      ['assets/icons/icon-192.png', 192],
      ['assets/icons/icon-512.png', 512],
      ['assets/icons/icon-maskable-192.png', 192],
      ['assets/icons/icon-maskable-512.png', 512],
      ['assets/icons/apple-touch-icon.png', 180]
    ]) {
      const res = await fetch(new URL(file, base));
      if (!res.ok) return file + ' status ' + res.status;
      const buf = Buffer.from(await res.arrayBuffer());
      const dim = pngSize(buf);
      if (!dim || dim.width !== size || dim.height !== size) return file + ' ' + JSON.stringify(dim);
    }
    return true;
  });

  await t('pwa.head', async () => {
    const r = await b.evaluate(`(() => {
      const manifest = document.querySelector('link[rel="manifest"]');
      const apple = document.querySelector('link[rel="apple-touch-icon"]');
      const theme = document.querySelector('meta[name="theme-color"]');
      return {
        manifest: manifest ? new URL(manifest.href).pathname : '',
        apple: apple ? apple.getAttribute('href') : '',
        theme: theme ? theme.getAttribute('content') : '',
        title: document.title
      };
    })()`);
    if (r.manifest !== '/manifest.webmanifest') return 'manifest link ' + JSON.stringify(r);
    if (!r.apple.includes('apple-touch-icon.png') || !r.theme) return 'meta ' + JSON.stringify(r);
    if (r.title !== 'Gridfall') return 'title ' + r.title;
    return true;
  });

  await t('pwa.service-worker', async () => {
    const ready = await waitFor(b, `navigator.serviceWorker && navigator.serviceWorker.getRegistration().then(r => !!(r && r.active))`, 15000);
    if (!ready) return 'worker not active';
    const r = await b.evaluate(`navigator.serviceWorker.getRegistration().then(r => ({ scope: r.scope, active: r.active ? r.active.scriptURL : '' }))`);
    if (!r.active.endsWith('/sw.js')) return 'script ' + JSON.stringify(r);
    if (!r.scope.endsWith('/')) return 'scope ' + JSON.stringify(r);
    return true;
  });

  await t('pwa.installability', async () => {
    const m = await b.send('Page.getAppManifest');
    const inst = await b.send('Page.getInstallabilityErrors');
    const errs = (inst && inst.installabilityErrors) || [];
    if (m && m.errors && m.errors.length) return 'manifest errors ' + JSON.stringify(m.errors);
    if (errs.length) return 'installability ' + JSON.stringify(errs);
    return true;
  });

  await t('pwa.game-page-links', async () => {
    for (const game of ['board-club', 'chinese-chess', 'uno', '2048']) {
      const html = fs.readFileSync(path.join(ROOT, 'games', game, 'index.html'), 'utf8');
      if (!html.includes('href="../../manifest.webmanifest"')) return game + ' manifest link';
      if (!html.includes('src="../../pwa.js"')) return game + ' pwa.js';
    }
    const res = await fetch(new URL('board-club', base));
    if (!res.ok) return 'clean route status ' + res.status;
    if (!(await res.text()).includes('../../manifest.webmanifest')) return 'clean route content';
    return true;
  });

  await t('pwa.offline-shell', async () => {
    await b.send('Page.reload', { ignoreCache: false });
    await sleep(1200);
    if (!await waitFor(b, `navigator.serviceWorker && navigator.serviceWorker.controller !== null`, 8000)) return 'page is not controlled';
    await b.send('Network.enable');
    await b.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
    try {
      await b.send('Page.reload', { ignoreCache: false });
      await sleep(1800);
      const r = await b.evaluate(`({ title: document.title, cards: document.querySelectorAll('.game-card').length })`);
      if (r.title !== 'Gridfall' || r.cards !== 12) return 'offline reload ' + JSON.stringify(r);
      return true;
    } finally {
      await b.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    }
  });
} finally {
  await b.close();
  await new Promise((resolve) => server.close(resolve));
}

const fail = R.filter((r) => !r.pass);
console.log(`PWA TOTAL ${R.length} PASS ${R.length - fail.length} FAIL ${fail.length}`);
R.forEach((r) => console.log((r.pass ? 'PASS ' : 'FAIL ') + r.id + (r.detail ? ' :: ' + r.detail : '')));
if (fail.length) process.exitCode = 1;