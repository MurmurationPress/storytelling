'use strict';
const { inspectStructure } = require('./structure.cjs');
const { parseScene } = require('./parser.cjs');
const { DEFAULT_SPEED, MIN_SPEED, MAX_SPEED, FORMATS, SOUNDS, BORDERS, FILLS } = require('./typeout.cjs');
const { PACE_MULTIPLIERS } = require('./pace.cjs');

const choices = {
  chat: [
    { id: 'title', label: 'Title', description: 'Conversation heading inside this chat.' },
    { id: 'viewer', label: 'Viewer', description: 'Participant whose messages are outgoing.' },
    { id: 'pace', label: 'Pace', description: 'Scale automatic message delays only.' },
    { id: 'ticks', label: 'Ticks', description: 'Authored delivered/read marks on outgoing messages.' },
    { id: 'responding', label: 'Responding', description: 'Show incoming responding cues throughout this chat.' }
  ],
  typeout: [
    { id: 'format', label: 'Format', description: 'YAML state or annotation appearance.' },
    { id: 'sound', label: 'Sound', description: 'Modem, keyboard, typewriter or silent.' },
    { id: 'speed', label: 'Speed', description: `${MIN_SPEED}–${MAX_SPEED} Unicode grapheme clusters per second.` },
    { id: 'border', label: 'Border', description: 'Default, none or grey.' },
    { id: 'fill', label: 'Fill', description: 'Default, none, grey or yellow.' }
  ]
};
const values = {
  pace: Object.keys(PACE_MULTIPLIERS), ticks: ['on'], responding: ['on'],
  format: FORMATS, sound: SOUNDS, border: BORDERS, fill: FILLS
};
const defaults = new Set(['title', 'viewer', 'pace', 'ticks', 'responding', 'sound', 'speed', 'border', 'fill']);
function locateSettingContext(source, selection) {
  if (selection.start < 0 || selection.end !== selection.start || selection.end > source.length)
    return { error: 'Place one caret inside a chat or type-out component; selected text will not be changed.' };
  const structure = inspectStructure(source);
  const line = Math.max(0, structure.lines.findLastIndex(record => record.start <= selection.start));
  const span = structure.spans.find(item => item.type === 'fence' && item.level === 0 &&
    ['chat', 'typeout'].includes(item.info) && line >= item.start && line < item.end);
  if (!span) return { error: 'Place the caret inside a chat or type-out fence. Use Chat block or Type-out here to insert a new component.' };
  const snippet = source.slice(structure.lines[span.start].start, structure.lines[span.end]?.start ?? source.length);
  const parsed = parseScene(snippet);
  const component = parsed.beats[0]?.blocks.find(block => block.type === span.info);
  if (!component) {
    const detail = (parsed.diagnostics[0] || 'check the fence').replace(/^Line (\d+):/, (_, relative) => `Line ${span.start + Number(relative)}:`);
    return { error: `This ${span.info} has invalid or incomplete configuration (${detail}). Fix it before editing settings.` };
  }
  const lines = structure.lines;
  let headerEnd = span.end - 1;
  if (span.info === 'typeout') {
    headerEnd = lines.findIndex((record, index) => index > span.start && index < span.end - 1 && !record.text.trim());
    if (headerEnd < 0) return { error: 'Type-out configuration needs a blank line before its literal body.' };
  } else {
    for (let i = span.start + 1; i < span.end - 1; i++) {
      if (/^(?!\s*#|\s*@|\s*$).+:[ \t]+|^\s*@(pause|delay)\b/.test(lines[i].text)) { headerEnd = i; break; }
    }
  }
  return { structure, span, lines, headerEnd, kind: span.info, component };
}
function declaration(record, kind) {
  const text = record.text.trim();
  if (kind === 'chat' && /^(?:#\s+|@title\s+)/.test(text)) return 'title';
  const match = text.match(/^@(format|sound|speed|border|fill|viewer|pace|ticks|responding)(?:\s|$)/);
  return match?.[1] || null;
}
function currentSetting(context, key) {
  const { lines, span, headerEnd, kind } = context;
  const found = [];
  let limit = headerEnd;
  if (kind === 'chat' && key === 'pace') {
    limit = span.end - 1;
    for (let i = span.start + 1; i < limit; i++)
      if (/^(?!\s*#|\s*@|\s*$).+:[ \t]+/.test(lines[i].text)) { limit = i; break; }
  }
  for (let i = span.start + 1; i < limit; i++) if (declaration(lines[i], kind) === key) found.push(i);
  return found;
}
function planSetting(source, selection, key, value) {
  const context = locateSettingContext(source, selection);
  if (context.error) return context;
  const { kind, span, lines } = context;
  if (!choices[kind].some(choice => choice.id === key)) return { error: `@${key} does not apply to this ${kind}.` };
  if (key === 'responding' && value === 'on' && !context.component.viewer)
    return { error: 'Header @responding needs an explicit @viewer to identify incoming messages.' };
  if (key === 'viewer' && value === null && currentSetting(context, 'responding').length)
    return { error: 'Remove header @responding before removing @viewer; it needs a viewing participant.' };
  if (value === null) {
    if (!defaults.has(key)) return { error: `@${key} is required and has no Default option.` };
  } else if (key === 'speed') {
    if (!/^[1-9][0-9]*$/.test(String(value)) || Number(value) < MIN_SPEED || Number(value) > MAX_SPEED)
      return { error: `@speed requires ${MIN_SPEED}–${MAX_SPEED} grapheme clusters per second.` };
  } else if (key === 'title' || key === 'viewer') {
    if (typeof value !== 'string' || !value.trim() || /[\r\n]/.test(value)) return { error: `${key} needs nonempty, single-line text.` };
  } else if (!values[key]?.includes(value)) return { error: `Unsupported @${key} value.` };
  const declarationLines = currentSetting(context, key);
  if (declarationLines.length > 1) return { error: `This ${kind} has duplicate ${key} declarations. Correct them directly before using settings.` };
  const eol = lines[span.start].eol || '\n';
  const authored = value === null ? '' : key === 'title' ? `# ${value.trim()}` : `@${key}${value === 'on' ? '' : ` ${value}`}`;
  let edits;
  if (declarationLines.length) {
    const record = lines[declarationLines[0]];
    edits = [{ start: record.start, end: record.end, text: authored ? authored + record.eol : '' }];
  } else if (authored) edits = [{ start: lines[span.start].end, end: lines[span.start].end, text: authored + eol }];
  else return { edits: [] };
  const changed = edits.reduce((text, edit) => text.slice(0, edit.start) + edit.text + text.slice(edit.end), source);
  const changedStructure = inspectStructure(changed);
  const newSpan = changedStructure.spans.find(item => item.type === 'fence' && item.level === 0 && item.info === kind &&
    changedStructure.lines[item.start].start === lines[span.start].start);
  const snippet = newSpan && changed.slice(changedStructure.lines[newSpan.start].start, changedStructure.lines[newSpan.end]?.start ?? changed.length);
  const parsed = snippet && parseScene(snippet);
  if (!parsed?.beats[0]?.blocks.some(block => block.type === kind) || parsed.diagnostics.length)
    return { error: `That setting would make this ${kind} invalid: ${parsed?.diagnostics[0] || 'check its header and required settings'}.` };
  return { edits };
}
module.exports = { choices, values, defaults, locateSettingContext, planSetting, currentSetting, DEFAULT_SPEED, MIN_SPEED, MAX_SPEED };
