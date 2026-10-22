'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { inspectStructure, beatRanges, beatAtOffset, beatFoldRanges } = require('../src/structure.cjs');
const { parseScene } = require('../src/parser.cjs');
const { planBeatInsertion, planCaption } = require('../src/insert.cjs');
const { StoryPlayer } = require('../src/player.cjs');
const ranges = source => beatRanges(inspectStructure(source));
test('titles after frontmatter and separators are metadata with precise source ranges', () => {
  const source = '---\ntitle: Demo\n---\n\n<!-- beat: Same -->\n\nFirst.\n---\n<!-- beat: Same -->\n\nSecond.\n---\nThird.';
  const scene = parseScene(source);
  assert.deepEqual(scene.beats.map(beat => beat.title), ['Same', 'Same', null]);
  assert.deepEqual(scene.beats.map(beat => beat.blocks[0].html.includes('beat:')), [false, false, false]);
  assert.deepEqual(ranges(source).map(range => source.slice(range.startOffset, range.endOffset)),
    ['\n<!-- beat: Same -->\n\nFirst.\n', '---\n<!-- beat: Same -->\n\nSecond.\n', '---\nThird.']);
  assert.equal(beatAtOffset(ranges(source), source.indexOf('Second.')), 1);
  assert.equal(beatAtOffset(ranges(source), source.lastIndexOf('---')), 2);
  assert.equal(beatAtOffset(ranges(source), source.length), 2);
  assert.equal(beatAtOffset(ranges(source), source.indexOf('title: Demo')), -1);
  assert.deepEqual(beatFoldRanges(ranges(source)), [{ start: 4, end: 6 }, { start: 8, end: 10 }, { start: 11, end: 12 }]);
});
test('literal title examples and separators remain prose; edits rebase beat offsets', () => {
  const source = '```md\n<!-- beat: Example -->\n---\n```\n\nBefore.\n---\n<!-- beat: Actual -->\nAfter.';
  assert.deepEqual(parseScene(source).beats.map(beat => beat.title), [null, 'Actual']);
  assert.match(parseScene(source).beats[0].blocks[0].html, /beat: Example/);
  const changed = 'Inserted.\n' + source;
  assert.equal(beatAtOffset(ranges(changed), changed.indexOf('After.')), 1);
  assert.equal(ranges(changed)[1].titleLine, ranges(source)[1].titleLine + 1);
  assert.equal(parseScene('<!-- beat: Empty -->').beats.length, 0);
});
test('beat helper preserves selected content and validates title syntax', () => {
  const source = 'BeforeAfter';
  const position = 6;
  const plan = planBeatInsertion(source, { start: position, end: position }, 'A different way of seeing');
  const text = source.slice(0, position) + plan.snippet.replace('$0', '') + source.slice(position);
  assert.match(text, /Before\n\n---\n<!-- beat: A different way of seeing -->\n\nAfter/);
  assert.equal(parseScene(text).beats[1].title, 'A different way of seeing');
  assert.equal(planBeatInsertion(source, { start: position, end: position }, '').snippet.includes('<!-- beat:'), false);
  assert.match(planBeatInsertion(source, { start: position, end: position }, 'x -->').error, /cannot contain/);
});
test('caption helper associates image, intervening blank and existing caption without orphans', () => {
  const source = 'Before.\n\n![Description](assets/one.png)\n\n*Caption: The lower landing.*\n\nAfter.';
  for (const at of [source.indexOf('Description'), source.indexOf('\n\n*Caption') + 1, source.indexOf('The lower')]) {
    const plan = planCaption(source, { start: at, end: at });
    assert.equal(source.slice(plan.select.start, plan.select.end), 'The lower landing.');
  }
  const without = source.replace('*Caption: The lower landing.*\n\n', '');
  const insert = planCaption(without, { start: without.indexOf('Description'), end: without.indexOf('Description') });
  assert.equal(insert.error, undefined);
  const created = without.slice(0, insert.at) + insert.snippet.replace('${1:Your caption here}', 'New caption') + without.slice(insert.at);
  assert.equal(parseScene(created).beats[0].blocks.find(block => block.type === 'image').caption, 'New caption');
  assert.match(planCaption(source, { start: source.indexOf('Before'), end: source.indexOf('Before') }).error, /standalone image/);
  assert.match(planCaption(source, { start: 0, end: 2 }).error, /Clear the selection/);
});
test('edited titled beat follows a later unchanged source anchor after an earlier boundary is removed', () => {
  const base = '<!-- beat: Start -->\nOpening.\n---\n<!-- beat: Middle -->\nConversation.\n---\nEnd.';
  const player = new StoryPlayer();
  player.update(parseScene(base)); player.index = 1; player.reset();
  player.update(parseScene(base.replace('Opening.', 'Inserted.\n---\nOpening.')));
  assert.equal(player.index, 2);
  player.update(parseScene(base.replace('Conversation.', 'Conversation changed.')));
  assert.equal(player.index, 1);
  assert.equal(player.current.title, 'Middle');
});
