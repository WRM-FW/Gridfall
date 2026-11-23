/* ============================================================
   Gridfall 联机：Supabase Realtime Broadcast + Presence
   房主权威状态机；客户端只渲染快照
   ============================================================ */
"use strict";

var NET = {
  inited: false, loading: null,
  client: null, channel: null, code: "", role: "", clientId: "",
  hostClientId: "", guestClientId: "",
  connected: false, subscribed: false, hostPresent: false, guestPresent: false,
  settings: { game: "gomoku", rule: "free", openingMode: "free", size: 19 },
  state: null, lastSeq: -1, seq: 0, lastResultSeq: -1,
  rematch: { host: false, guest: false },
  record: { win: 0, lose: 0 },
  hover: null, busy: false, left: false, started: false, enterTimer: null, opponentGone: false, lastSeen: 0, hbTimer: null,
  lastSaved: null
};

function netId(){
  try {
    var k = "gridfall_cid";
    var v = sessionStorage.getItem(k);
    if (!v) { v = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : ("c" + Math.random().toString(36).slice(2) + Date.now().toString(36)); sessionStorage.setItem(k, v); }
    return v;
  } catch (e) { return "c" + Math.random().toString(36).slice(2); }
}

function netCode(){
  var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", s = "";
  for (var i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function netColorName(c){ return c === 1 ? "黑棋" : (c === 2 ? "白棋" : "—"); }
function netMyColor(){ if (!NET.state) return 0; var h = NET.state.finalHostColor || 1; return NET.role === "host" ? h : (3 - h); }
function netHostColor(){ return (NET.state && NET.state.finalHostColor) || 1; }
function netColorOfSide(side){ return side === "host" ? netHostColor() : (3 - netHostColor()); }
function netSideOfColor(c){ return c === netHostColor() ? "host" : "guest"; }

function netActorSide(){
  var st = NET.state;
  if (!st || st.over) return null;
  if (st.game === "go") return netSideOfColor(st.turn);
  if (st.rule === "renju" && st.openingMode === "formal") {
    if (st.phase === "select") return "host";
    if (st.phase === "swap") return "guest";
    if (st.phase === "move4" || st.phase === "choose5" || st.phase === "move6") return netSideOfColor(2);
    if (st.phase === "offer5") return netSideOfColor(1);
  }
  return netSideOfColor(st.turn);
}
function netIsMyTurn(){ return !!NET.state && !NET.state.over && netActorSide() === NET.role; }

function netSetConn(text, cls){
  var el = document.getElementById("nConn");
  if (el) el.textContent = text;
  var st = document.getElementById("nStatus");
  if (st && cls) st.className = "status" + (cls === "warn" ? " warn" : "");
}
function netSetStatus(main, sub){
  var a = document.getElementById("nStatus");
  if (a) a.textContent = main;
  var b = document.getElementById("nSubStatus");
  if (b && sub !== undefined) b.textContent = sub;
}
function netToast(msg){ if (typeof toastMsg === "function") toastMsg(msg); }

function netLoadScript(src){
  return new Promise(function(res, rej){
    var s = document.createElement("script");
    s.src = src; s.async = true; s.setAttribute("data-online", "1");
    s.onload = function(){ res(); };
    s.onerror = function(){ rej(new Error("无法加载 " + src)); };
    document.head.appendChild(s);
  });
}
function netEnsureLibs(){
  if (window.supabase && window.GRIDFALL_SUPABASE) return Promise.resolve();
  if (NET.loading) return NET.loading;
  NET.loading = Promise.resolve().then(function(){
    if (!window.GRIDFALL_SUPABASE) return netLoadScript("supabase-config.js");
  }).then(function(){
    if (!window.supabase) return netLoadScript("supabase.js");
  }).catch(function(err){
    NET.loading = null;
    throw err;
  });
  return NET.loading;
}

function netSaveSession(){
  try { sessionStorage.setItem("gridfall_net", JSON.stringify({ code: NET.code, role: NET.role, clientId: NET.clientId })); } catch (e) {}
}
function netClearSession(){
  try { sessionStorage.removeItem("gridfall_net"); } catch (e) {}
}

function netSendIntent(type, data){
  if (!NET.channel) return;
  var payload = { from: NET.clientId, fromSide: NET.role, type: type };
  if (data) Object.keys(data).forEach(function(k){ payload[k] = data[k]; });
  NET.channel.send({ type: "broadcast", event: "intent", payload: payload });
}
function netBroadcastState(){
  if (!NET.channel || NET.role !== "host" || !NET.state) return;
  NET.state.seq = ++NET.seq;
  NET.channel.send({ type: "broadcast", event: "state", payload: { from: NET.clientId, fromSide: "host", state: NET.state } });
  netNoteResult();
  netRender();
}
function netBroadcastBye(){
  if (NET.channel) NET.channel.send({ type: "broadcast", event: "bye", payload: { from: NET.clientId, fromSide: NET.role } });
}
function netSendReject(msg){
  if (NET.channel) NET.channel.send({ type: "broadcast", event: "reject", payload: { from: NET.clientId, msg: msg } });
}

/* ---------------- 连接 / 房间 ---------------- */
function netConnect(){
  if (!window.supabase || !window.GRIDFALL_SUPABASE) return;
  NET.state = null; NET.lastSeq = -1; NET.seq = 0; NET.lastResultSeq = -1;
  NET.rematch = { host: false, guest: false };
  NET.left = false; NET.started = false; NET.busy = false; NET.opponentGone = false;
  NET.hostClientId = ""; NET.guestClientId = "";

  var client = supabase.createClient(window.GRIDFALL_SUPABASE.url, window.GRIDFALL_SUPABASE.key, {
    realtime: { params: { eventsPerSecond: 20 } }
  });
  NET.client = client;
  var ch = client.channel("gridfall-room-" + NET.code, {
    config: { broadcast: { self: false, ack: true }, presence: { key: NET.clientId } }
  });
  NET.channel = ch;

  ch.on("broadcast", { event: "intent" }, function(p){ if (NET.role === "host") netHostIntent(p.payload); });
  ch.on("broadcast", { event: "state" }, function(p){ if (NET.role === "guest") netGuestState(p.payload); });
  ch.on("broadcast", { event: "ping" }, function(p){ NET.lastSeen = Date.now(); if (NET.role === "guest" && NET.channel) NET.channel.send({ type: "broadcast", event: "pong", payload: { from: NET.clientId } }); });
  ch.on("broadcast", { event: "pong" }, function(p){ NET.lastSeen = Date.now(); });
  ch.on("broadcast", { event: "reject" }, function(p){
    if (p && p.payload && p.payload.from !== NET.clientId) { NET.busy = false; netToast(p.payload.msg || "落子被拒绝"); netRender(); }
  });
  ch.on("broadcast", { event: "bye" }, function(p){
    if (p && p.payload && p.payload.from !== NET.clientId) netOpponentLeft(p.payload.fromSide === "host" ? "房主已离开，房间关闭。" : "对方已离开，等待重连…");
  });
  ch.on("presence", { event: "sync" }, netSyncPresence);
  ch.on("presence", { event: "join" }, netSyncPresence);
  ch.on("presence", { event: "leave" }, netSyncPresence);

  netSetStatus("正在连接联机服务…", "");
  ch.subscribe(function(status){
    if (status === "SUBSCRIBED") {
      NET.subscribed = true; NET.connected = true;
      ch.track({ role: NET.role, clientId: NET.clientId, at: Date.now() });
      NET.lastSeen = Date.now();
      if (NET.hbTimer) clearInterval(NET.hbTimer);
      NET.hbTimer = setInterval(netHeartbeat, 5000);
      netSaveSession();
      netSetConn("已连接");
      netUpdateLobby();
      if (NET.role === "guest") {
        netSendIntent("hello");
        if (NET.enterTimer) clearTimeout(NET.enterTimer);
        NET.enterTimer = setTimeout(function(){
          if (NET.role === "guest" && !NET.state && !NET.hostPresent) {
            netSetStatus("房间不存在或房主已离开", "请核对房间码后重试。");
            netSetConn("无房主", "warn");
          }
        }, 2600);
      } else {
        netSyncPresence();
      }
      netRender();
    } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
      NET.connected = false; NET.subscribed = false;
      netSetConn(status === "CLOSED" ? "已断开" : "重试中", "warn");
      if (NET.role === "guest" && NET.state) netSetStatus("连接中断，正在自动重连…");
      netUpdateLobby(); netRender();
    }
  });
}

function netHeartbeat(){
  if (!NET.connected || !NET.state) return;
  var now = Date.now();
  if (NET.role === "host" && NET.channel && NET.guestPresent) {
    NET.channel.send({ type: "broadcast", event: "ping", payload: { from: NET.clientId, at: now } });
  }
  if (!NET.opponentGone && now - NET.lastSeen > 18000) {
    netOpponentLeft(NET.role === "host" ? "对手已离开，等待重连…" : "房主已离开，房间关闭。");
  }
}

function netSyncPresence(){
  if (!NET.channel) return;
  var ps = NET.channel.presenceState(), hosts = [], guests = [];
  Object.keys(ps).forEach(function(k){
    ps[k].forEach(function(m){
      if (!m || m.clientId === NET.clientId) return;
      if (m.role === "host") hosts.push(m);
      if (m.role === "guest") guests.push(m);
    });
  });
  NET.hostPresent = (NET.role === "host") || hosts.length > 0;
  NET.guestPresent = (NET.role === "guest") || guests.length > 0;
  if ((NET.role === "host" && guests.length) || (NET.role === "guest" && hosts.length)) NET.opponentGone = false;

  if (NET.role === "guest") {
    if (hosts.length) {
      NET.hostClientId = hosts[0].clientId;
      NET.lastSeen = Date.now();
      if (!NET.state) netSendIntent("sync");
      netSetConn("已连接");
    } else if (NET.state) {
      netOpponentLeft("房主已离开，房间关闭。");
    }
  } else {
    if (guests.length) {
      var gids = guests.map(function(g){ return g.clientId; });
      if (!NET.guestClientId || gids.indexOf(NET.guestClientId) < 0) NET.guestClientId = gids[0];
      NET.lastSeen = Date.now();
      if (!NET.started) {
        netHostStart();
      } else if (NET.state) {
        netBroadcastState(); // 重连/补发快照
      }
    } else {
      NET.guestClientId = "";
      if (NET.started) netSetStatus("对手已离开，等待重连…", "房间保留；把房间码再次发给对手即可继续。");
    }
  }
  netUpdateLobby(); netRender();
}

function netOpponentLeft(msg){
  NET.busy = false; NET.opponentGone = true;
  netSetStatus(msg || "对方已离开", "你可以离开房间，或等待对手重连。");
  netSetConn("对手离线", "warn");
  netRender();
}

function netCreateRoom(){
  if (NET.connected) return;
  netEnsureLibs().then(function(){
    NET.role = "host"; NET.code = netCode(); NET.clientId = NET.clientId || netId();
    netSetStatus("等待对手加入…", "把房间码发给对手，对手加入后自动开局。");
    netUpdateLobby();
    netConnect();
  }).catch(function(){ netSetStatus("联机组件加载失败", "需要网络与 supabase.js / supabase-config.js。单机功能不受影响。"); });
}

function netJoinRoom(){
  if (NET.connected) return;
  var input = document.getElementById("nCodeInput");
  var code = (input && input.value || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{4,8}$/.test(code)) { netToast("请输入 4-8 位房间码"); return; }
  netEnsureLibs().then(function(){
    NET.role = "guest"; NET.code = code; NET.clientId = NET.clientId || netId();
    input.value = code;
    netSetStatus("正在加入房间 " + code + "…", "");
    netUpdateLobby();
    netConnect();
  }).catch(function(){ netSetStatus("联机组件加载失败", "需要网络与 supabase.js / supabase-config.js。单机功能不受影响。"); });
}

function netLeave(){
  if (NET.hbTimer) { clearInterval(NET.hbTimer); NET.hbTimer = null; }
  netBroadcastBye();
  var oldCh = NET.channel, oldClient = NET.client;
  setTimeout(function(){
    if (oldCh) { try { oldCh.unsubscribe(); } catch (e) {} }
    if (oldClient) { try { oldClient.removeAllChannels(); } catch (e) {} }
  }, 300);
  NET.channel = null; NET.client = null;
  NET.connected = false; NET.subscribed = false; NET.left = true; NET.started = false;
  NET.state = null; NET.code = ""; NET.role = ""; NET.lastSeq = -1;
  NET.hostClientId = ""; NET.guestClientId = "";
  NET.record = { win: 0, lose: 0 };
  netClearSession();
  document.getElementById("nRoomBox").classList.add("hidden");
  var input = document.getElementById("nCodeInput"); if (input) input.value = "";
  netSetStatus("联机未连接", "创建房间，或输入房间码加入。");
  netSetConn("未连接");
  netUpdateLobby(); netRender();
}

/* ---------------- 房主权威状态机 ---------------- */
function netNewState(){
  var st = {
    seq: 0, game: NET.settings.game, rule: NET.settings.rule,
    openingMode: NET.settings.openingMode, size: NET.settings.game === "go" ? NET.settings.size : 15,
    board: null, history: [], turn: 1, over: false, winner: 0, draw: false,
    winLine: null, phase: "play", candidates: [], finalHostColor: 1,
    lastMove: null, caps: { b: 0, w: 0 }, ko: null, passes: 0,
    goPrev: null, score: null, msg: "", rematch: { host: false, guest: false },
    startAt: Date.now()
  };
  if (st.game === "go") { st.board = wEmptyBoard(st.size); }
  else {
    st.board = gEmptyBoard();
    st.phase = (st.rule === "renju" && st.openingMode === "formal") ? "select" : "play";
  }
  return st;
}

function netHostStart(){
  if (NET.role !== "host") return;
  NET.state = netNewState();
  NET.started = true;
  NET.rematch = { host: false, guest: false };
  NET.lastResultSeq = -1;
  NET.busy = false;
  netBroadcastState();
}

function netCheckEnd(st, r, c, color){
  if (st.game === "gomoku") {
    var w = winInfoAt(st.board, r, c, color, st.rule === "renju");
    if (w) { st.over = true; st.winner = color; st.winLine = w; }
    else if (st.history.length >= 225) { st.over = true; st.draw = true; }
  }
}

function netReject(side, msg){
  if (side === "guest") netSendReject(msg); else netToast(msg);
}

function netHostSelectOpening(idx){
  var st = NET.state; if (!st || st.phase !== "select") return;
  var o = OPENINGS[idx]; if (!o) return;
  st.board = gEmptyBoard(); st.history = [];
  o.cells.forEach(function(cell){
    st.board[cell[0]][cell[1]] = cell[2];
    st.history.push({ r: cell[0], c: cell[1], color: cell[2] });
  });
  st.turn = 2; st.phase = "swap";
  st.msg = "已落「" + o.name + "」，等待白方决定是否交换。";
  st.candidates = [];
  netBroadcastState();
}

function netHostSwap(yes){
  var st = NET.state; if (!st || st.phase !== "swap") return;
  st.finalHostColor = yes ? 2 : 1;
  st.phase = "move4"; st.turn = 2;
  st.msg = yes ? "白方选择交换：房主改执白，对手执黑。" : "白方不交换：房主执黑，对手执白。";
  netBroadcastState();
}

function netHostMove(side, r, c){
  var st = NET.state;
  if (!st || st.over) return false;
  if (netActorSide() !== side) return false;
  if (st.game === "go") return netHostGoMove(side, r, c);
  if (st.phase === "select" || st.phase === "swap") return false;
  if (st.phase === "offer5") {
    if (r < 0 || c < 0 || r >= 15 || c >= 15 || st.board[r][c] !== 0) return false;
    if (st.rule === "renju" && forbiddenAt(st.board, r, c, 1)) { netReject(side, "候选点不能是禁手"); return false; }
    if (st.candidates.some(function(p){ return p[0] === r && p[1] === c; })) return false;
    st.candidates.push([r, c]);
    st.msg = st.candidates.length === 1 ? "黑方已提出候选 1/2，请再点一个。" : "黑方已提出两个第五手候选，等待白方选择。";
    if (st.candidates.length === 2) st.phase = "choose5";
    st.turn = 1;
    netBroadcastState(); return true;
  }
  if (st.phase === "choose5") {
    var hit = st.candidates.some(function(p){ return p[0] === r && p[1] === c; });
    if (!hit) { netReject(side, "请点选高亮的两个候选点之一"); return false; }
    st.candidates = [];
    st.board[r][c] = 1;
    st.history.push({ r: r, c: c, color: 1 });
    st.phase = "move6"; st.turn = 2; st.msg = "白方已选定第五手。";
    netCheckEnd(st, r, c, 1);
    netBroadcastState(); return true;
  }
  if (st.board[r][c] !== 0) return false;
  if (st.rule === "renju" && st.turn === 1 && forbiddenAt(st.board, r, c, 1)) { netReject(side, "禁手，不能落在此处"); return false; }
  var color = st.turn;
  st.board[r][c] = color;
  st.history.push({ r: r, c: c, color: color });
  st.lastMove = [r, c];
  netCheckEnd(st, r, c, color);
  if (st.phase === "move4") st.phase = "offer5";
  else if (st.phase === "move6") st.phase = "play";
  st.turn = 3 - color;
  netBroadcastState(); return true;
}

function netHostGoMove(side, r, c){
  var st = NET.state;
  if (netActorSide() !== side) return false;
  var n = st.size;
  if (r < 0 || c < 0 || r >= n || c >= n || st.board[r][c] !== 0) return false;
  var oldBoard = st.board;
  var prev = st.goPrev || null;
  var res = wTryPlay(st.board, n, r, c, st.turn, prev);
  if (!res) return false;
  var before = wHash(oldBoard, n);
  st.board = res.board;
  st.passes = 0; st.lastMove = [r, c]; st.ko = null;
  if (st.turn === 1) st.caps.b += res.captured; else st.caps.w += res.captured;
  st.history.push({ r: r, c: c, color: st.turn, captured: res.captured });
  st.goPrev = before;
  if (res.captured === 1) {
    var g = wGroup(st.board, n, r, c);
    if (g.liberties === 1) {
      var nb = [[1,0],[-1,0],[0,1],[0,-1]];
      for (var i = 0; i < 4; i++) {
        var qr = r + nb[i][0], qc = c + nb[i][1];
        if (qr >= 0 && qc >= 0 && qr < n && qc < n && oldBoard[qr][qc] === (3 - st.turn) && st.board[qr][qc] === 0) {
          st.ko = [qr, qc]; break;
        }
      }
    }
  }
  st.turn = 3 - st.turn;
  st.msg = res.captured > 0 ? "本手提 " + res.captured + " 子。" : "";
  netBroadcastState(); return true;
}

function netHostPass(side){
  var st = NET.state;
  if (!st || st.game !== "go" || st.over) return false;
  if (netActorSide() !== side) return false;
  st.history.push({ pass: true, color: st.turn });
  st.passes++; st.lastMove = null; st.ko = null;
  st.goPrev = wHash(st.board, st.size);
  if (st.passes >= 2) {
    var sc = wScore(st.board, st.size);
    st.over = true; st.score = sc; st.winner = sc.winner; st.draw = false;
    st.msg = "双方连续停手，终局数子。";
  } else {
    st.msg = colName(st.turn) + "停一手。";
  }
  st.turn = 3 - st.turn;
  netBroadcastState(); return true;
}

function netHostResign(side){
  var st = NET.state;
  if (!st || st.over) return;
  var loser = netColorOfSide(side);
  st.over = true; st.draw = false; st.winner = 3 - loser; st.winLine = null;
  st.msg = netColorName(loser) + "认输。";
  netBroadcastState();
}

function netHostRematch(side){
  var st = NET.state;
  if (!st || !st.over) return;
  st.rematch = st.rematch || { host: false, guest: false };
  st.rematch[side] = true;
  if (st.rematch.host && st.rematch.guest) { netHostStart(); return; }
  netBroadcastState();
}

function netHostIntent(p){
  if (!p || p.fromSide !== "guest") return;
  NET.lastSeen = Date.now();
  if (NET.guestClientId && p.from !== NET.guestClientId) return;
  if (!NET.guestClientId) NET.guestClientId = p.from;
  switch (p.type) {
    case "hello":
    case "sync":
      if (NET.state) netBroadcastState(); break;
    case "move":
    case "candidate":
    case "choose5":
      netHostMove("guest", p.r, p.c); break;
    case "swap":
      netHostSwap(!!p.yes); break;
    case "pass":
      netHostPass("guest"); break;
    case "resign":
      netHostResign("guest"); break;
    case "rematch":
      netHostRematch("guest"); break;
  }
}

function netGuestState(p){
  if (!p || p.fromSide !== "host" || !p.state) return;
  var st = p.state;
  if (typeof st.seq !== "number" || typeof st.turn !== "number" || !st.board) return;
  if (st.seq <= NET.lastSeq) return;
  var first = !NET.state;
  NET.state = st; NET.lastSeq = st.seq;
  NET.hostClientId = p.from || NET.hostClientId;
  NET.lastSeen = Date.now();
  NET.busy = false;
  if (first && st.over) NET.lastResultSeq = st.seq;
  netSetConn("已连接");
  netNoteResult();
  netUpdateLobby();
  netRender();
}

/* ---------------- 本端操作 ---------------- */
function netUserMove(r, c){
  var st = NET.state;
  if (!st || st.over) return;
  if (!netIsMyTurn()) { netToast("还没轮到你"); return; }
  if (NET.role === "host") {
    netHostMove("host", r, c);
  } else {
    var type = st.phase === "offer5" ? "candidate" : (st.phase === "choose5" ? "choose5" : "move");
    netSendIntent(type, { r: r, c: c });
    NET.busy = true;
    netRender();
    setTimeout(function(){ if (NET.busy) { NET.busy = false; netRender(); } }, 4000);
  }
}
function netUserPass(){
  var st = NET.state;
  if (!st || st.game !== "go" || st.over) return;
  if (!netIsMyTurn()) { netToast("还没轮到你"); return; }
  if (NET.role === "host") netHostPass("host"); else netSendIntent("pass");
  NET.busy = NET.role === "guest";
}
function netUserResign(){
  var st = NET.state;
  if (!st || st.over) return;
  if (NET.role === "host") netHostResign("host"); else netSendIntent("resign");
}
function netUserRematch(){
  var st = NET.state;
  if (!st || !st.over) return;
  if (NET.role === "host") netHostRematch("host"); else netSendIntent("rematch");
  NET.busy = NET.role === "guest";
}
function netUserSwap(yes){
  var st = NET.state;
  if (!st || st.phase !== "swap") return;
  if (NET.role === "host") netHostSwap(yes); else netSendIntent("swap", { yes: !!yes });
}

/* ---------------- 渲染 ---------------- */
function netNoteResult(){
  var st = NET.state;
  if (!st || !st.over || st.seq === NET.lastResultSeq) return;
  NET.lastResultSeq = st.seq;
  var me = netMyColor();
  if (!me) return;
  if (st.draw) return;
  if (st.winner === me) NET.record.win++; else NET.record.lose++;
}

function netBoardForView(){
  if (NET.state && NET.state.board) return NET.state.board;
  if (NET.settings.game === "go") return wEmptyBoard(NET.settings.size);
  return gEmptyBoard();
}

function netPhaseText(st){
  if (!st) return "";
  if (st.game === "go") return st.size + " 路围棋";
  if (st.rule === "renju" && st.openingMode === "formal") {
    var d = {
      select: "开局阶段 1/5：房主选择 26 种规定开局之一",
      swap: "开局阶段 2/5：白方决定是否交换黑白",
      move4: "开局阶段 3/5：执白方落第 4 手",
      offer5: "开局阶段 4/5：执黑方提出两个第五手候选",
      choose5: "开局阶段 4/5：执白方从两个候选中选择一个",
      move6: "开局阶段 5/5：执白方落第 6 手",
      play: "正常对弈阶段"
    };
    return d[st.phase] || "";
  }
  return st.rule === "renju" ? "国际连珠 · 自由开局" : "普通五子棋";
}

function netRender(){
  var st = NET.state;
  var game = st ? st.game : NET.settings.game;
  var size = st ? st.size : (game === "go" ? NET.settings.size : 15);
  var board = netBoardForView();
  var forbidden = [];
  if (st && game === "gomoku" && st.rule === "renju" && !st.over && st.turn === 1 && (st.phase === "play" || st.phase === "offer5")) {
    for (var r = 0; r < 15; r++) for (var c = 0; c < 15; c++) {
      if (board[r][c] === 0 && forbiddenAt(board, r, c, 0)) forbidden.push([r, c]);
    }
  }
  var myTurn = netIsMyTurn();
  var badHover = false;
  if (NET.hover && st && game === "gomoku" && st.rule === "renju" && st.turn === 1) {
    badHover = !!forbiddenAt(board, NET.hover[0], NET.hover[1], 0);
  }
  drawBoard(nCanvas, {
    size: size, game: game, board: board,
    last: (st && st.lastMove) ? st.lastMove : null,
    winLine: (st && st.winLine && st.over) ? st.winLine : null,
    forbidden: forbidden,
    candidates: (st && st.candidates) ? st.candidates : [],
    ko: (st && st.ko) ? st.ko : null,
    hover: myTurn ? NET.hover : null,
    badHover: badHover,
    turn: st ? st.turn : 1,
    over: st ? st.over : false
  });
  nCanvas.classList.toggle("no-turn", !myTurn);

  var status = document.getElementById("nStatus");
  var sub = document.getElementById("nSubStatus");
  var result = document.getElementById("nResult");

  if (!NET.connected) {
    status.textContent = NET.state ? "连接已断开" : "联机未连接";
    status.className = "status";
    sub.textContent = "创建房间，或输入房间码加入。";
  } else if (!st) {
    status.textContent = NET.role === "host" ? "等待对手加入…" : "已加入房间，等待房主开局…";
    status.className = "status";
    sub.textContent = NET.role === "host" ? "把房间码发给对手，对手加入后自动开局。" : "";
  } else {
    var actor = netActorSide();
    var phaseTxt = netPhaseText(st);
    if (st.over) {
      status.textContent = "对局结束";
    } else if (st.phase === "select") {
      status.textContent = NET.role === "host" ? "请选择开局形状" : "等待房主选择开局…";
    } else if (st.phase === "swap") {
      status.textContent = NET.role === "guest" ? "请决定是否交换黑白" : "等待白方决定是否交换…";
    } else {
      status.textContent = myTurn ? "轮到你落子" : ("等待" + (NET.role === "host" ? "对手" : "房主") + "落子…");
    }
    status.className = "status";
    var extra = phaseTxt;
    if (st.game === "go") extra += " · 提子 黑 " + st.caps.b + " / 白 " + st.caps.w;
    if (st.msg) extra += " · " + st.msg;
    if (NET.busy && NET.role === "guest") extra += " · 已发送，等待房主确认…";
    sub.textContent = extra;
  }

  if (st && st.over) {
    result.classList.add("show");
    if (st.draw) { result.className = "result show draw"; result.textContent = "和棋。"; }
    else {
      var me = netMyColor();
      var win = st.winner === me;
      result.className = "result show " + (win ? "win" : "lose");
      result.textContent = (win ? "你赢了" : "你输了") + " — " + netColorName(st.winner) + "胜。" + (st.score ? (" 黑 " + st.score.black + " · 白 " + st.score.white.toFixed(1)) : "");
    }
  } else { result.className = "result"; result.textContent = ""; }

  document.getElementById("nColor").textContent = st ? netColorName(netMyColor()) : "—";
  document.getElementById("nTurnText").textContent = st ? (netColorName(st.turn) + (st.over ? "" : (st.turn === netMyColor() ? "（你）" : "（对方）"))) : "—";
  document.getElementById("nMoveCount").textContent = st ? st.history.length : 0;
  document.getElementById("nConn").textContent = NET.connected ? (NET.hostPresent || NET.guestPresent ? "已连接" : "等待对手") : "未连接";
  document.getElementById("nRecord").textContent = NET.record.win + " 胜 " + NET.record.lose + " 负";
  document.getElementById("nRuleText").textContent = st ? (st.game === "go" ? st.size + " 路围棋" : (st.rule === "renju" ? (st.openingMode === "formal" ? "连珠 · RIF 正式开局" : "连珠 · 自由开局") : "普通五子棋")) : (NET.settings.game === "go" ? NET.settings.size + " 路围棋" : (NET.settings.rule === "renju" ? "国际连珠" : "普通五子棋"));

  var mv = document.getElementById("nMoves");
  mv.textContent = "";
  if (st) {
    var letters = "ABCDEFGHJKLMNOPQRSTUVWXYZ";
    st.history.forEach(function(m, i){
      var span = document.createElement("span");
      var label = m.pass ? "停一手" : (st.game === "go" ? (letters[m.c] + (st.size - m.r)) : coordName(m.r, m.c));
      span.textContent = (i + 1) + ". " + (m.color === 1 ? "⚫" : "⚪") + " " + label;
      mv.appendChild(span);
    });
    mv.scrollTop = mv.scrollHeight;
  }

  document.getElementById("nResign").disabled = !(st && !st.over);
  var nPass = document.getElementById("nPass");
  if (nPass) {
    nPass.classList.toggle("hidden", !(st && st.game === "go"));
    nPass.disabled = !(st && st.game === "go" && !st.over && netIsMyTurn());
  }
  document.getElementById("nRematch").disabled = !(st && st.over);
  document.getElementById("nLeave").disabled = !NET.connected;
  document.getElementById("nCreate").disabled = NET.connected;
  document.getElementById("nJoin").disabled = NET.connected;
  document.getElementById("nGameSeg").querySelectorAll("button").forEach(function(b){ b.disabled = NET.connected; });
  document.getElementById("nRuleSeg").querySelectorAll("button").forEach(function(b){ b.disabled = NET.connected; });
  document.getElementById("nOpeningSeg").querySelectorAll("button").forEach(function(b){ b.disabled = NET.connected; });
  document.getElementById("nSizeSeg").querySelectorAll("button").forEach(function(b){ b.disabled = NET.connected; });

  var roomBox = document.getElementById("nRoomBox");
  if (NET.connected && NET.code) {
    roomBox.classList.remove("hidden");
    document.getElementById("nRoomCode").textContent = NET.code;
  } else roomBox.classList.add("hidden");

  /* 动态区域：开局选择 / 交换 / 再来一局状态 */
  sub.textContent = sub.textContent || "";
  if (st && !st.over && st.phase === "select" && NET.role === "host") {
    netShowOpeningPicker(sub);
  } else if (st && !st.over && st.phase === "swap" && NET.role === "guest") {
    var row = document.createElement("div"); row.className = "row"; row.style.marginTop = "8px";
    var y = document.createElement("button"); y.type = "button"; y.textContent = "交换黑白"; y.onclick = function(){ netUserSwap(true); };
    var n = document.createElement("button"); n.type = "button"; n.textContent = "不交换"; n.onclick = function(){ netUserSwap(false); };
    row.appendChild(y); row.appendChild(n); sub.appendChild(row);
  } else if (st && st.over) {
    var ready = st.rematch || { host: false, guest: false };
    var tip = document.createElement("div"); tip.style.marginTop = "8px";
    tip.textContent = "再来一局：" + (ready.host ? "房主已准备" : "房主未准备") + " · " + (ready.guest ? "对手已准备" : "对手未准备");
    sub.appendChild(tip);
  }
  if (NET.opponentGone) {
    var og2 = document.createElement("div"); og2.style.marginTop = "8px";
    og2.textContent = NET.role === "guest" ? "房主已离开，房间关闭。" : "对手已离开，等待重连…";
    sub.appendChild(og2);
  }
}

function netShowOpeningPicker(sub){
  var note = document.createElement("div"); note.textContent = "选择开局（临时黑方落前三手）：";
  var grid = document.createElement("div"); grid.className = "openings"; grid.style.marginTop = "6px";
  OPENINGS.forEach(function(o, i){
    var b = document.createElement("button"); b.type = "button"; b.textContent = o.name;
    b.onclick = function(){ netHostSelectOpening(i); };
    grid.appendChild(b);
  });
  sub.appendChild(note); sub.appendChild(grid);
}

function netUpdateLobby(){
  var connected = NET.connected;
  var game = NET.settings.game;
  var gWrap = document.getElementById("nGomokuOpts"), goWrap = document.getElementById("nGoOpts");
  if (gWrap) gWrap.classList.toggle("hidden", game !== "gomoku");
  if (goWrap) goWrap.classList.toggle("hidden", game !== "go");
  var ow = document.getElementById("nOpeningWrap");
  if (ow) ow.classList.toggle("hidden", !(game === "gomoku" && NET.settings.rule === "renju"));
  var lobby = document.getElementById("nLobbyCard");
  if (lobby) lobby.classList.remove("hidden");
  var input = document.getElementById("nCodeInput");
  if (input) input.disabled = connected;
  if (typeof segSet === "function") {
    segSet("nGameSeg", game);
    segSet("nRuleSeg", NET.settings.rule);
    segSet("nOpeningSeg", NET.settings.openingMode);
    segSet("nSizeSeg", String(NET.settings.size));
  }
}

/* ---------------- 初始化与事件 ---------------- */
function onlineInit(){
  if (NET.inited) return;
  NET.inited = true;
  NET.clientId = netId();

  if (typeof segWire === "function") {
    segWire("nGameSeg", function(v){
      if (NET.connected) return;
      NET.settings.game = v;
      netUpdateLobby(); netRender();
    });
    segWire("nRuleSeg", function(v){
      if (NET.connected) return;
      NET.settings.rule = v;
      if (v !== "renju") NET.settings.openingMode = "free";
      netUpdateLobby(); netRender();
    });
    segWire("nOpeningSeg", function(v){
      if (NET.connected) return;
      NET.settings.openingMode = v;
      netUpdateLobby(); netRender();
    });
    segWire("nSizeSeg", function(v){
      if (NET.connected) return;
      NET.settings.size = parseInt(v, 10);
      netUpdateLobby(); netRender();
    });
  }

  document.getElementById("nCreate").addEventListener("click", netCreateRoom);
  document.getElementById("nJoin").addEventListener("click", netJoinRoom);
  document.getElementById("nLeave").addEventListener("click", netLeave);
  document.getElementById("nResign").addEventListener("click", netUserResign);
  document.getElementById("nPass").addEventListener("click", netUserPass);
  document.getElementById("nRematch").addEventListener("click", netUserRematch);
  document.getElementById("nCopy").addEventListener("click", function(){
    if (!NET.code) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(NET.code).then(function(){ netToast("房间码已复制"); }, function(){ netToast("复制失败，请手动选中"); });
    } else netToast("房间码：" + NET.code);
  });
  var input = document.getElementById("nCodeInput");
  input.addEventListener("keydown", function(e){ if (e.key === "Enter") netJoinRoom(); });
  input.addEventListener("input", function(){ input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6); });

  nCanvas.addEventListener("click", function(e){
    if (!NET.state || document.getElementById("secOnline").classList.contains("hidden")) return;
    var cell = cellAt(e, nCanvas, NET.state.size);
    if (cell) netUserMove(cell[0], cell[1]);
  });
  nCanvas.addEventListener("mousemove", function(e){
    if (!NET.state || !netIsMyTurn()) { if (NET.hover) { NET.hover = null; netRender(); } return; }
    var cell = cellAt(e, nCanvas, NET.state.size);
    var empty = cell && NET.state.board[cell[0]][cell[1]] === 0;
    var next = empty ? cell : null;
    if ((next && !NET.hover) || (!next && NET.hover) || (next && NET.hover && (next[0] !== NET.hover[0] || next[1] !== NET.hover[1]))) {
      NET.hover = next; netRender();
    }
  });
  nCanvas.addEventListener("mouseleave", function(){ if (NET.hover) { NET.hover = null; netRender(); } });

  try {
    var saved = JSON.parse(sessionStorage.getItem("gridfall_net") || "null");
    if (saved && saved.code) {
      input.value = saved.code;
      NET.clientId = saved.clientId || NET.clientId;
      document.getElementById("nLobbyHint").textContent = "上次房间：" + saved.code + "，可重新加入。";
    }
  } catch (e) {}

  window.addEventListener("visibilitychange", function(){
    if (!document.hidden && NET.role === "guest" && NET.connected && NET.channel) netSendIntent("sync");
  });
  netUpdateLobby();
  window.addEventListener("pagehide", netBroadcastBye);
  window.addEventListener("beforeunload", netBroadcastBye);
  netRender();
}

function onlineEnterTab(){
  onlineInit();
  netRender();
}

try { if (typeof onlineInit === "function") onlineInit(); } catch (e) { console.warn(e); }