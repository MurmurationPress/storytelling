'use strict';
const { inspectStructure } = require('./structure.cjs');
const { renderMarkdown } = require('./markdown.cjs');
function matterScene(source) {
  const structure = inspectStructure(source);
  const body = source.slice(structure.lines[structure.start]?.start ?? source.length);
  const rendered = renderMarkdown(body, { firstLine: structure.start + 1 });
  const sourceRange = { startOffset: 0, endOffset: source.length, anchorLine: structure.start, endLine: structure.lines.length };
  return { beats: [{ raw: source, sourceRange, blocks: [{ type: 'prose', html: rendered.html }], sequence: [{ type: 'component', blockIndex: 0 }] }], diagnostics: [], images: rendered.images, imageLines: rendered.imageLines, wikiReferences: rendered.references };
}
module.exports = { matterScene };
