'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { registerImport } = require('../src/import-command.cjs');
function fakeHost(answers) {
  const commands = new Map(), views = new Map(), messages = [], disposables = []; let picks = 0;
  const d = { dispose() {} };
  const vscode = {
    EventEmitter: class { constructor() { this.event = () => d; } fire() {} },
    TreeItemCollapsibleState: { None: 0, Expanded: 2 },
    Uri: { file: fsPath => ({ fsPath }) },
    workspace: { workspaceFolders: [], onDidChangeWorkspaceFolders: () => d,
      createFileSystemWatcher: () => ({ onDidChange() {}, onDidCreate() {}, onDidDelete() {}, dispose() {} }) },
    window: { registerTreeDataProvider: (name, provider) => { views.set(name, provider); return d; },
      showOpenDialog: async () => answers.dialogs.shift(),
      showQuickPick: async (rows) => { if (answers.quick === 'cancel') return undefined; return picks++ === 0 ? rows.find(r => r.label === answers.quick) : rows.find(r => r.action === 'continue'); },
      showInputBox: async () => answers.name,
      showInformationMessage: async (message, options, ...choices) => { messages.push(message); return choices.includes('Import') ? answers.confirm : undefined; },
      showErrorMessage: async message => { messages.push(message); },
      showWarningMessage: async () => answers.assetChoice },
    commands: { registerCommand: (name, fn) => { commands.set(name, fn); return d; }, executeCommand: async () => {} }
  };
  registerImport(vscode, { subscriptions: disposables });
  return { commands, views, messages };
}
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'story-command-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const book = path.join(root, 'Books', 'Lantern'), dest = path.join(root, 'output');
  await fs.mkdir(path.join(book, 'First'), { recursive: true }); await fs.mkdir(dest);
  await fs.writeFile(path.join(root, 'Books', 'Lantern.md'), '---\ntype: book\ntitle: Lantern\n---\n');
  await fs.writeFile(path.join(book, 'First.md'), '---\ntype: part\ntitle: First\nparent: "[[Books/Lantern]]"\nmanuscript_order_key: "8000000000"\n---\n');
  await fs.writeFile(path.join(book, 'First', 'One.md'), '---\ntype: scene\ntitle: One\nparent: "[[Books/Lantern/First]]"\nmanuscript_order_key: "8000000000"\n---\nOpening.\n');
  return { root, book, dest };
}
test('cancelled mocked review writes nothing', async t => {
  const f = await fixture(t);
  const host = fakeHost({ dialogs: [[{ fsPath: f.book }]], quick: 'cancel' });
  await host.commands.get('storyTeller.importManuscript')();
  assert.deepEqual(await fs.readdir(f.dest), []);
});
test('explicit review, destination and confirmation create project; outline uses manifest order', async t => {
  const f = await fixture(t);
  const host = fakeHost({ dialogs: [[{ fsPath: f.book }], [{ fsPath: f.dest }]], quick: 'manuscript_order_key', name: 'Adapted Lantern', confirm: 'Import' });
  await host.commands.get('storyTeller.importManuscript')();
  const project = path.join(f.dest, 'Adapted Lantern');
  const manifest = JSON.parse(await fs.readFile(path.join(project, 'story-teller.project.json'), 'utf8'));
  assert.deepEqual(manifest.parts[0].scenes, [manifest.scenes[0].id]);
  assert.equal(manifest.scenes[0].label, '1.1');
  assert.match(host.messages.join('\n'), /Create 1-scene adaptation/);
  assert.match(await fs.readFile(path.join(project, manifest.scenes[0].file), 'utf8'), /Opening\./);
});
