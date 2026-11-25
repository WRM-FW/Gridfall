import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
let html = fs.readFileSync(path.join(ROOT, 'tools', 'design', 'xiangqi-reference.html'), 'utf8');
const online = fs.readFileSync(path.join(ROOT, 'tools', 'src', 'xiangqi-online.js'), 'utf8');

function must(old, neu) {
  if (!html.includes(old)) throw new Error('xiangqi pattern missing: ' + old.slice(0, 80));
  html = html.split(old).join(neu);
}

must('<title>中国象棋 · Xiangqi</title>', '<title>中国象棋 · Xiangqi | Gridfall</title>\n<link rel="canonical" href="../../chinese-chess" />');

must(`  <header class="head">
    <div class="brand"><h1>中国象棋</h1><span class="tag">xiangqi</span></div>
    <button class="icon-btn" id="soundBtn" title="音效开关">🔔</button>
  </header>`,
`  <header class="head">
    <div class="brand"><h1>中国象棋</h1><span class="tag">xiangqi</span></div>
    <div class="head-actions">
      <a class="hall-link" href="../../index.html" title="返回 Gridfall 游戏大厅">← 游戏大厅</a>
    </div>
  </header>`);

must(`          <button class="seg-btn on" data-mode="ai">人机对战</button>
          <button class="seg-btn" data-mode="pvp">双人对战</button>`,
`          <button class="seg-btn on" data-mode="ai">人机对战</button>
          <button class="seg-btn" data-mode="pvp">双人对战</button>
          <button class="seg-btn" data-mode="online">联机</button>`);

must(`        <div class="actions">
          <button class="btn" id="undoBtn" disabled>悔棋</button>
          <button class="btn" id="restartBtn">重新开始</button>
        </div>`,
`        <div class="actions" id="localActions">
          <button class="btn" id="undoBtn" disabled>悔棋</button>
          <button class="btn" id="restartBtn">重新开始</button>
        </div>`);

const onlineCard = `      <div class="card hidden" id="onlineCard">
        <div class="card-label">联机房间</div>
        <div class="x-room-row"><button class="btn" id="xCreate">创建房间</button></div>
        <div class="x-room-row">
          <input id="xCode" maxlength="6" placeholder="输入 6 位房间码" autocomplete="off" spellcheck="false">
          <button class="btn" id="xJoin">加入</button>
        </div>
        <div class="x-room-info hidden" id="xRoomInfo"><span>房间码</span><b id="xRoomCode">------</b><button class="x-mini" id="xCopy">复制</button></div>
        <div class="x-online-status" id="xStatus">未连接</div>
        <div class="x-online-sub" id="xSub">创建房间，或输入房间码加入。</div>
        <div class="x-color">你执 <b id="xColor">—</b></div>
        <div class="actions x-actions">
          <button class="btn" id="xSwap" disabled>申请换方</button>
          <button class="btn" id="xResign" disabled>认输</button>
          <button class="btn" id="xRematch" disabled>再来一局</button>
          <button class="btn" id="xLeave" disabled>离开</button>
        </div>
      </div>

`;
must(`      <div class="card">
        <div class="card-label">棋谱</div>`, onlineCard + `      <div class="card">
        <div class="card-label">棋谱</div>`);

const css = `
  .head-actions{display:flex;align-items:center;gap:10px;}
  .hall-link{
    display:inline-flex;align-items:center;gap:5px;min-height:38px;padding:0 15px;border-radius:11px;
    border:1px solid rgba(224,85,70,.45);
    background:linear-gradient(180deg,rgba(224,85,70,.20),rgba(224,85,70,.08));
    color:#f0d9b5;text-decoration:none;font-family:"Noto Serif SC","Songti SC","KaiTi",serif;
    font-size:13px;font-weight:600;letter-spacing:.08em;
    box-shadow:0 4px 14px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.08);
  }
  .hall-link:hover{background:rgba(224,85,70,.26);border-color:rgba(224,85,70,.68);}
  @media (max-width:640px){.hall-link{min-height:34px;padding:0 11px;font-size:12px;}}
  .hidden{display:none !important;}
  .x-room-row{display:flex;gap:8px;margin-bottom:8px;}
  .x-room-row .btn{flex:0 0 auto;padding:9px 14px;}
  #xCode{
    flex:1;min-width:0;height:38px;border-radius:10px;border:1px solid rgba(255,255,255,.14);
    background:rgba(0,0,0,.28);color:#eef0f4;padding:0 10px;font:inherit;font-size:13px;
    letter-spacing:.14em;text-transform:uppercase;outline:none;
  }
  #xCode:focus{border-color:rgba(224,85,70,.55);}
  #xCode::placeholder{letter-spacing:.02em;text-transform:none;color:#6c7587;}
  .x-room-info{
    display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px dashed rgba(255,255,255,.16);
    border-radius:10px;margin-bottom:8px;font-size:11.5px;color:#a8b1c3;letter-spacing:.06em;
  }
  .x-room-info b{font-family:ui-monospace,Consolas,monospace;font-size:16px;letter-spacing:.14em;color:#f0d9b5;}
  .x-mini{
    margin-left:auto;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);
    color:#dfe3ea;border-radius:7px;padding:4px 9px;font-size:11px;cursor:pointer;font-family:inherit;
  }
  .x-online-status{font-size:13.5px;font-weight:600;color:#eef0f4;margin-top:2px;line-height:1.5;}
  .x-online-sub{font-size:11.5px;color:var(--muted);line-height:1.6;margin-top:4px;min-height:16px;}
  .x-color{font-size:12px;color:#a8b1c3;margin-top:8px;letter-spacing:.06em;}
  .x-color b{color:#f0d9b5;font-weight:600;}
  .x-actions{margin-top:10px;flex-wrap:wrap;}
  .x-actions .btn{flex:1 1 44%;font-size:12px;padding:8px 6px;}
`;
must('</style>', css + '\n</style>');

html = html.replace(/  \.icon-btn\{[\s\S]*?\}\n  \.icon-btn:hover\{[^}]*\}\n/, '');
const soundStart = html.indexOf('// ---------- 音效 ----------');
const soundEnd = html.indexOf('// ---------- 交互 ----------', soundStart);
if (soundStart < 0 || soundEnd < 0) throw new Error('sound block not found');
html = html.slice(0, soundStart) + html.slice(soundEnd);
must('  sound: true,\n', '');
must(`document.getElementById('soundBtn').addEventListener('click', function () {
  state.sound = !state.sound;
  this.textContent = state.sound ? '🔔' : '🔕';
  this.style.opacity = state.sound ? '1' : '.55';
  if (state.sound) playSound('move');
});

`, '');
must("  playSound(cap ? 'cap' : 'move');\n\n", '');
must("  if (chk) playSound('check');\n", '');
must("  playSound('win');\n", '');

must(`    if (state.targets.indexOf(i) >= 0) { attemptMove(state.sel, i); return; }`,
`    if (state.targets.indexOf(i) >= 0) {
      if (state.mode === 'online') { xUserTryMove(state.sel, i); return; }
      attemptMove(state.sel, i); return;
    }`);
must(`  if (state.mode === 'ai' && state.turn !== state.humanSide) return;`,
`  if (state.mode === 'ai' && state.turn !== state.humanSide) return;
  if (state.mode === 'online' && !xMyTurn()) return;`);
must(`  state.flip = (state.mode === 'ai' && state.humanSide === BLACK);`,
`  state.flip = (state.mode === 'ai' && state.humanSide === BLACK) || (state.mode === 'online' && typeof xMyColor === 'function' && xMyColor() === BLACK);`);

must('</body>', `<script>\n${online}\n</script>\n</body>`);

const pwaHead = `<link rel="manifest" href="../../manifest.webmanifest" />
<link rel="apple-touch-icon" sizes="180x180" href="../../assets/icons/apple-touch-icon.png" />
<script src="../../pwa.js" defer></script>`;

html = html.replace('</head>', pwaHead + '</head>');

fs.mkdirSync(path.join(ROOT, 'games', 'chinese-chess'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'games', 'chinese-chess', 'index.html'), html, 'utf8');
console.log('built games/chinese-chess/index.html', Buffer.byteLength(html), 'bytes');