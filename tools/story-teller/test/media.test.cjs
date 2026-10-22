'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { inspectImage, resolveMedia, decodeSourcePath, inside } = require('../src/media.cjs');
const { parseScene } = require('../src/parser.cjs');
const { markdownPath, planImageInsertion } = require('../src/insert.cjs');
const fixtures = path.join(__dirname, '../samples/assets');
function fakeVscode(workspace) {
  return {
    Uri: { file: fsPath => ({ scheme: 'file', fsPath }) }, FileType: { File: 1 },
    workspace: {
      getWorkspaceFolder: () => ({ uri: { fsPath: workspace } }),
      fs: { stat: async uri => ({ type: (await fs.stat(uri.fsPath)).isFile() ? 1 : 2 }), readFile: uri => fs.readFile(uri.fsPath) }
    }
  };
}
test('relative paths accept parent assets within workspace, Unicode, spaces and Markdown escapes', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'story-media-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, 'scenes'));
  await fs.mkdir(path.join(root, 'shared'));
  const filename = 'night Ω (1).png';
  await fs.copyFile(path.join(fixtures, 'harbour-portrait.png'), path.join(root, 'shared', filename));
  const document = { uri: { scheme: 'file', fsPath: path.join(root, 'scenes', 'Art.md') } };
  const vscode = fakeVscode(root);
  const reference = markdownPath(`../shared/${filename}`);
  assert.equal(decodeSourcePath(reference), `../shared/${filename}`);
  const source = `![The tower](<${reference}>)`;
  const scene = parseScene(source);
  assert.deepEqual(scene.images, [reference]);
  const resolved = await resolveMedia(vscode, document, { asWebviewUri: uri => ({ toString: () => `webview:${uri.fsPath}` }) }, scene);
  assert.equal(resolved.diagnostics.length, 0);
  assert.match(resolved.media[reference].url, /night Ω \(1\)\.png$/);
  assert.ok(inside(root, path.join(root, 'shared', filename)));
  for (const name of ['harbour-landscape.webp', 'harbour-detail.jpg']) {
    await fs.copyFile(path.join(fixtures, name), path.join(root, 'shared', name));
    assert.equal((await inspectImage(vscode, document, `../shared/${name}`)).fsPath, path.join(root, 'shared', name));
  }
});
test('remote, embedded, outside-root, symlink, missing, unsupported and unreadable files give diagnostics', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'story-media-'));
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'story-outside-'));
  t.after(async () => { await fs.rm(root, { recursive: true, force: true }); await fs.rm(outside, { recursive: true, force: true }); });
  await fs.writeFile(path.join(root, 'broken.png'), 'not a PNG');
  await fs.writeFile(path.join(outside, 'secret.png'), await fs.readFile(path.join(fixtures, 'harbour-portrait.png')));
  await fs.symlink(path.join(outside, 'secret.png'), path.join(root, 'escape.png'));
  const document = { uri: { scheme: 'file', fsPath: path.join(root, 'scene.md') } };
  const vscode = fakeVscode(root);
  for (const [src, expected] of [
    ['https://invalid.test/image.png', /relative local/], ['data:image/png;base64,AA', /relative local/],
    ['../secret.png', /outside/], ['escape.png', /outside/], ['missing.png', /missing/],
    ['picture.svg', /Unsupported/], ['broken.png', /Unreadable/], ['bad%ZZ.png', /percent escape/]
  ]) await assert.rejects(inspectImage(vscode, document, src), expected);
  const scene = parseScene('![Missing](missing.png)\n\n![Remote](https://invalid.test/image.png)');
  const result = await resolveMedia(vscode, document, { asWebviewUri: () => { throw Error('Must not reach webview URI'); } }, scene);
  assert.equal(result.diagnostics.length, 2);
  assert.ok(Object.values(result.media).every(item => item.error));
  await assert.rejects(inspectImage(vscode, { uri: { scheme: 'untitled', fsPath: '' } }, 'x.png'), /Save this Markdown/);
});
test('Image insertion encodes local path, preserves selected prose and stays a standalone component', () => {
  const source = 'Before\n\nAfter';
  const plan = planImageInsertion(source, { start: 8, end: 8 }, 'shared/my Ω (1).webp');
  assert.match(plan.snippet, /!\[\$\{1:Describe the image\}\]\(<shared\/my%20%CE%A9%20%281%29\.webp>\)/);
  const assembled = source.slice(0, 8) + plan.snippet.replace(/\$\{1:Describe the image\}/, 'Harbour').replace('$0', '') + source.slice(8);
  assert.deepEqual(parseScene(assembled).beats[0].blocks.map(b => b.type), ['prose', 'image', 'prose']);
  assert.match(planImageInsertion(source, { start: 0, end: 6 }, 'x.png').error, /Selected text/);
  assert.match(planImageInsertion('```chat\nA: Hi\n```', { start: 8, end: 8 }, 'x.png').error, /outside the chat/);
});
