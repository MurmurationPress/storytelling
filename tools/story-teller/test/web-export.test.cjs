'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs/promises');const path=require('node:path');const os=require('node:os');
const {prepareWeb,exportWeb,localFile,publicationBody}=require('../src/web-export.cjs');
const {dirtyPublication,registerWebExport}=require('../src/web-export-command.cjs');
async function fixture(t){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'story-export-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));const root=path.join(dir,'project');await fs.cp(path.join(__dirname,'../samples/web-project'),root,{recursive:true});return {root,dir,destination:path.join(dir,'output')};}
test('publication follows manifest identity/order and excludes author metadata and unrelated files',async t=>{
 const {root}=await fixture(t);await fs.writeFile(path.join(root,'private-recording.webm'),'PRIVATE');
 const manifestFile=path.join(root,'story-teller.project.json'),manifest=JSON.parse(await fs.readFile(manifestFile));manifest.scenes.reverse();await fs.writeFile(manifestFile,JSON.stringify(manifest));
 const prepared=await prepareWeb(root);assert.deepEqual(prepared.book.scenes.map(s=>s.id),['scene','other','last']);assert.deepEqual(prepared.book.parts.map(p=>p.scenes),[['scene','other'],['last']]);
 const serial=JSON.stringify(prepared.book)+JSON.stringify(prepared.scenes);assert.ok(!serial.includes(root));assert.ok(!serial.includes('PRIVATE'));assert.equal(prepared.assets.size,2);assert.equal(prepared.book.notes['JANUS early.md'].id,'JANUS early.md');assert.notEqual(prepared.book.targets['JANUS early'].id,prepared.book.targets['JANUS later'].id);
 assert.match(prepared.warnings.join('\n'),/Missing note/);assert.match(prepared.scenes[1].data.media['../assets/missing.png'].error,/missing/);
});
test('portable export includes local runtime/licences and exact animated bytes, not source files',async t=>{
 const {root,destination}=await fixture(t);const before=await fs.readFile(path.join(root,'scenes/Two accounts.md'));
 await exportWeb(root,destination);const names=await fs.readdir(destination);assert.deepEqual(names.sort(),['assets','content','index.html','licences','publication.json','reader.css','reader.js','web.css']);
 const book=JSON.parse(await fs.readFile(path.join(destination,'publication.json'),'utf8'));const data=JSON.parse(await fs.readFile(path.join(destination,book.scenes[0].file),'utf8'));
 const source=await fs.readFile(path.join(root,'assets/harbour-lamp.webp'));assert.ok(source.includes(Buffer.from('ANIM')));assert.deepEqual(await fs.readFile(path.join(destination,data.media['../assets/harbour-lamp.webp'].url)),source);
 assert.deepEqual(await fs.readFile(path.join(root,'scenes/Two accounts.md')),before);assert.ok(!(await fs.readFile(path.join(destination,'reader.js'),'utf8')).includes('acquireVsCodeApi'));
 await assert.rejects(exportWeb(root,destination),/already exists/);assert.equal((await fs.readdir(path.join(destination,'licences'))).length,7);assert.ok((await fs.readdir(path.join(destination,'licences'))).includes('punycode.js.txt'));
});
test('frontmatter is resolved at export but omitted from publication body without altering wording',()=>{assert.equal(publicationBody('---\nsecret: /private/source\n---\n\nWords.\n'),'\nWords.\n');assert.throws(()=>publicationBody('---\nsecret: value'),/Close/);});
test('scene traversal, absolute paths and symlink escapes are rejected',async t=>{
 const {root,dir}=await fixture(t);await fs.writeFile(path.join(dir,'outside.md'),'Outside.');await assert.rejects(localFile(root,'../outside.md'),/Invalid/);await assert.rejects(localFile(root,path.join(dir,'outside.md')),/Invalid/);await fs.symlink(path.join(dir,'outside.md'),path.join(root,'scenes/escape.md'));await assert.rejects(localFile(root,'scenes/escape.md'),/escapes/);
});
test('image and supporting symlink escapes abort rather than copying private content',async t=>{
 const {root,dir}=await fixture(t);await fs.copyFile(path.join(root,'assets/harbour-lamp.webp'),path.join(dir,'outside.webp'));await fs.symlink(path.join(dir,'outside.webp'),path.join(root,'assets/escape.webp'));await fs.appendFile(path.join(root,'scenes/Next.md'),'\n![escape](../assets/escape.webp)\n');await assert.rejects(prepareWeb(root),/escapes/);
 await fs.writeFile(path.join(root,'scenes/Next.md'),'Safe prose.');await fs.writeFile(path.join(dir,'private.md'),'PRIVATE');await fs.symlink(path.join(dir,'private.md'),path.join(root,'Supporting Content/private.md'));await assert.rejects(prepareWeb(root),/outside/);
});
test('ambiguity is diagnostic and unsafe note HTML/URLs remain inert',async t=>{
 const {root}=await fixture(t);await fs.mkdir(path.join(root,'Supporting Content/other'));await fs.copyFile(path.join(root,'Supporting Content/Ted.md'),path.join(root,'Supporting Content/other/Ted.md'));await fs.appendFile(path.join(root,'Supporting Content/JANUS early.md'),'\n<script>alert(1)</script> [go](https://invalid.example)');
 const p=await prepareWeb(root);assert.match(p.book.targets.Ted.error,/Ambiguous/);assert.ok(!p.book.notes['JANUS early.md'].html.includes('<script>'));assert.ok(!p.book.notes['JANUS early.md'].html.includes('href='));
});
test('failed/cancelled/stale export leaves no complete project and no source changes',async t=>{
 const {root,dir,destination}=await fixture(t);await assert.rejects(exportWeb(root,destination,{beforeWrite(){throw Error('Cancelled');}}),/Cancelled/);await assert.rejects(fs.stat(destination));
 await assert.rejects(exportWeb(root,destination,{beforeWrite:async()=>fs.appendFile(path.join(root,'scenes/Next.md'),'\nChanged.')}),/changed/);assert.ok(!(await fs.readdir(dir)).some(name=>name.startsWith('.story-teller-web-')));await assert.rejects(fs.stat(destination));
 await assert.rejects(exportWeb(root,path.join(root,'export')),/outside/);
});
test('duplicate stable identities and unsafe sequence paths cannot become an export',async t=>{
 const {root}=await fixture(t),file=path.join(root,'story-teller.project.json');const m=JSON.parse(await fs.readFile(file));m.parts[1].id=m.parts[0].id;await fs.writeFile(file,JSON.stringify(m));await assert.rejects(prepareWeb(root));
});
test('command reports dirty project documents and cancellation never writes',async t=>{
 const {root,dir}=await fixture(t);const commands=new Map(),errors=[];let picked=0;
 const doc={uri:{scheme:'file',fsPath:path.join(root,'scenes/Next.md')},isDirty:true};
 const vscode={commands:{registerCommand:(name,fn)=>{commands.set(name,fn);return{dispose(){}};}},workspace:{workspaceFolders:[{uri:{fsPath:root}}],textDocuments:[doc]},window:{showErrorMessage:msg=>errors.push(msg),showInformationMessage:async()=>undefined,showSaveDialog:async()=>{picked++;return undefined;}}};
 registerWebExport(vscode,{subscriptions:[]});assert.equal(dirtyPublication(vscode,root).length,1);await commands.get('storyTeller.exportWeb')();assert.match(errors[0],/Save or revert/);assert.equal(picked,0);doc.isDirty=false;vscode.Uri={file:fsPath=>({scheme:'file',fsPath})};await commands.get('storyTeller.exportWeb')();assert.equal(picked,1);assert.deepEqual(await fs.readdir(dir),['project']);
});
test('export command confirms saved publication and refuses buffers changed during confirmation',async t=>{
 const {root,destination}=await fixture(t),commands=new Map(),messages=[],errors=[];
 const doc={uri:{scheme:'file',fsPath:path.join(root,'scenes/Next.md')},isDirty:false};let dirtyOnConfirm=true;
 const vscode={Uri:{file:fsPath=>({scheme:'file',fsPath})},commands:{registerCommand:(name,fn)=>{commands.set(name,fn);return{dispose(){}};}},workspace:{workspaceFolders:[{name:'Synthetic',uri:{fsPath:root}}],textDocuments:[doc]},window:{showErrorMessage:msg=>errors.push(msg),showSaveDialog:async()=>({scheme:'file',fsPath:destination}),showInformationMessage:async(text)=>{messages.push(text);if(text.startsWith('Export saved')){doc.isDirty=dirtyOnConfirm;return 'Export';}}}};
 registerWebExport(vscode,{subscriptions:[]});await commands.get('storyTeller.exportWeb')();assert.match(errors[0],/Save or revert/);await assert.rejects(fs.stat(destination));doc.isDirty=false;dirtyOnConfirm=false;
 await commands.get('storyTeller.exportWeb')();assert.ok(messages.some(text=>text.startsWith('Exported 3 scenes')));assert.ok((await fs.stat(path.join(destination,'index.html'))).isFile());assert.equal(doc.isDirty,false);
});
test('source snapshot rejects a late escaping symlink and destination reservation is non-destructive',async t=>{
 const {root,dir,destination}=await fixture(t);const file=path.join(root,'scenes/Next.md');await fs.writeFile(path.join(dir,'outside.md'),'PRIVATE');let count=0;
 await assert.rejects(exportWeb(root,destination,{beforeWrite:async()=>{if(++count===2){await fs.unlink(file);await fs.symlink(path.join(dir,'outside.md'),file);}}}),/changed/);await assert.rejects(fs.stat(destination));
});
test('scene override is resolved before stripping private author frontmatter',async t=>{
 const {root}=await fixture(t),file=path.join(root,'scenes/Two accounts.md'),body=await fs.readFile(file,'utf8');
 await fs.writeFile(file,`---\nstory_teller_prose_pacing: off\nprivate_source: ${root}\n---\n${body}`);
 const prepared=await prepareWeb(root),scene=prepared.scenes[0].data;assert.equal(scene.prosePacing,false);assert.equal(scene.pacingSource,'scene');assert.equal(scene.source,body);assert.ok(!JSON.stringify(prepared.book).includes(root));assert.ok(!scene.source.includes('private_source'));
});
test('repeated resource reads cannot silently replace an earlier snapshot',async t=>{
 const {root}=await fixture(t),asset=path.join(root,'assets/harbour-portrait.png');
 const originalRead=fs.readFile.bind(fs);let reads=0;
 t.mock.method(fs,'readFile',async(file,...args)=>{
   const bytes=await originalRead(file,...args);
   if(file===asset&&++reads>=3){const changed=Buffer.from(bytes);changed[changed.length-1]^=1;return changed;}
   return bytes;
 });
 await assert.rejects(prepareWeb(root),/source changed/i);
});
