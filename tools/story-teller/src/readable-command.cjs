'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const {planMigration,reportFor,materialize,json,MANIFEST}=require('./readable-project.cjs');
const {planReimport}=require('./reimport-project.cjs');
const within=(root,file)=>file===root||file.startsWith(root+path.sep);
function assertSaved(vscode,roots) {
  if(vscode.workspace.textDocuments.some(doc=>doc.isDirty&&doc.uri.scheme==='file'&&roots.some(root=>within(root,doc.uri.fsPath))))throw Error('Save or revert all affected project/source buffers before reviewing this operation');
}
async function chooseProject(vscode) {
  const folders=[];
  for(const folder of vscode.workspace.workspaceFolders||[]) {
    try{await fs.access(path.join(folder.uri.fsPath,MANIFEST));folders.push(folder);}catch{/* not a project */}
  }
  if(folders.length===1)return fs.realpath(folders[0].uri.fsPath);
  if(folders.length)return (await vscode.window.showQuickPick(folders.map(folder=>({label:folder.name,root:folder.uri.fsPath})),{title:'Choose Story Teller project'}))?.root;
  const picked=await vscode.window.showOpenDialog({canSelectFolders:true,canSelectFiles:false,canSelectMany:false,openLabel:'Select Story Teller project'});
  return picked?.[0]&&fs.realpath(picked[0].fsPath);
}
function registerReadable(vscode,context) {
  let busy=false;
  let serial=0;
  const reviews=new Map();
  context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('story-teller-storage-review',{provideTextDocumentContent:uri=>reviews.get(uri.toString())||'Review expired. Run the command again.'}));
  context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(doc=>reviews.delete(doc.uri.toString())));
  for(const kind of ['migration','reimport'])context.subscriptions.push(vscode.commands.registerCommand(kind==='migration'?'storyTeller.migrateReadableFiles':'storyTeller.reimportManuscript',async()=>{
    if(busy)return;busy=true;
    try {
      const root=await chooseProject(vscode);if(!root)return;
      const roots=[root];assertSaved(vscode,roots);
      let plan;
      if(kind==='migration')plan=await planMigration(root);
      else {
        const source=await vscode.window.showOpenDialog({canSelectFolders:true,canSelectFiles:false,canSelectMany:false,openLabel:'Select the same manuscript book folder'});if(!source?.length)return;
        const scope=await vscode.window.showOpenDialog({canSelectFolders:true,canSelectFiles:false,canSelectMany:false,openLabel:'Select containing vault / asset root (may be the book folder)'});if(!scope?.length)return;
        roots.push(await fs.realpath(source[0].fsPath),await fs.realpath(scope[0].fsPath));assertSaved(vscode,roots);
        if(!within(roots[2],roots[1]))throw Error('The asset root must contain the book folder');
        plan=await planReimport(root,roots[1],roots[2]);
      }
      const report=reportFor(plan);
      const uri=vscode.Uri.parse(`story-teller-storage-review:/review-${++serial}.json`);
      reviews.set(uri.toString(),json(report));
      await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(uri),{preview:false});
      if(plan.noop){await vscode.window.showInformationMessage(`Story Teller: already ${kind==='migration'?'readable':'up to date'}; no files changed.`);return;}
      if(plan.blockers.length){await vscode.window.showWarningMessage(`Story Teller: ${plan.blockers.length} blocking issue(s). Review the JSON report; original project is unchanged.`);return;}
      const action=await vscode.window.showQuickPick(['Dry run only','Create Validated Copy'],{title:`Review ${kind}: ${Object.entries(plan.mapping).filter(([a,b])=>a!==b).length} moves, ${plan.changes.length} edited/new files`,placeHolder:'The JSON report is the dry-run preview. Cancel leaves all files unchanged.'});
      if(action!=='Create Validated Copy')return;
      const name=await vscode.window.showInputBox({title:'Validated sibling project folder',value:path.basename(root)+(kind==='migration'?' - readable':' - reimported'),validateInput:value=>!value.trim()||value!==path.basename(value)||/[\\/:*?"<>|\x00-\x1f]/.test(value)||value==='.'||value==='..'?'Enter a new sibling folder name':null});if(name===undefined)return;
      const destination=path.join(path.dirname(root),name.trim());
      assertSaved(vscode,roots);
      const result=await materialize(plan,destination,{beforeCommit:()=>assertSaved(vscode,roots)});
      const open=await vscode.window.showInformationMessage(`Validated copy: ${result.destination}. Original retained at ${root}. Review the migration report and Git diff before replacing your working copy.`,'Open Copy');
      if(open==='Open Copy')await vscode.commands.executeCommand('vscode.openFolder',vscode.Uri.file(destination),true);
    }catch(error){await vscode.window.showErrorMessage(`Story Teller ${kind}: ${error.message}`);}
    finally{busy=false;}
  }));
}
module.exports={registerReadable,chooseProject,assertSaved};
