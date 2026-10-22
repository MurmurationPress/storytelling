'use strict';
// Runs inside the real Extension Development Host. This adapter only edits
// temporary test documents; the extension itself has no test-only commands.
const vscode = require('vscode');
const fs = require('node:fs/promises');
const path = require('node:path');
exports.run = async function () {
  const directory = process.env.STORY_TELLER_TEST_DIR;
  const sample = await fs.readFile(path.join(__dirname, '../samples/lantern.md'), 'utf8');
  const file = path.join(directory, 'scene.md');
  // Original fictional fixtures only; the author's untracked Art assets are never copied.
  await fs.cp(path.join(__dirname, '../samples/assets'), path.join(directory, 'assets'), { recursive: true });
  await fs.writeFile(file, sample);
  const document = await vscode.workspace.openTextDocument(vscode.Uri.file(file));
  const focusSource = async () => {
    await vscode.commands.executeCommand('workbench.action.focusFirstEditorGroup');
    await vscode.window.showTextDocument(document, { viewColumn: vscode.ViewColumn.One, preserveFocus: false });
    for (let attempt = 0; attempt < 4 && vscode.window.activeTextEditor?.document !== document; attempt++) {
      await vscode.commands.executeCommand('workbench.action.focusFirstEditorGroup');
      await vscode.window.showTextDocument(document, { viewColumn: vscode.ViewColumn.One, preserveFocus: false });
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (vscode.window.activeTextEditor?.document !== document) throw new Error('Test source editor did not become active');
  };
  await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
  await vscode.commands.executeCommand('storyTeller.previewScene');
  await fs.writeFile(path.join(directory, 'ready'), 'ready');
  let last = 0;
  for (;;) {
    await new Promise(resolve => setTimeout(resolve, 100));
    let request;
    try { request = JSON.parse(await fs.readFile(path.join(directory, 'request.json'), 'utf8')); } catch { continue; }
    if (request.id <= last) continue;
    last = request.id;
    if (request.action === 'stop') return;
    try {
      if (request.action === 'start-insert') {
        await focusSource();
        const editor = vscode.window.activeTextEditor;
        const start = request.start ?? document.getText().length;
        editor.selection = new vscode.Selection(document.positionAt(start), document.positionAt(request.end ?? start));
        await fs.rm(path.join(directory, 'insert-result.json'), { force: true });
        vscode.commands.executeCommand(request.wrap ? 'storyTeller.wrapSelectionAsChat' : 'storyTeller.insert').then(result => fs.writeFile(path.join(directory, 'insert-result.json'), JSON.stringify(result)));
      } else if (request.action === 'show-context-menu') {
        await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
        await vscode.commands.executeCommand('editor.action.showContextMenu');
      } else if (request.action === 'hide-preview') {
        const temporary = await vscode.workspace.openTextDocument({ language: 'markdown', content: '# Temporary preview cover' });
        const previewGroup = vscode.window.tabGroups.all.find(group => group.tabs.some(tab => tab.input?.viewType?.endsWith('storyTeller.scene')));
        if (!previewGroup) throw new Error('Story Teller preview tab was not found');
        await vscode.window.showTextDocument(temporary, { viewColumn: previewGroup.viewColumn, preserveFocus: false });
      } else if (request.action === 'show-preview') {
        await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
        await vscode.commands.executeCommand('storyTeller.previewScene');
      } else if (request.action === 'set-theme') {
        await vscode.workspace.getConfiguration('workbench').update('colorTheme', request.theme, vscode.ConfigurationTarget.Global);
      } else if (request.action === 'show-notifications') {
        await vscode.commands.executeCommand('notifications.showList');
      } else if (request.action === 'hide-notifications') {
        if ((await vscode.commands.getCommands(true)).includes('notifications.hideList'))
          await vscode.commands.executeCommand('notifications.hideList');
      } else if (request.action === 'snippet-next') {
        await vscode.commands.executeCommand('jumpToNextSnippetPlaceholder');
      } else if (request.action === 'type') {
        await vscode.commands.executeCommand('type', { text: request.text });
      } else if (request.action === 'start-conversion') {
        await focusSource();
        await fs.rm(path.join(directory, 'conversion-result.json'), { force: true });
        vscode.commands.executeCommand('storyTeller.convertChats').then(result => fs.writeFile(path.join(directory, 'conversion-result.json'), JSON.stringify(result)));
      } else if (request.action === 'start-callout-conversion') {
        await focusSource();
        await fs.rm(path.join(directory, 'callout-conversion-result.json'), { force: true });
        vscode.commands.executeCommand('storyTeller.convertCallouts').then(result => fs.writeFile(path.join(directory, 'callout-conversion-result.json'), JSON.stringify(result)));
      } else if (request.action === 'start-state-conversion') {
        await focusSource();
        await fs.rm(path.join(directory, 'state-conversion-result.json'), { force: true });
        vscode.commands.executeCommand('storyTeller.convertSceneMetadata').then(result => fs.writeFile(path.join(directory, 'state-conversion-result.json'), JSON.stringify(result)));
      } else if (request.action === 'preview-current') {
        await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
        await vscode.commands.executeCommand('storyTeller.previewScene');
      } else if (request.action === 'preview-this') {
        const editor = await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
        const position = document.positionAt(request.start);
        editor.selection = new vscode.Selection(position, position);
        await vscode.commands.executeCommand('storyTeller.previewThisBeat');
      } else if (request.action === 'focus-at') {
        const editor = await vscode.window.showTextDocument(document, { viewColumn: vscode.ViewColumn.One, preserveFocus: false });
        const position = document.positionAt(request.start);
        editor.selection = new vscode.Selection(position, position);
        await vscode.commands.executeCommand('workbench.action.focusFirstEditorGroup');
        await fs.writeFile(path.join(directory, 'intellisense-settings.json'), JSON.stringify({
          quickSuggestions: vscode.workspace.getConfiguration('editor', document.uri).get('quickSuggestions'),
          suggestOnTriggerCharacters: vscode.workspace.getConfiguration('editor', document.uri).get('suggestOnTriggerCharacters')
        }));
      } else if (request.action === 'hover-at') {
        const hovers = await vscode.commands.executeCommand('vscode.executeHoverProvider', document.uri, document.positionAt(request.start));
        await fs.writeFile(path.join(directory, 'intellisense-hover.json'), JSON.stringify(hovers.map(hover => hover.contents.map(item => typeof item === 'string' ? item : item.value).join('\n'))));
      } else if (request.action === 'completion-at') {
        const completions = await vscode.commands.executeCommand('vscode.executeCompletionItemProvider', document.uri, document.positionAt(request.start));
        await fs.writeFile(path.join(directory, 'intellisense-completion.json'), JSON.stringify(completions.items.map(item => item.label)));
      } else if (request.action === 'fold-all-test') {
        await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
        await vscode.commands.executeCommand('editor.foldAll');
      } else if (request.action === 'beat-folds') {
        await focusSource();
        const folds = await vscode.commands.executeCommand('vscode.executeFoldingRangeProvider', document.uri);
        await new Promise(resolve => setTimeout(resolve, 500));
        await vscode.commands.executeCommand('storyTeller.collapseBeats');
        await new Promise(resolve => setTimeout(resolve, 150));
        await fs.writeFile(path.join(directory, 'beat-folds.json'), JSON.stringify(folds.map(item => ({ start: item.start, end: item.end, kind: item.kind }))));
      } else if (request.action === 'expand-beats') {
        await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
        await vscode.commands.executeCommand('storyTeller.expandBeats');
      } else if (request.action === 'snapshot') {
        await fs.writeFile(path.join(directory, 'snapshot.json'), JSON.stringify({
          text: document.getText(), version: document.version, dirty: document.isDirty,
          selection: vscode.window.activeTextEditor?.document === document ? {
            start: document.offsetAt(vscode.window.activeTextEditor.selection.start), end: document.offsetAt(vscode.window.activeTextEditor.selection.end),
            text: document.getText(vscode.window.activeTextEditor.selection)
          } : null,
          disk: await fs.readFile(file, 'utf8'),
          snapshots: vscode.workspace.textDocuments.filter(d => d.uri.scheme === 'story-teller-conversion').map(d => ({ uri: d.uri.toString(), text: d.getText() }))
        }));
      } else if (request.action === 'undo') {
        await vscode.window.showTextDocument(document, { viewColumn: vscode.ViewColumn.One, preserveFocus: false });
        await new Promise(resolve => setTimeout(resolve, 120));
        await focusSource();
        await vscode.commands.executeCommand('undo');
      } else if (request.action === 'edit') {
        const edit = new vscode.WorkspaceEdit();
        edit.replace(document.uri, new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), request.source);
        if (!await vscode.workspace.applyEdit(edit)) throw new Error('Edit was rejected');
      } else if (request.action === 'reopen-command') {
        await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
        await vscode.commands.executeCommand('storyTeller.previewScene');

      } else if (request.action === 'close-preview') {
        await vscode.commands.executeCommand('workbench.action.focusSecondEditorGroup');
        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
      } else if (request.action === 'switch') {
        const other = await vscode.workspace.openTextDocument({ language: 'markdown', content: '# Other document' });
        await vscode.window.showTextDocument(other, vscode.ViewColumn.One);
      }
      await fs.writeFile(path.join(directory, 'ack.json'), JSON.stringify({ id: last }));
    } catch (error) {
      await fs.writeFile(path.join(directory, 'ack.json'), JSON.stringify({ id: last, error: String(error) }));
    }
  }
};
