'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const m = require('../src/manuscript-import.cjs');
const front = (type, title, parent, key, body = '') => `---\ntype: ${type}\ntitle: ${title}\n${parent ? `parent: "[[${parent}]]"\n` : ''}${key === undefined ? '' : `manuscript_order_key: "${key}"\n`}---\n${body}`;
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'story-import-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const book = path.join(root, 'Books', 'Lantern'); await fs.mkdir(book, { recursive: true });
  const write = async (relative, text) => { const file = path.join(root, relative); await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, text); return file; };
  await write('Books/Lantern.md', front('book', 'Lantern', null, undefined));
  await write('Books/Lantern/First.md', front('part', 'First', 'Books/Lantern', '8000000000'));
  await write('Books/Lantern/Second.md', front('part', 'Second', 'Books/Lantern', 'Q000000000', 'Part opening.\n'));
  for (let i = 1; i <= 11; i++) await write(`Books/Lantern/First/Scene ${i}.md`, front('scene', `Scene ${i}`, 'Books/Lantern/First', String(i).padStart(10, '0'), `Words ${i}.\n`));
  await write('Books/Lantern/Second/End.md', front('scene', 'End', 'Books/Lantern/Second', '5000000000', '![Alt](../../../shared/picture.png)\n'));
  await write('Books/Lantern/Second/Draft.md', front('scene-draft', 'Draft', null, undefined, 'Private draft.'));
  await write('shared/picture.png', Buffer.from([137,80,78,71,13,10,26,10,1]));
  return { root, book, write };
}
test('actual metadata shape produces numeric labels and manuscript-bearing part introduction', async t => {
  const f = await fixture(t), d = m.discover(await m.scan(f.book), f.book), p = m.plan(d, 'manuscript_order_key');
  assert.equal(p.errors.length, 0); assert.equal(p.parts.length, 2); assert.equal(p.scenes.length, 13);
  assert.equal(p.scenes[9].label, '1.10'); assert.equal(p.scenes[9].title, 'Scene 10');
  assert.equal(p.scenes[11].kind, 'part-content'); assert.equal(p.scenes[11].label, '2.1');
  assert.equal(p.scenes[12].label, '2.2'); assert.match(p.warnings.join('\n'), /scene-draft/);
  assert.equal(d.fields.find(x => x.key === 'manuscript_order_key').count, 14);
});
test('missing, duplicate and mixed ordering are explicit errors', async t => {
  const f = await fixture(t);
  await f.write('Books/Lantern/First/Scene 11.md', front('scene', 'Scene 11', 'Books/Lantern/First', '0000000010'));
  let p = m.plan(m.discover(await m.scan(f.book), f.book), 'manuscript_order_key');
  assert.match(p.errors.join('\n'), /duplicate/);
  await f.write('Books/Lantern/First/Scene 11.md', front('scene', 'Scene 11', 'Books/Lantern/First', undefined));
  p = m.plan(m.discover(await m.scan(f.book), f.book), 'manuscript_order_key');
  assert.match(p.errors.join('\n'), /has no manuscript_order_key/);
  assert.throws(() => m.compareValue('02.1', 2), /mixed/);
  assert.ok(m.compareValue('02.10', '02.9') > 0);
});
test('shared assets relocate with collision-safe names and originals remain unchanged', async t => {
  const f = await fixture(t), source = path.join(f.book, 'Second', 'End.md'), before = await fs.readFile(source);
  const p = m.plan(m.discover(await m.scan(f.book), f.book), 'manuscript_order_key');
  const narrow = await m.resolveAssets(p, f.book); assert.equal(narrow.unresolved.length, 1);
  const prepared = await m.resolveAssets(m.plan(m.discover(await m.scan(f.book), f.book), 'manuscript_order_key'), f.root);
  assert.equal(prepared.unresolved.length, 0); assert.equal(prepared.assets.length, 1);
  const dest = path.join(f.root, 'adaptation'); const manifest = await m.writeProject(prepared, dest);
  assert.equal(m.orderedScenes(manifest).length, 13);
  const imported = await fs.readFile(path.join(dest, manifest.scenes.at(-1).file), 'utf8');
  assert.match(imported, /!\[Alt\]\(\.\.\/assets\/picture-[0-9a-f]{64}\.png\)/);
  assert.deepEqual(await fs.readFile(source), before);
  assert.deepEqual(await fs.readFile(path.join(dest, 'metadata', 'book.md')), await fs.readFile(path.join(f.root, 'Books/Lantern.md')));
  await assert.rejects(m.writeProject(prepared, dest), /already exists/);
});
test('literal code media examples and unrelated wiki links stay untouched', () => {
  const text = '---\ntitle: A\n---\n[[Other]]\n```md\n![[fake.png]]\n```\n![[asset.png|400]]\n';
  const refs = m.mediaReferences(text); assert.equal(refs.length, 1); assert.equal(refs[0].target, 'asset.png');
  assert.equal(refs[0].alt, 'asset');
});
test('ordered assembly input rejects missing or repeated scene references', () => {
  const manifest = { schema: 'story-teller-project', version: 1, parts: [{ id: 'p', scenes: ['s'] }], scenes: [{ id: 's', partId: 'p' }] };
  assert.equal(m.orderedScenes(manifest)[0].id, 's');
  manifest.parts[0].scenes.push('s'); assert.throws(() => m.orderedScenes(manifest), /inconsistent/);
});
test('stale source and unresolved media leave no project folder', async t => {
  const f = await fixture(t), dest = path.join(f.root, 'trial');
  const prepared = await m.resolveAssets(m.plan(m.discover(await m.scan(f.book), f.book), 'manuscript_order_key'), f.root);
  await f.write('Books/Lantern/First/Scene 1.md', front('scene', 'Scene 1', 'Books/Lantern/First', '0000000001', 'Changed.'));
  await assert.rejects(m.writeProject(prepared, dest), /Source changed/);
  await assert.rejects(fs.access(dest), /ENOENT/);
  const narrow = await m.resolveAssets(m.plan(m.discover(await m.scan(f.book), f.book), 'manuscript_order_key'), f.book);
  await assert.rejects(m.writeProject(narrow, dest), /Resolve order errors/);
  await assert.rejects(fs.access(dest), /ENOENT/);
});
test('same-basename media from different directories have distinct copied names', async t => {
  const f = await fixture(t);
  await f.write('shared/a/picture.png', Buffer.from([137,80,78,71,13,10,26,10,1]));
  await f.write('shared/b/picture.png', Buffer.from([137,80,78,71,13,10,26,10,2]));
  await f.write('Books/Lantern/First/Scene 1.md', front('scene', 'Scene 1', 'Books/Lantern/First', '0000000001', '![A](../../../shared/a/picture.png)\n![B](../../../shared/b/picture.png)'));
  const prepared = await m.resolveAssets(m.plan(m.discover(await m.scan(f.book), f.book), 'manuscript_order_key'), f.root);
  const names = prepared.assets.map(a => a.name);
  assert.equal(new Set(names).size, 2);
  assert.ok(names.every(n => /picture-[a-f0-9]{64}\.png/.test(n)));
});
test('selected numeric and structured fields sort beyond scene nine', () => {
  assert.deepEqual([10, 2, 1].sort(m.compareValue), [1, 2, 10]);
  assert.deepEqual(['2.10', '2.2', '1.12'].sort(m.compareValue), ['1.12', '2.2', '2.10']);
  assert.deepEqual(['000000000A', '0000000009'].sort(m.compareValue), ['0000000009', '000000000A']);
});
test('Unicode, spaces, escaped paths, unsupported and ambiguous embeds receive deliberate handling', async t => {
  const f = await fixture(t);
  await f.write('shared/A spaced 🛰️.png', Buffer.from([137,80,78,71,13,10,26,10,1]));
  await f.write('Books/Lantern/First/Scene 1.md', front('scene', 'Scene 1', 'Books/Lantern/First', '0000000001', [
    '![[shared/A spaced 🛰️.png|alt]]', '![[shared/A spaced 🛰️.png|alt|extra]]', '![[shared/diagram.svg]]',
    '`![[literal.png]]`', '\\![[escaped.png]]', '[[ordinary link]]'
  ].join('\n')));
  const prepared = await m.resolveAssets(m.plan(m.discover(await m.scan(f.book), f.book), 'manuscript_order_key'), f.root);
  assert.equal(prepared.assets.length, 2); assert.equal(prepared.unresolved.length, 1);
  assert.match(prepared.unresolved.join('\n'), /ambiguous media embed/);
  assert.match(prepared.warnings.join('\n'), /unsupported media format \.svg/);
  const rewritten = m.rewriteScene(prepared.scenes[0]);
  assert.match(rewritten, /!\[alt\]\(\.\.\/assets\/A%20spaced%20%F0%9F%9B%B0%EF%B8%8F-[a-f0-9]{64}\.png\)/);
  assert.match(rewritten, /`!\[\[literal\.png\]\]`/);
  assert.match(rewritten, /\\!\[\[escaped\.png\]\]/);
  assert.match(rewritten, /\[\[ordinary link\]\]/);
});
test('changed asset or part note after review aborts transaction', async t => {
  const f = await fixture(t);
  const prep = async () => m.resolveAssets(m.plan(m.discover(await m.scan(f.book), f.book), 'manuscript_order_key'), f.root);
  let prepared = await prep();
  await f.write('Books/Lantern/First.md', front('part', 'First revised', 'Books/Lantern', '8000000000'));
  await assert.rejects(m.writeProject(prepared, path.join(f.root, 'bad-part')), /Part note changed/);
  await assert.rejects(fs.access(path.join(f.root, 'bad-part')), /ENOENT/);
  prepared = await prep();
  await f.write('shared/picture.png', Buffer.from([137,80,78,71,13,10,26,10,4]));
  await assert.rejects(m.writeProject(prepared, path.join(f.root, 'bad-asset')), /Asset changed/);
  await assert.rejects(fs.access(path.join(f.root, 'bad-asset')), /ENOENT/);
});
test('symlinked book note cannot widen the selected source silently', async t => {
  const f = await fixture(t);
  const sibling = path.join(f.root, 'Books', 'Lantern.md');
  const outside = path.join(f.root, 'outside.md');
  await fs.rename(sibling, outside); await fs.symlink(outside, sibling);
  const discovery = m.discover(await m.scan(f.book), f.book);
  assert.match(discovery.errors.join('\n'), /symlink/);
  assert.match(discovery.errors.join('\n'), /symlink/);
});
