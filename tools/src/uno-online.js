/* ================= ONLINE: 3 / 4 PLAYERS ================= */
const UNO_NET = {
  mode: false,
  started: false,
  isHost: false,
  room: '',
  myId: '',
  hostId: '',
  channel: null,
  client: null,
  playerCount: 3,
  lobby: [],
  overShown: false,
  connecting: false,
  denied: false,
  denyReason: '',
  deniedPeers: Object.create(null),
  version: 0,
  lastVersion: 0,
  gameId: 0,
  actionSeq: 0,
  seenActions: Object.create(null),
  takeoverTimers: Object.create(null),
  takeoverDelay: 10000
};
window.UNO_NET = UNO_NET;

function unoNetText(zh, en) {
  return state.lang === 'en' ? en : zh;
}

const unoNetEls = {
  modal: document.getElementById('online-modal'),
  setup: document.getElementById('online-setup'),
  roomPanel: document.getElementById('online-room'),
  code: document.getElementById('online-room-code'),
  codeInput: document.getElementById('online-code'),
  list: document.getElementById('online-players'),
  status: document.getElementById('online-status'),
  start: document.getElementById('online-start'),
  leave: document.getElementById('online-leave'),
  create: document.getElementById('online-create'),
  join: document.getElementById('online-join'),
  copy: document.getElementById('online-copy'),
  close: document.getElementById('online-close'),
  sub: document.getElementById('online-sub'),
  countBtns: Array.from(document.querySelectorAll('.online-count [data-netplayers]'))
};

function unoNetStatus(text) {
  if (unoNetEls.status) unoNetEls.status.textContent = text;
}
function unoNetMyId() {
  try {
    let id = sessionStorage.getItem('gridfall-uno-net-id');
    if (!id) {
      id = 'u' + Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem('gridfall-uno-net-id', id);
    }
    return id;
  } catch (_) {
    return 'u' + Math.random().toString(36).slice(2, 10);
  }
}
function unoNetCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
function unoNetLoad(src) {
  return new Promise((resolve, reject) => {
    const found = document.querySelector(`script[data-uno-src="${src}"]`);
    if (found) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.dataset.unoSrc = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('load failed: ' + src));
    document.head.appendChild(s);
  });
}
async function unoNetEnsureClient() {
  if (!window.GRIDFALL_SUPABASE) await unoNetLoad('../../shared/supabase-config.js');
  if (!window.supabase) await unoNetLoad('../../shared/supabase.js');
  if (!window.supabase || !window.GRIDFALL_SUPABASE) throw new Error('Supabase unavailable');
  if (!UNO_NET.client) {
    UNO_NET.client = window.supabase.createClient(
      window.GRIDFALL_SUPABASE.url,
      window.GRIDFALL_SUPABASE.key,
      { auth: { persistSession: false } }
    );
  }
  return UNO_NET.client;
}
function unoNetSelectedCount() {
  const active = unoNetEls.countBtns.find((b) => b.classList.contains('active'));
  return active ? Number(active.dataset.netplayers) : 3;
}
function unoNetSend(event, payload) {
  if (!UNO_NET.channel) return;
  try {
    const p = UNO_NET.channel.send({ type: 'broadcast', event: event, payload: payload });
    if (p && typeof p.catch === 'function') p.catch(() => {});
  } catch (_) { /* channel may be closing */ }
}
function unoNetRenderLobby() {
  const count = UNO_NET.playerCount || unoNetSelectedCount();
  if (unoNetEls.sub) {
    unoNetEls.sub.textContent = '3 或 4 人房 · 房主权威同步 · 满员后由房主开局';
  }
  if (UNO_NET.room) {
    unoNetEls.setup.style.display = 'none';
    unoNetEls.roomPanel.classList.remove('hidden');
    unoNetEls.code.textContent = UNO_NET.room;
    const rows = UNO_NET.lobby.map((p, i) =>
      `<div class="online-player ${p.id === UNO_NET.myId ? 'me' : ''}"><span>${i === 0 ? '房主' : '玩家 ' + (i + 1)}</span><b>${p.name || ''}</b></div>`
    );
    unoNetEls.list.innerHTML = rows.join('') || '<div class="online-empty">等待玩家加入…</div>';
    if (UNO_NET.isHost) {
      unoNetEls.start.style.display = '';
      unoNetEls.start.disabled = UNO_NET.started || UNO_NET.lobby.length !== count;
      unoNetStatus(UNO_NET.started
        ? '对局进行中 · 房间码 ' + UNO_NET.room
        : `等待玩家加入（${UNO_NET.lobby.length}/${count}）`);
    } else {
      unoNetEls.start.style.display = 'none';
      if (UNO_NET.denied) {
        unoNetStatus(UNO_NET.denyReason === 'full'
          ? unoNetText('房间已满，请等待有人离开或换一个房间。', 'This room is full. Wait for a seat or try another room.')
          : unoNetText('对局已开始，无法加入。请等待下一局或换一个房间。', 'This match has already started. Try another room or wait for the next one.'));
      } else {
        unoNetStatus(UNO_NET.started
          ? '对局进行中 · 房主会同步完整盘面'
          : `已连接，等待房主开局（${UNO_NET.lobby.length}/${count}）`);
      }
    }
  } else {
    unoNetEls.setup.style.display = '';
    unoNetEls.roomPanel.classList.add('hidden');
    unoNetStatus('创建房间或输入房间码加入');
  }
}
function unoNetBroadcastLobby() {
  if (!UNO_NET.isHost || !UNO_NET.channel) return;
  unoNetSend('lobby', {
    count: UNO_NET.playerCount,
    hostId: UNO_NET.hostId,
    started: UNO_NET.started,
    players: UNO_NET.lobby.map((p) => ({ id: p.id, name: p.name }))
  });
}
function unoNetRebuildLobby() {
  if (!UNO_NET.isHost || !UNO_NET.channel) return;
  const stateMap = UNO_NET.channel.presenceState();
  const ids = [UNO_NET.myId];
  Object.keys(stateMap).forEach((key) => {
    if (key !== UNO_NET.myId && stateMap[key] && stateMap[key].length) ids.push(key);
  });

  // Do not let late arrivals change a running match's roster.
  if (UNO_NET.started) {
    UNO_NET.lobby = UNO_NET.lobby.filter((p) => ids.indexOf(p.id) >= 0);
    unoNetRenderLobby();
    return;
  }

  Object.keys(UNO_NET.deniedPeers).forEach((id) => {
    if (ids.indexOf(id) < 0) delete UNO_NET.deniedPeers[id];
  });
  const capacity = Math.min(4, UNO_NET.playerCount || 4);
  const ordered = [];
  UNO_NET.lobby.forEach((p) => { if (ids.indexOf(p.id) >= 0) ordered.push(p); });
  ids.forEach((id) => {
    if (ordered.some((p) => p.id === id)) return;
    if (ordered.length < capacity) {
      ordered.push({ id: id, name: '玩家 ' + (ordered.length + 1) });
      delete UNO_NET.deniedPeers[id];
    } else if (!UNO_NET.deniedPeers[id]) {
      UNO_NET.deniedPeers[id] = 1;
      unoNetSendDeny(id, 'full');
    }
  });
  UNO_NET.lobby = ordered.slice(0, capacity).map((p, i) => ({
    id: p.id,
    name: i === 0 ? '房主' : '玩家 ' + (i + 1)
  }));
  unoNetBroadcastLobby();
  unoNetRenderLobby();
}
function unoNetSnapshot(version) {
  const winner = state.gameOver ? state.players.findIndex((p) => p.hand.length === 0) : -1;
  return JSON.parse(JSON.stringify({
    room: UNO_NET.room,
    version: version || UNO_NET.version,
    gameId: UNO_NET.gameId,
    hostId: UNO_NET.hostId,
    count: state.playerCount,
    players: state.players.map((p) => ({
      id: p.id, name: p.name, hand: p.hand,
      saidUno: p.saidUno, vulnerableUno: p.vulnerableUno,
      connected: p.connected !== false, auto: !!p.auto
    })),
    deck: state.deck,
    discard: state.discard,
    currentTurn: state.currentTurn,
    direction: state.direction,
    activeColor: state.activeColor,
    pendingDraw: state.pendingDraw,
    pendingDrawType: state.pendingDrawType,
    drawnPlayableCardId: state.drawnPlayableCardId,
    gameOver: state.gameOver,
    allowStacking: state.allowStacking,
    winner: winner
  }));
}
function unoNetBroadcastState() {
  if (!UNO_NET.isHost || !UNO_NET.channel) return;
  UNO_NET.version += 1;
  unoNetSend('state', unoNetSnapshot(UNO_NET.version));
}
function unoNetReject(targetId, reason) {
  if (!UNO_NET.isHost || !UNO_NET.channel) return;
  // A rejected action usually means the sender is one snapshot behind.
  // Push a fresh authoritative state so the client can recover immediately.
  unoNetBroadcastState();
  unoNetSend('reject', { targetId: targetId, reason: reason });
}
function unoNetApply(snapshot) {
  if (UNO_NET.isHost || !snapshot || snapshot.room !== UNO_NET.room) return;
  if (snapshot.version && UNO_NET.lastVersion && snapshot.version < UNO_NET.lastVersion) return;
  if (snapshot.version) UNO_NET.lastVersion = snapshot.version;
  if (snapshot.gameId !== undefined && UNO_NET.gameId && snapshot.gameId < UNO_NET.gameId) return;

  const own = snapshot.players.findIndex((p) => p.id === UNO_NET.myId);
  if (own < 0) {
    UNO_NET.denied = true;
    unoNetStatus(unoNetText('你不在本局玩家列表中', 'You are not in this match'));
    return;
  }
  clearAllTimers();
  const wasStarted = UNO_NET.started;
  const n = snapshot.players.length;
  const rotated = snapshot.players.slice(own).concat(snapshot.players.slice(0, own));
  const prevAwaitingWild = state.awaitingWildColor;
  const prevWildCardId = state.pendingWildCardId;

  state.playerCount = n;
  state.players = rotated.map((p) => ({
    id: p.id, name: p.name, hand: p.hand || [],
    isHuman: true, connected: p.connected !== false, auto: !!p.auto,
    saidUno: !!p.saidUno, vulnerableUno: !!p.vulnerableUno
  }));
  state.currentTurn = (snapshot.currentTurn - own + n) % n;
  state.direction = snapshot.direction;
  state.activeColor = snapshot.activeColor;
  state.pendingDraw = snapshot.pendingDraw;
  state.pendingDrawType = snapshot.pendingDrawType;
  state.drawnPlayableCardId = snapshot.drawnPlayableCardId;
  state.allowStacking = snapshot.allowStacking;
  state.deck = snapshot.deck;
  state.discard = snapshot.discard;
  state.gameOver = snapshot.gameOver;
  state.awaitingWildColor = false;
  state.pendingWildCardId = null;

  let maxCardId = state.cardIdSeq;
  state.players.forEach((p) => p.hand.forEach((c) => { if (c.id >= maxCardId) maxCardId = c.id + 1; }));
  state.deck.forEach((c) => { if (c.id >= maxCardId) maxCardId = c.id + 1; });
  state.discard.forEach((c) => { if (c.id >= maxCardId) maxCardId = c.id + 1; });
  state.cardIdSeq = maxCardId;

  UNO_NET.gameId = snapshot.gameId !== undefined ? snapshot.gameId : UNO_NET.gameId;
  UNO_NET.hostId = snapshot.hostId || (snapshot.players[0] && snapshot.players[0].id) || UNO_NET.hostId;
  UNO_NET.playerCount = n;
  UNO_NET.mode = true;
  UNO_NET.started = true;
  UNO_NET.denied = false;
  document.body.classList.add('uno-online');
  els.btnMode3.classList.toggle('active', n === 3);
  els.btnMode4.classList.toggle('active', n === 4);

  // Keep an open color picker only if the wild card is still ours to play.
  if (!snapshot.gameOver && prevAwaitingWild && prevWildCardId !== null &&
      state.currentTurn === 0 && state.players[0].hand.some((c) => c.id === prevWildCardId)) {
    state.awaitingWildColor = true;
    state.pendingWildCardId = prevWildCardId;
  } else if (prevAwaitingWild) {
    closeModal(els.wildModal);
  }

  if (!snapshot.gameOver) {
    UNO_NET.overShown = false;
    if (els.gameoverModal.classList.contains('open')) closeModal(els.gameoverModal);
  }
  if (unoNetEls.modal.classList.contains('open') && !wasStarted) closeModal(unoNetEls.modal);

  renderAll();

  if (snapshot.gameOver && snapshot.winner >= 0 && !UNO_NET.overShown) {
    UNO_NET.overShown = true;
    finishGame((snapshot.winner - own + n) % n);
  }
}
function unoNetClearTakeover(id) {
  if (UNO_NET.takeoverTimers[id]) {
    clearTimeout(UNO_NET.takeoverTimers[id]);
    delete UNO_NET.takeoverTimers[id];
  }
}
function unoNetClearAllTakeover() {
  Object.keys(UNO_NET.takeoverTimers).forEach((id) => clearTimeout(UNO_NET.takeoverTimers[id]));
  UNO_NET.takeoverTimers = Object.create(null);
}
function unoNetMarkGone(id) {
  if (!UNO_NET.isHost || !UNO_NET.started) return;
  const p = state.players.find((x) => x.id === id);
  if (!p || p.connected === false) return;
  p.connected = false;
  p.auto = false;
  unoNetClearTakeover(id);
  const delay = Math.max(1000, Number(UNO_NET.takeoverDelay) || 10000);
  UNO_NET.takeoverTimers[id] = setTimeout(() => {
    delete UNO_NET.takeoverTimers[id];
    if (!UNO_NET.started || state.gameOver) return;
    const bot = state.players.find((x) => x.id === id);
    if (!bot || bot.connected) return;
    bot.auto = true;
    bot.isHuman = false;
    renderAll();
    unoNetBroadcastState();
    showToast(unoNetText(
      `${bot.name} 已进入托管，由系统代打`,
      `${bot.name} is now auto-playing`
    ));
    if (state.currentTurn === state.players.indexOf(bot)) maybeTriggerAiTurn();
  }, delay);
  renderAll();
  unoNetBroadcastState();
  showToast(unoNetText(
    `${p.name} 已离开，${Math.round(delay / 1000)} 秒后自动托管`,
    `${p.name} left — auto-play in ${Math.round(delay / 1000)}s`
  ));
}
function unoNetSendDeny(targetId, reason) {
  if (!UNO_NET.isHost || !UNO_NET.channel) return;
  unoNetSend('deny', { targetId: targetId, reason: reason || 'started' });
}
async function unoNetConnect(code, host) {
  if (UNO_NET.connecting) return;
  code = (code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  if (code.length !== 6) { unoNetStatus('请输入 6 位房间码'); return; }
  UNO_NET.connecting = true;
  if (UNO_NET.channel) {
    try { UNO_NET.channel.unsubscribe(); } catch (_) {}
    UNO_NET.channel = null;
  }
  UNO_NET.room = code;
  UNO_NET.isHost = !!host;
  UNO_NET.myId = unoNetMyId();
  UNO_NET.hostId = host ? UNO_NET.myId : '';
  UNO_NET.started = false;
  UNO_NET.overShown = false;
  UNO_NET.denied = false;
  UNO_NET.denyReason = '';
  UNO_NET.deniedPeers = Object.create(null);
  UNO_NET.version = 0;
  UNO_NET.lastVersion = 0;
  UNO_NET.gameId = 0;
  UNO_NET.actionSeq = 0;
  UNO_NET.seenActions = Object.create(null);
  unoNetClearAllTakeover();
  UNO_NET.playerCount = host ? unoNetSelectedCount() : 0;
  UNO_NET.lobby = host ? [{ id: UNO_NET.myId, name: '房主' }] : [];
  try {
    const client = await unoNetEnsureClient();
    const ch = client.channel('gridfall-uno-room-' + code, {
      config: { broadcast: { self: false }, presence: { key: UNO_NET.myId } }
    });
    UNO_NET.channel = ch;
    ch.on('presence', { event: 'sync' }, () => {
      if (UNO_NET.isHost) unoNetRebuildLobby();
    });
    ch.on('presence', { event: 'join' }, ({ key }) => {
      if (!UNO_NET.isHost) return;
      if (UNO_NET.started) {
        const p = state.players.find((x) => x.id === key);
        if (!p) {
          // A brand-new player cannot take a seat in a running match.
          unoNetSendDeny(key, 'started');
          return;
        }
        // Same id coming back: restore their seat and stop any takeover.
        unoNetClearTakeover(key);
        p.connected = true;
        p.auto = false;
        p.isHuman = true;
        if (!UNO_NET.lobby.some((x) => x.id === key)) {
          UNO_NET.lobby.push({ id: key, name: p.name });
        }
        renderAll();
        unoNetBroadcastState();
        unoNetBroadcastLobby();
        unoNetRenderLobby();
        showToast(unoNetText(`${p.name} 已重新连接`, `${p.name} reconnected`));
        return;
      }
      unoNetRebuildLobby();
      if (UNO_NET.started && UNO_NET.lobby.some((p) => p.id === key)) {
        setTimeout(unoNetBroadcastState, 160);
      }
    });
    ch.on('presence', { event: 'leave' }, ({ key }) => {
      if (UNO_NET.isHost) {
        if (UNO_NET.started) {
          const ps = UNO_NET.channel.presenceState();
          if (ps && ps[key] && ps[key].length) return; // same id already rejoined
          const p = state.players.find((x) => x.id === key);
          if (p) { unoNetMarkGone(key); return; }
        }
        unoNetRebuildLobby();
      } else if (key === UNO_NET.hostId) {
        unoNetStatus('房主已离开，房间结束');
        UNO_NET.started = false;
      }
    });
    ch.on('broadcast', { event: 'lobby' }, ({ payload }) => {
      if (UNO_NET.isHost) return;
      UNO_NET.lobby = (payload.players || []).map((p) => ({ id: p.id, name: p.name }));
      UNO_NET.playerCount = payload.count || UNO_NET.playerCount;
      UNO_NET.hostId = payload.hostId || UNO_NET.hostId;
      UNO_NET.started = !!payload.started;
      if (UNO_NET.lobby.some((p) => p.id === UNO_NET.myId)) {
        UNO_NET.denied = false;
        UNO_NET.denyReason = '';
      }
      unoNetRenderLobby();
    });
    ch.on('broadcast', { event: 'state' }, ({ payload }) => {
      if (!UNO_NET.isHost) unoNetApply(payload);
    });
    ch.on('broadcast', { event: 'intent' }, ({ payload }) => {
      if (UNO_NET.isHost) unoNetHostIntent(payload);
    });
    ch.on('broadcast', { event: 'reject' }, ({ payload }) => {
      if (UNO_NET.isHost || !payload || payload.targetId !== UNO_NET.myId) return;
      const messages = {
        turn: unoNetText('还没轮到你出牌', 'It is not your turn yet'),
        card: unoNetText('这张牌现在不能出', 'That card cannot be played now'),
        drawn: unoNetText('刚摸到的牌需要打出，或选择保留并过牌', 'Play the drawn card, or keep it and pass'),
        color: unoNetText('请选择变色牌的颜色', 'Choose a color for the wild card'),
        target: unoNetText('抓 UNO 的目标无效', 'Invalid UNO catch target')
      };
      showToast(messages[payload.reason] || unoNetText('操作未生效，状态已同步', 'Action rejected — state resynced'));
    });
    ch.on('broadcast', { event: 'deny' }, ({ payload }) => {
      if (UNO_NET.isHost || !payload || payload.targetId !== UNO_NET.myId) return;
      UNO_NET.denied = true;
      UNO_NET.denyReason = payload.reason || 'started';
      unoNetStatus(UNO_NET.denyReason === 'full'
        ? unoNetText('房间已满，请等待有人离开或换一个房间。', 'This room is full. Wait for a seat or try another room.')
        : unoNetText('对局已开始，无法加入。请等待下一局或换一个房间。', 'This match has already started. Try another room or wait for the next one.'));
    });
    ch.on('broadcast', { event: 'bye' }, ({ payload }) => {
      if (UNO_NET.isHost) {
        if (UNO_NET.started && payload && payload.id && payload.id !== UNO_NET.myId) {
          unoNetMarkGone(payload.id);
        }
        return;
      }
      if (!payload || payload.id === UNO_NET.hostId) {
        unoNetStatus('房主已离开，房间结束');
        UNO_NET.started = false;
      }
    });
    await ch.subscribe(async (status) => {
      if (status !== 'SUBSCRIBED') return;
      await ch.track({ id: UNO_NET.myId, name: host ? '房主' : '玩家' });
      if (host) unoNetRebuildLobby();
      else unoNetStatus('已连接，等待房主…');
    });
    closeModal(els.gameoverModal);
    unoNetRenderLobby();
    openModal(unoNetEls.modal);
  } catch (err) {
    UNO_NET.room = '';
    unoNetStatus('联机组件加载失败，请检查网络');
  } finally {
    UNO_NET.connecting = false;
  }
}
function unoNetDraw(idx) {
  if (state.gameOver || idx !== state.currentTurn) return false;
  if (state.drawnPlayableCardId !== null) return false;
  const p = state.players[idx];
  if (!p) return false;
  clearOtherVulnerabilities(idx);

  if (state.pendingDraw > 0) {
    const amt = state.pendingDraw;
    state.pendingDraw = 0;
    state.pendingDrawType = null;
    const drawn = drawFromDeck(amt);
    p.hand.push(...drawn);
    p.saidUno = false;
    p.vulnerableUno = false;
    sortHand(p.hand);
    Sound.penalty();
    showToast(t().toastDrew(p.name, drawn.length));
    state.currentTurn = nextIndex(idx, 1);
    renderAll();
    maybeTriggerAiTurn();
    onlineAfterChange();
    return true;
  }

  const drawn = drawFromDeck(1);
  if (!drawn.length) {
    state.currentTurn = nextIndex(idx, 1);
    renderAll();
    maybeTriggerAiTurn();
    onlineAfterChange();
    return true;
  }

  const card = drawn[0];
  p.hand.push(card);
  p.saidUno = false;
  p.vulnerableUno = false;
  sortHand(p.hand);
  Sound.drawCard();
  showToast(t().toastDrew(p.name, 1));
  if (canPlayCard(card)) {
    state.drawnPlayableCardId = card.id;
    renderAll();
  } else {
    state.drawnPlayableCardId = null;
    state.currentTurn = nextIndex(idx, 1);
    renderAll();
    maybeTriggerAiTurn();
  }
  onlineAfterChange();
  return true;
}
function unoNetPass(idx) {
  if (state.gameOver || idx !== state.currentTurn || state.drawnPlayableCardId === null) return false;
  clearOtherVulnerabilities(idx);
  state.drawnPlayableCardId = null;
  state.currentTurn = nextIndex(idx, 1);
  renderAll();
  maybeTriggerAiTurn();
  onlineAfterChange();
  return true;
}
function unoNetUno(idx) {
  if (state.gameOver) return false;
  const p = state.players[idx];
  if (!p) return false;
  let changed = false;
  if (p.hand.length === 1 && p.vulnerableUno) {
    // A rescue is legal even after the turn has moved on, until someone acts.
    p.saidUno = true;
    p.vulnerableUno = false;
    if (state.unoGraceTimer) clearTimeout(state.unoGraceTimer);
    Sound.uno();
    showToast(t().toastUnoShout(p.name));
    changed = true;
  } else if (p.hand.length === 2 && idx === state.currentTurn) {
    p.saidUno = !p.saidUno;
    if (p.saidUno) Sound.uno();
    changed = true;
  }
  if (changed) {
    renderAll();
    onlineAfterChange();
  }
  return changed;
}
function unoNetHostIntent(payload) {
  if (!UNO_NET.isHost || !UNO_NET.started || !payload || state.gameOver) return;

  if (payload.actionId) {
    if (UNO_NET.seenActions[payload.actionId]) return;
    UNO_NET.seenActions[payload.actionId] = 1;
    const keys = Object.keys(UNO_NET.seenActions);
    if (keys.length > 400) delete UNO_NET.seenActions[keys[0]];
  }

  const playerIdx = state.players.findIndex((p) => p.id === payload.playerId);
  if (playerIdx < 0) return;
  const type = payload.type;

  if (type === 'sync') {
    unoNetBroadcastState();
    return;
  }

  if (payload.gameId !== undefined && Number(payload.gameId) !== UNO_NET.gameId) return;

  if (type === 'rematch') {
    if (payload.playerId !== UNO_NET.myId) return;
    unoNetStartFromPlayers(state.players.map((p) => ({
      id: p.id, name: p.name, connected: p.connected !== false, auto: !!p.auto
    })));
    return;
  }

  if (type === 'play') {
    if (playerIdx !== state.currentTurn) { unoNetReject(payload.playerId, 'turn'); return; }
    const player = state.players[playerIdx];
    const cardId = Number(payload.cardId);
    const card = player.hand.find((c) => c.id === cardId);
    if (!card) { unoNetReject(payload.playerId, 'card'); return; }
    if (state.drawnPlayableCardId !== null && card.id !== state.drawnPlayableCardId) {
      unoNetReject(payload.playerId, 'drawn');
      return;
    }
    if (!canPlayCard(card)) { unoNetReject(payload.playerId, 'card'); return; }
    if (card.color === 'wild' && COLORS.indexOf(payload.color) < 0) {
      unoNetReject(payload.playerId, 'color');
      return;
    }
    executePlayCard(playerIdx, card.id, card.color === 'wild' ? payload.color : null);
    return;
  }

  if (type === 'draw') {
    if (playerIdx !== state.currentTurn) { unoNetReject(payload.playerId, 'turn'); return; }
    if (state.drawnPlayableCardId !== null) { unoNetReject(payload.playerId, 'drawn'); return; }
    unoNetDraw(playerIdx);
    return;
  }

  if (type === 'pass') {
    if (playerIdx !== state.currentTurn) { unoNetReject(payload.playerId, 'turn'); return; }
    if (state.drawnPlayableCardId === null) { unoNetReject(payload.playerId, 'drawn'); return; }
    unoNetPass(playerIdx);
    return;
  }

  if (type === 'uno') {
    unoNetUno(playerIdx);
    return;
  }

  if (type === 'catch') {
    if (payload.targetId === payload.playerId) { unoNetReject(payload.playerId, 'target'); return; }
    const target = state.players.findIndex((p) => p.id === payload.targetId);
    if (target < 0) { unoNetReject(payload.playerId, 'target'); return; }
    applyUnoPenalty(target);
    return;
  }
}
function unoNetAct(type, extra) {
  if (!UNO_NET.mode || !UNO_NET.started || UNO_NET.denied) return;
  if (state.gameOver && type !== 'rematch') return;
  if (state.awaitingWildColor && type !== 'play') return;
  UNO_NET.actionSeq += 1;
  const payload = Object.assign({
    type: type,
    playerId: UNO_NET.myId,
    gameId: UNO_NET.gameId,
    actionId: UNO_NET.myId + ':' + Date.now().toString(36) + ':' + UNO_NET.actionSeq
  }, extra || {});
  if (UNO_NET.isHost) {
    unoNetHostIntent(payload);
  } else {
    unoNetSend('intent', payload);
  }
}
function unoNetStartFromPlayers(players) {
  const roster = players.map((p) => ({
    id: p.id,
    name: p.name,
    isHuman: p.connected !== false,
    connected: p.connected !== false,
    auto: !!p.auto
  }));
  unoNetClearAllTakeover();
  resetRound(roster);
  UNO_NET.mode = true;
  UNO_NET.started = true;
  UNO_NET.overShown = false;
  UNO_NET.denied = false;
  UNO_NET.playerCount = roster.length;
  UNO_NET.gameId += 1;
  UNO_NET.actionSeq = 0;
  UNO_NET.seenActions = Object.create(null);
  document.body.classList.add('uno-online');
  els.btnMode3.classList.toggle('active', state.playerCount === 3);
  els.btnMode4.classList.toggle('active', state.playerCount === 4);
  closeModal(unoNetEls.modal);
  renderAll();
  unoNetBroadcastState();
  unoNetBroadcastLobby();
  unoNetRenderLobby();
}
function unoNetHandClick(cardId) {
  if (!UNO_NET.mode || !UNO_NET.started || UNO_NET.denied) return;
  if (state.gameOver || state.currentTurn !== 0 || state.awaitingWildColor) return;
  const card = state.players[0].hand.find((c) => c.id === cardId);
  if (!card || !canPlayCard(card)) return;
  if (state.drawnPlayableCardId !== null && card.id !== state.drawnPlayableCardId) return;
  if (card.color === 'wild') {
    state.awaitingWildColor = true;
    state.pendingWildCardId = card.id;
    openModal(els.wildModal);
    return;
  }
  unoNetAct('play', { cardId: card.id });
}
function unoNetColorChosen(color) {
  if (!state.awaitingWildColor || state.pendingWildCardId === null) return;
  const id = state.pendingWildCardId;
  state.awaitingWildColor = false;
  state.pendingWildCardId = null;
  closeModal(els.wildModal);
  unoNetAct('play', { cardId: id, color: color });
}
function unoNetRestart() {
  if (!UNO_NET.mode || UNO_NET.denied) return;
  if (!UNO_NET.isHost) { showToast('等待房主开新局'); return; }
  const players = state.players.length === 3 || state.players.length === 4
    ? state.players.map((p) => ({ id: p.id, name: p.name, connected: p.connected !== false, auto: !!p.auto }))
    : UNO_NET.lobby.slice(0, UNO_NET.playerCount);
  unoNetStartFromPlayers(players);
}
function unoNetLeave() {
  if (UNO_NET.channel) {
    unoNetSend('bye', { id: UNO_NET.myId });
    try { UNO_NET.channel.unsubscribe(); } catch (_) {}
  }
  unoNetClearAllTakeover();
  UNO_NET.channel = null;
  UNO_NET.mode = false;
  UNO_NET.started = false;
  UNO_NET.room = '';
  document.body.classList.remove('uno-online');
  closeModal(unoNetEls.modal);
  location.reload();
}

/* ================= ONLINE EVENTS ================= */
document.addEventListener('click', function (e) {
  if (!UNO_NET.mode && !unoNetEls.modal.classList.contains('open')) return;
  const modeBtn = e.target.closest('#btn-mode-3, #btn-mode-4');
  if (modeBtn && UNO_NET.mode) {
    e.preventDefault(); e.stopImmediatePropagation();
    showToast('联机中不能切换人数');
    return;
  }
  const handCard = e.target.closest('#player-hand .hand-card-btn');
  if (handCard && UNO_NET.mode) {
    e.preventDefault(); e.stopImmediatePropagation();
    unoNetHandClick(Number(handCard.dataset.cardId));
    return;
  }
  if (e.target.closest('#draw-pile-btn') && UNO_NET.mode) {
    e.preventDefault(); e.stopImmediatePropagation();
    unoNetAct('draw');
    return;
  }
  if (e.target.closest('#btn-pass') && UNO_NET.mode) {
    e.preventDefault(); e.stopImmediatePropagation();
    unoNetAct('pass');
    return;
  }
  if (e.target.closest('#btn-uno') && UNO_NET.mode) {
    e.preventDefault(); e.stopImmediatePropagation();
    unoNetAct('uno');
    return;
  }
  const catchBtn = e.target.closest('.catch-btn');
  if (catchBtn && UNO_NET.mode) {
    e.preventDefault(); e.stopImmediatePropagation();
    const idx = Number(catchBtn.dataset.catchIndex);
    const target = state.players[idx];
    if (target) unoNetAct('catch', { targetId: target.id });
    return;
  }
  const colorBtn = e.target.closest('.color-pick-btn');
  if (colorBtn && UNO_NET.mode) {
    e.preventDefault(); e.stopImmediatePropagation();
    unoNetColorChosen(colorBtn.dataset.color);
    return;
  }
  if (e.target.closest('#btn-restart') && UNO_NET.mode) {
    e.preventDefault(); e.stopImmediatePropagation();
    unoNetRestart();
    return;
  }
  if (e.target.closest('#btn-play-again') && UNO_NET.mode) {
    e.preventDefault(); e.stopImmediatePropagation();
    unoNetRestart();
    return;
  }
  if (e.target.closest('#btn-switch-mode') && UNO_NET.mode) {
    e.preventDefault(); e.stopImmediatePropagation();
    showToast('联机房间人数固定，请离开后另开房间');
  }
}, true);

document.getElementById('btn-online').addEventListener('click', function () {
  unoNetRenderLobby();
  openModal(unoNetEls.modal);
});
unoNetEls.countBtns.forEach((b) => b.addEventListener('click', () => {
  if (UNO_NET.room) return;
  unoNetEls.countBtns.forEach((x) => x.classList.remove('active'));
  b.classList.add('active');
  UNO_NET.playerCount = Number(b.dataset.netplayers);
  unoNetRenderLobby();
}));
unoNetEls.create.addEventListener('click', () => {
  if (UNO_NET.room) return;
  UNO_NET.playerCount = unoNetSelectedCount();
  unoNetConnect(unoNetCode(), true);
});
unoNetEls.join.addEventListener('click', () => {
  if (UNO_NET.room) return;
  unoNetConnect(unoNetEls.codeInput.value, false);
});
unoNetEls.start.addEventListener('click', () => {
  if (!UNO_NET.isHost || UNO_NET.started) return;
  if (UNO_NET.lobby.length !== UNO_NET.playerCount) {
    unoNetStatus('需要 ' + UNO_NET.playerCount + ' 名玩家才能开局');
    return;
  }
  unoNetStartFromPlayers(UNO_NET.lobby.slice(0, UNO_NET.playerCount));
});
unoNetEls.copy.addEventListener('click', () => {
  if (!UNO_NET.room) return;
  try {
    navigator.clipboard.writeText(UNO_NET.room);
    showToast('房间码已复制');
  } catch (_) { showToast(UNO_NET.room); }
});
unoNetEls.leave.addEventListener('click', unoNetLeave);
unoNetEls.close.addEventListener('click', () => closeModal(unoNetEls.modal));
unoNetEls.modal.addEventListener('click', (e) => {
  if (e.target === unoNetEls.modal) closeModal(unoNetEls.modal);
});

window.UNO_API = {
  state: state,
  net: UNO_NET,
  startGame: startGame,
  startOnline: unoNetStartFromPlayers,
  canPlayCard: canPlayCard,
  topDiscard: topDiscard,
  render: renderAll,
  clearTimers: clearAllTimers,
  syncState: unoNetBroadcastState,
  snapshot: () => unoNetSnapshot(UNO_NET.version),
  applySnapshot: unoNetApply,
  act: unoNetAct,
  handClick: unoNetHandClick,
  colorChosen: unoNetColorChosen,
  restart: unoNetRestart,
  connect: unoNetConnect
};