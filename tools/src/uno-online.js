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
  connecting: false
};
window.UNO_NET = UNO_NET;

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
      unoNetStatus(UNO_NET.started
        ? '对局进行中 · 房主会同步完整盘面'
        : `已连接，等待房主开局（${UNO_NET.lobby.length}/${count}）`);
    }
  } else {
    unoNetEls.setup.style.display = '';
    unoNetEls.roomPanel.classList.add('hidden');
    unoNetStatus('创建房间或输入房间码加入');
  }
}
function unoNetBroadcastLobby() {
  if (!UNO_NET.isHost || !UNO_NET.channel) return;
  UNO_NET.channel.send({
    type: 'broadcast',
    event: 'lobby',
    payload: {
      count: UNO_NET.playerCount,
      hostId: UNO_NET.hostId,
      started: UNO_NET.started,
      players: UNO_NET.lobby.map((p) => ({ id: p.id, name: p.name }))
    }
  });
}
function unoNetRebuildLobby() {
  if (!UNO_NET.isHost || !UNO_NET.channel) return;
  const stateMap = UNO_NET.channel.presenceState();
  const ids = [UNO_NET.myId];
  Object.keys(stateMap).forEach((key) => {
    if (key !== UNO_NET.myId && stateMap[key] && stateMap[key].length) ids.push(key);
  });
  const ordered = [];
  UNO_NET.lobby.forEach((p) => { if (ids.indexOf(p.id) >= 0) ordered.push(p); });
  ids.forEach((id) => {
    if (!ordered.some((p) => p.id === id)) ordered.push({ id: id, name: '玩家 ' + (ordered.length + 1) });
  });
  UNO_NET.lobby = ordered.slice(0, 4).map((p, i) => ({
    id: p.id,
    name: i === 0 ? '房主' : '玩家 ' + (i + 1)
  }));
  unoNetBroadcastLobby();
  unoNetRenderLobby();
}
function unoNetSnapshot() {
  const winner = state.gameOver ? state.players.findIndex((p) => p.hand.length === 0) : -1;
  return JSON.parse(JSON.stringify({
    room: UNO_NET.room,
    count: state.playerCount,
    players: state.players.map((p) => ({
      id: p.id, name: p.name, hand: p.hand,
      saidUno: p.saidUno, vulnerableUno: p.vulnerableUno
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
  UNO_NET.channel.send({ type: 'broadcast', event: 'state', payload: unoNetSnapshot() });
}
function unoNetApply(snapshot) {
  if (UNO_NET.isHost || !snapshot || snapshot.room !== UNO_NET.room) return;
  const own = snapshot.players.findIndex((p) => p.id === UNO_NET.myId);
  if (own < 0) { unoNetStatus('你不在本局玩家列表中'); return; }
  const n = snapshot.players.length;
  const rotated = snapshot.players.slice(own).concat(snapshot.players.slice(0, own));
  state.playerCount = n;
  state.players = rotated.map((p) => ({
    id: p.id, name: p.name, hand: p.hand || [],
    isHuman: true, saidUno: !!p.saidUno, vulnerableUno: !!p.vulnerableUno
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
  UNO_NET.mode = true;
  UNO_NET.started = true;
  document.body.classList.add('uno-online');
  els.btnMode3.classList.toggle('active', n === 3);
  els.btnMode4.classList.toggle('active', n === 4);
  renderAll();
  if (snapshot.gameOver && snapshot.winner >= 0 && !UNO_NET.overShown) {
    UNO_NET.overShown = true;
    finishGame((snapshot.winner - own + n) % n);
  }
}
async function unoNetConnect(code, host) {
  if (UNO_NET.connecting) return;
  code = (code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  if (code.length !== 6) { unoNetStatus('请输入 6 位房间码'); return; }
  UNO_NET.connecting = true;
  UNO_NET.room = code;
  UNO_NET.isHost = !!host;
  UNO_NET.myId = unoNetMyId();
  UNO_NET.hostId = host ? UNO_NET.myId : '';
  UNO_NET.started = false;
  UNO_NET.overShown = false;
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
      if (UNO_NET.isHost) {
        unoNetRebuildLobby();
        if (UNO_NET.started && UNO_NET.lobby.some((p) => p.id === key)) {
          setTimeout(unoNetBroadcastState, 160);
        }
      }
    });
    ch.on('presence', { event: 'leave' }, ({ key }) => {
      if (UNO_NET.isHost) unoNetRebuildLobby();
      else if (!UNO_NET.isHost && key === UNO_NET.hostId) {
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
      unoNetRenderLobby();
    });
    ch.on('broadcast', { event: 'state' }, ({ payload }) => {
      if (!UNO_NET.isHost) unoNetApply(payload);
    });
    ch.on('broadcast', { event: 'intent' }, ({ payload }) => {
      if (UNO_NET.isHost) unoNetHostIntent(payload);
    });
    ch.on('broadcast', { event: 'bye' }, () => {
      if (!UNO_NET.isHost) {
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
  if (state.gameOver || idx !== state.currentTurn) return;
  const p = state.players[idx];
  if (!p) return;
  if (state.pendingDraw > 0) {
    const amt = state.pendingDraw;
    state.pendingDraw = 0;
    state.pendingDrawType = null;
    const drawn = drawFromDeck(amt);
    p.hand.push(...drawn);
    p.saidUno = false; p.vulnerableUno = false;
    sortHand(p.hand);
    Sound.penalty();
    showToast(t().toastDrew(p.name, drawn.length));
    state.currentTurn = nextIndex(idx, 1);
    renderAll();
    return;
  }
  const drawn = drawFromDeck(1);
  if (!drawn.length) { state.currentTurn = nextIndex(idx, 1); renderAll(); return; }
  const card = drawn[0];
  p.hand.push(card);
  p.saidUno = false; p.vulnerableUno = false;
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
  }
}
function unoNetPass(idx) {
  if (state.gameOver || idx !== state.currentTurn || state.drawnPlayableCardId === null) return;
  state.drawnPlayableCardId = null;
  state.currentTurn = nextIndex(idx, 1);
  renderAll();
}
function unoNetUno(idx) {
  if (state.gameOver) return;
  const p = state.players[idx];
  if (!p) return;
  if (p.hand.length === 2 && idx === state.currentTurn) {
    p.saidUno = !p.saidUno;
    if (p.saidUno) Sound.uno();
  } else if (p.hand.length === 1 && p.vulnerableUno) {
    p.saidUno = true;
    p.vulnerableUno = false;
    if (state.unoGraceTimer) clearTimeout(state.unoGraceTimer);
    Sound.uno();
    showToast(t().toastUnoShout(p.name));
  }
  renderAll();
}
function unoNetHostIntent(payload) {
  if (!UNO_NET.isHost || !UNO_NET.started || !payload || state.gameOver) return;
  const playerIdx = state.players.findIndex((p) => p.id === payload.playerId);
  if (playerIdx < 0) return;
  const type = payload.type;
  if (type === 'play') {
    if (playerIdx !== state.currentTurn) return;
    const player = state.players[playerIdx];
    const card = player.hand.find((c) => c.id === payload.cardId);
    if (!card || !canPlayCard(card)) return;
    if (card.color === 'wild' && ['red', 'blue', 'green', 'yellow'].indexOf(payload.color) < 0) return;
    executePlayCard(playerIdx, card.id, payload.color || null);
    unoNetBroadcastState();
  } else if (type === 'draw') {
    if (playerIdx !== state.currentTurn) return;
    unoNetDraw(playerIdx);
    unoNetBroadcastState();
  } else if (type === 'pass') {
    if (playerIdx !== state.currentTurn) return;
    unoNetPass(playerIdx);
    unoNetBroadcastState();
  } else if (type === 'uno') {
    if (playerIdx !== state.currentTurn) return;
    unoNetUno(playerIdx);
    unoNetBroadcastState();
  } else if (type === 'catch') {
    const target = state.players.findIndex((p) => p.id === payload.targetId);
    if (target < 0) return;
    applyUnoPenalty(target);
    unoNetBroadcastState();
  } else if (type === 'rematch') {
    if (playerIdx !== 0) return;
    unoNetStartFromPlayers(state.players.map((p) => ({ id: p.id, name: p.name })));
  }
}
function unoNetAct(type, extra) {
  if (!UNO_NET.mode || !UNO_NET.started) return;
  const payload = Object.assign({ type: type, playerId: UNO_NET.myId }, extra || {});
  if (UNO_NET.isHost) {
    unoNetHostIntent(payload);
  } else if (UNO_NET.channel) {
    UNO_NET.channel.send({ type: 'broadcast', event: 'intent', payload: payload });
  }
}
function unoNetStartFromPlayers(players) {
  clearAllTimers();
  state.playerCount = players.length;
  state.deck = createDeck();
  state.discard = [];
  state.direction = 1;
  state.pendingDraw = 0;
  state.pendingDrawType = null;
  state.drawnPlayableCardId = null;
  state.awaitingWildColor = false;
  state.pendingWildCardId = null;
  state.gameOver = false;
  state.players = players.map((p) => ({
    id: p.id, name: p.name, isHuman: true, hand: [], saidUno: false, vulnerableUno: false
  }));
  for (let r = 0; r < 7; r++) {
    for (const p of state.players) p.hand.push(state.deck.pop());
  }
  state.players.forEach((p) => sortHand(p.hand));
  let first = state.deck.pop();
  while (first.value === 'wild4' || first.value === 'wild') {
    state.deck.unshift(first);
    shuffle(state.deck);
    first = state.deck.pop();
  }
  state.discard.push(first);
  state.activeColor = first.color;
  state.currentTurn = 0;
  if (first.value === 'reverse') state.direction = -1;
  els.btnMode3.classList.toggle('active', state.playerCount === 3);
  els.btnMode4.classList.toggle('active', state.playerCount === 4);
  UNO_NET.mode = true;
  UNO_NET.started = true;
  UNO_NET.overShown = false;
  document.body.classList.add('uno-online');
  closeModal(els.wildModal);
  closeModal(els.gameoverModal);
  closeModal(unoNetEls.modal);
  renderAll();
  unoNetBroadcastState();
  unoNetBroadcastLobby();
  unoNetRenderLobby();
}
function unoNetHandClick(cardId) {
  if (!UNO_NET.mode || state.gameOver || state.currentTurn !== 0 || state.awaitingWildColor) return;
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
  if (!state.awaitingWildColor || !state.pendingWildCardId) return;
  const id = state.pendingWildCardId;
  state.awaitingWildColor = false;
  state.pendingWildCardId = null;
  closeModal(els.wildModal);
  unoNetAct('play', { cardId: id, color: color });
}
function unoNetRestart() {
  if (!UNO_NET.mode) return;
  if (!UNO_NET.isHost) { showToast('等待房主开新局'); return; }
  const players = state.players.length === 3 || state.players.length === 4
    ? state.players.map((p) => ({ id: p.id, name: p.name }))
    : UNO_NET.lobby.slice(0, UNO_NET.playerCount);
  unoNetStartFromPlayers(players);
}
function unoNetLeave() {
  if (UNO_NET.channel) {
    try { UNO_NET.channel.send({ type: 'broadcast', event: 'bye', payload: { id: UNO_NET.myId } }); } catch (_) {}
    try { UNO_NET.channel.unsubscribe(); } catch (_) {}
  }
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
    unoNetAct('catch', { targetId: Number(catchBtn.dataset.catchId) });
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
  canPlayCard: canPlayCard
};