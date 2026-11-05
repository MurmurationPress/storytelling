'use strict';
// Filesystem transactions produce a validated sibling. The source is never written.
const fs = require('node:fs/promises');
const path = require('node:path');
const { allocator, hash, key } = require('./readable-paths.cjs');
const { portablePath, matterDocuments } = require('./book-matter.cjs');
const {losslessUtf8,assertAuthoredPreserved}=require('./source-preservation.cjs');
const markdown=new (require('markdown-it'))({html:false});
const MANIFEST = 'story-teller.project.json';
const REPORT = 'metadata/readable-migration.json';
const slash = value => value.split(path.sep).join('/');
const json = value => JSON.stringify(value, null, 2) + '\n';
const textFile = name => /\.(md|chat|ya?ml|json|mmd|txt|css|html|js|cjs|svg)$/i.test(name);
async function readRewriteText(root,file) {return losslessUtf8(await fs.readFile(path.join(root,file)),file);}
function markdownLinks(source) {
  const result=[];
  for(const m of source.matchAll(/!?\[((?:\\.|[^\]\\\n])*)\]\(/g)) {
    let start=m.index+m[0].length;
    while(/[ \t\r\n]/.test(source[start]||'\0'))start++;
    const destination=markdown.helpers.parseLinkDestination(source,start,source.length);
    if(!destination.ok)continue;
    let end=destination.pos;
    while(/[ \t\r\n]/.test(source[end]||'\0'))end++;
    if(end>destination.pos&&source[end]!==')') {
      const title=markdown.helpers.parseLinkTitle(source,end,source.length);
      if(!title.ok)continue;
      end=title.pos;while(/[ \t\r\n]/.test(source[end]||'\0'))end++;
    }
    if(source[end]!==')')continue;
    const angled=source[start]==='<';
    result.push({start:m.index,end:end+1,target:destination.str,targetStart:start+(angled?1:0),targetEnd:destination.pos-(angled?1:0)});
  }
  return result;
}
async function inventory(root) {
  root = await fs.realpath(root);
  const files = Object.create(null), fileModes=Object.create(null), directoryModes=Object.create(null), directories = [], names = new Set();
  async function walk(relative) {
    for (const entry of (await fs.readdir(path.join(root,relative),{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name,'en'))) {
      const name = relative ? `${relative}/${entry.name}` : entry.name;
      if (names.has(key(name))) throw Error(`Case-insensitive or Unicode path collision: ${name}`);
      names.add(key(name));
      if (entry.isSymbolicLink() || (!entry.isFile() && !entry.isDirectory())) throw Error(`Unsupported filesystem entry (review manually): ${name}`);
      const mode=(await fs.stat(path.join(root,name))).mode&0o777;
      if (entry.isDirectory()) { directoryModes[name]=mode;directories.push(name); await walk(name); }
      else {files[name] = hash(await fs.readFile(path.join(root,name)));fileModes[name]=mode;}
    }
  }
  await walk(''); return {files,directories,fileModes,directoryModes,rootMode:(await fs.stat(root)).mode&0o777};
}
async function readManifest(root) {
  const raw=await readRewriteText(root,MANIFEST);
  const manifest = JSON.parse(raw,(_key,value)=>{
    if(typeof value==='number'&&(!Number.isFinite(value)||(Number.isInteger(value)&&!Number.isSafeInteger(value))))throw Error('Unsafe numeric metadata cannot be round-tripped losslessly; review it before migration');
    return value;
  });
  const document=require('yaml').parseDocument(raw,{uniqueKeys:true});
  if(document.errors.length)throw Error(`Ambiguous project JSON metadata: ${document.errors[0].message}`);
  const { orderedScenes } = require('./manuscript-import.cjs');
  const scenes = orderedScenes(manifest);
  const items = [...manifest.parts,...scenes,...matterDocuments(manifest)];
  if (new Set(items.map(s=>s.id)).size !== items.length || items.some(s=>typeof s.id!=='string'||!s.id)) throw Error('Project identities must be unique and nonempty');
  const files = [...scenes.map(s=>s.file),...manifest.parts.map(p=>p.metadataFile).filter(Boolean),...matterDocuments(manifest).map(s=>s.file),...matterDocuments(manifest).map(s=>s.sourceFile).filter(Boolean),...([manifest.bookFile,manifest.importState].filter(Boolean))];
  if (new Set(files.map(key)).size !== files.length) throw Error('Project documents share a file');
  for (const file of files) portablePath(file);
  return manifest;
}
// Only explicit Markdown destinations are rewritten. Unknown path-bearing syntax
// blocks a move, rather than a global replacement changing authored prose/code.
function rewriteReferences(source, oldFile, newFile, mapping) {
  const consumed = [];
  const structure=require('./structure.cjs').inspectStructure(source);
  const metadataAt=offset=>/\.md$/i.test(oldFile)&&structure.frontmatter?.closed&&offset>=structure.lines[1].start&&offset<structure.lines[structure.frontmatter.end-1].start;
  const literalAt=offset=>{
    const line=structure.lines.findIndex((line,i)=>offset>=line.start&&offset<(structure.lines[i+1]?.start??source.length+1));
    if(require('./source-literals.cjs').literalLine(structure,line))return true;
    const text=structure.lines[line];
    if(!text)return false;
    return [...text.text.matchAll(/(`+).*?\1/g)].some(m=>offset>=text.start+m.index&&offset<text.start+m.index+m[0].length);
  };
  const rewrite = (target, start, end) => {
    if (!target||/^[a-z][\w+.-]*:|^[#?\/]/i.test(target)) return target;
    const match = target.match(/^([^#?]*)(.*)$/);
    let plain;
    try { plain = decodeURIComponent(match[1].replace(/\\([ ()])/g,'$1')); } catch { throw Error(`${oldFile}: invalid URL encoding in ${target}`); }
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(oldFile),plain));
    const destination = Object.hasOwn(mapping,resolved) ? mapping[resolved] : resolved;
    if (resolved.startsWith('../')) return target;
    consumed.push({start,end,target:plain,resolved});
    if (destination === resolved && path.posix.dirname(oldFile)===path.posix.dirname(newFile)) return target;
    const relative = path.posix.relative(path.posix.dirname(newFile),destination);
    return relative.split('/').map(part=>encodeURIComponent(part).replace(/[!'()*]/g,c=>`%${c.charCodeAt(0).toString(16).toUpperCase()}`)).join('/') + match[2];
  };
  // Preserve link labels and aliases byte for byte. Fenced formatted components
  // use the same Markdown image syntax as ordinary scenes.
  const replacements = [];
  for(const link of markdownLinks(source)) {
    if(literalAt(link.start)||metadataAt(link.start))continue;
    const next=rewrite(link.target,link.start,link.end);
    if(next!==link.target)replacements.push({start:link.targetStart,end:link.targetEnd,value:next});
  }
  for (const m of source.matchAll(/!\[\[([^\]\n]+)\]\]/g)) {
    if(literalAt(m.index)||metadataAt(m.index))continue;
    const target = m[1].split('|')[0], offset = m.index + 3;
    // Bare media aliases are ambiguous; supporting-note wikilinks are untouched.
    const next = rewrite(target,m.index,m.index+m[0].length);
    if (next === target && !target.includes('/')) {
      const matches = Object.keys(mapping).filter(file=>path.posix.basename(file)===target);
      if (matches.length) throw Error(`${oldFile}: ambiguous wiki media target ${target}; use an explicit relative path before migration`);
    }
    if (next !== target) replacements.push({start:offset,end:offset+target.length,value:next});
  }
  // Existing book metadata stores cover_image as a project-root-relative scalar.
  // Preserve quoting and other YAML, including unknown keys, byte for byte.
  if(/\.md$/i.test(oldFile)&&structure.frontmatter?.closed) {
    const begin=structure.lines[1].start,end=structure.lines[structure.frontmatter.end-1].start;
    const YAML=require('yaml'),doc=YAML.parseDocument(source.slice(begin,end),{uniqueKeys:true});
    const value=!doc.errors.length&&YAML.isMap(doc.contents)?doc.get('cover_image',true):null;
    if(YAML.isScalar(value)&&typeof value.value==='string'&&value.range) {
      const target=value.value.trim(),wiki=target.match(/^\[\[([^\]|]+)\]\]$/);
      let mapped=Object.hasOwn(mapping,target)?mapping[target]:undefined;
      if(wiki) {
        // Archived book metadata may retain an Obsidian vault-scoped cover path.
        // Resolve its exact-case leaf only when the project asset is unique.
        const candidates=Object.keys(mapping).filter(file=>file.startsWith('assets/')&&(path.posix.basename(file)===path.posix.basename(wiki[1])||file===wiki[1]));
        if(candidates.length>1)throw Error(`${oldFile}: ambiguous cover reference ${target}`);
        if(candidates.length===1)mapped=`[[${path.posix.basename(mapping[candidates[0]])}]]`;
      }
      if(mapped) {
        const start=begin+value.range[0],finish=begin+value.range[1];
        if(!['PLAIN','QUOTE_SINGLE','QUOTE_DOUBLE'].includes(value.type)||/[\r\n]/.test(source.slice(start,finish)))throw Error(`${oldFile}: multiline cover metadata requires manual review`);
        consumed.push({start,end:finish});
        const replacement=value.type==='QUOTE_DOUBLE'?JSON.stringify(mapped):value.type==='QUOTE_SINGLE'?`'${mapped.replace(/'/g,"''")}'`:mapped;
        if(mapped!==target)replacements.push({start,end:finish,value:replacement});
      }
    }
  }
  // A reference outside recognised syntax, including metadata/code/HTML, must
  // be resolved explicitly. Archived manuscript metadata is preserved too.
  for (const [from,to] of Object.entries(mapping)) {
    if (from === to) continue;
    for (const needle of new Set([from,path.posix.relative(path.posix.dirname(oldFile),from),path.posix.basename(from)])) {
      if (!needle) continue;
      let offset = -1;
      while ((offset = source.indexOf(needle,offset+1)) >= 0) {
        if(literalAt(offset))continue; // Authored examples/output are not resources.
        if (!consumed.some(span=>offset>=span.start&&offset+needle.length<=span.end)) throw Error(`${oldFile}: unrecognised reference to ${from}; review manually before moving it`);
      }
    }
  }
  for (const change of replacements.sort((a,b)=>b.start-a.start)) source = source.slice(0,change.start)+change.value+source.slice(change.end);
  return source;
}
function remapManifest(manifest, mapping) {
  const next = structuredClone(manifest);
  const fields = new Set(['file','metadataFile','bookFile','sourceFile']);
  function visit(value) {
    if (!value || typeof value !== 'object') return;
    for (const [field,item] of Object.entries(value)) {
      const mentionsMoved=string=>Object.entries(mapping).some(([from,to])=>from!==to && [from,path.posix.basename(from)].some(needle=>string.includes(needle)));
      if(mentionsMoved(field))throw Error(`Unknown metadata key ${field} references a moved file; review manually`);
      if (fields.has(field) && typeof item==='string' && Object.hasOwn(mapping,item)) value[field]=mapping[item];
      else if (!['provenance','pathAliases'].includes(field)) {
        if (typeof item==='string' && mentionsMoved(item)) throw Error(`Unknown metadata field ${field} references a moved file; review manually`);
        visit(item);
      }
    }
  }
  visit(next); return next;
}
async function planMigration(root) {
  root = await fs.realpath(root);
  if(path.basename(path.dirname(root)).startsWith('.story-teller-readable-'))throw Error('Uncommitted migration staging selected; open the retained original or a validated destination instead');
  const before = await inventory(root), manifest = await readManifest(root);
  for(const file of [manifest.bookFile,...matterDocuments(manifest).map(s=>s.sourceFile)].filter(Boolean))if(!before.files[file])throw Error(`Missing project metadata file: ${file}`);
  if (manifest.version===2) {
    if (!/^[a-f0-9]{64}$/.test(manifest.publicationId||'')) throw Error('Partial version 2 project: missing publication identity');
    const required=[...manifest.scenes.map(s=>s.file),...manifest.parts.map(p=>p.metadataFile).filter(Boolean),...matterDocuments(manifest).map(s=>s.file),...(manifest.importState?[manifest.importState]:[])];
    for(const file of required)if(!before.files[file])throw Error(`Partial version 2 project: missing ${file}`);
    if(manifest.scenes.some(s=>/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}\.md$/i.test(path.posix.basename(s.file))))throw Error('Mixed version 2 / legacy scene paths; restore the original and rerun migration');
    return {root,before,manifest,mapping:{},changes:[],warnings:[],blockers:[],noop:true,kind:'migration'};
  }
  if (before.files[REPORT] || manifest.importState) throw Error('Partial or mixed-format migration detected; restore the original or open the validated copy');
  const allocate = allocator([...Object.keys(before.files),...before.directories]), mapping = Object.create(null);
  for (const scene of manifest.scenes) mapping[scene.file] = allocate('scenes',require('./readable-paths.cjs').opaque(scene.title)?'scene':scene.title,'.md',scene.id);
  for (const part of manifest.parts) if (part.metadataFile) mapping[part.metadataFile] = allocate('metadata',require('./readable-paths.cjs').opaque(part.title)?'part':part.title,'.md',part.id);
  for (const file of Object.keys(before.files).filter(f=>f.startsWith('assets/'))) {
    const ext = path.posix.extname(file), original = path.posix.basename(file,ext).replace(/-[a-f0-9]{64}$/i,'');
    const base=require('./readable-paths.cjs').opaque(original)?'image':original;
    mapping[file] = allocate(path.posix.dirname(file),base,ext,file);
  }
  // Keep an already readable canonical allocation (do not suffix it against itself).
  for (const [from,to] of Object.entries(mapping)) {
    const { slug } = require('./readable-paths.cjs');
    const scene = manifest.scenes.find(s=>s.file===from), part = manifest.parts.find(s=>s.metadataFile===from);
    const title = scene?.title || part?.title || path.posix.basename(from,path.posix.extname(from)).replace(/-[a-f0-9]{64}$/i,'');
    if (!require('./readable-paths.cjs').opaque(title) && from === `${path.posix.dirname(from)}/${slug(title)}${path.posix.extname(from).toLowerCase()}`) mapping[from]=from;
    if (!before.files[from]) throw Error(`Missing project file: ${from}`);
  }
  const changes=[], blockers=[];
  for (const file of Object.keys(before.files)) {
    if (file===MANIFEST || !textFile(file)) continue;
    try { const source=await readRewriteText(root,file),content=rewriteReferences(source,file,mapping[file]||file,mapping); assertAuthoredPreserved(source,content,file,mapping[file]||file,mapping);if(content!==source)changes.push({file,content}); }
    catch(error){blockers.push(error.message);}
  }
  let next;
  try { next=remapManifest(manifest,mapping); } catch(error){blockers.push(error.message);next=structuredClone(manifest);}
  const { orderedScenes } = require('./manuscript-import.cjs');
  const documents=[...matterDocuments(manifest).filter(s=>s.kind==='front'),...orderedScenes(manifest),...matterDocuments(manifest).filter(s=>s.kind==='back')];
  next.pathAliases=Object.fromEntries(manifest.scenes.map(s=>[s.file,s.id]));
  next.version=2;next.publicationId=hash(documents.map(s=>s.id).join('\n'));
  changes.push({file:MANIFEST,content:json(next)});
  return {kind:'migration',root,before,manifest:next,mapping,changes,blockers,warnings:['The source stays intact. Open the validated sibling copy after migration.','Legacy projects have no imported-output baseline. Establish reimport mappings explicitly before reconciling edits.'],noop:false};
}
function reportFor(plan) {
  const identities=Object.fromEntries([...(plan.manifest.parts||[]),...(plan.manifest.scenes||[]),...matterDocuments(plan.manifest)].map(item=>[item.id,item.id]));
  return {version:1,kind:plan.kind,status:plan.noop?'unchanged':plan.blockers.length?'blocked':'planned',mapping:plan.mapping,identities,changes:plan.changes.map(c=>c.file),warnings:plan.warnings,blockers:plan.blockers,inventory:plan.before};
}
async function unchanged(plan) {
  if (json(await inventory(plan.root))!==json(plan.before)) throw Error('Source project changed after review; original retained. Rebuild the preview.');
  for(const snapshot of plan.inputs||[])if(hash(await fs.readFile(snapshot.file))!==snapshot.hash)throw Error('Manuscript or asset changed after reimport review; original retained. Rebuild the preview.');
}
async function materialize(plan,destination,{beforeCommit=()=>{},beforeValidate=()=>{}}={}) {
  if(plan.blockers.length)throw Error(`Resolve blocking issues first:\n${plan.blockers.join('\n')}`);
  if(plan.noop)return {noop:true,report:reportFor(plan)};
  destination=path.resolve(destination);
  const parent=await fs.realpath(path.dirname(destination));destination=path.join(parent,path.basename(destination));
  if(parent===plan.root || parent.startsWith(plan.root+path.sep))throw Error('Choose a sibling destination outside the source project');
  try{await fs.lstat(destination);throw Error('Destination already exists; never overwrite it. Choose a new sibling.');}catch(error){if(error.code!=='ENOENT')throw error;}
  await unchanged(plan);
  const staging=await fs.mkdtemp(path.join(parent,'.story-teller-readable-'));
  let reserved=false;
  try {
    // A transaction-owned marker lives outside the copied project.
    await fs.writeFile(path.join(staging,'transaction.json'),json({version:1,status:'staging',destination,report:reportFor(plan)}),{flag:'wx'});
    const target=path.join(staging,'project');await fs.mkdir(target);
    for(const dir of plan.before.directories)await fs.mkdir(path.join(target,dir),{recursive:true});
    for(const [file,digest] of Object.entries(plan.before.files)) {
      const bytes=await fs.readFile(path.join(plan.root,file));if(hash(bytes)!==digest)throw Error(`Source changed: ${file}`);
      const name=Object.hasOwn(plan.mapping,file)?plan.mapping[file]:file;portablePath(name);await fs.mkdir(path.dirname(path.join(target,name)),{recursive:true});
      await fs.writeFile(path.join(target,name),bytes,{flag:'wx'});
    }
    for(const change of plan.changes) {
      const name=Object.hasOwn(plan.mapping,change.file)?plan.mapping[change.file]:change.file;portablePath(name);
      await fs.mkdir(path.dirname(path.join(target,name)),{recursive:true});
      await fs.writeFile(path.join(target,name),change.content);
    }
    await beforeValidate(target);
    await readManifest(target);
    const resultInventory=await inventory(target);
    for(const [file,digest] of Object.entries(plan.before.files)) {
      const change=plan.changes.find(c=>c.file===file),expected=change?hash(change.content):digest;
      if(resultInventory.files[Object.hasOwn(plan.mapping,file)?plan.mapping[file]:file]!==expected)throw Error(`Preservation validation failed: ${file}`);
      if(change&&file!==MANIFEST&&textFile(file)&&['migration','reimport-baseline'].includes(plan.kind))assertAuthoredPreserved(await readRewriteText(plan.root,file),await readRewriteText(target,Object.hasOwn(plan.mapping,file)?plan.mapping[file]:file),file,Object.hasOwn(plan.mapping,file)?plan.mapping[file]:file,plan.mapping);
    }
    const { prepareWeb }=require('./web-export.cjs');
    const [oldReader,newReader]=await Promise.all([prepareWeb(plan.root),prepareWeb(target)]);
    if(['migration','reimport-baseline'].includes(plan.kind)) {
      if(json(oldReader.book.readingOrder)!==json(newReader.book.readingOrder)||oldReader.book.id!==newReader.book.id)throw Error('Reader ordering/identity changed during migration');
      for(let i=0;i<oldReader.scenes.length;i++) {
        const old=oldReader.scenes[i],next=newReader.scenes[i],doc=[...plan.manifest.scenes,...matterDocuments(plan.manifest)].find(s=>s.id===old.id);
        const oldFile=Object.keys(plan.mapping).find(f=>plan.mapping[f]===doc.file)||doc.file;
        assertAuthoredPreserved(old.data.source,next.data.source,oldFile,doc.file,plan.mapping);
        const normalizeMedia=data=>Object.values(data.media).map(entry=>entry.url || entry.error).sort();
        if(json(normalizeMedia(old.data))!==json(normalizeMedia(next.data)))throw Error(`Reader media changed: ${old.id}`);
      }
      if(json(oldReader.book.notes)!==json(newReader.book.notes)||json(oldReader.book.targets)!==json(newReader.book.targets))throw Error('Supporting content changed; resolve its moved references explicitly');
    }
    await beforeCommit(target);await unchanged(plan);
    const report={...reportFor(plan),status:'validated',readerWarnings:newReader.warnings};
    if(resultInventory.files[REPORT] && plan.kind==='migration')throw Error('Migration report already exists');
    if(plan.kind==='migration') {await fs.mkdir(path.join(target,'metadata'),{recursive:true});await fs.writeFile(path.join(target,REPORT),json(report),{flag:'wx'});}
    await fs.writeFile(path.join(staging,'transaction.json'),json({version:1,status:'validated',destination,report}));
    // Keep Git's executable bit and private author-file permissions. Apply
    // modes after edits so read-only originals can still be staged safely.
    for(const [file,mode]of Object.entries(plan.before.fileModes))await fs.chmod(path.join(target,Object.hasOwn(plan.mapping,file)?plan.mapping[file]:file),mode);
    for(const [dir,mode]of Object.entries(plan.before.directoryModes))await fs.chmod(path.join(target,dir),mode);
    await fs.chmod(target,plan.before.rootMode);
    await fs.mkdir(destination);reserved=true;
    await fs.rename(target,destination);reserved=false;
    await fs.rm(staging,{recursive:true,force:true});
    return {destination,report};
  } catch(error) {
    if(reserved)await fs.rmdir(destination).catch(()=>{});
    // Keep staged bytes and the transaction report for diagnostics/recovery.
    throw Error(`${error.message}\nOriginal project is unchanged. Recovery staging: ${staging}`,{cause:error});
  }
}
module.exports={MANIFEST,REPORT,inventory,readManifest,readRewriteText,rewriteReferences,remapManifest,planMigration,reportFor,materialize,unchanged,json};
