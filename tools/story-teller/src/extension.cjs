'use strict';
const vscode = require('vscode');
const { registerInsert } = require('./insert-command.cjs');
const { registerIntelliSense } = require('./intellisense-command.cjs');
const { registerConversion } = require('./conversion-command.cjs');
const { registerImport } = require('./import-command.cjs');
const { registerPacing, projectFor, projectFile } = require('./pacing-command.cjs');
const { resolveSettings } = require('./pacing-settings.cjs');
const { autoplayPreference } = require('./scene-navigation.cjs');
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
  registerPacing(vscode, context);
  registerInsert(vscode, context);
  registerIntelliSense(vscode, context);
  const previews = new Map();
  let activePreview = null, managedReader = null;
  let preferredMute = Boolean(context.globalState.get('storyTeller.muted', false));
  let preferredAutoplay = autoplayPreference(context.globalState);
  const openPreview = async (thisBeat = false, sceneEditor = null) => {
    const sceneStart = Boolean(sceneEditor);
    const editor = sceneEditor || currentEditor();
    if (!editor) return;
    const document = editor.document;
    const key = document.uri.toString();
    const ranges = thisBeat ? rangesFor(document) : null;
    const selected = thisBeat ? beatAtOffset(ranges, document.offsetAt(editor.selection.active)) : -1;
    if (thisBeat && selected < 0) { vscode.window.showInformationMessage('Place the cursor inside a story beat.'); return; }
    const targetOffset = sceneStart ? 0 : selected < 0 ? undefined : ranges[selected].startOffset;
    const existing = sceneStart ? managedReader || activePreview || previews.get(key) || previews.values().next().value : previews.get(key);
    if (existing) {
      if (sceneStart) {
        existing.sceneMayAutoplay = true;
        for (const other of [...previews.values()]) if (other !== existing) other.panel.dispose();
        previews.delete(existing.key);
        existing.key = key; existing.document = document;
        existing.panel.title = `Story Teller · ${decodeURIComponent(key.split('/').pop())}`;
        const base = baseFor(vscode, document);
        if (existing.resourceRoot !== (base?.root || null)) {
          // Changing resource policy can recreate the inner webview document.
          // Give that document a new identity and wait for its own ready signal.
          existing.ready = false; existing.resourceRoot = base?.root || null;
          existing.sceneStart = true; existing.requestedOffset = 0;
          existing.panel.webview.options = { ...existing.panel.webview.options, localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'dist'), vscode.Uri.joinPath(context.extensionUri, 'media'), ...(base ? [vscode.Uri.file(base.root)] : [])] };
          existing.panel.webview.html = existing.makeHtml();
        }
        previews.set(key, existing); managedReader = existing;
      }
      existing.sourceColumn = editor.viewColumn;
      // Reveal the existing tab in its own group. Moving it "beside" the
      // current editor can leave the retained webview reporting inactive.
      existing.panel.reveal(existing.panel.viewColumn, sceneStart);
      setTimeout(() => {
        if (existing.disposed) return;
        if (!existing.panel.visible) existing.panel.reveal(existing.panel.viewColumn, sceneStart);
        existing.sendPresentation(existing.panel.visible);
      }, 100);
      if (thisBeat || sceneStart) {
        existing.requestedOffset = targetOffset;
        existing.sceneStart = sceneStart;
        if (existing.ready) { await existing.send(document, targetOffset, sceneStart); existing.sceneStart = false; existing.requestedOffset = undefined; }
      }
      return;
    }
    const base = baseFor(vscode, document);
    const panel = vscode.window.createWebviewPanel('storyTeller.scene', `Story Teller · ${decodeURIComponent(key.split('/').pop())}`, { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true }, {
      enableScripts: true, enableCommandUris: false, retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'dist'), vscode.Uri.joinPath(context.extensionUri, 'media'), ...(base ? [vscode.Uri.file(base.root)] : [])]
    });
    const entry = { panel, key, document, resourceRoot: base?.root || null, ready: false, sceneStart, sceneMayAutoplay: sceneStart, sourceColumn: editor.viewColumn, requestedOffset: targetOffset, revision: 0, presentationEpoch: 0,
      presentationRetry: null, sentSource: null, disposed: false, send: null, sendPresentation: null };
    previews.set(key, entry);
    if (sceneStart) managedReader = entry;
    entry.makeHtml = () => {
      const nonce = randomBytes(24).toString('hex');
      entry.instance = nonce;
      const script = panel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'dist', 'player.js'));
      const style = panel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'reader.css'));
      return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src ${panel.webview.cspSource}; img-src ${panel.webview.cspSource}; connect-src 'none'; font-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none';">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Story Teller</title><link rel="stylesheet" href="${style}"></head><body data-reader-instance="${nonce}">
<nav aria-label="Story controls"><button id="previous" type="button">Previous</button><button id="next" type="button">Next</button><button id="restart" type="button">Restart</button><button id="play" type="button">Play</button><button id="pause" type="button">Pause</button><button id="replay" type="button">Replay Beat</button><button id="reveal" type="button" hidden>Reveal Immediately</button><label class="reader-preference"><input id="autoplay" type="checkbox" checked>Autoplay</label><button id="enable-sound" type="button" hidden>Enable sound</button><button id="mute" type="button" aria-pressed="false">Mute sound</button><button id="show-source" type="button">Show Beat in Source</button><span id="status" role="status"></span></nav>
<p id="warnings" role="status"></p><main id="beat" aria-label="Current story beat" tabindex="0"></main><button id="follow-story" type="button" hidden>Follow story ↓</button><script nonce="${nonce}" src="${script}"></script></body></html>`;
    };
    panel.webview.html = entry.makeHtml();
    entry.send = async (changed = entry.document, requestedOffset, startScene = false) => {
      const key = entry.key, instance = entry.instance;
      const current = ++entry.revision;
      const source = changed.getText();
      panel.webview.postMessage({ type: 'source-pending', instance, revision: current });
      let pacing, pacingWarning = null;
      try { pacing = resolveSettings(source, (await projectFor(vscode, changed.uri))?.manifest); }
      catch (error) { pacing = resolveSettings(source, null); pacingWarning = `Project pacing unavailable: ${error.message}`; }
      const prepared = await resolveMedia(vscode, changed, panel.webview, parseScene(source, { prosePacing: pacing.enabled }));
      if (!entry.disposed && key === entry.key && instance === entry.instance && current === entry.revision) {
        entry.sentSource = source;
        panel.webview.postMessage({ type: 'source', instance, source, uri: key, revision: current, targetOffset: requestedOffset, sceneStart: startScene, sceneAutoplay: startScene && entry.sceneMayAutoplay && panel.visible, muted: preferredMute, autoplayOnTurn: preferredAutoplay,
          prosePacing: pacing.enabled, pacingSource: pacing.source, pacingWarning: pacingWarning || pacing.warning || null, ...prepared });
      }
    };
    entry.sendPresentation = visible => {
      if (entry.presentationRetry !== null) clearTimeout(entry.presentationRetry);
      entry.presentationRetry = null;
      const epoch = ++entry.presentationEpoch;
      const deliver = () => {
        if (entry.disposed || epoch !== entry.presentationEpoch || panel.visible !== visible) return;
        void panel.webview.postMessage({ type: 'presentation', instance: entry.instance, visible, epoch });
        // A retained webview may miss a message while it is becoming visible.
        // Keep the newest state pending until the component acknowledges it.
        if (visible) entry.presentationRetry = setTimeout(deliver, 250);
      };
      deliver();
    };
    const presentation = () => {
      if (!panel.visible) entry.sceneMayAutoplay = false;
      if (panel.active) activePreview = entry;
      else if (activePreview === entry) activePreview = null;
      void vscode.commands.executeCommand('setContext', 'storyTeller.previewActive', Boolean(activePreview));
      entry.sendPresentation(panel.visible);
    };
    const visibility = panel.onDidChangeViewState(presentation);
    const listener = vscode.workspace.onDidChangeTextDocument(event => {
      if (event.contentChanges.length && event.document.uri.toString() === entry.key) { entry.requestedOffset = undefined; entry.sceneStart = false; entry.send(event.document); }
    });
    const ready = panel.webview.onDidReceiveMessage(async message => {
      if (message?.type === 'presentation-ack' && message.epoch === entry.presentationEpoch) {
        if (entry.presentationRetry !== null) clearTimeout(entry.presentationRetry);
        entry.presentationRetry = null;
      } else if (message?.type === 'ready' && message.instance === entry.instance) {
        entry.ready = true;
        presentation();
        const target = entry.requestedOffset;
        entry.requestedOffset = undefined;
        const start = entry.sceneStart; entry.sceneStart = false;
        await entry.send(vscode.workspace.textDocuments.find(doc => doc.uri.toString() === entry.key && !doc.isClosed) || entry.document, target, start);
      } else if (message?.type === 'mute-preference' && typeof message.muted === 'boolean') {
        preferredMute = message.muted;
        void context.globalState.update('storyTeller.muted', preferredMute);
        for (const other of previews.values()) if (other !== entry) other.panel.webview.postMessage({ type: 'mute-preference', muted: preferredMute });
      } else if (message?.type === 'autoplay-preference' && typeof message.autoplayOnTurn === 'boolean') {
        preferredAutoplay = message.autoplayOnTurn;
        await context.globalState.update('storyTeller.autoplayOnTurn', preferredAutoplay);
        for (const other of previews.values()) if (other !== entry)
          other.panel.webview.postMessage({ type: 'autoplay-preference', autoplayOnTurn: preferredAutoplay });
      } else if (message?.type === 'show-source') {
        const key = entry.key;
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
      entry.disposed = true; entry.revision++; previews.delete(entry.key);
      if (managedReader === entry) managedReader = null;
      if (activePreview === entry) { activePreview = null; void vscode.commands.executeCommand('setContext', 'storyTeller.previewActive', false); }
      if (entry.presentationRetry !== null) clearTimeout(entry.presentationRetry);
      listener.dispose(); ready.dispose(); visibility.dispose();
    });
    context.subscriptions.push(panel);
  };
  registerImport(vscode, context, {
    onScenePending() {
      for (const entry of previews.values()) {
        entry.sceneStart = false; entry.sceneMayAutoplay = false; entry.requestedOffset = undefined;
        entry.panel.webview.postMessage({ type: 'source-pending', instance: entry.instance, revision: ++entry.revision });
      }
    },
    onSceneFailed() { for (const entry of previews.values()) if (!entry.disposed) void entry.send(); },
    openScene: editor => openPreview(false, editor)
  });
  context.subscriptions.push(
    vscode.commands.registerCommand('storyTeller.previewScene', () => openPreview()),
    vscode.commands.registerCommand('storyTeller.previewThisBeat', () => openPreview(true)),
    vscode.commands.registerCommand('storyTeller.showBeatInSource', () => {
      if (activePreview?.panel.visible && !activePreview.disposed) activePreview.panel.webview.postMessage({ type: 'show-source-request' });
      else vscode.window.showInformationMessage('Focus a Story Teller reader preview first.');
    }),
    vscode.languages.registerFoldingRangeProvider({ language: 'markdown' }, {
      provideFoldingRanges(document) {
        if (document.uri.scheme === 'story-teller-conversion') return [];
        return beatFoldRanges(rangesFor(document)).map(range => new vscode.FoldingRange(range.start, range.end, vscode.FoldingRangeKind.Region));
      }
    })
  );
  const pacingWatcher = vscode.workspace.createFileSystemWatcher('**/story-teller.project.json');
  const refreshPacing = uri => {
    for (const [key, entry] of previews) if (projectFile(vscode, vscode.Uri.parse(key)) === uri.fsPath && !entry.disposed) {
      const doc = vscode.workspace.textDocuments.find(item => item.uri.toString() === key && !item.isClosed);
      if (doc) void entry.send(doc);
    }
  };
  context.subscriptions.push(pacingWatcher, pacingWatcher.onDidChange(refreshPacing), pacingWatcher.onDidCreate(refreshPacing), pacingWatcher.onDidDelete(refreshPacing));
  for (const [id, action] of [['collapseBeats', 'fold'], ['expandBeats', 'unfold']]) {
    context.subscriptions.push(vscode.commands.registerCommand(`storyTeller.${id}`, async () => {
      const editor = currentEditor(); if (!editor) return;
      const lines = beatFoldRanges(rangesFor(editor.document)).map(range => range.start);
      if (lines.length) await vscode.commands.executeCommand(`editor.${action}`, { selectionLines: lines, levels: 1, direction: 'up' });
    }));
  }
}
module.exports = { activate };
