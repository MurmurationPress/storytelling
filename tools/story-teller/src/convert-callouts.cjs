'use strict';
// Pure, conservative conversion of observed Obsidian callout forms.
const MarkdownIt = require('markdown-it');
const { inspectStructure } = require('./structure.cjs');
const { documentWarning } = require('./janus.cjs');
const md = new MarkdownIt({ html: false });
const machineLabels = new Set(['prime-log', 'divergent']);
const recognised = new Set([...machineLabels, 'annotation', 'email', 'janus', 'janus-log']);
const { headerPattern, quotePattern, calloutSpans, closedFence } = require('./callout-container.cjs');
const { convertChats } = require('./convert.cjs');
const { parseScene } = require('./parser.cjs');
const { leadingTimestamp, fenceFor, applyChanges, within } = require('./component-identity.cjs');
function typeout(format, sound, body, eol, title, timestamp, treatment = '') {
  const metadata = `@identity component${eol}` + (title ? `@title ${title}${eol}` : '') + (timestamp !== undefined ? `@timestamp ${timestamp}${eol}` : '');
  const fence = fenceFor(body, metadata);
  return `${fence}typeout${eol}@format ${format}${eol}${metadata}${treatment}@sound ${sound}${eol}${eol}${body}${body.endsWith('\n') || body.endsWith('\r') ? '' : eol}${fence}${eol}`;
}
function convertCallouts(source, { scope } = {}) {
  const structure = inspectStructure(source);
  const { lines } = structure;
  const warnings = [], changes = [];
  if (structure.frontmatter && !structure.frontmatter.closed)
    return { text: source, count: 0, changes, warnings: [{ line: 1, message: 'unclosed frontmatter; document left unchanged' }] };
  for (const span of calloutSpans(structure)) {
    const open = span.start, close = span.end;
    if (!within(lines[open].start, lines[close - 1].end, scope)) continue;
    const header = lines[open]?.text.match(headerPattern);
    if (!header && /^ {0,3}> ?\[!(?:prime-log|divergent|annotation|email|janus-log|janus)\b/i.test(lines[open]?.text || '')) {
      warnings.push({ line: open + 1, message: 'malformed recognised callout header left unchanged' }); continue;
    }
    if (!header || !recognised.has(header[1].toLowerCase())) continue;
    const label = header[1].toLowerCase();
    const title = header[3];
    const warn = message => warnings.push({ line: open + 1, message });
    if (close <= open + 1) { warn('empty callout left unchanged'); continue; }
    const quoted = lines.slice(open + 1, close);
    if (quoted.some(line => line.text.trim() && !quotePattern.test(line.text))) { warn('malformed callout quoting left unchanged'); continue; }
    let bodyLines = quoted.map(line => ({ text: line.text.replace(quotePattern, ''), eol: line.eol }));
    const bodyTokens = md.parse(bodyLines.map(l => l.text + l.eol).join(''), {});
    if (bodyLines.some((line, index) => /^\s*(?:> ?)?\[!/.test(line.text) && !bodyTokens.some(t => t.type === 'fence' && index >= t.map[0] && index < t.map[1]))) { warn('nested or adjacent callout needs review'); continue; }
    const eol = lines[open].eol || '\n';
    // Email headers and date-like lines are authored body, never metadata.
    const stamp = label === 'email' ? {} : leadingTimestamp(bodyLines);
    if (stamp.warning) { warn(stamp.warning + '; callout left unchanged'); continue; }
    if (stamp.index !== undefined) bodyLines = bodyLines.filter((_, index) => index !== stamp.index);
    if (!bodyLines.some(line => line.text.trim())) { warn('callout has metadata but no body; left unchanged'); continue; }
    let converted;
    const mixedBody = bodyLines.map(line => line.text + line.eol).join('');
    const mixedTokens = md.parse(mixedBody, {});
    if (mixedTokens.some(t => t.type === 'fence' && /^chat(?:[-\s]|$)/.test(t.info.trim()))) {
      const fences = mixedTokens.filter(t => t.type === 'fence');
      if (fences.some(t => t.level !== 0 || !['yaml', 'chat'].includes(t.info.trim()) || !closedFence(t, bodyLines))) {
        warn('mixed callout needs closed top-level yaml/chat fences; close the fence or review unsupported nested content'); continue;
      }
      if (bodyLines.some((line, i) => !fences.some(t => i >= t.map[0] && i < t.map[1]) && /^\s*(?:---\s*$|@(delay|pause)\b|<!-- beat:)/.test(line.text))) {
        warn('mixed callout contains Story Teller structure or timing; callout left unchanged'); continue;
      }
      const chats = convertChats(mixedBody);
      if (chats.warnings.length) {
        warn('embedded chat: ' + chats.warnings.map(w => `body line ${w.line}: ${w.message}`).join('; ') + '; entire callout left unchanged'); continue;
      }
      // Re-inspect after chat edits; preserve prose and convert YAML independently.
      const nested = inspectStructure(chats.text);
      const edits = nested.spans.filter(t => t.type === 'fence' && t.level === 0 && t.info === 'yaml').map(t => ({
        start: nested.lines[t.start].start, end: nested.lines[t.end - 1].end,
        text: typeout('yaml', 'modem', nested.lines.slice(t.start + 1, t.end - 1).map(l => l.text + l.eol).join(''), eol)
      }));
      const body = applyChanges(chats.text, edits);
      const metadata = `@type ${header[1]}${eol}` + (title ? `@title ${title}${eol}` : '') + (stamp.value !== undefined ? `@timestamp ${stamp.value}${eol}` : '') + (header[2] ? `@fold ${header[2]}${eol}` : '');
      const fence = fenceFor(body, metadata);
      converted = `${fence}callout${eol}${metadata}${eol}${body}${body.endsWith('\n') ? '' : eol}${fence}${eol}`;
      const validation = parseScene(converted);
      if (validation.diagnostics.length) { warn('mixed callout conversion needs review: ' + validation.diagnostics.join('; ') + '; entire callout left unchanged'); continue; }
    } else if (machineLabels.has(label)) {
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
        if (bodyLines.some((line,index) => !tokens.some(token => token.type === 'fence' && index >= token.map[0] && index < token.map[1]) && /^\s*(?:---\s*$|@(delay|pause)\b|<!-- beat:)/.test(line.text)) ||
            tokens.some(token => {
              if (token.type !== 'fence') return false;
              const closing = bodyLines[(token.map?.[1] || 0) - 1]?.text.match(/^ {0,3}(`+|~+)\s*$/);
              return !closing || closing[1][0] !== token.markup[0] || closing[1].length < token.markup.length;
            })) {
          warn('JANUS contains ambiguous structure or an unclosed fence; callout left unchanged'); continue;
        }
        converted = typeout(label, 'none', body, eol, title, stamp.value);
      } else if (label === 'email') {
        converted = typeout('annotation', 'none', body, eol, title, undefined, `@fill grey${eol}@border grey${eol}`);
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
