'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { convertCallouts } = require('../src/convert-callouts.cjs');
const { parseScene } = require('../src/parser.cjs');
const { renderJanus } = require('../src/janus.cjs');
const { StoryPlayer } = require('../src/player.cjs');
const body = '**Date:** Tomorrow\n**To:** Council\n\nA **complete** paragraph\nwith a soft wrap.\n\n| Measure | Change |\n| :--- | ---: |\n| α | **+12** |\n| β | −3 → 0 |\n\n- First\n- [[Account|Second]]\n\nOne statement.  \nAnother statement.\n\n| Final | Value |\n| --- | --- |\n| x | ±2 |\n\nClosing.';
const fence = (text = body, format = 'janus') => '```typeout\n@format ' + format + '\n\n' + text + '\n```';
class Clock {
  time = 0; id = 0; jobs = new Map(); retired = [];
  now = () => this.time;
  setTimeout = (callback, delay) => { this.jobs.set(++this.id, { callback, at: this.time + delay }); return this.id; };
  clearTimeout = id => { if (this.jobs.has(id)) this.retired.push(this.jobs.get(id).callback); this.jobs.delete(id); };
  advance(ms) {
    const end = this.time + ms;
    for (;;) {
      const next = [...this.jobs].sort((a,b) => a[1].at - b[1].at)[0];
      if (!next || next[1].at > end) break;
      this.time = next[1].at; this.jobs.delete(next[0]); next[1].callback();
    }
    this.time = end;
  }
}
const count = player => player.visibleBlocks[0]?.revealCount;
test('JANUS converter accepts both cases and markers, prose/tables/mixed, CRLF and safe containing fences', () => {
  for (const label of ['janus', 'JANUS-LOG']) for (const marker of ['', '+', '-']) for (const content of ['A paragraph.', '| A | B |\n| --- | --- |\n| +1 | −2 |', body, '```yaml\nx: y\n```']) {
    const source = ('> [!' + label + ']' + marker + ' Report\n' + content.split('\n').map(line => '> ' + line).join('\n') + '\n').replaceAll('\n','\r\n');
    const converted = convertCallouts(source);
    assert.equal(converted.count, 1); assert.deepEqual(converted.warnings, []);
    const scene = parseScene(converted.text), block = scene.beats[0].blocks[0];
    assert.equal(scene.beats[0].title, null); assert.equal(block.title, 'Report'); assert.equal(block.format, label.toLowerCase()); assert.equal(block.sound, 'none');
    assert.equal(block.text, content.replaceAll('\n','\r\n') + '\r\n');
    assert.equal(convertCallouts(converted.text).text, converted.text);
  }
});
test('ambiguous JANUS is unchanged with source warnings; conflicts, nested callouts, structure and malformed headers', () => {
  for (const source of ['> [!janus Broken\n> A\n', '> [!janus] X\n> > [!annotation] Nested\n> A\n', '> [!janus]\n> ```yaml\n> a: b\n', '> [!janus]\n> ---\n> A\n']) {
    const result = convertCallouts(source); assert.equal(result.text, source); assert.equal(result.count, 0); assert.ok(result.warnings.length);
  }
});
test('document units preserve order, formatting, alignments and complete rows across multiple tables', () => {
  const result = renderJanus(body);
  assert.deepEqual(result.units.map(unit => unit.text.trim()), ['Date: Tomorrow', 'To: Council', 'A complete paragraph with a soft wrap.', 'Measure Change', 'α +12', 'β −3 → 0', 'First', 'Second', 'One statement.', 'Another statement.', 'Final Value', 'x ±2', 'Closing.']);
  assert.equal(result.units.filter(unit => unit.afterTable).length, 2);
  assert.equal((result.html.match(/<table>/g)||[]).length, 2);
  assert.match(result.html, /<strong>\+12<\/strong>/); assert.match(result.html, /story-align-right/);
  assert.equal((result.html.match(/data-janus-unit=/g)||[]).length, result.units.length);
  assert.deepEqual(result.references.map(ref => ref.target), ['Account']);
  assert.ok(!renderJanus('<script>alert(1)</script>').html.includes('<script>'));
});
test('unit playback shares pause, speed, cancellation, immediate reveal and reduced motion lifecycle', () => {
  const clock = new Clock(), scene = parseScene(fence() + '\n\n@pause 500ms\n\nAfter.\n\n---\nNext.');
  const player = new StoryPlayer(scene, { scheduler: clock });
  player.play(); clock.advance(300); assert.equal(count(player), 1);
  player.pause(); clock.advance(20000); assert.equal(count(player), 1);
  player.setPlaybackSpeed(1.5); player.play(); clock.advance(434); assert.equal(count(player), 2);
  player.revealImmediately(); assert.equal(count(player), 13); assert.equal(player.phase, 'playing');
  clock.advance(499); assert.equal(player.visibleBlocks.length, 1); clock.advance(1); assert.equal(player.phase, 'completed');
  player.replay(); clock.advance(634); assert.equal(count(player), 2); // reader speed retained
  player.next(); for (const callback of clock.retired) callback(); clock.advance(100000);
  assert.equal(player.index, 1); assert.equal(player.phase, 'ready');
  player.previous(); assert.equal(count(player), 13); assert.equal(player.phase, 'completed');
  player.restart(); assert.equal(count(player), undefined);
  player.setReducedMotion(true); player.play(); clock.advance(0); assert.equal(count(player), 13);
  clock.advance(500); assert.equal(player.phase, 'completed'); player.dispose(); assert.equal(clock.jobs.size, 0);
});
test('last row has reading time before completion and reduced motion skips document holds', () => {
  const clock = new Clock(), scene = parseScene(fence('| A |\n| --- |\n| Last |'));
  const player = new StoryPlayer(scene, { scheduler: clock });
  player.play(); clock.advance(950); assert.equal(count(player), 2); assert.equal(player.phase, 'playing');
  clock.advance(1099); assert.equal(player.phase, 'playing'); clock.advance(1); assert.equal(player.phase, 'completed');
  player.replay(); clock.advance(300); player.setReducedMotion(true); assert.equal(count(player), 2); assert.equal(player.phase, 'completed');
});
test('extra table cells cannot be silently discarded; escaped pipes retain content', () => {
  const text = '| A | B |\n|---|---|\n| x | y | lost |';
  const source = '> [!janus] Table\n' + text.split('\n').map(line => '> ' + line).join('\n') + '\n';
  const result = convertCallouts(source);
  assert.equal(result.text, source); assert.match(result.warnings[0].message, /extra cells/);
  assert.match(parseScene(fence(text)).diagnostics.join(''), /extra cells/);
  const safe = parseScene(fence('| A | B |\n|---|---|\n| x \\| y | +2 |'));
  assert.deepEqual(safe.diagnostics, []); assert.match(safe.beats[0].blocks[0].document.html, /x \| y/);
});

test('emphasis across explicit statement breaks remains balanced and complete', () => {
  const doc = renderJanus('*First.  \nSecond.*');
  assert.equal(doc.units.length, 2);
  assert.match(doc.html, /<em>First\.<\/em><\/span>/);
  assert.match(doc.html, /<span[^>]+><em>Second\.<\/em><\/span>/);
});

test('nested list continuations keep their source position after child items', () => {
  const doc = renderJanus('- Opening item.\n  - Child item.\n\n  Continuation after child.\n\nAfter list.');
  assert.deepEqual(doc.units.map(unit => unit.text.trim()), ['Opening item.', 'Child item.', 'Continuation after child.', 'After list.']);
  assert.equal((doc.html.match(/data-janus-unit=/g)||[]).length, 4);
});

test('JANUS titles preserve authored inline formatting without executable HTML', () => {
  const result = convertCallouts('> [!janus] **Review** & <script>literal</script>\n> Body.\n');
  assert.equal(result.count, 1);
  const scene = parseScene(result.text);
  assert.equal(scene.beats[0].blocks[0].title, '**Review** & <script>literal</script>');
  assert.match(scene.beats[0].blocks[0].document.titleHtml, /<strong>Review<\/strong>/);
  assert.ok(!scene.beats[0].blocks[0].document.titleHtml.includes('<script>'));
});
