'use strict';
const MarkdownIt = require('markdown-it');
const md = new MarkdownIt({ html: false, linkify: false, typographer: false });
// The first slice is text-only: neither links nor images can trigger navigation/fetches.
md.renderer.rules.link_open = () => '<span class="link-text">';
md.renderer.rules.link_close = () => '</span>';
md.renderer.rules.image = (tokens, index) =>
  `<span class="image-alt">[Image: ${md.utils.escapeHtml(tokens[index].content)}]</span>`;

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
    const raw = lines.slice(first, end).join('\n').trim();
    const tokens = md.parse(raw, {});
    const blocks = [];
    let prose = [];
    const flush = () => {
      if (prose.length) blocks.push({ type: 'prose', html: md.renderer.render(prose, md.options, {}) });
      prose = [];
    };
    for (const token of tokens) {
      // Only top-level fences are components; quoted/list-nested fences remain Markdown.
      if (token.type === 'fence' && token.level === 0 && token.info.trim() === 'chat') {
        const messages = [];
        let invalid = false;
        for (const line of token.content.split('\n')) {
          if (!line.trim()) continue;
          const match = line.match(/^([^:\n]+):\s+(.+)$/);
          if (!match || !match[1].trim()) { invalid = true; break; }
          messages.push({ speaker: match[1].trim(), text: match[2] });
        }
        if (invalid || !messages.length) {
          diagnostics.push(`Line ${first + token.map[0] + 1}: chat needs one "Speaker: message" per nonblank line; showing the code block.`);
          prose.push(token);
        } else {
          flush();
          blocks.push({ type: 'chat', messages });
        }
      } else prose.push(token);
    }
    flush();
    return { raw, line: first + 1, blocks };
  }).filter(beat => beat.raw.length);
  return { frontmatter, beats, diagnostics };
}
module.exports = { parseScene };
