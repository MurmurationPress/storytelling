'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { scaffold, metadataMatter } = require('./book-matter.cjs');
const { orderedScenes, parseMeta } = require('./manuscript-import.cjs');
async function upgradeProject(root, { beforeWrite = () => {} } = {}) {
  const file = path.join(root, 'story-teller.project.json'), raw = await fs.readFile(file, 'utf8');
  const manifest = JSON.parse(raw); orderedScenes(manifest);
  let front = '', warnings = [];
  if (manifest.bookFile) {
    try {
      const { localFile } = require('./web-export.cjs');
      const book = parseMeta(await fs.readFile(await localFile(await fs.realpath(root), manifest.bookFile), 'utf8'), manifest.bookFile);
      front = metadataMatter(book.data);
    } catch (error) { warnings.push(`Book metadata unavailable; new front matter is empty: ${error.message}`); }
  }
  await beforeWrite();
  if (await fs.readFile(file, 'utf8') !== raw) throw Error('Project configuration changed; run the command again');
  const content = { front };
  for (const kind of ['front','back']) if (manifest.matter?.[kind]?.sourceFile) {
    try { const { localFile } = require('./web-export.cjs'); content[kind] = await fs.readFile(await localFile(await fs.realpath(root), manifest.matter[kind].sourceFile), 'utf8'); }
    catch (error) { warnings.push(`${kind} matter source unavailable: ${error.message}`); }
  }
  const result = await scaffold(root, manifest, content);
  const updated = JSON.stringify(result.manifest, null, 2) + '\n';
  // An unchanged manifest needs no write. Never replace an editor's dirty buffer.
  await beforeWrite();
  if (await fs.readFile(file, 'utf8') !== raw) throw Error('Project configuration changed; scaffold files were preserved; run again to register them');
  if (JSON.stringify(result.manifest) !== JSON.stringify(manifest)) {
    const temporary = path.join(root, `.story-teller-matter-${randomUUID()}.tmp`);
    try {
      await fs.writeFile(temporary, updated, { flag: 'wx' });
      await beforeWrite();
      if (await fs.readFile(file, 'utf8') !== raw) throw Error('Project configuration changed; scaffold files remain preserved; run again');
      await fs.rename(temporary, file);
    } finally { await fs.rm(temporary, { force: true }); }
  }
  return { ...result, warnings };
}
function registerMatter(vscode, context) {
  context.subscriptions.push(vscode.commands.registerCommand('storyTeller.addBookMatter', async () => {
    try {
      const projects = [];
      for (const folder of vscode.workspace.workspaceFolders || []) {
        try { await fs.access(path.join(folder.uri.fsPath, 'story-teller.project.json')); projects.push(folder); } catch { /* not a project */ }
      }
      if (!projects.length) return void vscode.window.showInformationMessage('Open an adaptation project folder first.');
      const choice = projects.length === 1 ? projects[0] : (await vscode.window.showQuickPick(projects.map(folder => ({ label: folder.name, folder })), { title: 'Add Book Matter · choose project' }))?.folder;
      if (!choice) return;
      const root = choice.uri.fsPath;
      const beforeWrite = () => {
        if (vscode.workspace.textDocuments.some(doc => doc.isDirty && doc.uri.scheme === 'file' && doc.uri.fsPath === path.join(root, 'story-teller.project.json'))) throw Error('Save or revert project configuration before upgrading; author documents are not changed.');
      };
      const result = await upgradeProject(root, { beforeWrite });
      void vscode.window.showInformationMessage(`Created: ${result.created.join(', ') || 'none'}. Already present (unchanged): ${result.present.join(', ') || 'none'}.${result.warnings.length ? '\n' + result.warnings.join('\n') : ''}`);
    } catch (error) { await vscode.window.showErrorMessage(`Story Teller book matter: ${error.message}`); }
  }));
}
module.exports = { upgradeProject, registerMatter };
