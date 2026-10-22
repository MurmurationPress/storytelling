'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ScrollFollower, latestRect } = require('../src/follow.cjs');

function fixture(reduced = false) {
  const listeners = new Map(); const timers = new Map();
  let serial = 0, now = 0, absoluteBottom = 200;
  const root = { scrollTop: 0 };
  const target = { getBoundingClientRect: () => ({ bottom: absoluteBottom - root.scrollTop }), classList: { contains: () => false } };
  const content = { lastElementChild: target };
  const button = { hidden: true };
  const events = object => {
    object.addEventListener = (type, fn) => { const list = listeners.get(type) || []; list.push(fn); listeners.set(type, list); };
    object.removeEventListener = (type, fn) => listeners.set(type, (listeners.get(type) || []).filter(value => value !== fn));
    return object;
  };
  events(button); events(content);
  const document = events({ scrollingElement: root });
  const calls = [];
  const window = events({ innerHeight: 300, innerWidth: 500, performance: { now: () => now },
    ResizeObserver: class { observe() {} disconnect() {} },
    getComputedStyle: () => ({ position: 'static' }),
    setTimeout: (fn, delay) => { timers.set(++serial, { fn, at: now + delay }); return serial; },
    clearTimeout: id => timers.delete(id),
    scrollTo: options => { calls.push(options); root.scrollTop = options.top; for (const fn of listeners.get('scroll') || []) fn({}); }
  });
  const nav = { getBoundingClientRect: () => ({ bottom: 70 }) };
  const follower = new ScrollFollower({ window, document, content, nav, button, reducedMotion: () => reduced });
  const advance = ms => {
    const end = now + ms;
    for (;;) {
      const next = [...timers].sort((a,b) => a[1].at - b[1].at)[0];
      if (!next || next[1].at > end) break;
      now = next[1].at; timers.delete(next[0]); next[1].fn();
    }
    now = end;
  };
  const run = () => advance(60);
  return { follower, button, root, calls, run, advance, setBottom: value => { absoluteBottom = value; },
    emit: (type, event = {}) => { for (const fn of listeners.get(type) || []) fn(event); }, timers };
}

test('follows only newly revealed overflow and moves the minimum distance', () => {
  const h = fixture(); h.follower.setActive(true); h.follower.beginTurn(); h.follower.endTurn();
  h.setBottom(260); h.follower.changed(); h.run(); assert.equal(h.root.scrollTop, 0);
  h.setBottom(360); h.follower.changed(); h.run();
  assert.equal(h.root.scrollTop, 48);
  h.advance(60); assert.equal(h.root.scrollTop, 88);
  h.follower.dispose();
});
test('rereading suspends following; Follow and manual bottom resume it', () => {
  const h = fixture(); h.follower.setActive(true); h.follower.beginTurn(); h.follower.endTurn();
  h.setBottom(600); h.emit('wheel', { deltaY: -80 });
  assert.equal(h.follower.following, false); assert.equal(h.button.hidden, false);
  h.follower.changed(); h.run(); assert.equal(h.root.scrollTop, 0);
  h.emit('click'); h.advance(500); assert.equal(h.follower.following, true); assert.equal(h.root.scrollTop, 328);
  h.emit('wheel', { deltaY: -20 }); assert.equal(h.follower.following, false);
  h.root.scrollTop = 200; h.emit('scroll'); assert.equal(h.follower.following, false);
  h.root.scrollTop = 330; h.emit('scroll'); assert.equal(h.follower.following, true);
  h.follower.dispose();
});
test('silent Previous starts at top, hiding preserves position, and navigation cancels frames', () => {
  const h = fixture(); h.follower.setActive(true); h.setBottom(900);
  h.follower.beginTurn({ silent: true }); h.follower.endTurn();
  assert.equal(h.root.scrollTop, 0); assert.equal(h.follower.following, false);
  assert.equal(h.button.hidden, false);
  h.follower.resume(); assert.equal(h.timers.size, 1);
  h.follower.beginTurn(); assert.equal(h.timers.size, 0);
  h.follower.endTurn(); h.follower.changed(); h.run();
  const position = h.root.scrollTop;
  h.follower.setActive(false); h.root.scrollTop = 0; // Host viewport may clamp while hidden.
  h.follower.setActive(true); h.follower.changed(); h.run();
  assert.equal(h.root.scrollTop, position, 'returning from a hidden preview must not jump');
  h.follower.dispose(); assert.equal(h.timers.size, 0);
});
test('touch, keyboard and scrollbar rereading suspend; reduced motion uses immediate scrolling', () => {
  const h = fixture(true); h.follower.setActive(true); h.follower.beginTurn(); h.follower.endTurn();
  h.setBottom(600); h.follower.changed(); h.run();
  assert.equal(h.root.scrollTop, 328, 'reduced motion moves in one step');
  h.emit('touchstart', { touches: [{ clientY: 100 }] });
  h.emit('touchmove', { touches: [{ clientY: 130 }] });
  assert.equal(h.follower.following, false);
  h.follower.beginTurn(); h.follower.endTurn();
  h.emit('keydown', { key: 'PageUp', target: { matches: () => false } });
  assert.equal(h.follower.following, false);
  h.follower.beginTurn(); h.follower.endTurn();
  h.root.scrollTop = 200; h.follower.lastTop = 200;
  h.emit('pointerdown', { clientX: 495 }); h.root.scrollTop = 100; h.emit('scroll');
  assert.equal(h.follower.following, false);
  h.follower.dispose();
});
test('type-out target is revealed text, not the full hidden reserve', () => {
  const text = { length: 4 };
  const range = { setStart(node, offset) { assert.equal(node, text); assert.equal(offset, 3); },
    setEnd(node, offset) { assert.equal(node, text); assert.equal(offset, 4); },
    getBoundingClientRect: () => ({ bottom: 140, height: 18 }) };
  const progress = { firstChild: text };
  const content = { lastElementChild: { classList: { contains: value => value === 'typeout' },
    querySelector: value => value === '.typeout-progress' ? progress : { getBoundingClientRect: () => ({ top: 100, bottom: 900 }) } } };
  assert.equal(latestRect(content, { createRange: () => range }).bottom, 140);
});
