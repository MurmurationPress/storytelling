'use strict';
const MarkdownIt = require('markdown-it');
function wikiLinks(md) {
  md.inline.ruler.before('link', 'story_wikilink', (state, silent) => {
    const start = state.pos;
    if (state.src.slice(start, start + 2) !== '[[' || state.src[start - 1] === '!') return false;
    const end = state.src.indexOf(']]', start + 2);
    if (end < 0 || /[\r\n]/.test(state.src.slice(start, end))) return false;
    const value = state.src.slice(start + 2, end), separator = value.indexOf('|');
    const target = (separator < 0 ? value : value.slice(0, separator)).trim();
    const label = separator < 0 ? value : value.slice(separator + 1);
    if (!label) return false;
    if (!silent) {
      const token = state.push('story_wikilink', '', 0);
      token.content = label; token.meta = { target, offset: start };
    }
    state.pos = end + 2; return true;
  });
  md.renderer.rules.story_wikilink = (tokens, index) => {
    const token = tokens[index];
    return `<span data-story-target="${md.utils.escapeHtml(token.meta.target)}">${md.utils.escapeHtml(token.content)}</span>`;
  };
}
function inlineText(md, tokens) {
  return md.renderer.renderInlineAsText((tokens || []).map(token => token.type === 'story_wikilink' ? { ...token, type: 'text' } : token), md.options, {});
}
function createMarkdown({ externalLinks = false } = {}) {
  const md = new MarkdownIt({ html: false, linkify: false, typographer: false });
  wikiLinks(md);
  md.renderer.rules.link_open = (tokens, index) => {
    const href = tokens[index].attrGet('href') || '';
    return externalLinks && /^https?:\/\//i.test(href)
      ? `<a href="${md.utils.escapeHtml(href)}" target="_blank" rel="noopener noreferrer">`
      : '<span class="link-text">';
  };
  md.renderer.rules.link_close = (tokens, index) => {
    let depth = 0;
    for (let at = index - 1; at >= 0; at--) {
      if (tokens[at].type === 'link_close') depth++;
      if (tokens[at].type === 'link_open') {
        if (depth--) continue;
        return externalLinks && /^https?:\/\//i.test(tokens[at].attrGet('href') || '') ? '</a>' : '</span>';
      }
    }
    return '</span>';
  };
  md.renderer.rules.image = (tokens, index) => {
    const token = tokens[index], alt = inlineText(md, token.children);
    return `<img class="story-inline-image" data-story-src="${md.utils.escapeHtml(token.attrGet('src') || '')}" alt="${md.utils.escapeHtml(alt)}">`;
  };
  return md;
}
function references(tokens, firstLine = 1) {
  const refs = [];
  for (const token of tokens) {
    if (token.type !== 'inline') continue;
    for (const child of token.children || []) if (child.type === 'story_wikilink') refs.push({
      target: child.meta.target, label: child.content,
      line: firstLine + (token.map?.[0] || 0) + token.content.slice(0, child.meta.offset).split('\n').length - 1
    });
  }
  return refs;
}
function imagesIn(tokens) {
  return [...new Set(tokens.flatMap(token => (token.children || []).filter(child => child.type === 'image').map(child => child.attrGet('src') || '')))];
}
const inline = createMarkdown();
// Chat has always used plain authored text. Only explicit wikilinks become
// controls; preserve other accepted punctuation/Markdown-looking text literally.
function renderChat(text) {
  const tokens = inline.parseInline(text, {}), refs = references(tokens);
  const children = tokens[0]?.children || [];
  // Source offsets let us replace only recognised wiki spans, protecting code
  // and escaped syntax without interpreting ordinary chat Markdown.
  let at = 0, html = '', visible = '';
  for (const token of children.filter(token => token.type === 'story_wikilink')) {
    const end = text.indexOf(']]', token.meta.offset + 2) + 2;
    html += inline.utils.escapeHtml(text.slice(at, token.meta.offset)) + inline.renderer.rules.story_wikilink([token], 0);
    visible += text.slice(at, token.meta.offset) + token.content; at = end;
  }
  html += inline.utils.escapeHtml(text.slice(at)); visible += text.slice(at);
  return { html, visibleText: visible, references: refs };
}
// A colon in a recognised wiki target/label is not the speaker separator.
function chatMessage(text) {
  const links = (inline.parseInline(text, {})[0]?.children || []).filter(token => token.type === 'story_wikilink');
  for (let at = 0; at < text.length; at++) {
    const link = links.find(token => token.meta.offset === at);
    if (link) { at = text.indexOf(']]', at + 2) + 1; continue; }
    if (text[at] !== ':') continue;
    const tail = text.slice(at + 1).match(/^[ \t]+(.*)$/);
    return tail && text.slice(0, at).trim() ? [text, text.slice(0, at), tail[1]] : null;
  }
  return null;
}
const matterMarkdown = createMarkdown({ externalLinks: true });
function renderMarkdown(source, { externalLinks = false } = {}) {
  const noteMarkdown = externalLinks ? matterMarkdown : inline;
  const tokens = noteMarkdown.parse(source, {});
  const imageLines = Object.create(null);
  for (const token of tokens) for (const child of token.children || []) if (child.type === 'image') imageLines[child.attrGet('src') || ''] ??= (token.map?.[0] || 0) + 1;
  return { imageLines, html: noteMarkdown.renderer.render(tokens, noteMarkdown.options, {}), images: imagesIn(tokens), references: references(tokens) };
}
module.exports = { inlineText, wikiLinks, createMarkdown, references, imagesIn, renderChat, renderMarkdown, chatMessage };
