'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {parseScene}=require('../src/parser.cjs');
const {renderMarkdown}=require('../src/markdown.cjs');
const {StoryPlayer}=require('../src/player.cjs');
const flow='```mermaid\nflowchart LR\n A --> B\n```';
test('diagrams are separate static sequence components; delays, source locations and source survive',()=>{
 const scene=parseScene('Before\n\n@delay 900ms\n\n'+flow+'\n\n'+flow+'\n\nAfter');
 assert.equal(scene.beats[0].blocks.length,4);
 assert.equal(scene.beats[0].blocks[1].delayMs,900);
 assert.match(scene.beats[0].blocks[1].html,/data-diagram-line="5"/);
 assert.match(scene.beats[0].blocks[1].html,/A --&gt; B/);
 const player=new StoryPlayer(scene);assert.equal(player.visibleBlocks.length,1);
 player.revealBeat();assert.equal(player.visibleBlocks.length,4);player.restart();assert.equal(player.visibleBlocks.length,1);player.dispose();
});
test('shared matter/note rendering escapes diagram source; ordinary code fences stay code',()=>{
 const {html}=renderMarkdown(flow+'\n\n```js\nconst n=1;\n```');
 assert.match(html,/story-diagram/);assert.match(html,/language-js/);assert.match(html,/const n=1/);
 assert.ok(!renderMarkdown('```mermaid\n<script>alert(1)</script>\n```').html.includes('<script>'));
});

test('security validation accepts arrows but refuses config, HTML, links and resource/style syntax',()=>{
 const {sourceError}=require('../src/mermaid-reader.cjs');
 for(const source of ['flowchart LR\n A --> B','sequenceDiagram\n A->>B: Hi\n B-->>A: Yes']) assert.equal(sourceError(source),null);
 for(const source of ['%%{init: {}}%%','---\nconfig: {}','flowchart LR\n click A "https://example.com"','flowchart LR\n A[<img src=x>]','flowchart LR\n classDef x fill:red','flowchart LR\n A@{img: "x"}']) assert.ok(sourceError(source),source);
});
