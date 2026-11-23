import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const games = [
  { ref: 'tiaoqi-reference.html', dir: 'chinese-checkers', route: '../../chinese-checkers', label: '跳棋' },
  { ref: '2048-reference.html', dir: '2048', route: '../../2048', label: '2048' },
  { ref: 'junqi-reference.html', dir: 'army-chess', route: '../../army-chess', label: '军棋' },
  { ref: 'saolei-reference.html', dir: 'minesweeper', route: '../../minesweeper', label: '扫雷' },
  { ref: 'snake-reference.html', dir: 'snake', route: '../../snake', label: '贪吃蛇' },
  { ref: 'sokoban-reference.html', dir: 'sokoban', route: '../../sokoban', label: '推箱子' },
  { ref: 'tetris-reference.html', dir: 'tetris', route: '../../tetris', label: '俄罗斯方块' }
];
const pill = `<a href="../../index.html" title="返回 Gridfall 游戏大厅" style="position:fixed;right:16px;top:16px;z-index:2147483647;display:inline-flex;align-items:center;gap:5px;padding:9px 14px;border-radius:999px;background:rgba(10,14,22,.84);color:#fff;text-decoration:none;font:600 13px/1 'Noto Sans SC','PingFang SC','Microsoft YaHei',sans-serif;border:1px solid rgba(255,255,255,.22);box-shadow:0 8px 22px rgba(0,0,0,.35);backdrop-filter:blur(8px)">← 游戏大厅</a>`;
for (const g of games) {
  let html = fs.readFileSync(path.join(ROOT, 'tools', 'design', g.ref), 'utf8');
  if (!html.includes('<title>')) throw new Error('no title in ' + g.ref);
  html = html.replace(/<title>([\s\S]*?)<\/title>/, '<title>$1</title>\n<link rel="canonical" href="' + g.route + '" />');
  html = html.replace(/<body([^>]*)>/, '<body$1>\n' + pill);
  fs.mkdirSync(path.join(ROOT, 'games', g.dir), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'games', g.dir, 'index.html'), html, 'utf8');
  console.log('built', 'games/' + g.dir + '/index.html', Buffer.byteLength(html), 'bytes');
}
