'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { inspectStructure, contextAt } = require('../src/structure.cjs');
const { planInsertion, choices } = require('../src/insert.cjs');
const { parseScene } = require('../src/parser.cjs');
const { convertChats } = require('../src/convert.cjs');
const at = (source, offset, kind) => planInsertion(source, { start: offset, end: offset }, kind);
const concrete = snippet => snippet.replace(/\$\{(\d+):([^}]+)\}/g, '$2').replace(/\$\{2\}/g, 'Viewer').replace(/\$0/g, '');
test('chat snippet uses native placeholders, linked viewer and supported canonical syntax without optional flags', () => {
  const plan = at('', 0, 'chat');
  assert.match(plan.snippet, /# \$\{1:/); assert.match(plan.snippet, /@viewer \$\{2:/); assert.match(plan.snippet, /\$\{2\}:/);
  const scene = parseScene(concrete(plan.snippet));
  assert.equal(scene.diagnostics.length, 0); const chat = scene.beats[0].blocks[0];
  assert.equal(chat.viewer, 'Viewer'); assert.equal(chat.title, 'Conversation title');
  assert.equal(chat.messages.length, 2); assert.equal(chat.ticks, false);
  assert.ok(chat.messages.every(m => !m.responding));
  assert.equal(choices.length, 12); assert.ok(!plan.snippet.includes('@pace')); assert.equal(chat.pace, 'normal');
});
test('root directives and boundary are standalone without deleting existing prose', () => {
  for (const kind of ['chat', 'delay', 'pause', 'boundary']) {
    const source = 'BeforeAfter'; const plan = at(source, 6, kind); assert.equal(plan.error, undefined);
    const result = source.slice(0, 6) + concrete(plan.snippet) + source.slice(6);
    assert.ok(result.startsWith('Before\n\n')); assert.ok(result.endsWith('After'));
    assert.equal(parseScene(result).diagnostics.length, 0);
    if (kind === 'boundary') assert.equal(parseScene(result).beats.length, 2);
  }
  assert.match(at('', 0, 'boundary').error, /frontmatter/);
  assert.match(at('---\ntitle: Draft\n---\n\n', '---\ntitle: Draft\n---\n\n'.length, 'boundary').error, /story content/);
});
test('chat-only flags refuse root insertion; chat fences and boundaries refuse nesting', () => {
  for (const kind of ['ticks', 'responding']) assert.match(at('Text\n', 5, kind).error, /chat-only/);
  const source = '```chat\n# Link\n@viewer Ari\n\nAri: Hello\nBo: Yes\n```';
  const offset = source.indexOf('\n\n') + 1;
  for (const kind of ['chat', 'boundary', 'wrap']) assert.ok(at(source, offset, kind).error);
  for (const kind of ['delay', 'pause', 'ticks', 'responding']) {
    const plan = at(source, offset, kind); assert.equal(plan.error, undefined, kind);
    const result = source.slice(0, offset) + concrete(plan.snippet) + source.slice(offset);
    assert.equal(parseScene(result).diagnostics.length, 0, kind);
  }
  assert.match(at(source, source.indexOf('Hello') + 2, 'pause').error, /inside a message/);
  assert.match(at(source, source.indexOf('Bo:'), 'ticks').error, /header/);
});
test('flags require actual viewer syntax and do not duplicate header flags', () => {
  for (const flag of ['ticks', 'responding']) {
    const source = '```chat\n\nAri: Hi\n```'; assert.match(at(source, 8, flag).error, /@viewer Name/);
    const existing = `\`\`\`chat\n@viewer Ari\n\n@${flag}\nAri: Hi\n\`\`\``;
    assert.match(at(existing, existing.indexOf('\n\n') + 1, flag).error, /already/);
  }
});
test('selection is never silently replaced; wrapping preserves content verbatim without conversion', () => {
  const source = 'Before\n\n{{Ari|Hello ${1:literal}|}}\n\nAfter';
  const start = source.indexOf('{{'); const end = source.indexOf('}}') + 2;
  assert.match(planInsertion(source, { start, end }, 'chat').error, /Selected text/);
  const plan = planInsertion(source, { start, end }, 'wrap'); assert.ok(plan.wrap);
  const result = source.slice(0, start) + plan.prefix + source.slice(start, end) + plan.suffix + source.slice(end);
  assert.ok(result.includes(source.slice(start, end))); assert.match(result, /\{\{Ari\|/);
  assert.equal(convertChats(result).count, 1);
  assert.match(at('Text', 4, 'wrap').error, /Select/);
});
test('wrapping cannot hide beat boundaries, frontmatter or nest existing/literal code fences', () => {
  for (const source of ['Before\n---\nAfter', '```chat\nAri: Hello\n```', '````markdown\n```chat\nAri: Hi\n```\n````', '---\ntitle: Example\n---\nStory']) {
    assert.ok(planInsertion(source, { start: 0, end: source.length }, 'wrap').error, source);
  }
});
test('frontmatter and literal contexts are consistently protected, including CRLF and unclosed fences', () => {
  const examples = ['---\ntitle: Test\n---\nText', '---\nunclosed', '```text\nexample\n---\n```', '> quoted example', '- item', '    indented code', '```chat\nAri: Hello'];
  for (const source of examples) {
    const offset = source.includes('example\n') ? source.indexOf('example') : 1;
    assert.ok(at(source, offset, 'chat').error, source);
  }
  const source = 'Before\r\n\r\nAfter'; const plan = at(source, 8, 'pause');
  assert.match(plan.snippet, /\r\n/); assert.doesNotMatch(plan.snippet, /(?<!\r)\n/);
});
test('frontmatter, literal fences and real separators agree across parsing and conversion exactly', () => {
  const source = '\uFEFF---\r\ntitle: Test\r\n---\r\n\r\nBefore\r\n---  \r\n```chat\r\n# Link\r\n{{Ari|Line one\r\n---\r\nLine two|}}\r\n```\r\n\r\n---\r\n```text\r\n---\r\n```\r\nAfter';
  const original = inspectStructure(source); const result = convertChats(source); const changed = inspectStructure(result.text);
  assert.equal(result.count, 1); assert.equal(original.boundaries.length, 2);
  assert.deepEqual(original.boundaries.map(i => original.lines[i].text + original.lines[i].eol), changed.boundaries.map(i => changed.lines[i].text + changed.lines[i].eol));
  assert.equal(parseScene(source).beats.length, 3); assert.equal(parseScene(result.text).beats.length, 3);
  assert.equal(source.slice(0, original.lines[original.start].start), result.text.slice(0, changed.lines[changed.start].start));
  for (const i of original.boundaries) assert.ok(result.changes.every(c => !(original.lines[i].start >= c.start && original.lines[i].start < c.end)));
  assert.equal(contextAt(original, source.indexOf('Line one')).kind, 'chat');
});
test('inline literal examples and message continuations cannot be broken by helpers', () => {
  const source = 'A literal `@delay 300ms` example.';
  assert.match(at(source, source.indexOf('@delay') + 2, 'pause').error, /code examples/);
  const escaped = 'A literal \\` unmatched marker.';
  assert.equal(at(escaped, escaped.indexOf('marker'), 'pause').error, undefined);
  const chat = '```chat\n@viewer Ari\nAri: First\n  | Second\n  | Third\nBo: Yes\n```';
  assert.match(at(chat, chat.indexOf('  | Second'), 'pause').error, /continuations/);
  const noMatch = '```chat\n@viewer Ari\n\nBo: Hello\n```';
  assert.match(at(noMatch, noMatch.indexOf('\n\n') + 1, 'ticks').error, /matching a speaker/);
});
test('explicit wrapping can preserve complete quote/list blocks and manuscript viewer markers without guessing syntax', () => {
  for (const source of ['# Link\n\n> Ari\n\n{{Ari|Hello|}}', '> Quoted text', '- One\n- Two']) {
    const plan = planInsertion(source, { start: 0, end: source.length }, 'wrap'); assert.ok(plan.wrap, plan.error);
    const result = plan.prefix + source + plan.suffix; assert.ok(result.includes(source));
    if (source.includes('{{')) assert.equal(convertChats(result).count, 1);
  }
  const partial = '> Quoted text';
  assert.ok(planInsertion(partial, { start: 3, end: partial.length }, 'wrap').error);
});

test('pace helper inserts/updates chat-local configuration in one edit plan, preserving messages and EOL', () => {
  const { planPace } = require('../src/insert.cjs');
  const apply = (source, plan) => plan.edits.sort((a, b) => b.start - a.start).reduce((text, edit) => text.slice(0, edit.start) + edit.text + text.slice(edit.end), source);
  for (const eol of ['\n', '\r\n']) {
    const source = ['Before', '```chat', '# Radio', '@viewer Ari', 'Ari: Hi', 'Bo: Yes', '  | @pace literal', '```', 'After'].join(eol);
    const offset = source.indexOf('Ari: Hi');
    const result = apply(source, planPace(source, { start: offset, end: offset }, 'brisk'));
    assert.equal(result, source.replace('```chat' + eol, '```chat' + eol + '@pace brisk' + eol));
    const updated = apply(result, planPace(result, { start: result.indexOf('Bo: Yes'), end: result.indexOf('Bo: Yes') }, 'deliberate'));
    assert.equal(updated, result.replace('@pace brisk', '@pace deliberate'));
    assert.equal(parseScene(updated).diagnostics.length, 0);
  }
  const late = '```chat\nA: Hi\n@pace brisk\n@pace normal\n```';
  assert.equal(apply(late, planPace(late, { start: late.indexOf('A: Hi'), end: late.indexOf('A: Hi') }, 'normal')), '```chat\n@pace normal\nA: Hi\n```');
  for (const source of ['Prose', '```js\nexample\n```', '---\ntitle: x\n---'])
    assert.match(planPace(source, { start: 1, end: 1 }, 'brisk').error, /chat-only/);
});
