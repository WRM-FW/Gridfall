import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'dist');

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
for (const file of ['index.html', '404.html', '_redirects']) {
  fs.copyFileSync(path.join(ROOT, file), path.join(DIST, file));
}
for (const dir of ['board-club', 'chinese-chess', 'chinese-checkers', '2048', 'army-chess', 'minesweeper', 'snake', 'sokoban', 'tetris']) {
  copyDir(path.join(ROOT, 'games', dir), path.join(DIST, 'games', dir));
}
copyDir(path.join(ROOT, 'shared'), path.join(DIST, 'shared'));
copyDir(path.join(ROOT, 'assets'), path.join(DIST, 'assets'));
console.log('dist ready:', fs.readdirSync(DIST).join(', '));