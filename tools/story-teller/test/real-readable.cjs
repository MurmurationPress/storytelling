'use strict';
// Optional private acceptance fixture. The supplied project is NEVER migrated:
// only a complete disposable copy is passed to the migration engine.
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const r=require('../src/readable-project.cjs'),{hash}=require('../src/readable-paths.cjs'),{parseScene}=require('../src/parser.cjs'),{orderedScenes}=require('../src/manuscript-import.cjs'),{matterDocuments}=require('../src/book-matter.cjs'),{prepareWeb,exportWeb}=require('../src/web-export.cjs');
async function semantics(root) {
  const manifest=await r.readManifest(root),documents=[...orderedScenes(manifest),...matterDocuments(manifest)],scenes=[];
  let beats=0,components=0,references=0;
  for(const scene of documents) {
    const source=await fs.readFile(path.join(root,scene.file),'utf8'),parsed=parseScene(source),media=[];
    for(const src of parsed.images) {
      try{media.push([src,hash(await fs.readFile(path.resolve(root,path.dirname(scene.file),decodeURIComponent(src))))]);}
      catch{media.push([src,'missing:'+path.basename(src)]);}
    }
    function clean(value) {
      if(typeof value==='string') {for(const [src,digest]of media.sort((a,b)=>b[0].length-a[0].length))value=value.split(src).join(`asset:${digest}`);return value;}
      if(Array.isArray(value))return value.map(clean);
      if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>!['line','sourceRange','imageLines'].includes(key)).map(([key,item])=>[key,clean(item)]));
      return value;
    }
    scenes.push({id:scene.id,partId:scene.partId,title:scene.title,parsed:clean(parsed)});
    beats+=parsed.beats.length;components+=parsed.beats.reduce((n,b)=>n+b.blocks.length,0);references+=parsed.wikiReferences.length+parsed.images.length;
  }
  const files=await r.inventory(root),assets=Object.entries(files.files).filter(([file])=>file.startsWith('assets/')).map(([,digest])=>digest).sort();
  return {semanticHash:hash(r.json({scenes,assets})),scenes:manifest.scenes.length,documents:documents.length,beats,components,references,assets:assets.length};
}
(async()=>{
  if(!process.argv[2])throw Error('Supply the existing project folder; the script makes its own disposable copy');
  const supplied=await fs.realpath(process.argv[2]),originalInventory=await r.inventory(supplied),directory=await fs.mkdtemp(path.join(os.tmpdir(),'story-real-readable-'));
  const original=path.join(directory,'original-copy'),migrated=path.join(directory,'readable-copy');await fs.cp(supplied,original,{recursive:true});
  const before=await semantics(original),plan=await r.planMigration(original);assert.deepEqual(plan.blockers,[]);
  const result=await r.materialize(plan,migrated),after=await semantics(migrated);assert.deepEqual(after,before);
  assert.deepEqual(await r.inventory(supplied),originalInventory);assert.equal((await r.planMigration(migrated)).noop,true);
  const [oldReader,newReader]=await Promise.all([prepareWeb(original),prepareWeb(migrated)]);assert.equal(oldReader.book.id,newReader.book.id);
  await exportWeb(migrated,path.join(directory,'web-reader'));
  const evidence={fixture:'private local project copied before migration',productionSourcePreserved:true,semanticInventoryEqual:true,...after,renamedFiles:Object.entries(plan.mapping).filter(([a,b])=>a!==b).length,readerWarnings:result.report.readerWarnings.length,publicationIdentityPreserved:true,repeatedMigrationNoop:true};
  await fs.writeFile(path.join(directory,'evidence.json'),r.json(evidence));console.log(r.json({directory,evidence}));
})().catch(error=>{console.error(error);process.exitCode=1;});
