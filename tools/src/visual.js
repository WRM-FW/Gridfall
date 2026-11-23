/* ============================================================
   Gridfall 视觉层：木纹盘面 + 陶瓷棋子（Canvas）
   —— 直接复用素材库 01_木质棋盘陶瓷棋子以及配套UI.html 的绘制与 CSS
   ============================================================ */
"use strict";

var BOARD_W = 1240, BOARD_PAD = 92;
var woodCanvas = null;
var gHover = null, wHover = null;
var switchGame;

function seededRand(seed){ var s = seed >>> 0; return function(){ s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

function makeWood(){
  if (woodCanvas) return woodCanvas;
  var W = BOARD_W, c = document.createElement("canvas");
  c.width = W; c.height = W;
  var g = c.getContext("2d"), rnd = seededRand(20261123);
  var base = g.createLinearGradient(0, 0, W, 0);
  base.addColorStop(0, "#dfae5e"); base.addColorStop(.25, "#e7ba6c");
  base.addColorStop(.5, "#e2b263"); base.addColorStop(.78, "#e9bf71"); base.addColorStop(1, "#dcab5b");
  g.fillStyle = base; g.fillRect(0, 0, W, W);
  for (var i = 0; i < 26; i++) {
    var x = rnd() * W, y = rnd() * W, r = 120 + rnd() * 320;
    var rg = g.createRadialGradient(x, y, 0, x, y, r);
    var dark = rnd() > 0.5;
    rg.addColorStop(0, dark ? "rgba(166,110,32,0.10)" : "rgba(255,230,170,0.10)");
    rg.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (var j = 0; j < 210; j++) {
    var gx = rnd() * W, amp = 2 + rnd() * 7, per = 260 + rnd() * 420, ph = rnd() * 6.28;
    var alpha = 0.04 + rnd() * 0.11, lw = 0.6 + rnd() * 1.7;
    g.strokeStyle = "rgba(122,74,18," + alpha.toFixed(3) + ")";
    g.lineWidth = lw; g.beginPath();
    for (var yy = -10; yy <= W + 10; yy += 14) {
      var xx = gx + Math.sin(yy / per * 6.28 + ph) * amp + Math.sin(yy / 47 + ph * 2) * 1.2;
      if (yy === -10) g.moveTo(xx, yy); else g.lineTo(xx, yy);
    }
    g.stroke();
  }
  for (var k = 0; k < 14; k++) {
    var mx = rnd() * W, amp2 = 3 + rnd() * 6, per2 = 300 + rnd() * 300, ph2 = rnd() * 6.28;
    g.strokeStyle = "rgba(96,54,10," + (0.13 + rnd() * 0.1).toFixed(3) + ")";
    g.lineWidth = 1.6 + rnd() * 1.6; g.beginPath();
    for (var y2 = -10; y2 <= W + 10; y2 += 12) {
      var x2 = mx + Math.sin(y2 / per2 * 6.28 + ph2) * amp2;
      if (y2 === -10) g.moveTo(x2, y2); else g.lineTo(x2, y2);
    }
    g.stroke();
  }
  for (var q = 0; q < 2; q++) {
    var kx = 120 + rnd() * (W - 240), ky = 120 + rnd() * (W - 240);
    for (var rr = 16; rr > 2; rr -= 3) {
      g.strokeStyle = "rgba(100,58,12," + (0.10 + (16 - rr) * 0.012).toFixed(3) + ")";
      g.lineWidth = 1.4; g.beginPath();
      g.ellipse(kx, ky, rr * 0.7, rr * 1.25, 0.2, 0, 6.29); g.stroke();
    }
    g.fillStyle = "rgba(88,48,8,0.35)";
    g.beginPath(); g.ellipse(kx, ky, 2.6, 4.4, 0.2, 0, 6.29); g.fill();
  }
  var vg = g.createRadialGradient(W / 2, W / 2, W * 0.32, W / 2, W / 2, W * 0.74);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(94,54,6,0.16)");
  g.fillStyle = vg; g.fillRect(0, 0, W, W);
  var hl = g.createLinearGradient(0, 0, 0, W);
  hl.addColorStop(0, "rgba(255,240,200,0.10)"); hl.addColorStop(.5, "rgba(255,240,200,0)"); hl.addColorStop(1, "rgba(80,44,4,0.06)");
  g.fillStyle = hl; g.fillRect(0, 0, W, W);
  woodCanvas = c; return c;
}

function drawStone(g, cx, cy, r, color, alpha){
  g.save(); g.globalAlpha = alpha == null ? 1 : alpha;
  g.beginPath(); g.ellipse(cx + r * 0.10, cy + r * 0.16, r * 0.98, r * 0.92, 0, 0, 6.29);
  g.fillStyle = "rgba(43,22,2,0.34)"; g.fill();
  g.beginPath(); g.ellipse(cx + r * 0.05, cy + r * 0.08, r * 0.99, r * 0.95, 0, 0, 6.29);
  g.fillStyle = "rgba(43,22,2,0.20)"; g.fill();
  var grad;
  if (color === 1) {
    grad = g.createRadialGradient(cx - r * 0.38, cy - r * 0.42, r * 0.1, cx, cy, r * 1.05);
    grad.addColorStop(0, "#7d7d84"); grad.addColorStop(.28, "#3a3a40");
    grad.addColorStop(.62, "#131316"); grad.addColorStop(1, "#000000");
  } else {
    grad = g.createRadialGradient(cx - r * 0.38, cy - r * 0.42, r * 0.1, cx, cy, r * 1.08);
    grad.addColorStop(0, "#ffffff"); grad.addColorStop(.35, "#fdfaf2");
    grad.addColorStop(.72, "#efe7d6"); grad.addColorStop(1, "#cfc2a8");
  }
  g.beginPath(); g.arc(cx, cy, r, 0, 6.29); g.fillStyle = grad; g.fill();
  g.beginPath(); g.arc(cx, cy, r * 0.965, 0, 6.29);
  g.strokeStyle = color === 1 ? "rgba(210,220,235,0.20)" : "rgba(120,96,52,0.28)";
  g.lineWidth = r * 0.045; g.stroke();
  var hg = g.createRadialGradient(cx - r * 0.40, cy - r * 0.46, 0, cx - r * 0.40, cy - r * 0.46, r * 0.52);
  hg.addColorStop(0, color === 1 ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.95)");
  hg.addColorStop(1, "rgba(255,255,255,0)");
  g.beginPath(); g.ellipse(cx - r * 0.38, cy - r * 0.44, r * 0.34, r * 0.22, -0.6, 0, 6.29);
  g.fillStyle = hg; g.fill();
  g.beginPath(); g.ellipse(cx + r * 0.18, cy + r * 0.52, r * 0.36, r * 0.16, -0.4, 0, 6.29);
  g.fillStyle = color === 1 ? "rgba(190,200,215,0.13)" : "rgba(255,255,255,0.35)";
  g.fill();
  g.restore();
}

function starPointsFor(n){
  var pts = [];
  if (n === 15) { var a = [3, 7, 11]; for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) pts.push([a[i], a[j]]); }
  else if (n === 19) { var b = [3, 9, 15]; for (var i2 = 0; i2 < 3; i2++) for (var j2 = 0; j2 < 3; j2++) pts.push([b[i2], b[j2]]); }
  else if (n === 13) { pts = [[3,3],[9,3],[3,9],[9,9],[6,6],[3,6],[9,6],[6,3],[6,9]]; }
  else if (n === 9) { pts = [[2,2],[6,2],[2,6],[6,6],[4,4]]; }
  return pts;
}

/* view: {size, game, board(2D), last:[r,c], winLine:[r1,c1,r2,c2], forbidden:[[r,c]],
          candidates:[[r,c]], ko:[r,c], hover:[r,c], turn, over} */
function drawBoard(cv, view){
  if (!cv) return;
  var n = view.size, cell = (BOARD_W - BOARD_PAD * 2) / (n - 1);
  var ctx = cv.getContext("2d");
  ctx.clearRect(0, 0, BOARD_W, BOARD_W);
  ctx.drawImage(makeWood(), 0, 0);
  ctx.fillStyle = "rgba(74,44,8,0.85)"; ctx.font = "600 25px sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  var letters = "ABCDEFGHJKLMNOPQRST";
  for (var i = 0; i < n; i++) {
    var p = BOARD_PAD + i * cell;
    if (view.game === "go") ctx.fillText(letters[i], p, BOARD_PAD - 46);
    ctx.fillText(String(n - i), BOARD_PAD - 48, p);
  }
  ctx.strokeStyle = "rgba(66,38,6,0.88)"; ctx.lineWidth = 2;
  for (var a = 0; a < n; a++) {
    var pa = BOARD_PAD + a * cell;
    ctx.beginPath(); ctx.moveTo(BOARD_PAD, pa); ctx.lineTo(BOARD_W - BOARD_PAD, pa); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pa, BOARD_PAD); ctx.lineTo(pa, BOARD_W - BOARD_PAD); ctx.stroke();
  }
  ctx.lineWidth = 3.4; ctx.strokeStyle = "rgba(52,29,3,0.95)";
  ctx.strokeRect(BOARD_PAD, BOARD_PAD, BOARD_W - BOARD_PAD * 2, BOARD_W - BOARD_PAD * 2);
  ctx.fillStyle = "rgba(52,29,3,0.92)";
  starPointsFor(n).forEach(function(pt){
    ctx.beginPath(); ctx.arc(BOARD_PAD + pt[0] * cell, BOARD_PAD + pt[1] * cell, n >= 19 ? 7 : 8.5, 0, 6.29); ctx.fill();
  });
  var r = cell * 0.475, board = view.board;
  for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) {
    var v = board[y][x]; if (!v) continue;
    drawStone(ctx, BOARD_PAD + x * cell, BOARD_PAD + y * cell, r, v, 1);
  }
  if (view.forbidden && view.forbidden.length) {
    ctx.strokeStyle = "rgba(179,55,42,0.9)"; ctx.lineWidth = 4; ctx.lineCap = "round";
    view.forbidden.forEach(function(f){
      var cxp = BOARD_PAD + f[1] * cell, cyp = BOARD_PAD + f[0] * cell, d = cell * 0.17;
      ctx.beginPath();
      ctx.moveTo(cxp - d, cyp - d); ctx.lineTo(cxp + d, cyp + d);
      ctx.moveTo(cxp + d, cyp - d); ctx.lineTo(cxp - d, cyp + d);
      ctx.stroke();
    });
  }
  if (view.ko) {
    ctx.strokeStyle = "rgba(179,55,42,0.95)"; ctx.lineWidth = 3.5;
    ctx.strokeRect(BOARD_PAD + view.ko[1] * cell - cell * 0.21, BOARD_PAD + view.ko[0] * cell - cell * 0.21, cell * 0.42, cell * 0.42);
  }
  if (view.candidates && view.candidates.length) {
    view.candidates.forEach(function(cd, idx){
      var cxp = BOARD_PAD + cd[1] * cell, cyp = BOARD_PAD + cd[0] * cell;
      ctx.beginPath(); ctx.arc(cxp, cyp, cell * 0.30, 0, 6.29);
      ctx.fillStyle = "rgba(179,55,42,0.92)"; ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "700 " + Math.round(cell * 0.34) + "px sans-serif";
      ctx.fillText(String(idx + 1), cxp, cyp + 1);
    });
  }
  if (view.hover) {
    var hx = view.hover[1], hy = view.hover[0];
    if (hx >= 0 && hy >= 0 && hx < n && hy < n && !board[hy][hx]) {
      var bad = view.badHover;
      drawStone(ctx, BOARD_PAD + hx * cell, BOARD_PAD + hy * cell, r, view.turn, bad ? 0.25 : 0.55);
      if (bad) {
        var cxp2 = BOARD_PAD + hx * cell, cyp2 = BOARD_PAD + hy * cell, d2 = cell * 0.2;
        ctx.strokeStyle = "rgba(179,55,42,0.95)"; ctx.lineWidth = 5; ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(cxp2 - d2, cyp2 - d2); ctx.lineTo(cxp2 + d2, cyp2 + d2);
        ctx.moveTo(cxp2 + d2, cyp2 - d2); ctx.lineTo(cxp2 - d2, cyp2 + d2);
        ctx.stroke();
      }
    }
  }
  if (view.last && board[view.last[0]][view.last[1]]) {
    ctx.beginPath();
    ctx.arc(BOARD_PAD + view.last[1] * cell, BOARD_PAD + view.last[0] * cell, Math.max(5, cell * 0.11), 0, 6.29);
    ctx.fillStyle = "#d42a1e"; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = "rgba(255,255,255,0.75)"; ctx.stroke();
  }
  if (view.winLine && view.over) {
    ctx.strokeStyle = "rgba(212,42,30,0.85)"; ctx.lineWidth = 6; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(BOARD_PAD + view.winLine[1] * cell, BOARD_PAD + view.winLine[0] * cell);
    ctx.lineTo(BOARD_PAD + view.winLine[3] * cell, BOARD_PAD + view.winLine[2] * cell);
    ctx.stroke();
  }
}

function cellAt(evt, cv, n){
  var rect = cv.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  var x = (evt.clientX - rect.left) / rect.width * BOARD_W;
  var y = (evt.clientY - rect.top) / rect.height * BOARD_W;
  var cell = (BOARD_W - BOARD_PAD * 2) / (n - 1);
  var c = Math.round((x - BOARD_PAD) / cell), r = Math.round((y - BOARD_PAD) / cell);
  if (r < 0 || c < 0 || r >= n || c >= n) return null;
  var px = BOARD_PAD + c * cell, py = BOARD_PAD + r * cell;
  if (Math.abs(x - px) > cell * 0.52 || Math.abs(y - py) > cell * 0.52) return null;
  return [r, c];
}

function freshCanvas(id){
  var old = document.getElementById(id);
  var c = document.createElement("canvas");
  c.id = id; c.width = BOARD_W; c.height = BOARD_W;
  if (old && old.parentNode) old.parentNode.replaceChild(c, old);
  return c;
}
var gCanvas = freshCanvas("gBoard");
var wCanvas = freshCanvas("wBoard");
var nCanvas = freshCanvas("nBoard");

/* ---------------- 五子棋渲染 ---------------- */
var _gRender = (typeof gRender === "function") ? gRender : null;

function gRenderBoard(upto){
  var hist = (upto !== undefined) ? G.history.slice(0, upto) : G.history;
  var bd = gEmptyBoard();
  hist.forEach(function(m){ bd[m.r][m.c] = m.color; });
  var last = (upto === undefined && G.replay < 0 && hist.length) ? hist[hist.length - 1] : null;
  var forb = [];
  if (G.showMarks && G.rule === "renju" && !G.over && G.turn === 1 && G.replay < 0 && (G.phase === "play" || G.phase === "offer5")) {
    for (var r = 0; r < 15; r++) for (var c = 0; c < 15; c++) {
      if (bd[r][c] === 0 && forbiddenAt(bd, r, c, 0)) forb.push([r, c]);
    }
  }
  var badHover = false;
  if (gHover && G.rule === "renju" && G.turn === 1 && G.phase !== "select" && G.phase !== "swap") {
    badHover = !!forbiddenAt(bd, gHover[0], gHover[1], 0);
  }
  drawBoard(gCanvas, {
    size: 15, game: "gomoku", board: bd,
    last: last ? [last.r, last.c] : null,
    winLine: (G.winLine && G.replay < 0) ? G.winLine : null,
    forbidden: forb,
    candidates: (G.replay < 0) ? G.candidates : [],
    hover: (G.replay < 0 && !G.over && !G.thinking && gIsUserTurn()) ? gHover : null,
    badHover: badHover,
    turn: G.turn, over: G.over
  });
  gCanvas.classList.toggle("no-turn", G.over || G.thinking || G.replay >= 0 || !gIsUserTurn());
}

if (_gRender) {
  gRender = function(){
    _gRender();
    var mc = document.getElementById("gMoveCount");
    if (mc) mc.textContent = G.history.length;
    var lt = document.getElementById("gLastText");
    if (lt) {
      var h = G.history;
      lt.textContent = h.length ? ((h[h.length - 1].color === 1 ? "⚫ " : "⚪ ") + coordName(h[h.length - 1].r, h[h.length - 1].c)) : "—";
    }
  };
}

gCanvas.addEventListener("click", function(e){
  if (document.getElementById("secGomoku").classList.contains("hidden")) return;
  var cell = cellAt(e, gCanvas, 15);
  if (cell) gUserMove(cell[0], cell[1]);
});
gCanvas.addEventListener("mousemove", function(e){
  if (!G || G.over || G.thinking || G.replay >= 0 || !gIsUserTurn()) { if (gHover) { gHover = null; gRenderBoard(); } return; }
  var cell = cellAt(e, gCanvas, 15);
  var empty = cell && G.board[cell[0]][cell[1]] === 0;
  var next = empty ? cell : null;
  if ((next && !gHover) || (!next && gHover) || (next && gHover && (next[0] !== gHover[0] || next[1] !== gHover[1]))) {
    gHover = next; gRenderBoard();
  }
});
gCanvas.addEventListener("mouseleave", function(){ if (gHover) { gHover = null; gRenderBoard(); } });

/* ---------------- 围棋渲染 ---------------- */
wRender = function(){
  var n = W.size;
  drawBoard(wCanvas, {
    size: n, game: "go", board: W.board,
    last: W.lastMove,
    winLine: null, forbidden: [], candidates: [],
    ko: Array.isArray(W.koPoint) ? W.koPoint : null,
    hover: (!W.over && !W.thinking && !(W.opp === "ai" && W.turn !== W.playerColor)) ? wHover : null,
    badHover: false,
    turn: W.turn, over: W.over
  });
  wCanvas.classList.toggle("no-turn", W.over || W.thinking || (W.opp === "ai" && W.turn !== W.playerColor));

  var st = document.getElementById("wStatus");
  var turnTxt = W.over ? "对局结束" : (W.thinking ? "电脑思考中…" : "轮到 " + colName(W.turn) + " 落子");
  st.innerHTML = "<b>" + turnTxt + "</b> · " + (W.opp === "ai" ? ("你执" + colName(W.playerColor) + " · 难度 " + ["","简单","一般","普通","困难","极难"][W.level]) : "双人对弈") + " · " + n + " 路"
    + "<br>提子 — 黑提 " + W.capB + " 子 · 白提 " + W.capW + " 子"
    + (W.msg ? '<br><span class="' + (W.msgType === "warn" ? "warn" : "okmsg") + '">' + W.msg + "</span>" : "");
  var res = document.getElementById("wResult");
  if (W.over) {
    res.classList.add("show");
    if (W.scoreInfo) {
      var sc = W.scoreInfo;
      res.className = "result show " + (W.opp !== "ai" || W.winner === W.playerColor ? "win" : "lose");
      res.textContent = "终局数子：黑 " + sc.black + "（活子 " + sc.bStones + " + 空 " + sc.bTerr + "） · 白 " + sc.white.toFixed(1) + "（活子 " + sc.wStones + " + 空 " + sc.wTerr + " + 贴目 7.5）→ " + colName(W.winner) + "胜 " + sc.diff.toFixed(1) + " 子（目）。";
    } else {
      res.className = "result show " + (W.opp !== "ai" || W.winner === W.playerColor ? "win" : "lose");
      res.textContent = colName(W.winner) + "获胜（对方认输）。";
    }
  } else { res.className = "result"; res.textContent = ""; }
  var lvN = ["","简单","一般","普通","困难","极难"];
  var lines = Object.keys(W.stats).map(function(k){
    var v = W.stats[k], p = k.split("|");
    return p[0] + " · " + (lvN[parseInt(p[1], 10)] || p[1]) + " · " + p[2] + "：" + v.w + " 胜 " + v.l + " 负 " + v.d + " 和";
  });
  document.getElementById("wStats").textContent = lines.length ? ("战绩（本页内） — " + lines.join("；")) : "战绩（本页内）：暂无已结束对局";
  var colLetters = "ABCDEFGHJKLMNOPQRSTUVWXYZ";
  document.getElementById("wMoves").innerHTML = W.history.map(function(m, i){
    return "<span>" + (i + 1) + ". " + (m.color === 1 ? "⚫" : "⚪") + " " + (m.pass ? "停一手" : (colLetters[m.c] + (n - m.r))) + "</span>";
  }).join("");
  document.getElementById("wMoves").scrollTop = document.getElementById("wMoves").scrollHeight;
  document.getElementById("wMoveCount").textContent = W.history.length;
  document.getElementById("wCapB").textContent = W.capB;
  document.getElementById("wCapW").textContent = W.capW;
  document.getElementById("wPass").disabled = W.over || W.thinking;
  document.getElementById("wUndo").disabled = W.thinking || W.history.length === 0;
  document.getElementById("wResign").disabled = W.over;
  wUpdateTimers();
};

wCanvas.addEventListener("click", function(e){
  if (document.getElementById("secGo").classList.contains("hidden")) return;
  var cell = cellAt(e, wCanvas, W.size);
  if (cell) wUserMove(cell[0], cell[1]);
});
wCanvas.addEventListener("mousemove", function(e){
  if (!W || W.over || W.thinking || (W.opp === "ai" && W.turn !== W.playerColor)) { if (wHover) { wHover = null; wRender(); } return; }
  var cell = cellAt(e, wCanvas, W.size);
  var empty = cell && W.board[cell[0]][cell[1]] === 0;
  var next = empty ? cell : null;
  if ((next && !wHover) || (!next && wHover) || (next && wHover && (next[0] !== wHover[0] || next[1] !== wHover[1]))) {
    wHover = next; wRender();
  }
});
wCanvas.addEventListener("mouseleave", function(){ if (wHover) { wHover = null; wRender(); } });

/* ---------------- 顶部标签 / 规则 / 下载 ---------------- */
switchGame = function(which){
  var map = { gomoku: ["tabGomoku", "secGomoku"], go: ["tabGo", "secGo"], online: ["tabOnline", "secOnline"] };
  Object.keys(map).forEach(function(k){
    var t = document.getElementById(map[k][0]), s = document.getElementById(map[k][1]);
    if (t) t.classList.toggle("active", k === which);
    if (s) s.classList.toggle("hidden", k !== which);
  });
  if (which === "gomoku") gRender();
  else if (which === "go") wRender();
  else if (typeof onlineEnterTab === "function") onlineEnterTab();
};
document.getElementById("tabGomoku").addEventListener("click", function(){ switchGame("gomoku"); });
document.getElementById("tabGo").addEventListener("click", function(){ switchGame("go"); });
document.getElementById("tabOnline").addEventListener("click", function(){ switchGame("online"); });

function openRules(){ var m = document.getElementById("rulesModal"); if (m) m.classList.add("show"); }
["gRules", "wRules", "nRules"].forEach(function(id){ var el = document.getElementById(id); if (el) el.addEventListener("click", openRules); });
document.getElementById("rulesClose").addEventListener("click", function(){ document.getElementById("rulesModal").classList.remove("show"); });
document.getElementById("rulesModal").addEventListener("click", function(e){ if (e.target === this) this.classList.remove("show"); });

var toastTimer = null;
function toastMsg(msg){
  var el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg; el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ el.classList.remove("show"); }, 2200);
}

/* 初始渲染 */
try { gRender(); } catch (e) { console.warn(e); }
try { wRender(); } catch (e) { console.warn(e); }
try { if (typeof onlineInit === "function") onlineInit(); } catch (e) { console.warn(e); }