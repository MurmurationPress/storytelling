'use strict';
const { graphemes } = require('./typeout.cjs');

const { wikiLinks, createMarkdown, references, inlineText } = require('./markdown.cjs');
const md = createMarkdown();
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
  const alt = inlineText(md, tokens[index].children);
  return `<span class="image-placeholder">${segment(`[Image omitted: ${alt || 'no alt text'}]`, env)}</span>`;
};
md.renderer.rules.story_wikilink = (tokens, index, _options, env) => `<span data-story-target="${md.utils.escapeHtml(tokens[index].meta.target)}">${segment(tokens[index].content, env)}</span>`;
function renderAnnotation(source) {
  const env = { storySegments: [] };
  const tokens = md.parse(source, env);
  const html = md.renderer.render(tokens, md.options, env);
  return { html, references: references(tokens), segments: env.storySegments, count: env.storySegments.reduce((total, value) => total + graphemes(value).length, 0) };
}
module.exports = { wikiLinks, renderAnnotation };
