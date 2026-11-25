import { launch } from './cdp.mjs';

const base = new URL(process.env.APP_URL || 'https://play-gridfall.pages.dev/');
if (!base.pathname.endsWith('/')) base.pathname += '/';
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
    await sleep(200);
  }
  return false;
};
function pngSize(buf) {
  if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}
const PORT = 12000 + (process.pid % 30000) + 780;
const b = await launch(base.href, { port: PORT });

try {
  await t('live.pwa.manifest', async () => {
    const res = await fetch(new URL('manifest.webmanifest', base));
    const ct = res.headers.get('content-type') || '';
    const data = await res.json();
    if (!res.ok) return 'status ' + res.status;
    if (!/manifest\+json|application\/json/.test(ct)) return 'content-type ' + ct;
    if (data.name !== 'Gridfall' || data.short_name !== 'Gridfall') return 'name';
    const start = new URL(data.start_url, new URL('manifest.webmanifest', base)).href;
    if (start !== base.href) return 'start_url ' + start + ' != ' + base.href;
    const scope = new URL(data.scope, new URL('manifest.webmanifest', base)).href;
    if (scope !== base.href) return 'scope ' + scope;
    if (data.display !== 'standalone') return 'display ' + data.display;
    return true;
  });

  await t('live.pwa.icons', async () => {
    const manifest = await (await fetch(new URL('manifest.webmanifest', base))).json();
    for (const icon of manifest.icons) {
      const url = new URL(icon.src, new URL('manifest.webmanifest', base));
      const res = await fetch(url);
      if (!res.ok) return icon.src + ' status ' + res.status;
      const dim = pngSize(Buffer.from(await res.arrayBuffer()));
      const [w, h] = icon.sizes.split('x').map(Number);
      if (!dim || dim.width !== w || dim.height !== h) return icon.src + ' ' + JSON.stringify(dim);
    }
    return true;
  });

  await t('live.pwa.sw', async () => {
    if (!await waitFor(b, `navigator.serviceWorker && navigator.serviceWorker.getRegistration().then(r => !!(r && r.active))`, 30000)) return 'worker not active';
    const r = await b.evaluate(`navigator.serviceWorker.getRegistration().then(r => ({ scope: r.scope, script: r.active ? r.active.scriptURL : '' }))`);
    if (!r.script.endsWith('/sw.js')) return 'script ' + JSON.stringify(r);
    if (!new URL(r.scope).pathname.startsWith(base.pathname)) return 'scope ' + JSON.stringify(r);
    return true;
  });

  await t('live.pwa.installability', async () => {
    const m = await b.send('Page.getAppManifest');
    const inst = await b.send('Page.getInstallabilityErrors');
    const errs = (inst && inst.installabilityErrors) || [];
    if (m && m.errors && m.errors.length) return 'manifest errors ' + JSON.stringify(m.errors);
    if (errs.length) return 'installability ' + JSON.stringify(errs);
    return true;
  });

  await t('live.pwa.game-page', async () => {
    const game = new URL('games/uno/', base).href;
    const g = await launch(game, { port: PORT + 1 });
    try {
      if (!await waitFor(g, `!!document.querySelector('link[rel="manifest"]')`, 10000)) return 'no manifest link';
      const link = await g.evaluate(`new URL(document.querySelector('link[rel="manifest"]').href).href`);
      if (link !== new URL('manifest.webmanifest', base).href) return 'link ' + link;
      if (!await waitFor(g, `navigator.serviceWorker && navigator.serviceWorker.getRegistration().then(r => !!(r && r.active))`, 30000)) return 'worker not active';
      const m = await g.send('Page.getAppManifest');
      const inst = await g.send('Page.getInstallabilityErrors');
      const errs = (inst && inst.installabilityErrors) || [];
      if (m && m.errors && m.errors.length) return 'manifest errors ' + JSON.stringify(m.errors);
      if (errs.length) return 'installability ' + JSON.stringify(errs);
      return true;
    } finally { await g.close(); }
  });

  await t('live.pwa.offline', async () => {
    await b.send('Page.reload', { ignoreCache: false });
    await sleep(1200);
    if (!await waitFor(b, `navigator.serviceWorker && navigator.serviceWorker.controller !== null`, 12000)) return 'not controlled';
    await b.send('Network.enable');
    await b.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
    try {
      await b.send('Page.reload', { ignoreCache: false });
      await sleep(2500);
      const r = await b.evaluate(`({ title: document.title, cards: document.querySelectorAll('.game-card').length })`);
      if (r.title !== 'Gridfall' || r.cards !== 12) return 'offline reload ' + JSON.stringify(r);
      return true;
    } finally {
      await b.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    }
  });
} finally {
  await b.close();
}

const fail = R.filter((r) => !r.pass);
console.log(`PWA-LIVE TOTAL ${R.length} PASS ${R.length - fail.length} FAIL ${fail.length}`);
R.forEach((r) => console.log((r.pass ? 'PASS ' : 'FAIL ') + r.id + (r.detail ? ' :: ' + r.detail : '')));
if (fail.length) process.exitCode = 1;