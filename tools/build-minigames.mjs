import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const games = [
  { ref: 'tiaoqi-reference.html', out: 'tiaoqi.html', route: './TQ', label: '跳棋' },
  { ref: '2048-reference.html', out: 'game2048.html', route: './2048', label: '2048' },
  { ref: 'junqi-reference.html', out: 'junqi.html', route: './JQ', label: '军棋' },
  { ref: 'saolei-reference.html', out: 'saolei.html', route: './SL', label: '扫雷' }
];
const pill = `<a href="./index.html" title="返回 Gridfall 游戏大厅" style="position:fixed;right:16px;top:16px;z-index:2147483647;display:inline-flex;align-items:center;gap:5px;padding:9px 14px;border-radius:999px;background:rgba(10,14,22,.84);color:#fff;text-decoration:none;font:600 13px/1 'Noto Sans SC','PingFang SC','Microsoft YaHei',sans-serif;border:1px solid rgba(255,255,255,.22);box-shadow:0 8px 22px rgba(0,0,0,.35);backdrop-filter:blur(8px)">← 游戏大厅</a>`;
for (const g of games) {
  let html = fs.readFileSync(path.join(ROOT, 'tools', 'design', g.ref), 'utf8');
  if (!html.includes('<title>')) throw new Error('no title in ' + g.ref);
  html = html.replace(/<title>([\s\S]*?)<\/title>/, '<title>$1</title>\n<link rel="canonical" href="' + g.route + '" />');
  html = html.replace(/<body([^>]*)>/, '<body$1>\n' + pill);
  fs.writeFileSync(path.join(ROOT, g.out), html, 'utf8');
  console.log('built', g.out, Buffer.byteLength(html), 'bytes');
}
