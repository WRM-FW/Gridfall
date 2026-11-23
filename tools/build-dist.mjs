import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'dist');

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
for (const file of ['index.html', 'play.html', 'xiangqi.html', 'tiaoqi.html', 'game2048.html', 'junqi.html', 'saolei.html', 'supabase.js', 'supabase-config.js', '_redirects']) {
  fs.copyFileSync(path.join(ROOT, file), path.join(DIST, file));
}
for (const route of ['HBQS', 'ZGXQ', 'TQ', '2048', 'JQ', 'SL']) {
  fs.mkdirSync(path.join(DIST, route), { recursive: true });
  fs.copyFileSync(path.join(ROOT, route, 'index.html'), path.join(DIST, route, 'index.html'));
}
console.log('dist ready:', fs.readdirSync(DIST).join(', '));
