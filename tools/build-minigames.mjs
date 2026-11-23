import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const games = [
  { ref: 'tiaoqi-reference.html', dir: 'chinese-checkers', route: '../../chinese-checkers', label: '跳棋', hall: 'checkersHeader', style: 'background:var(--panel);color:var(--ink);border:1px solid var(--line);border-radius:9px;padding:7px 14px;box-shadow:0 2px 6px rgba(0,0,0,.12);' },
  { ref: '2048-reference.html', dir: '2048', route: '../../2048', label: '2048', hall: 'fixed', style: 'background:var(--card);color:var(--ink);border:1px solid var(--card-line);border-radius:10px;padding:8px 13px;box-shadow:0 3px 0 rgba(0,0,0,.18);' },
  { ref: 'junqi-reference.html', dir: 'army-chess', route: '../../army-chess', label: '军棋', hall: 'armyHero', style: 'background:var(--card);color:var(--ink);border:2px solid var(--line);border-radius:9px;padding:7px 13px;box-shadow:3px 3px 0 var(--line);font-weight:800;' },
  { ref: 'saolei-reference.html', dir: 'minesweeper', route: '../../minesweeper', label: '扫雷', hall: 'mineMain', style: 'background:var(--cell-face);color:var(--ink);border:2px solid var(--panel-edge);border-radius:6px;padding:6px 11px;box-shadow:2px 2px 0 var(--panel-edge);' },
  { ref: 'snake-reference.html', dir: 'snake', route: '../../snake', label: '贪吃蛇', hall: 'fixed', style: 'background:#63E63A;color:#0B1220;border:2px solid #000;border-radius:10px;padding:8px 12px;box-shadow:3px 3px 0 #000;font-weight:800;' },
  { ref: 'sokoban-reference.html', dir: 'sokoban', route: '../../sokoban', label: '推箱子', hall: 'fixed', style: 'background:#FFF9EA;color:#0B1220;border:2px solid #000;border-radius:10px;padding:8px 12px;box-shadow:4px 4px 0 #4A3220;font-weight:800;' },
  { ref: 'tetris-reference.html', dir: 'tetris', route: '../../tetris', label: '俄罗斯方块', hall: 'fixed', style: 'background:#FFF9EA;color:#0B1220;border:2px solid #000;border-radius:10px;padding:8px 12px;box-shadow:3px 3px 0 #000;font-weight:800;' },
  { ref: 'tic-tac-toe-reference.html', dir: 'tic-tac-toe', route: '../../tic-tac-toe', label: '井字棋', hall: 'fixed', style: 'background:#63E63A;color:#0B1220;border:2px solid #000;border-radius:10px;padding:8px 12px;box-shadow:3px 3px 0 #000;font-weight:800;' }
];

const HALL_CSS = `<style>
.gf-hall{display:inline-flex;align-items:center;gap:4px;min-height:34px;text-decoration:none;font:700 13px/1 "Noto Sans SC","PingFang SC","Microsoft YaHei",system-ui,sans-serif;white-space:nowrap;transition:transform .15s ease,filter .15s ease;box-sizing:border-box;}
.gf-hall:hover{filter:brightness(1.05);transform:translateY(-1px);}
.gf-hall:active{transform:translateY(1px);}
.gf-hall-fixed{position:fixed;right:16px;top:16px;z-index:2147483647;}
.gf-hallbar{display:flex;justify-content:flex-end;align-items:center;}
@media (max-width:560px){.gf-hall-fixed{right:8px;top:8px;padding:6px 9px;font-size:12px;min-height:30px;}}
</style>`;

function hallLink(g, extra) {
  const st = extra || g.style;
  return `<a class="gf-hall${g.hall === 'fixed' ? ' gf-hall-fixed' : ''}" href="../../index.html" title="返回 Gridfall 游戏大厅"${st ? ` style="${st}"` : ''}>← 游戏大厅</a>`;
}

for (const g of games) {
  let html = fs.readFileSync(path.join(ROOT, 'tools', 'design', g.ref), 'utf8');
  if (!html.includes('<title>')) throw new Error('no title in ' + g.ref);
  html = html.replace(/<title>([\s\S]*?)<\/title>/, '<title>$1</title>\n<link rel="canonical" href="' + g.route + '" />');
  html = html.replace('</head>', HALL_CSS + '\n</head>');

  if (g.hall === 'fixed') {
    html = html.replace(/<body([^>]*)>/, '<body$1>\n' + hallLink(g));
  } else if (g.hall === 'checkersHeader') {
    const link = hallLink(g, 'margin-left:auto;align-self:center;' + g.style);
    html = html.replace(/(<header class="top">[\s\S]*?)(<\/header>)/, '$1\n        ' + link + '\n      $2');
  } else if (g.hall === 'armyHero') {
    const bar = `<div class="gf-hallbar" style="max-width:1120px;margin:0 auto 10px;">${hallLink(g, g.style)}</div>`;
    html = html.replace('<header class="hero">', '<header class="hero">\n    ' + bar);
  } else if (g.hall === 'mineMain') {
    const bar = `<div class="gf-hallbar" style="margin:0 0 10px;">${hallLink(g, g.style)}</div>`;
    html = html.replace('<main class="wrap">', '<main class="wrap">\n      ' + bar);
  }

  fs.mkdirSync(path.join(ROOT, 'games', g.dir), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'games', g.dir, 'index.html'), html, 'utf8');
  console.log('built', 'games/' + g.dir + '/index.html', Buffer.byteLength(html), 'bytes');
}