import { launch } from './cdp.mjs';
const SHOTS = path.join(import.meta.dirname, 'shots');
mkdirSync(SHOTS, { recursive: true });
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const url = pathToFileURL(path.join(import.meta.dirname, '..', 'play.html')).href;
const b = await launch(url);
const R = [];
const t = async (id, fn) => {
  try {
    const d = await fn();
    if (d && typeof d === 'object' && 'pass' in d) R.push({ id, pass: !!d.pass, detail: d.detail });
    else R.push({ id, pass: d === true || d === undefined, detail: typeof d === 'string' ? d : undefined });
  } catch (e) { R.push({ id, pass: false, detail: e.message }); }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const waitFor = async (expr, ms = 10000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await b.evaluate(`(() => { try { return !!(${expr}); } catch(e) { return false; } })()`)) return true;
    await sleep(120);
  }
  return false;
};
const clickPoint = async (canvasId, n, r, c) => {
  const pt = await b.evaluate(`(() => {
    const el = document.getElementById('${canvasId}');
    el.scrollIntoView({block:'center'});
    const rect = el.getBoundingClientRect();
    const cell = (1240 - 92*2) / (${n} - 1);
    return { x: rect.left + (92 + ${c} * cell) / 1240 * rect.width,
             y: rect.top + (92 + ${r} * cell) / 1240 * rect.height };
  })()`);
  await b.clickAt(pt.x, pt.y);
};

try {
  /* 正式连珠（人机） */
  await b.clickSel('#gRuleSeg button[data-v="renju"]');
  await b.clickSel('#gOpeningSeg button[data-v="formal"]');
  await b.clickSel('#gOppSeg button[data-v="ai"]');
  await b.clickSel('#gLevelSeg button[data-v="2"]');
  await b.clickSel('#gNew');
  await sleep(300);

  await t('local.renju_formal_flow', async () => {
    if (await b.evaluate('G.phase') !== 'select') return 'not select';
    const n = await b.evaluate(`document.querySelectorAll('#gOpenings button').length`);
    if (n !== 26) return 'openings=' + n;
    await b.evaluate(`document.querySelectorAll('#gOpenings button')[0].click()`);
    if (!await waitFor(`G.phase === 'offer5' && G.history.length === 4 && !G.thinking`, 8000)) return 'no offer5: ' + JSON.stringify(await b.evaluate(`({p:G.phase,h:G.history.length,t:G.thinking,msg:G.msg})`));
    await clickPoint('gBoard', 15, 4, 4);
    await sleep(300);
    await clickPoint('gBoard', 15, 10, 10);
    const ended = await waitFor(`G.phase === 'play' && G.history.length === 6 && !G.thinking`, 10000);
    if (!ended) return 'no play: ' + JSON.stringify(await b.evaluate(`({p:G.phase,h:G.history.length,t:G.thinking,msg:G.msg})`));
    const s = await b.evaluate(`({h:G.history, final:G.finalUserColor, status:document.getElementById('gStatus').textContent})`);
    if (s.h[0].color !== 1 || s.h[1].color !== 2 || s.h[5].color !== 2) return 'colors wrong';
    if (!s.status.includes('国际连珠')) return 'status';
    return true;
  });
  await b.screenshot(path.join(SHOTS, 'local-renju-formal.png'));

  /* 围棋提子渲染 */
  await b.clickSel('#tabGo');
  await b.clickSel('#wOppSeg button[data-v="human"]');
  await b.clickSel('#wSizeSeg button[data-v="9"]');
  await b.clickSel('#wNew');
  await sleep(300);
  await b.evaluate(`(() => {
    W.size = 9; W.board = wEmptyBoard(9); W.history = []; W.capB=0; W.capW=0; W.passes=0; W.prevHash=null; W.lastMove=null; W.koPoint=null;
    W.over=false; W.winner=0; W.scoreInfo=null; W.turn=1; W.msg=''; W.msgType='';
    [[3,5,1],[5,5,1],[4,6,1],[4,5,2]].forEach(p => { W.board[p[0]][p[1]]=p[2]; W.history.push({r:p[0],c:p[1],color:p[2],captured:0,prevHashBefore:null}); });
    wRender();
  })()`);
  await clickPoint('wBoard', 9, 4, 4);
  await sleep(300);

  await t('local.go_capture_not_drawn', async () => {
    const r = await b.evaluate(`(() => {
      const c = document.getElementById('wBoard');
      const cell = (1240 - 92*2) / 8;
      const d = c.getContext('2d').getImageData(92 + 5*cell, 92 + 4*cell, 1, 1).data;
      return { board: W.board[4][5], capB: W.capB, px: [d[0],d[1],d[2]] };
    })()`);
    if (r.board !== 0 || r.capB !== 1) return 'capture failed ' + JSON.stringify(r);
    if (r.px[0] > 235 && r.px[1] > 225 && r.px[2] > 205) return 'white stone still drawn ' + JSON.stringify(r.px);
    return true;
  });
  await b.screenshot(path.join(SHOTS, 'local-go-capture.png'));

  /* 围棋双停数子 */
  await b.clickSel('#wNew');
  await sleep(300);
  await clickPoint('wBoard', 9, 2, 2);
  await clickPoint('wBoard', 9, 6, 6);
  await b.clickSel('#wPass');
  await b.clickSel('#wPass');
  await sleep(300);
  await t('local.go_double_pass_score', async () => {
    const r = await b.evaluate(`({over:W.over, score:W.scoreInfo, text:document.getElementById('wResult').textContent})`);
    if (!r.over || !r.score) return 'not over ' + JSON.stringify(r);
    if (!r.text.includes('终局数子') || !r.text.includes('7.5')) return 'text ' + r.text;
    return true;
  });
  await b.screenshot(path.join(SHOTS, 'local-go-score.png'));

  /* 五子棋回放/悔棋/认输 */
  await b.clickSel('#tabGomoku');
  await b.clickSel('#gRuleSeg button[data-v="free"]');
  await b.clickSel('#gOppSeg button[data-v="human"]');
  await b.clickSel('#gNew');
  await sleep(300);
  await clickPoint('gBoard', 15, 7, 7);
  await clickPoint('gBoard', 15, 7, 8);
  await clickPoint('gBoard', 15, 8, 8);
  await b.clickSel('#gReplayBtn');
  await sleep(200);
  await t('local.gomoku_replay_undo_resign', async () => {
    let r = await b.evaluate(`({replay:G.replay, hist:G.history.length})`);
    if (r.replay !== 3) return 'replay ' + JSON.stringify(r);
    await b.clickSel('#gRepPrev');
    r = await b.evaluate(`G.replay`);
    if (r !== 2) return 'prev ' + r;
    await b.clickSel('#gRepExit');
    await b.clickSel('#gUndo');
    r = await b.evaluate(`G.history.length`);
    if (r !== 2) return 'undo ' + r;
    await b.clickSel('#gResign');
    r = await b.evaluate(`({over:G.over, win:G.winner})`);
    if (!r.over) return 'resign';
    return true;
  });

  /* 下载 payload 不含联机库 */
  await t('local.download_payload', async () => {
    await b.evaluate(`(() => { window.__dl=null; const orig=URL.createObjectURL.bind(URL); URL.createObjectURL=function(blob){ blob.text().then(t=>window.__dl=t); return orig(blob); }; })()`);
    await b.clickSel('#btnDownload');
    if (!await waitFor('window.__dl !== null', 4000)) return 'no download';
    const r = await b.evaluate(`(() => { const t=window.__dl; return {len:t.length, title:t.includes('<title>棋盘 · Gridfall</title>'), sup:/<script[^>]*data-online|<script[^>]+src="supabase/.test(t), tail:t.slice(-8)}; })()`);
    if (!r.title) return 'title';
    if (r.sup) return 'online lib tag not stripped';
    if (!r.tail.includes('</html>')) return 'tail ' + r.tail;
    return true;
  });

  const fail = R.filter(r => !r.pass);
  console.log(`LOCAL TOTAL ${R.length} PASS ${R.length - fail.length} FAIL ${fail.length}`);
  R.forEach(r => console.log((r.pass ? 'PASS ' : 'FAIL ') + r.id + (r.detail ? ' :: ' + r.detail : '')));
} finally {
  await b.close();
}