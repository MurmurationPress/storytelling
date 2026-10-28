'use strict';
// Reader policy applies after bounded authoring baselines; never to explicit waits.
const SPEEDS = Object.freeze([0.5, 0.75, 1, 1.25, 1.5]);
const readerSpeed = value => SPEEDS.includes(value) ? value : 1;
const calculatedDuration = (milliseconds, speed) => milliseconds / readerSpeed(speed);
function storedReaderSpeed(state) {
  try { return readerSpeed(state.get('storyTeller.playbackSpeed', 1)); }
  catch { return 1; }
}
module.exports = { SPEEDS, readerSpeed, calculatedDuration, storedReaderSpeed };
