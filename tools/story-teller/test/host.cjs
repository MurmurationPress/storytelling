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
  await fs.writeFile(file, sample);
  const document = await vscode.workspace.openTextDocument(vscode.Uri.file(file));
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
      if (request.action === 'start-conversion') {
        await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
        await fs.rm(path.join(directory, 'conversion-result.json'), { force: true });
        vscode.commands.executeCommand('storyTeller.convertChats').then(result => fs.writeFile(path.join(directory, 'conversion-result.json'), JSON.stringify(result)));
      } else if (request.action === 'preview-current') {
        await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
        await vscode.commands.executeCommand('storyTeller.previewScene');
      } else if (request.action === 'snapshot') {
        await fs.writeFile(path.join(directory, 'snapshot.json'), JSON.stringify({
          text: document.getText(), version: document.version, dirty: document.isDirty,
          disk: await fs.readFile(file, 'utf8'),
          snapshots: vscode.workspace.textDocuments.filter(d => d.uri.scheme === 'story-teller-conversion').map(d => ({ uri: d.uri.toString(), text: d.getText() }))
        }));
      } else if (request.action === 'undo') {
        await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
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
