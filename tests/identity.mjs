import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const FILES = {
  'board-club': fs.readFileSync(path.join(ROOT, 'games', 'board-club', 'index.html'), 'utf8'),
  'chinese-chess': fs.readFileSync(path.join(ROOT, 'games', 'chinese-chess', 'index.html'), 'utf8'),
  uno: fs.readFileSync(path.join(ROOT, 'games', 'uno', 'index.html'), 'utf8')
};
const R = [];
const t = async (id, fn) => {
  try {
    const d = await fn();
    if (d && typeof d === 'object' && 'pass' in d) R.push({ id, pass: !!d.pass, detail: d.detail });
    else R.push({ id, pass: d === true || d === undefined, detail: typeof d === 'string' ? d : undefined });
  } catch (e) { R.push({ id, pass: false, detail: e.message }); }
};

await t('identity.no_numeric_player_labels', async () => {
  const bad = Object.keys(FILES).filter((name) => /玩家\s*[2-4]/.test(FILES[name]));
  return bad.length ? 'numeric labels in ' + bad.join(',') : true;
});

await t('identity.host_and_second_player', async () => {
  for (const [name, html] of Object.entries(FILES)) {
    if (!html.includes('房主（玩家A）')) return name + ' missing host identity';
    if (name === 'uno') {
      // UNO builds B/C/D at runtime from this helper; the 3/4-player tests
      // assert the actual seat names.
      if (!html.includes('String.fromCharCode(65 + i)')) return name + ' missing letter helper';
    } else if (!html.includes('玩家B')) {
      return name + ' missing player B';
    }
  }
  return true;
});

await t('identity.uno_letters', async () => {
  const html = FILES.uno;
  if (!html.includes('String.fromCharCode(65 + i)')) return 'UNO seat letter helper missing';
  if (!html.includes('unoSeatName')) return 'UNO seat name helper missing';
  if (!html.includes('房主（玩家A）')) return 'UNO host label missing';
  return true;
});

await t('identity.ui_hooks', async () => {
  if (!FILES['board-club'].includes('id="nRoster"')) return 'board roster missing';
  if (!FILES['board-club'].includes('NET_HOST_LABEL')) return 'board labels missing';
  if (!FILES['chinese-chess'].includes('id="xIdentity"')) return 'xiangqi identity row missing';
  if (!FILES['chinese-chess'].includes('X_HOST_LABEL')) return 'xiangqi labels missing';
  return true;
});

const fail = R.filter((r) => !r.pass);
console.log(`IDENTITY TOTAL ${R.length} PASS ${R.length - fail.length} FAIL ${fail.length}`);
R.forEach((r) => console.log((r.pass ? 'PASS ' : 'FAIL ') + r.id + (r.detail ? ' :: ' + r.detail : '')));
if (fail.length) process.exitCode = 1;