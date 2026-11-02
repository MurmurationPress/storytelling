'use strict';
const { inlineText, imagesIn, references } = require('./markdown.cjs');
const { MIN_MS } = require('./prose-pacing.cjs');
// Shared body inspection. YAML never calls this path. Keep all source offsets
// relative to the body, except diagram renderer locations (passed via firstLine).
function bodyTokens(md, source) {
  const tokens = md.parse(source, {}), imageLines = Object.create(null);
  // Markdown-it emits alignment styles. Use equivalent fixed classes so the
  // extension's nonce-only CSP needs no inline-style exception.
  for(const token of tokens)if(['th_open','td_open'].includes(token.type)){
    const align=token.attrGet('style')?.match(/^text-align:(left|center|right)$/)?.[1];
    if(align){token.attrs=token.attrs.filter(([name])=>name!=='style');token.attrJoin('class',`story-align-${align}`);}
  }
  let bodyLine = 0;
  for (const token of tokens) { if(token.map)bodyLine=token.map[0]; for (const child of token.children || []) if (child.type === 'image') imageLines[child.attrGet('src') || ''] ??= bodyLine + 1; }
  const info = { images: imagesIn(tokens), imageLines, references: references(tokens) };
  for (let i = 0; i < tokens.length - 2; i++) {
    const inline = tokens[i + 1];
    if (tokens[i].type !== 'paragraph_open' || inline.type !== 'inline' || inline.children?.length !== 1 || inline.children[0].type !== 'image' || tokens[i + 2].type !== 'paragraph_close') continue;
    const image = inline.children[0];
    let caption = null, count = 3;
    const next = tokens[i + 4];
    if (tokens[i + 3]?.type === 'paragraph_open' && next?.type === 'inline' && tokens[i + 5]?.type === 'paragraph_close' && next.children?.every(child => ['em_open','em_close','text'].includes(child.type))) {
      caption = next.content.match(/^\*Caption: (.+)\*$/)?.[1] || null;
      if (caption) count = 6;
    }
    const token = tokens[i]; token.type = 'formatted_image'; token.nesting = 0;
    token.children = [image]; token.meta = { image, caption }; token.map = inline.map;
    tokens.splice(i, count, token);
  }
  return { tokens, ...info };
}
function imageFigure(md, token) {
  const image = token.meta.image, alt = inlineText(md,image.children);
  return `<figure class="story-figure"><img class="story-inline-image" data-story-src="${md.utils.escapeHtml(image.attrGet('src') || '')}" alt="${md.utils.escapeHtml(alt)}">${token.meta.caption ? `<figcaption>${md.utils.escapeHtml(token.meta.caption)}</figcaption>` : ''}</figure>`;
}
const isDiagram = token => token.type === 'fence' && token.info.trim() === 'mermaid';
module.exports = { bodyTokens, imageFigure, isDiagram, MEDIA_INTERVAL: MIN_MS };
