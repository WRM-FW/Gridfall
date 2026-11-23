import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const REPO = ROOT;
const SRC = path.join(ROOT, 'tools', 'design', 'home-reference.html');
let html = fs.readFileSync(SRC, 'utf8');

function must(old, neu) {
  if (!html.includes(old)) throw new Error('homepage pattern missing: ' + old.slice(0, 80));
  html = html.split(old).join(neu);
}

/* head */
must('<title>Gridfall 游戏大厅</title>',
`<title>Gridfall 游戏大厅 · 五子棋 / 连珠 / 围棋 / 联机</title>
<meta name="description" content="Gridfall 游戏大厅：五子棋、国际连珠、围棋，单机、双人与联机开房；打开即玩，更多游戏持续上新。" />
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%230b1220'/%3E%3Crect x='5' y='5' width='10' height='10' fill='%23fff'/%3E%3Crect x='17' y='5' width='10' height='10' fill='%2363e63a'/%3E%3Crect x='5' y='17' width='10' height='10' fill='%2363e63a'/%3E%3Crect x='17' y='17' width='10' height='10' fill='%23fff'/%3E%3C/svg%3E">`);

/* nav */
must('<a href="#games">全部游戏</a>', '<a href="#games">全部游戏</a>\n      <a href="./play.html?online=1&amp;game=gomoku">联机开房</a>');
/* hero */
must('落子无悔，<br />一局入魂。', '坐下就开，<br />想玩就来。');
must('名字叫 Gridfall，装的却不只是棋盘。五子棋、连珠、围棋已经先行入驻，2048、扫雷、卡牌这些完全不同的游戏也会陆续搬进来——不用下载、不用注册，点开任意一局就开玩。',
'名字叫 Gridfall，装的却不只是棋盘。五子棋、连珠、围棋已经先行入驻，三张棋盘都能开房联机；2048、扫雷、卡牌这些完全不同的游戏也会陆续搬进来——不用下载、不用注册，点开任意一局就开玩。');
must(`<a class="btn btn-green" href="https://wrm-fw.github.io/Gridfall/" target="_blank" rel="noopener">进入棋盘对弈 →</a>
          <a class="btn btn-ghost" href="#games">先逛逛大厅</a>`,
`<a class="btn btn-green" href="./play.html">进入棋盘对弈 →</a>
          <a class="btn btn-ghost" href="./play.html?online=1&amp;game=gomoku">联机开房 →</a>
          <a class="btn btn-ghost" href="#games">先逛逛大厅</a>`);
must('棋盘对弈已就绪 · 益智与卡牌在路上 · <b>5 档难度</b>任选 · 战绩只留在这一局里',
'棋盘对弈与联机房间已就绪 · 益智与卡牌在路上 · <b>5 档难度</b>任选 · 打开即玩');
must('<div><label>对局 MODES</label><strong>人机 / 双人</strong></div>',
'<div><label>对战 MODES</label><strong>人机 / 双人 / 联机</strong></div>');
must('正式棋盘里有禁手判定、棋谱回放与计时对局；', '正式棋盘里有禁手判定、棋谱回放、联机房间与计时对局；');

/* ticker */
must('<span>五档难度 <i>●</i></span>', '<span>五档难度 <i>●</i></span><span>联机开房 <i>●</i></span><span>Supabase 实时同步 <i>●</i></span>');

/* section */
must('大厅里已经摆好的三张棋盘先开玩；下面还留着规划中的位置——益智、卡牌这些不同品类的游戏，上线后都会直接摆进这张货架。',
'五子棋、连珠、围棋三张棋盘已经摆好，而且都能开房联机；下面还留着规划中的位置——益智、卡牌这些不同品类的游戏，上线后会直接摆进这张货架。');
must('<p class="sec-sub">五子棋、连珠、围棋三张棋盘已经摆好，而且都能开房联机；下面还留着规划中的位置——益智、卡牌这些不同品类的游戏，上线后会直接摆进这张货架。</p>',
`<p class="sec-sub">五子棋、连珠、围棋三张棋盘已经摆好，而且都能开房联机；下面还留着规划中的位置——益智、卡牌这些不同品类的游戏，上线后会直接摆进这张货架。</p>
      <p class="sec-sub" style="margin-top:10px"><a class="hall-inline-link" href="./play.html?online=1&amp;game=gomoku">所有棋盘都支持联机开房 →</a></p>`);

/* live card links (first three play-links) */
const cardLinks = [
  './play.html?game=gomoku&amp;rule=free',
  './play.html?game=gomoku&amp;rule=renju&amp;opening=formal',
  './play.html?game=go'
];
let ci = 0;
html = html.replace(/<a class="play-link" href="https:\/\/wrm-fw\.github\.io\/Gridfall\/" target="_blank" rel="noopener">进入对局 →<\/a>/g, function(m){
  if (ci >= cardLinks.length) return m;
  return '<a class="play-link" href="' + cardLinks[ci++] + '">进入对局 →</a>';
});
if (ci !== 3) throw new Error('expected 3 live cards, got ' + ci);

/* tags */
must('<span>无禁手</span><span>长连算胜</span><span>人机 / 双人</span>', '<span>无禁手</span><span>长连算胜</span><span>人机 / 双人</span><span>联机房间</span>');
must('<span>禁手判定</span><span>26 种开局</span><span>棋谱回放</span><span>计时</span>', '<span>禁手判定</span><span>26 种开局</span><span>棋谱回放</span><span>计时</span><span>联机房间</span>');
must('<span>9·13·19 路</span><span>提子 / 劫争</span><span>中国规则数子</span>', '<span>9·13·19 路</span><span>提子 / 劫争</span><span>中国规则数子</span><span>联机房间</span>');

/* features: add online trio after 打开即玩 */
must('<div class="feat"><h4>打开即玩 <span class="arr">→</span></h4><p>纯网页运行，不下载、不注册。手机和电脑打开同一地址，就能落子。</p></div>',
`<div class="feat"><h4>打开即玩 <span class="arr">→</span></h4><p>纯网页运行，不下载、不注册。手机和电脑打开同一地址，就能落子。</p></div>
          <div class="feat"><h4>联机开房 <span class="arr">→</span></h4><p>创建房间、生成 6 位房间码，房主执黑先行；对手输入房间码即可加入同一局。</p></div>
          <div class="feat"><h4>实时同步 <span class="arr">→</span></h4><p>基于 Supabase Realtime 广播完整盘面；未轮到的一方不能落子，双方盘面保持一致。</p></div>
          <div class="feat"><h4>掉线重连 <span class="arr">→</span></h4><p>对手离开时房间保留，把房间码再发一次即可重连；房主离开则房间关闭。</p></div>`);

/* final CTA + footer */
must('从休闲五子棋到正式连珠，从 9 路围棋快棋到 19 路正赛——先挑一局开打；2048、扫雷和卡牌，正在赶来的路上。',
'从休闲五子棋到正式连珠，从 9 路围棋快棋到 19 路正赛，也可以开一间房等朋友进来——先挑一局开打；2048、扫雷和卡牌，正在赶来的路上。');
must('<a class="btn btn-green" href="https://wrm-fw.github.io/Gridfall/" target="_blank" rel="noopener">进入棋盘对弈 →</a>\n        <a class="btn btn-ghost" href="#games">回大厅挑游戏</a>',
'<a class="btn btn-green" href="./play.html">进入棋盘对弈 →</a>\n        <a class="btn btn-ghost" href="./play.html?online=1&amp;game=gomoku">联机开房 →</a>\n        <a class="btn btn-ghost" href="#games">回大厅挑游戏</a>');
must('<a href="https://wrm-fw.github.io/Gridfall/" target="_blank" rel="noopener">正式棋盘 ↗</a>',
'<a href="./play.html">正式棋盘 ↗</a>\n      <a href="./play.html?online=1&amp;game=gomoku">联机开房</a>');
must('<small>落子无悔，一局入魂。</small>', '<small>想玩就来，坐下就开。</small>');
must('Gridfall 首页样板：五子棋（休闲 / 连珠）与围棋已上线；2048、扫雷、卡牌类、中国象棋、国际象棋等为后续扩建规划，标注「规划中 / 构想中」者尚未开放游玩。',
'Gridfall 游戏大厅：五子棋（休闲 / 连珠）与围棋已上线，三张棋盘均支持联机开房；2048、扫雷、卡牌类、中国象棋、国际象棋等为后续扩建规划，标注「规划中」者尚未开放游玩。');

/* any leftover remote link */
html = html.split('https://wrm-fw.github.io/Gridfall/').join('./play.html');
html = html.split(' target="_blank" rel="noopener"').join('');
if (html.includes('wrm-fw.github.io')) throw new Error('remote link left');

/* styles for inline online link */
must('@media (max-width:900px){',
`.hall-inline-link{ color:var(--yellow); font-weight:900; text-decoration:none; }
  .hall-inline-link:hover{ text-decoration:underline; }
  @media (max-width:900px){`);

fs.writeFileSync(path.join(REPO, 'index.html'), html, 'utf8');
console.log('built homepage', Buffer.byteLength(html), 'bytes; cards', ci);