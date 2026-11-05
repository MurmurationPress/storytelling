'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const m=require('../src/manuscript-import.cjs');const {ProjectTree,showImportReview}=require('../src/import-command.cjs');
const {prepareWeb}=require('../src/web-export.cjs');const {hasSceneHeading}=require('../src/scene-heading.cjs');
async function fixture(t) {
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'story-import-repairs-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const folder=path.join(root,'Books/Lantern');await fs.mkdir(folder,{recursive:true});
 const write=async(file,text)=>{await fs.mkdir(path.dirname(path.join(root,file)),{recursive:true});await fs.writeFile(path.join(root,file),text);};
 const note=(type,parent,order,body='Words.\n')=>`---\ntype: ${type}\nparent: "[[${parent}]]"\norder: ${order}\n---\n${body}`;
 await write('Books/Lantern.md',note('book','',0,''));
 for(const [file,type,parent,order]of [['Before','scene','Books/Lantern',1],['First','part','Books/Lantern',2],['First/Child','scene','Books/Lantern/First',1000],['Between','scene','Books/Lantern',3],['Second','part','Books/Lantern',4],['Second/Child','scene','Books/Lantern/Second',1],['After','scene','Books/Lantern',5]])await write(`Books/Lantern/${file}.md`,note(type,parent,order,type==='part'?'':`${file} words.\n`));
 const plan=async()=>m.plan(m.discover(await m.scan(folder),folder),'order');
 return{root,folder,write,note,plan};
}
test('book scenes share root sibling order with parts; children stay in their part regardless of their numeric key',async t=>{
 const f=await fixture(t),p=await f.plan();assert.deepEqual(p.errors,[]);
 assert.deepEqual(p.scenes.map(s=>s.source.replace(f.folder+'/','')),['Before.md','First/Child.md','Between.md','Second/Child.md','After.md']);
 assert.deepEqual(p.scenes.map(s=>s.label),['1','1.1','2','2.1','3']);
 const prepared=await m.resolveAssets(p,f.root),dest=path.join(f.root,'project'),manifest=await m.writeProject(prepared,dest);
 assert.deepEqual(m.orderedScenes(manifest).map(s=>s.id),p.scenes.map(s=>s.id));assert.equal(manifest.parts.length,2);
 assert.deepEqual(m.orderedRoots(manifest).map(e=>e.item.id),p.sequence.map(e=>e.id));
 manifest.scenes.reverse();assert.deepEqual(m.orderedScenes(manifest).map(s=>s.id),p.scenes.map(s=>s.id));
 for(const scene of manifest.scenes) {const content=await fs.readFile(path.join(dest,scene.file),'utf8');assert.ok(hasSceneHeading(content,scene.title));assert.equal(await fs.readFile(scene.provenance.source,'utf8'),p.scenes.find(s=>s.id===scene.id).content);}
 const v={workspace:{workspaceFolders:[{uri:{fsPath:dest}}]},EventEmitter:class{constructor(){this.event=()=>{};}fire(){}},TreeItemCollapsibleState:{Expanded:2,Collapsed:1,None:0}};
 const tree=await new ProjectTree(v).getChildren();assert.deepEqual(tree.map(e=>e.label),['Front Matter','1 Before','First','2 Between','Second','3 After','Back Matter']);
 const exported=await prepareWeb(dest);assert.deepEqual(exported.book.scenes.map(s=>s.id),p.scenes.map(s=>s.id));assert.deepEqual(exported.book.sequence,p.sequence);
});
test('missing, unmatched and ambiguous parents block instead of excluding manuscript scenes',async t=>{
 const f=await fixture(t);await f.write('Books/Lantern/Bad.md',f.note('scene','Elsewhere',9));
 let p=await f.plan();assert.match(p.errors.join('\n'),/Bad.md:3: Unmatched scene parent/);assert.doesNotMatch(p.warnings.join('\n'),/Excluded scene/);
 await f.write('Books/Lantern/Bad.md','---\ntype: scene\norder: 9\n---\nWords.');p=await f.plan();assert.match(p.errors.join('\n'),/Missing scene parent/);
 await f.write('Books/Lantern/Other/First.md',f.note('part','Books/Lantern',10,''));await f.write('Books/Lantern/Bad.md',f.note('scene','First',9));p=await f.plan();assert.match(p.errors.join('\n'),/Ambiguous scene parent/);
});
test('duplicate/missing or mixed book-child order keys identify the exact root ordering problem',async t=>{
 const f=await fixture(t);await f.write('Books/Lantern/Before.md',f.note('scene','Books/Lantern',2));let p=await f.plan();assert.match(p.errors.join('\n'),/duplicate order 2/);assert.match(p.errors.join('\n'),/Before.md:4/);
 await f.write('Books/Lantern/Before.md','---\ntype: scene\nparent: "[[Books/Lantern]]"\n---\nWords.');p=await f.plan();assert.match(p.errors.join('\n'),/Before.md:1 has no order/);
 await f.write('Books/Lantern/Before.md',f.note('scene','Books/Lantern','"first"'));p=await f.plan();assert.match(p.errors.join('\n'),/mixed order value types/);
});
test('equivalent structured keys and a lone complex order cannot silently establish manuscript order',async t=>{
 const f=await fixture(t);await f.write('Books/Lantern/Before.md',f.note('scene','Books/Lantern','"1.01"'));await f.write('Books/Lantern/First.md',f.note('part','Books/Lantern','"1.1"',''));
 const discovery=m.discover(await m.scan(f.folder),f.folder);discovery.items=discovery.items.filter(item=>['Before.md','First.md','Lantern.md'].includes(path.basename(item.file)));
 let p=m.plan(discovery,'order');assert.match(p.errors.join('\n'),/equivalent order values 1\.1 and 1\.01 do not establish order/);
 discovery.items=discovery.items.filter(item=>path.basename(item.file)!=='First.md');discovery.items.find(item=>path.basename(item.file)==='Before.md').data.order={position:1};p=m.plan(discovery,'order');assert.match(p.errors.join('\n'),/Before.md:4 has invalid order/);
});
test('legacy manifests keep their order; mixed sequences reject omissions and duplicate references',async t=>{
 const f=await fixture(t),p=await f.plan();const manifest=await m.writeProject(await m.resolveAssets(p,f.root),path.join(f.root,'project'));
 const altered=structuredClone(manifest);altered.sequence.splice(0,1);assert.throws(()=>m.orderedScenes(altered),/inconsistent/);
 altered.sequence=manifest.sequence.concat(manifest.sequence[0]);assert.throws(()=>m.orderedScenes(altered),/inconsistent/);
 const legacy={schema:'story-teller-project',version:1,parts:[{id:'p',scenes:['s']}],scenes:[{id:'s',partId:'p',file:'scenes/a.md'}]};assert.deepEqual(m.orderedScenes(legacy),legacy.scenes);
});
async function png(f,filename) {const file=path.join(f.root,filename);await fs.mkdir(path.dirname(file),{recursive:true});await fs.copyFile(path.join(__dirname,'../samples/assets/harbour-portrait.png'),file);return file;}
test('bare wiki PNG in a callout resolves uniquely under the explicitly selected vault root, preserving alias and source',async t=>{
 const f=await fixture(t),image=await png(f,'Media/Shared graph.png');
 const source=f.note('scene','Books/Lantern/First',1000,'> [!Note]\n> ![[Shared graph.png|A fictional chart.]]\n');await f.write('Books/Lantern/First/Child.md',source);
 const narrow=await m.resolveAssets(await f.plan(),f.folder);assert.equal(narrow.unresolved.length,1);assert.match(narrow.unresolved[0],/Child.md:7: Shared graph.png: Not found/);
 const prepared=await m.resolveAssets(await f.plan(),f.root);assert.deepEqual(prepared.unresolved,[]);assert.equal(prepared.assets[0].source,image);
 const dest=path.join(f.root,'project'),manifest=await m.writeProject(prepared,dest),scene=manifest.scenes.find(s=>s.title==='Child'&&s.partId===manifest.parts[0].id);
 const content=await fs.readFile(path.join(dest,scene.file),'utf8');assert.match(content,/> !\[A fictional chart\.\]\(\.\.\/assets\/shared-graph/);
 assert.equal(await fs.readFile(path.join(f.folder,'First/Child.md'),'utf8'),source);assert.deepEqual(await fs.readFile(path.join(dest,'assets',prepared.assets[0].name)),await fs.readFile(image));
 const web=await prepareWeb(dest);assert.equal(web.assets.size,1);assert.ok(web.scenes.find(s=>s.id===scene.id).data.sceneTitleInBody);
});
test('relative, root-relative, encoded Unicode paths and image dimensions use supported deterministic resolution',async t=>{
 const f=await fixture(t);await png(f,'Media/空 間.png');await png(f,'Books/Lantern/First/local.png');
 const body=['![[../../../Media/空 間.png|300x200]]','![[Media/空 間.png|300]]','![[空 間.png]]','![Local](./local.png)','![Encoded](../../../Media/%E7%A9%BA%20%E9%96%93.png)'].join('\n');await f.write('Books/Lantern/First/Child.md',f.note('scene','Books/Lantern/First',1000,body));
 const p=await m.resolveAssets(await f.plan(),f.root);assert.deepEqual(p.unresolved,[]);assert.equal(p.assets.length,2);assert.equal(p.scenes[1].references[0].alt,'空 間');
});
test('ambiguous, missing, corrupt PNG and escape paths block; unsupported SVG/Markdown embeds are non-blocking warnings',async t=>{
 const f=await fixture(t);await png(f,'Media/graph.png');await png(f,'Other/graph.png');await f.write('Media/corrupt.png','not PNG');
 await fs.symlink(path.join(__dirname,'../samples/assets/harbour-portrait.png'),path.join(f.folder,'escape.png'));await fs.symlink(path.join(__dirname,'../samples/assets'),path.join(f.root,'linked'),'dir');
 await f.write('Books/Lantern/First/Child.md',f.note('scene','Books/Lantern/First',1000,'![[graph.png]]\n![[missing.png]]\n![[Media/corrupt.png]]\n![Escape](../../../../../outside.png)\n![[../escape.png]]\n![[linked/harbour-portrait.png]]\n![[Drawing.svg]]\n![[Companion.md]]'));
 const p=await m.resolveAssets(await f.plan(),f.root);assert.ok(p.unresolved.some(x=>x.includes('Ambiguous target; candidates: Media/graph.png, Other/graph.png')));assert.ok(p.unresolved.some(x=>x.includes('unreadable PNG')));assert.ok(p.unresolved.some(x=>x.includes('../escape.png')&&x.includes('Path escapes')));assert.ok(p.unresolved.some(x=>x.includes('linked/harbour-portrait.png')&&x.includes('Path escapes')));
 assert.match(p.warnings.join('\n'),/unsupported media format \.svg/);assert.match(p.warnings.join('\n'),/Markdown embed \(no transclusion\)/);await assert.rejects(m.writeProject(p,path.join(f.root,'blocked')),/Resolve order errors/);
});
test('explicit local paths disambiguate a bare filename; conflicting implicit relative/root paths never choose the first',async t=>{
 const f=await fixture(t);await png(f,'graph.png');await png(f,'Books/Lantern/First/graph.png');
 await f.write('Books/Lantern/First/Child.md',f.note('scene','Books/Lantern/First',1000,'![[graph.png]]\n![Implicit](graph.png)\n![[./graph.png]]'));
 const p=await m.resolveAssets(await f.plan(),f.root);assert.equal(p.unresolved.length,2);assert.equal(p.scenes[1].references.length,1);
});
function review(prepared) {
 let html;const d={dispose(){}};const vscode={ViewColumn:{Active:1},window:{createWebviewPanel:()=>{let end;return{webview:{set html(value){html=value;},onDidReceiveMessage(fn){queueMicrotask(()=>fn('cancel'));return d;}},onDidDispose(fn){end=fn;},dispose(){end();}};}}};
 return showImportReview(vscode,prepared).then(()=>html);
}
test('Continue footer lists all actual blocking reasons; warnings alone do not block and correction enables continuation',async t=>{
 const f=await fixture(t);await f.write('Books/Lantern/First/Child.md',f.note('scene','Books/Lantern/First',1000,'![[missing.png]]\n![[Drawing.svg]]\n![[Note.md]]'));
 let p=await m.resolveAssets(await f.plan(),f.root),html=await review(p);
 assert.match(html,/<button id="continue" aria-describedby="import-blockers" disabled>/);assert.match(html,/<strong>Continue is disabled:<\/strong>/);assert.ok(html.slice(html.indexOf('<footer>')).includes('missing.png'));assert.ok(html.includes(f.root));assert.match(html,/Warnings \(non-blocking\)/);
 await png(f,'Media/missing.png');p=await m.resolveAssets(await f.plan(),f.root);assert.equal(p.unresolved.length,0);html=await review(p);assert.doesNotMatch(html,/<button id="continue"[^>]*disabled/);assert.match(html,/Ready to continue: no blocking errors/);assert.equal(p.warnings.filter(w=>w.includes('unsupported')).length,2);
});
