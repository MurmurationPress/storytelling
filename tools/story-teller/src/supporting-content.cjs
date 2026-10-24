'use strict';
// Filesystem adapter for the supporting-note contract; no VS Code dependency.
const fs = require('node:fs/promises');
const path = require('node:path');
const { inside } = require('./media.cjs');
const { renderMarkdown } = require('./markdown.cjs');
const { inspectStructure } = require('./structure.cjs');
const { supportingFolder } = require('./book-matter.cjs');
const SUPPORTING_FOLDER = 'Supporting Content';
function targetPath(target) {
  if (typeof target !== 'string' || !target.trim()) throw Error('Use a nonempty supporting-note filename');
  target = target.trim();
  if (/[\\\x00-\x1f:#^]/.test(target) || target.startsWith('/') || target.split('/').includes('..'))
    throw Error('Use a filename or root-relative path inside Supporting Content; traversal, URLs and heading/block references are unsupported');
  const explicit = target.includes('/');
  target = target.replace(/^\.\//, '');
  if (target.split('/').some(part => !part || part === '.')) throw Error('Use a complete note path');
  return { file: /\.md$/i.test(target) ? target : `${target}.md`, explicit };
}
async function indexSupporting(projectRoot, manifest) {
  const root = path.join(projectRoot, supportingFolder(manifest)), files = [];
  const project = await fs.realpath(projectRoot);
  let canonical;
  try { canonical = await fs.realpath(root); }
  catch (error) { if (error.code === 'ENOENT') return { root, files, project }; throw error; }
  if (!inside(project, canonical)) throw Error('Supporting Content resolves outside the adaptation project; replace its symlink with a local folder');
  async function walk(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(file); // Never follow a symlink directory.
      else if ((entry.isFile() || entry.isSymbolicLink()) && /\.md$/i.test(entry.name)) files.push(path.relative(root, file).split(path.sep).join('/'));
    }
  }
  await walk(root); files.sort();
  return { root, files, project };
}
function resolveTarget(index, target) {
  const { file, explicit } = targetPath(target);
  const candidates = index.files.filter(item => explicit ? item === file : path.posix.basename(item) === file);
  if (candidates.length > 1) throw Error(`Ambiguous note "${target}": ${candidates.join(', ')}. Use an explicit path such as [[${candidates[0].replace(/\.md$/i, '')}]]`);
  if (!candidates.length) throw Error(`Missing note "${target}". Add ${file} inside Supporting Content, or correct the filename/path and case`);
  return candidates[0];
}
async function noteFile(index, target) {
  const id = resolveTarget(index, target), file = path.join(index.root, id);
  let canonical;
  try { canonical = await fs.realpath(file); }
  catch { throw Error(`Note ${id} is missing or unreadable`); }
  const root = await fs.realpath(index.root);
  if (!inside(index.project, root) || !inside(root, canonical) || !(await fs.stat(canonical)).isFile()) throw Error(`Note ${id} resolves outside Supporting Content or is not a regular file`);
  return { id, file: canonical };
}
async function describeLinks(index, refs) {
  const links = Object.create(null), diagnostics = [];
  for (const ref of refs) {
    if (!Object.hasOwn(links, ref.target)) {
      try { links[ref.target] = { id: (await noteFile(index, ref.target)).id }; }
      catch (error) { links[ref.target] = { error: error.message }; }
    }
    if (links[ref.target].error) diagnostics.push(`Line ${ref.line}: [[${ref.target}]]: ${links[ref.target].error}`);
  }
  return { links, diagnostics };
}
async function loadSupporting(index, target, { readText = file => fs.readFile(file, 'utf8') } = {}) {
  const { id, file } = await noteFile(index, target);
  const source = await readText(file);
  const structure = inspectStructure(source);
  if (structure.frontmatter && !structure.frontmatter.closed) throw Error(`Note ${id} has unclosed frontmatter; close its initial YAML block`);
  const first = structure.frontmatter?.end || 0;
  const body = source.slice(structure.lines[first]?.start ?? source.length);
  const rendered = renderMarkdown(body);
  const refs = rendered.references.map(ref => ({ ...ref, line: ref.line + first }));
  return { id, file, title: path.posix.basename(id).replace(/\.md$/i, ''), html: rendered.html,
    images: rendered.images, imageLines: Object.fromEntries(Object.entries(rendered.imageLines).map(([src,line])=>[src,line+first])), ...(await describeLinks(index, refs)) };
}
module.exports = { SUPPORTING_FOLDER, targetPath, indexSupporting, resolveTarget, noteFile, describeLinks, loadSupporting };
