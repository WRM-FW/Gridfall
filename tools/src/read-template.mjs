import fs from 'node:fs';

/** Read a text template with one canonical newline, independent of checkout EOL. */
export function readTemplate(file) {
  return fs.readFileSync(file, 'utf8').replace(/\r\n?/g, '\n');
}
