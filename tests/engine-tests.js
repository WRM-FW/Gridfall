(() => {
  const R = [];
  const t = (id, fn) => {
    try {
      const out = fn();
      if (out === true) R.push({ id, pass: true });
      else R.push({ id, pass: false, detail: String(out) });
    } catch (e) {
      R.push({ id, pass: false, detail: 'EXCEPTION ' + e.message });
    }
  };
  const bd = () => gEmptyBoard();
  const put = (b, list) => { list.forEach(x => b[x[0]][x[1]] = x[2]); return b; };

  // ---------- Renju 胜负 ----------
  t('renju.black_exact_five_wins', () => {
    const b = put(bd(), [[7,3,1],[7,4,1],[7,5,1],[7,6,1]]);
    b[7][7] = 1;
    return !!winInfoAt(b,7,7,1,true);
  });
  t('renju.black_overline_not_win', () => {
    const b = put(bd(), [[7,3,1],[7,4,1],[7,5,1],[7,6,1],[7,8,1]]);
    b[7][7] = 1;
    return winInfoAt(b,7,7,1,true) === null;
  });
  t('renju.black_overline_forbidden', () => {
    const b = put(bd(), [[7,3,1],[7,4,1],[7,5,1],[7,6,1],[7,8,1]]);
    return forbiddenAt(b,7,7,1) === '长连';
  });
  t('renju.white_overline_wins', () => {
    const b = put(bd(), [[7,3,2],[7,4,2],[7,5,2],[7,6,2],[7,8,2]]);
    b[7][7] = 2;
    return !!winInfoAt(b,7,7,2,true);
  });
  t('freestyle.overline_wins', () => {
    const b = put(bd(), [[7,3,1],[7,4,1],[7,5,1],[7,6,1],[7,8,1]]);
    b[7][7] = 1;
    return !!winInfoAt(b,7,7,1,false);
  });

  // ---------- 禁手 ----------
  t('renju.double_three_forbidden', () => {
    const b = put(bd(), [[7,6,1],[7,8,1],[6,7,1],[8,7,1]]);
    return forbiddenAt(b,7,7,1) === '三三';
  });
  t('renju.double_four_forbidden', () => {
    const b = put(bd(), [[7,4,1],[7,5,1],[7,6,1],[4,7,1],[5,7,1],[6,7,1]]);
    return forbiddenAt(b,7,7,1) === '四四';
  });
  t('renju.five_beats_double_four', () => {
    const b = put(bd(), [[7,4,1],[7,5,1],[7,6,1],[3,7,1],[4,7,1],[5,7,1],[6,7,1]]);
    return forbiddenAt(b,7,7,1) === null;
  });
  t('renju.pseudo_three_not_forbidden', () => {
    // 横三被白子堵住一端（眠三），竖三为活三 => 只有 1 个活三，不构成三三
    const b = put(bd(), [[7,5,2],[7,6,1],[7,8,1],[6,7,1],[8,7,1]]);
    return forbiddenAt(b,7,7,1) === null;
  });
  t('renju.occupied_point_never_forbidden', () => {
    const b = put(bd(), [[7,6,1],[7,8,1],[6,7,1],[8,7,1]]);
    b[7][7] = 2;
    return forbiddenAt(b,7,7,1) === null;
  });
  t('renju.edge_forbidden_no_crash', () => {
    const b = put(bd(), [[0,0,1],[0,1,1],[1,0,1],[1,1,1]]);
    const f = forbiddenAt(b,0,2,1);
    return f === null || typeof f === 'string';
  });

  // ---------- 开局面板 ----------
  t('opening.26_shapes', () => OPENINGS.length === 26);
  t('opening.3_stones_each', () => OPENINGS.every(o => o.cells.length === 3 && o.cells[0][0] === 7 && o.cells[0][1] === 7 && o.cells[0][2] === 1));
  t('opening.unique_colored_positions', () => {
    const set = new Set(OPENINGS.map(o => o.cells.map(c => c[0] + ',' + c[1] + ',' + c[2]).sort().join(';')));
    return set.size === 26;
  });
  t('opening.third_move_within_5x5', () => {
    // RIF: 第三手必须在以天元为中心的 5×5 内（偏移 -2..2）
    const bad = OPENINGS.filter(o => Math.max(Math.abs(o.cells[2][0] - 7), Math.abs(o.cells[2][1] - 7)) > 2).map(o => o.name);
    return bad.length === 0 ? true : 'outside 5x5: ' + bad.join(',');
  });
  t('opening.white_second_move', () => OPENINGS.every(o => o.cells[1][2] === 2 && o.cells[2][2] === 1));

  // ---------- 四计数去重（历史 Bug：两个获胜点被算成两个四） ----------
  t('renju.four_counts_once', () => {
    const b = put(bd(), [[7,3,1],[7,4,1],[7,5,1]]);
    b[7][6] = 1;
    return countFoursAt(b, 7, 6) === 1;
  });

  // ---------- AI ----------
  t('ai.level3_takes_immediate_win', () => {
    const b = put(bd(), [[7,3,2],[7,4,2],[7,5,2],[7,6,2],[8,8,1],[9,9,1]]);
    const mv = gomokuAI(b, 2, 3, false);
    return !!mv && mv[0] === 7 && (mv[1] === 2 || mv[1] === 7);
  });
  t('ai.level3_blocks_opponent_five', () => {
    const b = put(bd(), [[7,3,1],[7,4,1],[7,5,1],[7,6,1],[6,6,2],[8,9,2]]);
    const mv = gomokuAI(b, 2, 3, false);
    return !!mv && mv[0] === 7 && (mv[1] === 2 || mv[1] === 7);
  });
  t('ai.level5_never_illegal_renju_move', () => {
    // 随机 12 个中盘局面，黑方落子必须合法（forbiddenAt 深度 0 与 1 均判非禁手）
    let seed = 12345;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let g = 0; g < 12; g++) {
      const b = gEmptyBoard();
      let n = 0, tries = 0;
      while (n < 16 && tries++ < 500) {
        const r = Math.floor(rnd() * 15), c = Math.floor(rnd() * 15);
        if (b[r][c]) continue;
        b[r][c] = (n % 2) + 1; n++;
      }
      const mv = gomokuAI(b, 1, 5, true);
      if (!mv) return 'AI returned null on board ' + g;
      if (b[mv[0]][mv[1]] !== 0) return 'AI picked occupied cell ' + mv + ' board ' + g;
      if (forbiddenAt(b, mv[0], mv[1], 1)) return 'AI picked forbidden ' + forbiddenAt(b, mv[0], mv[1], 1) + ' at ' + mv + ' board ' + g;
    }
    return true;
  });
  t('vcf.finds_open_four', () => {
    const b = put(bd(), [[7,3,1],[7,4,1],[7,5,1],[6,6,2],[8,8,2],[6,8,2],[8,6,2]]);
    const mv = vcfSearch(b, 1, 7, true);
    return !!mv;
  });
  t('vcf.nonforcing_open_four', () => {
    // 白走 (6,4) 形成活四，但黑已有一步成五 (6,7)：该活四不是杀，VCF 不应返回
    const b = put(bd(), [[7,7,1],[5,5,2],[5,7,1],[3,7,2],[4,7,1],[4,6,2],[8,7,1]]);
    const mv = vcfSearch(b, 2, 7, false);
    return mv === null || (mv[0] === 6 && mv[1] === 7) ? true : 'vcf returned ' + JSON.stringify(mv);
  });
  t('ai.level5_answers_immediate_five', () => {
    // 同一局面：极难白必须堵 (6,7)，不能走 (6,4) 自顾做活四
    const b = put(bd(), [[7,7,1],[5,5,2],[5,7,1],[3,7,2],[4,7,1],[4,6,2],[8,7,1]]);
    const mv = gomokuAI(b, 2, 5, false);
    return !!mv && mv[0] === 6 && mv[1] === 7 ? true : 'level5 played ' + JSON.stringify(mv);
  });

  // ---------- 围棋 ----------
  t('go.capture_single', () => {
    const n = 9, b = wEmptyBoard(n);
    b[4][5] = 2; b[3][5] = 1; b[5][5] = 1; b[4][6] = 1;
    const res = wTryPlay(b, n, 4, 4, 1, null);
    return !!res && res.captured === 1 && res.board[4][5] === 0;
  });
  t('go.capture_group', () => {
    const n = 9, b = wEmptyBoard(n);
    b[4][5] = 2; b[4][6] = 2;
    [[3,5],[5,5],[3,6],[5,6],[4,7]].forEach(p => b[p[0]][p[1]] = 1);
    const res = wTryPlay(b, n, 4, 4, 1, null);
    return !!res && res.captured === 2 && res.board[4][5] === 0 && res.board[4][6] === 0;
  });
  t('go.suicide_rejected', () => {
    const n = 9, b = wEmptyBoard(n);
    [[3,4],[4,3],[5,4],[4,5]].forEach(p => b[p[0]][p[1]] = 2);
    return wTryPlay(b, n, 4, 4, 1, null) === null;
  });
  t('go.ko_immediate_retake_rejected', () => {
    const n = 9, b = wEmptyBoard(n);
    b[3][4] = 1; b[4][3] = 1; b[5][4] = 1;
    b[4][4] = 2; b[3][5] = 2; b[5][5] = 2; b[4][6] = 2;
    const before = wHash(b, n);
    const res = wTryPlay(b, n, 4, 5, 1, null);
    if (!res || res.captured !== 1) return 'capture failed';
    const recapture = wTryPlay(res.board, n, 4, 4, 2, before);
    if (recapture !== null) return 'recapture not rejected';
    const afterElsewhere = wTryPlay(res.board, n, 0, 0, 2, before);
    return !!afterElsewhere;
  });
  t('go.score_komi', () => {
    const n = 9, b = wEmptyBoard(n);
    b[0][0] = 1;
    const sc = wScore(b, n);
    return sc.black === 81 && sc.white === 7.5 && sc.winner === 1;
  });
  t('go.ai_captures_atari', () => {
    W.gen++;
    const b = wEmptyBoard(9);
    b[4][4] = 1; b[3][4] = 2; b[4][3] = 2; b[5][4] = 2;
    const fake = { size: 9, board: b, turn: 2, level: 3, history: [], lastMove: null, prevHash: null, playerColor: 1 };
    const mv = goAI(fake);
    if (mv === 'pass') return 'AI passed instead of capturing';
    const res = wTryPlay(b, 9, mv[0], mv[1], 2, null);
    return !!res && res.captured === 1;
  });
  t('go.ai_l5_captures_atari', () => {
    const b = wEmptyBoard(9);
    b[4][4] = 1; b[3][4] = 2; b[4][3] = 2; b[5][4] = 2;
    const fake = { size: 9, board: b, turn: 2, level: 5, history: [], lastMove: null, prevHash: null, playerColor: 1 };
    const mv = goAI(fake);
    if (mv === 'pass') return 'AI passed instead of capturing';
    const res = wTryPlay(b, 9, mv[0], mv[1], 2, null);
    return !!res && res.captured === 1 ? true : 'played ' + JSON.stringify(mv);
  });
  t('go.ai_l5_saves_atari', () => {
    const b = wEmptyBoard(9);
    b[4][4] = 2; b[4][5] = 2;
    [[3,4],[3,5],[5,4],[5,5],[4,3]].forEach(p => b[p[0]][p[1]] = 1);
    const fake = { size: 9, board: b, turn: 2, level: 5, history: [], lastMove: null, prevHash: null, playerColor: 1 };
    const mv = goAI(fake);
    if (mv === 'pass') return 'AI passed instead of saving';
    const res = wTryPlay(b, 9, mv[0], mv[1], 2, null);
    if (!res) return 'illegal ' + JSON.stringify(mv);
    const g = wGroup(res.board, 9, 4, 4);
    return g.liberties >= 2 ? true : 'played ' + JSON.stringify(mv) + ' libs ' + g.liberties;
  });
  t('go.ai_l5_opens_on_star', () => {
    const fake = { size: 19, board: wEmptyBoard(19), turn: 1, level: 5, history: [], lastMove: null, prevHash: null, playerColor: 2 };
    const mv = goAI(fake);
    return Array.isArray(mv) && wIsStar(19, mv[0], mv[1]) ? true : 'played ' + JSON.stringify(mv);
  });
  t('go.ai_eye_penalty', () => {
    const b = wEmptyBoard(9);
    [[3,4],[5,4],[4,3],[4,5]].forEach(p => b[p[0]][p[1]] = 2);
    const isEye = wTrueEye(b, 9, 4, 4, 2);
    const fake = { size: 9, board: b, turn: 2, level: 5, history: [], lastMove: null, prevHash: null, playerColor: 1 };
    const res = wTryPlay(b, 9, 4, 4, 2, null);
    const s = wQuickMoveScore(fake, b, 9, 2, 4, 4, res, null, 10);
    return isEye && s < -300 ? true : 'eye ' + isEye + ' score ' + s;
  });
  t('go.ai_l5_time_budget', () => {
    const b = wEmptyBoard(19);
    [[3,3,1],[3,15,2],[15,3,2],[15,15,1],[9,9,1],[9,3,2],[3,9,2],[15,9,1],[9,15,2],[6,6,1],[6,12,2],[12,6,2],[12,12,1]]
      .forEach(p => b[p[0]][p[1]] = p[2]);
    const fake = { size: 19, board: b, turn: 2, level: 5, history: new Array(13).fill({pass:false}), lastMove: [12,12], prevHash: null, playerColor: 1 };
    const t0 = Date.now();
    const mv = goAI(fake);
    const ms = Date.now() - t0;
    if (!mv) return 'no move';
    return ms <= 5000 ? true : 'slow ' + ms + 'ms';
  });

  // ---------- 战绩分桶 ----------
  t('stats.gomoku_key_shape', () => {
    G.rule = 'renju'; G.level = 3; G.opp = 'ai';
    return gKey() === 'renju|3|AI';
  });
  t('stats.go_key_shape', () => {
    W.size = 19; W.level = 3; W.opp = 'ai';
    return wStatKey() === '19路|3|AI';
  });
  return R;
})()