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
  await goto(page('tiaoqi.html'));
  console.log('tq', JSON.stringify(await b.evaluate(`({
    title: document.title,
    pill: document.querySelector('a[href="./index.html"]') ? 1 : 0,
    pieces: document.querySelectorAll('#board circle').length,
    mode: !!document.querySelector('#modeSeg button'),
    newBtn: !!document.getElementById('btnNew')
  })`)));
  await b.screenshot(path.join(SHOTS, 'tiaoqi-page.png'));

  await goto(page('game2048.html'));
  const before = await b.evaluate(`({tiles:document.querySelectorAll('#tiles .tile').length, moves:document.getElementById('moves').textContent, score:document.getElementById('score').textContent})`);
  for (const key of ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown']) {
    await b.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key, windowsVirtualKeyCode: { ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40 }[key] });
    await b.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode: { ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40 }[key] });
    await sleep(250);
  }
  const after = await b.evaluate(`({tiles:document.querySelectorAll('#tiles .tile').length, moves:document.getElementById('moves').textContent, score:document.getElementById('score').textContent, pill:!!document.querySelector('a[href="./index.html"]')})`);
  console.log('2048', JSON.stringify({ before, after }));
  await b.screenshot(path.join(SHOTS, '2048-page.png'));

  await goto(page('junqi.html'));
  console.log('jq', JSON.stringify(await b.evaluate(`({ title:document.title, pill:!!document.querySelector('a[href="./index.html"]'), status:document.getElementById('statusText').textContent, confirm:document.getElementById('btnConfirm').textContent })`)));
  await b.clickSel('#btnConfirm'); await sleep(600);
  console.log('jq after', JSON.stringify(await b.evaluate(`({ status:document.getElementById('statusText').textContent, confirm:document.getElementById('btnConfirm').textContent, phase:window.state?state.phase:null })`)));
  await b.screenshot(path.join(SHOTS, 'junqi-page.png'));

  await goto(page('saolei.html'));
  console.log('sl', JSON.stringify(await b.evaluate(`({ title:document.title, pill:!!document.querySelector('a[href="./index.html"]'), cells:document.querySelectorAll('.cell').length, timer:document.getElementById('timer').textContent })`)));
  await b.clickSel('.cell'); await sleep(800);
  console.log('sl after', JSON.stringify(await b.evaluate(`({ opened:document.querySelectorAll('.cell.open').length, timer:document.getElementById('timer').textContent, msg:document.getElementById('msg').textContent })`)));
  await b.screenshot(path.join(SHOTS, 'saolei-page.png'));
} finally { await b.close(); }