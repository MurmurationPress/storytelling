'use strict';
const path = require('node:path');
const { supportingFolder } = require('./book-matter.cjs');
const fs = require('node:fs/promises');
const { indexSupporting, describeLinks, loadSupporting, SUPPORTING_FOLDER } = require('./supporting-content.cjs');
const { inside } = require('./media.cjs');
const { FORMATS, resolveMedia } = require('./media.cjs');
async function prepareSupporting(project, references) {
  try {
    if (!project) throw Error(`Open the adaptation project folder containing story-teller.project.json, then add notes in ${SUPPORTING_FOLDER}/`);
    const index = await indexSupporting(path.dirname(project.file), project.manifest);
    return { index, ...(await describeLinks(index, references)) };
  } catch (error) {
    return { index: null, links: Object.fromEntries(references.map(ref=>[ref.target,{error:error.message}])),
      diagnostics: references.map(ref=>`Line ${ref.line}: [[${ref.target}]]: ${error.message}`) };
  }
}
async function loadForPreview(vscode, webview, index, target) {
  if (!index) throw Error('Supporting Content is unavailable. Open the adaptation project folder and review its note diagnostics.');
  const note = await loadSupporting(index,target,{readText:async file=>{
    for (const document of vscode.workspace.textDocuments) {
      if(document.isClosed || !document.isDirty || document.uri.scheme!=='file')continue;
      try {if(await fs.realpath(document.uri.fsPath)===file)return document.getText();} catch { /* not this note */ }
    }
    return fs.readFile(file,'utf8');
  }});
  const prepared=await resolveMedia(vscode,{uri:vscode.Uri.file(note.file)},webview,{images:note.images,imageLines:note.imageLines});
  return {id:note.id,title:note.title,html:note.html,links:note.links,media:prepared.media,
    diagnostics:[...note.diagnostics,...prepared.diagnostics]};
}
function watchSupporting(vscode, index, changed) {
  // String globs only filter implicit workspace events. Establish a scoped
  // project watch, including when the host has no implicit workspace watcher.
  const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(vscode.Uri.file(index.project), '**/*'));
  const notify = uri => { if (inside(index.project, uri.fsPath) && (inside(index.root, uri.fsPath) || FORMATS[path.extname(uri.fsPath).toLowerCase()])) changed(uri); };
  const listeners = [watcher.onDidChange(notify), watcher.onDidCreate(notify), watcher.onDidDelete(notify)];
  return { root: index.root, dispose() { for (const listener of listeners) listener.dispose(); watcher.dispose(); } };
}
const supportingSource = (project, uri) => Boolean(project && uri.scheme === 'file' && inside(path.join(path.dirname(project.file), supportingFolder(project.manifest)), uri.fsPath));
module.exports={prepareSupporting,loadForPreview,supportingSource,watchSupporting};
