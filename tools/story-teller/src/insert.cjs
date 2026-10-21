'use strict';
const { inspectStructure, contextAt } = require('./structure.cjs');
const { parseScene } = require('./parser.cjs');
const choices = [
  { id: 'chat', label: 'Chat block', description: 'Title, viewer and two messages; optional features off.' },
  { id: 'boundary', label: 'Beat boundary', description: 'A standalone ---; progression stays manual.' },
  { id: 'delay', label: 'Delay', description: 'Replace the next item’s normal delay.' },
  { id: 'pause', label: 'Pause', description: 'Add silence; the next item keeps its normal delay.' },
  { id: 'responding', label: 'Responding', description: 'Non-viewer cue during message delays; chat only.' },
  { id: 'pace', label: 'Pace', description: 'Chat automatic timing: Normal, Brisk or Deliberate.' },
  { id: 'ticks', label: 'Ticks', description: 'Authored outgoing delivered/read marks; chat header only.' },
  { id: 'wrap', label: 'Wrap Selection as Chat', description: 'Keep selected text verbatim; does not convert its syntax.' }
];
const templates = {
  chat: '```chat\n# ${1:Conversation title}\n@viewer ${2:Viewer}\n${2}: ${3:First message.}\n${4:Other participant}: ${5:Reply.}\n```\n$0',
  boundary: '---\n$0', delay: '@delay ${1:1200}ms\n$0', pause: '@pause ${1:800}ms\n$0', responding: '@responding\n$0', ticks: '@ticks\n$0'
};
function planInsertion(source, selection, kind) {
  const { start, end } = selection;
  const fail = error => ({ error });
  if (!(kind in templates) && kind !== 'wrap') return fail('Unknown insertion.');
  if (start < 0 || end < start || end > source.length) return fail('Invalid selection.');
  if (start !== end && kind !== 'wrap') return fail('Selected text was not changed. Use Wrap Selection as Chat explicitly, or clear the selection.');
  const structure = inspectStructure(source);
  const context = contextAt(structure, start);
  if (context.kind === 'frontmatter' || (structure.frontmatter && !structure.frontmatter.closed)) return fail('Move outside YAML frontmatter before inserting story syntax.');
  const overlaps = kind === 'wrap' ? structure.spans.filter(span => structure.lines[span.start].start < end && (structure.lines[span.end]?.start ?? source.length) > start) : [];
  const fullContainers = overlaps.length && overlaps.every(span => ['blockquote_open', 'bullet_list_open', 'ordered_list_open'].includes(span.type) && start <= structure.lines[span.start].start && end >= structure.lines[span.end - 1].start + structure.lines[span.end - 1].text.length);
  if (context.kind === 'literal' && !(kind === 'wrap' && fullContainers)) return fail('Move outside code examples, fence delimiters, quotes or lists before inserting story syntax.');
  if (context.kind === 'chat' && ['chat', 'boundary', 'wrap'].includes(kind)) return fail('This is already inside a chat. Nested chat fences and beat boundaries are not inserted.');
  if (context.kind !== 'chat' && ['responding', 'ticks'].includes(kind)) return fail(`@${kind} is chat-only. Place the caret inside a chat fence.`);
  const eol = structure.lines.find(l => l.eol)?.eol || '\n';
  const before = source.slice(0, start);
  const after = source.slice(kind === 'wrap' ? end : start);
  // Root-level metadata must start a new Markdown block; no source text is removed.
  const padding = (left, right, insideChat = false) => ({
    prefix: left.length ? (left.endsWith(eol + eol) ? '' : left.endsWith(eol) ? (insideChat ? '' : eol) : (insideChat ? eol : eol + eol)) : '',
    suffix: right.length ? (right.startsWith(eol) ? '' : eol) : ''
  });
  if (kind === 'wrap') {
    if (start === end) return fail('Select the content to wrap first.');
    if (overlaps.length && !fullContainers) return fail('The selection includes a fence or only part of a quote/list. Select complete content without fences; existing chat fences must not be nested.');
    if (structure.boundaries.some(i => structure.lines[i].start >= start && structure.lines[i].start < end)) return fail('The selection crosses a beat boundary. Wrap content within one beat.');
    const selected = source.slice(start, end);
    const { prefix, suffix } = padding(before, after);
    return { wrap: true, prefix: prefix + '```chat' + eol, suffix: (selected.endsWith(eol) ? '' : eol) + '```' + eol + suffix };
  }
  if (kind === 'boundary' && !parseScene(before).beats.length) return fail('Add story content before the first beat boundary; an opening --- is reserved for frontmatter.');
  if (context.kind === 'chat') {
    const record = structure.lines[context.line];
    if (/^ {2}\|/.test(record.text) && (start < record.start + record.text.length || /^ {2}\|/.test(structure.lines[context.line + 1]?.text || ''))) return fail('Choose a line between messages, not inside message continuations.');
    if (source.slice(record.start, start).trim() && source.slice(start, record.start + record.text.length).trim()) return fail('Place the caret on a blank chat line or at a line boundary, not inside a message.');
    const body = source.slice(structure.lines[context.span.start].end, structure.lines[context.span.end - 1]?.start ?? source.length);
    if (['ticks', 'responding'].includes(kind) && !/^[ \t]*@viewer[ \t]+\S/m.test(body)) return fail('Add an explicit @viewer Name header before enabling chat flags.');
    if (kind === 'responding') {
      const preceding = source.slice(structure.lines[context.span.start].end, start);
      const inHeader = !/^(?!\s*#|\s*@|\s*$).+:[ \t]+|^\s*@pause\b/m.test(preceding);
      if (inHeader && body.split(/^(?!\s*#|\s*@|\s*$).+:[ \t]+|^\s*@pause\b/m)[0].split('\n').some(line => line.trim() === '@responding')) return fail('The chat header already enables @responding.');
    }
    if (kind === 'ticks') {
      if (/^\s*@ticks(?:\s|$)/m.test(body)) return fail('This chat already has a ticks setting.');
      const chat = parseScene(source.slice(structure.lines[context.span.start].start, structure.lines[context.span.end]?.start ?? source.length)).beats.flatMap(beat => beat.blocks).find(block => block.type === 'chat');
      if (!chat?.messages.some(message => message.speaker === chat.viewer)) return fail('@ticks needs @viewer matching a speaker. Convert or fix the chat first.');
      const header = source.slice(structure.lines[context.span.start].end, start);
      if (/^(?!\s*#|\s*@|\s*$).+:[ \t]+|^\s*@pause\b|^\s*@ticks\b/m.test(header)) return fail('Place @ticks once in the chat header, before messages and pauses.');
    }
  }
  const { prefix, suffix } = padding(before, after, context.kind === 'chat');
  return { snippet: prefix + templates[kind].replace(/\n/g, eol) + suffix };
}
function planPace(source, selection, value) {
  const { PACE_MULTIPLIERS } = require('./pace.cjs');
  if (!Object.hasOwn(PACE_MULTIPLIERS, value)) return { error: 'Unknown chat pace.' };
  if (selection.start < 0 || selection.end < selection.start || selection.end > source.length) return { error: 'Invalid selection.' };
  const structure = inspectStructure(source);
  const context = contextAt(structure, selection.start);
  if (context.kind !== 'chat' || contextAt(structure, selection.end).span !== context.span)
    return { error: 'Pace is chat-only. Place the caret inside the chat you want to change first.' };
  const { lines } = structure;
  const eol = lines[context.span.start].eol || '\n';
  const declarations = [];
  for (let i = context.span.start + 1; i < context.span.end; i++) {
    if (/^\s*@pace(?:\s|$)/.test(lines[i].text)) declarations.push(i);
  }
  // Canonicalise configuration at the opening of this chat, without touching messages.
  const edits = declarations.map(i => ({ start: lines[i].start, end: lines[i].end, text: '' }));
  const start = lines[context.span.start].end;
  const first = edits.find(edit => edit.start === start);
  if (first) first.text = `@pace ${value}${eol}`;
  else edits.push({ start, end: start, text: `@pace ${value}${eol}` });
  return { edits };
}
module.exports = { choices, planInsertion, planPace };
