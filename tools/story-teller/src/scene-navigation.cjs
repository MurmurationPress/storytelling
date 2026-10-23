'use strict';
// A selection cancels the outgoing reader before any filesystem work. Commits
// serialize editor operations, so a slow older selection cannot win focus back.
class SceneSelection {
  constructor(cancel = () => {}) { this.cancel = cancel; this.generation = 0; this.queue = Promise.resolve(); }
  begin() { const token = ++this.generation; this.cancel(); return token; }
  isCurrent(token) { return token === this.generation; }
  commit(token, action) {
    const work = this.queue.catch(() => {}).then(() => this.isCurrent(token) ? action(() => this.isCurrent(token)) : undefined);
    this.queue = work; return work;
  }
}
class SceneAutoplay {
  constructor() { this.pending = null; this.departure = 0; }
  arm(revision, enabled, departure = this.departure) { this.pending = enabled && departure === this.departure ? revision : null; }
  leave() { this.departure++; this.cancel(); }
  cancel() { this.pending = null; }
  take(revision, available) {
    if (!available || this.pending !== revision) return false;
    this.cancel(); return true;
  }
}
// Keep the existing stored key: widening the toggle's scope is not a reset.
const autoplayPreference = state => state.get('storyTeller.autoplayOnTurn', true) !== false;
const currentReaderMessage = (instance, message) => !['source', 'source-pending', 'presentation'].includes(message?.type) || message.instance === instance;
module.exports = { currentReaderMessage, SceneSelection, SceneAutoplay, autoplayPreference };
