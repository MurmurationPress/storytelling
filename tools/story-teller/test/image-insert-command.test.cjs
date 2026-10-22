'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { registerInsert } = require('../src/insert-command.cjs');
function harness(root, picked) {
  const commands = new Map(); const calls = [];
  const file = path.join(root, 'scene.md');
  const document = {
    languageId: 'markdown', uri: { scheme: 'file', fsPath: file }, version: 1, isClosed: false,
    getText: () => 'Before\n\n', offsetAt: position => position.offset, positionAt: offset => ({ offset })
  };
  const selection = { start: { offset: 8 }, end: { offset: 8 }, isEqual: other => other === selection };
  const editor = { document, selection, selections: [selection], insertSnippet: async (snippet, position, options) => { calls.push({ snippet: snippet.value, position, options }); return true; } };
  const uri = fsPath => ({ scheme: 'file', fsPath });
  const vscode = {
    Uri: { file: uri }, FileType: { File: 1 }, SnippetString: class { constructor(value) { this.value = value; } },
    workspace: { getWorkspaceFolder: () => ({ uri: uri(root) }), fs: {
      stat: async image => ({ type: (await fs.stat(image.fsPath)).isFile() ? 1 : 2 }),
      readFile: image => fs.readFile(image.fsPath)
    } },
    window: {
      activeTextEditor: editor, showQuickPick: async choices => choices.find(choice => choice.id === 'image'),
      showOpenDialog: async () => picked, showInformationMessage: message => calls.push({ info: message }),
      showWarningMessage: async message => { calls.push({ warning: message }); return undefined; }
    },
    commands: { registerCommand: (name, callback) => { commands.set(name, callback); return { dispose() {} }; } }
  };
  registerInsert(vscode, { subscriptions: [] });
  return { run: () => commands.get('storyTeller.insert')(), calls, document, editor };
}
test('Image command chooses existing local file and inserts one unsaved, undoable snippet', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'story-image-insert-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const target = path.join(root, 'picture Ω (1).png');
  await fs.copyFile(path.join(__dirname, '../samples/assets/harbour-portrait.png'), target);
  const { run, calls } = harness(root, [{ scheme: 'file', fsPath: target }]);
  assert.equal((await run()).status, 'inserted');
  assert.match(calls[0].snippet, /!\[\$\{1:Describe the image\}\]\(<picture%20%CE%A9%20%281%29\.png>\)/);
  assert.equal(calls[0].options.undoStopBefore, true);
  assert.equal(calls[0].options.undoStopAfter, true);
  assert.equal(calls.length, 1);
});
test('Image command cancels cleanly and rejects a stale document or outside-root selection', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'story-image-insert-'));
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'story-image-outside-'));
  t.after(async () => { await fs.rm(root, { recursive: true, force: true }); await fs.rm(outside, { recursive: true, force: true }); });
  const valid = path.join(root, 'valid.png');
  await fs.copyFile(path.join(__dirname, '../samples/assets/harbour-portrait.png'), valid);
  assert.equal((await harness(root, undefined).run()).status, 'cancelled');
  const rejected = harness(root, [{ scheme: 'file', fsPath: path.join(outside, 'other.png') }]);
  assert.equal((await rejected.run()).status, 'cancelled');
  assert.match(rejected.calls[0].warning, /outside the containing workspace/);
  assert.ok(!rejected.calls.some(call => call.snippet));
  const stale = harness(root, [{ scheme: 'file', fsPath: valid }]);
  const result = stale.run();
  stale.document.version++;
  assert.equal((await result).status, 'stale');
  assert.ok(!stale.calls.some(call => call.snippet));
});
