'use strict';

const inAside = event => Boolean(event.target?.closest?.('[data-story-aside]'));

// Reader presentation policy. The host supplies DOM/clock facilities; no VS Code messages.
function latestRect(content, document) {
  const last = content.lastElementChild;
  if (!last) return null;
  if (!last.classList.contains('typeout')) return last.getBoundingClientRect();
  const progress = last.querySelector('.typeout-progress');
  let text;
  if (last.classList.contains('typeout-annotation')) {
    const shown = [...progress.querySelectorAll('[data-story-segment] > span:first-child')].filter(node => node.firstChild?.length);
    text = shown.at(-1)?.firstChild;
  } else text = progress.firstChild;
  if (text?.length) {
    const range = document.createRange();
    range.setStart(text, text.length - 1); range.setEnd(text, text.length);
    const rect = range.getBoundingClientRect();
    if (rect.height) return rect;
  }
  const surface = last.querySelector('.typeout-surface').getBoundingClientRect();
  return { bottom: surface.top + 24 };
}

class ScrollFollower {
  constructor({ window, document, content, nav, button, reducedMotion }) {
    Object.assign(this, { window, document, content, nav, button, reducedMotion });
    this.root = document.scrollingElement;
    this.following = true; this.active = false; this.turning = false; this.disposed = false;
    this.timer = null; this.lastMove = -Infinity;
    this.lastTop = this.root.scrollTop; this.touchY = null; this.scrollbarDrag = false; this.suppressNext = false;
    this.suspendedTop = this.lastTop; this.movedSinceSuspend = false; this.hiddenTop = null;
    this.handlers = [
      [window, 'scroll', () => this.onScroll(), { passive: true }],
      [window, 'resize', () => this.changed(), { passive: true }],
      [document, 'wheel', event => { if (!inAside(event) && event.deltaY < -1) this.suspend(); }, { passive: true }],
      [document, 'touchstart', event => { this.touchY = inAside(event) ? null : event.touches[0]?.clientY ?? null; }, { passive: true }],
      [document, 'touchmove', event => {
        if (inAside(event)) return;
        const y = event.touches[0]?.clientY;
        if (y != null && this.touchY != null && y > this.touchY + 2) this.suspend();
        this.touchY = y ?? null;
      }, { passive: true }],
      [document, 'touchend', () => { this.touchY = null; }, { passive: true }],
      [document, 'pointerdown', event => { this.scrollbarDrag = !inAside(event) && event.clientX >= window.innerWidth - 20; }, { passive: true }],
      [document, 'pointerup', () => { this.scrollbarDrag = false; }, { passive: true }],
      [document, 'keydown', event => {
        if (inAside(event)) return;
        if (event.target?.matches?.('input, textarea, select, [contenteditable="true"]')) return;
        if (['ArrowUp', 'PageUp', 'Home'].includes(event.key) || (event.key === ' ' && event.shiftKey)) this.suspend();
      }],
      [button, 'click', () => this.resume()]
    ];
    for (const [target, type, listener, options] of this.handlers) target.addEventListener(type, listener, options);
    this.observer = new window.ResizeObserver(() => this.changed());
    this.observer.observe(content);
    this.updateButton();
  }
  viewportBottom() {
    let bottom = this.window.innerHeight - 16;
    // VS Code chrome is outside the webview's viewport. Any control fixed to
    // its lower edge is inside it and must be excluded from the reading area.
    for (const control of [this.nav, this.button]) {
      if (control.hidden) continue;
      const position = this.window.getComputedStyle(control).position;
      if (!['fixed', 'sticky'].includes(position)) continue;
      const rect = control.getBoundingClientRect();
      if (rect.top > this.window.innerHeight / 2 && rect.bottom >= this.window.innerHeight - 2)
        bottom = Math.min(bottom, rect.top - 12);
    }
    return bottom;
  }
  target() { return latestRect(this.content, this.document); }
  updateButton() {
    const rect = this.target();
    this.button.hidden = !this.active || this.following || !rect || rect.bottom <= this.viewportBottom() + 3;
  }
  cancel() {
    if (this.timer !== null) this.window.clearTimeout(this.timer);
    this.timer = null;
  }
  setActive(value) {
    const next = Boolean(value);
    if (this.active && !next) this.hiddenTop = this.root.scrollTop;
    this.active = next;
    this.cancel();
    if (this.active) {
      if (this.hiddenTop !== null) this.root.scrollTop = this.hiddenTop;
      this.lastTop = this.root.scrollTop;
      this.hiddenTop = null;
      this.suppressNext = true; // Returning to a preview never follows old content.
    }
    this.updateButton();
  }
  beginTurn({ silent = false } = {}) {
    this.cancel(); this.turning = true; this.following = !silent;
    this.hiddenTop = null;
    this.movedSinceSuspend = false; this.suspendedTop = 0;
    this.button.hidden = true;
  }
  endTurn() {
    this.root.scrollTop = 0;
    this.lastTop = this.root.scrollTop;
    this.turning = false; this.suppressNext = false;
    this.updateButton();
  }
  suspend() {
    if (!this.active || this.turning || !this.following) return;
    this.following = false; this.suspendedTop = this.root.scrollTop; this.movedSinceSuspend = false;
    this.cancel(); this.updateButton();
  }
  resume() {
    if (!this.active || this.turning) return;
    this.following = true; this.button.hidden = true;
    this.changed();
  }
  onScroll() {
    const top = this.root.scrollTop;
    const movedUp = top < this.lastTop - 2;
    const movedDown = top > this.lastTop + 2;
    this.lastTop = top;
    if (!this.active || this.turning) return;
    // Layout anchoring can also move scrollTop upward after a rerender. Only
    // explicit reader input suspends following; a scrollbar drag is tracked here.
    if (movedUp && this.scrollbarDrag) this.suspend();
    if (!this.following && Math.abs(top - this.suspendedTop) > 2) this.movedSinceSuspend = true;
    if (!this.following && this.movedSinceSuspend && movedDown && this.target()?.bottom <= this.viewportBottom() + 12) this.following = true;
    this.updateButton();
  }
  changed() {
    if (this.disposed || !this.active || this.turning) return;
    if (this.suppressNext) { this.suppressNext = false; this.updateButton(); return; }
    this.updateButton();
    if (!this.following || this.timer !== null) return;
    const now = this.window.performance.now();
    const wait = Math.max(40, this.lastMove + 50 - now);
    this.timer = this.window.setTimeout(() => {
      this.timer = null;
      if (!this.following || !this.active || this.turning) return;
      const rect = this.target();
      const delta = rect ? Math.ceil(rect.bottom - this.viewportBottom() + 12) : 0;
      if (delta <= 2) return;
      this.lastMove = this.window.performance.now();
      const before = this.root.scrollTop;
      // Browser-managed smooth scroll can stall in a nested VS Code webview.
      // Small timed steps stay cancellable and coalesce rapid text updates.
      this.root.scrollTop += this.reducedMotion() ? delta : Math.min(delta, 48);
      if (this.root.scrollTop !== before) this.changed();
    }, wait);
  }
  dispose() {
    this.cancel(); this.disposed = true; this.observer.disconnect();
    for (const [target, type, listener, options] of this.handlers) target.removeEventListener(type, listener, options);
  }
}
module.exports = { ScrollFollower, latestRect };
