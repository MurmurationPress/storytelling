'use strict';
const { suggestionsAt, hoverAt } = require('./intellisense.cjs');
function eligible(document, token) {
  return !token.isCancellationRequested && document.languageId === 'markdown' && document.uri.scheme !== 'story-teller-conversion';
}
function registerIntelliSense(vscode, context) {
  const selector = { language: 'markdown' };
  context.subscriptions.push(vscode.languages.registerCompletionItemProvider(selector, {
    provideCompletionItems(document, position, token, completionContext) {
      if (!eligible(document, token)) return [];
      const source = document.getText();
      const offset = document.offsetAt(position);
      const suggestions = suggestionsAt(source, offset, completionContext.triggerKind === vscode.CompletionTriggerKind.Invoke);
      if (token.isCancellationRequested) return [];
      return suggestions.map((suggestion, index) => {
        const item = new vscode.CompletionItem(suggestion.label, vscode.CompletionItemKind.Keyword);
        item.detail = suggestion.detail;
        item.documentation = new vscode.MarkdownString(suggestion.detail);
        item.documentation.isTrusted = false;
        item.insertText = new vscode.SnippetString(suggestion.snippet);
        item.range = new vscode.Range(document.positionAt(suggestion.start), document.positionAt(suggestion.end));
        item.sortText = String(index).padStart(2, '0');
        return item;
      });
    }
  }, '@'));
  context.subscriptions.push(vscode.languages.registerHoverProvider(selector, {
    provideHover(document, position, token) {
      if (!eligible(document, token)) return null;
      const found = hoverAt(document.getText(), document.offsetAt(position));
      if (!found || token.isCancellationRequested) return null;
      const markdown = new vscode.MarkdownString(found.markdown);
      markdown.isTrusted = false;
      markdown.supportHtml = false;
      return new vscode.Hover(markdown, new vscode.Range(document.positionAt(found.start), document.positionAt(found.end)));
    }
  }));
}
module.exports = { registerIntelliSense };
