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


const {prepareDiagram, sourceError, diagramOptions}=require('../src/mermaid-config.cjs');
test('ordinary words in labels, messages, accessibility descriptions and comments are safe',()=>{
 for(const source of [
  'flowchart LR\n A[Satellite image] --> B[Habitat assessment]',
  'flowchart LR\n accDescr: PRIME examines an image of the reserve.\n A --> B',
  'sequenceDiagram\n Pip->>Skip: What style do you prefer?',
  'flowchart LR\n accDescr {\nstyle image click href src\n}\n A --> B',
  'flowchart LR\n %% image and style are ordinary comments\n A["click A is text"] --> B'
 ]) assert.equal(sourceError(source),null,source);
});
test('allowlisted standard frontmatter and legacy JSON init are supported',()=>{
 const source='---\nconfig:\n  look: handDrawn\n  handDrawnSeed: 42\n  flowchart:\n    curve: linear\n    nodeSpacing: 80\n---\nflowchart LR\n A --> B';
 const prepared=prepareDiagram(source);assert.equal(prepared.config.look,'handDrawn');assert.equal(prepared.config.flowchart.nodeSpacing,80);assert.ok(!prepared.text.includes('config:'));
 assert.equal(prepareDiagram('%%{init: {"look":"handDrawn"}}%%\nflowchart LR\n A --> B').config.look,'handDrawn');
});
test('unknown and unsafe settings and executable statements are rejected',()=>{
 for(const config of ['securityLevel: loose','htmlLabels: true','themeCSS: "body{display:none}"','fontFamily: external','themeVariables: {}','__proto__: {}','look: unsupported','handDrawnSeed: -1','flowchart: {htmlLabels: true}','flowchart: {nodeSpacing: 100000}','sequence: {useMaxWidth: true}']) {
  assert.ok(sourceError('---\nconfig:\n  '+config+'\n---\nflowchart LR\n A --> B'),config);
 }
 for(const source of ['flowchart LR\n click A "https://example.com"','flowchart LR\n A[<img src=x>]','flowchart LR\n classDef x fill:red','flowchart LR\n A@{img: "x"}','flowchart LR\n A@{"img": "https://example.com/x"}','flowchart LR\n A["`![x](https://example.com/x)`"]','flowchart LR\n A; click A callback','flowchart LR\n %%{init: {"securityLevel":"loose"}}%%']) assert.ok(sourceError(source),source);
});
test('presentation defaults and nested objects are isolated between diagrams',()=>{
 const first=diagramOptions(prepareDiagram('---\nconfig: {look: handDrawn, flowchart: {nodeSpacing: 88}}\n---\nflowchart LR\n A --> B').config);
 first.flowchart.htmlLabels=true;
 const second=diagramOptions(prepareDiagram('flowchart LR\n A --> B').config,{dark:true});
 assert.equal(second.look,'classic');assert.equal(second.flowchart.look,'classic');assert.equal(second.flowchart.nodeSpacing,undefined);assert.equal(second.flowchart.htmlLabels,false);assert.equal(second.securityLevel,'strict');assert.equal(second.theme,'dark');
});
test('reader markup has only a diagram surface and explicit caption; no source control',()=>{
 const {html}=renderMarkdown(flow+'\n\n*Caption: The authored route.*');
 assert.match(html,/<figcaption>The authored route.<\/figcaption>/);
 assert.ok(!/details|summary|<pre|readable fallback|Diagram ·/.test(html));
 assert.match(html,/tabindex="0"/);
});

test('class annotations in all pinned Mermaid forms retain their original source',()=>{
 for(const annotation of ['abstract','interface','enumeration','Abstract','Service','custom stereotype','Δομή']) {
  for(const body of [`class Example <<${annotation}>>`,`class Example\n<<${annotation}>> Example`,`class Example {\n <<${annotation}>>\n +String title\n}`,`Example : <<${annotation}>>`]) {
   const source='classDiagram\n'+body;assert.equal(sourceError(source),null,source);assert.equal(prepareDiagram(source).text,source);
  }
 }
 assert.equal(sourceError('%% A comment\nclassDiagram-v2\nclass Example <<abstract>>'),null);
});
test('annotation exceptions never exempt real HTML or wrapped resource payloads',()=>{
 for(const payload of ['<img src="https://example.com/x">','<script>alert(1)</script>','<<img src=x onerror=alert(1)>>','<<<script>>>alert(1)<<< /script>>>','<<abstract><img src=x>>','<<abstract>> <script>alert(1)</script>','<<abstract>> ![x](https://example.com/x)','<<abstract url(https://example.com/x)>>','<<abstract @import "x">>','<<abstract>> <svg onload="alert(1)">','<<abstract>> <image href="https://example.com/x">']) {
  assert.ok(sourceError('classDiagram\nclass Example {\n '+payload+'\n}'),payload);
 }
 assert.ok(sourceError('flowchart LR\n A[<<abstract>>] --> B'));
 assert.ok(sourceError('classDiagram\nclass Example <abstract>'));
});
test('complete structure fixture and both presentations pass unchanged into the renderer',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const body=fs.readFileSync(path.join(__dirname,'../samples/class-project/structure.mmd'),'utf8');
 const scene=parseScene(fs.readFileSync(path.join(__dirname,'../samples/class-project/scenes/Structure.md'),'utf8'));
 assert.equal(scene.beats.length,2);
 for(const beat of scene.beats) {
  const html=beat.blocks.find(block=>block.html?.includes('story-diagram')).html;
  assert.match(html,/&lt;&lt;abstract&gt;&gt;/);
 }
 for(const header of ['', '---\nconfig: {look: handDrawn, handDrawnSeed: 42}\n---\n']) assert.equal(prepareDiagram(header+body).text,body);
});
