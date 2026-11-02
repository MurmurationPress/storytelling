'use strict';
const path = require('node:path');
const fs = require('node:fs/promises');
const { orderedScenes } = require('./manuscript-import.cjs');
const { matterDocuments } = require('./book-matter.cjs');
const { localFile } = require('./web-export.cjs');
const { migrateComponentMetadata } = require('./migrate-component-metadata.cjs');
// Explicit manifest membership only. Never discover a manuscript/vault or notes.
async function planProjectMigration(root, manifest, read = file => fs.readFile(file,'utf8')) {
  root = await fs.realpath(root);
  const files = [], seen = new Set(), summary = {converted:0,alreadyMigrated:0,skipped:0,ambiguous:0};
  for (const name of new Set([...orderedScenes(manifest),...matterDocuments(manifest)].map(item=>item.file))) {
    const file = await localFile(root,name);
    if (seen.has(file)) continue;
    seen.add(file);
    const source = await read(file);
    const result = migrateComponentMetadata(source);
    files.push({file,name,...result});
    for (const key of Object.keys(summary)) summary[key] += result.summary[key];
  }
  return {root,files,summary};
}
function registerProjectMigration(vscode, context) {
  let busy = false;
  context.subscriptions.push(vscode.commands.registerCommand('storyTeller.migrateProjectMetadata', async () => {
    if (busy) return;
    const document = vscode.window.activeTextEditor?.document;
    if (!document) return;
    busy = true;
    const report = vscode.window.createOutputChannel('Story Teller Project Metadata Migration');
    context.subscriptions.push(report);
    try {
      const {projectFor} = require('./pacing-command.cjs');
      const project = await projectFor(vscode,document.uri);
      if (!project) { vscode.window.showInformationMessage('Open a scene in a Story Teller adaptation project.'); return; }
      const unchangedProject = async () => {
        if (vscode.workspace.textDocuments?.some(doc => doc.uri.fsPath === project.file && doc.isDirty) || await fs.readFile(project.file,'utf8') !== project.raw) throw Error('Project manifest changed or has unsaved edits; finish the manifest edit and restart migration review');
      };
      for (;;) {
        await unchangedProject();
        const plan = await planProjectMigration(path.dirname(project.file),project.manifest,async file => (await vscode.workspace.openTextDocument(vscode.Uri.file(file))).getText());
        report.clear();
        for (const entry of plan.files) {
          report.appendLine(`${entry.name}: ${entry.summary.converted} to migrate; ${entry.summary.alreadyMigrated} already migrated; ${entry.summary.skipped} skipped; ${entry.summary.ambiguous} ambiguous`);
          for (const item of entry.cases) report.appendLine(`${entry.name}:${item.line}: ${item.status === 'converted' ? 'to migrate' : item.status === 'alreadyMigrated' ? 'already migrated' : item.status} — ${item.reason}`);
          for (const warning of entry.warnings) report.appendLine(`${entry.name}:${warning.line}: ${warning.message}`);
        }
        report.show(true);
        const s = plan.summary;
        const picked = await vscode.window.showQuickPick([
          ...plan.files.filter(file=>file.count || file.warnings.length).map(file=>({label:file.name,description:`${file.count} safe change(s); ${file.summary.ambiguous} ambiguous`,file:file.file})),
          {label:'Finish review',file:null}
        ], {title:`Project metadata: ${s.converted} to migrate; ${s.alreadyMigrated} already migrated; ${s.skipped} skipped; ${s.ambiguous} ambiguous`,placeHolder:'Review and Apply each file separately. Changes stay unsaved and undoable.'});
        if (!picked?.file) return;
        await unchangedProject();
        await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(vscode.Uri.file(picked.file)),{preview:false});
        await vscode.commands.executeCommand('storyTeller.migrateComponentMetadata',{safeOnly:true});
      }
    } catch(error) { vscode.window.showWarningMessage(`Project migration stopped: ${error.message}`); }
    finally {busy=false;}
  }));
}
module.exports = {planProjectMigration,registerProjectMigration};
