'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { convertSceneMetadata } = require('../src/convert-scene-metadata.cjs');
const { inspectStructure } = require('../src/structure.cjs');
const { parseScene } = require('../src/parser.cjs');
const front = '---\nstory_date: 2030-04-01\nlocation: West Sussex\nzero: 0\noff: false\nempty: null\nlist: [one, two]\nobject: {x: one}\n---\n\n';
const state = '> [!State]\n> **Date**: `=this.story_date`  \n> **Location**: `=this.location`\n';
test('observed State rows resolve top-level scalar references and preserve frontmatter, prose and beat boundaries', () => {
  const sample = fs.readFileSync(path.join(__dirname, '../samples/state-conversion.md'), 'utf8');
  const result = convertSceneMetadata(sample);
  assert.equal(result.count, 1); assert.deepEqual(result.warnings, []);
  assert.ok(result.text.startsWith(sample.slice(0, sample.indexOf('> [!State]'))));
  assert.ok(result.text.includes('**Date:** 2030-04-01  \n**Location:** West Sussex  \n**Active:** false  \n**Visitors:** 0'));
  assert.ok(result.text.includes('> [!Note]\n> A quoted note remains a note.'));
  assert.ok(result.text.includes('~~~~markdown\n> [!State]'));
  assert.deepEqual(inspectStructure(result.text).boundaries.map(i => inspectStructure(result.text).lines[i].text),
    inspectStructure(sample).boundaries.map(i => inspectStructure(sample).lines[i].text));
  assert.equal(parseScene(result.text).beats.length, parseScene(sample).beats.length);
  assert.deepEqual(convertSceneMetadata(result.text), { text: result.text, count: 0, changes: [], warnings: [] });
});
test('literal rows, folded and case-insensitive State headers, and redundant emphasis normalise without losing labels', () => {
  const source = front + '> [!sTaTe]-\n> ****Circulated Status****: ready  \n> **Date:** 2030-04-01  \n> Location: West Sussex\n';
  const result = convertSceneMetadata(source);
  assert.equal(result.count, 1); assert.deepEqual(result.warnings, []);
  assert.ok(result.text.includes('**Circulated Status:** ready  \n**Date:** 2030-04-01  \n**Location:** West Sussex'));
  assert.equal(result.text.slice(0, front.length), front);
});
test('date-only values remain exact ISO calendar dates; strings, zero and false survive without truthiness errors', () => {
  const source = front + '> [!State]\n> **Date**: `=this.story_date`  \n> **Zero**: `=this.zero`  \n> **Off**: `=this.off`\n';
  const result = convertSceneMetadata(source);
  assert.match(result.text, /\*\*Date:\*\* 2030-04-01/);
  assert.match(result.text, /\*\*Zero:\*\* 0/);
  assert.match(result.text, /\*\*Off:\*\* false/);
  assert.equal(result.count, 1);
});
test('missing, null, collections and unsupported expressions leave their whole State callout intact with line warnings', () => {
  const cases = [
    ['missing', 'missing', 'missing'], ['empty', 'empty', 'null'], ['list', 'list', 'complex'], ['object', 'object', 'complex'],
    ['derived', 'story_date + 1', 'unsupported Dataview'], ['nested', 'object.x', 'unsupported Dataview'],
    ['function', 'upper(this.location)', 'unsupported Dataview']
  ];
  for (const [name, expression, reason] of cases) {
    const source = front + `> [!State]\n> **Date**: \`=this.story_date\`\n> **Problem**: \`=this.${expression}\`\n`;
    const result = convertSceneMetadata(source);
    assert.equal(result.count, 0, name); assert.equal(result.text, source, name);
    assert.equal(result.warnings[0].line, front.split('\n').length + 2, name);
    assert.match(result.warnings[0].message, new RegExp(reason), name);
  }
});
test('malformed frontmatter or unsupported tags stop all conversions, including literal-only State rows', () => {
  for (const yaml of ['---\nlocation: [unclosed\n---\n', '---\nlocation: one\nlocation: two\n---\n',
    '---\nlocation: !danger value\n---\n', '---\nlocation: West Sussex\n']) {
    const source = yaml + '\n> [!State]\n> **Location**: literal\n';
    const result = convertSceneMetadata(source);
    assert.equal(result.count, 0); assert.equal(result.text, source); assert.ok(result.warnings.length);
  }
});
test('unsafe or multiline scalar text is not emitted as Markdown structure or Story Teller directives', () => {
  const source = '---\nvalue: "[[Lantern]] *glow* <script> & @pause 1ms"\nmultiline: |\n  first\n  @delay 1ms\n---\n\n' +
    '> [!State]\n> **Value**: `=this.value`\n';
  const result = convertSceneMetadata(source);
  assert.equal(result.count, 1);
  assert.ok(result.text.includes('\\[\\[Lantern\\]\\] \\*glow\\* &lt;script&gt; &amp; @pause 1ms'));
  assert.equal(parseScene(result.text).diagnostics.length, 0);
  const multi = source.replace('=this.value', '=this.multiline');
  assert.equal(convertSceneMetadata(multi).count, 0);
  assert.match(convertSceneMetadata(multi).warnings[0].message, /multiline/);
});
test('fenced examples, unrelated callouts and nested or titled State callouts remain unchanged for review', () => {
  const source = front + '~~~~markdown\n> [!State]\n> **Date**: `=this.story_date`\n~~~~\n\n' +
    '> [!Note]\n> `=this.story_date` stays literal.\n\n' +
    '> [!quote]\n> > [!State]\n> > **Date**: `=this.story_date`\n\n' +
    '> [!State] Important title\n> **Date**: `=this.story_date`\n';
  const result = convertSceneMetadata(source);
  assert.equal(result.count, 0); assert.equal(result.text, source);
  assert.ok(result.warnings.some(item => /nested/.test(item.message)));
  assert.ok(result.warnings.some(item => /titled/.test(item.message)));
});
test('an ambiguous row or expression blocks only its containing State callout', () => {
  const source = front + state + '\n> [!State]\n> **Date**: `=this.story_date`\n> prose instead of a field\n';
  const result = convertSceneMetadata(source);
  assert.equal(result.count, 1); assert.equal(result.warnings.length, 1);
  assert.ok(result.text.includes('> prose instead of a field'));
  assert.ok(result.text.includes('**Date:** 2030-04-01'));
});
test('CRLF and empty frontmatter survive a literal State conversion', () => {
  const source = '---\r\n---\r\n\r\n> [!State]+\r\n> **Status**: ready\r\n';
  const result = convertSceneMetadata(source);
  assert.equal(result.count, 1);
  assert.equal(result.text, '---\r\n---\r\n\r\n**Status:** ready\r\n');
});
