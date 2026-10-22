'use strict';
const { inspectStructure, contextAt } = require('./structure.cjs');
const { choices: settingChoices, values, DEFAULT_SPEED, MIN_SPEED, MAX_SPEED } = require('./settings.cjs');
const { choices: insertChoices } = require('./insert.cjs');

// The parser owns the syntax. This table only describes its existing authoring controls.
const settingText = (kind, name) => settingChoices[kind].find(choice => choice.id === name).description;
const insertText = name => insertChoices.find(choice => choice.id === name).description;
const help = Object.freeze({
  title: { scope: 'Chat header', detail: `${settingText('chat', 'title')} Use # Title for new chats; @title is also supported.` },
  viewer: { scope: 'Chat header', detail: `${settingText('chat', 'viewer')} Exact name; required for ticks and incoming responding cues.` },
  pace: { scope: 'Chat header before the first message', detail: `${settingText('chat', 'pace')} Normal (default), brisk (0.7×) or deliberate (1.3×); explicit delay and pause do not scale.` },
  ticks: { scope: 'Chat header', detail: `Bare flag. ${settingText('chat', 'ticks')} Off by default.` },
  responding: { scope: 'Chat header or between messages', detail: `Bare flag. ${settingText('chat', 'responding')} Header: throughout this chat. Between messages: next incoming message only. Adds no wait; needs @viewer.` },
  format: { scope: 'Type-out header', detail: `${settingText('typeout', 'format')} Required: yaml or annotation. Independent of sound.` },
  sound: { scope: 'Type-out header', detail: `${settingText('typeout', 'sound')} Choices: modem, keyboard, typewriter or none (default). Only during active reveal after a playback gesture.` },
  speed: { scope: 'Type-out header', detail: `${settingText('typeout', 'speed')} Default ${DEFAULT_SPEED}. Independent of chat pace.` },
  border: { scope: 'Type-out header', detail: `${settingText('typeout', 'border')} Omission retains the format’s existing border.` },
  fill: { scope: 'Type-out header', detail: `${settingText('typeout', 'fill')} Omission retains the format’s existing background.` },
  delay: { scope: 'Between components or between chat messages', detail: `${insertText('delay')} 0–60000ms. Before a chat, replaces its first message delay rather than adding another wait. Prose/image default entry delay is zero.` },
  pause: { scope: 'Between components or between chat messages', detail: `${insertText('pause')} 1–60000ms. A trailing pause holds beat completion.` }
});
const header = { chat: settingChoices.chat.map(choice => choice.id), typeout: settingChoices.typeout.map(choice => choice.id) };
const timing = ['delay', 'pause'];
const valueChoices = { pace: values.pace, format: values.format, sound: values.sound, border: values.border, fill: values.fill };
const numeric = { speed: { example: String(DEFAULT_SPEED), suffix: '', detail: help.speed.detail }, delay: { example: '1000', suffix: 'ms', detail: help.delay.detail }, pause: { example: '1000', suffix: 'ms', detail: help.pause.detail } };
function lineAt(structure, offset) {
  const line = Math.max(0, structure.lines.findLastIndex(record => record.start <= offset));
  return { line, record: structure.lines[line], column: Math.min(offset - structure.lines[line].start, structure.lines[line].text.length) };
}
function scopeAt(source, offset) {
  const structure = inspectStructure(source);
  const { line, record, column } = lineAt(structure, offset);
  if (!record || contextAt(structure, offset).kind === 'frontmatter') return null;
  const fence = structure.spans.find(span => span.type === 'fence' && line >= span.start && line < span.end);
  if (fence) {
    if (fence.level !== 0 || !['chat', 'typeout'].includes(fence.info) || line <= fence.start) return null;
    const close = structure.lines[fence.end - 1]?.text.trim();
    if (line === fence.end - 1 && close && close[0] === fence.token.markup[0] && close.length >= fence.token.markup.length) return null;
    if (fence.info === 'typeout') {
      for (let i = fence.start + 1; i < line; i++) if (!structure.lines[i].text.trim()) return null;
      const following = structure.lines.slice(line + 1, fence.end - 1);
      if (!following.some(record => !record.text.trim()) && following.some(record => record.text.trim() && !/^\s*@/.test(record.text))) return null;
      return { kind: 'typeout', structure, line, record, column, fence };
    }
    let events = false, messages = false;
    const declared = new Set();
    for (let i = fence.start + 1; i < line; i++) {
      const text = structure.lines[i].text.trim();
      if (/^(?:#\s+|@title\s+)/.test(text) && !events) declared.add('title');
      const match = text.match(/^@(viewer|pace|ticks|responding|delay|pause)\b/);
      if (match && (!events || (match[1] === 'pace' && !messages)) && header.chat.includes(match[1])) declared.add(match[1]);
      if (/^@pause\b/.test(text)) events = true;
      if (/^[^@#:\n][^:\n]*:[ \t]+/.test(text)) { events = true; messages = true; }
    }
    // A later declaration is still a duplicate, except while editing itself.
    let laterEvents = events, laterMessages = messages;
    for (let i = line + 1; i < fence.end - 1; i++) {
      const text = structure.lines[i].text.trim();
      if (/^(?:#\s+|@title\s+)/.test(text) && !laterEvents) declared.add('title');
      const match = text.match(/^@(viewer|pace|ticks|responding)\b/);
      if (match && (!laterEvents || (match[1] === 'pace' && !laterMessages))) declared.add(match[1]);
      if (/^@pause\b/.test(text) || /^[^@#:\n][^:\n]*:[ \t]+/.test(text)) laterEvents = true;
      if (/^[^@#:\n][^:\n]*:[ \t]+/.test(text)) laterMessages = true;
    }
    return { kind: 'chat', structure, line, record, column, fence, events, messages, declared };
  }
  if (contextAt(structure, offset).kind !== 'root') return null;
  const prefix = record.text.slice(0, column);
  if (!/^ {0,3}(?:@[A-Za-z-]*(?:[ \t]+[^\r\n]*)?|)$/.test(prefix) || !/^ {0,3}(?:@[A-Za-z-]*(?:[ \t]+[^\r\n]*)?|)$/.test(record.text)) return null;
  // A directive inside a continuing Markdown paragraph is prose, not control syntax.
  if (structure.tokens.some(token => token.type === 'paragraph_open' && token.map &&
    line > structure.start + token.map[0] && line < structure.start + token.map[1])) return null;
  return { kind: 'root', structure, line, record, column };
}
function permitted(scope) {
  if (scope.kind === 'root') return timing;
  if (scope.kind === 'typeout') return header.typeout;
  const names = [...timing, 'responding'];
  if (!scope.events) names.push('title', 'viewer', 'ticks');
  if (!scope.messages) names.push('pace');
  return names;
}
function declaredTypeout(scope) {
  const found = new Set();
  for (let i = scope.fence.start + 1; i < scope.fence.end - 1; i++) {
    if (i === scope.line) continue;
    const text = scope.structure.lines[i].text;
    if (!text.trim()) break;
    const match = text.trim().match(/^@(format|sound|speed|border|fill)\b/);
    if (match) found.add(match[1]);
  }
  return found;
}
function available(scope, current) {
  const declared = scope.kind === 'typeout' ? declaredTypeout(scope) : scope.declared || new Set();
  return permitted(scope).filter(name => name === current || timing.includes(name) ||
    (name === 'responding' && scope.kind === 'chat' && scope.events) || !declared.has(name));
}
function insertion(name, hasValue) {
  if (hasValue) return `@${name}`;
  if (valueChoices[name]) return `@${name} \${1:${valueChoices[name][0]}}`;
  if (numeric[name]) return `@${name} \${1:${numeric[name].example}}${numeric[name].suffix}`;
  if (name === 'viewer') return '@viewer ${1:Participant}';
  if (name === 'title') return '@title ${1:Conversation}';
  return `@${name}`;
}
function suggestionsAt(source, offset, manual = false) {
  const scope = scopeAt(source, offset);
  if (!scope) return [];
  const text = scope.record.text;
  const leading = text.match(/^ {0,3}/)[0].length;
  const before = text.slice(leading, scope.column);
  const directive = text.slice(leading).match(/^@([A-Za-z-]*)([ \t]+)?(.*)$/);
  if (!directive) {
    if (!manual || text.trim()) return [];
    return available(scope, null).map(name => ({ label: `@${name}`, name, start: scope.record.start + leading, end: scope.record.start + leading,
      snippet: insertion(name, false), detail: help[name].detail }));
  }
  const name = directive[1].toLowerCase();
  const nameEnd = leading + 1 + directive[1].length;
  const current = permitted(scope).includes(name) ? name : null;
  if (scope.column <= nameEnd && /^@[A-Za-z-]*$/.test(before)) {
    const hasValue = Boolean(directive[2] && directive[3].trim());
    return available(scope, current).filter(candidate => candidate.startsWith(name)).map(candidate => ({
      label: `@${candidate}`, name: candidate, start: scope.record.start + leading, end: scope.record.start + nameEnd,
      snippet: insertion(candidate, hasValue), detail: help[candidate].detail
    }));
  }
  if (!current || !directive[2] || !valueChoices[current] && !numeric[current]) return [];
  const valueStart = nameEnd + directive[2].length;
  if (scope.column < valueStart) return [];
  const remainder = text.slice(valueStart);
  const token = remainder.match(/^([^ \t]*)(.*)$/);
  const typed = text.slice(valueStart, scope.column).toLowerCase();
  if (!/^[A-Za-z0-9]*$/.test(typed)) return [];
  const end = scope.record.start + valueStart + token[1].length;
  if (valueChoices[current]) return valueChoices[current].filter(value => value.startsWith(typed)).map(value => ({
    label: value, name: current, start: scope.record.start + valueStart, end, snippet: value, detail: help[current].detail
  }));
  return [{ label: `${current} value`, name: current, start: scope.record.start + valueStart, end,
    snippet: `\${1:${numeric[current].example}}${numeric[current].suffix && !token[2].startsWith(numeric[current].suffix) ? numeric[current].suffix : ''}`,
    detail: numeric[current].detail }];
}
function hoverAt(source, offset) {
  const scope = scopeAt(source, offset);
  if (!scope) return null;
  const match = scope.record.text.match(/^ {0,3}@([a-z]+)\b/);
  if (!match || !permitted(scope).includes(match[1])) return null;
  const name = match[1];
  const start = scope.record.start + scope.record.text.indexOf('@');
  if (offset < start || offset > scope.record.start + scope.record.text.length) return null;
  const options = valueChoices[name] ? ` Values: ${valueChoices[name].join(', ')}.` : '';
  return { start, end: scope.record.start + scope.record.text.length,
    markdown: `**@${name}** — ${help[name].scope}. ${help[name].detail}${options}` };
}
module.exports = { scopeAt, suggestionsAt, hoverAt, help };
