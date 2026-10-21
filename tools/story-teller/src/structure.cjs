'use strict';
const MarkdownIt = require('markdown-it');
const md = new MarkdownIt({ html: false });
// Shared source positions are UTF-16 offsets, matching VS Code. Nothing is rewritten.
function inspectStructure(source) {
  const lines = [];
  const pattern = /([^\r\n]*)(\r\n|\n|\r|$)/g;
  let match;
  while ((match = pattern.exec(source)) && match[0]) lines.push({ text: match[1], eol: match[2], start: match.index, end: pattern.lastIndex });
  if (!lines.length || lines.at(-1).eol) lines.push({ text: '', eol: '', start: source.length, end: source.length });
  let start = 0;
  let frontmatter = null;
  if (lines[0].text.replace(/^\uFEFF/, '') === '---') {
    const closing = lines.findIndex((line, i) => i > 0 && /^(---|\.\.\.)\s*$/.test(line.text));
    frontmatter = { start: 0, end: closing < 0 ? lines.length : closing + 1, closed: closing >= 0 };
    if (closing >= 0) start = closing + 1;
  }
  const tokens = md.parse(source.slice(lines[start]?.start ?? source.length), {});
  const spans = tokens.filter(t => t.map && (t.type === 'fence' || t.type === 'code_block' || t.type === 'blockquote_open' || t.type === 'bullet_list_open' || t.type === 'ordered_list_open')).map(t => ({
    start: start + t.map[0], end: start + t.map[1], type: t.type, level: t.level, info: t.info?.trim(), token: t
  }));
  const boundaries = [];
  for (let i = start; i < lines.length; i++) {
    if (i === 0 && start === 0) continue;
    if (/^ {0,3}---\s*$/.test(lines[i].text) && !spans.some(s => i >= s.start && i < s.end)) boundaries.push(i);
  }
  return { source, lines, start, frontmatter, tokens, spans, boundaries };
}
function contextAt(structure, offset) {
  const { lines, frontmatter, spans } = structure;
  let line = lines.findLastIndex(record => record.start <= offset);
  line = Math.max(0, line);
  if (frontmatter && line < frontmatter.end) return { kind: 'frontmatter', line };
  const span = spans.find(s => s.type === 'fence' && line >= s.start && line < s.end);
  if (span) {
    const closing = lines[span.end - 1]?.text.match(/^ {0,3}(`+|~+)\s*$/);
    const closed = closing && closing[1][0] === span.token.markup[0] && closing[1].length >= span.token.markup.length && span.end - 1 > span.start;
    if (span.level === 0 && span.info === 'chat' && line > span.start && !(closed && line === span.end - 1)) return { kind: 'chat', line, span };
    return { kind: 'literal', line, span };
  }
  if (spans.some(s => line >= s.start && line < s.end)) return { kind: 'literal', line };
  for (const token of structure.tokens) {
    if (token.type !== 'inline' || token.level !== 1 || !token.map || line < structure.start + token.map[0] || line >= structure.start + token.map[1]) continue;
    const begin = lines[structure.start + token.map[0]].start;
    const finish = lines[structure.start + token.map[1]]?.start ?? structure.source.length;
    const raw = structure.source.slice(begin, finish);
    const runs = [...raw.matchAll(/`+/g)];
    for (let i = 0; i < runs.length; i++) {
      let escapes = 0;
      for (let j = runs[i].index - 1; j >= 0 && raw[j] === '\\'; j--) escapes++;
      if (escapes % 2) continue;
      const close = runs.findIndex((run, j) => j > i && run[0].length === runs[i][0].length);
      if (close < 0) continue;
      if (offset > begin + runs[i].index && offset < begin + runs[close].index + runs[close][0].length) return { kind: 'literal', line };
      i = close;
    }
  }
  return { kind: 'root', line };
}
// A boundary belongs to the beat it introduces. Keep UTF-16 offsets for VS Code.
function beatRanges(structure) {
  const { lines, boundaries, start, source } = structure;
  const ends = [...boundaries, lines.length];
  return ends.map((endLine, index) => {
    const boundaryLine = index ? boundaries[index - 1] : null;
    const bodyLine = boundaryLine === null ? start : boundaryLine + 1;
    const nextBoundary = boundaries[index] ?? null;
    // Before the first beat, whitespace after frontmatter is harmless.
    let titleCandidate = bodyLine;
    if (index === 0) while (titleCandidate < endLine && !lines[titleCandidate].text.trim()) titleCandidate++;
    const match = lines[titleCandidate]?.text.match(/^<!-- beat: ([^\r\n]*\S) -->$/);
    const titleLine = titleCandidate < endLine && match ? titleCandidate : null;
    const title = titleLine === null ? null : match[1];
    const body = lines.slice(bodyLine, endLine).filter((_, offset) => bodyLine + offset !== titleLine).map(line => line.text).join('\n').trim();
    if (!body) return null;
    const startLine = boundaryLine ?? bodyLine;
    const anchorLine = titleLine ?? (boundaryLine ?? Math.min(titleCandidate, endLine - 1));
    return {
      title, titleLine, boundaryLine, bodyLine, anchorLine, startLine, endLine,
      startOffset: lines[startLine]?.start ?? source.length,
      endOffset: nextBoundary === null ? source.length : lines[nextBoundary].start
    };
  }).filter(Boolean);
}
function beatAtOffset(ranges, offset) {
  return ranges.findIndex(range => offset >= range.startOffset && offset <= range.endOffset &&
    (offset < range.endOffset || range === ranges.at(-1)));
}
function beatFoldRanges(ranges) {
  return ranges.map(range => ({ start: range.anchorLine, end: range.endLine - 1 }))
    .filter(range => range.end > range.start);
}
module.exports = { inspectStructure, contextAt, beatRanges, beatAtOffset, beatFoldRanges };
