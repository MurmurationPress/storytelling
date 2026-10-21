'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { StoryPlayer, defaultDelay } = require('../src/player.cjs');
const { parseScene } = require('../src/parser.cjs');
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
function setup(chat, suffix = '') {
  const clock = new Clock();
  const scene = parseScene(`Before\n\n\`\`\`chat\n${chat}\n\`\`\`\n\nAfter${suffix}`);
  const player = new StoryPlayer(scene, { scheduler: clock });
  return { player, clock, scene };
}
const messages = player => player.visibleBlocks.filter(b => b.type === 'chat').flatMap(b => b.messages);
test('default delay uses Unicode character length and bounded readable delays', () => {
  assert.equal(defaultDelay('Hi'), 800);
  assert.equal(defaultDelay('x'.repeat(40)), 1800);
  assert.equal(defaultDelay('x'.repeat(10000)), 4000);
  assert.equal(defaultDelay('🐦'.repeat(20)), 1100);
});
test('ready has no timers; ordered messages gate later prose; beat progression stays manual', () => {
  const { player, clock } = setup('A: Hi\nB: Yes', '\n---\nNext beat');
  assert.equal(player.phase, 'ready'); assert.equal(clock.jobs.size, 0);
  assert.equal(player.visibleBlocks.length, 1);
  clock.advance(20000); assert.equal(messages(player).length, 0);
  player.play(); player.play(); assert.equal(clock.jobs.size, 1);
  clock.advance(799); assert.equal(messages(player).length, 0);
  clock.advance(1); assert.equal(messages(player).length, 1);
  assert.equal(player.visibleBlocks.some(b => b.html?.includes('After')), false);
  clock.advance(800); assert.equal(messages(player).length, 2);
  assert.equal(player.visibleBlocks.at(-1).type, 'prose');
  assert.equal(player.phase, 'completed'); assert.equal(player.index, 0);
  clock.advance(20000); assert.equal(player.index, 0);
});
test('overrides replace default, pauses add silence without messages, including zero delay', () => {
  const { player, clock } = setup('@delay 0ms\nA: Hi\n@pause 1000ms\n@delay 200ms\nB: Yes');
  player.play(); clock.advance(0); assert.equal(messages(player).length, 1);
  clock.advance(1199); assert.equal(messages(player).length, 1);
  clock.advance(1); assert.equal(messages(player).length, 2);
  assert.equal(player.phase, 'completed');
});
test('pause/resume preserves remaining delay through long absence and repeated pause', () => {
  const { player, clock } = setup('@delay 1000ms\nA: Hi');
  player.play(); clock.advance(300); player.pause(); player.pause();
  assert.equal(player.remaining, 700); assert.equal(clock.jobs.size, 0);
  clock.advance(10000); assert.equal(messages(player).length, 0);
  player.play(); clock.advance(699); assert.equal(messages(player).length, 0);
  clock.advance(1); assert.equal(messages(player).length, 1);
});
test('explicit pause can be interrupted and resumed without consuming silence offscreen', () => {
  const { player, clock } = setup('@delay 0ms\nA: Hi\n@pause 1000ms\n@delay 0ms\nB: Yes');
  player.play(); clock.advance(250); player.pause();
  assert.equal(player.remaining, 750); clock.advance(5000);
  player.play(); clock.advance(749); assert.equal(messages(player).length, 1);
  clock.advance(1); assert.equal(messages(player).length, 2);
});
test('ticks off by default, viewer messages only, delivered then read after 600 active ms', () => {
  const { player, clock } = setup('@viewer A\n@ticks\n@delay 0ms\nA: Hi\n@delay 0ms\nB: Yes');
  player.play(); clock.advance(0); assert.equal(messages(player)[0].status, 'delivered');
  clock.advance(300); player.pause(); clock.advance(5000); player.play();
  clock.advance(299); assert.equal(messages(player)[0].status, 'delivered');
  clock.advance(1); assert.deepEqual(messages(player).map(m => m.status), ['read', null]);
  const plain = setup('@delay 0ms\nA: Hello'); plain.player.play(); plain.clock.advance(0);
  assert.equal(messages(plain.player)[0].status, null);
});
test('replay clears messages, prose after chat, ticks and all old callbacks', () => {
  const { player, clock } = setup('@viewer A\n@ticks\n@delay 0ms\nA: Hi');
  player.play(); clock.advance(0); player.replay();
  assert.equal(messages(player).length, 0); assert.equal(player.visibleBlocks.length, 1);
  for (const stale of clock.retired) stale();
  assert.equal(messages(player).length, 0);
  clock.advance(600); assert.equal(messages(player)[0].status, 'read');
  player.replay(); assert.equal(messages(player).length, 0);
});
test('navigation, edits, restart and disposal cancel pending timers and reject stale work', () => {
  for (const action of ['next', 'previous', 'restart', 'update', 'dispose']) {
    const { player, clock, scene } = setup('A: Hi', '\n---\nOther');
    player.play(); clock.advance(200);
    if (action === 'update') player.update(scene); else player[action]();
    assert.equal(clock.jobs.size, 0, action);
    for (const callback of clock.retired) callback();
    clock.advance(10000); assert.equal(messages(player).length, 0, action);
    assert.equal(player.phase, action === 'dispose' ? 'disposed' : 'ready');
  }
});
test('all mixed components preserve order, including multiple chats and intervening prose', () => {
  const clock = new Clock();
  const player = new StoryPlayer(parseScene('First\n\n```chat\n@delay 10ms\nA: One\n```\n\nMiddle\n\n```chat\n@delay 20ms\nB: Two\n```\n\nLast'), { scheduler: clock });
  player.play(); clock.advance(10);
  assert.deepEqual(player.visibleBlocks.map(b => b.type), ['prose', 'chat', 'prose']);
  clock.advance(19); assert.equal(messages(player).length, 1);
  clock.advance(1); assert.deepEqual(player.visibleBlocks.map(b => b.type), ['prose', 'chat', 'prose', 'chat', 'prose']);
});
test('invalid directives retain the entire chat as readable code and diagnose cause', () => {
  for (const line of ['@delay -1ms', '@delay 1.5ms', '@delay 60001ms', '@delay NaNms', '@pause 0ms', '@pause 1s', '@ticks yes', '@unknown 1ms', '@delay 2ms\n@delay 3ms']) {
    const scene = parseScene('```chat\n' + line + '\nA: Hello\n```');
    assert.equal(scene.beats[0].blocks[0].type, 'prose', line);
    assert.equal(scene.diagnostics.length, 1, line);
    assert.match(scene.diagnostics[0], /Line .*without executing the chat/);
  }
  for (const chat of ['@delay 2ms', '@ticks\nA: Hi', '@viewer B\n@ticks\nA: Hi', 'A: Hi\n@viewer A', '@viewer A\n@viewer B\nA: Hi']) {
    assert.equal(parseScene('```chat\n' + chat + '\n```').diagnostics.length, 1, chat);
  }
});
test('trailing pause gates following prose and completion; edits during read reset statuses', () => {
  const { player, clock, scene } = setup('@viewer A\n@ticks\n@delay 0ms\nA: Hi\n@pause 100ms');
  player.play(); clock.advance(600);
  assert.equal(messages(player)[0].status, 'read');
  assert.equal(player.visibleBlocks.some(b => b.html?.includes('After')), false);
  clock.advance(100); assert.equal(player.phase, 'completed');
  player.replay(); clock.advance(0); player.update(scene);
  assert.equal(player.phase, 'ready'); assert.equal(messages(player).length, 0);
  for (const stale of clock.retired) stale();
  assert.equal(player.visibleBlocks.length, 1);
});
test('responding is opt-in, speaker-derived, delay-only and adds no timing', () => {
  const { player, clock } = setup('@viewer Mara\n@pause 100ms\n@responding\n@delay 200ms\nIvo: Hello');
  assert.equal(player.responding, null);
  player.play(); assert.equal(player.responding, null);
  clock.advance(100); assert.equal(player.responding.speaker, 'Ivo');
  assert.equal(player.visibleBlocks.at(-1).responding, 'Ivo');
  clock.advance(199); assert.equal(messages(player).length, 0);
  clock.advance(1); assert.equal(messages(player).length, 1);
  assert.equal(player.responding, null); assert.equal(player.phase, 'completed');
  const plain = setup('Ivo: Hello'); plain.player.play(); assert.equal(plain.player.responding, null);
});
test('responding follows pause/resume, replay, source edits and navigation without stale cues', () => {
  const { player, clock, scene } = setup('@viewer Mara\n@responding\nIvo: Hello', '\n---\nOther');
  player.play(); clock.advance(200); player.pause();
  assert.equal(player.responding, null); clock.advance(2000);
  player.play(); assert.equal(player.responding.speaker, 'Ivo');
  player.replay(); assert.equal(player.responding.speaker, 'Ivo');
  player.update(scene); assert.equal(player.responding, null);
  for (const callback of clock.retired) callback();
  assert.equal(player.responding, null);
  player.play(); player.next(); assert.equal(player.responding, null);
});
test('responding excludes zero delay and authored status phase; malformed directives diagnose', () => {
  const { player, clock } = setup('@viewer Ivo\n@ticks\n@responding\n@delay 0ms\nIvo: Hello');
  player.play(); assert.equal(player.responding, null);
  clock.advance(0); assert.equal(player.responding, null);
  assert.equal(messages(player)[0].status, 'delivered');
  for (const chat of ['@responding', '@responding on\nIvo: Hi', '@responding\n@responding\nIvo: Hi']) {
    const parsed = parseScene('```chat\n' + chat + '\n```');
    assert.equal(parsed.diagnostics.length, 1);
    assert.equal(parsed.beats[0].blocks[0].type, 'prose');
  }
});
test('responding is incoming only: viewer and unspecified-viewer cues are suppressed without changing timing', () => {
  for (const header of ['@viewer Ivo\n', '']) {
    const { player, clock } = setup(header + '@responding\n@delay 100ms\nIvo: Hello');
    player.play(); assert.equal(player.responding, null);
    assert.equal(player.visibleBlocks.filter(b => b.type === 'chat').length, 0);
    clock.advance(99); assert.equal(messages(player).length, 0);
    clock.advance(1); assert.equal(messages(player).length, 1);
    assert.equal(player.phase, 'completed');
  }
  const incoming = setup('@viewer Mara\n@responding\n@delay 100ms\nIvo: Hello');
  incoming.player.play(); assert.equal(incoming.player.responding.speaker, 'Ivo');
  incoming.clock.advance(100); assert.equal(incoming.player.responding, null);
});
function cross(source) {
  const clock = new Clock();
  const parsed = parseScene(source);
  return { clock, parsed, player: new StoryPlayer(parsed, { scheduler: clock }) };
}
const proseText = player => player.visibleBlocks.filter(b => b.type === 'prose').map(b => b.html).join('');
test('outside delay reveals a contiguous multi-paragraph prose component atomically', () => {
  const { player, clock, parsed } = cross('@delay 250ms\n\nFirst sentence.\n\nSecond paragraph.');
  assert.equal(parsed.beats[0].blocks.length, 1);
  assert.equal(proseText(player), ''); clock.advance(5000); assert.equal(proseText(player), '');
  player.play(); clock.advance(249); assert.equal(proseText(player), '');
  clock.advance(1); assert.match(proseText(player), /First sentence/); assert.match(proseText(player), /Second paragraph/);
  assert.equal(player.phase, 'completed');
});
test('chat then delayed prose preserves exact timing and hides directives', () => {
  const { player, clock } = cross('```chat\n@delay 100ms\nA: Hello\n```\n\n@delay 200ms\n\nAfter.\n\nMore prose.');
  player.play(); clock.advance(100); assert.equal(messages(player).length, 1); assert.equal(proseText(player), '');
  clock.advance(199); assert.equal(proseText(player), '');
  clock.advance(1); assert.match(proseText(player), /After/); assert.match(proseText(player), /More prose/);
  assert.doesNotMatch(proseText(player), /@delay/); assert.equal(clock.time, 300);
});
test('outside chat override replaces default; consecutive silence is additive; responding starts only after silence', () => {
  const { player, clock } = cross('Before.\n\n@pause 100ms\n@pause 200ms\n@delay 400ms\n\n```chat\n@viewer Mara\n@responding\nIvo: Hello\n```');
  assert.match(proseText(player), /Before/); player.play(); assert.equal(player.responding, null);
  clock.advance(299); assert.equal(player.responding, null);
  clock.advance(1); assert.equal(player.responding.speaker, 'Ivo');
  clock.advance(399); assert.equal(messages(player).length, 0);
  clock.advance(1); assert.equal(messages(player).length, 1); assert.equal(player.phase, 'completed');
  assert.equal(clock.time, 700);
});
test('outside pause adds to existing first-message timing, without affecting later messages', () => {
  const { player, clock } = cross('@pause 100ms\n\n```chat\n@delay 200ms\nA: First\n@delay 300ms\nB: Second\n```');
  player.play(); clock.advance(299); assert.equal(messages(player).length, 0);
  clock.advance(1); assert.equal(messages(player).length, 1);
  clock.advance(299); assert.equal(messages(player).length, 1);
  clock.advance(1); assert.equal(messages(player).length, 2); assert.equal(clock.time, 600);
});
test('outside delay targets first message after leading in-chat pause, not a separate entry timer', () => {
  const { player, clock } = cross('@delay 200ms\n\n```chat\n@pause 100ms\nA: Hello\n```');
  player.play(); clock.advance(299); assert.equal(messages(player).length, 0);
  clock.advance(1); assert.equal(messages(player).length, 1); assert.equal(player.phase, 'completed');
});
test('combined pause/delay before prose and trailing pauses keep completion open', () => {
  const { player, clock } = cross('Before\n\n@delay 200ms\n@pause 100ms\n\nAfter\n\n@pause 300ms\n@pause 400ms');
  player.play(); clock.advance(299); assert.doesNotMatch(proseText(player), /After/);
  clock.advance(1); assert.match(proseText(player), /After/); assert.equal(player.phase, 'playing');
  clock.advance(699); assert.equal(player.phase, 'playing');
  clock.advance(1); assert.equal(player.phase, 'completed'); assert.equal(clock.time, 1000);
});
test('trailing delay diagnoses its actual source line and never crosses a beat', () => {
  const { parsed, player, clock } = cross('---\ntitle: Timing\n---\n\nBefore\n\n@delay 200ms\n---\nAfter');
  assert.match(parsed.diagnostics[0], /^Line 7: @delay needs a following/);
  player.play(); assert.equal(player.phase, 'completed'); assert.equal(clock.jobs.size, 0);
  player.next(); assert.match(proseText(player), /After/); assert.equal(player.phase, 'ready');
});
test('duplicate outside overrides, including chat boundary, diagnose and retain first authored override', () => {
  for (const content of ['@delay 100ms\n@delay 200ms\n\nAfter', '@delay 100ms\n\n```chat\n@delay 200ms\nA: Hello\n```']) {
    const { player, clock, parsed } = cross(content);
    assert.match(parsed.diagnostics[0], /Line .*multiple @delay overrides/);
    player.play(); clock.advance(99); assert.equal(player.phase, 'playing');
    clock.advance(1); assert.equal(player.phase, 'completed');
  }
});
test('malformed outside directives diagnose with locations, consume no time, and never render', () => {
  for (const directive of ['@delay -1ms', '@delay', '@pause 0ms', '@pause 1s', '@delay 60001ms', '@delay: 20ms']) {
    const { parsed, player } = cross(`Before\n\n${directive}\n\nAfter`);
    assert.match(parsed.diagnostics[0], /^Line 3: @/);
    assert.doesNotMatch(proseText(player), /@(delay|pause)/);
    assert.match(proseText(player), /After/);
  }
});
test('literal timing examples survive fences, inline code, quotations, lists, indented code and paragraph continuations', () => {
  const literals = [
    '```text\n@delay 300ms\n@pause 400ms\n```',
    '~~~markdown\n@delay 300ms\n~~~',
    '`@delay 300ms`', '> @delay 300ms',
    '- @delay 300ms', '- Item\n\n  @pause 400ms',
    '    @delay 300ms', '\t@pause 400ms',
    'An ordinary paragraph\n@delay 300ms\ncontinues here.',
    '\\@delay 300ms'
  ];
  for (const source of literals) {
    const { parsed, player } = cross(source);
    assert.equal(parsed.diagnostics.length, 0, source);
    assert.match(proseText(player), /@(delay|pause)/, source);
    assert.equal(parsed.beats[0].sequence.some(e => e.type === 'pause'), false, source);
  }
});
test('cross-component timing cancels on navigation, edits, replay and disposal; pauses preserve remaining time', () => {
  const source = 'Before\n\n@pause 100ms\n@delay 200ms\n\nAfter\n---\nNext';
  const { player, clock } = cross(source);
  player.play(); clock.advance(150); player.pause(); assert.equal(player.remaining, 150);
  clock.advance(5000); player.play(); clock.advance(149); assert.doesNotMatch(proseText(player), /After/);
  clock.advance(1); assert.match(proseText(player), /After/);
  for (const action of ['next', 'previous', 'restart', 'replay', 'update', 'dispose']) {
    const fixture = cross(source); fixture.player.play(); fixture.clock.advance(150);
    if (action === 'update') fixture.player.update(fixture.parsed); else fixture.player[action]();
    for (const callback of fixture.clock.retired) callback();
    assert.doesNotMatch(proseText(fixture.player), /After/, action);
    assert.equal(fixture.clock.jobs.size, action === 'replay' ? 1 : 0, action);
  }
});
test('malformed chat hides authoring directives but preserves dialogue without partial playback', () => {
  const { player, parsed } = cross('Before\n\n```chat\nA: Hello\n@delay nope\nB: Goodbye\n```');
  assert.match(parsed.diagnostics[0], /^Line 5:/);
  assert.match(proseText(player), /Hello/); assert.match(proseText(player), /Goodbye/);
  assert.doesNotMatch(proseText(player), /@delay/);
  assert.equal(messages(player).length, 0);
});
test('title enters with its chat before the first message, adds no time and respects component boundaries', () => {
  const { player, clock } = cross('Before\n\n@pause 100ms\n@delay 200ms\n\n```chat\n@title Canvas\nA: Hello\n```');
  const chats = () => player.visibleBlocks.filter(b => b.type === 'chat');
  assert.equal(chats().length, 0); player.play(); clock.advance(99);
  assert.equal(chats().length, 0); clock.advance(1);
  assert.equal(chats()[0].title, 'Canvas'); assert.equal(chats()[0].messages.length, 0);
  player.pause(); assert.equal(chats()[0].title, 'Canvas');
  player.play(); clock.advance(200);
  assert.equal(player.phase, 'completed'); assert.equal(messages(player).length, 1);
  player.update(player.scene); assert.equal(chats().length, 0);
});
test('converted multiline messages reveal atomically without changing timing or interpreting their contents', () => {
  const { convertChats } = require('../src/convert.cjs');
  const converted = convertChats('```chat\n# Link\n@delay 100ms\n{{Ari|One\n\n@pause 900ms\nBo: still Ari|}}\n@delay 200ms\n{{Bo|Reply|}}\n```');
  assert.equal(converted.count, 1);
  const { player, clock } = cross(converted.text);
  player.play(); clock.advance(99); assert.equal(messages(player).length, 0);
  clock.advance(1); assert.equal(messages(player)[0].text, 'One\n\n@pause 900ms\nBo: still Ari');
  clock.advance(199); assert.equal(messages(player).length, 1);
  clock.advance(1); assert.equal(player.phase, 'completed'); assert.equal(messages(player).length, 2);
});
test('header responding survives viewer-first messages and enables every incoming delay, including converted chats', () => {
  const { convertChats } = require('../src/convert.cjs');
  const source = '```chat\n# Link\n@viewer Ari\n@responding\n@ticks\n{{Ari|Hi|}}\n{{Bo|Hello|}}\n{{Ari|Yes|}}\n{{Bo|Again|}}\n```';
  const converted = convertChats(source); assert.equal(converted.count, 1);
  const { player, clock } = cross(converted.text);
  player.play(); assert.equal(player.responding, null);
  clock.advance(800); assert.equal(messages(player)[0].speaker, 'Ari'); assert.equal(player.responding, null);
  clock.advance(600); assert.equal(player.responding.speaker, 'Bo');
  player.pause(); assert.equal(player.responding, null); clock.advance(5000);
  player.play(); assert.equal(player.responding.speaker, 'Bo');
  clock.advance(800); assert.equal(messages(player).length, 2); assert.equal(player.responding, null);
  clock.advance(800 + 600); assert.equal(player.responding.speaker, 'Bo');
  clock.advance(800); assert.equal(player.phase, 'completed'); assert.equal(player.responding, null);
  player.replay(); assert.equal(player.responding, null);
  clock.advance(1400); assert.equal(player.responding.speaker, 'Bo');
  player.update(player.scene); assert.equal(player.responding, null); assert.equal(player.phase, 'ready');
});
test('per-message responding remains scoped; header responding never leaks into the next chat', () => {
  const { player, clock } = cross('```chat\n@viewer Ari\n@responding\nAri: Hi\nBo: Hello\n```\n\n```chat\n@viewer Ari\nBo: Again\n```');
  player.play(); clock.advance(800); assert.equal(player.responding.speaker, 'Bo');
  clock.advance(800); assert.equal(player.responding, null);
  const one = setup('@viewer Ari\nAri: Hi\n@responding\nBo: Hello\nBo: Again');
  one.player.play(); one.clock.advance(800); assert.equal(one.player.responding.speaker, 'Bo');
  one.clock.advance(800); assert.equal(one.player.responding, null);
});
