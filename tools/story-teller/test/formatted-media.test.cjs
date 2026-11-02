'use strict';
const {test} = require('node:test'), assert = require('node:assert/strict');
const {parseScene} = require('../src/parser.cjs');
const {convertCallouts} = require('../src/convert-callouts.cjs');
const {migrateComponentMetadata} = require('../src/migrate-component-metadata.cjs');
const {StoryPlayer} = require('../src/player.cjs');
const {MEDIA_INTERVAL} = require('../src/formatted-media.cjs');
const f=(format,body)=>`\`\`\`\`typeout\n@format ${format}\n@identity component\n@title Media\n@timestamp Before dawn\n@sound none\n\n${body}\n\`\`\`\``;
const body='Prose.\n\n![Graph](<../assets/model α.png>)\n\n*Caption: Authored caption.*\n\n| A | B |\n|---|---|\n| x | ![In a cell](../assets/repeat.png) |\n\n```mermaid\nflowchart LR\n A --> B\n```\n\n*Caption: A diagram.*\n\nConcluding prose.';
test('formatted bodies discover deduplicated local images with absolute source locations; YAML stays literal',()=>{
 for(const format of ['janus','janus-log','annotation']){
  const scene=parseScene('Opening.\n\n'+f(format,body+'\n\n![Again](../assets/repeat.png)'));
  const block=scene.beats[0].blocks[1], rendered=block.document||block.annotation;
  assert.equal(block.hasMedia,true);assert.deepEqual(scene.images,['../assets/model%20%CE%B1.png','../assets/repeat.png']);
  assert.equal(scene.imageLines['../assets/model%20%CE%B1.png'],12);assert.ok(scene.imageLines['../assets/repeat.png']>12);
  assert.match(rendered.html,/data-story-src=/);assert.match(rendered.html,/class="story-diagram"/);assert.match(rendered.html,/Authored caption/);assert.match(rendered.html,/A diagram/);
  const expected=scene.images[0];assert.equal(rendered.images.filter(src=>src===expected).length,1);
 }
 const scene=parseScene(f('yaml',body));assert.deepEqual(scene.images,[]);assert.equal(scene.beats[0].blocks[0].hasMedia,undefined);assert.equal(scene.beats[0].blocks[0].text,body+'\n');
});
test('JANUS images and diagrams are ordered units and do not count alt text or Mermaid code for timing',()=>{
 const block=parseScene(f('janus',body)).beats[0].blocks[0], units=block.document.units;
 assert.deepEqual(units.map(unit=>Boolean(unit.media)),[false,true,false,true,true,false]);
 assert.equal(units[1].text,'');assert.equal(units[4].text,'');
 const player=new StoryPlayer(parseScene(f('janus',body)));
 assert.ok(player.steps.some(step=>step.delayMs>=MEDIA_INTERVAL));player.dispose();
 const inline=parseScene(f('janus','First.  \n![Atomic](../assets/a.png)')).beats[0].blocks[0];assert.ok(inline.hasMedia);
});
test('annotation retains character steps around media, with atomic entries and a bounded viewing interval',()=>{
 const scene=parseScene(f('annotation','AB ![ALT MUST NOT TYPE](../assets/a.png) CD\n\n```mermaid\nflowchart LR\n A-->B\n```\n\nEF'));
 const a=scene.beats[0].blocks[0].annotation;
 assert.equal(a.segments.join(''),'AB  CDEF');assert.equal(a.parts.filter(p=>p.media).length,2);
 assert.ok(!a.parts.map(p=>p.text).join('').includes('flowchart'));
 const player=new StoryPlayer(scene);assert.equal(player.steps.filter(s=>s.delayMs===MEDIA_INTERVAL).length,2);player.dispose();
});
test('nested Mermaid styles pass through conversion with a safe delimiter and intact metadata/beat structure',()=>{
 const nested='```mermaid\n---\nconfig:\n  look: handDrawn\n---\nflowchart LR\n A-->B\n```';
 for(const label of ['janus','janus-log','annotation']) {
  const source='<!-- beat: Rhythm -->\n\n> [!'+label+'] **Model**\n> 2030-10-20 02:19\n>\n'+nested.split('\n').map(l=>'> '+l).join('\n')+'\n';
  const result=convertCallouts(source);assert.equal(result.count,1);assert.deepEqual(result.warnings,[]);assert.ok(result.text.includes(nested));assert.match(result.text,/````typeout/);
  const scene=parseScene(result.text);assert.equal(scene.beats.length,1);assert.equal(scene.beats[0].title,'Rhythm');assert.equal(scene.beats[0].blocks[0].title,'**Model**');
  assert.equal(migrateComponentMetadata(result.text).text,result.text);assert.equal(convertCallouts(result.text).text,result.text);
 }
});
class Clock {time=0;id=0;jobs=new Map();now=()=>this.time;setTimeout=(fn,ms)=>{this.jobs.set(++this.id,{fn,at:this.time+ms});return this.id;};clearTimeout=id=>this.jobs.delete(id);advance(ms){const end=this.time+ms;for(;;){const next=[...this.jobs].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>end)break;this.time=next[1].at;this.jobs.delete(next[0]);next[1].fn();}this.time=end;}}
const flush=async()=>{for(let i=0;i<6;i++)await Promise.resolve();};
test('asynchronous preparation gates entry, respects pause/resume and immediate reveal, and ignores obsolete work',async()=>{
 let resolve;const ready=new Promise(r=>resolve=r),clock=new Clock();
 const scene=parseScene(f('janus','![Graph](a.png)')+'\n\n---\nNext.');
 const player=new StoryPlayer(scene,{scheduler:clock,prepareTypeout:()=>ready});
 player.play();clock.advance(10000);assert.equal(player.visibleBlocks.length,0);assert.equal(player.waitingTypeout,0);
 player.pause();player.revealImmediately();resolve();await flush();assert.equal(player.phase,'paused');assert.equal(player.visibleBlocks.length,0);
 player.play();await flush();clock.advance(0);assert.equal(player.phase,'completed');assert.equal(player.visibleBlocks[0].complete,true);
 player.replay();player.next();await flush();clock.advance(10000);assert.equal(player.index,1);assert.equal(player.phase,'ready');player.dispose();
});
test('Previous/reveal beat wait for media without premature completion; navigation cancels their async completion',async()=>{
 let resolve;const ready=new Promise(r=>resolve=r);const player=new StoryPlayer(parseScene(f('annotation','![Graph](a.png)')+'\n\n---\nNext.'),{prepareTypeout:()=>ready});
 player.revealBeat();assert.equal(player.revealingBeat,true);assert.notEqual(player.phase,'completed');player.next();resolve();await flush();assert.equal(player.index,1);assert.equal(player.phase,'ready');
 player.previous();await flush();assert.equal(player.phase,'completed');assert.equal(player.visibleBlocks[0].complete,true);player.dispose();
});
