'use strict';
// Pure, conservative conversion of observed Obsidian callout forms.
const MarkdownIt = require('markdown-it');
const { inspectStructure } = require('./structure.cjs');
const { documentWarning } = require('./janus.cjs');
const md = new MarkdownIt({ html: false });
const machineLabels = new Set(['prime-log', 'divergent']);
const recognised = new Set([...machineLabels, 'annotation', 'janus', 'janus-log']);
const headerPattern = /^ {0,3}> ?\[!([\w-]+)\]([+-])?[ \t]*(.*?)[ \t]*$/i;
const quotePattern = /^ {0,3}> ?/;
const { leadingTimestamp, fenceFor, applyChanges, within } = require('./component-identity.cjs');
function typeout(format, sound, body, eol, title, timestamp) {
  const metadata = `@identity component${eol}` + (title ? `@title ${title}${eol}` : '') + (timestamp !== undefined ? `@timestamp ${timestamp}${eol}` : '');
  const fence = fenceFor(body, metadata);
  return `${fence}typeout${eol}@format ${format}${eol}${metadata}@sound ${sound}${eol}${eol}${body}${body.endsWith('\n') || body.endsWith('\r') ? '' : eol}${fence}${eol}`;
}
function convertCallouts(source, { scope } = {}) {
  const structure = inspectStructure(source);
  const { lines, start, boundaries, spans } = structure;
  const warnings = [], changes = [];
  if (structure.frontmatter && !structure.frontmatter.closed)
    return { text: source, count: 0, changes, warnings: [{ line: 1, message: 'unclosed frontmatter; document left unchanged' }] };
  for (const span of spans) {
    if (span.type !== 'blockquote_open' || span.level !== 0) continue;
    const open = span.start, close = span.end;
    if (!within(lines[open].start, lines[close - 1].end, scope)) continue;
    const header = lines[open]?.text.match(headerPattern);
    if (!header && /^ {0,3}> ?\[!(?:prime-log|divergent|annotation|janus-log|janus)\b/i.test(lines[open]?.text || '')) {
      warnings.push({ line: open + 1, message: 'malformed recognised callout header left unchanged' }); continue;
    }
    if (!header || !recognised.has(header[1].toLowerCase())) continue;
    const label = header[1].toLowerCase();
    const title = header[3];
    const warn = message => warnings.push({ line: open + 1, message });
    if (close <= open + 1) { warn('empty callout left unchanged'); continue; }
    const quoted = lines.slice(open + 1, close);
    if (quoted.some(line => !quotePattern.test(line.text))) { warn('malformed callout quoting left unchanged'); continue; }
    let bodyLines = quoted.map(line => ({ text: line.text.replace(quotePattern, ''), eol: line.eol }));
    if (bodyLines.some(line => /^\s*(?:> ?)?\[!/.test(line.text))) { warn('nested or adjacent callout needs review'); continue; }
    const eol = lines[open].eol || '\n';
    const stamp = leadingTimestamp(bodyLines);
    if (stamp.warning) { warn(stamp.warning + '; callout left unchanged'); continue; }
    if (stamp.index !== undefined) bodyLines = bodyLines.filter((_, index) => index !== stamp.index);
    if (!bodyLines.some(line => line.text.trim())) { warn('callout has metadata but no body; left unchanged'); continue; }
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
        typeout('yaml', 'modem', yaml, eol, title, stamp.value) + bodyLines.slice(ending + 1).map(line => line.text + line.eol).join('');
    } else {
      const body = bodyLines.map(line => line.text + line.eol).join('');
      if (!body.trim()) { warn(`empty ${label} left unchanged`); continue; }
      if (label.startsWith('janus')) {
        const warning = documentWarning(body);
        if (warning) { warn(`JANUS ${warning}; callout left unchanged`); continue; }
        const tokens = md.parse(body, {});
        if (bodyLines.some(line => /^\s*(?:---\s*$|@(delay|pause)\b|<!-- beat:)/.test(line.text)) ||
            tokens.some(token => {
              if (token.type !== 'fence') return false;
              const closing = bodyLines[(token.map?.[1] || 0) - 1]?.text.match(/^ {0,3}(`+|~+)\s*$/);
              return !closing || closing[1][0] !== token.markup[0] || closing[1].length < token.markup.length;
            })) {
          warn('JANUS contains ambiguous structure or an unclosed fence; callout left unchanged'); continue;
        }
        converted = typeout(label, 'none', body, eol, title, stamp.value);
      } else converted = typeout('annotation', 'keyboard', body, eol, title, stamp.value);
    }
    changes.push({ start: lines[open].start, end: lines[close - 1].end, text: converted, line: open + 1 });
  }
  changes.sort((a, b) => a.start - b.start);
  // Overlap means the source shape is ambiguous; do not apply a partial set.
  if (changes.some((change, index) => index && change.start < changes[index - 1].end))
    return { text: source, count: 0, changes: [], warnings: [...warnings, { line: 1, message: 'overlapping callout edits need review; document left unchanged' }] };
  const text = applyChanges(source, changes);
  return { text, count: changes.length, changes, warnings };
}
module.exports = { convertCallouts };
