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
    await vscode.window.showTextDocument(document, { viewColumn: vscode.ViewColumn.One, preserveFocus: false });
    await vscode.commands.executeCommand('workbench.action.focusFirstEditorGroup');
    const deadline = Date.now() + 5000;
    while (vscode.window.activeTextEditor?.document !== document && Date.now() < deadline)
      await new Promise(resolve => setTimeout(resolve, 100));
    if (vscode.window.activeTextEditor?.document !== document)
      throw new Error(`Test source editor did not become active; current=${vscode.window.activeTextEditor?.document.uri.toString() || 'none'}, tab=${vscode.window.tabGroups.activeTabGroup.activeTab?.label || 'none'}`);
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
      if (request.action === 'open-outline') {
        await vscode.commands.executeCommand('workbench.view.extension.storyTeller');
      } else if (request.action === 'open-project-scene') {
        await vscode.commands.executeCommand('storyTeller.openProjectScene', request.projectRoot, { file: 'scenes/The Signal.md' });
        await fs.writeFile(path.join(directory, 'project-navigation.json'), JSON.stringify({ active: vscode.window.activeTextEditor?.document.uri.fsPath }));
      } else if (request.action === 'preview-project-scene') {
        const editor = vscode.window.activeTextEditor;
        const position = editor.document.positionAt(Math.max(0, editor.document.getText().indexOf(process.env.STORY_TELLER_HOST_SCOPE === 'prose' ? 'First paragraph.' : 'Fictional prose.')));
        editor.selection = new vscode.Selection(position, position);
        await vscode.commands.executeCommand('storyTeller.previewThisBeat');
        await new Promise(resolve => setTimeout(resolve, 500));
        await fs.writeFile(path.join(directory, 'project-preview.json'), JSON.stringify({ active: vscode.window.activeTextEditor?.document.uri.toString(), selection: editor.selection.active.line, titles: vscode.window.tabGroups.all.flatMap(group => group.tabs).filter(tab => tab.input?.viewType?.endsWith('storyTeller.scene')).map(tab => tab.label) }));
      } else if (request.action === 'start-import') {
        vscode.commands.executeCommand('storyTeller.importManuscript').then(result => fs.writeFile(path.join(directory, 'import-result.json'), JSON.stringify(result)));
      } else if (request.action === 'start-scene-pacing') {
        await vscode.commands.executeCommand('workbench.action.focusFirstEditorGroup');
        vscode.commands.executeCommand('storyTeller.setSceneProsePacing');
      } else if (request.action === 'start-book-pacing') {
        await vscode.commands.executeCommand('workbench.action.focusFirstEditorGroup');
        vscode.commands.executeCommand('storyTeller.setBookProsePacing');
      } else if (request.action === 'show-import-review') {
        const { showImportReview } = require('../src/import-command.cjs');
        const prepared = { key: 'manuscript_order_key', book: { data: { title: 'Fictional Lantern' }, file: '/fictional/Lantern.md' },
          parts: [{ id: 'p', title: 'The first part', orderValue: '8000000000', source: '/fictional/First.md', intro: false }],
          scenes: [{ id: 's', partId: 'p', label: '1.1', title: 'The signal', orderValue: '8000000000', source: '/fictional/Signal.md' }],
          assets: [{ name: 'lamp.png', source: '/fictional/lamp.png' }], warnings: ['Excluded draft: /fictional/Draft.md', 'Unsupported SVG example'], unresolved: [], errors: [] };
        showImportReview(vscode, prepared).then(result => fs.writeFile(path.join(directory, 'review-result.json'), JSON.stringify({ result })));
      } else if (request.action === 'snapshot-active') {
        await fs.writeFile(path.join(directory, 'active-snapshot.json'), JSON.stringify({ text: vscode.window.activeTextEditor?.document.getText(), dirty: vscode.window.activeTextEditor?.document.isDirty }));
      } else if (request.action === 'start-insert') {
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
      } else if (request.action === 'close-cover') {
        const cover = vscode.window.tabGroups.all.flatMap(group => group.tabs).find(tab => tab.input?.uri?.scheme === 'untitled' && tab.label === '# Temporary preview cover');
        if (cover) await vscode.window.tabGroups.close(cover);
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
        await focusSource();
        const editor = vscode.window.activeTextEditor;
        const position = document.positionAt(request.start);
        editor.selection = new vscode.Selection(position, position);
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
