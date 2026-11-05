'use strict';
const path=require('node:path');
const fs=require('node:fs/promises');
const {inventory,readManifest,readRewriteText,rewriteReferences,remapManifest,MANIFEST,REPORT,json}=require('./readable-project.cjs');
const {assertAuthoredPreserved}=require('./source-preservation.cjs');
const {key,hash,slug}=require('./readable-paths.cjs');
const {portablePath}=require('./book-matter.cjs');
function scenePath(name) {
  portablePath(name);
  if(!name.startsWith('scenes/')||!name.endsWith('.md'))throw Error('Use a Markdown path within scenes/');
  for(const part of name.split('/'))if(/[<>:"|?*]|[. ]$/.test(part)||/^(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³])(?:\.|$)/i.test(part)||Buffer.byteLength(part)>140)throw Error('Choose portable path segments without reserved names or trailing dots/spaces');
  return name;
}
async function planSceneMove(root,id,name,{repair=false}={}) {
  root=await fs.realpath(root);scenePath(name);
  const before=await inventory(root),manifest=await readManifest(root);
  if(manifest.version!==2)throw Error('Migrate Project to Readable Files before renaming project scenes');
  const scene=manifest.scenes.find(s=>s.id===id);if(!scene)throw Error('Scene is no longer in this project');
  const from=scene.file;
  if(from===name)return {root,before,mapping:{},changes:[],noop:true};
  if(key(from)===key(name))throw Error('For a case-only rename, first move to a distinct temporary name');
  const existing=[...Object.keys(before.files),...before.directories],segments=name.split('/');
  for(let i=1;i<=segments.length;i++) {
    const prefix=segments.slice(0,i).join('/'),alias=existing.find(file=>key(file)===key(prefix)&&file!==prefix);
    if(alias)throw Error(`Case-insensitive or Unicode path collision: ${prefix} aliases ${alias}; use the existing parent spelling`);
    if(i<segments.length&&Object.hasOwn(before.files,prefix))throw Error(`Destination parent is a file: ${prefix}`);
  }
  if(repair) {
    if(before.files[from]||!before.files[name])throw Error('Repair requires a missing old file and an existing new file');
  } else if(Object.keys(before.files).some(f=>key(f)===key(name))||before.directories.some(f=>key(f)===key(name)))throw Error('Destination exists; never overwrite it');
  const mapping={[from]:name},changes=[];
  const next=remapManifest(manifest,mapping);
  next.pathAliases={...manifest.pathAliases,[from]:id};
  for(const file of Object.keys(before.files)) {
    if(file===MANIFEST||file===manifest.importState||file===REPORT||!/\.(md|chat|mmd|json|ya?ml|txt)$/i.test(file))continue;
    const source=await readRewriteText(root,file),old=repair&&file===name?from:file;
    const content=rewriteReferences(source,old,mapping[old]||file,mapping);
    assertAuthoredPreserved(source,content,old,mapping[old]||file,mapping);
    if(content!==source)changes.push({file,content});
  }
  if(manifest.importState) {
    const state=JSON.parse(await readRewriteText(root,manifest.importState));
    for(const output of state.outputs) {
      const file=repair&&output.file===from?name:output.file;
      const change=changes.find(c=>c.file===file);
      if(change&&before.files[file]===output.outputHash)output.outputHash=hash(change.content);
      if(output.file===from)output.file=name;
    }
    state.managed=remapManifest(state.managed,mapping);
    changes.push({file:manifest.importState,content:json(state)});
  }
  changes.push({file:MANIFEST,content:json(next)});
  return {root,before,mapping,changes,noop:false,from,name,repair};
}
function workspaceMove(vscode,plan,{includeRename=true}={}) {
  const edit=new vscode.WorkspaceEdit();
  if(plan.noop)return edit;
  if(includeRename&&!plan.repair)edit.renameFile(vscode.Uri.file(path.join(plan.root,plan.from)),vscode.Uri.file(path.join(plan.root,plan.name)),{overwrite:false});
  for(const change of plan.changes) {
    const name=change.file===plan.from&&!plan.repair?plan.name:change.file;
    edit.replace(vscode.Uri.file(path.join(plan.root,name)),new vscode.Range(0,0,Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER),change.content);
  }
  return edit;
}
function registerSceneFiles(vscode,context) {
  context.subscriptions.push(vscode.commands.registerCommand('storyTeller.renameSceneFile',async()=>{
    try {
      const {chooseProject,assertSaved}=require('./readable-command.cjs');
      const root=await chooseProject(vscode);if(!root)return;assertSaved(vscode,[root]);
      const manifest=await readManifest(root);
      const picked=await vscode.window.showQuickPick(manifest.scenes.map(s=>({label:s.title,description:s.file,scene:s})),{title:'Rename / move / repair a scene file'});if(!picked)return;
      let repair=false;
      try{await fs.access(path.join(root,picked.scene.file));}catch(error){if(error.code!=='ENOENT')throw error;repair=true;}
      const name=await vscode.window.showInputBox({title:repair?'Repair externally moved scene: enter its current path':'New scene path (title and order stay unchanged)',value:repair?picked.scene.file:`scenes/${slug(picked.scene.title)}.md`,validateInput:value=>{try{scenePath(value);return null;}catch(e){return e.message;}}});if(name===undefined)return;
      const plan=await planSceneMove(root,picked.scene.id,name,{repair});
      if(plan.noop)return;
      assertSaved(vscode,[root]);
      if(json(await inventory(root))!==json(plan.before))throw Error('Project changed; run rename again');
      const edit=workspaceMove(vscode,plan);
      if(!await vscode.workspace.applyEdit(edit))throw Error('Editor declined the rename transaction; inspect the project before retrying');
      // Inputs were explicitly required clean. Save only this operation's edits;
      // otherwise a saved renamed file could coexist with an old manifest on disk.
      for(const change of plan.changes) {
        const file=plan.mapping[change.file]||change.file;
        const document=await vscode.workspace.openTextDocument(vscode.Uri.file(path.join(root,file)));
        if(document.getText()!==change.content)throw Error(`Concurrent edit after rename: ${file}. Review/Undo the workspace edit before retrying`);
        if(!await document.save())throw Error(`Could not save ${file}; original content is retained in editor buffers. Save all affected documents or Undo before continuing`);
      }
      await vscode.window.showInformationMessage('Scene path and project references saved. Identity, title and order are unchanged.');
    }catch(error){await vscode.window.showErrorMessage(`Story Teller scene files: ${error.message}`);}
  }));
  // External operations remain ordinary filesystem operations. Diagnose stale
  // membership; do not guess a replacement by its title.
  if(vscode.workspace.onDidRenameFiles)context.subscriptions.push(vscode.workspace.onDidRenameFiles(async event=>{
    for(const item of event.files) {
      if(!item.oldUri.fsPath.includes(`${path.sep}scenes${path.sep}`))continue;
      const {projectFor}=require('./pacing-command.cjs');
      try{const p=await projectFor(vscode,item.newUri);if(p?.manifest.scenes.some(s=>path.resolve(path.dirname(p.file),s.file)===item.oldUri.fsPath))await vscode.window.showWarningMessage('A scene moved outside the Story Teller rename command. Use Rename / Move Scene File to repair its manifest reference before preview/export.');}catch{/* ordinary non-project file */}
    }
  }));
}
module.exports={scenePath,planSceneMove,workspaceMove,registerSceneFiles};
