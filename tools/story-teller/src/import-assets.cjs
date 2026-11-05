'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { inside, FORMATS } = require('./media.cjs');
async function assetIndex(root, {excludeProjects=false} = {}) {
  const files = new Map();
  async function walk(directory) {
    if(excludeProjects) {
      try{if((await fs.stat(path.join(directory,'story-teller.project.json'))).isFile())return;}
      catch(error){if(!['ENOENT','ENOTDIR'].includes(error.code))throw error;}
    }
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.isSymbolicLink()) continue;
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (entry.isFile() && FORMATS[path.extname(entry.name).toLowerCase()]) {
        const list = files.get(entry.name) || []; list.push(file); files.set(entry.name, list);
      }
    }
  }
  await walk(root); return files;
}
async function resolveImportAsset(root, source, target, wikimedia, index) {
  if (/^[a-z][\w+.-]*:/i.test(target) || path.isAbsolute(target) || target.includes('\\') || /[\x00-\x1f]/.test(target)) throw Error('Use a local portable path inside the authorised asset root');
  const explicit = /^\.\.?\//.test(target);
  const bare = wikimedia && !target.includes('/');
  const choices = bare ? index.get(target) || [] : [path.resolve(path.dirname(source), target), ...(!explicit ? [path.resolve(root, target)] : [])];
  const found = new Set(); let escaped = false;
  for (const choice of choices) {
    try {
      if (!inside(root, choice)) { escaped = true; continue; }
      const canonical = await fs.realpath(choice);
      if (!inside(root, canonical)) { escaped = true; continue; }
      if ((await fs.stat(canonical)).isFile()) found.add(canonical);
    } catch (error) { if (!['ENOENT','ENOTDIR'].includes(error.code)) throw error; }
  }
  if (found.size > 1) throw Error(`Ambiguous target; candidates: ${[...found].map(file => path.relative(root, file).split(path.sep).join('/')).sort().join(', ')}. Use an exact ./relative or root-relative path`);
  if (!found.size) throw Error(`${escaped ? 'Path escapes the authorised root or is missing' : 'Not found'} within ${root}. Select an authorised vault/asset root containing the book and image, or correct the reference`);
  return [...found][0];
}
module.exports = { assetIndex, resolveImportAsset };
