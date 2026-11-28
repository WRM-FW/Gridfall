import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'gridfall-build-eol-'));
const textExt = new Set(['.html', '.js', '.mjs', '.css', '.md', '.txt', '.json']);
const scripts = ['build-home.mjs', 'build-xiangqi.mjs', 'build-uno.mjs', 'build-page.mjs', 'build-minigames.mjs'];
const outputs = ['index.html', 'games/chinese-chess/index.html', 'games/uno/index.html', 'games/board-club/index.html', 'games/2048/index.html'];

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function toCrlf(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      toCrlf(file);
      continue;
    }
    if (!textExt.has(path.extname(entry.name).toLowerCase())) continue;
    fs.chmodSync(file, 0o666);
    const text = fs.readFileSync(file, 'utf8');
    fs.writeFileSync(file, text.replace(/\r\n?/g, '\n').replace(/\n/g, '\r\n'), 'utf8');
  }
}

try {
  const attrs = fs.readFileSync(path.join(ROOT, '.gitattributes'), 'utf8');
  if (!/^\*\s+text=auto\s+eol=lf\s*$/m.test(attrs)) throw new Error('.gitattributes does not pin LF');

  copyDir(path.join(ROOT, 'tools'), path.join(temp, 'tools'));
  toCrlf(path.join(temp, 'tools'));

  const sources = ['design/home-reference.html', 'design/xiangqi-reference.html', 'design/uno-reference.html', 'design/board-reference.html', 'src/uno-online.js'];
  for (const file of sources) {
    if (!fs.readFileSync(path.join(temp, 'tools', file), 'utf8').includes('\r\n')) {
      throw new Error('CRLF fixture not applied: ' + file);
    }
  }

  for (const script of scripts) {
    execFileSync(process.execPath, [path.join(temp, 'tools', script)], { cwd: temp, stdio: 'pipe' });
  }

  for (const file of outputs) {
    const out = fs.readFileSync(path.join(temp, file), 'utf8');
    if (out.includes('\r')) throw new Error('generated CRLF output: ' + file);
  }

  console.log(`BUILD-EOL PASS ${scripts.length} scripts on CRLF templates, ${outputs.length} outputs LF`);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}