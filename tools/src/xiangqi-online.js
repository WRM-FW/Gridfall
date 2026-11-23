/* 中国象棋联机：Supabase Realtime Broadcast + Presence，房主权威 */
"use strict";

var XNET = {
  inited: false, loading: null,
  client: null, channel: null, code: "", role: "", clientId: "",
  connected: false, hostPresent: false, guestPresent: false,
  hostColor: RED, seq: 0, lastSeq: -1, hasGame: false,
  swapRequest: null, rematch: { host: false, guest: false }, resultCounted: false,
  busy: false, opponentGone: false, lastSeen: 0, hbTimer: null,
  record: { win: 0, lose: 0 }
};

function xId(){
  try {
    var k = "gridfall_xq_cid", v = sessionStorage.getItem(k);
    if (!v) { v = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : ("x" + Math.random().toString(36).slice(2)); sessionStorage.setItem(k, v); }
    return v;
  } catch (e) { return "x" + Math.random().toString(36).slice(2); }
}
function xCode(){
  var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", s = "";
  for (var i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
function xColorName(c){ return c === RED ? "红" : "黑"; }
function xSideColor(side){ return side === "host" ? XNET.hostColor : 1 - XNET.hostColor; }
function xMyColor(){ return XNET.role === "host" ? XNET.hostColor : 1 - XNET.hostColor; }
function xMyTurn(){
  return state.mode === "online" && XNET.hasGame && XNET.connected &&
    !state.over && !XNET.busy && !XNET.opponentGone && state.turn === xMyColor();
}
function xCanSwap(){
  return XNET.hasGame && XNET.connected && !state.over && state.history.length === 0 && !XNET.swapRequest;
}
function xToast(msg){
  var el = document.getElementById("xStatus");
  if (el) el.textContent = msg;
}
function xLoadScript(src){
  return new Promise(function(res, rej){
    var s = document.createElement("script");
    s.src = src; s.async = true; s.setAttribute("data-online", "1");
    s.onload = function(){ res(); }; s.onerror = function(){ rej(new Error("无法加载 " + src)); };
    document.head.appendChild(s);
  });
}
function xEnsureLibs(){
  if (window.supabase && window.GRIDFALL_SUPABASE) return Promise.resolve();
  if (XNET.loading) return XNET.loading;
  XNET.loading = Promise.resolve().then(function(){
    if (!window.GRIDFALL_SUPABASE) return xLoadScript("../../shared/supabase-config.js");
  }).then(function(){
    if (!window.supabase) return xLoadScript("../../shared/supabase.js");
  }).catch(function(err){ XNET.loading = null; throw err; });
  return XNET.loading;
}

function xSendIntent(type, data){
  if (!XNET.channel) return;
  var payload = { from: XNET.clientId, fromSide: XNET.role, type: type };
  if (data) Object.keys(data).forEach(function(k){ payload[k] = data[k]; });
  XNET.channel.send({ type: "broadcast", event: "intent", payload: payload });
}
function xBroadcast(){
  if (!XNET.channel || XNET.role !== "host" || !XNET.hasGame) return;
  XNET.seq++;
  XNET.channel.send({ type: "broadcast", event: "state", payload: {
    fromSide: "host", from: XNET.clientId, seq: XNET.seq,
    board: state.board.slice(), turn: state.turn, history: state.history.slice(), last: state.last,
    over: state.over, result: state.result, reason: state.reason,
    hostColor: XNET.hostColor, swapRequest: XNET.swapRequest, rematch: XNET.rematch
  }});
  xNoteResult();
  xRender();
}
function xBroadcastBye(){
  if (XNET.channel) XNET.channel.send({ type: "broadcast", event: "bye", payload: { from: XNET.clientId, fromSide: XNET.role } });
}
function xNoteResult(){
  if (!state.over || XNET.resultCounted) return;
  XNET.resultCounted = true;
  var mine = xMyColor();
  if (state.result === (mine === RED ? "红方胜" : "黑方胜")) XNET.record.win++;
  else XNET.record.lose++;
}

function xConnect(){
  XNET.seq = 0; XNET.lastSeq = -1; XNET.hasGame = false;
  XNET.swapRequest = null; XNET.rematch = { host: false, guest: false }; XNET.busy = false;
  XNET.opponentGone = false; XNET.hostPresent = false; XNET.guestPresent = false;
  var client = supabase.createClient(window.GRIDFALL_SUPABASE.url, window.GRIDFALL_SUPABASE.key, {
    realtime: { params: { eventsPerSecond: 20 } }
  });
  XNET.client = client;
  var ch = client.channel("gridfall-xq-room-" + XNET.code, {
    config: { broadcast: { self: false, ack: true }, presence: { key: XNET.clientId } }
  });
  XNET.channel = ch;
  ch.on("broadcast", { event: "intent" }, function(p){ if (XNET.role === "host") xHostIntent(p.payload); });
  ch.on("broadcast", { event: "state" }, function(p){ if (XNET.role === "guest") xGuestState(p.payload); });
  ch.on("broadcast", { event: "bye" }, function(p){
    if (p && p.payload && p.payload.from !== XNET.clientId) xOpponentGone(p.payload.fromSide === "host" ? "房主已离开，房间关闭。" : "对手已离开，等待重连…");
  });
  ch.on("broadcast", { event: "reject" }, function(p){
    if (p && p.payload && p.payload.from !== XNET.clientId) { XNET.busy = false; xRender(); }
  });
  ch.on("broadcast", { event: "ping" }, function(){
    XNET.lastSeen = Date.now();
    if (XNET.role === "guest" && XNET.channel) XNET.channel.send({ type: "broadcast", event: "pong", payload: { from: XNET.clientId } });
  });
  ch.on("broadcast", { event: "pong" }, function(){ XNET.lastSeen = Date.now(); });
  ch.on("presence", { event: "sync" }, xSyncPresence);
  ch.on("presence", { event: "join" }, xSyncPresence);
  ch.on("presence", { event: "leave" }, xSyncPresence);
  xRender();
  ch.subscribe(function(status){
    if (status === "SUBSCRIBED") {
      XNET.connected = true;
      ch.track({ role: XNET.role, clientId: XNET.clientId, at: Date.now() });
      XNET.lastSeen = Date.now();
      if (XNET.hbTimer) clearInterval(XNET.hbTimer);
      XNET.hbTimer = setInterval(xHeartbeat, 5000);
      if (XNET.role === "guest") xSendIntent("hello");
      else xSyncPresence();
      xRender();
    } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
      XNET.connected = false;
      xRender();
    }
  });
}
function xHeartbeat(){
  if (!XNET.connected || !XNET.hasGame) return;
  var now = Date.now();
  if (XNET.role === "host" && XNET.channel && XNET.guestPresent) {
    XNET.channel.send({ type: "broadcast", event: "ping", payload: { from: XNET.clientId, at: now } });
  }
  if (!XNET.opponentGone && now - XNET.lastSeen > 18000) {
    xOpponentGone(XNET.role === "host" ? "对手已离开，等待重连…" : "房主已离开，房间关闭。");
  }
}
function xOpponentGone(msg){
  XNET.opponentGone = true;
  document.getElementById("xStatus").textContent = msg;
  xRender();
}
function xSyncPresence(){
  if (!XNET.channel) return;
  var ps = XNET.channel.presenceState(), hosts = [], guests = [];
  Object.keys(ps).forEach(function(k){
    ps[k].forEach(function(m){
      if (!m || m.clientId === XNET.clientId) return;
      if (m.role === "host") hosts.push(m);
      if (m.role === "guest") guests.push(m);
    });
  });
  XNET.hostPresent = (XNET.role === "host") || hosts.length > 0;
  XNET.guestPresent = (XNET.role === "guest") || guests.length > 0;
  if ((XNET.role === "host" && guests.length) || (XNET.role === "guest" && hosts.length)) {
    XNET.opponentGone = false;
    XNET.lastSeen = Date.now();
  }
  if (XNET.role === "guest") {
    if (hosts.length) { if (!XNET.hasGame) xSendIntent("sync"); }
    else if (XNET.hasGame) xOpponentGone("房主已离开，房间关闭。");
  } else {
    if (guests.length) {
      if (!XNET.hasGame) xHostStart();
      else xBroadcast();
    } else if (XNET.hasGame) {
      document.getElementById("xStatus").textContent = "对手已离开，等待重连…";
    }
  }
  xRender();
}
function xHostStart(){
  if (XNET.role !== "host") return;
  state.epoch++;
  state.board = initBoard(); state.turn = RED; state.sel = -1; state.targets = [];
  state.last = null; state.history = []; state.over = false; state.result = ""; state.reason = "";
  state.thinking = false; state.mode = "online";
  state.flip = XNET.hostColor === BLACK;
  state.xResultSeq = -1;
  XNET.hasGame = true; XNET.swapRequest = null; XNET.rematch = { host: false, guest: false }; XNET.busy = false; XNET.resultCounted = false;
  hideOverlay(); draw(); updatePanel();
  xBroadcast();
}
function xGuestState(p){
  if (!p || p.fromSide !== "host" || typeof p.seq !== "number") return;
  if (p.seq <= XNET.lastSeq) return;
  var first = !XNET.hasGame, wasOver = state.over, prevLen = state.history.length;
  XNET.lastSeq = p.seq;
  XNET.hasGame = true; XNET.hostColor = p.hostColor; XNET.swapRequest = p.swapRequest || null;
  XNET.rematch = p.rematch || { host: false, guest: false }; XNET.busy = false;
  state.board = p.board.slice(); state.turn = p.turn; state.history = p.history.slice();
  state.last = p.last; state.over = !!p.over; state.result = p.result || ""; state.reason = p.reason || "";
  state.sel = -1; state.targets = []; state.thinking = false; state.mode = "online";
  state.flip = xMyColor() === BLACK; state.epoch++;
  draw(); updatePanel();
  if (p.history.length > prevLen && p.last) {
    var h = p.history[p.history.length - 1];
  }
  if (state.over && !wasOver) { showOverlay(); xNoteResult(); }
  else if (!state.over) hideOverlay();
  xRender();
}
function xHostIntent(p){
  if (!p || p.fromSide !== "guest") return;
  XNET.lastSeen = Date.now();
  switch (p.type) {
    case "hello": case "sync": if (XNET.hasGame) xBroadcast(); break;
    case "move": xHostMove("guest", p.from, p.to); break;
    case "resign": xHostResign("guest"); break;
    case "rematch": xHostRematch("guest"); break;
    case "swapReq": xHostRequestSwap("guest"); break;
    case "swapResp": xHostRespondSwap("guest", !!p.accept); break;
  }
}
function xHostMove(side, from, to){
  if (!XNET.hasGame || state.over) return false;
  if (state.turn !== xSideColor(side)) return false;
  var legal = genLegalMoves(state.board, state.turn);
  if (legal.indexOf(from * 100 + to) < 0) return false;
  attemptMove(from, to);
  xBroadcast();
  return true;
}
function xHostResign(side){
  if (!XNET.hasGame || state.over) return;
  var loser = xSideColor(side), winner = 1 - loser;
  state.over = true; state.result = winner === RED ? "红方胜" : "黑方胜"; state.reason = "认输";
  draw(); updatePanel(); showOverlay(); xBroadcast();
}
function xHostRematch(side){
  if (!XNET.hasGame || !state.over) return;
  XNET.rematch[side] = true;
  if (XNET.rematch.host && XNET.rematch.guest) { xHostStart(); return; }
  xBroadcast();
}
function xHostRequestSwap(side){
  if (!xCanSwap()) return;
  XNET.swapRequest = { from: side };
  xBroadcast();
}
function xHostRespondSwap(side, accept){
  if (!XNET.swapRequest || XNET.swapRequest.from === side) return;
  if (accept) {
    XNET.hostColor = 1 - XNET.hostColor;
    XNET.swapRequest = null; XNET.resultCounted = false;
    state.epoch++;
    state.board = initBoard(); state.turn = RED; state.sel = -1; state.targets = [];
    state.last = null; state.history = []; state.over = false; state.result = ""; state.reason = "";
    state.flip = XNET.hostColor === BLACK;
    hideOverlay(); draw(); updatePanel();
    xBroadcast();
  } else {
    XNET.swapRequest = null;
    xBroadcast();
  }
}

/* ---------- 本端操作 ---------- */
function xUserTryMove(from, to){
  if (!xMyTurn()) return;
  if (XNET.role === "host") { xHostMove("host", from, to); return; }
  xSendIntent("move", { from: from, to: to });
  state.sel = -1; state.targets = []; XNET.busy = true;
  draw(); updatePanel(); xRender();
  setTimeout(function(){ if (XNET.busy) { XNET.busy = false; updatePanel(); xRender(); } }, 4000);
}
function xUserSwapRequest(){
  if (!xCanSwap()) return;
  if (XNET.role === "host") xHostRequestSwap("host");
  else { xSendIntent("swapReq"); XNET.busy = true; xRender(); }
}
function xUserSwapResponse(accept){
  if (!XNET.swapRequest || XNET.swapRequest.from === XNET.role) return;
  if (XNET.role === "host") xHostRespondSwap("host", !!accept);
  else { xSendIntent("swapResp", { accept: !!accept }); XNET.busy = true; xRender(); }
}
function xUserResign(){ if (!XNET.hasGame || state.over) return; if (XNET.role === "host") xHostResign("host"); else xSendIntent("resign"); }
function xUserRematch(){ if (!state.over) return; if (XNET.role === "host") xHostRematch("host"); else { xSendIntent("rematch"); XNET.busy = true; xRender(); } }
function xUserCopy(){
  if (!XNET.code) return;
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(XNET.code);
}

function xCreateRoom(){
  if (XNET.connected) return;
  xEnsureLibs().then(function(){
    XNET.role = "host"; XNET.code = xCode(); XNET.clientId = XNET.clientId || xId(); XNET.hostColor = RED;
    document.getElementById("xRoomInfo").classList.remove("hidden");
    document.getElementById("xRoomCode").textContent = XNET.code;
    xConnect();
  }).catch(function(){ document.getElementById("xStatus").textContent = "联机组件加载失败（需要网络）"; });
}
function xJoinRoom(){
  if (XNET.connected) return;
  var code = (document.getElementById("xCode").value || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{4,8}$/.test(code)) { xToast("请输入 4-8 位房间码"); return; }
  xEnsureLibs().then(function(){
    XNET.role = "guest"; XNET.code = code; XNET.clientId = XNET.clientId || xId();
    xConnect();
  }).catch(function(){ document.getElementById("xStatus").textContent = "联机组件加载失败（需要网络）"; });
}
function xLeaveRoom(){
  if (XNET.hbTimer) { clearInterval(XNET.hbTimer); XNET.hbTimer = null; }
  xBroadcastBye();
  var ch = XNET.channel, cl = XNET.client;
  setTimeout(function(){ if (ch) { try { ch.unsubscribe(); } catch (e) {} } if (cl) { try { cl.removeAllChannels(); } catch (e) {} } }, 300);
  XNET.channel = null; XNET.client = null; XNET.connected = false; XNET.hasGame = false;
  XNET.code = ""; XNET.role = ""; XNET.busy = false; XNET.opponentGone = false;
  XNET.swapRequest = null; XNET.rematch = { host: false, guest: false };
  document.getElementById("xRoomInfo").classList.add("hidden");
  document.getElementById("xColor").textContent = "—";
  xRender();
}

/* ---------- 渲染 ---------- */
function xRender(){
  var card = document.getElementById("onlineCard");
  if (!card) return;
  var isOnline = state.mode === "online";
  card.classList.toggle("hidden", !isOnline);
  var local = document.getElementById("localActions");
  if (local) local.classList.toggle("hidden", isOnline);
  if (isOnline) {
    document.getElementById("levelSeg").classList.add("disabled");
    document.getElementById("sideSeg").classList.add("disabled");
  } else return;

  var st = document.getElementById("xStatus"), sub = document.getElementById("xSub");
  var color = document.getElementById("xColor");
  if (!XNET.connected) {
    st.textContent = "未连接"; sub.textContent = "创建房间，或输入房间码加入。";
  } else if (!XNET.hasGame) {
    st.textContent = XNET.role === "host" ? "等待对手加入…" : "已加入，等待房主开局…";
    sub.textContent = XNET.role === "host" ? "把房间码发给对手。" : "";
  } else if (state.over) {
    st.textContent = "对局结束 · " + (state.result || "");
    sub.textContent = state.reason || "";
  } else {
    st.textContent = xMyTurn() ? "轮到你行棋" : "等待对方行棋";
    sub.textContent = (xMyColor() === RED ? "你执红" : "你执黑") + " · " + (state.turn === RED ? "红方行棋" : "黑方行棋") + (XNET.busy ? " · 已发送，等待确认…" : "");
  }
  color.textContent = XNET.hasGame ? (xMyColor() === RED ? "红方" : "黑方") : "—";
  sub.textContent = sub.textContent || "";
  if (XNET.opponentGone) { var og = document.createElement("div"); og.style.marginTop = "6px"; og.textContent = XNET.role === "guest" ? "房主已离开，房间关闭。" : "对手已离开，等待重连…"; sub.appendChild(og); }
  if (XNET.hasGame && XNET.swapRequest) {
    var sr = XNET.swapRequest;
    var wrap = document.createElement("div"); wrap.style.marginTop = "6px";
    if (sr.from === XNET.role) { wrap.textContent = "已申请换方，等待对方回应…"; sub.appendChild(wrap); }
    else {
      wrap.textContent = "对方申请换方";
      var row = document.createElement("div"); row.style.display = "flex"; row.style.gap = "6px"; row.style.marginTop = "6px";
      var y = document.createElement("button"); y.className = "btn"; y.textContent = "同意换方"; y.onclick = function(){ xUserSwapResponse(true); };
      var n = document.createElement("button"); n.className = "btn"; n.textContent = "拒绝"; n.onclick = function(){ xUserSwapResponse(false); };
      row.appendChild(y); row.appendChild(n); wrap.appendChild(row); sub.appendChild(wrap);
    }
  } else if (XNET.hasGame && state.over) {
    var tip = document.createElement("div"); tip.style.marginTop = "6px";
    tip.textContent = "再来一局：" + (XNET.rematch.host ? "房主已准备" : "房主未准备") + " · " + (XNET.rematch.guest ? "对手已准备" : "对手未准备");
    sub.appendChild(tip);
  }

  document.getElementById("xCreate").disabled = XNET.connected;
  document.getElementById("xJoin").disabled = XNET.connected;
  document.getElementById("xLeave").disabled = !XNET.connected;
  document.getElementById("xResign").disabled = !(XNET.hasGame && !state.over);
  document.getElementById("xRematch").disabled = !(XNET.hasGame && state.over);
  var sw = document.getElementById("xSwap");
  sw.classList.toggle("hidden", !(XNET.hasGame && !state.over));
  sw.disabled = !(XNET.hasGame && xCanSwap() && !XNET.swapRequest);
  sw.textContent = (XNET.swapRequest && XNET.swapRequest.from === XNET.role) ? "已申请换方" : "申请换方";
  document.getElementById("xRoomInfo").classList.toggle("hidden", !(XNET.connected && XNET.code));
  if (XNET.code) document.getElementById("xRoomCode").textContent = XNET.code;
}

/* ---------- 初始化 ---------- */
function xRebind(id, fn){
  var old = document.getElementById(id); if (!old) return;
  var n = old.cloneNode(true); old.parentNode.replaceChild(n, old); n.addEventListener("click", fn);
}
function xInit(){
  if (XNET.inited) return;
  XNET.inited = true;
  XNET.clientId = xId();
  document.getElementById("xCreate").addEventListener("click", xCreateRoom);
  document.getElementById("xJoin").addEventListener("click", xJoinRoom);
  document.getElementById("xLeave").addEventListener("click", xLeaveRoom);
  document.getElementById("xResign").addEventListener("click", xUserResign);
  document.getElementById("xRematch").addEventListener("click", xUserRematch);
  document.getElementById("xSwap").addEventListener("click", xUserSwapRequest);
  document.getElementById("xCopy").addEventListener("click", xUserCopy);
  var input = document.getElementById("xCode");
  input.addEventListener("input", function(){ input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6); });
  input.addEventListener("keydown", function(e){ if (e.key === "Enter") xJoinRoom(); });
  document.getElementById("modeSeg").addEventListener("click", function(e){
    var btn = e.target.closest ? e.target.closest(".seg-btn") : null; if (!btn) return;
    var mode = btn.getAttribute("data-mode");
    if (mode === "online") { document.getElementById("onlineCard").classList.remove("hidden"); }
    else { document.getElementById("onlineCard").classList.add("hidden"); if (XNET.connected) xLeaveRoom(); }
    document.getElementById("localActions").classList.toggle("hidden", mode === "online");
    xRender();
  });
  xRebind("restartBtn", function(){ if (state.mode === "online") xUserRematch(); else resetGame(); });
  xRebind("ovRestart", function(){ if (state.mode === "online") xUserRematch(); else resetGame(); });
  var _updatePanel = updatePanel;
  updatePanel = function(){
    _updatePanel();
    if (state.mode === "online") {
      document.getElementById("undoBtn").disabled = true;
      if (!state.over) {
        document.getElementById("turnName").textContent = xMyTurn() ? "轮到你行棋" : "等待对方行棋";
        document.getElementById("turnSub").textContent = "你执" + xColorName(xMyColor()) + " · " + (state.turn === RED ? "红方行棋" : "黑方行棋") + (XNET.busy ? " · 已发送，等待确认…" : "");
      }
      xRender();
    }
  };
  window.addEventListener("pagehide", xBroadcastBye);
  window.addEventListener("beforeunload", xBroadcastBye);
  xRender();
}
xInit();