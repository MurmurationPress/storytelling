'use strict';
const { PACE_MULTIPLIERS } = require('./pace.cjs');
const { DEFAULT_SPEED, MIN_SPEED, MAX_SPEED, FORMATS, SOUNDS, BORDERS, FILLS } = require('./typeout.cjs');
const { inspectStructure, beatRanges } = require('./structure.cjs');
const { renderAnnotation } = require('./annotation.cjs');
const { visibleWords, proseInterval } = require('./prose-pacing.cjs');
const { createMarkdown, references, renderChat, inlineText } = require('./markdown.cjs');
const md = createMarkdown();
// Image URLs are inert data here; only the VS Code host may resolve local files.
md.renderer.rules.link_open = () => '<span class="link-text">';
md.renderer.rules.link_close = () => '</span>';
const imageAlt = token => inlineText(md, token.children);
md.renderer.rules.image = (tokens, index) => {
  const token = tokens[index];
  return `<img class="story-inline-image" data-story-src="${md.utils.escapeHtml(token.attrGet('src') || '')}" alt="${md.utils.escapeHtml(imageAlt(token))}">`;
};
const standaloneImage = (tokens, index) => {
  if (tokens[index]?.type !== 'paragraph_open' || tokens[index + 1]?.type !== 'inline' || tokens[index + 2]?.type !== 'paragraph_close') return null;
  const children = tokens[index + 1].children || [];
  return children.length === 1 && children[0].type === 'image' ? children[0] : null;
};
const captionAfter = (tokens, index) => {
  if (tokens[index]?.type !== 'paragraph_open' || tokens[index + 1]?.type !== 'inline' || tokens[index + 2]?.type !== 'paragraph_close') return null;
  const children = tokens[index + 1].children || [];
  return children[0]?.type === 'em_open' && children.at(-1)?.type === 'em_close' && children.slice(1,-1).every(child => ['text','story_wikilink'].includes(child.type))
    ? children.slice(1,-1).map(child => child.content).join('').match(/^Caption: (.+)$/)?.[1] || null : null;
};

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

function parseScene(source, { prosePacing = false } = {}) {
  const structure = inspectStructure(source);
  const lines = structure.lines.map((line, i) => i === 0 ? line.text.replace(/^\uFEFF/, '') : line.text);
  const diagnostics = [];
  const images = new Set();
  const wikiReferences = [];
  const imageLines = Object.create(null);
  const { start } = structure;
  const frontmatter = structure.frontmatter?.closed ? lines.slice(1, structure.frontmatter.end - 1).join('\n') : null;
  if (structure.frontmatter && !structure.frontmatter.closed) diagnostics.push('Unclosed initial frontmatter; shown as prose until it is closed.');
  const ranges = beatRanges(structure);
  const beats = ranges.map(range => {
    const first = range.bodyLine;
    const end = range.endLine;
    const bodyLines = lines.slice(first, end);
    const raw = bodyLines.join('\n').trim();
    if (range.titleLine !== null) bodyLines[range.titleLine - first] = '';
    const text = bodyLines.join('\n');
    const tokens = md.parse(text, {});
    const blocks = [];
    const sequence = []; // Timing metadata and references in source order.
    let pendingDelay = null;
    const diagnostic = (line, message) => diagnostics.push(`Line ${line}: ${message}`);
    const add = block => {
      if (pendingDelay) {
        if (prosePacing && blocks.at(-1)?.pacedParagraph) block.boundaryDelayMs = pendingDelay.delayMs;
        else if (block.type === 'chat') {
          if (block.messages[0].delayMs !== undefined) diagnostic(block.line, `multiple @delay overrides target the first chat message (outside override at line ${pendingDelay.line}); first override retained`);
          block.messages[0].delayMs = pendingDelay.delayMs;
        } else block.delayMs = pendingDelay.delayMs;
        pendingDelay = null;
      }
      sequence.push({ type: 'component', blockIndex: blocks.length });
      blocks.push(block);
    };
    let prose = [];
    const flush = (pacedParagraph = false) => {
      if (prose.length) {
        wikiReferences.push(...references(prose, first + 1));
        add({ type: 'prose', html: md.renderer.render(prose, md.options, {}),
        ...(pacedParagraph ? { pacedParagraph: true, proseIntervalMs: proseInterval(visibleWords(prose.find(t => t.type === 'inline'))) } : {}) });
      }
      prose = [];
    };
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      for (const child of token.children || []) if (child.type === 'image') {
        const src = child.attrGet('src') || '';
        images.add(src);
        imageLines[src] ??= first + (token.map?.[0] || 0) + 1;
      }
      const image = standaloneImage(tokens, i);
      if (image && token.level === 0) {
        images.add(image.attrGet('src') || '');
        imageLines[image.attrGet('src') || ''] ??= first + token.map[0] + 1;
        flush();
        const captionIndex = i + 3;
        const caption = tokens[captionIndex]?.map?.[0] > token.map[1] ? captionAfter(tokens, captionIndex) : null;
        add({ type: 'image', src: image.attrGet('src') || '', alt: imageAlt(image), caption,
          line: first + token.map[0] + 1, captionLine: caption === null ? null : first + tokens[captionIndex].map[0] + 1 });
        i += caption === null ? 2 : 5;
        continue;
      }
      // Only top-level fences are components; quoted/list-nested fences remain Markdown.
      if (token.type === 'story_timing') {
        flush();
        const line = first + token.map[0] + 1;
        const { name, delayMs, error } = token.meta;
        if (error) diagnostic(line, error);
        else if (name === 'pause') sequence.push({ type: 'pause', delayMs });
        else if (pendingDelay) diagnostic(line, `multiple @delay overrides target the same component (first at line ${pendingDelay.line}); first override retained`);
        else pendingDelay = { delayMs, line };
      } else if (token.type === 'fence' && token.level === 0 && token.info.trim() === 'typeout') {
        const openLine = first + token.map[0];
        const contentLines = token.content.split('\n');
        const separator = contentLines.findIndex(line => !line.trim());
        const settings = { format: null, sound: 'none', speed: DEFAULT_SPEED, border: null, fill: null };
        const seen = new Set();
        let error = null;
        let errorLine = openLine + 1;
        if (separator < 0) error = 'typeout needs a blank line between its header and literal body';
        else for (let header = 0; header < separator; header++) {
          const line = contentLines[header].trim();
          errorLine = openLine + header + 2;
          const setting = line.match(/^@(format|sound|speed|border|fill)\s+(.+)$/);
          if (!setting) { error = 'typeout header accepts only @format, @sound, @speed, @border and @fill before the blank line'; break; }
          const [, name, value] = setting;
          if (seen.has(name)) { error = `duplicate @${name} in typeout header`; break; }
          seen.add(name);
          if (name === 'format' && !FORMATS.includes(value)) error = '@format requires yaml or annotation';
          else if (name === 'sound' && !SOUNDS.includes(value)) error = '@sound requires modem, keyboard, typewriter or none';
          else if (name === 'speed' && (!/^[1-9][0-9]*$/.test(value) || Number(value) < MIN_SPEED || Number(value) > MAX_SPEED)) error = `@speed requires ${MIN_SPEED}–${MAX_SPEED} graphemes per second`;
          else if (name === 'border' && !BORDERS.includes(value)) error = '@border requires none or grey';
          else if (name === 'fill' && !FILLS.includes(value)) error = '@fill requires none, grey or yellow';
          if (error) break;
          settings[name] = name === 'speed' ? Number(value) : value;
        }
        if (!error && !seen.has('format')) { error = 'typeout needs @format yaml or @format annotation'; errorLine = openLine + 1; }
        const lastLine = first + token.map[1] - 1;
        const closing = /^(?: {0,3})(`+|~+)\s*$/.test(structure.lines[lastLine]?.text || '') &&
          structure.lines[lastLine].text.trim()[0] === token.markup[0] && structure.lines[lastLine].text.trim().length >= token.markup.length;
        const bodyStartLine = openLine + 2 + separator;
        const bodyStart = structure.lines[bodyStartLine]?.start ?? source.length;
        const bodyEnd = closing ? structure.lines[lastLine].start : source.length;
        const body = separator < 0 ? '' : source.slice(bodyStart, bodyEnd);
        if (!error && !body.trim()) { error = 'typeout needs literal body text after its blank header separator'; errorLine = bodyStartLine + 1; }
        if (error) {
          diagnostic(errorLine, `${error}; showing the fence as readable code.`);
          prose.push(token);
        } else {
          flush();
          const annotation = settings.format === 'annotation' ? renderAnnotation(body) : null;
          if (annotation) wikiReferences.push(...annotation.references.map(ref => ({ ...ref, line: ref.line + bodyStartLine })));
          add({ type: 'typeout', ...settings, text: body, ...(annotation ? { annotation } : {}), line: openLine + 1 });
        }
      } else if (token.type === 'fence' && token.level === 0 && token.info.trim() === 'chat') {
        const messages = [];
        const messageLines = [];
        const events = [];
        let delayMs;
        let responding = false;
        let respondingForChat = false;
        let canContinue = false;
        let title = null;
        let viewer = null;
        let ticks = false;
        let pace = 'normal';
        let invalid = null;
        let invalidLine = first + token.map[0] + 1;
        const seen = new Set();
        const chatLines = token.content.split('\n');
        for (let i = 0; i < chatLines.length; i++) {
          const line = chatLines[i];
          invalidLine = first + token.map[0] + i + 2;
          const continuation = line.match(/^ {2}\|(?: (.*))?$/);
          if (continuation) {
            if (!canContinue) { invalid = 'message continuation needs an immediately preceding message'; break; }
            messages[messages.length - 1].text += '\n' + (continuation[1] ?? '');
            continue;
          }
          if (!line.trim()) continue;
          canContinue = false;
          const titleHeader = line.trim().match(/^(?:@title(?:\s+(.*))?|#(?:\s+(.*))?)$/);
          if (titleHeader) {
            if (events.length || seen.has('title')) { invalid = '@title must appear once, before messages/pauses'; break; }
            if (!(titleHeader[1] ?? titleHeader[2])?.trim()) { invalid = '@title needs a nonempty title'; break; }
            title = (titleHeader[1] ?? titleHeader[2]).trim(); seen.add('title'); continue;
          }
          const match = line.match(/^([^:\n]+):[ \t]+(.*)$/);
          if (match && match[1].trim()) {
            const message = { speaker: match[1].trim(), text: match[2] };
            if (delayMs !== undefined) message.delayMs = delayMs;
            if (responding || respondingForChat) message.responding = true;
            responding = false;
            delayMs = undefined;
            messages.push(message); messageLines.push(invalidLine);
            canContinue = true;
            events.push({ type: 'message', message: messages.length - 1 });
            continue;
          }
          if (line.trim() === '@responding') {
            if (!events.length) {
              if (seen.has('responding')) { invalid = '@responding header must appear once'; break; }
              respondingForChat = true; seen.add('responding'); continue;
            }
            if (responding) { invalid = '@responding already waiting for a message'; break; }
            responding = true;
            continue;
          }
          if (/^@pace(?:\s|$)/.test(line.trim())) {
            const value = line.trim().slice(5).trim();
            if (messages.length) { invalid = '@pace must appear before the first message'; break; }
            if (seen.has('pace')) { invalid = '@pace must appear only once'; break; }
            if (!Object.hasOwn(PACE_MULTIPLIERS, value)) { invalid = '@pace requires normal, brisk or deliberate'; break; }
            pace = value; seen.add('pace'); continue;
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
          for (const [index, message] of messages.entries()) {
            const rendered = renderChat(message.text);
            if (rendered.references.length) { message.html = rendered.html; message.timingText = rendered.visibleText; }
            wikiReferences.push(...rendered.references.map(ref => ({ ...ref, line: ref.line + messageLines[index] - 1 })));
          }
          add({ type: 'chat', messages, events, title, viewer, ticks, pace, line: first + token.map[0] + 1 });
        }
      } else {
        if (prosePacing && token.type === 'paragraph_open' && token.level === 0) flush();
        prose.push(token);
        if (prosePacing && token.type === 'paragraph_close' && token.level === 0) flush(true);
      }
    }
    flush();
    if (pendingDelay) diagnostic(pendingDelay.line, '@delay needs a following prose, image, chat or typeout component in this beat');
    return { raw, line: first + 1, title: range.title, sourceRange: range, blocks, sequence };
  });
  return { frontmatter, beats, diagnostics, images: [...images], imageLines, wikiReferences: wikiReferences.sort((a,b)=>a.line-b.line) };
}
module.exports = { parseScene };
