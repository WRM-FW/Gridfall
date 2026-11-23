import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'tools', 'design', 'home-reference.html');
let html = fs.readFileSync(SRC, 'utf8');

function must(old, neu) {
  if (!html.includes(old)) throw new Error('homepage pattern missing: ' + old.slice(0, 90));
  html = html.split(old).join(neu);
}

/* ---------- head ---------- */
must('<title>Gridfall 游戏大厅</title>',
`<title>Gridfall 游戏大厅 · 黑白棋社</title>
<meta name="description" content="Gridfall 游戏大厅：黑白棋社收录五子棋、国际连珠、围棋，支持单机、双人与联机开房；打开即玩，更多游戏持续上新。" />
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%230b1220'/%3E%3Crect x='5' y='5' width='10' height='10' fill='%23fff'/%3E%3Crect x='17' y='5' width='10' height='10' fill='%2363e63a'/%3E%3Crect x='5' y='17' width='10' height='10' fill='%2363e63a'/%3E%3Crect x='17' y='17' width='10' height='10' fill='%23fff'/%3E%3C/svg%3E">`);

/* ---------- nav ---------- */
must(`      <a href="#games">全部游戏</a>
      <a href="#games" data-jump="五子棋">五子棋</a>
      <a href="#games" data-jump="围棋">围棋</a>
      <a href="#games" data-jump="2048">2048</a>
      <a href="#games" data-jump="扫雷">扫雷</a>
      <a href="#features">玩法一览</a>
      <a href="#soon">即将推出</a>`,
`      <a href="#games">全部游戏</a>
      <a href="./HBQS" data-local="./play.html">黑白棋社</a>
      <a href="./HBQS?online=1&amp;game=gomoku" data-local="./play.html?online=1&amp;game=gomoku">联机开房</a>
      <a href="#games" data-jump="2048">2048</a>
      <a href="#games" data-jump="扫雷">扫雷</a>
      <a href="#features">玩法一览</a>
      <a href="#soon">即将推出</a>`);
must('    <a class="btn btn-green btn-sm nav-cta" href="https://wrm-fw.github.io/Gridfall/" target="_blank" rel="noopener">开始对弈 →</a>',
'    <a class="btn btn-green btn-sm nav-cta" href="./HBQS" data-local="./play.html">进入棋社 →</a>');

/* ---------- hero ---------- */
must('落子无悔，<br />一局入魂。', '坐下就开，<br />想玩就来。');
must('名字叫 Gridfall，装的却不只是棋盘。五子棋、连珠、围棋已经先行入驻，2048、扫雷、卡牌这些完全不同的游戏也会陆续搬进来——不用下载、不用注册，点开任意一局就开玩。',
'名字叫 Gridfall，装的却不只是棋盘。五子棋、连珠、围棋已经合并为「黑白棋社」一个入口，三张棋盘都能开房联机；2048、扫雷、卡牌这些完全不同的游戏也会陆续搬进来——不用下载、不用注册，点开任意一局就开玩。');
must(`          <a class="btn btn-green" href="https://wrm-fw.github.io/Gridfall/" target="_blank" rel="noopener">进入棋盘对弈 →</a>
          <a class="btn btn-ghost" href="#games">先逛逛大厅</a>`,
`          <a class="btn btn-green" href="./HBQS" data-local="./play.html">进入黑白棋社 →</a>
          <a class="btn btn-ghost" href="./HBQS?online=1&amp;game=gomoku" data-local="./play.html?online=1&amp;game=gomoku">联机开房 →</a>
          <a class="btn btn-ghost" href="#games">先逛逛大厅</a>`);
must('棋盘对弈已就绪 · 益智与卡牌在路上 · <b>5 档难度</b>任选 · 战绩只留在这一局里',
'黑白棋社已就绪 · 联机房间已开放 · 益智与卡牌在路上 · <b>5 档难度</b>任选 · 打开即玩');
must('<div><label>对局 MODES</label><strong>人机 / 双人</strong></div>',
'<div><label>对战 MODES</label><strong>单机 / 双人 / 联机</strong></div>');
must('正式棋盘里有禁手判定、棋谱回放与计时对局；', '黑白棋社里有禁手判定、棋谱回放、联机房间与计时对局；');

/* ---------- ticker ---------- */
must('<span>五档难度 <i>●</i></span>', '<span>五档难度 <i>●</i></span><span>黑白棋社 <i>●</i></span><span>联机开房 <i>●</i></span><span>Supabase 实时同步 <i>●</i></span>');

/* ---------- section ---------- */
must('大厅里已经摆好的三张棋盘先开玩；下面还留着规划中的位置——益智、卡牌这些不同品类的游戏，上线后都会直接摆进这张货架。',
'「黑白棋社」把五子棋、连珠、围棋三张棋盘收进同一个入口，而且都能开房联机；下面还留着规划中的位置——益智、卡牌这些不同品类的游戏，上线后会直接摆进这张货架。');
must(`<p class="sec-sub">「黑白棋社」把五子棋、连珠、围棋三张棋盘收进同一个入口，而且都能开房联机；下面还留着规划中的位置——益智、卡牌这些不同品类的游戏，上线后会直接摆进这张货架。</p>`,
`<p class="sec-sub">「黑白棋社」把五子棋、连珠、围棋三张棋盘收进同一个入口，而且都能开房联机；下面还留着规划中的位置——益智、卡牌这些不同品类的游戏，上线后会直接摆进这张货架。</p>
      <p class="sec-sub" style="margin-top:10px"><a class="hall-inline-link" href="./HBQS?online=1&amp;game=gomoku" data-local="./play.html?online=1&amp;game=gomoku">黑白棋社 · 联机开房 →</a></p>`);

/* ---------- live cards -> one club card ---------- */
const liveStart = html.indexOf('        <!-- 五子棋 · 休闲 -->');
const liveEnd = html.indexOf('        <!-- 即将推出（样板占位，明确标注） -->');
if (liveStart < 0 || liveEnd < 0 || liveEnd < liveStart) throw new Error('live card block not found');
const clubCard = `        <article class="game-card game-card-club" data-status="live" data-name="黑白棋社 五子棋 连珠 围棋 联机 gomoku renju go">
          <div class="game-visual gv-club">
            <span class="gv-badge">已上线</span>
            <div class="gv-board light" aria-hidden="true">
              <span class="stone b" style="left:10%;top:10%"></span>
              <span class="stone w" style="left:35%;top:35%"></span>
              <span class="stone b" style="left:60%;top:10%"></span>
              <span class="stone w" style="left:85%;top:60%"></span>
              <span class="stone b win" style="left:35%;top:60%"></span>
            </div>
          </div>
          <div class="game-body">
            <h3>黑白棋社<span class="en">BOARD CLUB</span></h3>
            <p>五子棋（含国际连珠的禁手与 26 种正式开局）、围棋（9/13/19 路）收在同一个入口；单机、双人、联机开房都在里面。</p>
            <div class="tags"><span>五子棋 / 连珠</span><span>围棋</span><span>单机 / 双人</span><span>联机开房</span></div>
            <div class="game-foot">
              <span class="meta">入口 /HBQS · 三合一 · 5 档难度</span>
              <a class="play-link" href="./HBQS" data-local="./play.html">进入棋社 →</a>
            </div>
          </div>
        </article>

`;
html = html.slice(0, liveStart) + clubCard + html.slice(liveEnd);

/* ---------- two extra planned cards ---------- */
const moreCard = '<article class="game-card" data-status="soon" data-name="更多游戏 新游戏 点单">';
must(moreCard, `        <article class="game-card" data-status="soon" data-name="跳棋 棋类 tiaoqi checkers">
          <div class="game-visual gv-soon">
            <span class="gv-badge soon">规划中</span>
            <span class="gv-q" aria-hidden="true">跳</span>
          </div>
          <div class="game-body">
            <h3>跳棋<span class="en">CHECKERS</span></h3>
            <p>隔着棋子连跳的经典棋类，已在扩建名单里排队；大厅后续会按统一路径规则给它一张桌子。</p>
            <div class="tags"><span>棋类</span><span>筹备中</span></div>
            <div class="game-foot">
              <span class="meta">敬请期待</span>
              <a class="play-link disabled" href="#soon" aria-disabled="true">尚未开局</a>
            </div>
          </div>
        </article>

        <article class="game-card" data-status="soon" data-name="军棋 棋类 junqi">
          <div class="game-visual gv-soon">
            <span class="gv-badge soon">规划中</span>
            <span class="gv-q" aria-hidden="true">军</span>
          </div>
          <div class="game-body">
            <h3>军棋<span class="en">JUNQI</span></h3>
            <p>司令、军长与工兵的地盘，规则和棋盘都在筹备；上线后会与黑白棋社并列摆进大厅。</p>
            <div class="tags"><span>棋类</span><span>筹备中</span></div>
            <div class="game-foot">
              <span class="meta">敬请期待</span>
              <a class="play-link disabled" href="#soon" aria-disabled="true">尚未开局</a>
            </div>
          </div>
        </article>

        ${moreCard}`);

/* ---------- features: online trio ---------- */
must('<div class="feat"><h4>打开即玩 <span class="arr">→</span></h4><p>纯网页运行，不下载、不注册。手机和电脑打开同一地址，就能落子。</p></div>',
`<div class="feat"><h4>打开即玩 <span class="arr">→</span></h4><p>纯网页运行，不下载、不注册。手机和电脑打开同一地址，就能落子。</p></div>
          <div class="feat"><h4>联机开房 <span class="arr">→</span></h4><p>在黑白棋社创建房间、生成 6 位房间码，房主执黑先行；对手输入房间码即可加入同一局。</p></div>
          <div class="feat"><h4>实时同步 <span class="arr">→</span></h4><p>基于 Supabase Realtime 广播完整盘面；未轮到的一方不能落子，双方盘面保持一致。</p></div>
          <div class="feat"><h4>掉线重连 <span class="arr">→</span></h4><p>对手离开时房间保留，把房间码再发一次即可重连；房主离开则房间关闭。</p></div>`);

/* ---------- final + footer ---------- */
must('从休闲五子棋到正式连珠，从 9 路围棋快棋到 19 路正赛——先挑一局开打；2048、扫雷和卡牌，正在赶来的路上。',
'从黑白棋社的休闲五子棋、正式连珠，到 9 路围棋快棋、19 路正赛，也可以开一间房等朋友进来——先挑一局开打；2048、扫雷和卡牌，正在赶来的路上。');
must(`        <a class="btn btn-green" href="https://wrm-fw.github.io/Gridfall/" target="_blank" rel="noopener">进入棋盘对弈 →</a>
        <a class="btn btn-ghost" href="#games">回大厅挑游戏</a>`,
`        <a class="btn btn-green" href="./HBQS" data-local="./play.html">进入黑白棋社 →</a>
        <a class="btn btn-ghost" href="./HBQS?online=1&amp;game=gomoku" data-local="./play.html?online=1&amp;game=gomoku">联机开房 →</a>
        <a class="btn btn-ghost" href="#games">回大厅挑游戏</a>`);
must(`      <a href="#games">全部游戏</a>
      <a href="#features">玩法一览</a>
      <a href="#soon">即将推出</a>
      <a href="https://wrm-fw.github.io/Gridfall/" target="_blank" rel="noopener">正式棋盘 ↗</a>`,
`      <a href="#games">全部游戏</a>
      <a href="./HBQS" data-local="./play.html">黑白棋社</a>
      <a href="./HBQS?online=1&amp;game=gomoku" data-local="./play.html?online=1&amp;game=gomoku">联机开房</a>
      <a href="#features">玩法一览</a>
      <a href="#soon">即将推出</a>`);
must('<small>落子无悔，一局入魂。</small>', '<small>想玩就来，坐下就开。</small>');
must('Gridfall 首页样板：五子棋（休闲 / 连珠）与围棋已上线；2048、扫雷、卡牌类、中国象棋、国际象棋等为后续扩建规划，标注「规划中 / 构想中」者尚未开放游玩。',
'Gridfall 游戏大厅：黑白棋社（五子棋 / 国际连珠 / 围棋）已上线，支持单机、双人与联机；2048、扫雷、卡牌类、中国象棋、国际象棋等为后续扩建规划，标注「规划中」者尚未开放游玩。');

/* ---------- remaining remote links ---------- */
html = html.split('https://wrm-fw.github.io/Gridfall/').join('./HBQS');
html = html.split(' target="_blank" rel="noopener"').join('');
if (html.includes('wrm-fw.github.io')) throw new Error('remote link left');

/* ---------- styles + local-file fallback ---------- */
must('@media (max-width:900px){',
`.hall-inline-link{ color:var(--yellow); font-weight:900; text-decoration:none; }
  .hall-inline-link:hover{ text-decoration:underline; }
  .gv-club{ background:linear-gradient(120deg,#f2dfae 0 46%,#20304f 46% 100%); }
  .gv-club .gv-board.light{ background:#eecf8f; border-color:#8a6a2f; color:#8a6a2f; box-shadow:0 12px 26px rgba(0,0,0,.34); }
  @media (max-width:900px){`);

must('</body>', `<script>
(function(){
  if (location.protocol === 'file:') {
    document.querySelectorAll('a[data-local]').forEach(function(a){
      var v = a.getAttribute('data-local');
      if (v) a.setAttribute('href', v);
    });
    return;
  }
  // GitHub Pages 不支持 200 代理，走目录回退页；Cloudflare Pages 保持 /HBQS
  if (/(^|\.)github\.io$/.test(location.hostname)) {
    document.querySelectorAll('a[href^="./HBQS"]').forEach(function(a){
      a.setAttribute('href', a.getAttribute('href').replace('./HBQS', './HBQS/'));
    });
  }
})();
</script>
</body>`);


/* ---------- Xiangqi 中国象棋（/ZGXQ） ---------- */
must(`      <a href="./HBQS?online=1&amp;game=gomoku" data-local="./play.html?online=1&amp;game=gomoku">联机开房</a>
      <a href="#games" data-jump="2048">2048</a>`,
`      <a href="./HBQS?online=1&amp;game=gomoku" data-local="./play.html?online=1&amp;game=gomoku">联机开房</a>
      <a href="./ZGXQ" data-local="./xiangqi.html">中国象棋</a>
      <a href="#games" data-jump="2048">2048</a>`);
must('名字叫 Gridfall，装的却不只是棋盘。五子棋、连珠、围棋已经合并为「黑白棋社」一个入口，三张棋盘都能开房联机；2048、扫雷、卡牌这些完全不同的游戏也会陆续搬进来——不用下载、不用注册，点开任意一局就开玩。',
'名字叫 Gridfall，装的却不只是棋盘。五子棋、连珠、围棋已经合并为「黑白棋社」一个入口，三张棋盘都能开房联机；中国象棋也已上线，同样支持人机、双人与联机。2048、扫雷、卡牌这些完全不同的游戏也会陆续搬进来——不用下载、不用注册，点开任意一局就开玩。');
must('黑白棋社已就绪 · 联机房间已开放 · 益智与卡牌在路上 · <b>5 档难度</b>任选 · 打开即玩',
'黑白棋社与中国象棋已就绪 · 联机房间已开放 · 益智与卡牌在路上 · <b>5 档难度</b>任选 · 打开即玩');
must('<span>黑白棋社 <i>●</i></span>', '<span>黑白棋社 <i>●</i></span><span>中国象棋 <i>●</i></span>');
must('「黑白棋社」把五子棋、连珠、围棋三张棋盘收进同一个入口，而且都能开房联机；下面还留着规划中的位置——益智、卡牌这些不同品类的游戏，上线后会直接摆进这张货架。',
'「黑白棋社」把五子棋、连珠、围棋收进同一个入口；中国象棋也带着人机、双人和联机进场。下面还留着规划中的位置——益智、卡牌这些不同品类的游戏，上线后会直接摆进这张货架。');

must(`        <!-- 即将推出（样板占位，明确标注） -->
        <article class="game-card" data-status="soon" data-name="中国象棋 象棋 xiangqi">
          <div class="game-visual gv-soon">
            <span class="gv-badge soon">规划中</span>
            <span class="gv-q" aria-hidden="true">象</span>
          </div>
          <div class="game-body">
            <h3>中国象棋<span class="en">XIANGQI</span></h3>
            <p>大厅的下一张桌子。楚河汉界正在划线，规则与对弈引擎筹备中，上线后会出现在这里。</p>
            <div class="tags"><span>筹备中</span></div>
            <div class="game-foot">
              <span class="meta">敬请期待</span>
              <a class="play-link disabled" href="#soon" aria-disabled="true">尚未开局</a>
            </div>
          </div>
        </article>`,
`        <article class="game-card" data-status="live" data-name="中国象棋 象棋 联机 xiangqi">
          <div class="game-visual gv-xiangqi">
            <span class="gv-badge">已上线</span>
            <div class="gv-board light" aria-hidden="true">
              <span class="stone b" style="left:20%;top:20%"></span>
              <span class="stone w" style="left:50%;top:50%"></span>
              <span class="stone b" style="left:80%;top:20%"></span>
              <span class="stone w" style="left:20%;top:80%"></span>
            </div>
          </div>
          <div class="game-body">
            <h3>中国象棋<span class="en">XIANGQI</span></h3>
            <p>楚河汉界，将死或困毙即负；人机、双人与联机开房都已就位，落子是木质棋子拍在棋盘上的声音。</p>
            <div class="tags"><span>人机 / 双人</span><span>联机开房</span><span>将死 / 困毙</span></div>
            <div class="game-foot">
              <span class="meta">入口 /ZGXQ · 3 档难度</span>
              <a class="play-link" href="./ZGXQ" data-local="./xiangqi.html">进入对弈 →</a>
            </div>
          </div>
        </article>`);
must('<div class="soon-card"><div class="glyph">象</div><h4>中国象棋</h4><p>楚河汉界，马走日、象走田，国民棋盘继续排队。</p><span class="st">规划中</span></div>',
'<div class="soon-card"><div class="glyph">跳</div><h4>跳棋</h4><p>隔着棋子连跳的经典棋类，正在排队进场。</p><span class="st">规划中</span></div>');
must('Gridfall 游戏大厅：黑白棋社（五子棋 / 国际连珠 / 围棋）已上线，支持单机、双人与联机；2048、扫雷、卡牌类、中国象棋、国际象棋等为后续扩建规划，标注「规划中」者尚未开放游玩。',
'Gridfall 游戏大厅：黑白棋社（五子棋 / 国际连珠 / 围棋）与中国象棋已上线，均支持单机、双人与联机；2048、扫雷、卡牌类、国际象棋等为后续扩建规划，标注「规划中」者尚未开放游玩。');
must('  .gv-club .gv-board.light{ background:#eecf8f; border-color:#8a6a2f; color:#8a6a2f; box-shadow:0 12px 26px rgba(0,0,0,.34); }',
'  .gv-club .gv-board.light{ background:#eecf8f; border-color:#8a6a2f; color:#8a6a2f; box-shadow:0 12px 26px rgba(0,0,0,.34); }\n  .gv-xiangqi{ background:linear-gradient(135deg,#3a2410 0%,#20304f 100%); }\n  .gv-xiangqi .gv-board.light{ background:#eecf8f; border-color:#8a6a2f; color:#8a6a2f; box-shadow:0 12px 26px rgba(0,0,0,.4); }');
must(`  if (/(^|\.)github\.io$/.test(location.hostname)) {
    document.querySelectorAll('a[href^="./HBQS"]').forEach(function(a){
      a.setAttribute('href', a.getAttribute('href').replace('./HBQS', './HBQS/'));
    });
  }`,
`  if (/(^|\.)github\.io$/.test(location.hostname)) {
    document.querySelectorAll('a[href^="./HBQS"], a[href^="./ZGXQ"]').forEach(function(a){
      var h = a.getAttribute('href');
      if (h.indexOf('./HBQS') === 0) h = h.replace('./HBQS', './HBQS/');
      else if (h.indexOf('./ZGXQ') === 0) h = h.replace('./ZGXQ', './ZGXQ/');
      a.setAttribute('href', h);
    });
  }`);


/* ---------- 跳棋 / 军棋 / 2048 / 扫雷 ---------- */
function replaceCard(name, card) {
  var marker = 'data-name="' + name + '"';
  var i = html.indexOf(marker);
  if (i < 0) throw new Error('card missing: ' + name);
  var start = html.lastIndexOf('<article class="game-card"', i);
  var end = html.indexOf('</article>', i) + '</article>'.length;
  html = html.slice(0, start) + card + html.slice(end);
}
const card2048 = `        <article class="game-card" data-status="live" data-name="2048 数字 益智 合成 puzzle">
          <div class="game-visual gv-2048">
            <span class="gv-badge">已上线</span>
            <span class="gv-q" aria-hidden="true">2048</span>
          </div>
          <div class="game-body">
            <h3>2048<span class="en">PUZZLE</span></h3>
            <p>滑动合并相同数字，一路合到 2048；每走一步多一块新砖，支持撤销与最高分。</p>
            <div class="tags"><span>单人</span><span>数字合并</span><span>最高分</span></div>
            <div class="game-foot">
              <span class="meta">入口 /2048 · 单人</span>
              <a class="play-link" href="./2048" data-local="./game2048.html">开始游戏 →</a>
            </div>
          </div>
        </article>`;
const cardMine = `        <article class="game-card" data-status="live" data-name="扫雷 minesweeper 推理">
          <div class="game-visual gv-mine">
            <span class="gv-badge">已上线</span>
            <span class="gv-q" aria-hidden="true">雷</span>
          </div>
          <div class="game-body">
            <h3>扫雷<span class="en">MINESWEEPER</span></h3>
            <p>看数字推理排雷，初级 / 中级 / 高级与自定义棋盘；第一击安全，支持插旗与计时。</p>
            <div class="tags"><span>单人</span><span>三档难度</span><span>自定义</span></div>
            <div class="game-foot">
              <span class="meta">入口 /SL · 单人</span>
              <a class="play-link" href="./SL" data-local="./saolei.html">开始游戏 →</a>
            </div>
          </div>
        </article>`;
const cardTq = `        <article class="game-card" data-status="live" data-name="跳棋 棋类 tiaoqi checkers">
          <div class="game-visual gv-tiaoqi">
            <span class="gv-badge">已上线</span>
            <span class="gv-q" aria-hidden="true">跳</span>
          </div>
          <div class="game-body">
            <h3>跳棋<span class="en">CHECKERS</span></h3>
            <p>六角星棋盘，先把 10 枚棋子全部跳进对面营地；人机三档难度或本地双人对战。</p>
            <div class="tags"><span>人机 / 双人</span><span>三档难度</span></div>
            <div class="game-foot">
              <span class="meta">入口 /TQ · 本地对弈</span>
              <a class="play-link" href="./TQ" data-local="./tiaoqi.html">进入对弈 →</a>
            </div>
          </div>
        </article>`;
const cardJq = `        <article class="game-card" data-status="live" data-name="军棋 棋类 junqi">
          <div class="game-visual gv-junqi">
            <span class="gv-badge">已上线</span>
            <span class="gv-q" aria-hidden="true">军</span>
          </div>
          <div class="game-body">
            <h3>军棋<span class="en">JUNQI</span></h3>
            <p>暗棋陆战棋：铁路疾行、行营护身、工兵排雷，夺取军旗者胜；人机或双人布阵对弈。</p>
            <div class="tags"><span>人机 / 双人</span><span>暗棋</span><span>夺旗</span></div>
            <div class="game-foot">
              <span class="meta">入口 /JQ · 本地对弈</span>
              <a class="play-link" href="./JQ" data-local="./junqi.html">进入对弈 →</a>
            </div>
          </div>
        </article>`;
replaceCard('2048 数字 益智 合成 puzzle', card2048);
replaceCard('扫雷 minesweeper 推理', cardMine);
replaceCard('跳棋 棋类 tiaoqi checkers', cardTq);
replaceCard('军棋 棋类 junqi', cardJq);

/* live cards first */
var gridOpen = html.indexOf('<div class="games" id="gameGrid">');
var gridClose = html.indexOf('</div>\n      <p class="empty-msg"', gridOpen);
if (gridOpen < 0 || gridClose < 0) throw new Error('game grid not found');
var gridStart = gridOpen + '<div class="games" id="gameGrid">'.length;
var gridContent = html.slice(gridStart, gridClose);
var cardRe = /<article class="game-card[^"]*"[\s\S]*?<\/article>/g;
var cards = [], m;
while ((m = cardRe.exec(gridContent))) cards.push(m[0]);
var liveCards = cards.filter(function(c){ return c.indexOf('data-status="live"') >= 0; });
var soonCards = cards.filter(function(c){ return c.indexOf('data-status="soon"') >= 0; });
html = html.slice(0, gridStart) + '\n\n' + liveCards.join('\n\n') + '\n\n' + soonCards.join('\n\n') + '\n      ' + html.slice(gridClose);

/* soon row: 国际象棋 / 四子棋 / 卡牌 / 更多 */
must('<div class="soon-card"><div class="glyph" style="font-size:14px;letter-spacing:.02em">2048</div><h4>2048</h4><p>滑动合并数字方块的益智经典，大厅的第一款非棋盘游戏。</p><span class="st">规划中</span></div>',
'<div class="soon-card"><div class="glyph">♞</div><h4>国际象棋</h4><p>64 格战场，开局库与对弈体验打磨中。</p><span class="st">规划中</span></div>');
must('<div class="soon-card"><div class="glyph">雷</div><h4>扫雷</h4><p>看数字推理排雷，经典 Windows 小游戏原味回归。</p><span class="st">规划中</span></div>',
'<div class="soon-card"><div class="glyph">四</div><h4>四子棋</h4><p>竖着落子、横竖斜连成四子，正在排队进场。</p><span class="st">规划中</span></div>');
must('<div class="soon-card"><div class="glyph">跳</div><h4>跳棋</h4><p>隔着棋子连跳的经典棋类，正在排队进场。</p><span class="st">规划中</span></div>',
'<div class="soon-card"><div class="glyph">+ ?</div><h4>下一款游戏</h4><p>新游戏的桌子会一直加下去，不限品类。</p><span class="st">规划中</span></div>');

/* copy and feature list */
must('名字叫 Gridfall，装的却不只是棋盘。五子棋、连珠、围棋已经合并为「黑白棋社」一个入口，三张棋盘都能开房联机；中国象棋也已上线，同样支持人机、双人与联机。2048、扫雷、卡牌这些完全不同的游戏也会陆续搬进来——不用下载、不用注册，点开任意一局就开玩。',
'名字叫 Gridfall，装的却不只是棋盘。黑白棋社、中国象棋、跳棋、军棋、2048、扫雷都已经入驻；黑白棋社与中国象棋还能开房联机，卡牌与其他游戏也会陆续搬进来——不用下载、不用注册，点开任意一局就开玩。');
must('黑白棋社与中国象棋已就绪 · 联机房间已开放 · 益智与卡牌在路上 · <b>5 档难度</b>任选 · 打开即玩',
'六款游戏已就绪 · 联机房间已开放 · 卡牌与其他新游戏在路上 · <b>5 档难度</b>任选 · 打开即玩');
must('<span>黑白棋社 <i>●</i></span><span>中国象棋 <i>●</i></span>', '<span>黑白棋社 <i>●</i></span><span>中国象棋 <i>●</i></span><span>跳棋 <i>●</i></span><span>军棋 <i>●</i></span><span>2048 <i>●</i></span><span>扫雷 <i>●</i></span>');
must('「黑白棋社」把五子棋、连珠、围棋收进同一个入口；中国象棋也带着人机、双人和联机进场。下面还留着规划中的位置——益智、卡牌这些不同品类的游戏，上线后会直接摆进这张货架。',
'「黑白棋社」把五子棋、连珠、围棋收进同一个入口；中国象棋、跳棋、军棋、2048、扫雷也都已进场。下面还留着规划中的位置——卡牌与其他游戏上线后，会直接摆进这张货架。');
must('下面每一项都是正式棋盘里真实可用的玩法，进门就能摸到；等 2048、扫雷、卡牌上线，这里会继续按品类往下加。',
'下面每一项都是大厅里真实可用的玩法，进门就能摸到；卡牌与其他游戏上线后，这里会继续按品类往下加。');
must('Gridfall 游戏大厅：黑白棋社（五子棋 / 国际连珠 / 围棋）与中国象棋已上线，均支持单机、双人与联机；2048、扫雷、卡牌类、国际象棋等为后续扩建规划，标注「规划中」者尚未开放游玩。',
'Gridfall 游戏大厅：黑白棋社、中国象棋、跳棋、军棋、2048、扫雷已上线；黑白棋社与中国象棋支持联机，其余为本地/单人对弈。卡牌类、国际象棋等为后续扩建规划，标注「规划中」者尚未开放游玩。');

/* feature cards */
must('<div class="feat"><h4>掉线重连 <span class="arr">→</span></h4><p>对手离开时房间保留，把房间码再发一次即可重连；房主离开则房间关闭。</p></div>',
`<div class="feat"><h4>掉线重连 <span class="arr">→</span></h4><p>对手离开时房间保留，把房间码再发一次即可重连；房主离开则房间关闭。</p></div>
          <div class="feat"><h4>跳棋与军棋 <span class="arr">→</span></h4><p>六角星跳棋与暗棋陆战棋，人机三档或本地双人；军棋支持布阵、铁路与夺旗。</p></div>
          <div class="feat"><h4>2048 <span class="arr">→</span></h4><p>滑动合并数字，支持撤销、最高分与移动步数，一路合到 2048。</p></div>
          <div class="feat"><h4>扫雷 <span class="arr">→</span></h4><p>初级、中级、高级与自定义雷区；第一击安全，支持插旗、计时与双击展开。</p></div>`);

/* nav 2048 / 扫雷 direct */
must('<a href="#games" data-jump="2048">2048</a>', '<a href="./2048" data-local="./game2048.html">2048</a>');
must('<a href="#games" data-jump="扫雷">扫雷</a>', '<a href="./SL" data-local="./saolei.html">扫雷</a>');

/* GH fallback rewrite */
must(`document.querySelectorAll('a[href^="./HBQS"], a[href^="./ZGXQ"]').forEach(function(a){
      var h = a.getAttribute('href');
      if (h.indexOf('./HBQS') === 0) h = h.replace('./HBQS', './HBQS/');
      else if (h.indexOf('./ZGXQ') === 0) h = h.replace('./ZGXQ', './ZGXQ/');
      a.setAttribute('href', h);
    });`,
`document.querySelectorAll('a[href^="./HBQS"], a[href^="./ZGXQ"], a[href^="./TQ"], a[href^="./2048"], a[href^="./JQ"], a[href^="./SL"]').forEach(function(a){
      var h = a.getAttribute('href'), keys = ['./HBQS','./ZGXQ','./TQ','./2048','./JQ','./SL'];
      for (var k = 0; k < keys.length; k++) if (h.indexOf(keys[k]) === 0) { h = h.replace(keys[k], keys[k] + '/'); break; }
      a.setAttribute('href', h);
    });`);

/* CSS for new visuals */
must('  .gv-xiangqi{ background:linear-gradient(135deg,#3a2410 0%,#20304f 100%); }',
`  .gv-xiangqi{ background:linear-gradient(135deg,#3a2410 0%,#20304f 100%); }
  .gv-2048{ background:linear-gradient(135deg,#d9a441,#8a5a1e); }
  .gv-2048 .gv-q{ color:#fff4dc; }
  .gv-mine{ background:#27313f; }
  .gv-mine .gv-q{ color:#8fa0c4; }
  .gv-tiaoqi{ background:linear-gradient(135deg,#20304f,#2f5a3a); }
  .gv-tiaoqi .gv-q{ color:#9fd6b0; }
  .gv-junqi{ background:linear-gradient(135deg,#3a2a1a,#513a22); }
  .gv-junqi .gv-q{ color:#e0b77a; }`);


/* ---------- 下一款游戏：点单 / 社区共建 ---------- */
replaceCard('更多游戏 新游戏 点单', `        <article class="game-card" data-status="soon" data-name="更多游戏 新游戏 点单 社区共建 PR 邮箱 联系开发者">
          <div class="game-visual gv-soon">
            <span class="gv-badge soon">持续上新</span>
            <span class="gv-q" aria-hidden="true">+ ?</span>
          </div>
          <div class="game-body">
            <h3>下一款游戏，由你点单<span class="en">NEXT GAME</span></h3>
            <p>跳棋、军棋、四子棋，或是任何你想玩的小游戏……大厅的桌子会一直加下去，不限品类。</p>
            <div class="co-build">
              <div class="co-build-row"><span class="k">联系开发者</span><a href="mailto:3391792088@qq.com">3391792088@qq.com</a></div>
              <div class="co-build-row"><span class="k">自主共建</span><a href="https://github.com/WRM-FW/Gridfall/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener">用 AI Agent 开发，提交 PR →</a></div>
              <p class="co-note">有想做的玩法，可以让 AI Agent 按开发说明做一个单文件小游戏，提交 PR；通过后会摆进大厅。</p>
            </div>
            <div class="tags"><span>持续上新</span><span>社区共建</span></div>
            <div class="game-foot">
              <span class="meta">大厅扩建中 · 点单 / 共建</span>
              <a class="play-link" href="mailto:3391792088@qq.com">写信点单 →</a>
            </div>
          </div>
        </article>`);
must('  .gv-junqi .gv-q{ color:#e0b77a; }',
`  .gv-junqi .gv-q{ color:#e0b77a; }
  .co-build{display:flex;flex-direction:column;gap:5px;margin-top:2px;padding-top:9px;border-top:1px dashed #c4cfe4;}
  .co-build-row{display:flex;gap:8px;align-items:baseline;font-size:12.5px;line-height:1.55;}
  .co-build-row .k{flex:0 0 74px;color:#7c8db1;font-weight:800;letter-spacing:.02em;white-space:nowrap;}
  .co-build-row a{color:#1748c4;font-weight:800;text-decoration:none;word-break:break-all;}
  .co-build-row a:hover{text-decoration:underline;}
  .co-note{margin:2px 0 0;font-size:12.5px;line-height:1.6;color:#5b6a8c;}`);

fs.writeFileSync(path.join(ROOT, 'index.html'), html, 'utf8');
console.log('built homepage', Buffer.byteLength(html), 'bytes');