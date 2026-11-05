'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {slug,allocator,hash}=require('../src/readable-paths.cjs');
const m=require('../src/manuscript-import.cjs');
const r=require('../src/readable-project.cjs');
const {planReimport}=require('../src/reimport-project.cjs');
async function fixture(t) {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'readable-test-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const source=path.join(root,'Book');await fs.mkdir(source);
  const note=(title,order,body)=>`---\ntype: scene\ntitle: ${title}\nparent: "[[Book]]"\norder: ${order}\nunknown: retained\n---\n${body}\n`;
  await fs.writeFile(source+'.md','---\ntype: book\ntitle: Example\n---\n');
  const write=(file,title,order,body)=>fs.writeFile(path.join(source,file),note(title,order,body));
  await write('A.md','Opening',1,'First.');await write('B.md','Opening',2,'Second.');
  const prepared=await m.resolveAssets(m.plan(m.discover(await m.scan(source),source),'order'),source);
  const project=path.join(root,'Project'),manifest=await m.writeProject(prepared,project);
  return {root,source,write,project,manifest};
}
test('portable slugs include Unicode, reserved names, punctuation and bounded UTF-8 length',()=>{
  for(const name of ['CON','nul','COM1','LPT9','con.'])assert.match(slug(name),/^story-/);
  assert.equal(slug('... /:*? " <> |'),'untitled');assert.equal(slug('Café — 東京'),'café-東京');
  assert.ok(Buffer.byteLength(slug('界'.repeat(200)))<=100);
  const allocate=allocator(['scenes/OPENING.md']);
  assert.match(allocate('scenes','Opening','.md','a'),/^scenes\/opening-[a-f0-9]{8}\.md$/);
  assert.notEqual(allocate('scenes','Opening','.md','b'),allocate('scenes','Opening','.md','b'));
});
test('new import has readable paths, independent IDs/order and an unchanged reimport writes nothing',async t=>{
  const f=await fixture(t);
  assert.equal(f.manifest.version,2);assert.equal(f.manifest.scenes[0].file,'scenes/opening.md');
  assert.match(f.manifest.scenes[1].file,/opening-[a-f0-9]{8}\.md$/);
  const before=await r.inventory(f.project),plan=await planReimport(f.project,f.source);
  assert.deepEqual(plan.blockers,[]);assert.equal(plan.noop,true);assert.equal(plan.changes.length,0);
  await r.materialize(plan,path.join(f.root,'unused'));assert.deepEqual(await r.inventory(f.project),before);
  await assert.rejects(fs.access(path.join(f.root,'unused')),/ENOENT/);
});
test('source-only edits retain IDs/paths and adaptation-only edits survive',async t=>{
  const f=await fixture(t),first=f.manifest.scenes[0],second=f.manifest.scenes[1];
  await fs.appendFile(path.join(f.project,second.file),'Author addition.\n');
  await f.write('A.md','Renamed title',1,'Updated source.');
  const p=await planReimport(f.project,f.source);assert.deepEqual(p.blockers,[]);
  const destination=path.join(f.root,'updated');await r.materialize(p,destination);
  const manifest=await r.readManifest(destination);assert.equal(manifest.scenes[0].id,first.id);assert.equal(manifest.scenes[0].file,first.file);
  assert.match(await fs.readFile(path.join(destination,first.file),'utf8'),/Updated source/);
  assert.match(await fs.readFile(path.join(destination,second.file),'utf8'),/Author addition/);
  assert.equal((await planReimport(destination,f.source)).noop,true);
});
test('edits on both sides block, source deletions retain scenes and unchanged source moves preserve identity',async t=>{
  const f=await fixture(t),first=f.manifest.scenes[0];
  await fs.appendFile(path.join(f.project,first.file),'Author edit.');await f.write('A.md','Opening',1,'Source edit.');
  assert.match((await planReimport(f.project,f.source)).blockers.join('\n'),/Both source and adaptation/);
  await fs.writeFile(path.join(f.source,'A.md'),`---\ntype: scene\ntitle: Opening\nparent: "[[Book]]"\norder: 1\nunknown: retained\n---\nFirst.\n`);
  await fs.rename(path.join(f.source,'A.md'),path.join(f.source,'Moved.md'));
  const moved=await planReimport(f.project,f.source);assert.deepEqual(moved.blockers,[]);assert.equal(moved.manifest.scenes[0].id,first.id);
  await fs.unlink(path.join(f.source,'B.md'));
  const deleted=await planReimport(f.project,f.source);assert.deepEqual(deleted.blockers,[]);assert.equal(deleted.manifest.scenes.length,2);assert.match(deleted.warnings.join('\n'),/retained/);
});
test('reordering preserves paths and the HTTP publication identity',async t=>{
  const f=await fixture(t);await f.write('A.md','Opening',2,'First.');await f.write('B.md','Opening',1,'Second.');
  const p=await planReimport(f.project,f.source);assert.deepEqual(p.blockers,[]);
  const destination=path.join(f.root,'reordered');await r.materialize(p,destination);
  const next=await r.readManifest(destination);
  assert.equal(next.scenes[0].id,f.manifest.scenes[1].id);assert.equal(next.scenes[0].file,f.manifest.scenes[1].file);
  assert.equal(next.publicationId,f.manifest.publicationId);
});
async function legacy(t) {
  const f=await fixture(t),manifest=structuredClone(f.manifest);manifest.version=1;delete manifest.importState;delete manifest.publicationId;
  await fs.unlink(path.join(f.project,'metadata/import-state.json'));
  for(const scene of manifest.scenes){const old=scene.file;scene.file=`scenes/${scene.id}.md`;await fs.rename(path.join(f.project,old),path.join(f.project,scene.file));}
  await fs.writeFile(path.join(f.project,r.MANIFEST),r.json(manifest));
  await fs.writeFile(path.join(f.project,'unknown.txt'),'User file retained.');
  manifest.unknown={nested:['keep',42]};await fs.writeFile(path.join(f.project,r.MANIFEST),r.json(manifest));
  return {...f,manifest};
}
test('migration preserves all bytes except reviewed references/manifest, unknown metadata and reader identity',async t=>{
  const f=await legacy(t),before=await r.inventory(f.project),p=await r.planMigration(f.project);assert.deepEqual(p.blockers,[]);
  const destination=path.join(f.root,'migrated');await r.materialize(p,destination);
  assert.deepEqual(await r.inventory(f.project),before);
  const next=await r.readManifest(destination);assert.deepEqual(next.unknown,f.manifest.unknown);
  assert.equal(await fs.readFile(path.join(destination,'unknown.txt'),'utf8'),'User file retained.');
  assert.equal(next.scenes[0].id,f.manifest.scenes[0].id);assert.equal((await r.planMigration(destination)).noop,true);
  const report=JSON.parse(await fs.readFile(path.join(destination,r.REPORT)));assert.equal(report.status,'validated');assert.ok(report.mapping[f.manifest.scenes[0].file]);
  const baseline=await planReimport(destination,f.source);assert.deepEqual(baseline.blockers,[]);assert.equal(baseline.kind,'reimport-baseline');
  const adopted=path.join(f.root,'baseline');await r.materialize(baseline,adopted);assert.equal((await planReimport(adopted,f.source)).noop,true);
});
test('cancel/dry-run has no writes; stale inputs, existing destination and failed validation retain originals and allow retry',async t=>{
  const f=await legacy(t),before=await r.inventory(f.project),p=await r.planMigration(f.project),destination=path.join(f.root,'migrated');
  r.reportFor(p);assert.deepEqual(await r.inventory(f.project),before);
  await assert.rejects(r.materialize(p,destination,{beforeValidate:target=>fs.writeFile(path.join(target,p.mapping[f.manifest.scenes[0].file]),'Corrupt')}),/Preservation validation failed.*\nOriginal project is unchanged/);
  assert.deepEqual(await r.inventory(f.project),before);await assert.rejects(fs.access(destination),/ENOENT/);
  assert.ok((await fs.readdir(f.root)).some(n=>n.startsWith('.story-teller-readable-')));
  await r.materialize(await r.planMigration(f.project),destination);
  await assert.rejects(r.materialize(p,destination),/already exists/);
  const stale=await r.planMigration(f.project);await fs.appendFile(path.join(f.project,'unknown.txt'),'Change');
  await assert.rejects(r.materialize(stale,path.join(f.root,'stale')),/changed after review/);
});
test('migration updates explicit nested media references, cover metadata, and blocks unknown reference syntax',async t=>{
  const f=await legacy(t),asset=`assets/forum-${'a'.repeat(64)}.png`;await fs.writeFile(path.join(f.project,asset),Buffer.from([137,80,78,71,13,10,26,10,1]));
  await fs.appendFile(path.join(f.project,f.manifest.scenes[0].file),`\n\n![Forum](../${asset})\n`);
  await fs.appendFile(path.join(f.project,'metadata/book.md'),`\ncover_image: "[[${path.basename(asset)}]]"\n`);
  const p=await r.planMigration(f.project);assert.deepEqual(p.blockers,[]);assert.equal(p.mapping[asset],'assets/forum.png');
  await r.materialize(p,path.join(f.root,'media'));
  await fs.writeFile(path.join(f.project,'unknown.json'),r.json({customPath:asset}));
  const blocked=await r.planMigration(f.project);assert.match(blocked.blockers.join('\n'),/unrecognised reference/);
  await assert.rejects(r.materialize(blocked,path.join(f.root,'blocked')),/blocking issues/);
});
test('missing scenes, escaping symlinks and case-insensitive collisions refuse migration',async t=>{
  const f=await legacy(t);await fs.writeFile(path.join(f.project,'UNKNOWN.txt'),'collision');
  await assert.rejects(r.planMigration(f.project),/collision/);await fs.unlink(path.join(f.project,'UNKNOWN.txt'));
  await fs.symlink(f.source,path.join(f.project,'escape'));await assert.rejects(r.planMigration(f.project),/Unsupported filesystem entry/);await fs.unlink(path.join(f.project,'escape'));
  await fs.unlink(path.join(f.project,f.manifest.scenes[0].file));await assert.rejects(r.planMigration(f.project),/Missing project file/);
});
test('scene moves preserve identity, update relative media and import ledger; external moves can be repaired',async t=>{
  const f=await fixture(t),{planSceneMove,scenePath}=require('../src/scene-files.cjs'),scene=f.manifest.scenes[0];
  assert.throws(()=>scenePath('scenes/CON.md'),/portable/);assert.throws(()=>scenePath('../escape.md'),/relative/);
  const move=await planSceneMove(f.project,scene.id,'scenes/another-folder/opening.md');
  // Apply the planned transaction in a disposable filesystem for semantic checks;
  // real WorkspaceEdit behavior is verified separately in the installed editor.
  await fs.mkdir(path.join(f.project,'scenes/another-folder'));
  await fs.rename(path.join(f.project,scene.file),path.join(f.project,move.name));
  for(const change of move.changes)await fs.writeFile(path.join(f.project,move.mapping[change.file]||change.file),change.content);
  const next=await r.readManifest(f.project);assert.equal(next.scenes[0].id,scene.id);assert.equal(next.scenes[0].file,move.name);
  assert.equal((await planReimport(f.project,f.source)).noop,true);
  await fs.rename(path.join(f.project,move.name),path.join(f.project,'scenes/externally-moved.md'));
  const repair=await planSceneMove(f.project,scene.id,'scenes/externally-moved.md',{repair:true});
  assert.equal(repair.repair,true);assert.ok(repair.changes.some(c=>c.file===r.MANIFEST));
});
test('reader restore accepts stable identity and legacy UUID aliases but not a shared readable basename',()=>{
  const {sameDocument}=require('../src/reader-position.cjs'),id='12345678-1234-1234-1234-123456789012';
  assert.equal(sameDocument({sourceIdentity:'book:scene'},{uri:'file:new',sourceIdentity:'book:scene'}),true);
  assert.equal(sameDocument({sourceUri:`file:///original/scenes/${id}.md`},{uri:'file:new',legacySceneId:id}),true);
  assert.equal(sameDocument({sourceUri:'file:///other/scenes/opening.md'},{uri:'file:///new/scenes/opening.md',legacySceneId:'opening'}),false);
});
test('literal examples are never silently rewritten and stale manuscript review is refused',async t=>{
  assert.throws(()=>r.rewriteReferences('```md\n![example](../assets/old.png)\n```','scenes/a.md','scenes/b.md',{'assets/old.png':'assets/new.png'}),/unrecognised reference/);
  const f=await fixture(t);await f.write('A.md','Opening',1,'Source revision');
  const p=await planReimport(f.project,f.source);await f.write('A.md','Opening',1,'Another source revision');
  await assert.rejects(r.materialize(p,path.join(f.root,'stale-source')),/Manuscript or asset changed/);
});
test('formatted component imports collect real nested images while preserving literal examples and configuration',async t=>{
  const f=await fixture(t),bytes=Buffer.from([137,80,78,71,13,10,26,10,1]);
  await fs.writeFile(path.join(f.source,'Forum screen.png'),bytes);
  const body='````typeout\n@format annotation\n@sound keyboard\n@speed 31\n@title Authored output\n\n![Forum](Forum%20screen.png)\n\n```md\n![Literal](do-not-import.png)\n```\n````\n\n```chat\n@viewer Ada\n\nAda: Exact dialogue.\n@subtext\n  | Exact subtext.\n```';
  await f.write('A.md','Opening',1,body);
  const prepared=await m.resolveAssets(m.plan(m.discover(await m.scan(f.source),f.source),'order'),f.source);
  assert.equal(prepared.assets.length,1);assert.deepEqual(prepared.unresolved,[]);
  const output=path.join(f.root,'formatted');const manifest=await m.writeProject(prepared,output),content=await fs.readFile(path.join(output,manifest.scenes[0].file),'utf8');
  assert.match(content,/!\[Forum\]\(\.\.\/assets\/forum-screen.png\)/);assert.match(content,/!\[Literal\]\(do-not-import.png\)/);assert.ok(content.includes('@sound keyboard\n@speed 31\n@title Authored output'));assert.ok(content.includes('Ada: Exact dialogue.\n@subtext\n  | Exact subtext.'));
});
test('asset source changes retain readable allocations and author changes to both versions block',async t=>{
  const f=await fixture(t),asset=path.join(f.source,'Picture.png'),bytes=Buffer.from([137,80,78,71,13,10,26,10,1]);
  await fs.writeFile(asset,bytes);await f.write('A.md','Opening',1,'![Image](Picture.png)');
  const p=await planReimport(f.project,f.source),first=path.join(f.root,'with-asset');assert.deepEqual(p.blockers,[]);await r.materialize(p,first);
  await fs.writeFile(asset,Buffer.concat([bytes,Buffer.from([2])]));
  const changed=await planReimport(first,f.source);assert.deepEqual(changed.blockers,[]);assert.ok(changed.changes.some(c=>c.file==='assets/picture.png'));
  await fs.writeFile(path.join(first,'assets/picture.png'),Buffer.concat([bytes,Buffer.from([3])]));
  assert.match((await planReimport(first,f.source)).blockers.join('\n'),/Both source and adaptation changed asset/);
});
test('an unchanged source asset moved to a new name reuses its existing file instead of duplicating bytes',async t=>{
  const f=await fixture(t);await fs.writeFile(path.join(f.source,'Picture.png'),Buffer.from([137,80,78,71,13,10,26,10,1]));await f.write('A.md','Opening',1,'![Image](Picture.png)');
  const first=path.join(f.root,'asset-project');await r.materialize(await planReimport(f.project,f.source),first);
  await fs.rename(path.join(f.source,'Picture.png'),path.join(f.source,'Renamed.png'));await f.write('A.md','Opening',1,'![Image](Renamed.png)');
  const moved=await planReimport(first,f.source);assert.deepEqual(moved.blockers,[]);assert.equal(moved.changes.some(c=>c.file.startsWith('assets/')),false);
  const next=path.join(f.root,'moved-asset');await r.materialize(moved,next);assert.deepEqual(await fs.readdir(path.join(next,'assets')),['picture.png']);assert.equal((await planReimport(next,f.source)).noop,true);
});
test('legacy baseline refuses changed historical source and source relocation does not change import identities',async t=>{
  const f=await legacy(t),migrated=path.join(f.root,'migrated');await r.materialize(await r.planMigration(f.project),migrated);
  await f.write('A.md','Opening',1,'New historical source revision');
  assert.match((await planReimport(migrated,f.source)).blockers.join('\n'),/original source match/);
  const g=await fixture(t),relocated=path.join(g.root,'relocated');await fs.mkdir(relocated);await fs.cp(g.source,path.join(relocated,'Book'),{recursive:true});await fs.copyFile(g.source+'.md',path.join(relocated,'Book.md'));
  assert.equal((await planReimport(g.project,path.join(relocated,'Book'))).noop,true);
});
test('new import collects the declared book cover, preserves metadata and reimports unchanged',async t=>{
  const f=await fixture(t);await fs.writeFile(path.join(f.source,'Cover.png'),Buffer.from([137,80,78,71,13,10,26,10,1]));
  await fs.writeFile(f.source+'.md','---\ntype: book\ntitle: Example\ncover_image: "[[Cover.png]]"\ncustom: retained\n---\n');
  const prepared=await m.resolveAssets(m.plan(m.discover(await m.scan(f.source),f.source),'order'),f.root);assert.deepEqual(prepared.unresolved,[]);
  const output=path.join(f.root,'covered');await m.writeProject(prepared,output);
  assert.match(await fs.readFile(path.join(output,'Front Matter.md'),'utf8'),/assets\/cover.png/);
  assert.ok((await fs.readFile(path.join(output,'metadata/book.md'),'utf8')).includes('custom: retained'));
  assert.equal((await planReimport(output,f.source,f.root)).noop,true);
});
test('unknown manifest basename references and keyed references block rather than becoming dangling metadata',async t=>{
  const f=await legacy(t),m=await r.readManifest(f.project);m.custom={image:path.basename(m.scenes[0].file)};
  await fs.writeFile(path.join(f.project,r.MANIFEST),r.json(m));assert.match((await r.planMigration(f.project)).blockers.join('\n'),/Unknown metadata field image/);
  m.custom={[m.scenes[0].file]:{caption:'Keep me'}};await fs.writeFile(path.join(f.project,r.MANIFEST),r.json(m));assert.match((await r.planMigration(f.project)).blockers.join('\n'),/Unknown metadata key/);
});
test('unusual user filenames survive and ambiguous/unsafe numeric metadata is refused without rewriting',async t=>{
  const f=await legacy(t);await fs.writeFile(path.join(f.project,'__proto__'),'User content');
  const output=path.join(f.root,'preserved');await r.materialize(await r.planMigration(f.project),output);assert.equal(await fs.readFile(path.join(output,'__proto__'),'utf8'),'User content');
  const file=path.join(f.project,r.MANIFEST),raw=await fs.readFile(file,'utf8');await fs.writeFile(file,raw.replace('"version": 1','"version": 1, "huge": 9007199254740993'));
  await assert.rejects(r.planMigration(f.project),/Unsafe numeric metadata/);
  await fs.writeFile(file,raw.replace('"version": 1','"version": 1, "version": 1'));await assert.rejects(r.planMigration(f.project),/Ambiguous project JSON/);
});
test('reimport within a containing vault does not mistake copied adaptation images for ambiguous source assets',async t=>{
  const f=await fixture(t);await fs.writeFile(path.join(f.source,'cover.png'),Buffer.from([137,80,78,71,13,10,26,10,1]));await f.write('A.md','Opening',1,'![[cover.png]]');
  const prepared=await m.resolveAssets(m.plan(m.discover(await m.scan(f.source),f.source),'order'),f.root);assert.deepEqual(prepared.unresolved,[]);
  const output=path.join(f.root,'inside-vault');await m.writeProject(prepared,output);assert.equal((await planReimport(output,f.source,f.root)).noop,true);
});
