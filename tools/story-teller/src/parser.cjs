'use strict';
const MarkdownIt = require('markdown-it');
const md = new MarkdownIt({ html: false, linkify: false, typographer: false });
// The first slice is text-only: neither links nor images can trigger navigation/fetches.
md.renderer.rules.link_open = () => '<span class="link-text">';
md.renderer.rules.link_close = () => '</span>';
md.renderer.rules.image = (tokens, index) =>
  `<span class="image-alt">[Image: ${md.utils.escapeHtml(tokens[index].content)}]</span>`;

// Top-level block rule, deliberately absent from paragraph-interruption rules.
// A line inside an existing paragraph, quote, list or code block stays literal.
md.block.ruler.before('paragraph', 'story_timing', (state, startLine, endLine, silent) => {
  if (state.level !== 0 || state.sCount[startLine] - state.blkIndent >= 4) return false;
  const line = state.src.slice(state.bMarks[startLine] + state.tShift[startLine], state.eMarks[startLine]);
  const match = line.match(/^@(delay|pause)\b(.*)$/);
  if (!match) return false;
  if (silent) return true;
  const token = state.push('story_timing', '', 0);
  token.map = [startLine, startLine + 1];
  token.meta = { name: match[1], ...timingValue(match[1], match[2].trim()) };
  state.line = startLine + 1;
  return true;
});
md.renderer.rules.story_timing = () => '';
function timingValue(name, value) {
  const time = value.match(/^(0|[1-9][0-9]*)ms$/);
  const amount = time ? Number(time[1]) : NaN;
  if (!Number.isInteger(amount) || amount > 60000 || (name === 'pause' && amount === 0)) {
    return { error: `@${name} expects integer milliseconds (${name === 'pause' ? '1' : '0'}–60000ms)` };
  }
  return { delayMs: amount };
}

function parseScene(source) {
  const lines = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n');
  const diagnostics = [];
  let frontmatter = null;
  let start = 0;
  if (lines[0] === '---') {
    const end = lines.findIndex((line, i) => i > 0 && /^(---|\.\.\.)\s*$/.test(line));
    if (end >= 0) {
      frontmatter = lines.slice(1, end).join('\n'); // Recognise, don't evaluate YAML.
      start = end + 1;
    } else {
      diagnostics.push('Unclosed initial frontmatter; shown as prose until it is closed.');
      // Prevent a half-authored frontmatter block silently swallowing the whole scene.
    }
  }
  const ranges = [];
  let from = start;
  let fence = null;
  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    if (fence) {
      const closing = line.match(/^ {0,3}(`+|~+)\s*$/);
      if (closing && closing[1][0] === fence.char && closing[1].length >= fence.length) fence = null;
      continue;
    }
    const opening = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (opening && !(opening[1][0] === '`' && opening[2].includes('`'))) {
      fence = { char: opening[1][0], length: opening[1].length };
    } else if (/^ {0,3}---\s*$/.test(line) && !(i === 0 && start === 0)) {
      ranges.push([from, i]);
      from = i + 1;
    }
  }
  ranges.push([from, lines.length]);
  const beats = ranges.map(([first, end]) => {
    const text = lines.slice(first, end).join('\n');
    const raw = text.trim();
    const tokens = md.parse(text, {});
    const blocks = [];
    const sequence = []; // Timing metadata and references; prose/chat remain the only components.
    let pendingDelay = null;
    const diagnostic = (line, message) => diagnostics.push(`Line ${line}: ${message}`);
    const add = block => {
      if (pendingDelay) {
        if (block.type === 'chat') {
          if (block.messages[0].delayMs !== undefined) diagnostic(block.line, `multiple @delay overrides target the first chat message (outside override at line ${pendingDelay.line}); first override retained`);
          block.messages[0].delayMs = pendingDelay.delayMs;
        } else block.delayMs = pendingDelay.delayMs;
        pendingDelay = null;
      }
      sequence.push({ type: 'component', blockIndex: blocks.length });
      blocks.push(block);
    };
    let prose = [];
    const flush = () => {
      if (prose.length) add({ type: 'prose', html: md.renderer.render(prose, md.options, {}) });
      prose = [];
    };
    for (const token of tokens) {
      // Only top-level fences are components; quoted/list-nested fences remain Markdown.
      if (token.type === 'story_timing') {
        flush();
        const line = first + token.map[0] + 1;
        const { name, delayMs, error } = token.meta;
        if (error) diagnostic(line, error);
        else if (name === 'pause') sequence.push({ type: 'pause', delayMs });
        else if (pendingDelay) diagnostic(line, `multiple @delay overrides target the same component (first at line ${pendingDelay.line}); first override retained`);
        else pendingDelay = { delayMs, line };
      } else if (token.type === 'fence' && token.level === 0 && token.info.trim() === 'chat') {
        const messages = [];
        const events = [];
        let delayMs;
        let responding = false;
        let title = null;
        let viewer = null;
        let ticks = false;
        let invalid = null;
        let invalidLine = first + token.map[0] + 1;
        const seen = new Set();
        const chatLines = token.content.split('\n');
        for (let i = 0; i < chatLines.length; i++) {
          const line = chatLines[i];
          if (!line.trim()) continue;
          invalidLine = first + token.map[0] + i + 2;
          const titleHeader = line.trim().match(/^@title(?:\s+(.*))?$/);
          if (titleHeader) {
            if (events.length || seen.has('title')) { invalid = '@title must appear once, before messages/pauses'; break; }
            if (!titleHeader[1]?.trim()) { invalid = '@title needs a nonempty title'; break; }
            title = titleHeader[1].trim(); seen.add('title'); continue;
          }
          const match = line.match(/^([^:\n]+):\s+(.+)$/);
          if (match && match[1].trim()) {
            const message = { speaker: match[1].trim(), text: match[2] };
            if (delayMs !== undefined) message.delayMs = delayMs;
            if (responding) message.responding = true;
            responding = false;
            delayMs = undefined;
            messages.push(message);
            events.push({ type: 'message', message: messages.length - 1 });
            continue;
          }
          if (line.trim() === '@responding') {
            if (responding) { invalid = '@responding already waiting for a message'; break; }
            responding = true;
            continue;
          }
          if (line.trim() === '@ticks') {
            if (events.length || seen.has('ticks')) { invalid = '@ticks must appear once, before messages/pauses'; break; }
            ticks = true; seen.add('ticks'); continue;
          }
          const directive = line.trim().match(/^@(delay|pause|viewer|ticks)\s+(.+)$/);
          if (!directive) { invalid = `invalid chat line or directive "${line}"`; break; }
          const [, name, value] = directive;
          if (name === 'viewer' || name === 'ticks') {
            if (events.length || seen.has(name)) { invalid = `@${name} must appear once, before messages/pauses`; break; }
            seen.add(name);
            if (name === 'viewer') viewer = value.trim();
            else if (value === 'on' || value === 'off') ticks = value === 'on';
            else { invalid = 'use @ticks to enable ticks, or omit it to disable them'; break; }
          } else {
            const timing = timingValue(name, value);
            if (timing.error) { invalid = timing.error; break; }
            const amount = timing.delayMs;
            if (name === 'pause') events.push({ type: 'pause', delayMs: amount });
            else if (delayMs !== undefined) { invalid = '@delay already waiting for a message'; break; }
            else delayMs = amount;
          }
        }
        if (responding && !invalid) invalid = '@responding needs a following message';
        if (delayMs !== undefined && !invalid) invalid = '@delay needs a following message';
        if (ticks && (!viewer || !messages.some(m => m.speaker === viewer)) && !invalid) invalid = '@ticks needs @viewer matching a speaker';
        if (invalid || !messages.length) {
          diagnostics.push(`Line ${invalidLine}: ${invalid || 'chat needs at least one Speaker: message line'}; showing dialogue as code without executing the chat.`);
          // Keep dialogue readable on error, without printing authoring controls.
          const content = token.content.split('\n').filter(line => !/^\s*@/.test(line) || /^([^:\n]+):\s+(.+)$/.test(line)).join('\n');
          token.content = content;
          prose.push(token);
        } else {
          flush();
          add({ type: 'chat', messages, events, title, viewer, ticks, line: first + token.map[0] + 1 });
        }
      } else prose.push(token);
    }
    flush();
    if (pendingDelay) diagnostic(pendingDelay.line, '@delay needs a following prose or chat component in this beat');
    return { raw, line: first + 1, blocks, sequence };
  }).filter(beat => beat.raw.length);
  return { frontmatter, beats, diagnostics };
}
module.exports = { parseScene };
