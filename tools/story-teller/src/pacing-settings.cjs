'use strict';
const YAML = require('yaml');
const { inspectStructure } = require('./structure.cjs');
const { FIELD, effectivePacing } = require('./prose-pacing.cjs');
function sceneSetting(source) {
  const structure = inspectStructure(source);
  if (!structure.frontmatter) return { value: 'inherit', declared: false, structure };
  if (!structure.frontmatter.closed) return { error: 'Close the initial YAML frontmatter before editing prose pacing.', structure };
  const begin = structure.lines[1].start;
  const end = structure.lines[structure.frontmatter.end - 1].start;
  const raw = source.slice(begin, end);
  const doc = YAML.parseDocument(raw, { schema: 'core', customTags: [], uniqueKeys: true, merge: false, maxAliasCount: 0 });
  if (doc.errors.length || !YAML.isMap(doc.contents)) return { error: `Invalid frontmatter: ${doc.errors[0]?.message || 'expected a mapping'}`, structure };
  const value = doc.get(FIELD);
  if (value === undefined || value === null || value === 'inherit') return { value: 'inherit', declared: doc.has(FIELD), structure };
  if (value !== 'on' && value !== 'off') return { error: `${FIELD} must be on, off or inherit.`, structure };
  return { value, declared: true, structure };
}
function sceneEdit(source, value) {
  if (!['on', 'off', 'inherit'].includes(value)) throw Error('Invalid scene prose pacing choice');
  const found = sceneSetting(source);
  if (found.error) throw Error(found.error);
  const structure = found.structure;
  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  if (!structure.frontmatter) return value === 'inherit' ? source : `---${eol}${FIELD}: ${value}${eol}---${eol}${source}`;
  const close = structure.lines[structure.frontmatter.end - 1].start;
  const fieldLines = structure.lines.slice(1, structure.frontmatter.end - 1).filter(line => /^story_teller_prose_pacing[ \t]*:/.test(line.text));
  if (fieldLines.length > 1) throw Error(`Duplicate ${FIELD} keys need manual review`);
  if (found.declared && !fieldLines.length) throw Error(`Existing ${FIELD} uses an unsupported key layout; edit it manually`);
  if (fieldLines.length) {
    const line = fieldLines[0];
    return source.slice(0, line.start) + (value === 'inherit' ? '' : `${FIELD}: ${value}${line.eol || eol}`) + source.slice(line.end);
  }
  return value === 'inherit' ? source : source.slice(0, close) + `${FIELD}: ${value}${eol}` + source.slice(close);
}
function projectSetting(manifest) {
  const value = manifest?.settings?.prosePacing;
  if (value !== undefined && value !== 'on' && value !== 'off') throw Error('Project prosePacing must be on or off');
  return value;
}
function projectEdit(manifest, value) {
  if (!['on', 'off'].includes(value)) throw Error('Invalid book prose pacing choice');
  return { ...manifest, settings: { ...(manifest.settings || {}), prosePacing: value } };
}
function resolveSettings(source, manifest) {
  const scene = sceneSetting(source);
  if (scene.error) return { ...effectivePacing(projectSetting(manifest), 'inherit'), warning: scene.error };
  return effectivePacing(projectSetting(manifest), scene.value);
}
module.exports = { sceneSetting, sceneEdit, projectSetting, projectEdit, resolveSettings };
