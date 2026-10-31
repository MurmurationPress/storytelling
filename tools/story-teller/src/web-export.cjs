'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { matterDocuments } = require('./book-matter.cjs');
const { hasSceneHeading } = require('./scene-heading.cjs');
const { matterScene } = require('./matter-presentation.cjs');
const { orderedScenes, orderedRoots } = require('./manuscript-import.cjs');
const { resolveSettings } = require('./pacing-settings.cjs');
const { parseScene } = require('./parser.cjs');
const { inspectStructure } = require('./structure.cjs');
const { inside, inspectImage } = require('./media.cjs');
const { indexSupporting, loadSupporting, describeLinks } = require('./supporting-content.cjs');
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
async function localFile(root, relative) {
  if (typeof relative !== 'string' || path.isAbsolute(relative) || relative.includes('\\') || relative.split('/').includes('..')) throw Error('Invalid publication file path');
  const file = await fs.realpath(path.resolve(root, relative));
  if (!inside(root, file) || !(await fs.stat(file)).isFile()) throw Error('Publication file escapes the project or is not a file');
  return file;
}
function publicationBody(source) {
  const structure = inspectStructure(source);
  if (structure.frontmatter && !structure.frontmatter.closed) throw Error('Close scene frontmatter before export');
  return source.slice(structure.lines[structure.start]?.start ?? source.length);
}
function analyticsConfig(value, scenes) {
  if (value == null) return undefined;
  const safeId = id => typeof id === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(id);
  if (!/^G-[A-Z0-9]+$/.test(value.measurementId || '') || !safeId(value.publicationId) || !Array.isArray(value.stories) || !value.stories.length) throw Error('Invalid web analytics configuration');
  const ids = new Set(), documents = new Set();
  const stories = value.stories.map(item => {
    if (!safeId(item.id) || !scenes.some(scene => scene.id === item.sceneId && scene.kind === 'scene') || ids.has(item.id) || documents.has(item.sceneId)) throw Error('Analytics stories need unique stable IDs and existing story scenes');
    ids.add(item.id); documents.add(item.sceneId); return { id: item.id, sceneId: item.sceneId };
  });
  return { measurementId: value.measurementId, publicationId: value.publicationId, stories,
    revision: digest(stories.map(item => scenes.find(scene => scene.id === item.sceneId).data.source).join('\n')) };
}
async function prepareWeb(projectRoot, options = {}) {
  const root = await fs.realpath(projectRoot);
  const manifestFile=await localFile(root,'story-teller.project.json'),manifestBytes=await fs.readFile(manifestFile);
  const manifest = JSON.parse(manifestBytes);
  const sequence = orderedScenes(manifest);
  const matter = matterDocuments(manifest);
  const documents = [...matter.filter(item=>item.kind==='front'), ...sequence, ...matter.filter(item=>item.kind==='back')];
  for (const list of [manifest.parts, sequence]) if (new Set(list.map(item=>item.id)).size!==list.length || list.some(item=>typeof item.id!=='string'||!item.id)) throw Error('Project needs unique stable identities');
  const assets = new Map(), snapshots = new Map([[manifestFile,digest(manifestBytes)]]), warnings = [];
  const recordSnapshot=(file,bytes)=>{
    const hash=digest(bytes);
    if(snapshots.has(file)&&snapshots.get(file)!==hash){const error=Error('Publication source changed during export; try again');error.code='ESTORYSTALE';throw error;}
    snapshots.set(file,hash);return hash;
  };
  const read = async file=>{const bytes=await fs.readFile(file);recordSnapshot(file,bytes);return bytes.toString('utf8');};
  const index = await indexSupporting(root, manifest);
  const adapter = { Uri:{file:fsPath=>({fsPath,scheme:'file'})}, FileType:{File:1}, workspace:{getWorkspaceFolder:()=>({uri:{fsPath:root}}),fs:{stat:async uri=>({type:(await fs.stat(uri.fsPath)).isFile()?1:0}),readFile:uri=>fs.readFile(uri.fsPath)}} };
  async function mediaFor(file, images) {
    const result=Object.create(null);
    for(const src of images) {
      try {
        const uri=await inspectImage(adapter,{uri:{scheme:'file',fsPath:file}},src);
        const bytes=await fs.readFile(uri.fsPath), hash=recordSnapshot(uri.fsPath,bytes), name=`assets/${hash}${path.extname(uri.fsPath).toLowerCase()}`;
        assets.set(name,bytes);result[src]={url:name};
      } catch(error) {
        // Missing/unsupported resources remain readable placeholders. Escapes are fatal.
        if(error.code==='ESTORYSTALE')throw error;
        if (/outside|permitted resource root/.test(error.message)) throw Error('An image escapes the permitted project resource root');
        result[src]={error:error.message};warnings.push(`Image unavailable: ${src}: ${error.message}`);
      }
    }
    return result;
  }
  const scenes=[];
  for(const item of documents) {
    const isMatter = ['front','back'].includes(item.kind);
    if(!isMatter && !item.file.startsWith('scenes/'))throw Error('Scene files must be inside scenes/');
    const file=await localFile(root,item.file), original=await read(file), pacing=resolveSettings(original,manifest);
    if(!isMatter && pacing.warning)throw Error(pacing.warning);
    const source=publicationBody(original);
    if (isMatter && !source.replace(/<!--[\s\S]*?-->/g, '').trim()) continue;
    const parsed=isMatter ? matterScene(original) : parseScene(original,{prosePacing:pacing.enabled});
    const links=await describeLinks(index,parsed.wikiReferences);
    const media=await mediaFor(file,parsed.images);
    const data={source,matter:isMatter,sceneTitleInBody:!isMatter && item.kind!=='part-content' && hasSceneHeading(original, String(item.title)),media,supporting:{links:links.links,diagnostics:links.diagnostics},prosePacing:pacing.enabled,pacingSource:pacing.source};
    warnings.push(...parsed.diagnostics,...links.diagnostics);
    scenes.push({id:item.id,kind:isMatter?item.kind:'scene',partId:item.partId,label:String(item.label || ''),title:String(item.title),file:`content/${digest(item.id)}.json`,data});
  }
  const notes=Object.create(null), targets=Object.create(null);
  for(const id of index.files) {
    const note=await loadSupporting(index,`./${id}`,{readText:read});
    const media=await mediaFor(note.file,note.images);
    notes[id]={id,title:note.title,html:note.html,links:note.links,diagnostics:note.diagnostics,media};
    Object.assign(targets,note.links);
    warnings.push(...note.diagnostics);
  }
  for(const scene of scenes)Object.assign(targets,scene.data.supporting.links);
  const book={version:1,id:digest(documents.map(s=>s.id).join('\n')),title:String(manifest.title||'Story Teller'),sequence:orderedRoots(manifest).map(entry=>({kind:entry.kind,id:entry.item.id})),parts:manifest.parts.map(p=>({id:p.id,title:String(p.title),scenes:p.scenes})),scenes:scenes.filter(item=>item.kind==='scene').map(({data,...scene})=>scene),readingOrder:scenes.map(({data,...scene})=>scene),notes,targets};
  const analytics = analyticsConfig(options.analytics ?? manifest.webAnalytics, scenes);
  if (analytics) book.analytics = analytics;
  return {root,book,scenes,assets,snapshots,warnings:[...new Set(warnings)]};
}
async function exportWeb(projectRoot,destination,{beforeWrite=()=>{},analytics}={}) {
  const prepared=await prepareWeb(projectRoot,{analytics});
  const parent=await fs.realpath(path.dirname(destination));destination=path.join(parent,path.basename(destination));
  if(inside(prepared.root,destination))throw Error('Choose an export destination outside the source project');
  try{await fs.lstat(destination);throw Error('Export destination already exists; choose a new folder');}catch(error){if(error.code!=='ENOENT')throw error;}
  await beforeWrite(prepared);
  const temp=await fs.mkdtemp(path.join(parent,'.story-teller-web-'));
  let reserved=false;
  try {
    await fs.mkdir(path.join(temp,'assets'));await fs.mkdir(path.join(temp,'content'));
    for(const [name,bytes] of prepared.assets)await fs.writeFile(path.join(temp,name),bytes);
    for(const scene of prepared.scenes)await fs.writeFile(path.join(temp,scene.file),JSON.stringify(scene.data));
    await fs.writeFile(path.join(temp,'publication.json'),JSON.stringify(prepared.book));
    const base=path.join(__dirname,'..');
    for(const [source,target] of [['dist/web-reader.js','reader.js'],['media/reader.css','reader.css'],['media/web.css','web.css'],['media/web.html','index.html'],['dist/THIRD-PARTY.txt','licences-mermaid.txt']])await fs.copyFile(path.join(base,source),path.join(temp,target));
    if (prepared.book.analytics) {
      for (const name of ['analytics.html', 'analytics.js']) await fs.copyFile(path.join(base, 'media', name), path.join(temp, name));
      const html = await fs.readFile(path.join(temp, 'index.html'), 'utf8');
      await fs.writeFile(path.join(temp, 'index.html'), html.replace("script-src 'self';", "script-src 'self'; frame-src 'self';"));
    }
    // Only licences for code actually bundled; no extension licence is invented.
    await fs.mkdir(path.join(temp,'licences'));
    for(const module of ['markdown-it','argparse','entities','linkify-it','mdurl','punycode.js','uc.micro']) {
      const dir=path.join(base,'node_modules',module);const names=await fs.readdir(dir);const licence=names.find(name=>/^licen[cs]e(?:[-.]|$)/i.test(name));
      if(!licence)throw Error(`Missing bundled dependency licence: ${module}`);
      await fs.copyFile(path.join(dir,licence),path.join(temp,'licences',`${module}.txt`));
    }
    await beforeWrite(prepared);
    for(const [file,hash] of prepared.snapshots) {if(!inside(prepared.root,await fs.realpath(file))||digest(await fs.readFile(file))!==hash)throw Error('Publication source changed during export; try again');}
    await fs.mkdir(destination);reserved=true;
    await fs.rename(temp,destination);reserved=false;
    return {destination,warnings:prepared.warnings,scenes:prepared.book.scenes.length,pages:prepared.scenes.length,assets:prepared.assets.size};
  } catch(error) {if(reserved)await fs.rmdir(destination);throw error;}
  finally {await fs.rm(temp,{recursive:true,force:true});}
}
module.exports={analyticsConfig,prepareWeb,exportWeb,publicationBody,localFile};
if(require.main===module) {
  const [root,destination]=process.argv.slice(2);
  if(!root||!destination){console.error('Usage: node src/web-export.cjs PROJECT NEW_DESTINATION');process.exitCode=1;}
  else exportWeb(path.resolve(root),path.resolve(destination)).then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.error(error.message);process.exitCode=1;});
}
