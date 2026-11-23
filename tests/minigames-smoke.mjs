import { launch } from './cdp.mjs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';

const SHOTS = path.join(import.meta.dirname, 'shots');
mkdirSync(SHOTS, { recursive: true });
const ROOT = path.join(import.meta.dirname, '..');
const page = n => pathToFileURL(path.join(ROOT, n)).href;
const b = await launch(page('index.html'), { port: 9601 });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const goto = async u => { await b.send('Page.navigate', { url: u }); await sleep(1000); };

try {
  await goto(page('games/chinese-checkers/index.html'));
  console.log('tq', JSON.stringify(await b.evaluate(`({
    title: document.title,
    pill: document.querySelector('a[title="返回 Gridfall 游戏大厅"]') ? 1 : 0,
    pieces: document.querySelectorAll('#board circle').length,
    mode: !!document.querySelector('#modeSeg button'),
    newBtn: !!document.getElementById('btnNew')
  })`)));
  await b.screenshot(path.join(SHOTS, 'tiaoqi-page.png'));

  await goto(page('games/2048/index.html'));
  const before = await b.evaluate(`({tiles:document.querySelectorAll('#tiles .tile').length, moves:document.getElementById('moves').textContent, score:document.getElementById('score').textContent})`);
  for (const key of ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown']) {
    await b.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key, windowsVirtualKeyCode: { ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40 }[key] });
    await b.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode: { ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40 }[key] });
    await sleep(250);
  }
  const after = await b.evaluate(`({tiles:document.querySelectorAll('#tiles .tile').length, moves:document.getElementById('moves').textContent, score:document.getElementById('score').textContent, pill:!!document.querySelector('a[title="返回 Gridfall 游戏大厅"]')})`);
  console.log('2048', JSON.stringify({ before, after }));
  await b.screenshot(path.join(SHOTS, '2048-page.png'));

  await goto(page('games/army-chess/index.html'));
  console.log('jq', JSON.stringify(await b.evaluate(`({ title:document.title, pill:!!document.querySelector('a[title="返回 Gridfall 游戏大厅"]'), status:document.getElementById('statusText').textContent, confirm:document.getElementById('btnConfirm').textContent })`)));
  await b.clickSel('#btnConfirm'); await sleep(600);
  console.log('jq after', JSON.stringify(await b.evaluate(`({ status:document.getElementById('statusText').textContent, confirm:document.getElementById('btnConfirm').textContent, phase:window.state?state.phase:null })`)));
  await b.screenshot(path.join(SHOTS, 'junqi-page.png'));

  await goto(page('games/minesweeper/index.html'));
  console.log('sl', JSON.stringify(await b.evaluate(`({ title:document.title, pill:!!document.querySelector('a[title="返回 Gridfall 游戏大厅"]'), cells:document.querySelectorAll('.cell').length, timer:document.getElementById('timer').textContent })`)));
  await b.clickSel('.cell'); await sleep(800);
  console.log('sl after', JSON.stringify(await b.evaluate(`({ opened:document.querySelectorAll('.cell.open').length, timer:document.getElementById('timer').textContent, msg:document.getElementById('msg').textContent })`)));
  await b.screenshot(path.join(SHOTS, 'saolei-page.png'));

  await goto(page('games/snake/index.html'));
  console.log('snake', JSON.stringify(await b.evaluate(`({ title:document.title, pill:!!document.querySelector('a[title="返回 Gridfall 游戏大厅"]'), canvas:!!document.getElementById('cv'), score:document.getElementById('score').textContent })`)));
  await b.send('Input.dispatchKeyEvent', { type:'keyDown', key:'ArrowRight', code:'ArrowRight', windowsVirtualKeyCode:39 });
  await b.send('Input.dispatchKeyEvent', { type:'keyUp', key:'ArrowRight', code:'ArrowRight', windowsVirtualKeyCode:39 });
  await sleep(500);
  console.log('snake after', JSON.stringify(await b.evaluate(`({ running:running, waiting:waiting, len:snake.length, over:document.getElementById('over').classList.contains('show') })`)));
  await b.screenshot(path.join(SHOTS, 'snake-page.png'));

  await goto(page('games/sokoban/index.html'));
  console.log('sokoban', JSON.stringify(await b.evaluate(`({ title:document.title, pill:!!document.querySelector('a[title="返回 Gridfall 游戏大厅"]'), canvas:!!document.getElementById('cv'), lv:document.getElementById('lv').textContent, steps:document.getElementById('steps').textContent })`)));
  await b.send('Input.dispatchKeyEvent', { type:'keyDown', key:'ArrowUp', code:'ArrowUp', windowsVirtualKeyCode:38 });
  await b.send('Input.dispatchKeyEvent', { type:'keyUp', key:'ArrowUp', code:'ArrowUp', windowsVirtualKeyCode:38 });
  await sleep(200);
  console.log('sokoban after', JSON.stringify(await b.evaluate(`({ steps:document.getElementById('steps').textContent, boxes:boxes.size, player:player })`)));
  await b.send('Input.dispatchKeyEvent', { type:'keyDown', key:'z', code:'KeyZ', windowsVirtualKeyCode:90 });
  await b.send('Input.dispatchKeyEvent', { type:'keyUp', key:'z', code:'KeyZ', windowsVirtualKeyCode:90 });
  await sleep(200);
  console.log('sokoban undo', JSON.stringify(await b.evaluate(`({ steps:document.getElementById('steps').textContent })`)));
  await b.screenshot(path.join(SHOTS, 'sokoban-page.png'));

  await goto(page('games/tetris/index.html'));
  console.log('tetris', JSON.stringify(await b.evaluate(`({ title:document.title, pill:!!document.querySelector('a[title="返回 Gridfall 游戏大厅"]'), canvas:!!document.getElementById('board'), score:document.getElementById('score').textContent })`)));
  await b.evaluate(`document.getElementById('btnStart').click()`);
  await sleep(300);
  for (const [key, code, vk] of [['ArrowLeft','ArrowLeft',37],['ArrowUp','ArrowUp',38],[' ','Space',32]]) {
    await b.send('Input.dispatchKeyEvent', { type:'keyDown', key, code, windowsVirtualKeyCode:vk });
    await b.send('Input.dispatchKeyEvent', { type:'keyUp', key, code, windowsVirtualKeyCode:vk });
    await sleep(150);
  }
  console.log('tetris after', JSON.stringify(await b.evaluate(`({ running:running, paused:paused, score:document.getElementById('score').textContent, over:document.getElementById('over').classList.contains('show') })`)));
  await b.screenshot(path.join(SHOTS, 'tetris-page.png'));

  await goto(page('games/tic-tac-toe/index.html'));
  console.log('ttt', JSON.stringify(await b.evaluate(`({ title:document.title, pill:!!document.querySelector('a[title="返回 Gridfall 游戏大厅"]'), cells:document.querySelectorAll('.cell').length, mode:document.getElementById('mode').value })`)));
  await b.evaluate(`document.querySelectorAll('.cell')[4].click()`); await sleep(600);
  console.log('ttt after', JSON.stringify(await b.evaluate(`({ mark:board[4], over:gameOver, turn:current, sx:document.getElementById('sx').textContent })`)));
  await b.screenshot(path.join(SHOTS, 'tic-tac-toe-page.png'));
} finally { await b.close(); }