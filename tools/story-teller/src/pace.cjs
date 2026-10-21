'use strict';
const PACE_MULTIPLIERS = Object.freeze({ normal: 1, brisk: 0.7, deliberate: 1.3 });
const paceChoices = [
  { value: 'normal', label: 'Normal', description: 'Existing calculated timing (default).' },
  { value: 'brisk', label: 'Brisk', description: '70% of calculated waits; explicit timing unchanged.' },
  { value: 'deliberate', label: 'Deliberate', description: '130% of calculated waits; explicit timing unchanged.' }
];
const defaultDelay = text => Math.max(800, Math.min(4000, 400 + 35 * Array.from(text).length));
const automaticDelay = (text, pace = 'normal') => Math.round(defaultDelay(text) * PACE_MULTIPLIERS[pace]);
module.exports = { PACE_MULTIPLIERS, paceChoices, defaultDelay, automaticDelay };
