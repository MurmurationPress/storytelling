'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const { exportWeb }=require('./web-export.cjs');
const { inside }=require('./media.cjs');
function dirtyPublication(vscode,root) {
  return vscode.workspace.textDocuments.filter(doc=>!doc.isClosed&&doc.isDirty&&doc.uri.scheme==='file'&&inside(root,doc.uri.fsPath));
}
function registerWebExport(vscode,context) {
  context.subscriptions.push(vscode.commands.registerCommand('storyTeller.exportWeb',async()=>{
    try {
      const projects=[];
      for(const folder of vscode.workspace.workspaceFolders||[])try {await fs.access(path.join(folder.uri.fsPath,'story-teller.project.json'));projects.push(folder);}catch{/* Not an adaptation project. */}
      if(!projects.length)return void vscode.window.showInformationMessage('Open the adaptation project folder containing story-teller.project.json first.');
      const selected=projects.length===1?projects[0]:await vscode.window.showQuickPick(projects.map(folder=>({label:folder.name,folder})),{title:'Export Web Reader · choose project'}).then(choice=>choice?.folder);
      if(!selected)return;
      const root=await fs.realpath(selected.uri.fsPath);
      const guard=()=>{const dirty=dirtyPublication(vscode,root);if(dirty.length)throw Error(`Save or revert unsaved project files before export: ${dirty.map(doc=>path.relative(root,doc.uri.fsPath)).join(', ')}`);};
      guard();
      const destination=await vscode.window.showSaveDialog({title:'Choose a NEW web reader folder outside the source project',saveLabel:'Choose export folder',defaultUri:vscode.Uri.file(path.join(path.dirname(root),`${path.basename(root)}-web`))});
      if(!destination)return;
      if(destination.scheme!=='file')throw Error('Choose a local destination');
      const confirmed=await vscode.window.showInformationMessage('Export saved scenes, supporting Markdown and referenced local images into a new static reader folder? No source files will be changed.',{modal:true},'Export');
      if(confirmed!=='Export')return;
      guard();
      const result=await exportWeb(root,destination.fsPath,{beforeWrite:guard});
      const detail=result.warnings.length?`\nReview warnings:\n${result.warnings.join('\n')}`:'';
      await vscode.window.showInformationMessage(`Exported ${result.scenes} scenes to ${result.destination}. Serve this folder over HTTP.${detail}`,{modal:true});
    } catch(error){vscode.window.showErrorMessage(`Story Teller web export: ${error.message}`);}
  }));
}
module.exports={registerWebExport,dirtyPublication};
