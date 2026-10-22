'use strict';
// One quiet synthesiser voice per active type-out, never one node per grapheme.
class TypeoutSound {
  constructor({ AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext,
    setInterval: repeat = (callback, delay) => globalThis.setInterval(callback, delay),
    clearInterval: cancel = handle => globalThis.clearInterval(handle) } = {}) {
    this.AudioContext = AudioContext; this.repeat = repeat; this.cancel = cancel;
    this.context = null; this.voice = null; this.interval = null; this.mode = null;
    this.unavailable = !AudioContext; this.disposed = false; this.unlockGeneration = 0;
    this.failure = !AudioContext ? { phase: 'detection', name: 'Missing API', message: 'AudioContext is unavailable' } : null;
  }
  fail(phase, error) {
    this.failure = { phase, name: error?.name || 'Error', message: error?.message || String(error), contextState: this.context?.state || 'unknown' };
    this.unavailable = true; this.stop();
  }
  unlock() {
    if (this.disposed || !this.AudioContext) return;
    // A rejected resume can mean this particular gesture was not accepted by
    // the host. Let a later Play/Resume gesture retry without reloading.
    this.unavailable = false;
    this.failure = null;
    const generation = ++this.unlockGeneration;
    try {
      if (this.context?.state === 'closed') this.context = null;
      this.context ||= new this.AudioContext();
      Promise.resolve(this.context.resume()).catch(error => {
        if (generation !== this.unlockGeneration || this.disposed) return;
        this.fail('resume', error);
      });
    } catch (error) { this.fail('initialisation', error); }
  }
  start(mode) {
    if (this.disposed || this.unavailable || !this.context || mode === 'none') return;
    if (this.mode === mode) return;
    this.stop();
    try {
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = mode === 'modem' ? 'sawtooth' : mode === 'keyboard' ? 'triangle' : 'square';
      oscillator.frequency.value = mode === 'modem' ? 680 : mode === 'keyboard' ? 620 : 350;
      gain.gain.value = mode === 'modem' ? 0.006 : 0;
      oscillator.connect(gain); gain.connect(this.context.destination); oscillator.start();
      this.voice = { oscillator, gain }; this.mode = mode;
      let tick = 0;
      this.interval = this.repeat(() => {
        if (!this.voice || this.mode !== mode) return;
        const now = this.context.currentTime;
        if (mode === 'modem') {
          oscillator.frequency.setValueAtTime([620, 920, 710, 1150, 540, 870][tick++ % 6], now);
        } else {
          const envelope = gain.gain;
          envelope.cancelScheduledValues(now);
          envelope.setValueAtTime(mode === 'keyboard' ? 0.009 : 0.011, now);
          envelope.linearRampToValueAtTime(0, now + (mode === 'keyboard' ? 0.018 : 0.035));
        }
      }, mode === 'modem' ? 105 : mode === 'keyboard' ? 135 : 210);
    } catch (error) { this.fail('voice', error); }
  }
  sync(mode) { if (!mode || mode === 'none') this.stop(); else this.start(mode); }
  stop() {
    if (this.interval !== null) this.cancel(this.interval);
    this.interval = null;
    if (this.voice) {
      try { this.voice.oscillator.stop(); } catch { /* already stopped */ }
      this.voice.oscillator.disconnect(); this.voice.gain.disconnect();
    }
    this.voice = null; this.mode = null;
  }
  dispose() {
    if (this.disposed) return;
    this.stop(); this.disposed = true;
    if (this.context) Promise.resolve(this.context.close()).catch(() => {});
    this.context = null;
  }
}
module.exports = { TypeoutSound };
