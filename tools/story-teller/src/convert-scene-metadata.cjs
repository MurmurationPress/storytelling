'use strict';
const YAML = require('yaml');
const { inspectStructure } = require('./structure.cjs');

const stateHeader = /^ {0,3}> ?\[!state\]([+-])?[ \t]*(.*?)[ \t]*$/i;
const stateCandidate = /^\s*(?:>\s*)+\[!state\b/i;
const quotePrefix = /^ {0,3}> ?/;
const reference = /^`\s*=this\.([A-Za-z_][A-Za-z0-9_]*)\s*`$/;
const fieldName = /^[A-Za-z_][A-Za-z0-9_]*$/;

function literalMarkdown(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/[\\`*_\[\]~!|]/g, '\\$&');
}
function fieldRow(text) {
  const patterns = [
    /^\s*(\*\*|\*\*\*\*)([^*\r\n]+)\1\s*:\s*(.*?)\s*$/,
    /^\s*(\*\*|\*\*\*\*)([^*:\r\n]+):\1\s*(.*?)\s*$/,
    /^\s*([^*:\r\n]+):\s*(.*?)\s*$/
  ];
  for (const [index, pattern] of patterns.entries()) {
    const match = text.match(pattern);
    if (!match) continue;
    const label = (index === 2 ? match[1] : match[2]).trim();
    const value = (index === 2 ? match[2] : match[3]).trim();
    if (label && value) return { label, value };
  }
  return null;
}
function readFrontmatter(structure) {
  const { frontmatter, lines, source } = structure;
  if (!frontmatter) return { fields: new Map() };
  if (!frontmatter.closed) return { error: { line: 1, message: 'unclosed YAML frontmatter; document left unchanged' } };
  const yaml = source.slice(lines[1].start, lines[frontmatter.end - 1].start);
  let document;
  try { document = YAML.parseDocument(yaml, { schema: 'core', customTags: [], resolveKnownTags: false, uniqueKeys: true, merge: false, maxAliasCount: 0 }); }
  catch (error) { return { error: { line: 1, message: `malformed YAML frontmatter: ${error.message}; document left unchanged` } }; }
  const issue = [...document.errors, ...document.warnings][0];
  if (issue) return { error: { line: (issue.linePos?.[0]?.line || 1) + 1, message: `malformed or unsupported YAML frontmatter: ${issue.message.split('\n')[0]}; document left unchanged` } };
  if (document.contents === null) return { fields: new Map() };
  if (!YAML.isMap(document.contents)) return { error: { line: 1, message: 'YAML frontmatter must be a top-level mapping; document left unchanged' } };
  const fields = new Map();
  for (const pair of document.contents.items) {
    if (!YAML.isScalar(pair.key) || typeof pair.key.value !== 'string' || !fieldName.test(pair.key.value))
      return { error: { line: 1, message: 'unsupported frontmatter key; document left unchanged' } };
    fields.set(pair.key.value, pair.value);
  }
  return { fields };
}
function resolvedValue(value, fields) {
  const matched = value.match(reference);
  if (!matched) {
    if (/`[^`]*=[^`]*`|=this\./.test(value)) return { error: 'unsupported Dataview expression' };
    return { text: value };
  }
  const key = matched[1];
  if (!fields.has(key)) return { error: `frontmatter field “${key}” is missing` };
  const node = fields.get(key);
  if (!YAML.isScalar(node) || node?.tag || node?.anchor) return { error: `frontmatter field “${key}” is complex or tagged` };
  if (node.value === null || node.value === undefined) return { error: `frontmatter field “${key}” is null` };
  if (!['string', 'number', 'boolean'].includes(typeof node.value) ||
      (typeof node.value === 'number' && !Number.isFinite(node.value)))
    return { error: `frontmatter field “${key}” has an unsupported value` };
  const text = String(node.value);
  if (/[\r\n]/.test(text)) return { error: `frontmatter field “${key}” is multiline and needs review` };
  return { text };
}
function convertSceneMetadata(source) {
  const structure = inspectStructure(source);
  const { lines, spans } = structure;
  const warnings = [], changes = [];
  const frontmatter = readFrontmatter(structure);
  if (frontmatter.error) return { text: source, count: 0, changes, warnings: [frontmatter.error] };
  for (const span of spans) {
    if (span.type !== 'blockquote_open') continue;
    const headerText = lines[span.start].text;
    if (!stateCandidate.test(headerText)) continue;
    const warn = (line, message) => warnings.push({ line, message });
    if (span.level !== 0) { warn(span.start + 1, 'nested State callout left unchanged'); continue; }
    const header = headerText.match(stateHeader);
    if (!header) { warn(span.start + 1, 'malformed State callout header left unchanged'); continue; }
    if (header[2].trim()) { warn(span.start + 1, 'titled State callout needs review; title left unchanged'); continue; }
    const rows = [];
    let invalid = false;
    for (let i = span.start + 1; i < span.end; i++) {
      const record = lines[i];
      if (!quotePrefix.test(record.text)) { warn(i + 1, 'malformed State quotation left unchanged'); invalid = true; break; }
      const unquoted = record.text.replace(quotePrefix, '');
      if (/^\s*>|^\s*\[!/.test(unquoted)) { warn(i + 1, 'nested or adjacent callout left unchanged'); invalid = true; break; }
      if (!unquoted.trim()) { rows.push({ blank: true, eol: record.eol }); continue; }
      const field = fieldRow(unquoted);
      if (!field) { warn(i + 1, 'State line is not a supported Label: value field; callout left unchanged'); invalid = true; break; }
      const value = resolvedValue(field.value, frontmatter.fields);
      if (value.error) { warn(i + 1, `${value.error}; State callout left unchanged`); invalid = true; break; }
      rows.push({ text: `**${literalMarkdown(field.label)}:** ${literalMarkdown(value.text)}`, eol: record.eol });
    }
    if (invalid) continue;
    if (!rows.some(row => !row.blank)) { warn(span.start + 1, 'empty State callout left unchanged'); continue; }
    const lastField = rows.findLastIndex(row => !row.blank);
    const rendered = rows.map((row, index) => row.blank ? row.eol : row.text + (index < lastField && !rows[index + 1]?.blank ? '  ' : '') + row.eol).join('');
    changes.push({ start: lines[span.start].start, end: lines[span.end - 1].end, text: rendered, line: span.start + 1 });
  }
  changes.sort((a, b) => a.start - b.start);
  if (changes.some((change, index) => index && change.start < changes[index - 1].end))
    return { text: source, count: 0, changes: [], warnings: [...warnings, { line: 1, message: 'overlapping State edits need review; document left unchanged' }] };
  let text = source;
  for (const change of [...changes].reverse()) text = text.slice(0, change.start) + change.text + text.slice(change.end);
  return { text, count: changes.length, changes, warnings };
}
module.exports = { convertSceneMetadata };
