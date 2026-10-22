'use strict';
const DEFAULT_SPEED = 30; // Unicode grapheme clusters per second.
const MIN_SPEED = 1;
const MAX_SPEED = 120;
const FORMATS = Object.freeze(['yaml', 'annotation']);
const SOUNDS = Object.freeze(['modem', 'keyboard', 'typewriter', 'none']);
const BORDERS = Object.freeze(['none', 'grey']);
const FILLS = Object.freeze(['none', 'grey', 'yellow']);
const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
const graphemes = text => segmenter ? Array.from(segmenter.segment(text), entry => entry.segment) : Array.from(text);
const graphemeDelay = (index, speed) => Math.round((index + 1) * 1000 / speed) - Math.round(index * 1000 / speed);
module.exports = { DEFAULT_SPEED, MIN_SPEED, MAX_SPEED, FORMATS, SOUNDS, BORDERS, FILLS, graphemes, graphemeDelay };
