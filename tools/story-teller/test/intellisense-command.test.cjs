'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { registerIntelliSense } = require('../src/intellisense-command.cjs');
function harness(source, scheme = 'file') {
  const providers = {};
  class Position { constructor(offset) { this.offset = offset; } }
  class Range { constructor(start, end) { this.start = start; this.end = end; } }
  class CompletionItem { constructor(label, kind) { this.label = label; this.kind = kind; } }
  class SnippetString { constructor(value) { this.value = value; } }
  class MarkdownString { constructor(value) { this.value = value; } }
  class Hover { constructor(contents, range) { this.contents = contents; this.range = range; } }
  const vscode = { CompletionItemKind: { Keyword: 1 }, CompletionTriggerKind: { Invoke: 0 },
    Position, Range, CompletionItem, SnippetString, MarkdownString, Hover,
    languages: {
      registerCompletionItemProvider: (selector, provider, trigger) => { providers.completion = provider; providers.trigger = trigger; return { dispose() {} }; },
      registerHoverProvider: (selector, provider) => { providers.hover = provider; return { dispose() {} }; }
    }
  };
  registerIntelliSense(vscode, { subscriptions: [] });
  const document = { languageId: 'markdown', uri: { scheme }, getText: () => source,
    offsetAt: position => position.offset, positionAt: offset => new Position(offset) };
  return { ...providers, vscode, document, position: offset => new Position(offset) };
}
test('native provider maps independent ranges/snippets and trigger character without changing adjacent source', () => {
  const source = '```typeout\n@format yaml\n@sp\n\nbody\n```';
  const h = harness(source);
  const items = h.completion.provideCompletionItems(h.document, h.position(source.indexOf('@sp') + 3), { isCancellationRequested: false }, { triggerKind: 0 });
  assert.equal(h.trigger, '@');
  assert.equal(items[0].label, '@speed');
  assert.equal(items[0].range.start.offset, source.indexOf('@sp'));
  assert.equal(items[0].range.end.offset, source.indexOf('@sp') + 3);
  assert.equal(items[0].insertText.value, '@speed ${1:30}');
  assert.equal(items[0].documentation.isTrusted, false);
});
test('cancelled requests and conversion snapshots receive no completions or hover', () => {
  const source = '@delay 100ms';
  for (const scheme of ['file', 'story-teller-conversion']) {
    const h = harness(source, scheme);
    assert.deepEqual(h.completion.provideCompletionItems(h.document, h.position(3), { isCancellationRequested: true }, { triggerKind: 0 }), []);
    assert.equal(h.hover.provideHover(h.document, h.position(3), { isCancellationRequested: true }), null);
    if (scheme === 'story-teller-conversion') {
      assert.deepEqual(h.completion.provideCompletionItems(h.document, h.position(3), { isCancellationRequested: false }, { triggerKind: 0 }), []);
      assert.equal(h.hover.provideHover(h.document, h.position(3), { isCancellationRequested: false }), null);
    }
  }
});
