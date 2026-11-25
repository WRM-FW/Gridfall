import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const GAMES = ['2048', 'army-chess', 'board-club', 'chinese-checkers', 'chinese-chess', 'jump', 'minesweeper', 'snake', 'sokoban', 'tetris', 'tic-tac-toe', 'uno'];
const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.webmanifest'), 'utf8'));
const pages = { index, '404': fs.readFileSync(path.join(ROOT, '404.html'), 'utf8') };
for (const g of GAMES) pages[g] = fs.readFileSync(path.join(ROOT, 'games', g, 'index.html'), 'utf8');
const R = [];
const t = async (id, fn) => {
  try {
    const d = await fn();
    if (d && typeof d === 'object' && 'pass' in d) R.push({ id, pass: !!d.pass, detail: d.detail });
    else R.push({ id, pass: d === true || d === undefined, detail: typeof d === 'string' ? d : undefined });
  } catch (e) { R.push({ id, pass: false, detail: e.message }); }
};

await t('naming.no-game-hall', async () => {
  const bad = Object.keys(pages).filter((name) => pages[name].includes('游戏大厅') || pages[name].includes('游 戏 大 厅'));
  if (bad.length) return 'game hall wording in ' + bad.join(',');
  if (manifest.name.includes('游戏大厅') || manifest.description.includes('游戏大厅')) return 'manifest still says 游戏大厅';
  return true;
});

await t('naming.app-name', async () => {
  if (manifest.name !== 'Gridfall' || manifest.short_name !== 'Gridfall') return 'manifest name ' + JSON.stringify([manifest.name, manifest.short_name]);
  if (!/<title>Gridfall<\/title>/.test(index)) return 'home title';
  if (!/name="application-name" content="Gridfall"/.test(index)) return 'application-name';
  if (!/name="apple-mobile-web-app-title" content="Gridfall"/.test(index)) return 'apple title';
  for (const g of GAMES) {
    const m = pages[g].match(/<title>([^<]+)<\/title>/);
    if (!m) return g + ' title missing';
    if (!/^.+ · Gridfall$/.test(m[1])) return g + ' title ' + m[1];
  }
  return true;
});

await t('naming.footer-structure', async () => {
  const f = index.match(/<footer>([\s\S]*?)<\/footer>/);
  if (!f) return 'footer missing';
  const body = f[1];
  if (!body.includes('<div class="fbrand">Gridfall</div>')) return 'brand';
  if (!body.includes('去其他站点游玩')) return 'external heading';
  if (!body.includes('https://poki.com/') || !body.includes('https://www.4399.com/')) return 'external links';
  if (!body.includes('rel="noopener noreferrer"')) return 'external rel';
  if (body.includes('项目说明') || body.includes('class="fcats"') || body.includes('class="fabout"')) return 'project section remains';
  if (body.includes('class="fnote"')) return 'old dense note';
  if (!body.includes('联机对局')) return 'online nav';
  return true;
});

await t('naming.no-hall-controls', async () => {
  for (const g of GAMES) {
    if (!pages[g].includes('title="返回 Gridfall 首页"')) return g + ' has no return-home label';
    if (pages[g].includes('返回 Gridfall 游戏大厅')) return g + ' old return label';
  }
  return true;
});

const fail = R.filter((r) => !r.pass);
console.log(`NAMING TOTAL ${R.length} PASS ${R.length - fail.length} FAIL ${fail.length}`);
R.forEach((r) => console.log((r.pass ? 'PASS ' : 'FAIL ') + r.id + (r.detail ? ' :: ' + r.detail : '')));
if (fail.length) process.exitCode = 1;