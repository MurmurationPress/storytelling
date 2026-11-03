'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs/promises'), path = require('node:path'), os = require('node:os');
const { metadataMatter, matterDocuments, scaffold } = require('../src/book-matter.cjs');
const { upgradeProject } = require('../src/matter-command.cjs');
const { matterScene } = require('../src/matter-presentation.cjs');
const { StoryPlayer } = require('../src/player.cjs');
const importer = require('../src/manuscript-import.cjs');
const { prepareWeb } = require('../src/web-export.cjs');
const { indexSupporting, resolveTarget } = require('../src/supporting-content.cjs');
const { ProjectTree } = require('../src/import-command.cjs');
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'story-matter-'));
  t.after(() => fs.rm(root,{recursive:true,force:true}));
  const write = async (file, content) => { await fs.mkdir(path.dirname(path.join(root,file)),{recursive:true});await fs.writeFile(path.join(root,file),content); };
  const manifest = {schema:'story-teller-project',version:1,title:'Fictional lantern',bookFile:'metadata/book.md',parts:[{id:'p',title:'First',scenes:['s']}],scenes:[{id:'s',partId:'p',label:'1.1',title:'Signal',file:'scenes/s.md'}]};
  await write('story-teller.project.json',JSON.stringify(manifest));
  await write('metadata/book.md','---\ntype: book\ntitle: Fictional lantern\nauthor: Example Writer\ncopyright: Example notice\n---\n');
  await write('scenes/s.md','Story unchanged.\n');
  return {root,write,manifest};
}
test('metadata uses supplied scalar fields only and does not invent or repeat legal text',()=>{
  assert.equal(metadataMatter({}), '');
  const text=metadataMatter({title:'A *title*',author:'Example',publisher:'Fiction Press',imprint:'Fiction Press',copyright:'Example. Reserved.',rights:'Reserved.',isbn_epub:123,description:['not scalar']});
  assert.match(text,/# A \\\*title\\\*/);assert.equal(text.match(/Fiction Press/g).length,1);assert.equal(text.match(/Reserved\./g).length,1);assert.match(text,/123/);assert.doesNotMatch(text,/description/);
});
test('upgrade creates missing scaffold; preserves empty/edited files, config and sequence; repeat is a no-op',async t=>{
  const f=await fixture(t);f.manifest.settings={supportingContent:'Notes/Background',prosePacing:'on'};await f.write('story-teller.project.json',JSON.stringify(f.manifest));
  await f.write('Front Matter.md','');await f.write('Back Matter.md','Edited ending.');
  const before=await fs.readFile(path.join(f.root,'scenes/s.md'),'utf8');
  const first=await upgradeProject(f.root);assert.deepEqual(first.created,['Notes/Background/']);assert.equal(first.present.length,2);
  assert.equal(await fs.readFile(path.join(f.root,'Front Matter.md'),'utf8'),'');assert.equal(await fs.readFile(path.join(f.root,'Back Matter.md'),'utf8'),'Edited ending.');
  const raw=await fs.readFile(path.join(f.root,'story-teller.project.json'),'utf8');
  const second=await upgradeProject(f.root);assert.deepEqual(second.created,[]);assert.equal(await fs.readFile(path.join(f.root,'story-teller.project.json'),'utf8'),raw);
  assert.deepEqual(importer.orderedScenes(second.manifest),f.manifest.scenes);assert.equal(await fs.readFile(path.join(f.root,'scenes/s.md'),'utf8'),before);
  await assert.rejects(fs.access(path.join(f.root,'Supporting Content')));
  await f.write('Notes/Background/Definition.md','Note.');assert.equal(resolveTarget(await indexSupporting(f.root,second.manifest),'Definition'),'Definition.md');
});
test('upgrade populates only newly created front matter from retained metadata',async t=>{
  const f=await fixture(t);const result=await upgradeProject(f.root);assert.equal(result.created.length,3);
  assert.match(await fs.readFile(path.join(f.root,'Front Matter.md'),'utf8'),/Example Writer/);assert.equal(await fs.readFile(path.join(f.root,'Back Matter.md'),'utf8'),'');
});
test('upgrade rejects unsafe configuration and stale/dirty guards before creation',async t=>{
  const f=await fixture(t);f.manifest.settings={supportingContent:'../outside'};await f.write('story-teller.project.json',JSON.stringify(f.manifest));
  await assert.rejects(upgradeProject(f.root),/relative path/);await assert.rejects(fs.access(path.join(f.root,'Front Matter.md')));
  await f.write('story-teller.project.json',JSON.stringify({...f.manifest,settings:{}}));
  await assert.rejects(upgradeProject(f.root,{beforeWrite:()=>{throw Error('dirty');}}),/dirty/);await assert.rejects(fs.access(path.join(f.root,'Front Matter.md')));
});
test('scaffolding rejects symlink escapes and collisions before touching author files',async t=>{
  const f=await fixture(t);await fs.symlink(os.tmpdir(),path.join(f.root,'escape'));
  await assert.rejects(scaffold(f.root,{...f.manifest,settings:{supportingContent:'escape/notes'}}),/symlink/);
  assert.throws(()=>matterDocuments({...f.manifest,matter:{front:{id:'s',file:'scenes/s.md'}}}),/separate/);
});
test('matter is a fully displayed safe Markdown page, never a timed beat',()=>{
  const source='---\ntitle: Fictional\n---\n# Title\n\nFirst **bold** [[JANUS early|JANUS]].\n\n---\n\n```typeout\n@sound modem\n\nLiteral example.\n```\n';
  const model=matterScene(source);assert.equal(model.beats.length,1);assert.equal(model.wikiReferences[0].target,'JANUS early');
  const player=new StoryPlayer(model);player.revealBeat();assert.equal(player.phase,'completed');assert.equal(player.timer,null);assert.match(player.visibleBlocks[0].html,/<strong>bold<\/strong>/);assert.match(player.visibleBlocks[0].html,/@sound modem/);assert.doesNotMatch(player.visibleBlocks[0].html,/title: Fictional/);
});
test('export keeps legacy projects unchanged; includes nonempty matter in exact reading order and omits empty pages',async t=>{
  const f=await fixture(t);assert.deepEqual((await prepareWeb(f.root)).book.scenes.map(s=>s.id),['s']);
  await upgradeProject(f.root);await f.write('Back Matter.md','Ending with [[Definition]].\n');await f.write('Supporting Content/Definition.md','Definition.');
  let prepared=await prepareWeb(f.root);assert.deepEqual(prepared.book.readingOrder.map(item=>item.kind),['front','scene','back']);assert.deepEqual(prepared.book.scenes.map(s=>s.id),['s']);assert.ok(prepared.book.targets.Definition.id);
  await f.write('Front Matter.md','---\ntitle: empty\n---\n\n');prepared=await prepareWeb(f.root);assert.deepEqual(prepared.book.readingOrder.map(item=>item.kind),['scene','back']);
});
test('outline places even empty matter outside unchanged parts; refresh reparses configuration',async t=>{
  const f=await fixture(t);await upgradeProject(f.root);
  const tree=new ProjectTree({workspace:{workspaceFolders:[{uri:{fsPath:f.root}}]},EventEmitter:class{constructor(){this.event=()=>{};}fire(){}},TreeItemCollapsibleState:{Expanded:2,Collapsed:1,None:0}});
  const items=await tree.getChildren();assert.deepEqual(items.map(item=>item.label),['Front Matter','First','Back Matter']);assert.equal(items[0].command.arguments[1].kind,'front');assert.equal((await tree.getChildren(items[1]))[0].label,'1.1 Signal');
});
test('import preserves classified matter order/wording and excludes it from scenes without duplicating metadata',async t=>{
  const f=await fixture(t),book=path.join(f.root,'Books/Lantern');await fs.mkdir(book,{recursive:true});
  const note=(type,parent,order,body,extra='')=>`---\ntype: ${type}\nparent: "[[${parent}]]"\norder: ${order}\n${extra}---\n${body}`;
  await f.write('Books/Lantern.md',note('book','',0,'','title: Metadata must not duplicate existing matter\n'));
  await f.write('Books/Lantern/B.md',note('front-matter','Books/Lantern',2,'Second front text.\n'));
  await f.write('Books/Lantern/A.md',note('front-matter','Books/Lantern',1,'# Authored title\n\nFirst front text.\n'));
  await f.write('Books/Lantern/Z.md',note('back-matter','Books/Lantern',1,'Authored ending.\n'));
  const prepared=await importer.resolveAssets(importer.plan(importer.discover(await importer.scan(book),book),'order'),book);
  assert.deepEqual(prepared.errors,[]);assert.equal(prepared.scenes.length,0);
  const dest=path.join(f.root,'Imported');await importer.writeProject(prepared,dest);
  const text=await fs.readFile(path.join(dest,'Front Matter.md'),'utf8');assert.equal(text,'# Authored title\n\nFirst front text.\n\n\nSecond front text.\n');assert.doesNotMatch(text,/Metadata must/);
  assert.equal(await fs.readFile(path.join(dest,'Back Matter.md'),'utf8'),'Authored ending.\n');
  assert.deepEqual((await prepareWeb(dest)).book.readingOrder.map(item=>item.kind),['front','back']);
});
test('import with no book metadata or manuscript content still creates editable empty matter and supporting folder',async t=>{
  const f=await fixture(t),book=path.join(f.root,'Empty');await fs.mkdir(book);
  const prepared=await importer.resolveAssets(importer.plan(importer.discover(await importer.scan(book),book),null),book);
  assert.deepEqual(prepared.errors,[]);const dest=path.join(f.root,'Empty imported');await importer.writeProject(prepared,dest);
  for(const name of ['Front Matter.md','Back Matter.md'])assert.equal(await fs.readFile(path.join(dest,name),'utf8'),'');
  assert.equal((await prepareWeb(dest)).book.readingOrder.length,0);
});
test('partless manuscript uses explicit book-parent/order metadata; no filename ordering',async t=>{
  const f=await fixture(t),book=path.join(f.root,'Direct');await fs.mkdir(book);
  for(const [name,order] of [['Alpha',10],['Zeta',2]])await f.write(`Direct/${name}.md`,`---\ntype: scene\nparent: "[[Direct]]"\norder: ${order}\n---\n${name}.`);
  const prepared=await importer.resolveAssets(importer.plan(importer.discover(await importer.scan(book),book),'order'),book);
  assert.deepEqual(prepared.errors,[]);assert.deepEqual(prepared.scenes.map(s=>s.title),['Zeta','Alpha']);
  const dest=path.join(f.root,'Direct imported'),manifest=await importer.writeProject(prepared,dest);
  assert.deepEqual(importer.orderedScenes(manifest).map(s=>s.label),['1','2']);assert.equal((await prepareWeb(dest)).book.scenes.length,2);
});
test('matter assets are relocated relative to root documents, notes retain aliases, original bytes survive',async t=>{
  const f=await fixture(t);await upgradeProject(f.root);await fs.cp(path.join(__dirname,'../samples/assets/harbour-portrait.png'),path.join(f.root,'portrait.png'));
  await f.write('Front Matter.md','![Portrait](portrait.png)\n\n[[JANUS early|JANUS]].');await f.write('Supporting Content/JANUS early.md','Early account.');
  const prepared=await prepareWeb(f.root),front=prepared.scenes.find(item=>item.kind==='front');
  assert.ok(front.data.media['portrait.png'].url.startsWith('assets/'));assert.equal(front.data.supporting.links['JANUS early'].id,'JANUS early.md');assert.equal(prepared.assets.size,1);
});
test('deleted imported matter can be rebuilt from its retained source template without revisiting the manuscript',async t=>{
  const f=await fixture(t);const saved=await upgradeProject(f.root);saved.manifest.matter.back.sourceFile='metadata/back-matter.md';
  await f.write('metadata/back-matter.md','Preserved authored end.\n');await f.write('story-teller.project.json',JSON.stringify(saved.manifest));await fs.unlink(path.join(f.root,'Back Matter.md'));
  await upgradeProject(f.root);assert.equal(await fs.readFile(path.join(f.root,'Back Matter.md'),'utf8'),'Preserved authored end.\n');
});
test('upgrade command selects the chosen workspace project and cancellation writes nothing',async t=>{
  const f=await fixture(t);const other=path.join(f.root,'other');await fs.mkdir(other);await fs.writeFile(path.join(other,'story-teller.project.json'),JSON.stringify({...f.manifest,parts:[],scenes:[],bookFile:undefined}));
  const registered=new Map(), reports=[],folders=[{name:'One',uri:{fsPath:f.root}},{name:'Two',uri:{fsPath:other}}];let picked;
  const vscode={workspace:{workspaceFolders:folders,textDocuments:[]},commands:{registerCommand:(id,fn)=>{registered.set(id,fn);return{dispose(){}};}},window:{showQuickPick:async items=>picked===undefined?undefined:items[picked],showInformationMessage:message=>reports.push(message),showErrorMessage:message=>{throw Error(message);}}};
  require('../src/matter-command.cjs').registerMatter(vscode,{subscriptions:[]});
  await registered.get('storyTeller.addBookMatter')();await assert.rejects(fs.access(path.join(f.root,'Front Matter.md')));
  picked=1;await registered.get('storyTeller.addBookMatter')();await fs.access(path.join(other,'Front Matter.md'));await assert.rejects(fs.access(path.join(f.root,'Front Matter.md')));assert.match(reports[0],/Created: Front Matter.md, Back Matter.md, Supporting Content/);
});
test('newly imported matter rewrites supported images and preserves original source bytes',async t=>{
  const f=await fixture(t),folder=path.join(__dirname,'../samples/matter-source/Lantern');
  const original=await fs.readFile(path.join(folder,'Opening.md'));
  const prepared=await importer.resolveAssets(importer.plan(importer.discover(await importer.scan(folder),folder),'order'),folder);
  const dest=path.join(f.root,'asset-import');await importer.writeProject(prepared,dest);
  const front=await fs.readFile(path.join(dest,'Front Matter.md'),'utf8');assert.match(front,/\]\(assets\/portrait-[a-f0-9]+\.png\)/);
  assert.deepEqual(await fs.readFile(path.join(folder,'Opening.md')),original);assert.deepEqual(await fs.readFile(path.join(dest,'metadata/front-matter-0.md')),original);
  assert.equal((await prepareWeb(dest)).assets.size,1);
});
test('matter HTTP links open separately while unsafe schemes and authored HTML stay inert',()=>{
 const html=matterScene('[Publisher](https://example.test/?a=1&b=2) [Book](http://example.test/book) [Mail](mailto:a@example.test) [Bad](javascript:alert(1)) <a href="https://evil.test">raw</a>').beats[0].blocks[0].html;
 assert.match(html,/<a href="https:\/\/example.test\/\?a=1&amp;b=2" target="_blank" rel="noopener noreferrer">Publisher<\/a>/);
 assert.match(html,/<a href="http:\/\/example.test\/book" target="_blank" rel="noopener noreferrer">Book<\/a>/);
 assert.doesNotMatch(html,/<a href="(?:mailto|javascript):/);
 assert.match(html,/&lt;a href=/);
});
