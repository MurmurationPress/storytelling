'use strict';
const YAML = require('yaml');
const curves = ['basis','bumpX','bumpY','cardinal','catmullRom','linear','monotoneX','monotoneY','natural','step','stepAfter','stepBefore','rounded'];
const rules = {
  look: value => ['classic','handDrawn'].includes(value),
  handDrawnSeed: value => Number.isInteger(value) && value >= 0 && value <= 2147483647,
  flowchart: {
    look: value => ['classic','handDrawn'].includes(value),
    curve: value => curves.includes(value),
    nodeSpacing: bounded, rankSpacing: bounded, padding: bounded
  },
  sequence: { actorMargin: bounded, messageMargin: bounded, mirrorActors: value => typeof value === 'boolean' }
};
function bounded(value) { return Number.isInteger(value) && value >= 8 && value <= 200; }
function allowed(input, schema = rules, path = 'config') {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error(`${path} must be a mapping`);
  const result = {};
  for (const [key, value] of Object.entries(input)) {
    if (!Object.hasOwn(schema, key)) throw Error(`${path}.${key} is not an allowed presentation setting`);
    const rule = schema[key];
    if (typeof rule === 'function') {
      if (!rule(value)) throw Error(`Invalid presentation value for ${path}.${key}`);
      result[key] = value;
    } else result[key] = allowed(value, rule, `${path}.${key}`);
  }
  return result;
}
function prepareDiagram(source) {
  if (source.length > 30000) throw Error('Diagram exceeds 30,000 characters');
  let text = source.replace(/\r\n?/g, '\n'), config = {}, offset = 0;
  // Parse standard Mermaid frontmatter ourselves. Never pass arbitrary config
  // to Mermaid's preprocessor, even when an unknown key appears innocuous.
  if (/^\s*---\s*\n/.test(text)) {
    const match = text.match(/^\s*---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/);
    if (!match) throw Error('Unclosed Mermaid frontmatter');
    const doc = YAML.parseDocument(match[1], { uniqueKeys: true, customTags: [] });
    if (doc.errors.length || doc.warnings.length) throw Error(`Invalid Mermaid frontmatter: ${(doc.errors[0] || doc.warnings[0]).message}`);
    const metadata = doc.toJS({ maxAliasCount: 0 });
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) throw Error('Mermaid frontmatter must be a mapping');
    for (const key of Object.keys(metadata)) if (!['config','title'].includes(key)) throw Error(`Mermaid metadata ${key} is not allowed`);
    config = allowed(metadata.config ?? {});
    if (metadata.title !== undefined && (typeof metadata.title !== 'string' || metadata.title.length > 300 || /[<>]/.test(metadata.title))) throw Error('Mermaid title must be plain text (at most 300 characters)');
    offset = match[0].split('\n').length - 1;
    text = text.slice(match[0].length);
    // Only plain title metadata is returned to Mermaid; config is applied by us.
    if (metadata.title) config.storyTitle = metadata.title;
  }
  // Legacy init directives use JSON. Only a leading directive is supported;
  // YAML frontmatter is preferred by Mermaid and by this component.
  const directive = text.match(/^\s*%%\{\s*(?:init|initialize)\s*:\s*([\s\S]*?)\}%%\s*(?:\n|$)/);
  if (directive) {
    if (Object.keys(config).length) throw Error('Use one configuration header per diagram');
    config = allowed(JSON.parse(directive[1]));
    offset += directive[0].split('\n').length - 1;
    text = text.slice(directive[0].length);
  }
  // Configuration markers are forbidden anywhere else, including quoted text:
  // Mermaid's own preprocessor also recognises them before parsing labels.
  if (/%%\{/.test(text)) throw Error('Only a leading validated init directive is supported');
  const title = config.storyTitle; delete config.storyTitle;
  let description = false;
  for (const [index, line] of text.split('\n').entries()) {
    const trimmed = line.trim();
    // Accessibility blocks and comments are text, never directive statements.
    if (/^accDescr\s*\{/.test(trimmed)) { description = !trimmed.endsWith('}'); continue; }
    if (description) { if (trimmed === '}') description = false; continue; }
    if (/^(?:accTitle|accDescr)\s*:|^%%/.test(trimmed)) continue;
    // Actual statements, rather than words inside labels or messages. Mermaid
    // strict mode disables click handlers even for unusual grammar spellings.
    const statements = line.replace(/"(?:[^"\\]|\\.)*"/g, '""').replace(/\[[^\]]*\]|\([^)]*\)|\{[^}]*\}/g, '').split(';');
    if (statements.some(statement => /^\s*(?:click|style|classDef|linkStyle)\s+/i.test(statement)) || /@\s*\{[^}]*\b(?:img|icon)[\"']?\s*:/i.test(line))
      throw Error(`Diagram line ${offset + index + 1}: links, resource nodes and raw CSS statements are disabled`);
  }
  // HTML labels stay disabled. Reject actual markup/resources as a second
  // boundary; ordinary words (image/style/src/etc.) are never reserved here.
  if (/<\s*\/?[A-Za-z][^>]*>|!\[[^\]]*\]\s*\(|url\s*\(|@import/i.test(text)) throw Error('HTML and resource/CSS expressions are disabled');
  return { text, config, title, offset };
}
function sourceError(source) { try { prepareDiagram(source); return null; } catch (error) { return error.message; } }
function diagramOptions(config, { dark = false, fontFamily = 'sans-serif' } = {}) {
  // Fresh nested objects on every render, so initialize cannot mutate a later
  // diagram's settings. Author config has already passed the closed allowlist.
  return { startOnLoad: false, htmlLabels: false, securityLevel: 'strict', suppressErrorRendering: true,
    theme: dark ? 'dark' : 'default', look: 'classic', handDrawnSeed: 1, fontFamily,
    maxTextSize: 30000, maxEdges: 300, ...config,
    flowchart: { htmlLabels: false, look: config.look || 'classic', ...config.flowchart },
    sequence: { useMaxWidth: false, ...config.sequence } };
}
module.exports = { prepareDiagram, sourceError, diagramOptions };
