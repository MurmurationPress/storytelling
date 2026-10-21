'use strict';
// No DOM/editor dependencies. Scheduler is injected for deterministic active-time tests.
const defaultScheduler = {
  now: () => performance.now(),
  setTimeout: (callback, delay) => setTimeout(callback, delay),
  clearTimeout: handle => clearTimeout(handle)
};
const defaultDelay = text => Math.max(800, Math.min(4000, 400 + 35 * Array.from(text).length));
class StoryPlayer {
  constructor(scene = { beats: [], diagnostics: [] }, { scheduler = defaultScheduler, onChange = () => {} } = {}) {
    this.scene = scene; this.index = 0; this.scheduler = scheduler; this.onChange = onChange;
    this.generation = 0; this.timer = null; this.disposed = false;
    this.reset();
  }
  get current() { return this.scene.beats[this.index] || null; }
  cancelTimer() {
    this.generation++;
    if (this.timer !== null) this.scheduler.clearTimeout(this.timer);
    this.timer = null;
  }
  reset() {
    this.cancelTimer();
    this.phase = 'ready'; this.cursor = 0; this.remaining = null;
    this.visible = new Set(); this.counts = new Map(); this.read = new Set();
    this.steps = [];
    for (const [blockIndex, block] of (this.current?.blocks || []).entries()) {
      if (block.type === 'prose') this.steps.push({ type: 'prose', blockIndex, delayMs: 0 });
      else for (const event of block.events) {
        if (event.type === 'pause') this.steps.push(event);
        else {
          const message = block.messages[event.message];
          this.steps.push({ type: 'message', blockIndex, message: event.message, delayMs: message.delayMs ?? defaultDelay(message.text) });
          if (block.ticks && message.speaker === block.viewer) this.steps.push({ type: 'read', blockIndex, message: event.message, delayMs: 600 });
        }
      }
    }
    // Leading prose is immediately readable, but no timers start before Play.
    this.showProse();
  }
  showProse() {
    while (this.steps[this.cursor]?.type === 'prose') {
      this.visible.add(this.steps[this.cursor].blockIndex); this.cursor++;
    }
  }
  get responding() {
    const step = this.steps[this.cursor];
    if (this.phase !== 'playing' || step?.type !== 'message' || !(this.remaining > 0)) return null;
    const block = this.current.blocks[step.blockIndex];
    const message = block.messages[step.message];
    return message.responding && block.viewer && message.speaker !== block.viewer ? { blockIndex: step.blockIndex, speaker: message.speaker } : null;
  }
  get visibleBlocks() {
    return (this.current?.blocks || []).flatMap((block, index) => {
      if (block.type === 'prose') return this.visible.has(index) ? [block] : [];
      const messages = block.messages.slice(0, this.counts.get(index) || 0).map((message, i) => ({
        ...message,
        status: block.ticks && message.speaker === block.viewer ? (this.read.has(`${index}:${i}`) ? 'read' : 'delivered') : null
      }));
      const responding = this.responding?.blockIndex === index ? this.responding.speaker : null;
      return messages.length || responding ? [{ ...block, messages, responding }] : [];
    });
  }
  play() {
    if (this.disposed || !this.current || !['ready', 'paused'].includes(this.phase)) return;
    this.phase = 'playing'; this.schedule(); this.onChange();
  }
  schedule() {
    this.showProse();
    const step = this.steps[this.cursor];
    if (!step) { this.phase = 'completed'; return; }
    const delay = this.remaining ?? step.delayMs;
    this.remaining = delay; this.deadline = this.scheduler.now() + delay;
    const generation = this.generation;
    const cursor = this.cursor;
    this.timer = this.scheduler.setTimeout(() => {
      if (this.disposed || this.phase !== 'playing' || generation !== this.generation || cursor !== this.cursor) return;
      this.timer = null; this.remaining = null;
      if (step.type === 'message') this.counts.set(step.blockIndex, step.message + 1);
      if (step.type === 'read') this.read.add(`${step.blockIndex}:${step.message}`);
      this.cursor++;
      this.schedule(); this.onChange();
    }, delay);
  }
  pause() {
    if (this.phase !== 'playing') return;
    this.remaining = Math.max(0, this.deadline - this.scheduler.now());
    this.cancelTimer(); this.phase = 'paused'; this.onChange();
  }
  replay() { if (!this.disposed) { this.reset(); this.play(); } }
  next() { this.index = Math.min(this.index + 1, Math.max(0, this.scene.beats.length - 1)); this.reset(); }
  previous() { this.index = Math.max(0, this.index - 1); this.reset(); }
  restart() { this.index = 0; this.reset(); }
  update(scene) {
    const old = this.current;
    const previous = this.scene;
    let target = -1;
    if (old) {
      const matches = scene.beats.map((beat, i) => beat.raw === old.raw ? i : -1).filter(i => i >= 0);
      if (matches.length) target = matches.reduce((a, b) => Math.abs(a - this.index) <= Math.abs(b - this.index) ? a : b);
      if (target < 0) {
        for (let i = this.index - 1; i >= 0; i--) {
          const hits = scene.beats.map((beat, j) => beat.raw === previous.beats[i].raw ? j : -1).filter(j => j >= 0);
          if (hits.length === 1) { target = hits[0] + (this.index - i); break; }
        }
      }
    }
    this.scene = scene;
    this.index = Math.max(0, Math.min(target < 0 ? this.index : target, scene.beats.length - 1));
    this.reset();
  }
  dispose() { this.cancelTimer(); this.disposed = true; this.phase = 'disposed'; }
}
module.exports = { StoryPlayer, defaultDelay };
