'use strict';
const vscode = require('vscode');
const { registerConversion } = require('./conversion-command.cjs');
const { randomBytes } = require('node:crypto');
function activate(context) {
  registerConversion(vscode, context);
  const previews = new Map();
  context.subscriptions.push(vscode.commands.registerCommand('storyTeller.previewScene', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'markdown') {
      vscode.window.showInformationMessage('Open a Markdown document to preview its story beats.');
      return;
    }
    const document = editor.document;
    const key = document.uri.toString();
    if (previews.has(key)) { previews.get(key).reveal(vscode.ViewColumn.Beside, true); return; }
    const panel = vscode.window.createWebviewPanel('storyTeller.scene', `Story Teller · ${key.split('/').pop()}`, { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true }, {
      enableScripts: true,
      enableCommandUris: false,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'dist'), vscode.Uri.joinPath(context.extensionUri, 'media')]
    });
    previews.set(key, panel);
    const nonce = randomBytes(24).toString('hex');
    const script = panel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'dist', 'player.js'));
    const style = panel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'reader.css'));
    panel.webview.html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src ${panel.webview.cspSource}; img-src 'none'; connect-src 'none'; font-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none';">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Story Teller</title><link rel="stylesheet" href="${style}"></head><body>
<nav aria-label="Story controls"><button id="previous" type="button">Previous</button><button id="next" type="button">Next</button><button id="restart" type="button">Restart</button><button id="play" type="button">Play</button><button id="pause" type="button">Pause</button><button id="replay" type="button">Replay Beat</button><span id="status" role="status"></span></nav>
<p id="warnings" role="status"></p><main id="beat" aria-label="Current story beat" tabindex="0"></main><script nonce="${nonce}" src="${script}"></script></body></html>`;
    let revision = 0;
    const send = (changed = document) => panel.webview.postMessage({ type: 'source', source: changed.getText(), uri: key, revision: ++revision });
    const presentation = () => panel.webview.postMessage({ type: 'presentation', visible: panel.visible });
    const visibility = panel.onDidChangeViewState(() => presentation());
    const listener = vscode.workspace.onDidChangeTextDocument(event => { if (event.document.uri.toString() === key) send(event.document); });
    const ready = panel.webview.onDidReceiveMessage(message => { if (message?.type === 'ready') { presentation(); send(vscode.workspace.textDocuments.find(doc => doc.uri.toString() === key) || document); } });
    // A ready handshake resends source when VS Code recreates a hidden webview.
    panel.onDidDispose(() => { previews.delete(key); listener.dispose(); ready.dispose(); visibility.dispose(); });
    context.subscriptions.push(panel);
  }));
}
module.exports = { activate };
