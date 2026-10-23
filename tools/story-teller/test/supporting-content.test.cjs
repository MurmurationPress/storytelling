'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { indexSupporting, resolveTarget, targetPath, loadSupporting, describeLinks, SUPPORTING_FOLDER } = require('../src/supporting-content.cjs');
const { renderChat, renderMarkdown } = require('../src/markdown.cjs');
const { parseScene } = require('../src/parser.cjs');
const { StoryPlayer } = require('../src/player.cjs');
const { scan, discover, orderedScenes } = require('../src/manuscript-import.cjs');
const { loadForPreview, watchSupporting } = require('../src/supporting-host.cjs');
async function fixture(t) {
  const project = await fs.mkdtemp(path.join(os.tmpdir(),'story-notes-'));t.after(()=>fs.rm(project,{recursive:true,force:true}));
  const root=path.join(project,SUPPORTING_FOLDER);await fs.mkdir(path.join(root,'definitions'),{recursive:true});
  for(const [file,content] of Object.entries({'Ted.md':'# Edward\n\nA fictional keeper.','JANUS early.md':'A small beginning.','JANUS later.md':'A later account.','definitions/Other.md':'Another note.'}))await fs.writeFile(path.join(root,file),content);
  return {project,root,index:await indexSupporting(project)};
}
test('aliases preserve distinct author-selected targets in prose, chat and annotation without target timing',()=>{
  const source='[[Ted|Edward]] [[JANUS early|JANUS]] [[JANUS later|JANUS]]\n\n```chat\nIvo: Read [[JANUS later|JANUS]].\n```\n\n```typeout\n@format annotation\n\n**[[JANUS early|JANUS]]** then [[Ted|Edward]].\n```';
  const scene=parseScene(source,{prosePacing:true});
  assert.deepEqual(scene.wikiReferences.map(ref=>ref.target),['Ted','JANUS early','JANUS later','JANUS later','JANUS early','Ted']);
  assert.match(scene.beats[0].blocks[0].html,/data-story-target="Ted">Edward/);
  assert.equal(scene.beats[0].blocks[0].proseIntervalMs,1000);
  assert.equal(scene.beats[0].blocks[1].messages[0].timingText,'Read JANUS.');
  assert.equal(scene.beats[0].blocks[2].annotation.segments.join(''),'JANUS then Edward.\n'.trim());
  assert.equal(scene.beats[0].blocks[2].annotation.count,18);
  assert.ok(scene.wikiReferences.every(ref=>Number.isInteger(ref.line)));
  assert.equal(renderChat('Plain **literal** `[[code]]` \\[[escaped]]').references.length,0);
  assert.equal(parseScene('```typeout\n@format yaml\n\n[[Ted|Edward]]\n```').wikiReferences.length,0);
});
test('safe Markdown protects code, escaping, embeds, HTML and unsafe URLs',()=>{
  const note=renderMarkdown('[[Ted|<script>]] \\[[Ted]] `[[Ted]]` ![[media]]\n\n~~~md\n[[Ted]]\n~~~\n\n<script>alert(1)</script> [bad](javascript:alert(1)) ![remote](https://example.test/x.png)');
  assert.equal(note.references.length,1);assert.match(note.html,/&lt;script&gt;/);assert.doesNotMatch(note.html,/<script|<a\b|\ssrc=|onclick/);
  assert.deepEqual(note.images,['https://example.test/x.png']);
  const injected=renderMarkdown('[[Ted\" onclick=\"x|label]]');assert.doesNotMatch(injected.html,/" onclick="/);
});
test('resolution supports deterministic root-relative paths and refuses ambiguous basenames',async t=>{
  const f=await fixture(t);assert.equal(resolveTarget(f.index,'Ted'),'Ted.md');assert.equal(resolveTarget(f.index,'definitions/Other.md'),'definitions/Other.md');
  await fs.writeFile(path.join(f.root,'definitions','Ted.md'),'A different Ted.');f.index=await indexSupporting(f.project);
  assert.throws(()=>resolveTarget(f.index,'Ted'),/Ambiguous.*definitions\/Ted.md/);assert.equal(resolveTarget(f.index,'./Ted'),'Ted.md');
  assert.throws(()=>resolveTarget(f.index,'ted'),/filename\/path and case/);
  await fs.writeFile(path.join(f.root,'Écho 100%.md'),'A literal filename.');
  assert.equal(resolveTarget(await indexSupporting(f.project),'Écho 100%'),'Écho 100%.md');
  const links=await describeLinks(f.index,[{target:'Ted',line:7},{target:'Missing',line:8}]);assert.match(links.diagnostics[0],/Line 7:.*Ambiguous/);assert.match(links.diagnostics[1],/Line 8:.*Missing/);
});
test('traversal, unsupported references and symlink escapes never read outside the root',async t=>{
  const f=await fixture(t);
  for(const value of ['../Ted','definitions/../../Ted','/etc/passwd','https://example.test','C:\\Ted','Ted#Heading','Ted^block','bad\0name'])assert.throws(()=>targetPath(value),/inside Supporting Content/);
  assert.throws(()=>resolveTarget(f.index,'%2e%2e/Ted'),/Missing note/); // Wiki targets are literal filenames, never URL decoded.
  await fs.writeFile(path.join(f.project,'secret.md'),'must not read');await fs.symlink(path.join(f.project,'secret.md'),path.join(f.root,'Escape.md'));const index=await indexSupporting(f.project);
  let read=false;await assert.rejects(loadSupporting(index,'Escape',{readText:()=>{read=true;return 'secret';}}),/outside Supporting Content/);assert.equal(read,false);
  await fs.rename(f.root,f.root+'-saved');await fs.symlink(f.root+'-saved',f.root);assert.equal((await loadSupporting(index,'Ted')).title,'Ted');
});
test('a Supporting Content root symlink outside the project is rejected',async t=>{
  const f=await fixture(t);const outside=await fs.mkdtemp(path.join(os.tmpdir(),'outside-notes-'));t.after(()=>fs.rm(outside,{recursive:true,force:true}));
  await fs.rm(f.root,{recursive:true});await fs.symlink(outside,f.root);await assert.rejects(indexSupporting(f.project),/outside the adaptation project/);
});
test('notes are ordinary Markdown, not performed beats, and nested links use the same root',async t=>{
  const f=await fixture(t);await fs.writeFile(path.join(f.root,'definitions','Other.md'),'---\nkind: note\n---\n# Background\n\n[[Ted|Edward]]\n\n---\n\n```chat\nIvo: Ordinary code.\n```');
  const note=await loadSupporting(f.index,'definitions/Other');assert.match(note.html,/<h1>Background<\/h1>/);assert.match(note.html,/<hr>/);assert.match(note.html,/<pre><code/);assert.doesNotMatch(note.html,/kind: note/);assert.equal(note.links.Ted.id,'Ted.md');
  await fs.writeFile(path.join(f.root,'Ted.md'),'---\nkind: note\n---');assert.equal((await loadSupporting(f.index,'Ted')).html,'');
});
test('note images resolve from their own file with existing local-media security and unsaved text',async t=>{
  const f=await fixture(t);await fs.mkdir(path.join(f.project,'assets'));await fs.copyFile(path.join(__dirname,'../samples/assets/harbour-portrait.png'),path.join(f.project,'assets','light Ω.png'));
  await fs.writeFile(path.join(f.root,'Ted.md'),'Old disk text.');
  const uri=file=>({scheme:'file',fsPath:file,toString:()=>file});
  const vscode={Uri:{file:uri},FileType:{File:1},workspace:{textDocuments:[{isDirty:true,uri:uri(path.join(f.root,'Ted.md')),getText:()=> 'Unsaved **note**.\n\n![Lamp](<../assets/light%20%CE%A9.png>)\n\n![Remote](https://example.test/x.png)'}],getWorkspaceFolder:()=>({uri:uri(f.project)}),fs:{stat:async()=>({type:1}),readFile:target=>fs.readFile(target.fsPath)}}};
  const note=await loadForPreview(vscode,{asWebviewUri:uri=>({toString:()=>`local-resource:${uri.fsPath}`})},f.index,'Ted');
  assert.match(note.html,/Unsaved <strong>note/);assert.match(note.media['../assets/light%20%CE%A9.png'].url,/light Ω.png/);assert.match(note.media['https://example.test/x.png'].error,/remote/);assert.equal(await fs.readFile(path.join(f.root,'Ted.md'),'utf8'),'Old disk text.');
});
test('supporting notes cannot enter manuscript discovery or the project sequence, even with scene metadata',async t=>{
  const f=await fixture(t);await fs.writeFile(path.join(f.root,'Pretend.md'),'---\ntype: scene\nparent: "[[First]]"\norder: 1\n---\nSupporting only.');
  const items=await scan(f.project);assert.ok(!items.some(item=>item.file.includes(SUPPORTING_FOLDER)));
  const invented={file:path.join(f.root,'Pretend.md'),data:{type:'scene',order:1},body:'Text.'};assert.ok(!discover([invented],f.project).items.includes(invented));
  assert.throws(()=>orderedScenes({schema:'story-teller-project',version:1,parts:[{id:'p',scenes:['s']}],scenes:[{id:'s',partId:'p',file:'Supporting Content/Pretend.md'}]}),/cannot appear/);
});

test('wiki token identity does not split existing image captions or lose plain alt aliases',()=>{
  const scene=parseScene('![An [[image|alias]]](lamp.png)\n\n*Caption: [[Ted|Edward]] at the gate.*');
  assert.equal(scene.beats[0].blocks.length,1);assert.equal(scene.beats[0].blocks[0].alt,'An alias');
  assert.equal(scene.beats[0].blocks[0].caption,'Edward at the gate.');assert.equal(scene.wikiReferences.length,0);
});

test('a clean open note buffer cannot mask an external filesystem update',async t=>{
  const f=await fixture(t);const uri=file=>({scheme:'file',fsPath:file});
  const vscode={Uri:{file:uri},workspace:{textDocuments:[{isDirty:false,uri:uri(path.join(f.root,'Ted.md')),getText:()=> 'Stale editor text.'}]}};
  await fs.writeFile(path.join(f.root,'Ted.md'),'New disk text.');
  const note=await loadForPreview(vscode,{},f.index,'Ted');assert.match(note.html,/New disk text/);assert.doesNotMatch(note.html,/Stale editor text/);
});

test('supporting refresh establishes an explicit project watcher and filters unrelated files',()=>{
  const listeners=[],events=[],disposed=[];let pattern;
  const vscode={RelativePattern:class{constructor(base,glob){this.base=base;this.pattern=glob;}},Uri:{file:fsPath=>({fsPath})},workspace:{createFileSystemWatcher:value=>{pattern=value;return {onDidChange:fn=>{listeners.push(fn);return {dispose:()=>disposed.push('listener')};},onDidCreate:fn=>{listeners.push(fn);return {dispose:()=>disposed.push('listener')};},onDidDelete:fn=>{listeners.push(fn);return {dispose:()=>disposed.push('listener')};},dispose:()=>disposed.push('watcher')};}}};
  const watcher=watchSupporting(vscode,{project:'/book',root:'/book/Supporting Content'},uri=>events.push(uri.fsPath));
  assert.equal(pattern.base.fsPath,'/book');assert.equal(pattern.pattern,'**/*');
  listeners[0]({fsPath:'/book/Supporting Content/Ted.md'});listeners[1]({fsPath:'/book/assets/photo.PNG'});listeners[2]({fsPath:'/other/Ted.md'});listeners[0]({fsPath:'/book/scenes/scene.md'});
  assert.deepEqual(events,['/book/Supporting Content/Ted.md','/book/assets/photo.PNG']);watcher.dispose();assert.deepEqual(disposed,['listener','listener','listener','watcher']);
});
