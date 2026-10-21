'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { StoryPlayer } = require('../src/player.cjs');
const { parseScene } = require('../src/parser.cjs');
const scene = (...beats) => parseScene(beats.join('\n---\n'));
test('manual navigation bounds and restart, including an empty scene', () => {
  const player = new StoryPlayer(scene('A', 'B'));
  player.previous(); assert.equal(player.index, 0);
  player.next(); player.next(); assert.equal(player.current.raw, 'B');
  player.restart(); assert.equal(player.current.raw, 'A');
  player.update(scene()); player.next(); player.previous(); player.restart();
  assert.equal(player.current, null); assert.equal(player.index, 0);
});
test('unchanged current beat follows insertions and deletions before it', () => {
  const player = new StoryPlayer(scene('A', 'B', 'C'));
  player.next();
  player.update(scene('New', 'A', 'B', 'C'));
  assert.equal(player.index, 2); assert.equal(player.current.raw, 'B');
  player.update(scene('B', 'C')); assert.equal(player.index, 0);
});
test('edited current beat follows unchanged preceding anchor', () => {
  const player = new StoryPlayer(scene('A', 'B', 'C'));
  player.next();
  player.update(scene('New', 'A', 'B edited', 'C'));
  assert.equal(player.current.raw, 'B edited');
});
test('removed beats clamp; duplicate content chooses nearest position', () => {
  const player = new StoryPlayer(scene('A', 'B', 'C'));
  player.next(); player.next(); player.update(scene('A'));
  assert.equal(player.index, 0);
  player.update(scene('A', 'A', 'B')); player.next();
  player.update(scene('A', 'A', 'B edited'));
  assert.equal(player.index, 1);
});
