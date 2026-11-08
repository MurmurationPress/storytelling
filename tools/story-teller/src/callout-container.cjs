'use strict';
// A mixed callout owns identity and an ordered body; child chats stay components.
const md = new (require('markdown-it'))({ html: false });
const headerPattern = /^ {0,3}> ?\[!([\w-]+)\]([+-])?[ \t]*(.*?)[ \t]*$/i;
const quotePattern = /^ {0,3}> ?/;
function calloutSpans(structure) {
  const result = [];
  const quotes = [];
  for (const span of structure.spans.filter(s => s.type === 'blockquote_open' && s.level === 0)) {
    const previous = quotes.at(-1);
    if (previous && structure.lines.slice(previous.end, span.start).every(l => !l.text.trim())) { previous.end = span.end; previous.members.push(span); }
    else quotes.push({ ...span, members: [span] });
  }
  // Preserve historical prose-only quote boundaries. Bridge bare blank lines
  // only for a region that actually contains a chat needing structural parsing.
  const regions = quotes.flatMap(span => {
    const tokens = md.parse(structure.lines.slice(span.start, span.end).map(l => l.text.replace(quotePattern, '')).join('\n'), {});
    return tokens.some(t => t.type === 'fence' && /^chat(?:[-\s]|$)/.test(t.info.trim())) ? [span] : span.members;
  });
  for (const span of regions) {
    const starts = [span.start];
    const fences = md.parse(structure.lines.slice(span.start, span.end).map(l => l.text.replace(quotePattern, '')).join('\n'), {}).filter(t => t.type === 'fence');
    for (let i = span.start + 1; i < span.end; i++) {
      if (headerPattern.test(structure.lines[i].text) && !fences.some(t => i >= span.start + t.map[0] && i < span.start + t.map[1])) starts.push(i);
    }
    starts.forEach((start, i) => {
      let end = starts[i + 1] ?? span.end;
      while (end > start + 1 && !structure.lines[end - 1].text.trim()) end--;
      result.push({ ...span, start, end });
    });
  }
  return result;
}
function closedFence(token, lines) {
  const end = token.map[1] - 1, close = lines[end]?.text.match(/^ {0,3}(`+|~+)\s*$/);
  return end > token.map[0] && close && close[1][0] === token.markup[0] && close[1].length >= token.markup.length;
}
module.exports = { headerPattern, quotePattern, calloutSpans, closedFence };
