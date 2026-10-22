'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseScene } = require('../src/parser.cjs');
const { StoryPlayer } = require('../src/player.cjs');
const fence = String.fromCharCode(96).repeat(3);
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
const chat = (speaker, text) => fence + 'chat\n' + speaker + ': ' + text + '\n' + fence;
const simple = parseScene('First.\n\n' + chat('Mara', 'Waiting.') + '\n---\nSecond.\n\n' + chat('Ivo', 'Ready.') + '\n---\nThird.\n\n' + chat('Mara', 'Go.'));
const messages = player => player.visibleBlocks.filter(block => block.type === 'chat').flatMap(block => block.messages);
test('Next autoplays from ready, playing, paused and completed; off leaves ready', () => {
  for (const phase of ['ready', 'playing', 'paused', 'completed']) {
    const clock = new Clock();
    const player = new StoryPlayer(simple, { scheduler: clock });
    if (phase !== 'ready') player.play();
    if (phase === 'paused') player.pause();
    if (phase === 'completed') clock.advance(10000);
    player.next({ autoplay: true });
    assert.equal(player.index, 1, phase);
    assert.equal(player.phase, 'playing', phase);
    assert.equal(messages(player).length, 0, phase);
    clock.advance(799); assert.equal(messages(player).length, 0, phase);
    clock.advance(1); assert.equal(messages(player)[0].text, 'Ready.', phase);
    player.next({ autoplay: false });
    assert.equal(player.index, 2); assert.equal(player.phase, 'ready');
    assert.equal(clock.jobs.size, 0);
    clock.advance(10000); assert.equal(messages(player).length, 0);
  }
});
test('Previous reveals every component and completed ticks without elapsed time or timers', () => {
  const source = 'Before.\n\n@delay 900ms\n\n' + chat('Mara', 'Not used') + '\n\n' +
    fence + 'chat\n# Link\n@viewer Mara\n@ticks\n@responding\nMara: Outgoing.\nIvo: Incoming.\n' + fence +
    '\n\n![Lantern](assets/lantern.png)\n\n*Caption: At the wall.*\n\n' +
    fence + 'typeout\n@format yaml\n@sound modem\n@speed 2\n\nstatus: 🛰️\n' + fence +
    '\n\n@pause 1500ms\n\nAfter.\n---\nNext.\n\n' + chat('Mara', 'Turned.');
  const clock = new Clock();
  const player = new StoryPlayer(parseScene(source), { scheduler: clock });
  player.next({ autoplay: true });
  const at = clock.time;
  player.previous();
  assert.equal(clock.time, at);
  assert.equal(clock.jobs.size, 0);
  assert.equal(player.phase, 'completed');
  assert.equal(player.responding, null);
  assert.equal(player.activeTypeout, null);
  assert.deepEqual(player.visibleBlocks.map(block => block.type), ['prose', 'chat', 'chat', 'image', 'typeout', 'prose']);
  assert.equal(player.visibleBlocks.find(block => block.type === 'typeout').visibleText, 'status: 🛰️\n');
  assert.equal(player.visibleBlocks.find(block => block.type === 'image').caption, 'At the wall.');
  assert.equal(player.visibleBlocks.filter(block => block.type === 'chat')[1].messages[0].status, 'read');
  for (const stale of clock.retired) stale();
  assert.equal(player.phase, 'completed');
  player.replay(); assert.equal(player.phase, 'playing');
  assert.equal(player.visibleBlocks.some(block => block.type === 'typeout'), false);
});
test('rapid turns reject stale callbacks and never carry progress into a different beat', () => {
  const clock = new Clock();
  const player = new StoryPlayer(simple, { scheduler: clock });
  player.play(); player.next({ autoplay: true }); player.next({ autoplay: true });
  player.previous();
  for (const stale of clock.retired) stale();
  assert.equal(player.index, 1); assert.equal(player.phase, 'completed');
  assert.equal(messages(player)[0].text, 'Ready.');
  player.next({ autoplay: false });
  for (const stale of clock.retired) stale();
  assert.equal(player.index, 2); assert.equal(player.phase, 'ready');
  assert.equal(messages(player).length, 0); assert.equal(clock.jobs.size, 0);
  player.restart(); assert.equal(player.index, 0); assert.equal(player.phase, 'ready');
});
