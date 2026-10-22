'use strict';
const MarkdownIt = require('markdown-it');
const { graphemes } = require('./typeout.cjs');

// An inline rule sees the original source, so escaped brackets and code spans
// have already been claimed by Markdown's earlier escape/backtick rules.
function wikiLinks(md) {
  md.inline.ruler.before('link', 'story_wikilink', (state, silent) => {
    const start = state.pos;
    if (state.src.slice(start, start + 2) !== '[[' || state.src[start - 1] === '!') return false;
    const end = state.src.indexOf(']]', start + 2);
    if (end < 0 || /[\r\n]/.test(state.src.slice(start, end))) return false;
    const inside = state.src.slice(start + 2, end);
    const separator = inside.indexOf('|');
    const label = separator < 0 ? inside : inside.slice(separator + 1);
    if (!label) return false;
    if (!silent) state.push('text', '', 0).content = label;
    state.pos = end + 2;
    return true;
  });
}

const md = new MarkdownIt({ html: false, linkify: false, typographer: false });
wikiLinks(md);
md.renderer.rules.link_open = () => '<span class="link-text">';
md.renderer.rules.link_close = () => '</span>';
function segment(text, env) {
  const index = env.storySegments.length;
  env.storySegments.push(text);
  return `<span data-story-segment="${index}">${md.utils.escapeHtml(text)}</span>`;
}
md.renderer.rules.text = (tokens, index, _options, env) => segment(tokens[index].content, env);
md.renderer.rules.code_inline = (tokens, index, _options, env) => `<code>${segment(tokens[index].content, env)}</code>`;
md.renderer.rules.code_block = (tokens, index, _options, env) => `<pre><code>${segment(tokens[index].content, env)}</code></pre>\n`;
md.renderer.rules.fence = md.renderer.rules.code_block;
md.renderer.rules.image = (tokens, index, _options, env) => {
  const alt = md.renderer.renderInlineAsText(tokens[index].children || [], md.options, {});
  return `<span class="image-placeholder">${segment(`[Image omitted: ${alt || 'no alt text'}]`, env)}</span>`;
};
function renderAnnotation(source) {
  const env = { storySegments: [] };
  const html = md.render(source, env);
  return { html, segments: env.storySegments, count: env.storySegments.reduce((total, value) => total + graphemes(value).length, 0) };
}
module.exports = { wikiLinks, renderAnnotation };
