'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseScene } = require('../src/parser.cjs');
const { StoryPlayer } = require('../src/player.cjs');
const { graphemes, graphemeDelay, DEFAULT_SPEED } = require('../src/typeout.cjs');
const { TypeoutSound } = require('../src/sound.cjs');
const { planTypeoutInsertion } = require('../src/insert.cjs');
const mark = String.fromCharCode(96).repeat(3);
const fence = (header, body) => mark + 'typeout\n' + header + '\n\n' + body + '\n' + mark;
class Clock {
  time = 0; id = 0; jobs = new Map(); retired = [];
  now = () => this.time;
  setTimeout = (callback, delay) => { this.jobs.set(++this.id, { callback, at: this.time + delay }); return this.id; };
  clearTimeout = id => { if (this.jobs.has(id)) this.retired.push(this.jobs.get(id).callback); this.jobs.delete(id); };
  advance(ms) {
    const end = this.time + ms;
    for (;;) {
      const next = [...this.jobs].sort((a, b) => a[1].at - b[1].at)[0];
      if (!next || next[1].at > end) break;
      this.time = next[1].at; this.jobs.delete(next[0]); next[1].callback();
    }
    this.time = end;
  }
}
const output = player => player.visibleBlocks.find(block => block.type === 'typeout');
test('literal body, CRLF, Unicode and header-only configuration stay distinct', () => {
  const source = ('Before.\n\n' + fence('@format yaml\n@sound modem\n@speed 24', '  state: 🛰️\n@pause 900ms\n<script>literal</script>') + '\n\nAfter').replaceAll('\n', '\r\n');
  const scene = parseScene(source);
  const block = scene.beats[0].blocks[1];
  assert.equal(block.type, 'typeout'); assert.equal(block.format, 'yaml'); assert.equal(block.sound, 'modem'); assert.equal(block.speed, 24);
  assert.equal(block.text, '  state: 🛰️\r\n@pause 900ms\r\n<script>literal</script>\r\n');
  assert.deepEqual(scene.beats[0].blocks.map(item => item.type), ['prose', 'typeout', 'prose']);
  assert.equal(scene.diagnostics.length, 0);
  const ordinary = parseScene(mark + 'yaml\nstatus: ordinary\n' + mark + '\n\n> ' + mark + 'typeout\n> @format annotation\n> \n> quoted\n> ' + mark);
  assert.deepEqual(ordinary.beats[0].blocks.map(item => item.type), ['prose']);
});
test('invalid and duplicate header settings diagnose locations and remain readable code', () => {
  for (const [body, line, expected] of [
    ['@format unknown\n\nText', 2, '@format'], ['@format yaml\n@sound tape\n\nText', 3, '@sound'],
    ['@format yaml\n@speed 0\n\nText', 3, '@speed'], ['@format yaml\n@speed 121\n\nText', 3, '@speed'],
    ['@format yaml\n@format annotation\n\nText', 3, 'duplicate'], ['@sound modem\n\nText', 1, 'needs @format'],
    ['@format yaml\nText', 3, 'blank line'], ['@format yaml\n@pause 100ms\n\nText', 3, 'header']
  ]) {
    const scene = parseScene(mark + 'typeout\n' + body + '\n' + mark);
    assert.match(scene.diagnostics.join('\n'), new RegExp('Line ' + line + ':.*' + expected), body);
    assert.equal(scene.beats[0].blocks[0].type, 'prose');
    assert.match(scene.beats[0].blocks[0].html, /<pre>/);
  }
  const defaults = parseScene(fence('@format annotation', 'Note.')).beats[0].blocks[0];
  assert.equal(defaults.sound, 'none'); assert.equal(defaults.speed, DEFAULT_SPEED);
});
test('grapheme timing preserves emoji, combining marks, whitespace and exact duration', () => {
  assert.deepEqual(graphemes('A👩🏽‍💻e\u0301\n'), ['A', '👩🏽‍💻', 'e\u0301', '\n']);
  assert.equal(Array.from({ length: 31 }, (_, i) => graphemeDelay(i, 30)).reduce((a, b) => a + b, 0), Math.round(31 * 1000 / 30));
  const clock = new Clock();
  const scene = parseScene('Before.\n\n@pause 400ms\n@delay 300ms\n\n' + fence('@format yaml\n@speed 2', 'A👩🏽‍💻e\u0301') + '\n\nAfter.');
  const player = new StoryPlayer(scene, { scheduler: clock });
  assert.deepEqual(player.visibleBlocks.map(block => block.type), ['prose']);
  clock.advance(10000); assert.equal(output(player), undefined);
  player.play(); clock.advance(699); assert.equal(output(player), undefined);
  clock.advance(1); assert.equal(output(player).visibleText, '');
  clock.advance(500); assert.equal(output(player).visibleText, 'A');
  clock.advance(500); assert.equal(output(player).visibleText, 'A👩🏽‍💻');
  clock.advance(500); assert.equal(output(player).visibleText, 'A👩🏽‍💻e\u0301');
  clock.advance(500); assert.equal(output(player).visibleText, 'A👩🏽‍💻e\u0301\n');
  assert.equal(player.visibleBlocks.at(-1).html, '<p>After.</p>\n');
  assert.equal(player.phase, 'completed');
});
test('pause preserves remaining delay; reveal skips only output and retains later timing', () => {
  const clock = new Clock();
  const source = fence('@format annotation\n@sound keyboard\n@speed 2', 'AB') + '\n\n@pause 400ms\n\n@delay 300ms\n\nAfter.';
  const player = new StoryPlayer(parseScene(source), { scheduler: clock });
  player.play(); clock.advance(0); clock.advance(200); player.pause();
  clock.advance(5000); assert.equal(output(player).visibleText, ''); assert.equal(player.phase, 'paused');
  player.play(); clock.advance(299); assert.equal(output(player).visibleText, '');
  clock.advance(1); assert.equal(output(player).visibleText, 'A');
  assert.equal(player.revealImmediately(), true); assert.equal(output(player).visibleText, 'AB');
  assert.equal(player.visibleBlocks.some(block => block.html?.includes('After.')), false);
  clock.advance(699); assert.equal(player.visibleBlocks.some(block => block.html?.includes('After.')), false);
  clock.advance(1); assert.equal(player.visibleBlocks.at(-1).html, '<p>After.</p>\n');
  assert.equal(player.revealImmediately(), false);
});
test('replay, navigation, edits and disposal reject stale callbacks', () => {
  const clock = new Clock();
  const source = fence('@format yaml\n@speed 2', 'ABC') + '\n---\nNext.';
  const player = new StoryPlayer(parseScene(source), { scheduler: clock });
  player.play(); clock.advance(500); assert.equal(output(player).visibleText, 'A');
  player.replay(); for (const stale of clock.retired) stale(); assert.equal(output(player), undefined);
  clock.advance(500); assert.equal(output(player).visibleText, 'A');
  player.next(); for (const stale of clock.retired) stale(); assert.equal(output(player), undefined);
  player.previous(); assert.equal(player.phase, 'completed'); assert.equal(output(player).visibleText, 'ABC\n');
  player.replay(); clock.advance(500); assert.equal(output(player).visibleText, 'A');
  player.update(parseScene(source.replace('ABC', 'XYZ'))); for (const stale of clock.retired) stale();
  assert.equal(output(player), undefined); assert.equal(player.phase, 'ready');
  player.play(); clock.advance(500); assert.equal(output(player).visibleText, 'X');
  player.dispose(); for (const stale of clock.retired) stale(); assert.equal(clock.jobs.size, 0);
});
test('reduced motion reveals full passage at entry and suppresses ongoing reveal', () => {
  const clock = new Clock();
  const player = new StoryPlayer(parseScene(fence('@format yaml\n@speed 2', 'ABC')), { scheduler: clock, reducedMotion: true });
  player.play(); clock.advance(0);
  assert.equal(output(player).visibleText, 'ABC\n'); assert.equal(player.phase, 'completed');
  const another = new StoryPlayer(parseScene(fence('@format yaml\n@speed 2', 'ABC')), { scheduler: clock });
  another.play(); clock.advance(0); another.setReducedMotion(true);
  assert.equal(output(another).visibleText, 'ABC\n'); assert.equal(another.phase, 'completed');
});
test('Insert presets use one syntax family and refuse nested or selected content', () => {
  for (const [preset, sound] of [['yaml', 'modem'], ['annotation', 'keyboard']]) {
    const plan = planTypeoutInsertion('BeforeAfter', { start: 6, end: 6 }, preset);
    assert.equal(plan.error, undefined);
    assert.ok(plan.snippet.includes('@format ' + preset + '\n@sound ' + sound + '\n\n'));
    const rendered = 'Before' + plan.snippet.replace(/\$\{1:([^}]+)\}/, '$1').replace('$0', '') + 'After';
    assert.equal(parseScene(rendered).beats[0].blocks[1].type, 'typeout');
  }
  assert.match(planTypeoutInsertion(mark + 'chat\nA: Hi\n' + mark, { start: 8, end: 8 }, 'yaml').error, /outside/);
  assert.match(planTypeoutInsertion('Before', { start: 0, end: 2 }, 'yaml').error, /Selected text/);
});
test('sound uses one voice per reveal, stops on sync and disposal, and degrades without AudioContext', () => {
  let created = 0, stopped = 0, closed = 0, intervals = 0, cancelled = 0;
  class FakeContext {
    currentTime = 0; destination = {};
    resume() { return Promise.resolve(); }
    close() { closed++; return Promise.resolve(); }
    createOscillator() { created++; return { type: '', frequency: { value: 0, setValueAtTime() {} }, connect() {}, disconnect() {}, start() {}, stop() { stopped++; } }; }
    createGain() { return { gain: { value: 0, cancelScheduledValues() {}, setValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {}, disconnect() {} }; }
  }
  const sound = new TypeoutSound({ AudioContext: FakeContext, setInterval: () => ++intervals, clearInterval: () => { cancelled++; } });
  sound.unlock(); sound.sync('keyboard'); sound.sync('keyboard');
  assert.equal(created, 1); assert.equal(intervals, 1);
  sound.sync('typewriter'); assert.equal(created, 2); assert.equal(stopped, 1);
  sound.sync('modem'); assert.equal(created, 3); assert.equal(stopped, 2);
  sound.sync(null); assert.equal(stopped, 3); assert.equal(cancelled, 3);
  sound.dispose(); sound.dispose(); assert.equal(closed, 1);
  const silent = new TypeoutSound({ AudioContext: null });
  silent.unlock(); silent.sync('modem'); silent.stop(); assert.equal(silent.unavailable, true);
  assert.equal(silent.failure.phase, 'detection');
});
test('a rejected audio unlock can be retried on a later playback gesture', async () => {
  let attempts = 0;
  class RetryContext {
    resume() { return ++attempts === 1 ? Promise.reject(new Error('gesture unavailable')) : Promise.resolve(); }
    close() { return Promise.resolve(); }
  }
  const sound = new TypeoutSound({ AudioContext: RetryContext });
  sound.unlock();
  await Promise.resolve();
  assert.equal(sound.unavailable, true);
  assert.equal(sound.failure.phase, 'resume');
  sound.unlock();
  await Promise.resolve();
  assert.equal(sound.unavailable, false);
  assert.equal(attempts, 2);
  sound.dispose();
});
test('default browser timers retain their required global receiver', () => {
  const previousRepeat = globalThis.setInterval, previousCancel = globalThis.clearInterval;
  let repeats = 0, cancels = 0;
  globalThis.setInterval = function () { if (this !== globalThis) throw new TypeError('Illegal invocation'); repeats++; return 17; };
  globalThis.clearInterval = function () { if (this !== globalThis) throw new TypeError('Illegal invocation'); cancels++; };
  class Context {
    destination = {}; currentTime = 0;
    resume() { return Promise.resolve(); }
    close() { return Promise.resolve(); }
    createOscillator() { return { frequency: { value: 0 }, connect() {}, disconnect() {}, start() {}, stop() {} }; }
    createGain() { return { gain: { value: 0 }, connect() {}, disconnect() {} }; }
  }
  try {
    const sound = new TypeoutSound({ AudioContext: Context });
    sound.unlock(); sound.start('modem');
    assert.equal(sound.unavailable, false); assert.equal(repeats, 1);
    sound.stop(); assert.equal(cancels, 1);
    sound.dispose();
  } finally { globalThis.setInterval = previousRepeat; globalThis.clearInterval = previousCancel; }
});
