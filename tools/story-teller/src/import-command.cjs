'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { scan, discover, plan, resolveAssets, writeProject, orderedScenes } = require('./manuscript-import.cjs');
const { inside } = require('./media.cjs');
function registerImport(vscode, context) {
  const tree = new ProjectTree(vscode);
  context.subscriptions.push(vscode.window.registerTreeDataProvider('storyTeller.outline', tree));
  context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(() => tree.refresh()));
  const watcher = vscode.workspace.createFileSystemWatcher('**/story-teller.project.json');
  watcher.onDidChange(() => tree.refresh()); watcher.onDidCreate(() => tree.refresh()); watcher.onDidDelete(() => tree.refresh());
  context.subscriptions.push(watcher);
  context.subscriptions.push(vscode.commands.registerCommand('storyTeller.openProjectScene', async (projectRoot, scene) => {
    try {
      const root = await fs.realpath(projectRoot);
      const candidate = path.resolve(root, scene.file);
      if (!inside(root, candidate) || !inside(path.join(root, 'scenes'), candidate) || !candidate.endsWith('.md') || !inside(root, await fs.realpath(candidate))) throw Error('Scene path is outside the imported project');
      await vscode.window.showTextDocument(vscode.Uri.file(candidate), { preview: false });
    } catch (error) { vscode.window.showErrorMessage(`Story Teller scene: ${error.message}`); }
  }));
  context.subscriptions.push(vscode.commands.registerCommand('storyTeller.importManuscript', async () => {
    try {
      const picked = await vscode.window.showOpenDialog({ canSelectFolders: true, canSelectFiles: false, canSelectMany: false, openLabel: 'Select manuscript book folder' });
      if (!picked?.length) return;
      const folder = picked[0].fsPath;
      const discovery = discover(await scan(folder), folder);
      if (discovery.errors.length) { await vscode.window.showErrorMessage(discovery.errors.join('\n')); return; }
      const fields = discovery.fields.map(field => ({ label: field.key, description: `${field.count} items · ${field.samples.join(', ')}`, field }));
      if (!fields.length) { await vscode.window.showErrorMessage('No frontmatter order fields found in manuscript items.'); return; }
      const choice = await vscode.window.showQuickPick(fields, { title: 'Choose the frontmatter order key', placeHolder: 'The selected key orders parts and their scenes; filenames never determine order' });
      if (!choice) return;
      let prepared = await resolveAssets(plan(discovery, choice.field.key), folder);
      if (prepared.unresolved.length && !prepared.errors.length) {
        const reply = await vscode.window.showWarningMessage(`${prepared.unresolved.length} supported media reference(s) need a broader source scope. Select the vault/asset root containing shared assets.`, { modal: true }, 'Select Asset Root');
        if (reply !== 'Select Asset Root') return;
        const roots = await vscode.window.showOpenDialog({ canSelectFolders: true, canSelectFiles: false, canSelectMany: false, openLabel: 'Select asset root' });
        if (!roots?.length) return;
        const root = await fs.realpath(roots[0].fsPath);
        if (!inside(root, await fs.realpath(folder))) { await vscode.window.showErrorMessage('The asset root must contain the selected book folder.'); return; }
        prepared = await resolveAssets(plan(discovery, choice.field.key), root);
      }
      const rows = [
        { label: 'Review proposed import', description: `${prepared.parts.length} parts · ${prepared.scenes.length} scenes · ${prepared.assets.length} copied assets` },
        { label: `Book metadata: ${prepared.book.data.title || path.basename(prepared.book.file)}`, detail: prepared.book.file },
        ...prepared.parts.flatMap((part, i) => [
          { label: `Part ${i + 1}: ${part.title}`, description: String(part.orderValue), detail: `${part.source} · ${part.intro ? 'Manuscript-bearing note enters as first scene' : 'Structural note; no scene file'}` },
          ...prepared.scenes.filter(s => s.partId === part.id).map(s => ({ label: `${s.label} ${s.title}`, description: s.kind === 'part-content' ? 'Part introduction' : String(s.orderValue), detail: s.source }))
        ]),
        ...prepared.assets.map(a => ({ label: `Asset: ${a.name}`, detail: a.source })),
        ...prepared.warnings.map(w => ({ label: `Warning: ${w}`, alwaysShow: true })),
        ...prepared.unresolved.map(w => ({ label: `Unresolved asset: ${w}`, alwaysShow: true })),
        ...prepared.errors.map(w => ({ label: `Order error: ${w}`, alwaysShow: true })),
        { label: 'Continue to destination…', description: prepared.errors.length || prepared.unresolved.length ? 'Unavailable until errors and missing supported assets are resolved' : 'No files have been written', action: 'continue', alwaysShow: true }
      ];
      const review = await vscode.window.showQuickPick(rows, { title: 'Review Part–Scene sequence, files, assets and warnings', placeHolder: 'Select Continue to destination… after reviewing', matchOnDescription: true, matchOnDetail: true });
      if (review?.action !== 'continue') return;
      if (prepared.errors.length || prepared.unresolved.length) { await vscode.window.showErrorMessage('Resolve order errors and supported asset references before importing.'); return; }
      const destinationParent = await vscode.window.showOpenDialog({ canSelectFolders: true, canSelectFiles: false, canSelectMany: false, openLabel: 'Choose destination parent folder' });
      if (!destinationParent?.length) return;
      const name = await vscode.window.showInputBox({ title: 'New Story Teller project folder', prompt: 'A new folder will be created; existing content will never be overwritten', value: `Story Teller - ${prepared.book.data.title || 'Manuscript'}`, validateInput: value => !value.trim() || value !== path.basename(value) || /[\\/\x00-\x1f]/.test(value) || value === '.' || value === '..' ? 'Enter a single new folder name' : null });
      if (name === undefined) return;
      const destination = path.join(destinationParent[0].fsPath, name.trim());
      if (inside(await fs.realpath(folder), await fs.realpath(path.dirname(destination)))) { await vscode.window.showErrorMessage('Choose a destination outside the source book folder.'); return; }
      try { await fs.lstat(destination); await vscode.window.showErrorMessage('Destination already exists; choose a new project name.'); return; } catch (error) { if (error.code !== 'ENOENT') throw error; }
      const confirmed = await vscode.window.showInformationMessage(`Create ${prepared.scenes.length}-scene adaptation at ${destination}? Source files remain unchanged.`, { modal: true }, 'Import');
      if (confirmed !== 'Import') return;
      await writeProject(prepared, destination);
      const open = await vscode.window.showInformationMessage(`Story Teller project created: ${destination}`, 'Open Project Folder');
      if (open === 'Open Project Folder') await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(destination), true);
    } catch (error) { await vscode.window.showErrorMessage(`Story Teller import: ${error.message}`); }
  }));
}
class ProjectTree {
  constructor(vscode) { this.vscode = vscode; this.change = new vscode.EventEmitter(); this.onDidChangeTreeData = this.change.event; }
  refresh() { this.change.fire(undefined); }
  async getChildren(element) {
    if (element?.part) return element.part.scenes.map(id => this.sceneItem(element.root, element.manifest.scenes.find(s => s.id === id)));
    const result = [];
    for (const folder of this.vscode.workspace.workspaceFolders || []) {
      const file = path.join(folder.uri.fsPath, 'story-teller.project.json');
      try {
        const manifest = JSON.parse(await fs.readFile(file, 'utf8'));
        orderedScenes(manifest);
        for (const part of manifest.parts) result.push({ root: folder.uri.fsPath, manifest, part, label: part.title,
          description: `Part ${manifest.parts.indexOf(part) + 1}`, collapsibleState: this.vscode.TreeItemCollapsibleState.Expanded });
      } catch (error) {
        if (error.code !== 'ENOENT') result.push({ label: `Project needs review: ${error.message}`, description: folder.name, collapsibleState: this.vscode.TreeItemCollapsibleState.None });
      }
    }
    return result;
  }
  sceneItem(root, scene) { return { label: `${scene.label} ${scene.title}`, tooltip: scene.file,
    collapsibleState: this.vscode.TreeItemCollapsibleState.None,
    command: { command: 'storyTeller.openProjectScene', title: 'Open Story Teller scene', arguments: [root, scene] } }; }
  getTreeItem(element) { return element; }
}
module.exports = { registerImport, ProjectTree };
