'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const MarkdownIt = require('markdown-it');
const { wikiLinks } = require('../src/annotation.cjs');
const { visibleWords, proseInterval, effectivePacing } = require('../src/prose-pacing.cjs');
const { sceneSetting, sceneEdit, projectEdit, resolveSettings } = require('../src/pacing-settings.cjs');
const { parseScene } = require('../src/parser.cjs');
const { StoryPlayer } = require('../src/player.cjs');
class Clock {
  time = 0; serial = 0; jobs = new Map(); retired = [];
  now = () => this.time;
  setTimeout = (callback, ms) => { const id = ++this.serial; this.jobs.set(id, { callback, at: this.time + ms }); return id; };
  clearTimeout = id => { const job = this.jobs.get(id); if (job) this.retired.push(job.callback); this.jobs.delete(id); };
  advance(ms) { const end = this.time + ms; for (;;) { const next = [...this.jobs].sort((a,b) => a[1].at-b[1].at)[0]; if (!next || next[1].at > end) break; this.time = next[1].at; this.jobs.delete(next[0]); next[1].callback(); } this.time = end; }
}
function session(source, enabled = true) { const clock = new Clock(); const scene = parseScene(source, { prosePacing: enabled }); return { scene, clock, player: new StoryPlayer(scene, { scheduler: clock }) }; }
const prose = player => player.visibleBlocks.filter(b => b.type === 'prose').map(b => b.html).join('');
test('book and scene inheritance preserve the absent-setting default', () => {
  assert.deepEqual(effectivePacing(), { enabled: false, value: 'off', source: 'unchanged default' });
  assert.deepEqual(effectivePacing('on', 'inherit'), { enabled: true, value: 'on', source: 'book' });
  assert.deepEqual(effectivePacing('on', 'off'), { enabled: false, value: 'off', source: 'scene' });
  assert.equal(resolveSettings('---\nstory_teller_prose_pacing: on\n---\nHello', null).enabled, true);
  assert.equal(resolveSettings('Hello', { settings: { prosePacing: 'on' } }).source, 'book');
  assert.equal(sceneSetting('---\nstory_teller_prose_pacing: inherit\n---\nHi').value, 'inherit');
  assert.equal(projectEdit({ schema: 'story-teller-project', version: 1 }, 'on').settings.prosePacing, 'on');
});
test('scene helper changes only frontmatter and preserves body, boundaries and line endings', () => {
  const source = '---\r\ntitle: Fiction\r\n---\r\n---\r\nScene';
  const on = sceneEdit(source, 'on');
  assert.match(on, /title: Fiction\r\nstory_teller_prose_pacing: on\r\n---\r\n---\r\nScene/);
  assert.equal(sceneEdit(on, 'inherit'), source);
  assert.equal(sceneEdit('Plain text', 'inherit'), 'Plain text');
  assert.throws(() => sceneEdit('---\na: [\n---\nBody', 'on'), /Invalid frontmatter/);
  assert.throws(() => sceneEdit('---\n"story_teller_prose_pacing": on\n---\nBody', 'off'), /unsupported key layout/);
});
test('word count uses rendered words, not Markdown punctuation or hidden wiki targets', () => {
  const md = new MarkdownIt({ html: false }); wikiLinks(md);
  const inline = md.parse('**Bold words** [[long hidden target|shown]] `code` and ![not counted](a.png)', {}).find(t => t.type === 'inline');
  assert.equal(visibleWords(inline), 5);
  assert.equal(proseInterval(1), 1000); assert.equal(proseInterval(50), 3000); assert.equal(proseInterval(100), 4000);
});
test('enabled paragraphs reveal whole and wait only before a following item; absent setting keeps old grouping', () => {
  const source = 'First paragraph.\n\nSecond paragraph.';
  assert.equal(parseScene(source).beats[0].blocks.length, 1);
  const { player, clock, scene } = session(source);
  assert.equal(scene.beats[0].blocks.length, 2);
  assert.match(prose(player), /First paragraph/); assert.doesNotMatch(prose(player), /Second paragraph/);
  player.play(); clock.advance(999); assert.doesNotMatch(prose(player), /Second paragraph/);
  clock.advance(1); assert.match(prose(player), /Second paragraph/); assert.equal(player.phase, 'completed');
  assert.equal(clock.time, 1000); assert.equal(clock.jobs.size, 0);
});
test('explicit delay replaces prose boundary, pause adds, chat still keeps its own timing', () => {
  const source = 'First.\n\n@pause 300ms\n@delay 200ms\n\n```chat\nA: Hi\n```';
  const { player, clock, scene } = session(source);
  assert.equal(scene.beats[0].blocks[1].boundaryDelayMs, 200);
  player.play(); clock.advance(499); assert.equal(player.visibleBlocks.some(b => b.type === 'chat'), false);
  clock.advance(1); assert.equal(player.visibleBlocks.some(b => b.type === 'chat'), false);
  clock.advance(799); assert.equal(player.visibleBlocks.some(b => b.type === 'chat'), false);
  clock.advance(1); assert.equal(player.visibleBlocks.find(b => b.type === 'chat').messages.length, 1);
  assert.equal(clock.time, 1300);
});
test('in-chat first-message delay stays separate from prose boundary and is not overridden', () => {
  const { player, clock } = session('First.\n\n@delay 200ms\n\n```chat\n@delay 400ms\nA: Hello\n```');
  player.play(); clock.advance(599); assert.equal(player.visibleBlocks.some(b => b.type === 'chat'), false);
  clock.advance(1); assert.equal(player.visibleBlocks.find(b => b.type === 'chat').messages.length, 1);
});
test('structured blocks remain intact and have no own automatic reading interval', () => {
  const { player, clock, scene } = session('First.\n\n- One\n- Two\n\n> Quoted text\n\n```js\ncode\n```\n\nLast.');
  assert.deepEqual(scene.beats[0].blocks.map(b => Boolean(b.pacedParagraph)), [true, false, true]);
  assert.match(scene.beats[0].blocks[1].html, /<ul>/); assert.match(scene.beats[0].blocks[1].html, /<blockquote>/); assert.match(scene.beats[0].blocks[1].html, /<pre>/);
  player.play(); clock.advance(999); assert.doesNotMatch(prose(player), /One/);
  clock.advance(1); assert.match(prose(player), /One/); assert.match(prose(player), /Last/);
});
test('images and captions stay associated and follow the preceding paragraph interval', () => {
  const source = 'Look here.\n\n![Harbour](assets/lamp.png)\n\n*Caption: Night light*\n\n@pause 400ms\n\nAfter.';
  const { scene, player, clock } = session(source);
  assert.equal(scene.beats[0].blocks[1].type, 'image');
  assert.equal(scene.beats[0].blocks[1].caption, 'Night light');
  assert.equal(scene.beats[0].blocks[1].src, 'assets/lamp.png');
  assert.equal(scene.beats[0].blocks[2].type, 'prose');
  player.play(); clock.advance(999); assert.equal(player.visibleBlocks.some(b => b.type === 'image'), false);
  clock.advance(1); assert.equal(player.visibleBlocks.some(b => b.type === 'image'), true);
  clock.advance(399); assert.doesNotMatch(prose(player), /After/);
  clock.advance(1); assert.match(prose(player), /After/);
  assert.equal(source.includes('@pause 400ms'), true); // Parser/player never edit source.
});
test('reduced motion retains paragraph sequencing and authored pauses', () => {
  const clock = new Clock();
  const player = new StoryPlayer(parseScene('First.\n\n@pause 200ms\n\nSecond.', { prosePacing: true }), { scheduler: clock, reducedMotion: true });
  player.play(); clock.advance(1199); assert.doesNotMatch(prose(player), /Second/);
  clock.advance(1); assert.match(prose(player), /Second/);
});
test('lifecycle cancels prose wait and stale callbacks; previous reveals everything silently', () => {
  const { player, clock, scene } = session('One.\n\nTwo.\n---\nThree.');
  player.play(); clock.advance(300); player.pause(); assert.equal(player.remaining, 700);
  clock.advance(10000); assert.doesNotMatch(prose(player), /Two/);
  player.play(); clock.advance(699); assert.doesNotMatch(prose(player), /Two/);
  clock.advance(1); assert.match(prose(player), /Two/);
  player.next({ autoplay: true }); player.previous(); assert.match(prose(player), /Two/); assert.equal(player.phase, 'completed');
  player.replay(); player.update(scene); assert.equal(clock.jobs.size, 0);
  for (const stale of clock.retired) stale(); assert.doesNotMatch(prose(player), /Two/);
  player.dispose(); assert.equal(clock.jobs.size, 0);
});
