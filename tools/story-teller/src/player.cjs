'use strict';
// Pure scene/player state; no DOM, editor, timers or host API.
class StoryPlayer {
  constructor(scene = { beats: [], diagnostics: [] }) { this.scene = scene; this.index = 0; }
  get current() { return this.scene.beats[this.index] || null; }
  next() { this.index = Math.min(this.index + 1, Math.max(0, this.scene.beats.length - 1)); }
  previous() { this.index = Math.max(0, this.index - 1); }
  restart() { this.index = 0; }
  update(scene) {
    const old = this.current;
    const previous = this.scene;
    let target = -1;
    if (old) {
      const matches = scene.beats.map((beat, i) => beat.raw === old.raw ? i : -1).filter(i => i >= 0);
      if (matches.length) target = matches.reduce((a, b) => Math.abs(a - this.index) <= Math.abs(b - this.index) ? a : b);
      // An edited beat can still be located after an unchanged preceding anchor.
      if (target < 0) {
        for (let i = this.index - 1; i >= 0; i--) {
          const hits = scene.beats.map((beat, j) => beat.raw === previous.beats[i].raw ? j : -1).filter(j => j >= 0);
          if (hits.length === 1) { target = hits[0] + (this.index - i); break; }
        }
      }
    }
    this.scene = scene;
    this.index = Math.max(0, Math.min(target < 0 ? this.index : target, scene.beats.length - 1));
  }
}
module.exports = { StoryPlayer };
