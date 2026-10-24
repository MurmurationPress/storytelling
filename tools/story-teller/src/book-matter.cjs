'use strict';
// Portable project conventions. This module does not interpret manuscript prose.
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const DEFAULT_SUPPORTING = 'Supporting Content';
const MATTER = { front: { file: 'Front Matter.md', title: 'Front Matter' }, back: { file: 'Back Matter.md', title: 'Back Matter' } };
function portablePath(value) {
  if (typeof value !== 'string' || !value || /^[\\/]|^[a-z]:/i.test(value) || /[\\\x00-\x1f]/.test(value) || value.split('/').some(p => !p || p === '.' || p === '..')) throw Error('Use a nonempty project-relative path without traversal');
  return value;
}
function supportingFolder(manifest) {
  const folder = portablePath(manifest?.settings?.supportingContent ?? DEFAULT_SUPPORTING);
  if (['scenes','metadata','assets','story-teller.project.json'].includes(folder.split('/')[0])) throw Error('Supporting notes must use a separate project folder');
  return folder;
}
function matterDocuments(manifest) {
  if (manifest?.matter !== undefined && (!manifest.matter || typeof manifest.matter !== 'object' || Array.isArray(manifest.matter))) throw Error('Matter configuration must be an object');
  const result = [];
  for (const [kind, defaults] of Object.entries(MATTER)) {
    const entry = manifest?.matter?.[kind];
    if (entry === undefined) continue;
    if (!entry || typeof entry.id !== 'string' || !entry.id || !/\.md$/i.test(portablePath(entry.file))) throw Error(`Invalid ${kind} matter configuration`);
    result.push({ ...entry, kind, title: defaults.title, label: '' });
  }
  const files = result.map(item => item.file), ids = result.map(item => item.id);
  if (new Set(files).size !== files.length || new Set(ids).size !== ids.length) throw Error('Matter documents require distinct paths and identities');
  for (const item of result) {
    if (item.file === 'story-teller.project.json' || item.file.startsWith('metadata/') || item.file === supportingFolder(manifest) || item.file.startsWith(`${supportingFolder(manifest)}/`) || manifest.scenes?.some(scene => scene.file === item.file || scene.id === item.id) || manifest.parts?.some(part => part.id === item.id || part.metadataFile === item.file)) throw Error('Matter must be separate from metadata, supporting notes and scenes');
  }
  return result;
}
const literal = value => String(value).replace(/[\\`*_{}\[\]<>#!|~]/g, '\\$&').replace(/\r?\n/g, ' ');
function metadataMatter(data = {}) {
  const scalar = key => ['string', 'number', 'boolean'].includes(typeof data[key]) ? String(data[key]).trim() : '';
  const title = scalar('title'), subtitle = scalar('subtitle'), author = scalar('author');
  const lines = [];
  if (title) lines.push(`# ${literal(title)}`);
  if (subtitle) lines.push(literal(subtitle));
  if (author) lines.push(literal(author));
  const used = new Set([title, subtitle, author].filter(Boolean));
  for (const [key, label] of [['series','Series'],['series_book','Series book'],['publisher','Publisher'],['imprint','Imprint'],['copyright',''],['rights',''],['language','Language'],['isbn_epub','EPUB ISBN'],['isbn_paper','Paperback ISBN'],['isbn_hard','Hardback ISBN']]) {
    const value = scalar(key);
    if (!value || used.has(value) || (key === 'rights' && scalar('copyright').includes(value))) continue;
    lines.push(`${label ? `${label}: ` : ''}${literal(value)}`); used.add(value);
  }
  return lines.length ? `${lines.join('\n\n')}\n` : '';
}
// Validate canonical parents before any creation. Never follow a directory out
// of the project or overwrite existing (including deliberately empty) documents.
async function safeTarget(root, relative) {
  const file = path.join(root, portablePath(relative));
  let current = root;
  for (const part of path.relative(root, path.dirname(file)).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    try { const canonical = await fs.realpath(current); if (canonical !== root && !canonical.startsWith(root + path.sep)) throw Error('Project path escapes through a symlink'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  try { if ((await fs.lstat(file)).isSymbolicLink()) throw Error('Scaffolding target is a symlink; review it manually'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  return file;
}
async function scaffold(root, manifest, content = {}) {
  root = await fs.realpath(root);
  const updated = JSON.parse(JSON.stringify(manifest)), created = [], present = [];
  updated.matter ||= {};
  for (const [kind, defaults] of Object.entries(MATTER)) updated.matter[kind] ||= { id: randomUUID(), file: defaults.file };
  const documents = matterDocuments(updated);
  const folder = supportingFolder(updated);
  // Preflight all paths/types before creating anything.
  const targets = await Promise.all([...documents.map(item => item.file), folder].map(relative => safeTarget(root, relative)));
  for (let i = 0; i < targets.length; i++) {
    try { const stat = await fs.stat(targets[i]); if (i === documents.length ? !stat.isDirectory() : !stat.isFile()) throw Error(`Scaffolding target has the wrong type: ${targets[i]}`); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  for (let i = 0; i < documents.length; i++) {
    const item = documents[i], file = targets[i];
    await fs.mkdir(path.dirname(file), { recursive: true });
    try { await fs.writeFile(file, content[item.kind] ?? '', { flag: 'wx' }); created.push(item.file); }
    catch (error) { if (error.code !== 'EEXIST') throw error; present.push(item.file); }
  }
  await fs.mkdir(path.dirname(targets.at(-1)), { recursive: true });
  try { await fs.mkdir(targets.at(-1), { recursive: false }); created.push(`${folder}/`); }
  catch (error) { if (error.code !== 'EEXIST') throw error; present.push(`${folder}/`); }
  return { manifest: updated, created, present };
}
module.exports = { MATTER, supportingFolder, matterDocuments, portablePath, metadataMatter, scaffold, safeTarget };
