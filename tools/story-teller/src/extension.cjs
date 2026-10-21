'use strict';
const vscode = require('vscode');
const { registerInsert } = require('./insert-command.cjs');
const { registerConversion } = require('./conversion-command.cjs');
const { randomBytes } = require('node:crypto');
const { parseScene } = require('./parser.cjs');
const { inspectStructure, beatRanges, beatAtOffset, beatFoldRanges } = require('./structure.cjs');
const { baseFor, resolveMedia } = require('./media.cjs');
function rangesFor(document) { return beatRanges(inspectStructure(document.getText())); }
function currentEditor() {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'markdown' || editor.document.uri.scheme === 'story-teller-conversion') {
    vscode.window.showInformationMessage('Open a source Markdown document first.'); return null;
  }
  return editor;
}
function activate(context) {
  registerConversion(vscode, context);
  registerInsert(vscode, context);
  const previews = new Map();
  let preferredMute = Boolean(context.globalState.get('storyTeller.muted', false));
  const openPreview = async (thisBeat = false) => {
    const editor = currentEditor();
    if (!editor) return;
    const document = editor.document;
    const key = document.uri.toString();
    const ranges = thisBeat ? rangesFor(document) : null;
    const selected = thisBeat ? beatAtOffset(ranges, document.offsetAt(editor.selection.active)) : -1;
    if (thisBeat && selected < 0) { vscode.window.showInformationMessage('Place the cursor inside a story beat.'); return; }
    const targetOffset = selected < 0 ? undefined : ranges[selected].startOffset;
    const existing = previews.get(key);
    if (existing) {
      existing.sourceColumn = editor.viewColumn;
      existing.panel.reveal(vscode.ViewColumn.Beside, true);
      existing.panel.webview.postMessage({ type: 'presentation', visible: existing.panel.visible });
      if (thisBeat) await existing.send(document, targetOffset);
      return;
    }
    const base = baseFor(vscode, document);
    const panel = vscode.window.createWebviewPanel('storyTeller.scene', `Story Teller · ${key.split('/').pop()}`, { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true }, {
      enableScripts: true, enableCommandUris: false, retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'dist'), vscode.Uri.joinPath(context.extensionUri, 'media'), ...(base ? [vscode.Uri.file(base.root)] : [])]
    });
    const entry = { panel, sourceColumn: editor.viewColumn, requestedOffset: targetOffset, revision: 0, sentSource: null, disposed: false, send: null };
    previews.set(key, entry);
    const nonce = randomBytes(24).toString('hex');
    const script = panel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'dist', 'player.js'));
    const style = panel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'reader.css'));
    panel.webview.html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src ${panel.webview.cspSource}; img-src ${panel.webview.cspSource}; connect-src 'none'; font-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none';">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Story Teller</title><link rel="stylesheet" href="${style}"></head><body>
<nav aria-label="Story controls"><button id="previous" type="button">Previous</button><button id="next" type="button">Next</button><button id="restart" type="button">Restart</button><button id="play" type="button">Play</button><button id="pause" type="button">Pause</button><button id="replay" type="button">Replay Beat</button><button id="reveal" type="button" hidden>Reveal Immediately</button><button id="mute" type="button" aria-pressed="false">Mute sound</button><button id="show-source" type="button">Show Beat in Source</button><span id="status" role="status"></span></nav>
<p id="warnings" role="status"></p><main id="beat" aria-label="Current story beat" tabindex="0"></main><script nonce="${nonce}" src="${script}"></script></body></html>`;
    entry.send = async (changed = document, requestedOffset) => {
      const current = ++entry.revision;
      const source = changed.getText();
      panel.webview.postMessage({ type: 'source-pending', revision: current });
      const prepared = await resolveMedia(vscode, changed, panel.webview, parseScene(source));
      if (!entry.disposed && current === entry.revision) {
        entry.sentSource = source;
        panel.webview.postMessage({ type: 'source', source, uri: key, revision: current, targetOffset: requestedOffset, muted: preferredMute, ...prepared });
      }
    };
    const presentation = () => panel.webview.postMessage({ type: 'presentation', visible: panel.visible });
    const visibility = panel.onDidChangeViewState(presentation);
    const listener = vscode.workspace.onDidChangeTextDocument(event => {
      if (event.document.uri.toString() === key) { entry.requestedOffset = undefined; entry.send(event.document); }
    });
    const ready = panel.webview.onDidReceiveMessage(async message => {
      if (message?.type === 'ready') {
        presentation();
        const target = entry.requestedOffset;
        entry.requestedOffset = undefined;
        await entry.send(vscode.workspace.textDocuments.find(doc => doc.uri.toString() === key) || document, target);
      } else if (message?.type === 'mute-preference' && typeof message.muted === 'boolean') {
        preferredMute = message.muted;
        void context.globalState.update('storyTeller.muted', preferredMute);
        for (const other of previews.values()) if (other !== entry) other.panel.webview.postMessage({ type: 'mute-preference', muted: preferredMute });
      } else if (message?.type === 'show-source') {
        if (entry.disposed || message.uri !== key || message.revision !== entry.revision) return;
        let source = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === key && !doc.isClosed);
        try { source ||= await vscode.workspace.openTextDocument(vscode.Uri.parse(key)); }
        catch { vscode.window.showWarningMessage('The source document is no longer available.'); return; }
        const range = rangesFor(source)[message.index];
        if (!range || source.uri.toString() !== key || source.getText() !== entry.sentSource || range.startOffset !== message.startOffset || range.endOffset !== message.endOffset) {
          vscode.window.showWarningMessage('The beat changed after this preview was prepared. Refresh the preview before navigating.'); return;
        }
        const editor = await vscode.window.showTextDocument(source, { viewColumn: entry.sourceColumn || vscode.ViewColumn.One, preserveFocus: false });
        await vscode.commands.executeCommand('editor.unfold', { selectionLines: [range.anchorLine, range.endLine - 1], direction: 'up', levels: 100 });
        await vscode.commands.executeCommand('editor.unfold', { selectionLines: [range.anchorLine], direction: 'down', levels: 100 });
        const position = new vscode.Position(range.anchorLine, 0);
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenterIfOutsideViewport);
      }
    });
    panel.onDidDispose(() => {
      entry.disposed = true; entry.revision++; previews.delete(key);
      listener.dispose(); ready.dispose(); visibility.dispose();
    });
    context.subscriptions.push(panel);
  };
  context.subscriptions.push(
    vscode.commands.registerCommand('storyTeller.previewScene', () => openPreview()),
    vscode.commands.registerCommand('storyTeller.previewThisBeat', () => openPreview(true)),
    vscode.languages.registerFoldingRangeProvider({ language: 'markdown' }, {
      provideFoldingRanges(document) {
        if (document.uri.scheme === 'story-teller-conversion') return [];
        return beatFoldRanges(rangesFor(document)).map(range => new vscode.FoldingRange(range.start, range.end, vscode.FoldingRangeKind.Region));
      }
    })
  );
  for (const [id, action] of [['collapseBeats', 'fold'], ['expandBeats', 'unfold']]) {
    context.subscriptions.push(vscode.commands.registerCommand(`storyTeller.${id}`, async () => {
      const editor = currentEditor(); if (!editor) return;
      const lines = beatFoldRanges(rangesFor(editor.document)).map(range => range.start);
      if (lines.length) await vscode.commands.executeCommand(`editor.${action}`, { selectionLines: lines, levels: 1, direction: 'up' });
    }));
  }
}
module.exports = { activate };
