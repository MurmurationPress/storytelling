'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { registerImport, pendingOutlineMatches } = require('../src/import-command.cjs');
function fakeHost(answers, navigation) {
  const commands = new Map(), views = new Map(), messages = [], disposables = [], reviews = [], executed = [], updates = [];
  const d = { dispose() {} };
  const vscode = {
    EventEmitter: class { constructor() { this.event = () => d; } fire() {} },
    TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 }, ViewColumn: { Active: 1 },
    Uri: { file: fsPath => ({ fsPath }) },
    workspace: { workspaceFolders: answers.folders || [], onDidChangeWorkspaceFolders: () => d,
      createFileSystemWatcher: () => ({ onDidChange() {}, onDidCreate() {}, onDidDelete() {}, dispose() {} }) },
    window: { registerTreeDataProvider: (name, provider) => { views.set(name, provider); return d; },
      showTextDocument: async uri => { answers.opened ||= []; answers.opened.push(uri.fsPath); return { document: { uri } }; },
      showOpenDialog: async () => answers.dialogs.shift(),
      showQuickPick: async rows => answers.quick === 'cancel' ? undefined : rows.find(r => r.label === answers.quick),
      createWebviewPanel: () => {
        let disposed = () => {};
        const panel = { webview: { html: '', onDidReceiveMessage: fn => { queueMicrotask(async () => fn(answers.onReview ? await answers.onReview() : answers.review || 'continue')); return d; } },
          onDidDispose: fn => { disposed = fn; return d; }, dispose: () => disposed() };
        reviews.push(panel.webview);
        return panel;
      },
      showInputBox: async () => answers.name,
      showInformationMessage: async (message, options, ...choices) => { messages.push(message); return choices.includes('Import') ? answers.confirm : undefined; },
      showErrorMessage: async message => { messages.push(message); },
      showWarningMessage: async () => answers.assetChoice },
    commands: { registerCommand: (name, fn) => { commands.set(name, fn); return d; }, executeCommand: async name => { executed.push(name); } }
  };
  registerImport(vscode, { subscriptions: disposables, globalState: { get: () => answers.pending, update: async (key, value) => { updates.push([key, value]); } } }, navigation);
  return { commands, views, messages, reviews, executed, updates };
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
test('cancelled review writes nothing and retains fixed keyboard controls', async t => {
  const f = await fixture(t);
  const host = fakeHost({ dialogs: [[{ fsPath: f.book }]], quick: 'manuscript_order_key', review: 'cancel' });
  await host.commands.get('storyTeller.importManuscript')();
  assert.deepEqual(await fs.readdir(f.dest), []);
  assert.match(host.reviews[0].html, /position:sticky/);
  assert.match(host.reviews[0].html, /id="back"/);
  assert.match(host.reviews[0].html, /id="continue"/);
  assert.match(host.reviews[0].html, /id="cancel"/);
});
test('explicit review, destination and confirmation create project; outline uses manifest order', async t => {
  const f = await fixture(t);
  const host = fakeHost({ dialogs: [[{ fsPath: f.book }], [{ fsPath: f.dest }]], quick: 'manuscript_order_key', name: 'Adapted Lantern', confirm: 'Import' });
  await host.commands.get('storyTeller.importManuscript')();
  const project = path.join(f.dest, 'Adapted Lantern');
  const manifest = JSON.parse(await fs.readFile(path.join(project, 'story-teller.project.json'), 'utf8'));
  assert.deepEqual(manifest.parts[0].scenes, [manifest.scenes[0].id]);
  assert.equal(manifest.scenes[0].label, '1.1');
  assert.match(host.reviews[0].html, /1\.1 One/);
  assert.match(host.messages.join('\n'), /Create 1-scene adaptation/);
  assert.match(await fs.readFile(path.join(project, manifest.scenes[0].file), 'utf8'), /Opening\./);
});
test('outline auto-open marker targets only the exact destination project', () => {
  const folders = [{ uri: { fsPath: '/tmp/other' } }, { uri: { fsPath: '/tmp/lantern' } }];
  assert.equal(pendingOutlineMatches('/tmp/lantern', folders), true);
  assert.equal(pendingOutlineMatches('/tmp/lantern-copy', folders), false);
  assert.equal(pendingOutlineMatches(undefined, folders), false);
});
test('matching destination consumes one-shot marker and opens outline, unrelated workspace does not', async () => {
  const destination = '/tmp/story-import-target';
  const match = fakeHost({ dialogs: [], folders: [{ uri: { fsPath: destination } }], pending: destination });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(match.updates, [['storyTeller.pendingOutline', undefined]]);
  assert.ok(match.executed.includes('workbench.view.extension.storyTeller'));
  const other = fakeHost({ dialogs: [], folders: [{ uri: { fsPath: '/tmp/another-project' } }], pending: destination });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(other.updates, []);
  assert.deepEqual(other.executed, []);
});
test('project outline initially expands only the first part', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'story-outline-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.writeFile(path.join(root, 'story-teller.project.json'), JSON.stringify({ schema: 'story-teller-project', version: 1,
    parts: [{ id: 'one', title: 'First', scenes: [] }, { id: 'two', title: 'Second', scenes: [] }], scenes: [] }));
  const host = fakeHost({ dialogs: [], folders: [{ uri: { fsPath: root } }] });
  const items = await host.views.get('storyTeller.outline').getChildren();
  assert.deepEqual(items.map(item => item.collapsibleState), [2, 1]);
});

test('outline command cancels before validation and commits only the latest scene without altering sources', async t => {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'story-scene-command-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  await fs.mkdir(path.join(root,'scenes'));for(const name of ['A','B'])await fs.writeFile(path.join(root,'scenes',name+'.md'),name+' unchanged.');
  await fs.writeFile(path.join(root,'story-teller.project.json'), JSON.stringify({schema:'story-teller-project',version:1,parts:[{id:'p',scenes:['A','B']}],scenes:['A','B'].map(id=>({id,partId:'p',file:`scenes/${id}.md`}))}));
  const answers={dialogs:[]},calls=[];
  const host=fakeHost(answers,{onScenePending:()=>calls.push('stop'),openScene:editor=>calls.push(editor.document.uri.fsPath)});
  const command=host.commands.get('storyTeller.openProjectScene');
  const a=command(root,{file:'scenes/A.md'}),b=command(root,{file:'scenes/B.md'});
  assert.deepEqual(calls,['stop','stop']);await Promise.all([a,b]);
  assert.deepEqual(calls,['stop','stop',path.join(root,'scenes/B.md')]);
  assert.equal(await fs.readFile(path.join(root,'scenes/A.md'),'utf8'),'A unchanged.');
});
test('a failed outline selection releases the outgoing reader to ready without opening another file', async () => {
  const calls=[];const host=fakeHost({dialogs:[]},{onScenePending:()=>calls.push('stop'),onSceneFailed:()=>calls.push('ready')});
  await host.commands.get('storyTeller.openProjectScene')('/not-a-project',{file:'../private.md'});
  assert.deepEqual(calls,['stop','ready']);assert.match(host.messages[0],/Story Teller scene/);
});
test('empty and single-matter imports need no fictional order key or book metadata',async t=>{
  const f=await fixture(t);
  for(const withMatter of [false,true]) {
    const book=path.join(f.root,withMatter?'Single':'Empty');await fs.mkdir(book);
    if(withMatter)await fs.writeFile(path.join(book,'Opening.md'),'---\ntype: front-matter\nparent: "[[Single]]"\n---\nAuthored opening.\n');
    const host=fakeHost({dialogs:[[{fsPath:book}],[{fsPath:f.dest}]],quick:'cancel',name:withMatter?'Single adaptation':'Empty adaptation',confirm:'Import'});
    await host.commands.get('storyTeller.importManuscript')();
    const root=path.join(f.dest,withMatter?'Single adaptation':'Empty adaptation');
    assert.equal(await fs.readFile(path.join(root,'Front Matter.md'),'utf8'),withMatter?'Authored opening.\n':'');
    assert.equal(await fs.readFile(path.join(root,'Back Matter.md'),'utf8'),'');
    assert.equal(JSON.parse(await fs.readFile(path.join(root,'story-teller.project.json'),'utf8')).scenes.length,0);
    assert.match(host.reviews[0].html,/Not needed \(no ordered story items\)/);
  }
});
test('multiple classified matter notes without an order key are diagnosed rather than filename sorted',async t=>{
  const f=await fixture(t),book=path.join(f.root,'Ambiguous');await fs.mkdir(book);
  for(const name of ['B','A'])await fs.writeFile(path.join(book,name+'.md'),'---\ntype: front-matter\nparent: "[[Ambiguous]]"\n---\nWords.\n');
  const host=fakeHost({dialogs:[[{fsPath:book}]]});await host.commands.get('storyTeller.importManuscript')();
  assert.match(host.messages.join('\n'),/No frontmatter order fields/);assert.equal(host.reviews.length,0);
});
test('Back rereads corrected parent metadata before enabling review and writing',async t=>{
  const f=await fixture(t),file=path.join(f.book,'First/One.md');
  const valid=await fs.readFile(file,'utf8');await fs.writeFile(file,valid.replace('Books/Lantern/First','Missing'));
  const answers={dialogs:[[{fsPath:f.book}],[{fsPath:f.dest}]],quick:'manuscript_order_key',name:'Corrected',confirm:'Import'};
  let count=0;answers.onReview=async()=>{count++;if(count===1){await fs.writeFile(file,valid);return 'back';}return 'continue';};
  const host=fakeHost(answers);await host.commands.get('storyTeller.importManuscript')();
  assert.equal(count,2);assert.match(host.reviews[0].html,/id="continue"[^>]*disabled/);assert.doesNotMatch(host.reviews[1].html,/id="continue"[^>]*disabled/);
  const manifest=JSON.parse(await fs.readFile(path.join(f.dest,'Corrected/story-teller.project.json'),'utf8'));assert.equal(manifest.scenes.length,1);
});
