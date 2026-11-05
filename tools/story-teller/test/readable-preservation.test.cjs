'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const repo=path.resolve(__dirname,'../../..');
const r=require(path.join(repo,'tools/story-teller/src/readable-project.cjs'));
const {parseScene}=require(path.join(repo,'tools/story-teller/src/parser.cjs'));
const {prepareWeb}=require(path.join(repo,'tools/story-teller/src/web-export.cjs'));
const {planSceneMove}=require(path.join(repo,'tools/story-teller/src/scene-files.cjs'));
const {legacyWebFixture}=require(path.join(repo,'tools/story-teller/test/readable-fixture.cjs'));
async function legacy(t) {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'pr39-independent-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const original=path.join(root,'original'),manifest=await legacyWebFixture(original);
  const image=`assets/diagram-${'a'.repeat(64)}.png`;
  await fs.copyFile(path.join(original,'assets/harbour-portrait.png'),path.join(original,image));
  return {root,original,manifest,image};
}
test('migration preserves authored literal YAML cover_image text exactly',async t=>{
  const f=await legacy(t),scene=f.manifest.scenes[0];
  const source='```typeout\n@format yaml\n@sound none\n@speed 30\n\ncover_image: '+f.image+'\n```\n';
  await fs.writeFile(path.join(f.original,scene.file),source);
  const p=await r.planMigration(f.original);assert.deepEqual(p.blockers,[]);
  const dest=path.join(f.root,'migrated'),result=await r.materialize(p,dest);
  assert.equal(result.report.status,'validated');
  assert.equal(await fs.readFile(path.join(f.original,scene.file),'utf8'),source,'original kept');
  const after=await fs.readFile(path.join(dest,p.mapping[scene.file]),'utf8');
  const literal=s=>parseScene(s).beats[0].blocks.find(b=>b.type==='typeout').text;
  assert.equal(literal(after),literal(source),'validated migration must not rewrite performed literal text');
});
test('scene rename preserves supported Markdown image URL and title',async t=>{
  const f=await legacy(t),dest=path.join(f.root,'migrated');
  await r.materialize(await r.planMigration(f.original),dest);
  const m=await r.readManifest(dest),scene=m.scenes[0];
  const source='![Lamp](../assets/harbour-portrait.png "Authored caption")\n';
  await fs.writeFile(path.join(dest,scene.file),source);
  const oldReader=await prepareWeb(dest);assert.ok(oldReader.scenes.find(s=>s.id===scene.id).data.media['../assets/harbour-portrait.png'].url);
  const p=await planSceneMove(dest,scene.id,'scenes/renamed-scene.md');
  await fs.rename(path.join(dest,scene.file),path.join(dest,p.name));
  for(const c of p.changes)await fs.writeFile(path.join(dest,Object.hasOwn(p.mapping,c.file)?p.mapping[c.file]:c.file),c.content);
  const after=await fs.readFile(path.join(dest,p.name),'utf8'),nextReader=await prepareWeb(dest);
  assert.deepEqual(nextReader.warnings,oldReader.warnings,'a plain filename rename must not make an existing image unavailable');
  assert.equal(after,source,'same-directory rename requires no media URL/title change');
});
test('migration preserves non-UTF-8 user-created file bytes outside reviewed path edits',async t=>{
  const f=await legacy(t),file='author-notes.txt';
  const bytes=Buffer.concat([Buffer.from([0x63,0x61,0x66,0xe9]),Buffer.from(' [diagram]('+f.image+')\n')]);
  await fs.writeFile(path.join(f.original,file),bytes);
  const p=await r.planMigration(f.original),dest=path.join(f.root,'migrated');
  if(p.blockers.length) {
    assert.match(p.blockers.join('\n'),/UTF-8|encoding/);
    await assert.rejects(r.materialize(p,dest),/blocking issues/);
    assert.deepEqual(await fs.readFile(path.join(f.original,file)),bytes);
    await assert.rejects(fs.access(dest),/ENOENT/);return;
  }
  const result=await r.materialize(p,dest);assert.equal(result.report.status,'validated');
  const after=await fs.readFile(path.join(dest,file));
  assert.deepEqual(after.subarray(0,4),bytes.subarray(0,4),'path updates must not re-encode unrelated author bytes');
});
test('scene rename does not create case-colliding parent directories',async t=>{
  const f=await legacy(t),dest=path.join(f.root,'migrated');await r.materialize(await r.planMigration(f.original),dest);
  const m=await r.readManifest(dest),scene=m.scenes[0];
  await fs.mkdir(path.join(dest,'scenes/Part'));await fs.writeFile(path.join(dest,'scenes/Part/author-note.md'),'User content.');
  await r.inventory(dest);
  const before=await r.inventory(dest);let p;
  try {p=await planSceneMove(dest,scene.id,'scenes/part/renamed.md');}
  catch(error){assert.match(error.message,/case|collision/i);assert.deepEqual(await r.inventory(dest),before);return;}
  await fs.mkdir(path.join(dest,'scenes/part'));await fs.rename(path.join(dest,scene.file),path.join(dest,p.name));
  for(const c of p.changes)await fs.writeFile(path.join(dest,Object.hasOwn(p.mapping,c.file)?p.mapping[c.file]:c.file),c.content);
  await assert.doesNotReject(r.inventory(dest),'an accepted scene move must leave a portable project');
});
test('nested moves retain URI titles, spaces, escaped punctuation and encoded filename delimiters',async t=>{
  const f=await legacy(t),dest=path.join(f.root,'migrated');await r.materialize(await r.planMigration(f.original),dest);
  const m=await r.readManifest(dest),scene=m.scenes[0],name='A spaced (lamp) #1.png';
  await fs.copyFile(path.join(dest,'assets/harbour-portrait.png'),path.join(dest,'assets',name));
  const source=[
    '![Angle](<../assets/A spaced (lamp) %231.png> "Double title")',
    "![Single](../assets/A%20spaced%20%28lamp%29%20%231.png 'Single title')",
    '![Bracket](../assets/A%20spaced%20%28lamp%29%20%231.png (Parenthetical title))'
  ].join('\r\n')+'\r\n';
  await fs.writeFile(path.join(dest,scene.file),source);
  const before=await prepareWeb(dest),p=await planSceneMove(dest,scene.id,'scenes/nested/renamed.md');
  await fs.mkdir(path.join(dest,'scenes/nested'));await fs.rename(path.join(dest,scene.file),path.join(dest,p.name));
  for(const c of p.changes)await fs.writeFile(path.join(dest,Object.hasOwn(p.mapping,c.file)?p.mapping[c.file]:c.file),c.content);
  const after=await prepareWeb(dest),text=await fs.readFile(path.join(dest,p.name),'utf8');
  assert.deepEqual(after.warnings,before.warnings);
  const media=book=>[...new Set(Object.values(book.scenes.find(s=>s.id===scene.id).data.media).map(m=>m.url))].sort();
  assert.deepEqual(media(after),media(before));
  assert.equal(new (require('markdown-it'))().parse(text,{}).flatMap(t=>t.children||[]).filter(t=>t.type==='image').length,3);
  for(const title of ['"Double title"',"'Single title'",'(Parenthetical title)'])assert.ok(text.includes(title));
  assert.equal(text.split('\r\n').length,source.split('\r\n').length);
});
test('validation independently rejects literal or prose corruption in an otherwise hash-consistent plan',async t=>{
  for(const body of ['```typeout\n@format yaml\n@sound none\n@speed 30\n\nstatus: original\n```\n','An original authored sentence.\n']) {
    const f=await legacy(t),scene=f.manifest.scenes[0];await fs.writeFile(path.join(f.original,scene.file),body);
    const p=await r.planMigration(f.original);assert.deepEqual(p.blockers,[]);
    p.changes.push({file:scene.file,content:body.replace('original','CORRUPTED')});
    await assert.rejects(r.materialize(p,path.join(f.root,'must-not-validate')),/authored literal|unrelated authored content/);
    assert.equal(await fs.readFile(path.join(f.original,scene.file),'utf8'),body);
  }
});
test('formatted components and fenced examples keep literal output and inline code independently',async t=>{
  const f=await legacy(t),scene=f.manifest.scenes[0];
  const source='````typeout\n@format annotation\n@sound none\n@speed 30\n\n![Live](../'+f.image+')\n\n```yaml\ncover_image: '+f.image+'\n```\n\n`'+f.image+'`\n````\n';
  await fs.writeFile(path.join(f.original,scene.file),source);
  const p=await r.planMigration(f.original);assert.deepEqual(p.blockers,[]);
  const dest=path.join(f.root,'migrated');await r.materialize(p,dest);
  const after=await fs.readFile(path.join(dest,p.mapping[scene.file]),'utf8');
  const md=new (require('markdown-it'))();
  const literals=text=>md.parse(text,{}).filter(token=>token.type==='fence').flatMap(token=>md.parse(token.content,{})).flatMap(token=>token.type==='fence'?[token.content]:(token.children||[]).filter(t=>t.type==='code_inline').map(t=>t.content));
  assert.deepEqual(literals(after),literals(source));assert.ok(after.includes('![Live](../assets/diagram.png)'));
});
test('non-UTF-8 binary additions are copied byte for byte and UTF-8 BOM/CRLF survive a reference edit',async t=>{
  const f=await legacy(t),bytes=Buffer.from([0x63,0x61,0x66,0xe9,0,255]);
  await fs.writeFile(path.join(f.original,'author-data.bin'),bytes);
  const scene=f.manifest.scenes[0],source='\uFEFFAuthored words.\r\n\r\n![Lamp](../'+f.image+' "Title")\r\n';
  await fs.writeFile(path.join(f.original,scene.file),source);
  const p=await r.planMigration(f.original);assert.deepEqual(p.blockers,[]);
  const dest=path.join(f.root,'migrated');await r.materialize(p,dest);
  assert.deepEqual(await fs.readFile(path.join(dest,'author-data.bin')),bytes);
  assert.equal(await fs.readFile(path.join(dest,p.mapping[scene.file]),'utf8'),source.replace(f.image,'assets/diagram.png'));
});
test('every destination component respects case, Unicode aliases and existing files before any move',async t=>{
  const f=await legacy(t),dest=path.join(f.root,'migrated');await r.materialize(await r.planMigration(f.original),dest);
  const m=await r.readManifest(dest),id=m.scenes[0].id;
  await fs.mkdir(path.join(dest,'scenes/Café'));await fs.writeFile(path.join(dest,'scenes/obstacle'),'User file');
  const before=await r.inventory(dest);
  for(const name of ['scenes/café/new.md','scenes/Cafe\u0301/new.md','scenes/obstacle/new.md'])await assert.rejects(planSceneMove(dest,id,name),/collision|parent is a file/);
  assert.deepEqual(await r.inventory(dest),before);
});
test('non-UTF-8 manifest metadata is blocked before decoding can replace author bytes',async t=>{
  const f=await legacy(t),file=path.join(f.original,r.MANIFEST),raw=await fs.readFile(file);
  const bytes=Buffer.concat([Buffer.from('{"author_note":"caf'),Buffer.from([0xe9]),Buffer.from('",'),raw.subarray(raw.indexOf('{')+1)]);
  await fs.writeFile(file,bytes);await assert.rejects(r.planMigration(f.original),/non-UTF-8 encoding/);
  assert.deepEqual(await fs.readFile(file),bytes);
});
test('only real frontmatter cover metadata resolves a unique vault-scoped cover; ambiguity blocks',async t=>{
  const f=await legacy(t),file=path.join(f.original,'book.md');
  f.manifest.bookFile='book.md';await fs.writeFile(path.join(f.original,r.MANIFEST),r.json(f.manifest));
  const source='---\ncover_image: "[[Publishing/Example/'+path.basename(f.image)+']]"\ncustom: preserved\n---\n\n```yaml\ncover_image: '+f.image+'\n```\n';
  await fs.writeFile(file,source);
  const p=await r.planMigration(f.original);assert.deepEqual(p.blockers,[]);
  const dest=path.join(f.root,'migrated');await r.materialize(p,dest);
  const after=await fs.readFile(path.join(dest,'book.md'),'utf8');assert.ok(after.startsWith('---\ncover_image: "[[diagram.png]]"\ncustom: preserved\n---'));
  assert.equal(after.slice(after.indexOf('```')),source.slice(source.indexOf('```')));
  await fs.mkdir(path.join(f.original,'assets/another'));await fs.copyFile(path.join(f.original,f.image),path.join(f.original,'assets/another',path.basename(f.image)));
  assert.match((await r.planMigration(f.original)).blockers.join('\n'),/ambiguous cover reference/);
});
test('a format-looking line in a YAML body cannot turn authored output into formatted metadata',async t=>{
  const f=await legacy(t),scene=f.manifest.scenes[0],source='```typeout\n@format yaml\n@sound none\n@speed 30\n\n@format annotation\n![Literal](../'+f.image+')\n```\n';
  await fs.writeFile(path.join(f.original,scene.file),source);
  const p=await r.planMigration(f.original);assert.deepEqual(p.blockers,[]);const dest=path.join(f.root,'migrated');await r.materialize(p,dest);
  assert.equal(parseScene(await fs.readFile(path.join(dest,p.mapping[scene.file]),'utf8')).beats[0].blocks[0].text,parseScene(source).beats[0].blocks[0].text);
});
test('rename blocks affected unsupported HTML, code, style and SVG references before any edit',async t=>{
  const f=await legacy(t),dest=path.join(f.root,'migrated');await r.materialize(await r.planMigration(f.original),dest);
  const m=await r.readManifest(dest),scene=m.scenes[0];
  const cases=[['html',`<a href="${scene.file}">Open scene</a>`],['css',`@import url("${scene.file}");`],['js',`const scene = \`${scene.file}\`;`],['cjs',`module.exports = "${scene.file}";`],['mjs',`export default \`${scene.file}\`;`],['svg',`<svg><a href="${scene.file}"/></svg>`],['json',JSON.stringify({example:`[Scene](${scene.file})`})]];
  for(const [ext,source]of cases) {
    const file=path.join(dest,`custom.${ext}`);await fs.writeFile(file,source);
    const before=await r.inventory(dest);await assert.rejects(planSceneMove(dest,scene.id,'scenes/renamed.md'),/unrecognised reference/);
    assert.deepEqual(await r.inventory(dest),before);await fs.unlink(file);
  }
  const unicodePath='scenes/café.md';
  await fs.rename(path.join(dest,scene.file),path.join(dest,unicodePath));m.scenes[0].file=unicodePath;await fs.writeFile(path.join(dest,r.MANIFEST),r.json(m));
  await fs.writeFile(path.join(dest,'custom.html'),'<a href="scenes/caf%c3%a9.md">Scene</a>');
  await assert.rejects(planSceneMove(dest,scene.id,'scenes/renamed.md'),/unrecognised reference/);
});
test('encoded reference-style Markdown links block without mistaking literal examples for live links',async t=>{
  const f=await legacy(t),dest=path.join(f.root,'migrated');await r.materialize(await r.planMigration(f.original),dest);
  const m=await r.readManifest(dest),scene=m.scenes[0],encoded=scene.file.replace(/-/g,'%2d');
  const file=path.join(dest,'custom.md');await fs.writeFile(file,'[Scene][target]\n\n[target]: '+encoded+'\n');
  const before=await r.inventory(dest);await assert.rejects(planSceneMove(dest,scene.id,'scenes/renamed.md'),/unrecognised|unresolved moved reference/);assert.deepEqual(await r.inventory(dest),before);
  const literal='```markdown\n[Scene][target]\n\n[target]: '+encoded+'\n```\n';await fs.writeFile(file,literal);
  const plan=await planSceneMove(dest,scene.id,'scenes/renamed.md');assert.equal(plan.changes.some(c=>c.file==='custom.md'),false);assert.equal(await fs.readFile(file,'utf8'),literal);
});
