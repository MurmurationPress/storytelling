'use strict';
const { choices, planInsertion, planPace } = require('./insert.cjs');
const { paceChoices } = require('./pace.cjs');
function registerInsert(vscode, context) {
  const run = async wrap => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'markdown' || editor.document.uri.scheme === 'story-teller-conversion') {
      vscode.window.showInformationMessage('Open an editable source Markdown document first.'); return;
    }
    if (editor.selections.length !== 1) { vscode.window.showWarningMessage('Use one caret or one contiguous selection.'); return; }
    const document = editor.document;
    const version = document.version;
    const selection = editor.selection;
    const source = document.getText();
    const choice = wrap ? { id: 'wrap' } : await vscode.window.showQuickPick(choices, { title: 'Story Teller: Insert…', placeHolder: 'Insert story syntax at the caret', matchOnDescription: true });
    if (!choice) return { status: 'cancelled' };
    const pace = choice.id === 'pace' ? await vscode.window.showQuickPick(paceChoices, { title: 'Chat pace', placeHolder: 'Explicit delays and pauses stay unchanged' }) : null;
    if (choice.id === 'pace' && !pace) return { status: 'cancelled' };
    if (document.isClosed || document.version !== version || vscode.window.activeTextEditor !== editor || !editor.selection.isEqual(selection)) {
      vscode.window.showWarningMessage('The document or selection changed while choosing. Run Insert again.'); return { status: 'stale' };
    }
    const offsets = { start: document.offsetAt(selection.start), end: document.offsetAt(selection.end) };
    const plan = choice.id === 'pace' ? planPace(source, offsets, pace.value) : planInsertion(source, offsets, choice.id);
    if (plan.error) { vscode.window.showWarningMessage(plan.error); return { status: 'refused' }; }
    let applied;
    if (plan.edits) {
      applied = await editor.edit(edit => { for (const item of plan.edits) edit.replace(new vscode.Range(document.positionAt(item.start), document.positionAt(item.end)), item.text); }, { undoStopBefore: true, undoStopAfter: true });
    } else if (plan.wrap) {
      applied = await editor.edit(edit => { edit.insert(selection.start, plan.prefix); edit.insert(selection.end, plan.suffix); }, { undoStopBefore: true, undoStopAfter: true });
      if (applied) vscode.window.showInformationMessage('Wrapped verbatim. Message syntax is unchanged: review it or run Convert Chats for supported manuscript wrappers.');
    } else applied = await editor.insertSnippet(new vscode.SnippetString(plan.snippet), selection.start, { undoStopBefore: true, undoStopAfter: true, keepWhitespace: true });
    return { status: applied ? 'inserted' : 'stale', kind: choice.id };
  };
  context.subscriptions.push(vscode.commands.registerCommand('storyTeller.insert', () => run(false)), vscode.commands.registerCommand('storyTeller.wrapSelectionAsChat', () => run(true)));
}
module.exports = { registerInsert };
