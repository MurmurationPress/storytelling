'use strict';
// Pure, conservative manuscript adaptation. No editor/file/network access.
const { inspectStructure } = require('./structure.cjs');
const { renderChat } = require('./markdown.cjs');
const { parseScene } = require('./parser.cjs');
function escaped(text, at) {
  let count = 0;
  while (at > 0 && text[--at] === '\\') count++;
  return count % 2 === 1;
}
function decodeDelimiters(text) {
  // Delimiter escapes belong to the wrapper, not to authored wikilink content.
  let output = '';
  for (let at = 0; at < text.length; at++) {
    if (text.slice(at, at + 2) === '[[' && !escaped(text, at)) {
      const end = text.indexOf(']]', at + 2);
      if (end >= 0 && renderChat(text.slice(at, end + 2)).references.length) {
        output += text.slice(at, end + 2); at = end + 1; continue;
      }
    }
    if (text[at] === '|' && escaped(text, at)) output = output.slice(0, -1);
    output += text[at];
  }
  return output;
}
function identityRemainder(text) {
  // Only recognised explicit links may carry bracket syntax in identities.
  return renderChat(text).visibleText;
}

function legacyBody(body) {
  const output = [];
  let previous = null;
  let title = false;
  let viewer = false;
  let messages = 0;
  const fail = message => { throw new Error(message); };
  const controls = text => {
    for (const raw of text.split('\n')) {
      const line = raw.trim();
      if (!line) continue;
      if (/^#\s+\S/.test(line)) {
        if (messages || title) fail('multiple or interleaved channel comments cannot safely become one title');
        title = true; output.push(line); continue;
      }
      if (/^>\s+\S/.test(line)) {
        if (messages || viewer || line.includes(',')) fail('multiple/changing right-aligned participants need review');
        const name = line.replace(/^>\s+/, '');
        if (/[\[\]*`^<>]/.test(identityRemainder(name))) fail('formatted viewer identity needs review');
        viewer = true; output.push(`@viewer ${name}`); continue;
      }
      if (/^@title\s+\S/.test(line)) {
        if (messages || title) fail('duplicate or late title');
        title = true; output.push(`# ${line.slice(7)}`); continue;
      }
      if (/^@viewer\s+\S/.test(line)) {
        if (messages || viewer) fail('duplicate or late viewer');
        viewer = true; output.push(line); continue;
      }
      // Only explicit existing Story Teller settings are carried over. No inferred timing/ticks.
      if (/^@(ticks|responding)$/.test(line) || /^@(delay|pause)\s+\S+$/.test(line)) { output.push(line); continue; }
      fail('unsupported control/comment, divider or prose inside the chat container');
    }
  };
  let at = 0;
  for (;;) {
    let start = at;
    while ((start = body.indexOf('{{', start)) >= 0 && escaped(body, start)) start += 2;
    if (start < 0) { controls(body.slice(at)); break; }
    controls(body.slice(at, start));
    // Require wrappers to occupy their own lines; never guess at inline prose/wrappers.
    if (body.slice(body.lastIndexOf('\n', start - 1) + 1, start).trim()) fail('inline message wrapper needs review');
    let end = start + 2;
    while ((end = body.indexOf('}}', end)) >= 0 && escaped(body, end)) end += 2;
    if (end < 0) fail('unclosed message wrapper');
    const tail = body.indexOf('\n', end + 2);
    if (body.slice(end + 2, tail < 0 ? body.length : tail).trim()) fail('text after message wrapper needs review');
    const raw = body.slice(start + 2, end);
    if (raw.includes('{{')) fail('nested message wrapper needs review');
    const pipes = [];
    for (let i = 0; i < raw.length; i++) {
      if (raw.slice(i, i + 2) === '[[' && !escaped(raw, i)) {
        const end = raw.indexOf(']]', i + 2);
        if (end < 0 || !renderChat(raw.slice(i, end + 2)).references.length) fail('malformed wikilink needs review');
        i = end + 1; continue;
      }
      if (raw[i] === '|' && !escaped(raw, i)) pipes.push(i);
    }
    // Retain the existing literal continuation prefix between the first/last
    // fields. Other extra unescaped pipes cannot be assigned losslessly.
    if (pipes.slice(1, -1).some(at => {
      const lineStart = raw.lastIndexOf('\n', at - 1);
      return lineStart < 0 || raw.slice(lineStart + 1, at) !== '  ';
    })) fail('ambiguous message-field delimiters need review');
    if (!pipes.length) fail('message lacks a speaker/body delimiter');
    const last = pipes.at(-1);
    const subtext = pipes.length >= 2 ? decodeDelimiters(raw.slice(last + 1)) : null;
    const header = decodeDelimiters(raw.slice(0, pipes[0])).trim();
    const speaker = header || previous;
    if (!speaker || /[:\r\n\[\]*`<>^]/.test(identityRemainder(speaker))) fail('unresolved, formatted or unrepresentable speaker identity');
    // Preserve actual text/line breaks, decoding only the manuscript delimiter escape.
    const message = decodeDelimiters(raw.slice(pipes[0] + 1, pipes.length >= 2 ? last : raw.length));
    if (/!\[/.test(message)) fail('embedded artwork requires editorial review; assets are not converted');
    if (message.includes('\r')) fail('mixed message line endings need review');
    const parts = message.split('\n');
    output.push(`${speaker}: ${parts[0]}`, ...parts.slice(1).map(line => `  | ${line}`));
    if(subtext?.length)output.push('@subtext',...subtext.split('\n').map(line=>`  | ${line}`));
    previous = speaker; messages++; at = end + 2;
  }
  if (!messages) fail('no complete manuscript messages');
  return output;
}
function convertChats(source) {
  const structure = inspectStructure(source);
  const records = structure.lines;
  const warnings = [];
  const changes = [];
  const first = structure.start;
  if (structure.frontmatter && !structure.frontmatter.closed) return { text: source, count: 0, changes, warnings: [{ line: 1, message: 'unclosed frontmatter; document left unchanged' }] };
  for (const token of structure.tokens) {
    if (token.type !== 'fence' || token.level !== 0 || !/^chat(?:-old(?:-old)?)?$/.test(token.info.trim().split(/\s+/)[0])) continue;
    const start = first + token.map[0];
    const stop = first + token.map[1] - 1;
    const warn = message => warnings.push({ line: start + 1, message });
    const close = records[stop]?.text.match(/^ {0,3}(`+|~+)\s*$/);
    if (!close || close[1][0] !== token.markup[0] || close[1].length < token.markup.length || stop === start) { warn('unclosed chat fence left unchanged'); continue; }
    if (token.info.trim() !== 'chat') { warn(token.info.trim().startsWith('chat ') ? 'unknown chat fence options need review' : 'historical chat-old format not converted by this slice'); continue; }
    const opening = records[start].text;
    const closing = records[stop].text;
    // Current valid Story Teller chats must remain byte-for-byte identical.
    const existing = parseScene(`${opening.trimStart()}\n${token.content}${closing.trimStart()}`);
    if (!/^\s*\{\{/m.test(token.content) && !existing.diagnostics.length && existing.beats[0]?.blocks[0]?.type === 'chat') continue;
    if (!token.content.includes('{{')) { warn('unrecognised chat syntax left unchanged'); continue; }
    try {
      const lines = legacyBody(token.content);
      const converted = parseScene(`\`\`\`chat\n${lines.join('\n')}\n\`\`\``);
      if (converted.diagnostics.length || converted.beats[0]?.blocks[0]?.type !== 'chat') throw new Error(`settings/continuations need review: ${converted.diagnostics.join('; ')}`);
      const indent = opening.match(/^ */)[0];
      const eol = records[start].eol || '\n';
      changes.push({ start: records[start].end, end: records[stop].start, text: lines.map(line => indent + line + eol).join(''), line: start + 1 });
    } catch (error) { warn(error.message); }
  }
  let text = source;
  for (const change of [...changes].reverse()) text = text.slice(0, change.start) + change.text + text.slice(change.end);
  return { text, count: changes.length, changes, warnings };
}
module.exports = { convertChats };
