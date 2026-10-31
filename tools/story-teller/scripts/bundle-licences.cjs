'use strict';
const fs = require('node:fs'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const dirs = execFileSync('npm', ['ls','--omit=dev','--all','--parseable'], {encoding:'utf8'}).trim().split('\n').slice(1);
let output = 'Third-party production dependencies (includes packages bundled into Mermaid)\n';
for (const dir of [...new Set(dirs)]) {
  const name = fs.readdirSync(dir).find(name => /^licen[cs]e(?:[-.]|$)/i.test(name));
  if (name) output += `\n\n=== ${JSON.parse(fs.readFileSync(path.join(dir,'package.json'))).name} ===\n${fs.readFileSync(path.join(dir,name),'utf8')}`;
}
fs.writeFileSync('dist/THIRD-PARTY.txt',output);
