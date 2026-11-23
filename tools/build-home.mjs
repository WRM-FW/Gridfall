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
  if (location.protocol !== 'file:') return;
  document.querySelectorAll('a[data-local]').forEach(function(a){
    var v = a.getAttribute('data-local');
    if (v) a.setAttribute('href', v);
  });
})();
</script>
</body>`);

fs.writeFileSync(path.join(ROOT, 'index.html'), html, 'utf8');
console.log('built homepage', Buffer.byteLength(html), 'bytes');