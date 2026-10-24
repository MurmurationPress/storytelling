'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const YAML = require('yaml');
const { inspectStructure } = require('./structure.cjs');
const { inside, FORMATS } = require('./media.cjs');
const { SUPPORTING_FOLDER } = require('./supporting-content.cjs');
const { metadataMatter, scaffold, matterDocuments, supportingFolder } = require('./book-matter.cjs');
const { addSceneHeading } = require('./scene-heading.cjs');
const { assetIndex, resolveImportAsset } = require('./import-assets.cjs');
const VERSION = 1;
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const slash = value => value.split(path.sep).join('/');
const titleOf = (data, file) => typeof data.title === 'string' && data.title.trim() ? data.title.trim() : path.basename(file, '.md');
const normLink = value => typeof value === 'string' ? value.replace(/^\[\[|\]\]$/g, '').replace(/\\/g, '/').replace(/\.md$/i, '') : null;
const matchesParent = (link, file) => { const target = normLink(link); const stem = slash(file).replace(/\.md$/i, ''); return Boolean(target) && (stem === target || stem.endsWith(`/${target}`)); };
const cleanName = value => value.normalize('NFKC').replace(/[\\/:*?"<>|\x00-\x1f]/g, '-').replace(/^\.+/, '').trim().slice(0, 70) || 'untitled';
function parseMeta(source, file) {
  const s = inspectStructure(source);
  if (!s.frontmatter?.closed) throw Error(`${file}: missing or unclosed YAML frontmatter`);
  const raw = source.slice(s.lines[1].start, s.lines[s.frontmatter.end - 1].start);
  const doc = YAML.parseDocument(raw, { schema: 'core', customTags: [], resolveKnownTags: false, uniqueKeys: true, merge: false, maxAliasCount: 0 });
  if (doc.errors.length || doc.warnings.length || !YAML.isMap(doc.contents)) throw Error(`${file}: malformed or unsupported YAML frontmatter: ${doc.errors[0]?.message || doc.warnings[0]?.message || 'expected mapping'}`);
  return { data: doc.toJS({ maxAliasCount: 0 }), body: source.slice(s.lines[s.frontmatter.end]?.start ?? source.length), source };
}
async function scan(folder) {
  const result = [];
  async function walk(dir) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === SUPPORTING_FOLDER) continue;
      const file = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) await walk(file);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
        const source = await fs.readFile(file, 'utf8');
        try { result.push({ file, ...parseMeta(source, file) }); }
        catch (error) { result.push({ file, error: error.message }); }
      }
    }
  }
  await walk(folder);
  const sibling = `${folder}.md`;
  try {
    if ((await fs.lstat(sibling)).isSymbolicLink()) throw Error('sibling book note is a symlink and needs review');
    const source = await fs.readFile(sibling, 'utf8'); result.push({ file: sibling, ...parseMeta(source, sibling) });
  } catch (error) { if (error.code !== 'ENOENT') result.push({ file: sibling, error: error.message }); }
  return result;
}
function compareValue(a, b) {
  if (typeof a !== typeof b) throw Error('mixed order value types');
  if (typeof a === 'number' && Number.isFinite(a) && Number.isFinite(b)) return a - b;
  if (typeof a !== 'string' || !a.trim() || !b.trim()) throw Error('order values must be nonempty strings or finite numbers');
  if (/^[0-9A-Z]{10}$/.test(a) && /^[0-9A-Z]{10}$/.test(b)) return a < b ? -1 : a > b ? 1 : 0;
  const chunks = text => text.match(/\d+|\D+/g) || [];
  const left = chunks(a), right = chunks(b);
  for (let i = 0; i < Math.min(left.length, right.length); i++) {
    const ln = /^\d+$/.test(left[i]), rn = /^\d+$/.test(right[i]);
    if (ln !== rn) throw Error('conflicting structured order values');
    if (ln) { const d = BigInt(left[i]) - BigInt(right[i]); if (d) return d < 0n ? -1 : 1; }
    else if (left[i] !== right[i]) return left[i] < right[i] ? -1 : 1;
  }
  return left.length - right.length;
}
function fieldLocation(item, key) {
  const structure = inspectStructure(item.source || item.content || '');
  const line = structure.lines.findIndex((record, index) => index < (structure.frontmatter?.end || 0) && record.text.split(':')[0] === key);
  return `${item.file || item.source}:${line < 0 ? 1 : line + 1}`;
}
function orderGroup(items, key, errors, group) {
  const values = new Map();
  for (const item of items) {
    const value = item.data[key];
    if (value === undefined || value === null || value === '') { errors.push(`${group}: ${fieldLocation(item, key)} has no ${key}`); continue; }
    if (key === 'manuscript_order_key' && (typeof value !== 'string' || !/^[0-9A-Z]{10}$/.test(value))) errors.push(`${group}: ${fieldLocation(item, key)} has invalid 10-character base-36 ${key}`);
    try { compareValue(value, value); }
    catch (error) { errors.push(`${group}: ${fieldLocation(item, key)} has invalid ${key}: ${error.message}`); }
    const signature = `${typeof value}:${String(value)}`;
    if (values.has(signature)) errors.push(`${group}: duplicate ${key} ${value} in ${fieldLocation(item, key)} and ${values.get(signature)}`);
    values.set(signature, fieldLocation(item, key));
  }
  try {
    const ordered = [...items].sort((a, b) => compareValue(a.data[key], b.data[key]));
    for (let i = 1; i < ordered.length; i++) {
      const a = ordered[i - 1], b = ordered[i];
      if (a.data[key] !== b.data[key] && compareValue(a.data[key], b.data[key]) === 0) errors.push(`${group}: equivalent ${key} values ${a.data[key]} and ${b.data[key]} do not establish order in ${fieldLocation(a, key)} and ${fieldLocation(b, key)}`);
    }
    return ordered;
  }
  catch (error) { errors.push(`${group}: ${error.message}; inspect ${items.map(item => fieldLocation(item, key)).join(', ')}`); return [...items]; }
}
function discover(items, folder) {
  items = items.filter(item => !inside(path.join(folder, SUPPORTING_FOLDER), item.file));
  const warnings = [], errors = [];
  const bookStem = slash(path.resolve(folder)).replace(/\/$/, '');
  let book = items.find(x => x.data?.type === 'book' && path.join(path.dirname(x.file), path.basename(x.file, '.md')) === bookStem);
  if (!book) { warnings.push('No sibling book metadata note; new book matter will remain empty unless explicitly classified content exists.'); book = { file: `${folder}.md`, data: {}, source: '', body: '', synthetic: true }; }
  const candidates = items.filter(x => x.data && ['part', 'scene', 'front-matter', 'back-matter'].includes(x.data.type));
  for (const item of items) if (item.error) errors.push(`Cannot classify Markdown note: ${item.error}`);
  for (const item of items.filter(x => x.data && !['part', 'scene', 'book', 'front-matter', 'back-matter'].includes(x.data.type))) warnings.push(`Excluded ${item.data.type || 'untyped'} note: ${item.file}`);
  const fields = [...new Set(candidates.flatMap(x => Object.keys(x.data).filter(key => /order|sequence/i.test(key))))].map(key => ({ key, samples: candidates.filter(x => x.data[key] !== undefined).slice(0, 4).map(x => String(x.data[key])), count: candidates.filter(x => x.data[key] !== undefined).length }));
  return { book, items, folder, fields, warnings, errors };
}
function plan(discovery, key) {
  const errors = [...discovery.errors], warnings = [...discovery.warnings];
  const book = discovery.book;
  if (book?.data?.cover_image) warnings.push(`Book cover_image frontmatter is preserved but not collected as scene media: ${book.data.cover_image}`);
  if (!book) return { errors, warnings, parts: [], scenes: [], assets: [], key };
  if (book.body?.trim()) warnings.push('Book-note body is archived, not classified as front/back matter; review it manually.');
  const parts = discovery.items.filter(x => x.data?.type === 'part' && matchesParent(x.data.parent, book.file));
  const otherParts = discovery.items.filter(x => x.data?.type === 'part' && !matchesParent(x.data.parent, book.file));
  for (const x of otherParts) warnings.push(`Excluded part with different parent: ${x.file}`);
  const sceneCandidates = discovery.items.filter(x => x.data?.type === 'scene');
  const members = new Map(parts.map(part => [part, []])), direct = [];
  for (const scene of sceneCandidates) {
    const parents = [book, ...parts].filter(parent => matchesParent(scene.data.parent, parent.file));
    if (parents.length !== 1) {
      errors.push(`${fieldLocation(scene, 'parent')}: ${!scene.data.parent ? 'Missing scene parent' : parents.length ? 'Ambiguous scene parent' : 'Unmatched scene parent'} ${scene.data.parent || '(unset)'}. Use the selected book or one recognised part; scene was not silently excluded.`);
    } else if (parents[0] === book) direct.push(scene);
    else members.get(parents[0]).push(scene);
  }
  // MWC order keys are sibling order: book scenes and parts share a level.
  const roots = orderGroup([...parts, ...direct], key, errors, 'Book children (parts and scenes)');
  const scenes = [], resultParts = [], sequence = [];
  let rootNumber = 0;
  const recordScene = (item, part = null) => {
    const intro = part && item.file === part.source;
    const scene = { id: crypto.randomUUID(), partId: part?.id ?? null,
      label: part ? `${resultParts.length}.${part.scenes.length + 1}` : String(++rootNumber),
      title: intro ? `${part.title} introduction` : titleOf(item.data, item.file), source: item.file,
      orderValue: item.data[key], kind: intro ? 'part-content' : 'scene', content: item.source };
    scenes.push(scene); if (part) part.scenes.push(scene.id);
    return scene;
  };
  for (const root of roots) {
    if (root.data.type === 'scene') {
      sequence.push({ kind: 'scene', id: recordScene(root).id });
    } else {
      const bearing = root.body.trim().length > 0;
      const part = { id: crypto.randomUUID(), title: titleOf(root.data, root.file), orderValue: root.data[key], source: root.file, original: root.source, intro: bearing, scenes: [] };
      resultParts.push(part); sequence.push({ kind: 'part', id: part.id });
      if (bearing) recordScene(root, part);
      for (const item of orderGroup(members.get(root), key, errors, part.title)) recordScene(item, part);
    }
  }
  if (new Set(scenes.map(scene => scene.source)).size !== scenes.length) errors.push('A manuscript note belongs to more than one parent');
  const matter = {};
  for (const kind of ['front', 'back']) {
    const candidates = discovery.items.filter(x => x.data?.type === `${kind}-matter`);
    const members = candidates.filter(x => matchesParent(x.data.parent, book.file));
    for (const x of candidates.filter(x => !members.includes(x))) warnings.push(`Excluded matter with unmatched book parent: ${x.file}`);
    matter[kind] = (members.length > 1 ? orderGroup(members, key, errors, `${kind} matter`) : members).map(x => ({ source: x.file, content: x.source, body: x.body }));
  }
  return { book, key, parts: resultParts, scenes, sequence, matter, warnings, errors, assets: [] };
}
function isLiteralAt(line, offset) {
  if (offset > 0 && line[offset - 1] === '\\') return true;
  let insideCode = false, ticks = 0;
  for (let i = 0; i < offset; i++) {
    if (line[i] === '\\') { i++; continue; }
    if (line[i] !== '`') continue;
    let j = i; while (line[j] === '`') j++;
    const count = j - i;
    if (!insideCode) { insideCode = true; ticks = count; }
    else if (ticks === count) insideCode = false;
    i = j - 1;
  }
  return insideCode;
}
function mediaReferences(source) {
  const structure = inspectStructure(source), refs = [];
  for (const line of structure.lines) {
    const n = structure.lines.indexOf(line);
    if (structure.frontmatter && n < structure.frontmatter.end) continue;
    if (structure.spans.some(s => ['fence', 'code_block'].includes(s.type) && n >= s.start && n < s.end)) continue;
    const re = /!\[\[([^\]\n]+)\]\]|!\[([^\]\n]*)\]\((<[^>]+>|(?:\\.|[^)])+)\)/g;
    for (const m of line.text.matchAll(re)) {
      if (isLiteralAt(line.text, m.index)) continue;
      const wikimedia = Boolean(m[1]);
      const bits = wikimedia ? m[1].split('|') : [];
      const target = wikimedia ? bits[0] : m[3].replace(/^<|>$/g, '');
      refs.push({ start: line.start + m.index, end: line.start + m.index + m[0].length, raw: m[0], target: target.replace(/\\([ ()])/g, '$1'), ambiguous: wikimedia && bits.length > 2, wikimedia, alt: wikimedia ? (bits[1] && !/^\d+(?:x\d+)?$/.test(bits[1]) ? bits[1] : path.basename(bits[0], path.extname(bits[0]))) : m[2], line: n + 1 });
    }
  }
  return refs;
}
async function resolveAssets(planData, scope) {
  const root = await fs.realpath(scope), map = new Map(), warnings = [...planData.warnings], unresolved = [];
  const index = await assetIndex(root);
  for (const scene of [...planData.scenes, ...Object.values(planData.matter || {}).flat()]) {
    scene.references = [];
    for (const ref of mediaReferences(scene.content)) {
      let decoded;
      try { decoded = decodeURIComponent(ref.target); } catch { unresolved.push(`${scene.source}:${ref.line}: invalid media path ${ref.target}`); continue; }
      const format = FORMATS[path.extname(decoded).toLowerCase()];
      if (!format) { warnings.push(`${scene.source}:${ref.line}: unsupported ${path.extname(decoded).toLowerCase() === '.md' ? 'Markdown embed (no transclusion)' : `media format ${path.extname(decoded) || '(none)'}`} — left unchanged; non-blocking`); continue; }
      if (ref.ambiguous) { unresolved.push(`${scene.source}:${ref.line}: ambiguous media embed ${ref.raw}`); continue; }
      if (/^[a-z][\w+.-]*:/i.test(decoded) || path.isAbsolute(decoded)) { warnings.push(`${scene.source}:${ref.line}: remote or absolute media is not imported`); continue; }
      let found;
      try { found = await resolveImportAsset(root, scene.source, decoded, ref.wikimedia, index); }
      catch (error) { unresolved.push(`${scene.source}:${ref.line}: ${decoded}: ${error.message}`); continue; }
      let bytes;
      try { bytes = await fs.readFile(found); } catch (error) { unresolved.push(`${scene.source}:${ref.line}: unreadable image ${decoded}: ${error.message}`); continue; }
      const valid = format === 'PNG' ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
        : format === 'JPEG' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
          : bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
      if (!valid) { unresolved.push(`${scene.source}:${ref.line}: unreadable ${format} media`); continue; }
      const hash = sha(bytes), ext = path.extname(found).toLowerCase();
      const name = `${cleanName(path.basename(found, ext))}-${hash}${ext}`;
      map.set(name, { source: found, name, hash });
      scene.references.push({ ...ref, asset: found, name });
    }
  }
  return { ...planData, warnings, unresolved, assets: [...map.values()], assetRoot: root };
}
function rewriteScene(scene, prefix = '../assets/') {
  let content = scene.content;
  for (const ref of [...scene.references].sort((a,b) => b.start - a.start)) {
    const relative = `${prefix}${encodeURIComponent(ref.name).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)}`;
    const alt = ref.alt.replace(/\\/g, '\\\\').replace(/\]/g, '\\]');
    content = content.slice(0, ref.start) + `![${alt}](${relative})` + content.slice(ref.end);
  }
  return content;
}
async function writeProject(planData, destination) {
  if (blockingReasons(planData).length) throw Error(`Resolve order errors and missing assets before importing:\n${blockingReasons(planData).join('\n')}`);
  try { await fs.lstat(destination); throw Error('Destination already exists'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const parent = path.dirname(destination), temp = await fs.mkdtemp(path.join(parent, '.story-teller-import-'));
  try {
    await fs.mkdir(path.join(temp, 'scenes')); await fs.mkdir(path.join(temp, 'assets')); await fs.mkdir(path.join(temp, 'metadata'));
    let manifest = { schema: 'story-teller-project', version: VERSION, title: titleOf(planData.book.data, planData.book.file), orderField: planData.key,
      provenance: { book: planData.book.file, sourceScope: planData.assetRoot, sourceRevision: await gitRevision(planData.book.file) }, bookFile: 'metadata/book.md',
      sequence: planData.sequence, parts: planData.parts.map(p => ({ id: p.id, title: p.title, orderValue: p.orderValue, metadataFile: `metadata/${p.id}.md`, scenes: p.scenes })), scenes: [] };
    if (!planData.book.synthetic && sha(await fs.readFile(planData.book.file)) !== sha(planData.book.source)) throw Error(`Book note changed after review: ${planData.book.file}`);
    await fs.writeFile(path.join(temp, 'metadata', 'book.md'), planData.book.synthetic ? '---\n{}\n---\n' : planData.book.source);
    for (const part of planData.parts) {
      if (sha(await fs.readFile(part.source)) !== sha(part.original)) throw Error(`Part note changed after review: ${part.source}`);
      await fs.writeFile(path.join(temp, 'metadata', `${part.id}.md`), part.original);
    }
    for (const scene of planData.scenes) {
      if (sha(await fs.readFile(scene.source)) !== sha(scene.content)) throw Error(`Source changed after review: ${scene.source}`);
      const filename = `${scene.id}.md`;
      const content = rewriteScene(scene);
      await fs.writeFile(path.join(temp, 'scenes', filename), scene.kind === 'scene' ? addSceneHeading(content, scene.title) : content);
      manifest.scenes.push({ id: scene.id, partId: scene.partId, kind: scene.kind, label: scene.label, title: scene.title, orderValue: scene.orderValue,
        file: `scenes/${filename}`, provenance: { source: scene.source, sha256: sha(scene.content) } });
    }
    const matterContent = {};
    for (const kind of ['front', 'back']) {
      const members = planData.matter?.[kind] || [];
      const bodies = [];
      for (const [index, item] of members.entries()) {
        if (sha(await fs.readFile(item.source)) !== sha(item.content)) throw Error(`Matter source changed after review: ${item.source}`);
        await fs.writeFile(path.join(temp, 'metadata', `${kind}-matter-${index}.md`), item.content);
        const rewritten = rewriteScene(item, 'assets/');
        bodies.push(parseMeta(rewritten, item.source).body);
      }
      matterContent[kind] = members.length ? bodies.join('\n\n') : kind === 'front' ? metadataMatter(planData.book.data) : '';
    }
    manifest = (await scaffold(temp, manifest, matterContent)).manifest;
    for (const kind of ['front', 'back']) {
      const template = `metadata/${kind}-matter.md`;
      await fs.writeFile(path.join(temp, template), matterContent[kind]);
      manifest.matter[kind].sourceFile = template;
    }
    for (const asset of planData.assets) {
      const bytes = await fs.readFile(asset.source);
      if (sha(bytes) !== asset.hash) throw Error(`Asset changed after review: ${asset.source}`);
      await fs.writeFile(path.join(temp, 'assets', asset.name), bytes);
    }
    await fs.writeFile(path.join(temp, 'story-teller.project.json'), JSON.stringify(manifest, null, 2) + '\n');
    await fs.mkdir(destination); // exclusive reservation: never replace another project's folder
    try { await fs.rename(temp, destination); } catch (error) { await fs.rm(destination, { recursive: true, force: true }); throw error; }
    return manifest;
  } catch (error) { await fs.rm(temp, { recursive: true, force: true }); throw error; }
}
async function gitRevision(file) {
  try { const { execFileSync } = require('node:child_process'); return execFileSync('git', ['-C', path.dirname(file), 'rev-parse', 'HEAD'], { encoding: 'utf8', timeout: 2000, stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return null; }
}
function orderedScenes(manifest) {
  if (manifest?.schema !== 'story-teller-project' || manifest.version !== VERSION || !Array.isArray(manifest.parts) || !Array.isArray(manifest.scenes)) throw Error('Unsupported Story Teller project manifest');
  matterDocuments(manifest);
  if (manifest.scenes.some(scene => typeof scene.file === 'string' && scene.file.replace(/\\/g, '/').startsWith(`${supportingFolder(manifest)}/`))) throw Error('Supporting Content notes cannot appear in the scene sequence');
  const byId = new Map(manifest.scenes.map(s => [s.id, s])), parts = new Map(manifest.parts.map(p => [p.id, p]));
  const sequence = rootSequence(manifest), usedParts = new Set();
  const ordered = sequence.flatMap(entry => {
    if (!entry || typeof entry.id !== 'string') throw Error('Invalid project root sequence entry');
    if (entry.kind === 'scene') {
      const scene = byId.get(entry.id);
      if (!scene || scene.partId !== null) throw Error(`Invalid book-level scene reference ${entry.id}`);
      return [scene];
    }
    if (entry.kind !== 'part' || !parts.has(entry.id) || usedParts.has(entry.id)) throw Error(`Invalid or duplicate root part ${entry.id}`);
    usedParts.add(entry.id);
    const part = parts.get(entry.id);
    return part.scenes.map(id => { const scene = byId.get(id); if (!scene || scene.partId !== part.id) throw Error(`Invalid scene reference ${id}`); return scene; });
  });
  if (usedParts.size !== manifest.parts.length || ordered.length !== manifest.scenes.length || new Set(ordered.map(s => s.id)).size !== ordered.length) throw Error('Project sequence is inconsistent');
  return ordered;
}
function rootSequence(manifest) {
  if (manifest.sequence !== undefined) {
    if (!Array.isArray(manifest.sequence)) throw Error('Project sequence must be an array');
    return manifest.sequence;
  }
  return manifest.parts.length ? manifest.parts.map(part => ({ kind: 'part', id: part.id })) : manifest.scenes.map(scene => ({ kind: 'scene', id: scene.id }));
}
function orderedRoots(manifest) {
  orderedScenes(manifest);
  return rootSequence(manifest).map(entry => ({ kind: entry.kind, item: (entry.kind === 'part' ? manifest.parts : manifest.scenes).find(item => item.id === entry.id) }));
}
function blockingReasons(prepared) {
  return [...(prepared.errors || []).map(message => `Ordering / metadata: ${message}`), ...(prepared.unresolved || []).map(message => `Supported image: ${message}`)];
}

module.exports = { VERSION, parseMeta, scan, discover, plan, resolveAssets, mediaReferences, rewriteScene, writeProject, orderedScenes, orderedRoots, blockingReasons, compareValue };
