import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'dist');

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
for (const file of ['index.html', 'play.html', 'supabase.js', 'supabase-config.js', '_redirects']) {
  fs.copyFileSync(path.join(ROOT, file), path.join(DIST, file));
}
fs.mkdirSync(path.join(DIST, 'HBQS'), { recursive: true });
fs.copyFileSync(path.join(ROOT, 'HBQS', 'index.html'), path.join(DIST, 'HBQS', 'index.html'));
console.log('dist ready:', fs.readdirSync(DIST).join(', '));
