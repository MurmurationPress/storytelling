'use strict';
const { graphemes } = require('./typeout.cjs');

const { wikiLinks, createMarkdown, references, inlineText } = require('./markdown.cjs');
const { bodyTokens, imageFigure, isDiagram } = require('./formatted-media.cjs');
const md = createMarkdown();
const normalFence = md.renderer.rules.fence, normalImage = md.renderer.rules.image;
function segment(text, env) {
  const index = env.storySegments.length;
  env.storySegments.push(text);
  env.offsets.push(env.parts.length);
  env.parts.push(...graphemes(text).map(text => ({text})));
  return `<span data-story-segment="${index}">${md.utils.escapeHtml(text)}</span>`;
}
md.renderer.rules.text = (tokens, index, _options, env) => segment(tokens[index].content, env);
md.renderer.rules.code_inline = (tokens, index, _options, env) => `<code>${segment(tokens[index].content, env)}</code>`;
md.renderer.rules.code_block = (tokens, index, _options, env) => `<pre><code>${segment(tokens[index].content, env)}</code></pre>\n`;
function atomic(html, env, block = false) {
  const index = env.parts.length; env.parts.push({text:'',media:true});
  return `<${block ? 'div' : 'span'} class="formatted-atomic" data-story-atomic="${index}">${html}</${block ? 'div' : 'span'}>`;
}
md.renderer.rules.fence = (tokens,index,options,env,renderer) => isDiagram(tokens[index])
  ? atomic(normalFence(tokens,index,options,env,renderer),env,true) : md.renderer.rules.code_block(tokens,index,options,env);
md.renderer.rules.image = (tokens,index,options,env,renderer) => atomic(normalImage(tokens,index,options,env,renderer),env);
md.renderer.rules.formatted_image = (tokens,index,_options,env) => atomic(imageFigure(md,tokens[index]),env,true);
md.renderer.rules.story_wikilink = (tokens, index, _options, env) => `<span data-story-target="${md.utils.escapeHtml(tokens[index].meta.target)}">${segment(tokens[index].content, env)}</span>`;
function renderAnnotation(source, {firstLine = 1} = {}) {
  const env = { storySegments: [], offsets: [], parts: [], firstLine };
  const {tokens,...info} = bodyTokens(md,source);
  const html = md.renderer.render(tokens, md.options, env);
  return { html, ...info, segments: env.storySegments, offsets: env.offsets, parts: env.parts, hasMedia: env.parts.some(part=>part.media), count: env.parts.length };
}
module.exports = { wikiLinks, renderAnnotation };
