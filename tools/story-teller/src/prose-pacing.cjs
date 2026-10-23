'use strict';
// Reader-independent policy. These intervals are active playback time, not source edits.
const WORD_MS = 60;
const MIN_MS = 1000;
const MAX_MS = 4000;
const FIELD = 'story_teller_prose_pacing';
function visibleWords(inline) {
  let text = '';
  function walk(tokens) {
    for (const token of tokens || []) {
      if (token.type === 'image') continue; // A standalone image has its own component.
      if (token.type === 'text' || token.type === 'code_inline') text += `${token.content} `;
      else if (token.type === 'softbreak' || token.type === 'hardbreak') text += ' ';
      else if (token.children) walk(token.children);
    }
  }
  walk(inline?.children);
  return [...new Intl.Segmenter(undefined, { granularity: 'word' }).segment(text)].filter(part => part.isWordLike).length;
}
function proseInterval(words) { return Math.max(MIN_MS, Math.min(MAX_MS, words * WORD_MS)); }
function effectivePacing(book, scene) {
  if (scene === 'on' || scene === 'off') return { enabled: scene === 'on', value: scene, source: 'scene' };
  if (book === 'on' || book === 'off') return { enabled: book === 'on', value: book, source: 'book' };
  return { enabled: false, value: 'off', source: 'unchanged default' };
}
module.exports = { FIELD, WORD_MS, MIN_MS, MAX_MS, visibleWords, proseInterval, effectivePacing };
