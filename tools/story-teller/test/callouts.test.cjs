'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { convertCallouts } = require('../src/convert-callouts.cjs');
const { parseScene } = require('../src/parser.cjs');
const { inspectStructure } = require('../src/structure.cjs');
const ticks = '`'.repeat(3);
const machine = (title = 'Signal.Received') => `> [!prime-log] ${title}\n> 2030-01-02 03:04\n>\n> ${ticks}yaml\n> status: listening\n> nested:\n>   relation: unresolved\n> ${ticks}\n>\n> The receiver kept its place.\n`;
test('observed machine wrapper becomes a named beat, preserving YAML indentation and surrounding prose', () => {
  const source = `---\ntitle: fictional\n---\n\n${machine()}\nFollowing text.\n`;
  const result = convertCallouts(source);
  assert.equal(result.count, 1); assert.deepEqual(result.warnings, []);
  assert.equal(result.text.match(/^---$/gm).length, 2); // Frontmatter only, no empty leading beat.
  assert.match(result.text, /^<!-- beat: Signal\.Received -->$/m);
  assert.match(result.text, /2030-01-02 03:04[\s\S]*?```typeout\n@format yaml\n@sound modem\n\nstatus: listening\nnested:\n  relation: unresolved\n```[\s\S]*?The receiver kept its place\.[\s\S]*?Following text/);
  const scene = parseScene(result.text);
  assert.equal(scene.beats.length, 1);
  assert.equal(scene.beats[0].title, 'Signal.Received');
  assert.deepEqual(scene.beats[0].blocks.map(block => block.type), ['prose', 'typeout', 'prose']);
  assert.equal(scene.beats[0].blocks[1].text, 'status: listening\nnested:\n  relation: unresolved\n');
  assert.equal(convertCallouts(result.text).text, result.text);
});
test('existing boundaries are reused and existing matching titles remain; conflicts are review-only', () => {
  const same = 'Opening.\n\n---\n<!-- beat: Signal.Received -->\n\n' + machine();
  const converted = convertCallouts(same);
  assert.equal(converted.count, 1);
  assert.equal(converted.text.match(/^---$/gm).length, 1);
  assert.equal(converted.text.match(/<!-- beat: Signal\.Received -->/g).length, 1);
  const bare = convertCallouts('Opening.\n\n---\n\n' + machine());
  assert.match(bare.text, /---\n<!-- beat: Signal\.Received -->\n/);
  const conflict = 'Opening.\n\n---\n<!-- beat: Existing title -->\n\n' + machine();
  const held = convertCallouts(conflict);
  assert.equal(held.count, 0); assert.equal(held.text, conflict);
  assert.match(held.warnings[0].message, /conflicts/); assert.equal(held.warnings[0].line, 6);
  const firstConflict = '<!-- beat: Existing title -->\n\n' + machine();
  const firstHeld = convertCallouts(firstConflict);
  assert.equal(firstHeld.count, 0); assert.equal(firstHeld.text, firstConflict);
  assert.match(firstHeld.warnings[0].message, /conflicts/);
});
test('multiple callouts start successive beats; following prose stays with its converted callout', () => {
  const source = `Opening.\n\n${machine()}\nA bridge paragraph.\n\n> [!annotation]- Margin note\n> First line.\n> > meaningful inner quote\n> Second line.\n\nClosing.\n`;
  const result = convertCallouts(source);
  assert.equal(result.count, 2); assert.equal(result.warnings.length, 0);
  assert.deepEqual(parseScene(result.text).beats.map(beat => beat.title), [null, 'Signal.Received', 'Margin note']);
  assert.match(result.text, /```typeout\n@format annotation\n@sound keyboard\n\nFirst line\.\n> meaningful inner quote\nSecond line\./);
  assert.match(result.text, /Second line\.[\s\S]*?Closing\./);
  assert.equal(convertCallouts(result.text).count, 0);
});
test('annotation body backticks and CRLF survive through a longer containing fence', () => {
  const source = '> [!annotation] Note\r\n> The literal marker is below.\r\n> ```example\r\n> @pause 900ms\r\n> ```\r\n';
  const result = convertCallouts(source);
  assert.equal(result.count, 1);
  assert.match(result.text, /````typeout\r\n@format annotation\r\n@sound keyboard\r\n\r\nThe literal marker is below\.\r\n```example\r\n@pause 900ms\r\n```\r\n````/);
  assert.equal(parseScene(result.text).beats[0].blocks[0].text, 'The literal marker is below.\r\n```example\r\n@pause 900ms\r\n```\r\n');
});
test('unrelated/literal components and frontmatter remain unchanged', () => {
  const source = `---\ntitle: invented\n---\n\n${ticks}md\n> [!prime-log] Literal\n> ${ticks}yaml\n> a: b\n> ${ticks}\n${ticks}\n\n> [!chat] Dialogue\n> Ari: Hello\n\n> [!State]\n> status: metadata\n\n${ticks}yaml\nordinary: true\n${ticks}\n\n${ticks}typeout\n@format yaml\n\noriginal: true\n${ticks}\n`;
  const result = convertCallouts(source);
  assert.equal(result.count, 0); assert.equal(result.text, source); assert.equal(result.warnings.length, 0);
  assert.deepEqual(inspectStructure(result.text).boundaries, []);
});
test('ambiguous machine callouts and unsafe titles are retained with source warnings', () => {
  for (const [source, pattern] of [
    ['> [!prime-log] Prose only\n> There is no YAML.\n', /one top-level YAML/],
    [`> [!divergent] Two fences\n> ${ticks}yaml\n> a: b\n> ${ticks}\n> ${ticks}yaml\n> c: d\n> ${ticks}\n`, /one top-level YAML/],
    [`> [!prime-log] Unclosed\n> ${ticks}yaml\n> a: b\n`, /unclosed YAML/],
    [`> [!prime-log] Mixed\n> @pause 100ms\n> ${ticks}yaml\n> a: b\n> ${ticks}\n`, /surrounding prose/],
    [`> [!prime-log] Outer\n> > [!annotation] Inner\n> ${ticks}yaml\n> a: b\n> ${ticks}\n`, /nested or adjacent callout/],
    [`> [!prime-log] Outer\n> [!annotation] Adjacent\n> ${ticks}yaml\n> a: b\n> ${ticks}\n`, /nested or adjacent callout/],
    ['> [!annotation Broken\n> Note.\n', /malformed recognised callout/],
    [`> [!annotation] Broken --> title\n> Note.\n`, /cannot be represented/]
  ]) {
    const result = convertCallouts(source);
    assert.equal(result.count, 0, source); assert.equal(result.text, source);
    assert.match(result.warnings[0].message, pattern);
    assert.equal(result.warnings[0].line, 1);
  }
});
test('a missing displayed title uses the recognised callout label and existing chat stays intact', () => {
  const source = `> [!annotation]+  \n> A note.\n\n${ticks}chat\n# Link\nAri: Hi.\n${ticks}\n`;
  const result = convertCallouts(source);
  assert.equal(result.count, 1);
  assert.equal(parseScene(result.text).beats[0].title, 'annotation');
  assert.ok(result.text.includes(`${ticks}chat\n# Link\nAri: Hi.\n${ticks}`));
});
