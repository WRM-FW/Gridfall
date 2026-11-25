import fs from 'node:fs';
import { pwaHead, ensureViewportCover } from './src/pwa-head.mjs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
let html = fs.readFileSync(path.join(ROOT, 'tools', 'design', 'uno-reference.html'), 'utf8');
const online = fs.readFileSync(path.join(ROOT, 'tools', 'src', 'uno-online.js'), 'utf8');

function must(old, neu) {
  if (!html.includes(old)) throw new Error('UNO pattern missing: ' + old.slice(0, 90));
  html = html.split(old).join(neu);
}

must('<title>UNO — 三人/四人人机对战</title>', '<title>UNO · Gridfall</title>\n  <link rel="canonical" href="../../uno" />');

must('      <div class="topbar-actions">', `      <div class="topbar-actions">
        <a class="icon-btn hall-btn" href="../../index.html" title="返回 Gridfall 首页" aria-label="返回 Gridfall 首页"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg><span class="btn-text">首页</span></a>
        <button class="icon-btn" id="btn-online" title="联机对战"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg><span class="btn-text">联机</span></button>`);

const onlineModal = `    <!-- Online Lobby Modal -->
    <div class="modal-backdrop" id="online-modal">
      <div class="modal-card online-card">
        <div>
          <h2 class="modal-title">UNO 联机</h2>
          <p class="modal-subtitle" id="online-sub">3 或 4 人房 · 房主权威同步 · 满员后由房主（玩家A）开局</p>
        </div>
        <div id="online-setup">
          <div class="mode-pill online-count" role="group" aria-label="联机人数">
            <button class="mode-btn active" type="button" data-netplayers="3">3 人房</button>
            <button class="mode-btn" type="button" data-netplayers="4">4 人房</button>
          </div>
          <div class="online-grid">
            <button class="btn-solid" id="online-create" type="button">创建房间</button>
            <input class="online-input" id="online-code" maxlength="6" placeholder="输入 6 位房间码" autocomplete="off" spellcheck="false">
            <button class="btn-outline" id="online-join" type="button">加入房间</button>
          </div>
          <p class="online-tip">房主创建房间后把 6 位房间码发给朋友；3 人房需 3 人、4 人房需 4 人才能开局。</p>
        </div>
        <div id="online-room" class="hidden">
          <div class="online-code-row"><span>房间码</span><b id="online-room-code">------</b><button class="btn-outline" id="online-copy" type="button">复制</button></div>
          <div class="online-players" id="online-players"></div>
          <div class="online-status" id="online-status">等待玩家加入</div>
          <div class="online-actions">
            <button class="btn-solid" id="online-start" type="button">开始对局</button>
            <button class="btn-outline" id="online-leave" type="button">离开房间</button>
          </div>
        </div>
        <div class="modal-footer"><button class="btn-outline" id="online-close" type="button">关闭</button></div>
      </div>
    </div>

    <!-- Rules & Settings Modal -->`;
must('    <!-- Rules & Settings Modal -->', onlineModal);

const css = `
  .hall-btn{text-decoration:none;}
  .hidden{display:none !important;}
  .online-card{max-width:460px;}
  .online-count{display:flex;width:100%;margin:4px 0 12px;}
  .online-count .mode-btn{flex:1;}
  .online-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;align-items:center;}
  .online-grid .btn-solid{grid-column:1 / -1;}
  .online-input{
    width:100%;height:38px;border-radius:10px;border:1px solid var(--border-subtle);
    background:var(--bg-surface);color:var(--text-primary);padding:0 10px;font:inherit;
    letter-spacing:.12em;text-transform:uppercase;outline:none;
  }
  .online-input:focus{border-color:var(--accent-red);}
  .online-tip{font-size:12px;line-height:1.6;color:var(--text-secondary);margin:10px 0 0;}
  .online-code-row{display:flex;align-items:center;gap:8px;padding:9px 11px;border:1px dashed var(--border-strong);border-radius:10px;margin-bottom:10px;font-size:12px;color:var(--text-secondary);}
  .online-code-row b{font-family:ui-monospace,Consolas,monospace;font-size:18px;letter-spacing:.14em;color:var(--accent-gold);}
  .online-code-row .btn-outline{margin-left:auto;padding:5px 9px;font-size:11px;}
  .online-players{display:flex;flex-direction:column;gap:6px;margin:8px 0 10px;}
  .online-player{display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border-radius:9px;background:var(--bg-surface-muted);font-size:13px;}
  .online-player.me{outline:1px solid var(--accent-red);}
  .online-player b{font-weight:700;color:var(--text-primary);}
  .online-empty{font-size:12.5px;color:var(--text-secondary);padding:10px;text-align:center;}
  .online-status{font-size:12.5px;line-height:1.55;color:var(--text-secondary);margin:6px 0 10px;min-height:18px;}
  .online-actions{display:flex;gap:8px;flex-wrap:wrap;}
  .online-actions .btn-solid,.online-actions .btn-outline{flex:1;min-width:120px;}
  @media (max-width:480px){
    .topbar{padding:0 6px;gap:3px;}
    .brand{gap:3px;}
    .mode-btn{padding:4px 4px;font-size:10px;}
    .topbar-actions{gap:2px;}
    .topbar-actions .icon-btn{height:28px;padding:0 4px;font-size:10.5px;}
    .topbar-actions #btn-speed{display:none;}
  }
`;
must('</head>', '<style>' + css + '</style>\n</head>');

must('    })();\n  </script>', online + '\n    })();\n  </script>');

html = ensureViewportCover(html).replace('</head>', pwaHead('../../', 'uno') + '</head>');

fs.mkdirSync(path.join(ROOT, 'games', 'uno'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'games', 'uno', 'index.html'), html, 'utf8');
console.log('built games/uno/index.html', Buffer.byteLength(html), 'bytes');