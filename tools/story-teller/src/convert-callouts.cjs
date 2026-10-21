'use strict';
// Pure, conservative conversion of observed Obsidian callout forms.
const MarkdownIt = require('markdown-it');
const { inspectStructure, beatRanges } = require('./structure.cjs');
const md = new MarkdownIt({ html: false });
const machineLabels = new Set(['prime-log', 'divergent']);
const recognised = new Set([...machineLabels, 'annotation']);
const headerPattern = /^ {0,3}> ?\[!([\w-]+)\]([+-])?[ \t]*(.*?)[ \t]*$/i;
const quotePattern = /^ {0,3}> ?/;
function safeTitle(title) {
  return title && !/[\r\n]/.test(title) && !title.includes('--') && !title.includes('<!--') &&
    /^<!-- beat: ([^\r\n]*\S) -->$/.test(`<!-- beat: ${title} -->`);
}
function fenceFor(body) {
  const longest = Math.max(2, ...[...body.matchAll(/`+/g)].map(match => match[0].length));
  return '`'.repeat(longest + 1);
}
function typeout(format, sound, body, eol) {
  const fence = fenceFor(body);
  return `${fence}typeout${eol}@format ${format}${eol}@sound ${sound}${eol}${eol}${body}${body.endsWith('\n') || body.endsWith('\r') ? '' : eol}${fence}${eol}`;
}
function convertCallouts(source) {
  const structure = inspectStructure(source);
  const { lines, start, boundaries, spans } = structure;
  const warnings = [], changes = [];
  if (structure.frontmatter && !structure.frontmatter.closed)
    return { text: source, count: 0, changes, warnings: [{ line: 1, message: 'unclosed frontmatter; document left unchanged' }] };
  const ranges = beatRanges(structure);
  for (const span of spans) {
    if (span.type !== 'blockquote_open' || span.level !== 0) continue;
    const open = span.start, close = span.end;
    const header = lines[open]?.text.match(headerPattern);
    if (!header && /^ {0,3}> ?\[!(?:prime-log|divergent|annotation)\b/i.test(lines[open]?.text || '')) {
      warnings.push({ line: open + 1, message: 'malformed recognised callout header left unchanged' }); continue;
    }
    if (!header || !recognised.has(header[1].toLowerCase())) continue;
    const label = header[1].toLowerCase();
    const title = header[3].trim() || header[1];
    const warn = message => warnings.push({ line: open + 1, message });
    if (!safeTitle(title)) { warn('callout title cannot be represented safely as beat metadata'); continue; }
    if (close <= open + 1) { warn('empty callout left unchanged'); continue; }
    const quoted = lines.slice(open + 1, close);
    if (quoted.some(line => !quotePattern.test(line.text))) { warn('malformed callout quoting left unchanged'); continue; }
    const bodyLines = quoted.map(line => ({ text: line.text.replace(quotePattern, ''), eol: line.eol }));
    if (bodyLines.some(line => /^\s*(?:> ?)?\[!/.test(line.text))) { warn('nested or adjacent callout needs review'); continue; }
    const eol = lines[open].eol || '\n';
    let converted;
    if (machineLabels.has(label)) {
      const body = bodyLines.map(line => line.text + line.eol).join('');
      const tokens = md.parse(body, {});
      const fences = tokens.filter(token => token.type === 'fence');
      if (fences.length !== 1 || fences[0].level !== 0 || fences[0].info.trim() !== 'yaml') {
        warn('machine callout needs exactly one top-level YAML fence; prose-only or mixed fences need review'); continue;
      }
      const token = fences[0], opening = token.map[0], ending = token.map[1] - 1;
      const closeFence = bodyLines[ending]?.text.match(/^ {0,3}(`+|~+)\s*$/);
      if (!closeFence || closeFence[1][0] !== token.markup[0] || closeFence[1].length < token.markup.length || ending <= opening) {
        warn('unclosed YAML fence left unchanged'); continue;
      }
      const outside = [...bodyLines.slice(0, opening), ...bodyLines.slice(ending + 1)];
      if (outside.some(line => /^\s*(?:---\s*$|@(delay|pause)\b|<!-- beat:)/.test(line.text))) {
        warn('surrounding prose contains Story Teller structure or timing; callout left unchanged'); continue;
      }
      const yaml = bodyLines.slice(opening + 1, ending).map(line => line.text + line.eol).join('');
      if (!yaml.trim()) { warn('empty YAML fence left unchanged'); continue; }
      converted = bodyLines.slice(0, opening).map(line => line.text + line.eol).join('') +
        typeout('yaml', 'modem', yaml, eol) + bodyLines.slice(ending + 1).map(line => line.text + line.eol).join('');
    } else {
      const body = bodyLines.map(line => line.text + line.eol).join('');
      if (!body.trim()) { warn('empty annotation left unchanged'); continue; }
      converted = typeout('annotation', 'keyboard', body, eol);
    }
    const boundary = boundaries.findLast(line => line < open);
    const bodyStart = boundary === undefined ? start : boundary + 1;
    const range = ranges.find(item => item.startLine === (boundary ?? bodyStart));
    const existingTitleLine = range?.titleLine ?? null;
    const priorContent = lines.slice(bodyStart, open).map((line, index) => ({ text: line.text, index: bodyStart + index }))
      .filter(item => item.text.trim() && item.index !== existingTitleLine);
    const firstContent = priorContent.length === 0;
    if (firstContent && range?.title && range.title !== title) {
      warn(`existing beat title “${range.title}” conflicts with callout title “${title}”; left unchanged`); continue;
    }
    let changeStart = lines[open].start;
    let prefix = '';
    if (firstContent && range?.title === title) {
      // Existing title wins; the wrapper alone changes.
    } else if (firstContent && boundary !== undefined) {
      changeStart = lines[boundary].end;
      prefix = `<!-- beat: ${title} -->${eol}` + source.slice(changeStart, lines[open].start);
    } else if (firstContent) {
      prefix = `<!-- beat: ${title} -->${eol}${eol}`;
    } else {
      prefix = `---${eol}<!-- beat: ${title} -->${eol}${eol}`;
    }
    changes.push({ start: changeStart, end: lines[close - 1].end, text: prefix + converted, line: open + 1 });
  }
  changes.sort((a, b) => a.start - b.start);
  // Overlap means the source shape is ambiguous; do not apply a partial set.
  if (changes.some((change, index) => index && change.start < changes[index - 1].end))
    return { text: source, count: 0, changes: [], warnings: [...warnings, { line: 1, message: 'overlapping callout edits need review; document left unchanged' }] };
  let text = source;
  for (const change of [...changes].reverse()) text = text.slice(0, change.start) + change.text + text.slice(change.end);
  return { text, count: changes.length, changes, warnings };
}
module.exports = { convertCallouts };
