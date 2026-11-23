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
must('落子无悔，<br />一局入魂。', '想玩就来，<br />坐下就开。');
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
            <p>五子棋（含国际连珠的禁手与 26 种正式开局）、围棋（9/13/19 路）收在同一个入口；人机五档、同屏双人、联机开房都在里面。</p>
            <div class="tags"><span>五子棋 / 连珠</span><span>围棋</span><span>单机 / 双人</span><span>联机开房</span></div>
            <div class="game-foot">
              <span class="meta">入口 /HBQS · 三合一 · AI 5 档</span>
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

/* ---------- 贪吃蛇 / 推箱子 / 俄罗斯方块 ---------- */
const cardSnake = `        <article class="game-card" data-status="live" data-cat="action" data-name="贪吃蛇 街机 休闲 snake">
          <div class="game-visual gv-cover">
            <img class="gv-cover-img" src="./assets/covers/snake.svg" alt="贪吃蛇游戏封面" width="1200" height="600" decoding="async">
            <span class="gv-badge">已上线</span>
          </div>
          <div class="game-body">
            <h3>贪吃蛇<span class="en">SNAKE</span></h3>
            <p>21×21 棋盘，吃红果 +10、金果限时 +30；四档速度，撞墙或穿墙两种规则，方向键、十字键或滑动都能玩。</p>
            <div class="tags"><span>单人</span><span>街机</span><span>四档速度</span></div>
            <div class="game-foot">
              <span class="meta">入口 /TCS · 本机最高分</span>
              <a class="play-link" href="./TCS" data-local="./snake.html">开始游戏 →</a>
            </div>
          </div>
        </article>`;
const cardSokoban = `        <article class="game-card" data-status="live" data-cat="puzzle" data-name="推箱子 益智 解谜 sokoban">
          <div class="game-visual gv-cover">
            <img class="gv-cover-img" src="./assets/covers/sokoban.svg" alt="推箱子游戏封面" width="1200" height="600" decoding="async">
            <span class="gv-badge">已上线</span>
          </div>
          <div class="game-body">
            <h3>推箱子<span class="en">SOKOBAN</span></h3>
            <p>30 关仓库谜题，箱子只能推不能拉；支持撤销、重开与跳关，21 关起是多箱大图。方向键 / WASD / 滑动操作。</p>
            <div class="tags"><span>单人</span><span>30 关</span><span>撤销 / 重开</span></div>
            <div class="game-foot">
              <span class="meta">入口 /TXZ · 本地闯关</span>
              <a class="play-link" href="./TXZ" data-local="./sokoban.html">开始解谜 →</a>
            </div>
          </div>
        </article>`;
const cardTetris = `        <article class="game-card" data-status="live" data-cat="action puzzle" data-name="俄罗斯方块 街机 益智 tetris">
          <div class="game-visual gv-cover">
            <img class="gv-cover-img" src="./assets/covers/tetris.svg" alt="俄罗斯方块游戏封面" width="1200" height="600" decoding="async">
            <span class="gv-badge">已上线</span>
          </div>
          <div class="game-body">
            <h3>俄罗斯方块<span class="en">TETRIS</span></h3>
            <p>10×20 标准场地，7 种方块、暂存、下一个与落点预览；四档下落速度，消行计分并逐级加速。</p>
            <div class="tags"><span>单人</span><span>四档难度</span><span>暂存 / 预览</span></div>
            <div class="game-foot">
              <span class="meta">入口 /ELSFK · 街机益智</span>
              <a class="play-link" href="./ELSFK" data-local="./tetris.html">开始游戏 →</a>
            </div>
          </div>
        </article>`;
const cardTic = `        <article class="game-card" data-status="live" data-cat="board" data-name="井字棋 棋类 tic tac toe">
          <div class="game-visual gv-cover">
            <img class="gv-cover-img" src="./assets/covers/tic-tac-toe.jpg" alt="井字棋游戏封面" width="1200" height="600" decoding="async">
            <span class="gv-badge">已上线</span>
          </div>
          <div class="game-body">
            <h3>井字棋<span class="en">TIC-TAC-TOE</span></h3>
            <p>3×3 棋盘，X 先手，横竖斜连成一线即胜；人机三档（困难用 minimax，不可战胜）或本地双人，比分记在当前页面。</p>
            <div class="tags"><span>人机 / 双人</span><span>三档难度</span><span>本地对弈</span></div>
            <div class="game-foot">
              <span class="meta">入口 /tic-tac-toe · 本地对弈</span>
              <a class="play-link" href="./tic-tac-toe" data-local="./games/tic-tac-toe/index.html">进入对弈 →</a>
            </div>
          </div>
        </article>`;
var jqAt = html.indexOf('data-name="军棋 棋类 junqi"');
var jqEnd = html.indexOf('</article>', jqAt) + '</article>'.length;
if (jqAt < 0 || jqEnd < 0) throw new Error('junqi card end missing');
html = html.slice(0, jqEnd) + '\n\n' + cardSnake + '\n\n' + cardSokoban + '\n\n' + cardTetris + '\n\n' + cardTic + html.slice(jqEnd);

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
              <div class="co-build-row"><span class="k">自主共建</span><a href="https://github.com/WRM-FW/Gridfall/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener">自己开发，提交 PR →</a></div>
              <p class="co-note">有想做的玩法，可以按开发说明做一个单文件小游戏，自己写或借助 AI 工具辅助，提交 PR；通过后会摆进大厅。</p>
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
  .co-note{margin:2px 0 0;font-size:12.5px;line-height:1.6;color:#5b6a8c;}
  .game-visual.gv-cover{background:#1b2438;}
  .gv-cover-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;}`);

/* ---------- 游戏封面：统一换成 1200x600 插画 ---------- */
function setCover(name, file, alt, badgeClass, badgeText) {
  var marker = 'data-name="' + name;
  var at = html.indexOf(marker);
  if (at < 0) throw new Error('cover target missing: ' + name);
  var cardStart = html.lastIndexOf('<article class="game-card', at);
  var cardEnd = html.indexOf('</article>', at) + '</article>'.length;
  var vStart = html.indexOf('<div class="game-visual', cardStart);
  if (vStart < 0 || vStart > cardEnd) throw new Error('visual missing: ' + name);
  var depth = 0, p = vStart, vEnd = -1;
  while (p < cardEnd) {
    var no = html.indexOf('<div', p);
    var nc = html.indexOf('</div>', p);
    if (nc < 0) break;
    if (no >= 0 && no < nc) { depth += 1; p = no + 4; }
    else { depth -= 1; p = nc + 6; if (depth === 0) { vEnd = p; break; } }
  }
  if (vEnd < 0) throw new Error('visual end missing: ' + name);
  var badge = 'gv-badge' + (badgeClass ? ' ' + badgeClass : '');
  var visual = '<div class="game-visual gv-cover">\n' +
    '            <img class="gv-cover-img" src="./assets/covers/' + file + '.png" alt="' + alt + '" width="1200" height="600" decoding="async">\n' +
    '            <span class="' + badge + '">' + badgeText + '</span>\n' +
    '          </div>';
  html = html.slice(0, vStart) + visual + html.slice(vEnd);
}

setCover('黑白棋社 五子棋', 'hbqs', '黑白棋社游戏封面', '', '已上线');
setCover('中国象棋 象棋 联机', 'xiangqi', '中国象棋游戏封面', '', '已上线');
setCover('2048 数字', 'game2048', '2048 游戏封面', '', '已上线');
setCover('扫雷 minesweeper', 'saolei', '扫雷游戏封面', '', '已上线');
setCover('跳棋 棋类', 'tiaoqi', '跳棋游戏封面', '', '已上线');
setCover('军棋 棋类', 'junqi', '军棋游戏封面', '', '已上线');
setCover('国际象棋 chess', 'chess', '国际象棋游戏封面', 'soon', '规划中');
setCover('卡牌 纸牌', 'cards', '卡牌类游戏封面', 'soon', '规划中');
setCover('更多游戏 新游戏 点单 社区共建', 'next-game', '下一款游戏点单与社区共建封面', 'soon', '持续上新');


/* ---------- 首页重构：已上线与规划分开，按当前实际功能重写 ---------- */

/* 元信息 */
must('<title>Gridfall 游戏大厅 · 黑白棋社</title>',
'<title>Gridfall 游戏大厅 · 十个入口，十二种玩法</title>');
must('<meta name="description" content="Gridfall 游戏大厅：黑白棋社收录五子棋、国际连珠、围棋，支持单机、双人与联机开房；打开即玩，更多游戏持续上新。" />',
'<meta name="description" content="Gridfall 游戏大厅：黑白棋社（五子棋 / 连珠 / 围棋）、中国象棋、跳棋、军棋、2048、扫雷，共 10 个入口、12 种玩法；棋社与中国象棋支持联机开房，免下载、免注册。" />');

/* 首屏 */
must('名字叫 Gridfall，装的却不只是棋盘。黑白棋社、中国象棋、跳棋、军棋、2048、扫雷都已经入驻；黑白棋社与中国象棋还能开房联机，卡牌与其他游戏也会陆续搬进来——不用下载、不用注册，点开任意一局就开玩。',
'名字叫 Gridfall，装的却不只是棋盘。十个入口、十二种玩法：黑白棋社（五子棋 / 连珠 / 围棋）、中国象棋、跳棋、军棋、2048、扫雷、贪吃蛇、推箱子、俄罗斯方块、井字棋。棋社与中国象棋可以开房联机，其余随时坐下就玩——不用下载、不用注册。');
must('六款游戏已就绪 · 联机房间已开放 · 卡牌与其他新游戏在路上 · <b>5 档难度</b>任选 · 打开即玩',
'10 个入口 · 12 种玩法 · 2 款支持联机 · 全部免费、免注册');
must(`<div><label>平台 PLATFORM</label><strong>网页 · <em>免下载</em></strong></div>
            <div><label>费用 PRICE</label><strong>免费</strong></div>
            <div><label>对战 MODES</label><strong>单机 / 双人 / 联机</strong></div>
            <div><label>难度 LEVELS</label><strong>简单 → 极难 <em>5 档</em></strong></div>`,
`<div><label>平台 PLATFORM</label><strong>网页 · <em>免下载</em></strong></div>
            <div><label>费用 PRICE</label><strong>免费 · <em>免注册</em></strong></div>
            <div><label>内容 CONTENT</label><strong>10 个入口 · <em>12 种玩法</em></strong></div>
            <div><label>联机 ONLINE</label><strong>棋社 / 象棋</strong></div>`);
must('黑白棋社里有禁手判定、棋谱回放、联机房间与计时对局；新游戏的桌子还在往里搬，进门右转。',
'黑白棋社有禁手判定、26 种连珠开局、棋谱回放和联机房间；中国象棋也能开房，房主执红。跳棋、军棋、2048、扫雷坐下就能玩。');

/* 滚动条：去掉已经上线的“筹备中”，换成真实功能 */
must('<span>五子棋 <i>●</i></span><span>连珠 RENJU <i>●</i></span><span>围棋 <i>●</i></span><span>9 / 13 / 19 路 <i>●</i></span><span>五档难度 <i>●</i></span><span>黑白棋社 <i>●</i></span><span>中国象棋 <i>●</i></span><span>跳棋 <i>●</i></span><span>军棋 <i>●</i></span><span>2048 <i>●</i></span><span>扫雷 <i>●</i></span><span>联机开房 <i>●</i></span><span>Supabase 实时同步 <i>●</i></span><span>棋谱回放 <i>●</i></span><span>双人对弈 <i>●</i></span><span>2048 筹备中 <i>●</i></span><span>扫雷 筹备中 <i>●</i></span><span>卡牌 筹备中 <i>●</i></span><span>新游戏持续上新 <i>●</i></span>',
'<span>五子棋 <i>●</i></span><span>连珠 RENJU <i>●</i></span><span>围棋 <i>●</i></span><span>9 / 13 / 19 路 <i>●</i></span><span>黑白棋社 AI 5 档 <i>●</i></span><span>象棋 / 跳棋 3 档 <i>●</i></span><span>黑白棋社 <i>●</i></span><span>中国象棋 <i>●</i></span><span>跳棋 <i>●</i></span><span>军棋 <i>●</i></span><span>2048 <i>●</i></span><span>扫雷 <i>●</i></span><span>贪吃蛇 <i>●</i></span><span>推箱子 <i>●</i></span><span>俄罗斯方块 <i>●</i></span><span>井字棋 <i>●</i></span><span>联机开房 <i>●</i></span><span>Supabase 实时同步 <i>●</i></span><span>棋谱回放 <i>●</i></span><span>双人对弈 <i>●</i></span><span>换方申请 <i>●</i></span><span>军棋布阵 <i>●</i></span><span>自定义雷区 <i>●</i></span><span>10 个入口 · 12 种玩法 <i>●</i></span>');

/* 大厅：六个入口已经上线 */
must('<div class="chips" role="group" aria-label="按状态筛选游戏">',
'<div class="chips" role="group" aria-label="按类型筛选游戏">');
must('「黑白棋社」把五子棋、连珠、围棋收进同一个入口；中国象棋、跳棋、军棋、2048、扫雷也都已进场。下面还留着规划中的位置——卡牌与其他游戏上线后，会直接摆进这张货架。',
'十个入口已经开桌：黑白棋社（五子棋 / 连珠 / 围棋）、中国象棋、跳棋、军棋、2048、扫雷、贪吃蛇、推箱子、俄罗斯方块、井字棋。棋社与中国象棋支持开房联机；下面可以按「可联机 / 棋类 / 益智 / 街机」筛选。');
must(`<button class="chip" type="button" data-filter="all" aria-pressed="true">全部</button>
          <button class="chip" type="button" data-filter="live" aria-pressed="false">已上线</button>
          <button class="chip" type="button" data-filter="soon" aria-pressed="false">即将推出</button>`,
`<button class="chip" type="button" data-filter="all" aria-pressed="true">全部</button>
          <button class="chip" type="button" data-filter="online" aria-pressed="false">可联机</button>
          <button class="chip" type="button" data-filter="board" aria-pressed="false">棋类</button>
          <button class="chip" type="button" data-filter="puzzle" aria-pressed="false">益智</button>
          <button class="chip" type="button" data-filter="action" aria-pressed="false">街机</button>`);

/* 规划中的卡片移出“现在就能玩”网格，改到下一批桌子 */
var soonRe = /<article class="game-card" data-status="soon"[\s\S]*?<\/article>/g;
var removedSoon = 0;
html = html.replace(soonRe, function(){ removedSoon++; return ''; });
if (removedSoon !== 3) throw new Error('expected 3 planned cards, removed ' + removedSoon);

/* 为筛选项补类别 */
function tagCat(name, cat) {
  var at = html.indexOf('data-name="' + name);
  if (at < 0) throw new Error('category target missing: ' + name);
  var start = html.lastIndexOf('<article', at);
  var end = html.indexOf('>', start);
  var tag = html.slice(start, end);
  if (tag.indexOf('data-cat=') < 0) {
    tag = tag.replace('data-status="live"', 'data-status="live" data-cat="' + cat + '"');
  }
  html = html.slice(0, start) + tag + html.slice(end);
}
tagCat('黑白棋社 五子棋', 'board online');
tagCat('中国象棋 象棋 联机', 'board online');
tagCat('2048 数字', 'puzzle');
tagCat('扫雷 minesweeper', 'puzzle');
tagCat('跳棋 棋类', 'board');
tagCat('军棋 棋类', 'board');

/* 筛选逻辑：按类别 */
must(`      var okStatus = (activeFilter === 'all') || (card.getAttribute('data-status') === activeFilter);`,
`      var cat = ' ' + (card.getAttribute('data-cat') || '') + ' ';
      var okStatus = (activeFilter === 'all') || cat.indexOf(' ' + activeFilter + ' ') !== -1;`);

/* 玩法一览 + 下一批桌子整体重写 */
var featStart = html.indexOf('  <!-- FEATURES / CONTENTS -->');
var finalStart = html.indexOf('  <!-- FINAL CTA -->');
if (featStart < 0 || finalStart < 0 || finalStart < featStart) throw new Error('features/final markers missing');

var FEATURES = `  <!-- FEATURES / CONTENTS -->
  <section class="block" id="features">
    <div class="wrap">
      <h2 class="big"><span class="en">EVERYTHING IN THE HALL</span>从棋盘开始，不止于棋盘。</h2>
      <p class="sec-sub">下面只写现在真实可用的功能；没有上线的玩法不往这里放。新游戏进场后，这张清单再跟着加。</p>

      <div class="contents">
        <div class="contents-head"><b>玩法一览 Contents</b><span>ALL FEATURES · FREE TO PLAY</span></div>
        <div class="contents-grid">
          <div class="feat"><h4>联机开房 <span class="arr">→</span></h4><p>黑白棋社生成 6 位房间码，中国象棋同理；房主先行，未轮到的一方不能落子。</p></div>
          <div class="feat"><h4>完整棋规 <span class="arr">→</span></h4><p>连珠禁手与 26 种正式开局、围棋提子与劫争、象棋将死困毙，都在本地判定。</p></div>
          <div class="feat"><h4>三种下法 <span class="arr">→</span></h4><p>棋社与象棋有人机、同屏双人、联机开房；跳棋、军棋为人机或同屏双人。</p></div>
          <div class="feat"><h4>换方申请 <span class="arr">→</span></h4><p>联机房主默认执黑（象棋执红）；开局前可申请换方，由对方同意或拒绝。</p></div>
          <div class="feat"><h4>棋谱回放 <span class="arr">→</span></h4><p>五子棋 / 连珠全程留谱，赛后逐步回放；悔棋、认输、再来一局都在侧栏。</p></div>
          <div class="feat"><h4>计时对局 <span class="arr">→</span></h4><p>五子棋 / 连珠与围棋分别记录黑方、白方用时，换手时自动切换。</p></div>
          <div class="feat"><h4>分档 AI <span class="arr">→</span></h4><p>黑白棋社五档，象棋与跳棋三档；军棋电脑执蓝，不设难度档。</p></div>
          <div class="feat"><h4>双人同屏 <span class="arr">→</span></h4><p>棋社、象棋、跳棋、军棋都能两个人轮流；不用账号，不用联网。</p></div>
          <div class="feat"><h4>打开即玩 <span class="arr">→</span></h4><p>纯网页运行，不下载、不注册。手机和电脑打开同一地址，就能落子。</p></div>
          <div class="feat"><h4>跳棋 / 军棋 <span class="arr">→</span></h4><p>跳棋三档 AI；军棋布阵后走铁路、工兵排雷、夺旗，电脑或双人都能开。</p></div>
          <div class="feat"><h4>2048 <span class="arr">→</span></h4><p>滑动或方向键合并数字，撤销、步数与本次最高分都在侧栏。</p></div>
          <div class="feat"><h4>扫雷 <span class="arr">→</span></h4><p>初级 / 中级 / 高级与自定义雷区；第一击安全，插旗、计时、双击展开。</p></div>
          <div class="feat"><h4>贪吃蛇 <span class="arr">→</span></h4><p>21×21 棋盘，红果 +10、金果限时 +30；四档速度，撞墙 / 穿墙两种规则。</p></div>
          <div class="feat"><h4>推箱子 <span class="arr">→</span></h4><p>30 关仓库谜题，箱子只能推不能拉；撤销、重开、跳关，21 关起多箱大图。</p></div>
          <div class="feat"><h4>俄罗斯方块 <span class="arr">→</span></h4><p>10×20 场地，暂存、下一个与落点预览；四档速度，消行计分逐级加速。</p></div>
          <div class="feat"><h4>井字棋 <span class="arr">→</span></h4><p>3×3 棋盘，X 先手；人机三档（困难 minimax 不败）或本地双人。</p></div>
        </div>
      </div>
    </div>
  </section>`;

var ROADMAP = `  <!-- COMING SOON -->
  <section class="block" id="soon">
    <div class="wrap">
      <h2 class="big"><span class="en">ON THE BENCH</span>下一批桌子。</h2>
      <p class="sec-sub">大厅现在有十个入口。下面三款还在候选清单里，没有开发排期；想先玩哪一款，可以直接点单，也可以自己写好代码后提交 PR。</p>
      <div class="roadmap-row">
        <article class="roadmap-card">
          <div class="roadmap-cover"><img src="./assets/covers/chess.png" alt="国际象棋规划封面" width="1200" height="600" decoding="async"><span class="st">规划中</span></div>
          <div class="roadmap-body">
            <h3>国际象棋 <span class="en">CHESS</span></h3>
            <p>64 格、王车易位、将军与将死；列在候选清单里，代码尚未开工。</p>
            <a href="mailto:3391792088@qq.com">点单这款 →</a>
          </div>
        </article>
        <article class="roadmap-card">
          <div class="roadmap-cover"><img src="./assets/covers/connect4.png" alt="四子棋规划封面" width="1200" height="600" decoding="async"><span class="st">规划中</span></div>
          <div class="roadmap-body">
            <h3>四子棋 <span class="en">CONNECT FOUR</span></h3>
            <p>竖着落子，横竖斜连成四子；封面已经备好，代码还没开工。</p>
            <a href="mailto:3391792088@qq.com">点单这款 →</a>
          </div>
        </article>
        <article class="roadmap-card">
          <div class="roadmap-cover"><img src="./assets/covers/cards.png" alt="卡牌类规划封面" width="1200" height="600" decoding="async"><span class="st">规划中</span></div>
          <div class="roadmap-body">
            <h3>卡牌类 <span class="en">CARDS</span></h3>
            <p>接龙、纸牌对战等玩法；同样没有开发排期，接受点单或直接提交 PR。</p>
            <a href="mailto:3391792088@qq.com">点单这款 →</a>
          </div>
        </article>
      </div>

      <div class="co-build-panel">
        <div class="co-build-copy">
          <span class="co-kicker">OPEN SOURCE · 社区共建</span>
          <h3>下一款游戏，由你点单，也可以由你来做。</h3>
          <p class="co-note">写一封信告诉我们想玩什么；也可以按开发说明自己做一个单文件小游戏，自己写或借助 AI 工具辅助都行，再提交 PR。通过后会补上路由、封面和首页卡片，正式摆进大厅。</p>
          <div class="co-actions">
            <a class="btn btn-green" href="mailto:3391792088@qq.com">3391792088@qq.com</a>
            <a class="btn btn-ghost" href="https://github.com/WRM-FW/Gridfall/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener">查看共建说明 →</a>
          </div>
        </div>
        <div class="co-build-art" aria-hidden="true"><img src="./assets/covers/next-game.png" alt="" width="1200" height="600" decoding="async"></div>
      </div>
    </div>
  </section>`;

html = html.slice(0, featStart) + FEATURES + '\n\n' + ROADMAP + '\n\n' + html.slice(finalStart);

/* 结尾与页脚 */
must('从黑白棋社的休闲五子棋、正式连珠，到 9 路围棋快棋、19 路正赛，也可以开一间房等朋友进来——先挑一局开打；2048、扫雷和卡牌，正在赶来的路上。',
'从黑白棋社的休闲五子棋、正式连珠，到 9 路围棋快棋、19 路正赛；也可以去中国象棋开一间房，或者一个人刷 2048、扫雷、贪吃蛇、推箱子、俄罗斯方块、井字棋。全部免费，不用账号。');
must('<a href="#soon">即将推出</a>', '<a href="#soon">下一批游戏</a>');
must('Gridfall 游戏大厅：黑白棋社、中国象棋、跳棋、军棋、2048、扫雷已上线；黑白棋社与中国象棋支持联机，其余为本地/单人对弈。卡牌类、国际象棋等为后续扩建规划，标注「规划中」者尚未开放游玩。',
'Gridfall 游戏大厅：黑白棋社（五子棋 / 连珠 / 围棋）、中国象棋、跳棋、军棋、2048、扫雷、贪吃蛇、推箱子、俄罗斯方块、井字棋已上线；棋社与中国象棋支持联机，其余为本地 / 单人。国际象棋、四子棋、卡牌为候选规划，尚未开放。');

/* 规划区样式 */
must('  @media (max-width:900px){',
`  .roadmap-row{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:26px}
  .roadmap-card{border:2px dashed rgba(255,255,255,.5);border-radius:14px;overflow:hidden;background:rgba(255,255,255,.06);display:flex;flex-direction:column}
  .roadmap-cover{position:relative;height:150px;background:#1b2438;overflow:hidden}
  .roadmap-cover img{display:block;width:100%;height:100%;object-fit:cover}
  .roadmap-cover::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,15,40,.35),transparent 55%)}
  .roadmap-cover .st{position:absolute;top:12px;left:12px;z-index:1;font-size:12px;font-weight:800;color:var(--yellow);background:rgba(11,18,32,.78);border:1px solid rgba(255,216,61,.65);border-radius:999px;padding:3px 10px}
  .roadmap-body{padding:17px 18px 18px;display:flex;flex-direction:column;gap:8px;flex:1}
  .roadmap-body h3{margin:0;font-size:19px;font-weight:900;color:#fff}
  .roadmap-body h3 .en{font-family:"Barlow Condensed",sans-serif;font-size:12.5px;letter-spacing:.1em;color:#9fb2dd;font-weight:600;margin-left:6px}
  .roadmap-body p{margin:0;font-size:13px;line-height:1.65;color:var(--paper-dim);flex:1}
  .roadmap-body a{margin-top:4px;color:var(--yellow);font-weight:900;font-size:14px;text-decoration:none}
  .roadmap-body a:hover{text-decoration:underline}
  .co-build-panel{margin-top:20px;border:2px solid rgba(255,255,255,.65);border-radius:16px;overflow:hidden;display:grid;grid-template-columns:1.15fr .85fr;background:rgba(255,255,255,.09);box-shadow:8px 9px 0 rgba(6,24,74,.25)}
  .co-build-copy{padding:28px 30px;display:flex;flex-direction:column;gap:10px;justify-content:center}
  .co-kicker{font-family:"Barlow Condensed",sans-serif;font-size:13px;letter-spacing:.14em;font-weight:700;color:var(--yellow)}
  .co-build-copy h3{margin:0;font-size:clamp(21px,2.2vw,27px);line-height:1.25;font-weight:900;color:#fff}
  .co-build-copy p{margin:0;font-size:14px;line-height:1.7;color:var(--paper-dim);max-width:36em}
  .co-build-copy p a{color:var(--yellow);font-weight:800;text-decoration:none}
  .co-build-copy p a:hover{text-decoration:underline}
  .co-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:6px}
  .co-actions .btn{font-size:14.5px;min-height:2.6rem}
  .co-build-art{position:relative;min-height:240px;background:#1b2438}
  .co-build-art img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
  @media (max-width:900px){
    .roadmap-row{grid-template-columns:1fr 1fr}
    .co-build-panel{grid-template-columns:1fr}
    .co-build-art{min-height:180px;order:-1}
  }
  @media (max-width:560px){
    .roadmap-row{grid-template-columns:1fr}
    .co-build-copy{padding:22px 20px}
  }
  @media (max-width:900px){`);

/* ---------- 20261123 目录重构：游戏统一迁入 games/，英文 URL ---------- */
var oldGh = `document.querySelectorAll('a[href^="./HBQS"], a[href^="./ZGXQ"], a[href^="./TQ"], a[href^="./2048"], a[href^="./JQ"], a[href^="./SL"]').forEach(function(a){
      var h = a.getAttribute('href'), keys = ['./HBQS','./ZGXQ','./TQ','./2048','./JQ','./SL'];
      for (var k = 0; k < keys.length; k++) if (h.indexOf(keys[k]) === 0) { h = h.replace(keys[k], keys[k] + '/'); break; }
      a.setAttribute('href', h);
    });`;
var newGh = `document.querySelectorAll('a[href]').forEach(function(a){
      var h=a.getAttribute('href');
      var map={'./board-club':'./games/board-club/','./chinese-chess':'./games/chinese-chess/','./chinese-checkers':'./games/chinese-checkers/','./2048':'./games/2048/','./army-chess':'./games/army-chess/','./minesweeper':'./games/minesweeper/','./snake':'./games/snake/','./sokoban':'./games/sokoban/','./tetris':'./games/tetris/'};
      for (var k in map) if (h.indexOf(k) === 0) { a.setAttribute('href', map[k]+h.slice(k.length)); break; }
    });`;
if (!html.includes(oldGh)) throw new Error('old GH fallback missing');
html = html.replace(oldGh, newGh);

/* data-local：本地 file:// 直接指向 games/<dir>/index.html */
var localMap = {
  'data-local="./play.html': 'data-local="./games/board-club/index.html',
  'data-local="./xiangqi.html': 'data-local="./games/chinese-chess/index.html',
  'data-local="./tiaoqi.html': 'data-local="./games/chinese-checkers/index.html',
  'data-local="./game2048.html': 'data-local="./games/2048/index.html',
  'data-local="./junqi.html': 'data-local="./games/army-chess/index.html',
  'data-local="./saolei.html': 'data-local="./games/minesweeper/index.html',
  'data-local="./snake.html': 'data-local="./games/snake/index.html',
  'data-local="./sokoban.html': 'data-local="./games/sokoban/index.html',
  'data-local="./tetris.html': 'data-local="./games/tetris/index.html'
};
Object.keys(localMap).forEach(function(k){ html = html.split(k).join(localMap[k]); });

/* 站内链接与文案路径 */
var routeMap = {
  './HBQS': './board-club',
  './ZGXQ': './chinese-chess',
  './TQ': './chinese-checkers',
  './JQ': './army-chess',
  './SL': './minesweeper',
  './TCS': './snake',
  './TXZ': './sokoban',
  './ELSFK': './tetris'
};
Object.keys(routeMap).forEach(function(k){ html = html.split(k).join(routeMap[k]); });
var textMap = {
  '/HBQS': '/board-club',
  '/ZGXQ': '/chinese-chess',
  '/TQ': '/chinese-checkers',
  '/JQ': '/army-chess',
  '/SL': '/minesweeper',
  '/TCS': '/snake',
  '/TXZ': '/sokoban',
  '/ELSFK': '/tetris',
  '/play.html': '/board-club',
  '/xiangqi.html': '/chinese-chess',
  '/tiaoqi.html': '/chinese-checkers',
  '/game2048.html': '/2048',
  '/junqi.html': '/army-chess',
  '/saolei.html': '/minesweeper',
  '/snake.html': '/snake',
  '/sokoban.html': '/sokoban',
  '/tetris.html': '/tetris'
};
Object.keys(textMap).forEach(function(k){ html = html.split(k).join(textMap[k]); });

fs.writeFileSync(path.join(ROOT, 'index.html'), html, 'utf8');
console.log('built homepage', Buffer.byteLength(html), 'bytes');