'use strict';
const { inspectStructure, beatRanges } = require('./structure.cjs');
const { createMarkdown, inlineText } = require('./markdown.cjs');
const md = createMarkdown();
const sameText = (left, right) => left.replace(/\s+/gu, ' ').trim() === right.replace(/\s+/gu, ' ').trim();
function opening(source) {
  const structure = inspectStructure(source);
  const first = beatRanges(structure)[0];
  let line = first?.bodyLine ?? structure.start;
  // Keep leading empty boundaries and the first beat's metadata in their
  // structural positions. Inserting before them would create a title-only beat.
  while (line < structure.lines.length && !structure.lines[line].text.trim()) line++;
  if (line === first?.titleLine || (!first && /^<!-- beat: ([^\r\n]*\S) -->$/.test(structure.lines[line]?.text || ''))) line++;
  while (line < structure.lines.length && !structure.lines[line].text.trim()) line++;
  const offset = structure.lines[line]?.start ?? source.length;
  // Parse the same opening content the player sees, after beat metadata. In
  // particular, metadata must not become part of a Setext heading's text.
  const tokens = md.parse(source.slice(offset, first?.endOffset ?? source.length), {});
  const heading = tokens[0]?.type === 'heading_open' && tokens[0].tag === 'h1' ? tokens[1] : null;
  const text = heading ? inlineText(md, heading.children) : null;
  return { offset, text };
}
function hasSceneHeading(source, title) {
  const { text } = opening(source);
  return text !== null && sameText(text, title);
}
function addSceneHeading(source, title) {
  const { offset, text } = opening(source);
  if (text !== null && sameText(text, title)) return source;
  const eol = source.match(/\r\n|\n|\r/)?.[0] || '\n';
  // Escape inline Markdown and entity syntax, keeping ordinary punctuation
  // readable. Titles must not become emphasis, HTML, links or image URLs.
  const literal = title.replace(/[\\`*_\[\]<>#~&]/g, '\\$&')
    .replace(/\r/g, '&#13;').replace(/\n/g, '&#10;');
  const prefix = source.slice(0, offset);
  const separator = prefix && !/[\r\n]$/.test(prefix) ? eol : '';
  return `${prefix}${separator}# ${literal}${eol}${eol}${source.slice(offset)}`;
}
module.exports = { addSceneHeading, hasSceneHeading };
