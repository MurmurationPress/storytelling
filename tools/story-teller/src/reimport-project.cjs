'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const {hash,allocator}=require('./readable-paths.cjs');
const {inventory,readManifest,json,MANIFEST}=require('./readable-project.cjs');
const {scan,discover,plan,resolveAssets,writeProject}=require('./manuscript-import.cjs');
const {portablePath}=require('./book-matter.cjs');
const slash=value=>value.split(path.sep).join('/');
const managed=m=>({title:m.title,orderField:m.orderField,sequence:m.sequence,parts:m.parts,scenes:m.scenes});
async function planReimport(root,sourceFolder,assetRoot=sourceFolder) {
  root=await fs.realpath(root);sourceFolder=await fs.realpath(sourceFolder);assetRoot=await fs.realpath(assetRoot);
  const before=await inventory(root),manifest=await readManifest(root);
  if(path.basename(path.dirname(root)).startsWith('.story-teller-readable-'))throw Error('Open the retained original or a validated destination, not uncommitted staging');
  for(const file of [...manifest.scenes.map(s=>s.file),...manifest.parts.map(p=>p.metadataFile).filter(Boolean)])if(!before.files[file])throw Error(`Missing adaptation document ${file}; use Rename / Move Scene File to repair external moves before reimport`);
  if(manifest.version!==2)throw Error('Migrate Project to Readable Files before reimporting');
  if(!manifest.importState)return planBaseline(root,sourceFolder,assetRoot,before,manifest);
  portablePath(manifest.importState);
  const state=JSON.parse(await fs.readFile(path.join(root,manifest.importState),'utf8'));
  if(state.version!==1 || !Array.isArray(state.outputs)||!Array.isArray(state.assets))throw Error('Unsupported import ledger');
  const prepared=await resolveAssets(plan(discover(await scan(sourceFolder),sourceFolder),manifest.orderField),assetRoot);
  if(prepared.errors.length || prepared.unresolved.length)throw Error([...prepared.errors,...prepared.unresolved].join('\n'));
  const inputs=[...prepared.scenes.map(s=>({file:s.source,hash:hash(s.content)})),...prepared.parts.map(s=>({file:s.source,hash:hash(s.original)})),...Object.values(prepared.matter).flat().map(s=>({file:s.source,hash:hash(s.content)})),...prepared.assets.map(a=>({file:a.source,hash:a.hash})),...(!prepared.book.synthetic?[{file:prepared.book.file,hash:hash(prepared.book.source)}]:[])];
  const blockers=[],warnings=[],ids=new Map(),paths=Object.create(null),matches=new Set();
  // Exact source-relative mappings are stable across relocating the entire vault.
  // A moved note is matched only by a unique unchanged source digest.
  for(const [kind,items] of [['part',prepared.parts],['scene',prepared.scenes]]) {
    const previous=state.outputs.filter(o=>o.kind===kind);
    for(const item of items) {
      const source=slash(path.relative(sourceFolder,item.source)),content=item.content??item.original;
      let candidates=previous.filter(o=>o.source===source);
      if(!candidates.length)candidates=previous.filter(o=>o.sourceHash===hash(content));
      if(candidates.length>1){blockers.push(`Ambiguous ${kind} match for ${source}`);continue;}
      const found=candidates[0];
      if(found) {
        if(matches.has(found.id)){blockers.push(`Two source notes match ${found.file}`);continue;}
        matches.add(found.id);ids.set(item.id,found.id);paths[found.id]=(kind==='scene'?manifest.scenes:manifest.parts).find(s=>s.id===found.id)?.[kind==='scene'?'file':'metadataFile']||found.file;
      } else if(previous.some(o=>!prepared[kind==='scene'?'scenes':'parts'].some(s=>slash(path.relative(sourceFolder,s.source))===o.source))) {
        blockers.push(`Unmatched new/moved ${kind} ${source} alongside missing source notes; restore source paths or supply a unique unchanged note before retrying`);
      }
    }
  }
  for(const scene of prepared.scenes){scene.id=ids.get(scene.id)||scene.id;scene.partId=ids.get(scene.partId)||scene.partId;}
  for(const part of prepared.parts){part.id=ids.get(part.id)||part.id;part.scenes=part.scenes.map(id=>ids.get(id)||id);}
  prepared.sequence=prepared.sequence.map(s=>({...s,id:ids.get(s.id)||s.id}));
  const allocate=allocator([...Object.keys(before.files),...before.directories]),assetNames=new Map();
  for(const asset of prepared.assets) {
    const source=slash(path.relative(assetRoot,asset.source));
    let old=state.assets.find(a=>a.source===source);
    if(!old) {
      const matches=[...new Map(state.assets.filter(a=>a.hash===asset.hash).map(a=>[a.file,a])).values()];
      if(matches.length===1)old=matches[0];
      else if(matches.length>1)blockers.push(`Ambiguous moved asset ${source}; multiple existing files share its bytes. Review the asset mapping explicitly.`);
    }
    const name=old?.file || allocate('assets',path.basename(asset.name,path.extname(asset.name)),path.extname(asset.name),source);
    assetNames.set(asset.name,name.slice(7));asset.name=name.slice(7);
  }
  for(const scene of [...prepared.scenes,...Object.values(prepared.matter).flat(),...(prepared.cover?[prepared.cover]:[])])for(const ref of scene.references)ref.name=assetNames.get(ref.name);
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'story-reimport-plan-'));
  const changes=[];
  let next, fresh;
  try {
    next=await writeProject(prepared,path.join(temp,'new'),{paths,reserved:Object.keys(before.files),publicationId:manifest.publicationId,matter:manifest.matter});
    // Matter identities must remain stable even when their source text changes.
    for(const kind of ['front','back'])if(manifest.matter?.[kind])next.matter[kind]={...manifest.matter[kind]};
    const freshState=JSON.parse(await fs.readFile(path.join(temp,'new',next.importState),'utf8'));
    // Absolute provenance is historical data, not an import-change trigger.
    for(const scene of next.scenes){const old=manifest.scenes.find(s=>s.id===scene.id);if(old)scene.provenance={...old.provenance,sha256:scene.provenance.sha256};}
    const deletedScenes=manifest.scenes.filter(s=>!next.scenes.some(n=>n.id===s.id));
    const deletedParts=manifest.parts.filter(s=>!next.parts.some(n=>n.id===s.id));
    for(const s of deletedScenes)warnings.push(`Source deleted: retained ${s.file} for author review`);
    for(const p of deletedParts)warnings.push(`Source deleted: retained part ${p.title} for author review`);
    for(const p of deletedParts)next.parts.push(structuredClone(p));
    for(const s of deletedScenes){next.scenes.push(structuredClone(s));if(s.partId!==null){const p=next.parts.find(p=>p.id===s.partId);if(!p.scenes.includes(s.id))p.scenes.push(s.id);}}
    for(const entry of manifest.sequence||[])if((entry.kind==='part'?deletedParts:deletedScenes).some(s=>s.id===entry.id))next.sequence.push(entry);
    // Unknown metadata and author settings survive; field changes on both sides
    // are conflicts, rather than a hidden replacement of the manifest.
    fresh=structuredClone(managed(next));
    const result=structuredClone(manifest);
    for(const field of Object.keys(fresh)) {
      const current=json(managed(manifest)[field]),base=json(state.managed[field]),incoming=json(fresh[field]);
      if(current!==base && incoming!==base && current!==incoming)blockers.push(`Project ${field} changed in both adaptation and source; reconcile the manifest explicitly`);
      else if(current===base)result[field]=next[field];
    }
    // Merge per-item unknown metadata when source modifies ordering/titles.
    for(const field of ['parts','scenes'])for(const item of result[field]){
      const old=manifest[field].find(s=>s.id===item.id);if(old)for(const [k,v]of Object.entries(old))if(!(k in item))item[k]=v;
    }
    next=result;
    for(const output of freshState.outputs) {
      const previous=state.outputs.find(o=>o.file===output.file || (o.kind===output.kind && o.id && o.id===output.id));
      const actual=before.files[output.file],base=previous?.outputHash;
      const bytes=await fs.readFile(path.join(temp,'new',output.file));
      if(actual===hash(bytes))continue;
      if(previous && output.outputHash===base)continue; // unchanged source, preserve adaptation
      if(actual && actual!==base){blockers.push(`Both source and adaptation changed: ${output.file}`);continue;}
      if(previous && !actual){blockers.push(`Adaptation file removed or moved externally: ${output.file}; repair the manifest/import ledger before reimport`);continue;}
      changes.push({file:output.file,content:bytes});
    }
    for(const asset of freshState.assets) {
      const bytes=await fs.readFile(path.join(temp,'new',asset.file)),old=state.assets.find(a=>a.file===asset.file),actual=before.files[asset.file];
      if(actual===asset.hash || old?.hash===asset.hash)continue;
      if(actual && actual!==old?.hash){blockers.push(`Both source and adaptation changed asset: ${asset.file}`);continue;}
      if(old&&!actual){blockers.push(`Missing adaptation asset: ${asset.file}`);continue;}
      changes.push({file:asset.file,content:bytes});
    }
    // Keep baseline entries for source-deleted material so it can be restored.
    for(const old of state.outputs)if(!freshState.outputs.some(o=>o.file===old.file))freshState.outputs.push(old);
    for(const old of state.assets)if(!freshState.assets.some(o=>o.file===old.file))freshState.assets.push(old);
    freshState.managed=fresh;
    if(json(state)!==json(freshState))changes.push({file:manifest.importState,content:json(freshState)});
    if(json(next)!==json(manifest))changes.push({file:MANIFEST,content:json(next)});
  } finally {await fs.rm(temp,{recursive:true,force:true});}
  return {kind:'reimport',root,before,inputs,manifest:next,mapping:{},changes,blockers,warnings,noop:changes.length===0&&blockers.length===0};
}
// A legacy project recorded original source hashes but no adapted-output
// baseline. Establish one only against uniquely matching ORIGINAL source bytes.
// Never treat today's adaptation bytes as evidence that future source edits may
// overwrite them. This reviewed operation changes only manifest/ledger metadata.
async function planBaseline(root,sourceFolder,assetRoot,before,manifest) {
  const prepared=await resolveAssets(plan(discover(await scan(sourceFolder),sourceFolder),manifest.orderField),assetRoot);
  const blockers=[...prepared.errors,...prepared.unresolved],warnings=['Baseline review only: all adapted content stays unchanged. Run Reimport again on the validated copy after reviewing this baseline.'],ids=new Map(),paths=Object.create(null),used=new Set();
  for(const scene of prepared.scenes) {
    const matches=manifest.scenes.filter(old=>old.provenance?.sha256===hash(scene.content));
    if(matches.length!==1||used.has(matches[0]?.id)){blockers.push(`Cannot prove a unique original source match for ${path.basename(scene.source)}. Restore the original manuscript revision or provide an explicitly reviewed mapping; no title-based guessing.`);continue;}
    const old=matches[0];used.add(old.id);ids.set(scene.id,old.id);paths[old.id]=old.file;
  }
  for(const part of prepared.parts) {
    const matches=[];
    for(const old of manifest.parts)if(old.metadataFile&&before.files[old.metadataFile]===hash(part.original))matches.push(old);
    if(matches.length!==1||used.has(matches[0]?.id)){blockers.push(`Cannot prove a unique archived part match for ${part.title}; review its source mapping manually`);continue;}
    const old=matches[0];used.add(old.id);ids.set(part.id,old.id);paths[old.id]=old.metadataFile;
  }
  if(manifest.scenes.some(s=>!used.has(s.id))||manifest.parts.some(p=>!used.has(p.id)))blockers.push('Some adaptation scenes/parts have no original source match; reconcile identity mappings explicitly before establishing a baseline');
  for(const scene of prepared.scenes){scene.id=ids.get(scene.id)||scene.id;scene.partId=ids.get(scene.partId)||scene.partId;}
  for(const part of prepared.parts){part.id=ids.get(part.id)||part.id;part.scenes=part.scenes.map(id=>ids.get(id)||id);}
  prepared.sequence=prepared.sequence.map(s=>({...s,id:ids.get(s.id)||s.id}));
  const names=new Map();
  for(const asset of prepared.assets) {
    const matches=Object.entries(before.files).filter(([file,digest])=>file.startsWith('assets/')&&digest===asset.hash);
    if(matches.length!==1){blockers.push(`Cannot prove a unique existing media match for ${path.basename(asset.source)}; review the asset mapping manually`);continue;}
    names.set(asset.name,matches[0][0].slice(7));asset.name=matches[0][0].slice(7);
  }
  for(const scene of [...prepared.scenes,...Object.values(prepared.matter).flat(),...(prepared.cover?[prepared.cover]:[])])for(const ref of scene.references)ref.name=names.get(ref.name)||ref.name;
  const result={kind:'reimport-baseline',root,before,manifest:structuredClone(manifest),mapping:{},changes:[],warnings,blockers,noop:false};
  if(blockers.length)return result;
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'story-baseline-plan-'));
  try {
    const next=await writeProject(prepared,path.join(temp,'new'),{paths,reserved:Object.keys(before.files),publicationId:manifest.publicationId,matter:manifest.matter});
    const ledger=JSON.parse(await fs.readFile(path.join(temp,'new',next.importState),'utf8'));
    ledger.managed=managed(manifest);
    // A current import's generated baseline can differ from the historical
    // importer. Such differences conservatively become adaptation edits.
    result.manifest.importState=next.importState;
    if(before.files[next.importState])throw Error('Import ledger path is occupied; review manually');
    result.changes=[{file:next.importState,content:json(ledger)},{file:MANIFEST,content:json(result.manifest)}];
    result.inputs=[...prepared.scenes.map(s=>({file:s.source,hash:hash(s.content)})),...prepared.parts.map(s=>({file:s.source,hash:hash(s.original)})),...prepared.assets.map(a=>({file:a.source,hash:a.hash}))];
  }finally{await fs.rm(temp,{recursive:true,force:true});}
  return result;
}
module.exports={planReimport,planBaseline};
