'use strict';
// No DOM/editor dependencies. Scheduler is injected for deterministic active-time tests.
const defaultScheduler = {
  now: () => performance.now(),
  setTimeout: (callback, delay) => setTimeout(callback, delay),
  clearTimeout: handle => clearTimeout(handle)
};
const { readerSpeed, calculatedDuration } = require('./reader-speed.cjs');
const { defaultDelay, automaticDelay } = require('./pace.cjs');
const { MEDIA_INTERVAL } = require('./formatted-media.cjs');
const { readingTime } = require('./janus.cjs');
const { graphemes, graphemeDelay } = require('./typeout.cjs');
class StoryPlayer {
  constructor(scene = { beats: [], diagnostics: [] }, { scheduler = defaultScheduler, onChange = () => {}, reducedMotion = false, playbackSpeed = 1, prepareTypeout = null } = {}) {
    this.scene = scene; this.index = 0; this.scheduler = scheduler; this.onChange = onChange;
    this.prepareTypeout = prepareTypeout;
    this.reducedMotion = reducedMotion; this.playbackSpeed = readerSpeed(playbackSpeed);
    this.generation = 0; this.timer = null; this.disposed = false;
    this.reset();
  }
  get current() { return this.scene.beats[this.index] || null; }
  get endAction() {
    if (!this.current || this.phase !== 'completed') return null;
    return this.index < this.scene.beats.length - 1 ? 'next' : 'end';
  }
  cancelTimer() {
    this.generation++;
    if (this.timer !== null) this.scheduler.clearTimeout(this.timer);
    this.timer = null;
  }
  reset() {
    this.cancelTimer();
    this.run = (this.run || 0) + 1; this.preparedTypeouts = new Set(); this.waitingTypeout = null; this.revealingBeat = false; this.immediateTypeouts = new Set();
    this.phase = 'ready'; this.cursor = 0; this.remaining = null;
    this.visible = new Set(); this.enteredChats = new Set(); this.enteredTypeouts = new Set();
    this.typeoutCounts = new Map(); this.typeoutParts = new Map(); this.counts = new Map(); this.read = new Set();
    this.steps = [];
    const sequence = this.current?.sequence || (this.current?.blocks || []).map((block, blockIndex) => ({ type: 'component', blockIndex }));
    let precedingComponent = null;
    for (const entry of sequence) {
      if (entry.type === 'pause') { this.steps.push(entry); continue; }
      const blockIndex = entry.blockIndex;
      const block = this.current.blocks[blockIndex];
      // A reading interval belongs to the preceding paragraph and exists only
      // when another component follows. Explicit boundary delay replaces it.
      if (precedingComponent?.pacedParagraph)
        this.steps.push({ type: 'pause', calculated: block.boundaryDelayMs == null, delayMs: block.boundaryDelayMs ?? precedingComponent.proseIntervalMs });
      precedingComponent = block;
      if (block.type === 'prose' || block.type === 'image') this.steps.push({ type: block.type, blockIndex, delayMs: block.delayMs ?? 0 });
      else if (block.type === 'typeout') {
        const parts = block.document ? block.document.units.map(unit => unit.text) : block.format === 'annotation'
          ? block.annotation.hasMedia ? block.annotation.parts.map(part=>part.text) : block.annotation.segments.flatMap(graphemes) : graphemes(block.text);
        this.typeoutParts.set(blockIndex, parts);
        this.steps.push({ type: 'typeout-start', blockIndex, delayMs: block.delayMs ?? 0 });
        const documentInterval = unit => Math.max(unit.media ? MEDIA_INTERVAL : 0, readingTime(unit) * 30 / block.speed) + (unit.afterTable ? 450 * 30 / block.speed : 0);
        for (let index = 0; index < parts.length; index++) {
          const delayMs = block.document
            ? index === 0 ? 300 * 30 / block.speed : documentInterval(block.document.units[index - 1])
            : block.annotation?.hasMedia && block.annotation.parts[index - 1]?.media ? MEDIA_INTERVAL : graphemeDelay(index, block.speed);
          this.steps.push({ type: 'typeout-reveal', blockIndex, calculated: true, delayMs });
        }
        if (block.annotation?.parts?.at(-1)?.media) this.steps.push({type:'pause',documentHold:true,calculated:true,delayMs:MEDIA_INTERVAL});
        if (block.document && parts.length) this.steps.push({
          type: 'pause', documentHold: true, calculated: true, delayMs: documentInterval(block.document.units.at(-1))
        });
      }
      else for (const event of block.events) {
        if (event.type === 'pause') this.steps.push({ ...event, blockIndex });
        else {
          const message = block.messages[event.message];
          this.steps.push({ type: 'message', blockIndex, message: event.message, calculated: message.delayMs == null, delayMs: message.delayMs ?? automaticDelay(message.timingText ?? message.text, block.pace) });
          if (block.ticks && message.speaker === block.viewer) this.steps.push({ type: 'read', blockIndex, message: event.message, delayMs: 600 });
        }
      }
    }
    // Leading untimed prose and images appear without starting playback.
    this.showProse();
  }
  showProse() {
    while (['prose', 'image'].includes(this.steps[this.cursor]?.type) && this.steps[this.cursor].delayMs === 0) {
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
  get activeTypeout() {
    const step = this.steps[this.cursor];
    if (this.waitingTypeout !== null && ['playing','paused'].includes(this.phase)) return {blockIndex:this.waitingTypeout,block:this.current.blocks[this.waitingTypeout]};
    return step?.type === 'typeout-reveal' && ['playing', 'paused'].includes(this.phase)
      ? { blockIndex: step.blockIndex, block: this.current.blocks[step.blockIndex] } : null;
  }
  get visibleBlocks() {
    return (this.current?.blocks || []).flatMap((block, index) => {
      if (block.type === 'prose' || block.type === 'image') return this.visible.has(index) ? [block] : [];
      if (block.type === 'typeout') return this.enteredTypeouts.has(index)
        ? [{ ...block, revealCount: this.typeoutCounts.get(index) || 0,
          visibleText: this.typeoutParts.get(index).slice(0, this.typeoutCounts.get(index) || 0).join(''),
          complete: (this.typeoutCounts.get(index) || 0) >= this.typeoutParts.get(index).length }] : [];
      const messages = block.messages.slice(0, this.counts.get(index) || 0).map((message, i) => ({
        ...message,
        status: block.ticks && message.speaker === block.viewer ? (this.read.has(`${index}:${i}`) ? 'read' : 'delivered') : null
      }));
      const responding = this.responding?.blockIndex === index ? this.responding.speaker : null;
      return messages.length || responding || (block.title && this.enteredChats.has(index)) ? [{ ...block, messages, responding }] : [];
    });
  }
  play() {
    if (this.disposed || this.revealingBeat || !this.current || !['ready', 'paused'].includes(this.phase)) return;
    this.phase = 'playing'; this.schedule(); this.onChange();
  }
  setPlaybackSpeed(value) {
    const speed = readerSpeed(value);
    if (speed === this.playbackSpeed || this.disposed) return;
    const calculated = this.steps[this.cursor]?.calculated;
    // Convert remaining active time through baseline units, without rounding.
    if (calculated && ['playing', 'paused'].includes(this.phase)) {
      const remaining = this.phase === 'playing'
        ? Math.max(0, this.deadline - this.scheduler.now()) : this.remaining;
      if (remaining != null) this.remaining = remaining * this.playbackSpeed / speed;
      if (this.phase === 'playing') this.cancelTimer();
    }
    this.playbackSpeed = speed;
    if (calculated && this.phase === 'playing') this.schedule();
    this.onChange();
  }
  schedule(anchor = this.scheduler.now()) {
    this.showProse();
    const step = this.steps[this.cursor];
    if (!step) { this.phase = 'completed'; return; }
    const block = this.current.blocks[step.blockIndex];
    if (step.type === 'typeout-start' && block.hasMedia && this.prepareTypeout && !this.preparedTypeouts.has(step.blockIndex)) {
      this.remaining = 0; this.deadline = this.scheduler.now(); this.waitingTypeout = step.blockIndex;
      const generation = this.generation, cursor = this.cursor;
      Promise.resolve().then(()=>{if(this.generation===generation)return this.prepareTypeout(block);}).catch(()=>{}).then(()=>{
        if (this.disposed || this.generation !== generation || this.cursor !== cursor || this.phase !== 'playing') return;
        this.preparedTypeouts.add(step.blockIndex); this.waitingTypeout = null; this.remaining = null;
        this.schedule(); this.onChange();
      });
      return;
    }
    if (step.blockIndex !== undefined && this.current.blocks[step.blockIndex].type === 'chat') this.enteredChats.add(step.blockIndex);
    const delay = this.remaining ?? (step.calculated ? calculatedDuration(step.delayMs, this.playbackSpeed) : step.delayMs);
    // Carry calculated deadlines to avoid reveal drift; authored waits start in full.
    this.remaining = delay; this.deadline = (step.calculated ? anchor : this.scheduler.now()) + delay;
    const generation = this.generation;
    const cursor = this.cursor;
    this.timer = this.scheduler.setTimeout(() => {
      if (this.disposed || this.phase !== 'playing' || generation !== this.generation || cursor !== this.cursor) return;
      this.timer = null; this.remaining = null;
      if (step.type === 'prose' || step.type === 'image') this.visible.add(step.blockIndex);
      if (step.type === 'typeout-start') {
        this.enteredTypeouts.add(step.blockIndex);
        if (this.reducedMotion || this.immediateTypeouts.has(step.blockIndex)) {
          this.typeoutCounts.set(step.blockIndex, this.typeoutParts.get(step.blockIndex).length);
          while (this.steps[this.cursor + 1]?.type === 'typeout-reveal' && this.steps[this.cursor + 1].blockIndex === step.blockIndex) this.cursor++;
          if (this.steps[this.cursor + 1]?.documentHold) this.cursor++;
        }
      }
      if (step.type === 'typeout-reveal') this.typeoutCounts.set(step.blockIndex, (this.typeoutCounts.get(step.blockIndex) || 0) + 1);
      if (step.type === 'message') this.counts.set(step.blockIndex, step.message + 1);
      if (step.type === 'read') this.read.add(`${step.blockIndex}:${step.message}`);
      this.cursor++;
      this.schedule(this.deadline); this.onChange();
    }, Math.max(0, this.deadline - this.scheduler.now()));
  }
  pause() {
    if (this.phase !== 'playing') return;
    this.remaining = Math.max(0, this.deadline - this.scheduler.now());
    this.cancelTimer(); this.phase = 'paused'; this.onChange();
  }
  revealImmediately() {
    const active = this.activeTypeout;
    if (!active) return false;
    if (this.waitingTypeout !== null) { this.immediateTypeouts.add(active.blockIndex); this.onChange(); return true; }
    this.cancelTimer(); this.remaining = null;
    this.typeoutCounts.set(active.blockIndex, this.typeoutParts.get(active.blockIndex).length);
    while (this.steps[this.cursor]?.type === 'typeout-reveal' && this.steps[this.cursor].blockIndex === active.blockIndex) this.cursor++;
    if (this.steps[this.cursor]?.documentHold) this.cursor++;
    if (this.phase === 'playing') this.schedule();
    this.onChange();
    return true;
  }
  setReducedMotion(value) {
    this.reducedMotion = Boolean(value);
    if (this.reducedMotion) this.revealImmediately();
    this.onChange();
  }
  replay() { if (!this.disposed) { this.reset(); this.play(); } }
  // Reader navigation policy is independent of the host's preference store.
  next({ autoplay = false } = {}) {
    if (this.disposed || this.index >= this.scene.beats.length - 1) return;
    this.index++; this.reset();
    if (autoplay) this.play();
  }
  revealBeat() {
    this.cancelTimer();
    const pending = (this.current?.blocks || []).filter((block,index)=>block.hasMedia && this.prepareTypeout && !this.preparedTypeouts.has(index));
    if (pending.length) {
      const generation = this.generation;
      this.revealingBeat = true; this.phase = 'ready';
      Promise.all(pending.map(block=>Promise.resolve().then(()=>{if(this.generation===generation)return this.prepareTypeout(block);}).catch(()=>{}))).then(()=>{
        if (this.disposed || generation !== this.generation) return;
        for (const [index,block] of this.current.blocks.entries()) if (block.hasMedia) this.preparedTypeouts.add(index);
        this.revealingBeat = false; this.revealBeat();
      });
      this.onChange(); return;
    }
    this.waitingTypeout = null; this.revealingBeat = false;
    this.remaining = null; this.cursor = this.steps.length;
    for (const [index, block] of (this.current?.blocks || []).entries()) {
      if (block.type === 'prose' || block.type === 'image') this.visible.add(index);
      else if (block.type === 'typeout') {
        this.enteredTypeouts.add(index);
        this.typeoutCounts.set(index, this.typeoutParts.get(index).length);
      } else if (block.type === 'chat') {
        this.enteredChats.add(index);
        this.counts.set(index, block.messages.length);
        if (block.ticks) for (const [messageIndex, message] of block.messages.entries())
          if (message.speaker === block.viewer) this.read.add(`${index}:${messageIndex}`);
      }
    }
    this.phase = 'completed';
    this.onChange();
  }
  previous() {
    if (this.disposed || this.index === 0) return;
    this.index--; this.reset(); this.revealBeat();
  }
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
      if (target < 0) {
        for (let i = this.index + 1; i < previous.beats.length; i++) {
          const hits = scene.beats.map((beat, j) => beat.raw === previous.beats[i].raw ? j : -1).filter(j => j >= 0);
          if (hits.length === 1) { target = hits[0] - (i - this.index); break; }
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
