'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseScene } = require('../src/parser.cjs');
const { StoryPlayer } = require('../src/player.cjs');
class Clock {
  time = 0; id = 0; jobs = new Map();
  now = () => this.time;
  setTimeout = (callback, delay) => { const id = ++this.id; this.jobs.set(id, { at: this.time + delay, callback }); return id; };
  clearTimeout = id => this.jobs.delete(id);
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
const source = 'First.\n\n@pause 300ms\n---\n```chat\nMara: Hi.\n```\n---\nLast.';
test('end action waits through trailing silence and follows navigation, replay and edits', () => {
  const clock = new Clock(); const player = new StoryPlayer(parseScene(source), { scheduler: clock });
  assert.equal(player.endAction, null);
  player.play(); clock.advance(299); assert.equal(player.endAction, null);
  clock.advance(1); assert.equal(player.phase, 'completed'); assert.equal(player.endAction, 'next');
  player.next({ autoplay: false }); assert.equal(player.phase, 'ready'); assert.equal(player.endAction, null);
  player.play(); assert.equal(player.endAction, null);
  clock.advance(10000); assert.equal(player.endAction, 'next');
  player.replay(); assert.equal(player.endAction, null);
  player.next({ autoplay: true }); assert.equal(player.endAction, 'end');
  player.previous(); assert.equal(player.phase, 'completed'); assert.equal(player.endAction, 'next');
  assert.equal(clock.jobs.size, 0);
  player.restart(); assert.equal(player.endAction, null);
  player.update(parseScene(source.replace('First.', 'Changed.'))); assert.equal(player.endAction, null);
  player.dispose(); assert.equal(player.endAction, null);
});
