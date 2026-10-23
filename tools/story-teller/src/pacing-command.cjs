'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { orderedScenes } = require('./manuscript-import.cjs');
const { sceneEdit, resolveSettings, projectEdit, projectSetting } = require('./pacing-settings.cjs');
function projectFile(vscode, uri) {
  if (uri?.scheme !== 'file') return null;
  const folder = (vscode.workspace.workspaceFolders || []).find(item => {
    const relative = path.relative(item.uri.fsPath, uri.fsPath);
    return relative && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
  });
  return folder && path.join(folder.uri.fsPath, 'story-teller.project.json');
}
async function projectFor(vscode, uri) {
  const file = projectFile(vscode, uri);
  if (!file) return null;
  try {
    const raw = await fs.readFile(file, 'utf8');
    const manifest = JSON.parse(raw);
    orderedScenes(manifest);
    projectSetting(manifest);
    return { file, raw, manifest };
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}
function registerPacing(vscode, context) {
  context.subscriptions.push(vscode.commands.registerCommand('storyTeller.setBookProsePacing', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return void vscode.window.showInformationMessage('Open a scene in an imported Story Teller project first.');
    try {
      const project = await projectFor(vscode, editor.document.uri);
      if (!project) return void vscode.window.showInformationMessage('Open a scene inside an imported Story Teller project first.');
      const effective = resolveSettings(editor.document.getText(), project.manifest);
      const choice = await vscode.window.showQuickPick([
        { label: 'On', value: 'on', description: 'Reveal top-level prose paragraphs in sequence' },
        { label: 'Off', value: 'off', description: 'Preserve contiguous prose reveal' }
      ], { title: `Book prose pacing · ${project.manifest.title} · effective ${effective.value} from ${effective.source}`, placeHolder: `Current book: ${projectSetting(project.manifest) || 'unset (Off)'} · this scene: ${effective.value} from ${effective.source}` });
      if (!choice) return;
      if (await fs.readFile(project.file, 'utf8') !== project.raw) return void vscode.window.showWarningMessage('The project changed while choosing pacing. Run the command again.');
      const next = projectEdit(project.manifest, choice.value);
      await fs.writeFile(project.file, JSON.stringify(next, null, 2) + '\n');
      vscode.window.showInformationMessage(`Book prose pacing is ${choice.label}. Scene overrides still take precedence.`);
      return next;
    } catch (error) { vscode.window.showErrorMessage(`Story Teller book pacing: ${error.message}`); }
  }));
  context.subscriptions.push(vscode.commands.registerCommand('storyTeller.setSceneProsePacing', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'markdown' || editor.document.uri.scheme !== 'file')
      return void vscode.window.showInformationMessage('Open a saved Markdown scene first.');
    const document = editor.document, source = document.getText(), version = document.version;
    try {
      const project = await projectFor(vscode, document.uri);
      const effective = resolveSettings(source, project?.manifest);
      if (effective.warning) return void vscode.window.showWarningMessage(effective.warning);
      const choice = await vscode.window.showQuickPick([
        { label: 'Inherit', value: 'inherit', description: `Use book setting (${projectSetting(project?.manifest) || 'unset → Off'})` },
        { label: 'On', value: 'on', description: 'Pace this scene, overriding the book' },
        { label: 'Off', value: 'off', description: 'Show contiguous prose, overriding the book' }
      ], { title: `Scene prose pacing · effective ${effective.value} from ${effective.source}`, placeHolder: 'Choose a scene override, or inherit the book' });
      if (!choice) return;
      if (document.version !== version || document.getText() !== source) return void vscode.window.showWarningMessage('The scene changed while choosing pacing. Run the command again.');
      const replacement = sceneEdit(source, choice.value);
      if (replacement === source) return;
      const edit = new vscode.WorkspaceEdit();
      edit.replace(document.uri, new vscode.Range(document.positionAt(0), document.positionAt(source.length)), replacement);
      await vscode.workspace.applyEdit(edit); // One editor Undo; no automatic save.
    } catch (error) { vscode.window.showErrorMessage(`Story Teller scene pacing: ${error.message}`); }
  }));
}
module.exports = { registerPacing, projectFor, projectFile };
