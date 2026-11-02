'use strict';
// Metadata is single-line Markdown after ONE separating space/tab. No date parsing.
const { createMarkdown } = require('./markdown.cjs');
const md = createMarkdown();
const timestampPattern = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/;
function metadataLine(text, { title = false } = {}) {
  const labelled = text.match(/^(?:(Title|Timestamp):|\*\*(Title|Timestamp):\*\*|\*\*(Title|Timestamp)\*\*:)[ \t](.*)$/i);
  if (labelled && labelled[4].trim()) {
    const key = (labelled[1] || labelled[2] || labelled[3]).toLowerCase();
    if (title || key === 'timestamp') return {key,value:labelled[4],labelled:true};
  }
  if (timestampPattern.test(text.trim())) return { key: 'timestamp', value: text, labelled: false };
  return null;
}
function leadingTimestamp(lines) {
  const first = lines.findIndex(line => line.text.trim());
  if (first < 0) return {};
  const value = metadataLine(lines[first].text);
  if (!value) return {};
  // It must be a complete top-level paragraph, not a line of prose, table,
  // quote or code. Two adjacent timestamp candidates are not guessed apart.
  const body = lines.map(line => line.text + line.eol).join('');
  const tokens = md.parse(body, {});
  const paragraph = tokens[0];
  if (paragraph?.type !== 'paragraph_open' || paragraph.level !== 0 || paragraph.map[0] !== first || paragraph.map[1] !== first + 1 ||
      metadataLine(lines.slice(first + 1).find(line => line.text.trim())?.text || ''))
    return { warning: 'leading timestamp is not one isolated field; separate or move it into @timestamp explicitly' };
  return { value: value.value, index: first, labelled: value.labelled };
}
function fenceFor(body, metadata = '') {
  const longest = Math.max(2, ...[...(body + metadata).matchAll(/`+/g)].map(match => match[0].length));
  return '`'.repeat(longest + 1);
}
function applyChanges(source, changes) {
  let text = source;
  for (const change of [...changes].sort((a, b) => b.start - a.start)) text = text.slice(0, change.start) + change.text + text.slice(change.end);
  return text;
}
function within(start, end, scope) { return !scope || start >= scope.start && end <= scope.end; }
module.exports = { metadataLine, leadingTimestamp, fenceFor, applyChanges, within };
