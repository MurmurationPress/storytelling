'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { suggestionsAt, hoverAt, scopeAt } = require('../src/intellisense.cjs');
const at = (source, marker, manual = true) => suggestionsAt(source, source.indexOf(marker) + marker.length, manual);
const labels = items => items.map(item => item.label);
const apply = (source, item) => source.slice(0, item.start) + item.snippet + source.slice(item.end);
test('root suggestions are limited to standalone timing and replace partial names once', () => {
  assert.deepEqual(labels(at('@de', '@de')), ['@delay']);
  const item = at('Before.\n\n@de\n\nAfter.', '@de')[0];
  assert.equal(apply('Before.\n\n@de\n\nAfter.', item), 'Before.\n\n@delay ${1:1000}ms\n\nAfter.');
  assert.deepEqual(labels(at('\n\n', '\n\n')), ['@delay', '@pause']);
  assert.deepEqual(at('Prose @de', '@de'), []);
  assert.deepEqual(at('Prose\n@de', '@de'), []); // Continuing paragraph, no blank line.
});
test('chat header and positional contexts share parser syntax and suppress singleton duplicates', () => {
  const chat = '```chat\n@viewer Mara\n@pace normal\n@\nMara: Hello.\n@\nIvo: Yes.\n```';
  const first = suggestionsAt(chat, chat.indexOf('@\nMara') + 1, true);
  assert.ok(labels(first).includes('@ticks'));
  assert.ok(!labels(first).includes('@viewer'));
  assert.ok(!labels(first).includes('@pace'));
  const after = suggestionsAt(chat, chat.lastIndexOf('@\nIvo') + 1, true);
  assert.deepEqual(labels(after), ['@delay', '@pause', '@responding', '@subtext']);
  const edit = '```chat\n@pace br\nMara: Hello.\n```';
  assert.deepEqual(labels(at(edit, '@pace br')), ['brisk']);
  assert.equal(apply(edit, at(edit, '@pace br')[0]), '```chat\n@pace brisk\nMara: Hello.\n```');
  const own = '```chat\n@pace br\n@viewer Mara\nMara: Hello.\n```';
  assert.ok(labels(at(own, '@pace')).includes('@pace'));
  const pacedAfterPause = '```chat\n@pause 10ms\n@pace brisk\n@\nMara: Hello.\n```';
  assert.ok(!labels(suggestionsAt(pacedAfterPause, pacedAfterPause.indexOf('@\nMara') + 1, true)).includes('@pace'));
});
test('type-out header offers supported settings, values and numeric snippets; body is literal', () => {
  const source = '```typeout\n@format yaml\n@so\n\n@speed 7\n```';
  assert.deepEqual(labels(at(source, '@so')), ['@sound']);
  assert.equal(at(source, '@so')[0].snippet, '@sound ${1:modem}');
  for (const [partial, expected] of [['@sound mo', 'modem'], ['@border gr', 'grey'], ['@fill ye', 'yellow']]) {
    const content = `\`\`\`typeout\n@format yaml\n${partial}\n\ntext\n\`\`\``;
    assert.equal(labels(at(content, partial))[0], expected);
  }
  assert.equal(suggestionsAt(source, source.indexOf('@speed 7') + 8, true).length, 0);
  assert.deepEqual(at(source, '@speed 7'), []);
  const speed = '```typeout\n@format yaml\n@sp\n\ntext\n```';
  assert.equal(at(speed, '@sp')[0].snippet, '@speed ${1:30}');
  const duplicate = '```typeout\n@format yaml\n@sound modem\n@\n\ntext\n```';
  assert.ok(!labels(suggestionsAt(duplicate, duplicate.indexOf('@\n\ntext') + 1, true)).includes('@sound'));
});
test('timing values, suffixes and CRLF replacement leave adjacent content intact', () => {
  const source = '@delay 12ms\r\n\r\nNext.';
  const items = suggestionsAt(source, source.indexOf('ms'), true);
  assert.equal(items[0].snippet, '${1:1000}ms');
  assert.equal(apply(source, items[0]), '@delay ${1:1000}ms\r\n\r\nNext.');
  const pause = at('```chat\n@pa\nMara: Wait.\n```', '@pa')[0];
  assert.match(pause.detail, /Adds silence/);
  assert.match(at('@de', '@de')[0].detail, /Replaces/);
});
test('frontmatter, unrelated fences, blockquotes, inline code and literal type-out text are protected', () => {
  for (const source of ['---\n@de\n---\nText', '```yaml\n@de\n```', '> @de', '`@de`',
    '```typeout\n@format yaml\n\n@de\n```', '~~~~markdown\n@de\n~~~~']) {
    assert.deepEqual(at(source, '@de'), [], source);
    assert.equal(hoverAt(source, source.indexOf('@de') + 2), null, source);
  }
  const separatorBeingReplaced = '```typeout\n@format yaml\n@\nbody\n```';
  assert.deepEqual(suggestionsAt(separatorBeingReplaced, separatorBeingReplaced.indexOf('@\nbody') + 1, true), []);
});
test('hover is scoped, source-located and documents defaults and values', () => {
  const source = '```typeout\n@speed 24\n@sound modem\n\nbody\n```';
  const speed = hoverAt(source, source.indexOf('@speed') + 3);
  assert.match(speed.markdown, /1–120 Unicode grapheme clusters per second\. Default 30/);
  assert.equal(speed.start, source.indexOf('@speed'));
  assert.match(hoverAt(source, source.indexOf('@sound') + 2).markdown, /modem, keyboard, typewriter, none/);
  const chat = '```chat\n@pace brisk\n@responding\nMara: Hi.\n```';
  assert.match(hoverAt(chat, chat.indexOf('@pace') + 2).markdown, /0.7×/);
  assert.match(hoverAt(chat, chat.indexOf('@responding') + 2).markdown, /incoming/);
  assert.match(hoverAt('@pause 100ms', 2).markdown, /1–60000ms/);
  assert.equal(scopeAt('A line with @pause 100ms', 13), null);
});
