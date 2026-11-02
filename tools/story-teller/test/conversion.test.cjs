'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { convertChats } = require('../src/convert.cjs');
const { parseScene } = require('../src/parser.cjs');
const wrap = body => '```chat\n' + body + '\n```';
const chats = source => parseScene(source).beats.flatMap(b => b.blocks).filter(b => b.type === 'chat');
test('fictional representative containers preserve content/title/viewer, multiline and inherited speaker', () => {
  const source = readFileSync('samples/conversion-example.md', 'utf8');
  const result = convertChats(source);
  assert.equal(result.count, 3); assert.equal(result.warnings.length, 0);
  assert.equal(chats(result.text)[2].messages[0].subtext, "quietly");
  const blocks = chats(result.text);
  assert.equal(blocks[0].title, 'Harbour link'); assert.equal(blocks[0].viewer, 'Ari'); assert.equal(blocks[0].ticks, false);
  assert.deepEqual(blocks[0].messages.map(m => [m.speaker, m.text]), [
    ['Ari', 'Is the lamp still lit?'],
    ['Bo', 'First line.\nSecond line, with a colon: keep this together.\n\n@pause 500ms is part of this message, not a setting.']
  ]);
  assert.deepEqual(blocks[1].messages.map(m => [m.speaker, m.text]), [['Bo', 'A literal | mark.'], ['Bo', 'And one more message.']]);
  assert.equal(blocks[1].title, null); assert.equal(blocks[1].viewer, null);
  assert.match(result.text, /# Harbour link\n@viewer Ari/);
  assert.doesNotMatch(result.text, /@ticks|@responding|@delay/);
  assert.equal(convertChats(result.text).count, 0);
  assert.equal(convertChats(result.text).text, result.text);
});
test('only fence bodies change; source offsets, CRLF, BOM, punctuation and surrounding prose survive', () => {
  const source = '\uFEFF---\r\ntitle: keep me\r\n---\r\n\r\nBefore — exact!\r\n' + wrap('# Link\n{{Ari|At 12:30? Yes: exactly.|}}').replace(/\n/g, '\r\n') + '\r\nAfter\r\n';
  const result = convertChats(source);
  assert.equal(result.count, 1); assert.match(result.text, /Ari: At 12:30\? Yes: exactly\./);
  assert.ok(result.text.startsWith('\uFEFF---\r\ntitle: keep me\r\n---\r\n\r\nBefore — exact!\r\n'));
  assert.ok(result.text.endsWith('\r\nAfter\r\n'));
  assert.doesNotMatch(result.text, /(?<!\r)\n/);
  let applied = source;
  for (const c of [...result.changes].reverse()) applied = applied.slice(0, c.start) + c.text + applied.slice(c.end);
  assert.equal(applied, result.text); assert.equal(result.changes[0].line, 6);
});
test('explicit current settings carry through canonically; no guessed settings are generated', () => {
  const result = convertChats(wrap('# Link\n> Ari\n@ticks\n{{Ari|Hello|}}\n@delay 400ms\n@responding\n{{Bo|Yes|}}\n@pause 200ms'));
  assert.equal(result.count, 1);
  const block = chats(result.text)[0]; assert.equal(block.ticks, true);
  assert.equal(block.messages[1].responding, true); assert.equal(block.messages[1].delayMs, 400);
  assert.equal(block.events.at(-1).type, 'pause');
  assert.doesNotMatch(result.text, /@ticks on/);
});
test('all existing valid Story Teller syntax remains exactly unchanged', () => {
  for (const body of ['@title Link\n@viewer Ari\n@ticks\nAri: Hello', '# Link\nAri: Hello', 'Ari: {{template}}\n  | Another: line\n  | \n  | @pause 300ms']) {
    const source = wrap(body); const result = convertChats(source);
    assert.equal(result.count, 0); assert.deepEqual(result.warnings, []); assert.equal(result.text, source);
  }
});
test('ambiguous and unsupported containers are retained whole with review warnings', () => {
  for (const body of [
    '{{|Unresolved speaker|}}', '# One\n# Two\n{{Ari|Hi|}}',
    '> Ari, Bo\n{{Ari|Hi|}}', '^ System\n{{System|Hi|}}', '{{Ari|Hi|}}\n...\n{{Bo|Bye|}}',
    '{{Ari|Hi|}}\n# A later comment', '{{Ari|Unclosed',
    '{{Ari|![[image.png]]|}}', '{{Ari|Hi|}} trailing prose', '{{Ari|Hi|}}\n@unknown yes',
    '> **Ari**\n{{Ari|Hi|}}', '{{Ari|Hi|}}\n@ticks on', 'Ari:Missing space'
  ]) {
    const source = wrap(body); const result = convertChats(source);
    assert.equal(result.text, source, body); assert.equal(result.count, 0, body); assert.equal(result.warnings.length, 1, body);
  }
});
test('frontmatter, unrelated/literal fences, ordinary labels, quotes and nested containers are protected', () => {
  const examples = [
    '---\nexample: |\n  ```chat\n  {{Ari|Hi|}}\n  ```\n---\nOrdinary text',
    '````markdown\n' + wrap('{{Ari|Hi|}}') + '\n````',
    '```text\n' + wrap('{{Ari|Hi|}}') + '\n```',
    '> ```chat\n> {{Ari|Hi|}}\n> ```',
    '- Example:\n\n  ```chat\n  {{Ari|Hi|}}\n  ```',
    '    ```chat\n    {{Ari|Hi|}}\n    ```',
    'Ari: Hello\n\n“Bo,” she said.\n\n{{Ari|This is prose, not a container|}}'
  ];
  for (const source of examples) {
    const result = convertChats(source); assert.equal(result.text, source); assert.equal(result.count, 0);
  }
  const incomplete = convertChats('---\nsettings: unclosed\n' + wrap('{{Ari|Hi|}}'));
  assert.equal(incomplete.count, 0); assert.match(incomplete.warnings[0].message, /frontmatter/);
});
test('unclosed fences and historical uninspected formats are review-only; tildes/indentation are preserved', () => {
  for (const source of ['```chat\n{{Ari|Hi|}}', '```chat-old\n> **Ari:** Hi\n```', '```chat options\n{{Ari|Hi|}}\n```']) {
    const result = convertChats(source); assert.equal(result.text, source); assert.equal(result.warnings.length, 1);
  }
  const source = '  ~~~~chat\n  # Link\n  {{Ari|Hi|}}\n  ~~~~';
  const result = convertChats(source); assert.equal(result.count, 1); assert.equal(chats(result.text)[0].messages[0].text, 'Hi');
  assert.ok(result.text.endsWith('  ~~~~')); assert.equal(convertChats(result.text).text, result.text);
});
test('multiline continuation cannot execute directives or split messages, and retains empty/indented lines', () => {
  const message = '\n  spaced\n\nBo: Not a new message\n@responding\n# Not a title\n```\n  | Literal';
  const result = convertChats(wrap('{{Ari|' + message + '|}}'));
  // An actual closing fence inside a source chat is structurally ambiguous, not convertible.
  assert.equal(result.count, 0);
  const safe = message.replace('```', 'code');
  const converted = convertChats(wrap('{{Ari|' + safe + '|}}'));
  assert.equal(converted.count, 1);
  assert.equal(chats(converted.text)[0].messages.length, 1);
  assert.equal(chats(converted.text)[0].messages[0].text, safe);
  assert.equal(convertChats(converted.text).count, 0);
});
test('heading alias and explicit multiline syntax parse as one message, never as controls', () => {
  const scene = parseScene(wrap('# Link: Ari & Bo\n@viewer Ari\n@ticks\nAri: One\n  | Bo: Still Ari\n  | \n  | @responding\nBo: Reply'));
  assert.equal(scene.diagnostics.length, 0);
  assert.equal(scene.beats[0].blocks[0].title, 'Link: Ari & Bo');
  assert.equal(scene.beats[0].blocks[0].messages.length, 2);
  assert.equal(scene.beats[0].blocks[0].messages[0].text, 'One\nBo: Still Ari\n\n@responding');
  for (const body of ['  | Orphan', 'Ari: One\n@pause 100ms\n  | Ambiguous']) {
    assert.equal(parseScene(wrap(body)).diagnostics.length, 1);
  }
});
