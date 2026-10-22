'use strict';
const { randomBytes } = require('node:crypto');
const { convertChats } = require('./convert.cjs');
const { convertCallouts } = require('./convert-callouts.cjs');
const { convertSceneMetadata } = require('./convert-scene-metadata.cjs');
function registerConversion(vscode, context) {
  const snapshots = new Map();
  const busy = new Set();
  const scheme = 'story-teller-conversion';
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(scheme, { provideTextDocumentContent: uri => snapshots.get(uri.toString()) || '' }),
    vscode.workspace.onDidCloseTextDocument(document => { if (document.uri.scheme === scheme) snapshots.delete(document.uri.toString()); })
  );
  for (const task of [
    { command: 'storyTeller.convertChats', name: 'chat', plural: 'chat(s)', convert: convertChats, channel: 'Story Teller Chat Conversion' },
    { command: 'storyTeller.convertCallouts', name: 'callout', plural: 'callout(s)', convert: convertCallouts, channel: 'Story Teller Callout Conversion' },
    { command: 'storyTeller.convertSceneMetadata', name: 'State callout', plural: 'State callout(s)', convert: convertSceneMetadata, channel: 'Story Teller Scene Metadata Conversion' }
  ]) {
    const report = vscode.window.createOutputChannel(task.channel);
    context.subscriptions.push(report, vscode.commands.registerCommand(task.command, async () => {
      const document = vscode.window.activeTextEditor?.document;
      if (!document || document.languageId !== 'markdown' || document.uri.scheme === scheme) {
        vscode.window.showInformationMessage(`Open the source Markdown document to convert its ${task.name}s.`); return;
      }
      const key = document.uri.toString();
      const lock = `${task.command}:${key}`;
      if (busy.has(lock)) { vscode.window.showInformationMessage(`A ${task.name} conversion review is already open for this document.`); return; }
      busy.add(lock);
      try {
        for (;;) {
          if (document.isClosed) return { status: 'stale', count: 0 };
          const source = document.getText();
          const version = document.version;
          const result = task.convert(source);
          const id = randomBytes(12).toString('hex');
          const before = vscode.Uri.parse(`${scheme}:/${id}/before.md`);
          const after = vscode.Uri.parse(`${scheme}:/${id}/after.md`);
          snapshots.set(before.toString(), source); snapshots.set(after.toString(), result.text);
          const summary = `${result.count} ${task.plural} to convert; ${result.warnings.length} review warning(s).`;
          report.appendLine(`\n${key}\n${summary}`);
          for (const warning of result.warnings) report.appendLine(`Line ${warning.line}: ${warning.message}`);
          await vscode.commands.executeCommand('vscode.diff', before, after, `Story Teller conversion · ${summary}`);
          let choice;
          do {
            const actions = result.count ? ['Apply'] : [];
            if (result.warnings.length) actions.push('Review Warnings');
            choice = await vscode.window.showInformationMessage(summary, ...actions, 'Cancel');
            if (choice === 'Review Warnings') report.show(true);
          } while (choice === 'Review Warnings');
          if (choice !== 'Apply') return { status: 'cancelled', count: result.count };
          const stale = () => document.isClosed || document.version !== version || document.getText() !== source;
          let applied = false;
          if (!stale()) {
            const editor = await vscode.window.showTextDocument(document, { preview: false });
            if (!stale()) applied = await editor.edit(builder => {
              for (const change of result.changes) builder.replace(new vscode.Range(document.positionAt(change.start), document.positionAt(change.end)), change.text);
            }, { undoStopBefore: true, undoStopAfter: true });
          }
          if (applied) {
            vscode.window.showInformationMessage(`Converted ${result.count} ${task.plural}. Changes are unsaved; Undo reverts this conversion.`);
            return { status: 'applied', count: result.count };
          }
          const action = await vscode.window.showWarningMessage('The source changed, closed, or could not be edited after preview. Nothing was applied. Regenerate the conversion?', ...(document.isClosed ? [] : ['Regenerate']), 'Cancel');
          if (action !== 'Regenerate') return { status: 'stale', count: 0 };
        }
      } finally { busy.delete(lock); }
    }));
  }
}
module.exports = { registerConversion };
