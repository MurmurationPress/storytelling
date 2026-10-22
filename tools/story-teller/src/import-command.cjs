'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const { scan, discover, plan, resolveAssets, writeProject, orderedScenes } = require('./manuscript-import.cjs');
const { inside } = require('./media.cjs');
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const pendingOutlineMatches = (pending, folders) => Boolean(pending) && folders.some(folder => path.resolve(folder.uri.fsPath) === path.resolve(pending));
function showImportReview(vscode, prepared) {
  return new Promise(resolve => {
    const panel = vscode.window.createWebviewPanel('storyTeller.importReview', 'Story Teller · Review import', vscode.ViewColumn.Active,
      { enableScripts: true, enableCommandUris: false, localResourceRoots: [] });
    const nonce = randomBytes(16).toString('hex');
    let settled = false;
    const done = result => { if (settled) return; settled = true; resolve(result); panel.dispose(); };
    const list = values => values.length ? `<ul>${values.map(value => `<li>${escapeHtml(value)}</li>`).join('')}</ul>` : '<p>None.</p>';
    const parts = prepared.parts.map((part, i) => `<section><h3>Part ${i + 1}: ${escapeHtml(part.title)}</h3><p>Order ${escapeHtml(part.orderValue)} · ${escapeHtml(part.intro ? 'Manuscript-bearing note; first scene' : 'Structural note')}</p><p class="path">${escapeHtml(part.source)}</p><ol>${prepared.scenes.filter(scene => scene.partId === part.id).map(scene => `<li><strong>${escapeHtml(scene.label)} ${escapeHtml(scene.title)}</strong> · ${escapeHtml(scene.orderValue ?? 'Part introduction')}<br><span class="path">${escapeHtml(scene.source)}</span></li>`).join('')}</ol></section>`).join('');
    const excluded = prepared.warnings.filter(w => /^Excluded\b/.test(w));
    const warnings = prepared.warnings.filter(w => !/^Excluded\b/.test(w));
    const blocked = prepared.errors.length || prepared.unresolved.length;
    panel.webview.html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; img-src 'none'; connect-src 'none'; base-uri 'none'; form-action 'none'"><style nonce="${nonce}">html,body{height:100%;margin:0;color:var(--vscode-foreground);background:var(--vscode-editor-background);font:var(--vscode-font-size) var(--vscode-font-family)}body{display:flex;flex-direction:column}main{overflow:auto;flex:1;padding:1rem 1.4rem;overflow-wrap:anywhere}.path{word-break:break-all;opacity:.75}section{border-block-start:1px solid var(--vscode-panel-border);padding-block:.5rem}li{margin-block:.45rem}footer{position:sticky;bottom:0;display:flex;gap:.6rem;padding:.8rem 1.4rem;border-top:1px solid var(--vscode-panel-border);background:var(--vscode-editor-background)}button{padding:.4rem .85rem;color:var(--vscode-button-foreground);background:var(--vscode-button-background);border:0;cursor:pointer}button:focus-visible{outline:2px solid var(--vscode-focusBorder)}button:disabled{opacity:.5;cursor:not-allowed}</style></head><body><main><h1>Review manuscript import</h1><p><strong>Source book:</strong> ${escapeHtml(prepared.book.data.title || path.basename(prepared.book.file))}<br><span class="path">${escapeHtml(prepared.book.file)}</span></p><p><strong>Order key:</strong> ${escapeHtml(prepared.key)} · ${prepared.parts.length} parts · ${prepared.scenes.length} scenes · ${prepared.assets.length} supported assets</p><h2>Ordered Part–Scene sequence</h2>${parts}<h2>Assets to copy</h2>${list(prepared.assets.map(asset => `${asset.name} ← ${asset.source}`))}<h2>Exclusions</h2>${list(excluded)}<h2>Warnings</h2>${list(warnings)}<h2>Unresolved assets</h2>${list(prepared.unresolved)}<h2>Order errors</h2>${list(prepared.errors)}<p>No files have been written. Continue chooses a destination and asks for final confirmation.</p></main><footer><button id="back">Back</button><button id="continue" ${blocked ? 'disabled' : ''}>Continue</button><button id="cancel">Cancel</button></footer><script nonce="${nonce}">const api=acquireVsCodeApi();for(const id of ['back','continue','cancel'])document.getElementById(id).addEventListener('click',()=>api.postMessage(id));document.addEventListener('keydown',event=>{if(event.key==='Escape')api.postMessage('cancel')});document.getElementById('back').focus();</script></body></html>`;
    const listener = panel.webview.onDidReceiveMessage(message => { if (['back', 'continue', 'cancel'].includes(message)) done(message); });
    panel.onDidDispose(() => { listener.dispose(); if (!settled) { settled = true; resolve('cancel'); } });
  });
}
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
      let prepared;
      for (;;) {
        const choice = await vscode.window.showQuickPick(fields, { title: 'Choose the frontmatter order key', placeHolder: 'The selected key orders parts and their scenes; filenames never determine order' });
        if (!choice) return;
        prepared = await resolveAssets(plan(discovery, choice.field.key), folder);
      if (prepared.unresolved.length && !prepared.errors.length) {
        const reply = await vscode.window.showWarningMessage(`${prepared.unresolved.length} supported media reference(s) need a broader source scope. Select the vault/asset root containing shared assets.`, { modal: true }, 'Select Asset Root');
        if (reply !== 'Select Asset Root') return;
        const roots = await vscode.window.showOpenDialog({ canSelectFolders: true, canSelectFiles: false, canSelectMany: false, openLabel: 'Select asset root' });
        if (!roots?.length) return;
        const root = await fs.realpath(roots[0].fsPath);
        if (!inside(root, await fs.realpath(folder))) { await vscode.window.showErrorMessage('The asset root must contain the selected book folder.'); return; }
        prepared = await resolveAssets(plan(discovery, choice.field.key), root);
      }
        const review = await showImportReview(vscode, prepared);
        if (review === 'back') continue;
        if (review !== 'continue') return;
        break;
      }
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
      if (open === 'Open Project Folder') {
        await context.globalState.update('storyTeller.pendingOutline', destination);
        await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(destination), true);
      }
    } catch (error) { await vscode.window.showErrorMessage(`Story Teller import: ${error.message}`); }
  }));
  const pending = context.globalState.get('storyTeller.pendingOutline');
  if (pendingOutlineMatches(pending, vscode.workspace.workspaceFolders || [])) {
    void context.globalState.update('storyTeller.pendingOutline', undefined).then(async () => {
      await vscode.commands.executeCommand('workbench.view.extension.storyTeller');
      tree.refresh();
    });
  }
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
          description: `Part ${manifest.parts.indexOf(part) + 1}`, collapsibleState: manifest.parts.indexOf(part) === 0 ? this.vscode.TreeItemCollapsibleState.Expanded : this.vscode.TreeItemCollapsibleState.Collapsed });
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
module.exports = { registerImport, ProjectTree, showImportReview, pendingOutlineMatches };
