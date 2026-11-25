import fs from 'node:fs';
import { pwaHead, ensureViewportCover } from './src/pwa-head.mjs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const REPO = ROOT;
const B = path.join(ROOT, 'tools', 'src');

// 旧版单页作为引擎提取来源（随仓库提供，避免依赖工作区临时文件）
const legacyPath = path.join(B, 'legacy.html');
if (!fs.existsSync(legacyPath)) throw new Error('missing tools/src/legacy.html');
const old = fs.readFileSync(legacyPath, 'utf8').split(String.fromCharCode(13)).join('');
function between(start, end, from) {
  const i = old.indexOf(start, from || 0);
  if (i < 0) throw new Error('marker missing: ' + start);
  const j = old.indexOf(end, i + start.length);
  if (j < 0) throw new Error('end marker missing: ' + end);
  return old.slice(i, j);
}
const A = between('/* ================= 五子棋 / 连珠 引擎 ================= */', '</script>');
const Bb = between('/* ================= 五子棋 对局状态与界面 ================= */', '</script>');
const C = between('/* ================= 围棋 引擎 ================= */', '/* ================= 围棋 对局状态与界面 ================= */');
const D = between('/* ================= 围棋 对局状态与界面 ================= */', '</script>');

// ---- 开局表：按 RIF 官方图校正（[row,col]，天元为 0）----
const directNew = '[[0,2],[-1,2],[-2,2],[-1,1],[-2,1],[-1,0],[-2,0],[0,-1],[-1,-1],[-2,-1],[0,-2],[-1,-2],[-2,-2]]';
const indirectNew = '[[-2,2],[-1,2],[0,2],[1,2],[2,2],[0,1],[1,1],[2,1],[1,0],[2,0],[1,-1],[2,-1],[2,-2]]';
let b2 = Bb;
b2 = b2.replace(/var direct=\[\[.*?\]\];/, 'var direct=' + directNew + ';');
b2 = b2.replace(/var indirect=\[\[.*?\]\];/, 'var indirect=' + indirectNew + ';');
b2 = b2.split('m3:[m3[1],m3[0]]').join('m3:m3');
b2 = b2.replace('m2:[1,1]', 'm2:[-1,1]');
b2 = b2.replace('间接开局在右下斜邻', '间接开局在右上斜邻');
b2 = b2.replace('第三手（黑）为上列偏移。', '第三手（黑）偏移见下表。');

// ---- VCF：对手已有一步成五时，活四不是杀 ----
let a2 = A;
a2 = a2.replace(
  'if(pts.length>=2){ bd[p[0]][p[1]]=0; return p; } // 活四，双获胜点不可挡',
  'if(pts.length>=2){ if(immediateFive(bd,opp)){ bd[p[0]][p[1]]=0; } else { bd[p[0]][p[1]]=0; return p; } }'
);

// ---- 围棋劫点：记录被提子的实际位置 ----
let d2 = D;
d2 = d2.replace('    var before=wHash(W.board,W.size);', '    var oldBoard=W.board;\n    var before=wHash(W.board,W.size);');
const oldKo = `    // 劫点提示：恰提一子且落子点棋块只剩一气时，被提位置为禁着点（下一手）
    W.koPoint=null;
    if(res.captured===1){
      var g=wGroup(W.board,W.size,r,c);
      if(g.liberties===1){
        // 找到唯一的气（即被提子的原位置附近空点）
        var dirs=[[1,0],[-1,0],[0,1],[0,-1]];
        for(var i=0;i<4;i++){ var rr=r+dirs[i][0], cc=c+dirs[i][1];
          if(rr>=0&&cc>=0&&rr<W.size&&cc<W.size&&W.board[rr][cc]===0){ /* 该空点未必是劫点，靠 prevHash 规则兜底 */ }
        }
        W.koPoint="rule";
      }
    }`;
const newKo = `    // 劫点提示：恰提一子且落子点棋块只剩一气时，被提位置为禁着点（下一手）
    W.koPoint=null;
    if(res.captured===1){
      var g=wGroup(W.board,W.size,r,c);
      if(g.liberties===1){
        var dirs=[[1,0],[-1,0],[0,1],[0,-1]];
        for(var i=0;i<4;i++){ var rr=r+dirs[i][0], cc=c+dirs[i][1];
          if(rr>=0&&cc>=0&&rr<W.size&&cc<W.size&&oldBoard[rr][cc]===3-color&&W.board[rr][cc]===0){ W.koPoint=[rr,cc]; break; }
        }
      }
    }`;
if (!d2.includes(oldKo)) throw new Error('ko block not found');
d2 = d2.replace(oldKo, newKo);

// ---- CSS ----
const design = fs.readFileSync(path.join(ROOT, 'tools', 'design', 'board-reference.html'), 'utf8');
const designCss = design.match(/<style>([\s\S]*?)<\/style>/)[1];
const extraCss = fs.readFileSync(path.join(B, 'extra.css'), 'utf8');
const markup = fs.readFileSync(path.join(B, 'markup.html'), 'utf8');
const visual = fs.readFileSync(path.join(B, 'visual.js'), 'utf8');
const online = fs.readFileSync(path.join(B, 'online.js'), 'utf8');
const deeplink = fs.readFileSync(path.join(B, 'deeplink.js'), 'utf8');

const common = `
"use strict";
function $(id){ return document.getElementById(id); }
function pad2(n){ return (n<10?"0":"")+n; }
function fmtTime(s){ return pad2(Math.floor(s/60))+":"+pad2(s%60); }
function segWire(id, cb){
  var el=$(id); if(!el) return;
  el.addEventListener("click", function(e){
    var b=e.target.closest("button"); if(!b) return;
    el.querySelectorAll("button").forEach(function(x){x.classList.remove("active");});
    b.classList.add("active"); cb(b.dataset.v);
  });
}
function segSet(id, v){
  var el=$(id); if(!el) return;
  el.querySelectorAll("button").forEach(function(x){x.classList.toggle("active", x.dataset.v===String(v));});
}
function boardGeom(n){ var pad=5.2, step=(100-2*pad)/(n-1); return {pad:pad, step:step}; }
function posPct(i, g){ return g.pad + i*g.step; }
function gridSVG(n, stars){
  var g=boardGeom(n), s='', i, p;
  s+='<svg class="grid" viewBox="0 0 100 100" preserveAspectRatio="none">';
  for(i=0;i<n;i++){ p=posPct(i,g).toFixed(2);
    s+='<line x1="'+g.pad+'" y1="'+p+'" x2="'+(100-g.pad)+'" y2="'+p+'" stroke="#7d5f27" stroke-width="0.28"/>';
    s+='<line x1="'+p+'" y1="'+g.pad+'" x2="'+p+'" y2="'+(100-g.pad)+'" stroke="#7d5f27" stroke-width="0.28"/>';
  }
  s+='<rect x="'+g.pad+'" y="'+g.pad+'" width="'+(100-2*g.pad)+'" height="'+(100-2*g.pad)+'" fill="none" stroke="#7d5f27" stroke-width="0.55"/>';
  (stars||[]).forEach(function(st){ s+='<circle cx="'+posPct(st[1],g)+'" cy="'+posPct(st[0],g)+'" r="0.85" fill="#7d5f27"/>'; });
  s+='</svg>';
  return s;
}
function clickToCell(evt, el, n){
  var rect=el.getBoundingClientRect(), g=boardGeom(n);
  var fx=(evt.clientX-rect.left)/rect.width*100, fy=(evt.clientY-rect.top)/rect.height*100;
  var c=Math.round((fx-g.pad)/g.step), r=Math.round((fy-g.pad)/g.step);
  if(r<0||c<0||r>=n||c>=n) return null;
  var dx=Math.abs(fx-posPct(c,g)), dy=Math.abs(fy-posPct(r,g));
  if(dx>g.step*0.52||dy>g.step*0.52) return null;
  return [r,c];
}
`;

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="theme-color" content="#2e1e0d" />
<link rel="icon" href="data:," />
<title>黑白棋社 · Gridfall</title>
<link rel="canonical" href="../../board-club" />
<style>
${designCss}
${extraCss}
</style>
</head>
<body>
<div class="wrap">
${markup}
</div>
<script>${common}</script>
<script>"use strict";
${a2}</script>
<script>"use strict";
${b2}</script>
<script>"use strict";
${C}</script>
<script>"use strict";
${d2}</script>
<script>${visual}</script>
<script>${online}</script>
<script>${deeplink}</script>
</body>
</html>
`;

const output = ensureViewportCover(html).replace('</head>', pwaHead('../../', 'board-club') + '</head>');

fs.mkdirSync(path.join(REPO, 'games', 'board-club'), { recursive: true });
fs.writeFileSync(path.join(REPO, 'games', 'board-club', 'index.html'), output, 'utf8');

console.log('done: games/board-club/index.html');
