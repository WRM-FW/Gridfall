import { launch } from './cdp.mjs';
import path from 'node:path';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const url = pathToFileURL(path.join(import.meta.dirname, '..', 'games', 'board-club', 'index.html')).href;
const src = readFileSync(path.join(import.meta.dirname, 'engine-tests.js'), 'utf8');
const outDir = path.join(import.meta.dirname, 'results');
mkdirSync(outDir, { recursive: true });
const b = await launch(url);
try {
  const res = await b.evaluate(src);
  writeFileSync(path.join(outDir, 'engine-results.json'), JSON.stringify(res, null, 2));
  const fail = res.filter(r => !r.pass);
  console.log(`TOTAL ${res.length}  PASS ${res.length - fail.length}  FAIL ${fail.length}`);
  fail.forEach(f => console.log('FAIL ' + f.id + ' :: ' + f.detail));
} finally {
  await b.close();
}
