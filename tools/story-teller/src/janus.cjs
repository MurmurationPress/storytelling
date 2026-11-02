'use strict';
// Document structure is parsed once. Playback units are editorial Markdown
// boundaries, never viewport lines or individual table cells.
const { createMarkdown, references } = require('./markdown.cjs');
const { bodyTokens, imageFigure, isDiagram } = require('./formatted-media.cjs');
const md = createMarkdown();
md.renderer.rules.formatted_image = (tokens,index) => imageFigure(md,tokens[index]);
const isJanus = format => format === 'janus' || format === 'janus-log';
function visibleInline(children = []) {
  return children.map(token => ['softbreak', 'hardbreak'].includes(token.type) ? ' ' : token.type === 'image' ? '' : token.nesting === 0 ? token.content : '').join('');
}
function statementGroups(children, fields) {
  const groups = [[]], active = [];
  for (const child of children) {
    if (child.type === 'hardbreak' || (fields && child.type === 'softbreak')) {
      // Close/reopen formatting around each unit, keeping generated HTML valid
      // even when an authored emphasis or link crosses an explicit break.
      groups.at(-1).push(...[...active].reverse().map(token => ({ ...token, type: token.type.replace('_open', '_close'), nesting: -1, attrs: null })));
      groups.push(active.map(token => ({ ...token })));
    } else {
      groups.at(-1).push(child);
      if (child.nesting === 1) active.push(child);
      if (child.nesting === -1) active.pop();
    }
  }
  return groups;
}
function documentWarning(source) {
  const lines = source.split(/\r?\n/), tokens = md.parse(source, {});
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type !== 'tr_open') continue;
    const line = lines[tokens[i].map[0]].trim();
    // Match markdown-it's escaped-pipe convention, including pipes in code.
    const cells = line.split(/(?<!\\)\|/);
    if (cells[0] === '') cells.shift();
    if (cells.at(-1) === '') cells.pop();
    let expected = 0;
    for (let j = i + 1; j < tokens.length && tokens[j].type !== 'tr_close'; j++)
      if (['th_open', 'td_open'].includes(tokens[j].type)) expected++;
    if (cells.length > expected) return `table row at body line ${tokens[i].map[0] + 1} has extra cells that Markdown would discard`;
  }
  return null;
}
function renderJanus(source, {firstLine = 1} = {}) {
  const {tokens,...info} = bodyTokens(md, source), units = [];
  let listDepth = 0, tableDepth = 0, inHead = false, current = null;
  const stack = [], paragraphs = [];
  function mark(token, text = '') {
    const index = units.length;
    token.attrSet('data-janus-unit', String(index));
    units.push({ text, afterTable: false });
    return index;
  }
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === 'th_open') token.attrSet('scope', 'col');
    if (token.type === 'table_open') tableDepth++;
    if (token.type === 'list_item_open') { listDepth++; stack.push(current); current = mark(token); }
    else if (token.type === 'thead_open') { inHead = true; stack.push(current); current = mark(token); }
    else if (token.type === 'tr_open' && !inHead) { stack.push(current); current = mark(token);
    } else if (['paragraph_open', 'heading_open'].includes(token.type) && !tableDepth) {
      const frame = { current, forceVisible: false }; paragraphs.push(frame);
      if (listDepth) {
        // A continuation after a nested list/table must not appear with the
        // item's earlier text. Keep that later paragraph at its source position.
        if (current !== null && units[current].text.trim()) {
          current = mark(token); frame.forceVisible = true; token.hidden = false;
        }
        continue;
      }
      const inline = tokens[i + 1];
      // Consecutive Key: value fields and authored hard breaks each have an
      // explicit boundary; ordinary soft-wrapped prose stays one paragraph.
      const fields = inline?.type === 'inline' && inline.content.split('\n').every(line => /^\s*(?:\*\*)?[^:\n]+:(?:\*\*)?\s+\S/.test(line));
      const children = inline?.children || [];
      if (fields || children.some(child => child.type === 'hardbreak')) {
        current = null;
        const groups = statementGroups(children, fields);
        inline.meta = { janusGroups: groups.map(group => ({ index: units.push({ text: visibleInline(group), afterTable: false, ...(group.some(token=>token.type==='image') ? {media:true} : {}) }) - 1, group })) };
      } else current = mark(token);
    } else if (['fence', 'code_block', 'hr', 'formatted_image'].includes(token.type)) {
      if(token.type==='formatted_image' && current !== null && listDepth && !units[current].text.trim()) {units[current].media=true;token.meta.parentUnit=true;continue;}
      const index = mark(token, isDiagram(token) || token.type === 'formatted_image' ? '' : token.content);
      if (isDiagram(token) || token.type === 'formatted_image') units[index].media = true;
    }
    if (token.type === 'inline' && current !== null) {
      units[current].text += visibleInline(token.children) + ' ';
      if (token.children?.some(child => child.type === 'image')) units[current].media = true;
    }
    if (token.type === 'table_close') { tableDepth--; if (units.length) units.at(-1).afterTable = true; }
    if (token.type === 'list_item_close') { listDepth--; current = stack.pop() ?? null; }
    if (token.type === 'thead_close') { inHead = false; current = stack.pop() ?? null; }
    if (token.type === 'tr_close' && !inHead) current = stack.pop() ?? null;
    if (['paragraph_close', 'heading_close'].includes(token.type) && !tableDepth) {
      const frame = paragraphs.pop();
      if (frame?.forceVisible) token.hidden = false;
      current = frame?.current ?? null;
    }
  }
  // inline rendering is normally handled by Renderer.render, not a rule.
  const renderInline = md.renderer.renderInline.bind(md.renderer);
  const html = tokens.map(token => {
    if (token.type === 'inline') {
      if (token.meta?.janusGroups) return token.meta.janusGroups.map(({ index, group }) => `<span class="janus-statement" data-janus-unit="${index}">${renderInline(group, md.options, {})}</span>`).join('\n');
      return renderInline(token.children, md.options, {});
    }
    const rendered = md.renderer.render([token], md.options, {firstLine});
    return ['fence', 'code_block', 'formatted_image'].includes(token.type) && !token.meta?.parentUnit ? `<div data-janus-unit="${token.attrGet('data-janus-unit')}">${rendered}</div>` : rendered;
  }).join('');
  return { html, units, ...info, hasMedia: units.some(unit => unit.media) };
}
function readingTime(unit) {
  return Math.min(9000, Math.max(650, unit.text.trim().split(/\s+/u).length * 190));
}
module.exports = { isJanus, renderJanus, readingTime, documentWarning };
