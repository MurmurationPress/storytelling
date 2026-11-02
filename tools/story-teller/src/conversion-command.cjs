'use strict';
const { inspectStructure } = require('./structure.cjs');
const { applyChanges, within } = require('./component-identity.cjs');
const { migrateComponentMetadata } = require('./migrate-component-metadata.cjs');
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
    { command: 'storyTeller.migrateComponentMetadata', name: 'component metadata', plural: 'component(s)', convert: migrateComponentMetadata, migration: true, channel: 'Story Teller Metadata Migration' },
    { command: 'storyTeller.convertChats', name: 'chat', plural: 'chat(s)', convert: convertChats, channel: 'Story Teller Chat Conversion' },
    { command: 'storyTeller.convertCallouts', name: 'callout', plural: 'callout(s)', convert: convertCallouts, channel: 'Story Teller Callout Conversion' },
    { command: 'storyTeller.convertSceneMetadata', name: 'State callout', plural: 'State callout(s)', convert: convertSceneMetadata, channel: 'Story Teller Scene Metadata Conversion' }
  ]) {
    const report = vscode.window.createOutputChannel(task.channel);
    context.subscriptions.push(report, vscode.commands.registerCommand(task.command, async (invocation = {}) => {
      const sourceEditor = vscode.window.activeTextEditor;
      const document = sourceEditor?.document;
      if (!document || document.languageId !== 'markdown' || document.uri.scheme === scheme) {
        vscode.window.showInformationMessage(task.migration ? 'Open the source Markdown document to migrate its component metadata.' : `Open the source Markdown document to convert its ${task.name}s.`); return;
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
          const selection = sourceEditor.selection;
          const scope = !invocation.safeOnly && selection && !selection.isEmpty ? {start:document.offsetAt(selection.start),end:document.offsetAt(selection.end)} : undefined;
          let associate;
          if (task.migration && !invocation.safeOnly) {
            const structure = inspectStructure(source), caret = document.offsetAt(selection.active ?? selection.start);
            const candidates = structure.spans.filter(span => span.type === 'fence' && span.level === 0 && span.info === 'typeout' && (scope || caret >= structure.lines[span.start].start && caret < structure.lines[span.end - 1].end) && within(structure.lines[span.start].start, structure.lines[span.end - 1].end, scope));
            const candidate = candidates.length === 1 ? candidates[0] : null;
            if (candidate) {
              const answer = await vscode.window.showQuickPick([
                {label:'Review safe metadata changes only',value:false},
                {label:`Use beat title for component at line ${candidate.start + 1}`,description:'I confirm that this beat title identifies this component. Other components are not associated.',value:true}
              ], {title:'Component metadata migration · title ownership'});
              if (!answer) return {status:'cancelled',count:0};
              if (answer.value) associate = structure.lines[candidate.start].start;
            }
          }
          const result = task.convert(source, {scope,associate});
          if (scope && !task.migration) {
            result.changes = result.changes.filter(change => within(change.start,change.end,scope));
            result.text = applyChanges(source,result.changes); result.count = result.changes.length;
            const lines = inspectStructure(source).lines;
            result.warnings = result.warnings.filter(warning => { const line=lines[warning.line-1]; return /frontmatter/.test(warning.message) || !line || line.start >= scope.start && line.start < scope.end; });
          }
          const id = randomBytes(12).toString('hex');
          const before = vscode.Uri.parse(`${scheme}:/${id}/before.md`);
          const after = vscode.Uri.parse(`${scheme}:/${id}/after.md`);
          snapshots.set(before.toString(), source); snapshots.set(after.toString(), result.text);
          const summary = result.summary ? `${result.summary.converted} to migrate; ${result.summary.alreadyMigrated} already migrated; ${result.summary.skipped} skipped; ${result.summary.ambiguous} ambiguous` : `${result.count} ${task.plural} to convert; ${result.warnings.length} review warning(s).`;
          report.appendLine(`\n${key}\n${summary}`);
          for (const item of result.cases || []) report.appendLine(`Line ${item.line}: ${item.status === 'converted' ? 'to migrate' : item.status === 'alreadyMigrated' ? 'already migrated' : item.status} — ${item.reason}`);
          for (const warning of result.warnings) report.appendLine(`Line ${warning.line}: ${warning.message}`);
          await vscode.commands.executeCommand('vscode.diff', before, after, `Story Teller conversion · ${summary}`);
          let choice;
          do {
            const actions = result.count ? ['Apply'] : [];
            if (result.warnings.length || result.cases?.some(item => item.status === 'skipped')) actions.push('Review Warnings');
            choice = await vscode.window.showInformationMessage(summary, ...actions, 'Cancel');
            if (choice === 'Review Warnings') report.show(true);
          } while (choice === 'Review Warnings');
          if (choice !== 'Apply') return { status: 'cancelled', count: result.count };
          const stale = () => document.isClosed || document.version !== version || document.getText() !== source || (scope && (document.offsetAt(sourceEditor.selection.start) !== scope.start || document.offsetAt(sourceEditor.selection.end) !== scope.end));
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
