'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { scopedSelector, resourceFree } = require('../src/mermaid-styles.cjs');
test('generated CSS can target only its own SVG subtree', () => {
  for (const selector of ['#storyDiagram1','#storyDiagram1 .node rect','#storyDiagram1 text, #storyDiagram1 tspan','#storyDiagram1 [data-story-diagram-inline="2"]']) assert.ok(scopedSelector(selector,'storyDiagram1'),selector);
  for (const selector of ['body','#storyDiagram10','#storyDiagram1, body','#storyDiagram1 + body','#storyDiagram1 ~ *','#storyDiagram1, #storyDiagram2 path']) assert.equal(scopedSelector(selector,'storyDiagram1'),false,selector);
});
test('generated CSS cannot fetch resources or use escaped resource syntax', () => {
  for (const css of ['fill:#ccc;stroke:rgb(51,51,51)','marker-end:url(#storyDiagram1-marker)','filter:url("#storyDiagram1-shadow")']) assert.doesNotThrow(()=>resourceFree(css));
  for (const css of ['fill:url(https://example.com/image)','@import "https://example.com/a.css"','@font-face{font-family:remote}','fill:u\\72l(https://example.com/x)','background:url(data:image/svg+xml,x)','color:expression(alert(1))','background:image-set("https://example.com/x" 1x)','background:image("//example.com/x")','fill:src("file:///x")','background:attr(data-x url)']) assert.throws(()=>resourceFree(css),/Unsafe/);
});
