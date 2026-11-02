'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {convertChats}=require('../src/convert.cjs'),{parseScene}=require('../src/parser.cjs');
const {StoryPlayer}=require('../src/player.cjs');
const {suggestionsAt,hoverAt}=require('../src/intellisense.cjs');
const wrap=body=>'```chat\n'+body+'\n```';
const chat=source=>parseScene(source).beats[0].blocks[0];
const convert=body=>{const r=convertChats(wrap(body));assert.equal(r.count,1,JSON.stringify(r));assert.deepEqual(r.warnings,[]);return r.text;};
test('reported third field converts losslessly to separate per-message subtext and is idempotent',()=>{
 const source=convert('{{Companion|Limited continuity. External context unavailable.|local state}}');
 assert.equal(source,wrap('Companion: Limited continuity. External context unavailable.\n@subtext\n  | local state'));
 assert.deepEqual(chat(source).messages,[{speaker:'Companion',text:'Limited continuity. External context unavailable.',subtext:'local state'}]);
 assert.deepEqual(convertChats(source),{text:source,count:0,changes:[],warnings:[]});
});
test('mixed absent/empty/nonempty fields stay associated through inherited and consecutive speakers',()=>{
 const source=convert('# Channel\n> A\n@ticks\n{{A|One}}\n{{|Two|}}\n{{B|Three|first note}}\n{{|Four|second note}}\n{{A|Five|}}');
 const block=chat(source);assert.equal(block.title,'Channel');assert.equal(block.viewer,'A');assert.ok(block.ticks);
 assert.deepEqual(block.messages.map(m=>[m.speaker,m.text,m.subtext]),[['A','One',undefined],['A','Two',undefined],['B','Three','first note'],['B','Four','second note'],['A','Five',undefined]]);
 assert.equal((source.match(/@subtext/g)||[]).length,2);
 assert.equal(chat(convert('{{A|Body| \n }}')).messages[0].subtext,' \n ');
});
test('subtext retains multiline whitespace, Unicode, delimiter escapes and directive-like lines using chat conventions',()=>{
 const raw='  local \\| state — α\n\n@pause 900ms\nB: still metadata\n  | literal continuation\ntrailing  ';
 // Pipes in a third field must be escaped; actual continuation prefixes there
 // would otherwise be ambiguous with the legacy final-field delimiter.
 const safe=raw.replace('  | literal','  \\| literal');
 const source=convert('{{A|First\nSecond|'+safe+'}}'),m=chat(source).messages[0];
 assert.equal(m.text,'First\nSecond');assert.equal(m.subtext,raw.replace('\\|','|'));
 assert.equal(chat(source).events.length,1);assert.equal(convertChats(source).text,source);
 const braces=convert('{{A|Text|literal \\}} and { brace}}');assert.equal(chat(braces).messages[0].subtext,'literal \\}} and { brace');
});
test('literal markup stays safe and wikilinks use the existing renderer, with precise subtext source locations',()=>{
 const source=convert('{{A|Body|<script>alert(1)</script> **literal** [[State|local note]]}}');
 const scene=parseScene(source),m=scene.beats[0].blocks[0].messages[0];
 assert.match(m.subtextHtml,/&lt;script&gt;alert\(1\)&lt;\/script&gt; \*\*literal\*\*/);assert.doesNotMatch(m.subtextHtml,/<script/);
 assert.match(m.subtextHtml,/data-story-target="State"/);assert.equal(scene.wikiReferences[0].line,4);
 assert.ok(!m.html&&!m.timingText);assert.equal(scene.images.length,0);
});
test('unproven legacy field boundaries and malformed metadata remain readable with useful diagnostics',()=>{
 for(const body of ['{{A|One|Two|Three}}','{{A|Text|{{nested}}}}','{{A|Text|[[broken|alias}}']){
  const source=wrap(body),r=convertChats(source);assert.equal(r.text,source);assert.equal(r.count,0);assert.equal(r.warnings.length,1);
 }
 for(const body of ['@subtext\n  | orphan','A: Body\n@pause 100ms\n@subtext\n  | detached','A: Body\n@subtext\n  | first\n@subtext\n  | second']){
  const scene=parseScene(wrap(body));assert.equal(scene.beats[0].blocks[0].type,'prose');assert.match(scene.diagnostics[0],/@subtext/);
 }
 assert.deepEqual(chat(wrap('A: Body\n@subtext\nB: Next')).messages,[{speaker:'A',text:'Body',subtext:''},{speaker:'B',text:'Next'}]);
 // Previously valid speakers and literal continuation text are not reinterpreted.
 assert.equal(chat(wrap('@subtext team: Old valid speaker')).messages[0].speaker,'@subtext team');
 assert.equal(chat(wrap('A: Body\n  | @subtext\n  | ordinary dialogue')).messages[0].text,'Body\n@subtext\nordinary dialogue');
});
test('CRLF, containing fences, beat titles and bytes outside conversion remain unchanged',()=>{
 const prefix='\uFEFF<!-- beat: Reading interval -->\r\nBefore.\r\n\r\n',suffix='\r\nAfter.\r\n---\r\nNext.\r\n';
 const source=prefix+'  ~~~~chat\r\n  {{A|Body|local state}}\r\n  ~~~~'+suffix;
 const r=convertChats(source);assert.equal(r.count,1);assert.ok(r.text.startsWith(prefix));assert.ok(r.text.endsWith('  ~~~~'+suffix));assert.doesNotMatch(r.text,/(?<!\r)\n/);
 assert.equal(parseScene(r.text).beats.length,2);assert.equal(convertChats(r.text).text,r.text);
});
class Clock{time=0;id=0;jobs=new Map();retired=[];now=()=>this.time;setTimeout=(fn,ms)=>{this.jobs.set(++this.id,{fn,at:this.time+ms});return this.id;};clearTimeout=id=>{if(this.jobs.has(id))this.retired.push(this.jobs.get(id).fn);this.jobs.delete(id);};advance(ms){const end=this.time+ms;for(;;){const next=[...this.jobs].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>end)break;this.time=next[1].at;this.jobs.delete(next[0]);next[1].fn();}this.time=end;}}
const visible=player=>player.visibleBlocks.filter(b=>b.type==='chat').flatMap(b=>b.messages);
test('subtext changes neither the message clock nor sound/typing steps; pause/speed/reveal/replay/navigation gate it with its message',()=>{
 const plain=wrap('@viewer A\n@ticks\nA: Hello\nA: Again'),rich=wrap('@viewer A\n@ticks\nA: Hello\n@subtext\n  | '+'long metadata '.repeat(100)+'\nA: Again\n@subtext\n  | second');
 const clock=new Clock(),player=new StoryPlayer(parseScene(rich+'\n---\nNext.'),{scheduler:clock});
 const baseline=new StoryPlayer(parseScene(plain));assert.deepEqual(player.steps,baseline.steps);
 player.play();clock.advance(300);assert.equal(visible(player).length,0);player.setReducedMotion(true);assert.equal(visible(player).length,0);player.pause();clock.advance(9000);assert.equal(visible(player).length,0);
 player.setPlaybackSpeed(1.5);player.play();clock.advance(333);assert.equal(visible(player).length,0);clock.advance(1);assert.ok(visible(player)[0].subtext);assert.equal(visible(player)[0].status,'delivered');
 clock.advance(600);assert.equal(visible(player)[0].status,'read');player.pause();assert.ok(player.revealImmediately());assert.equal(visible(player).length,2);assert.equal(visible(player)[1].subtext,'second');
 player.replay();assert.equal(visible(player).length,0);player.next();for(const fn of clock.retired)fn();clock.advance(10000);assert.equal(visible(player).length,0);
 player.previous();assert.equal(visible(player).length,2);player.restart();assert.equal(visible(player).length,0);player.dispose();baseline.dispose();
});
test('reduced motion, full instant reveal and source updates keep subtext tied to completed messages',()=>{
 const source=wrap('A: Body\n@subtext\n  | local state')+'\n---\nNext.';
 const clock=new Clock(),player=new StoryPlayer(parseScene(source),{scheduler:clock,reducedMotion:true});player.play();clock.advance(799);assert.equal(visible(player).length,0);clock.advance(1);assert.equal(visible(player)[0].subtext,'local state');
 player.replay();player.revealBeat();assert.equal(visible(player).length,1);assert.equal(player.phase,'completed');
 player.update(parseScene(source.replace('local state','edited state')));assert.equal(visible(player).length,0);clock.advance(9000);assert.equal(visible(player).length,0);player.revealBeat();assert.equal(visible(player)[0].subtext,'edited state');player.dispose();
});
test('completion/hover documents positional subtext without offering it in headers or duplicate fields',()=>{
 const source=wrap('A: Body\n@su'),items=suggestionsAt(source,source.indexOf('@su')+3,true);assert.equal(items[0].snippet,'@subtext\n  | ${1:Message subtext}');
 assert.match(hoverAt(wrap('A: Body\n@subtext\n  | note'),wrap('A: Body\n').length+3).markdown,/preceding message/);
 for(const body of ['@su','# Channel: status\n@su','A: Body\n@subtext\n  | note\n@su','A: Body\n@pause 10ms\n@su'])assert.ok(!suggestionsAt(wrap(body),wrap(body).lastIndexOf('@su')+3,true).some(i=>i.name==='subtext'));
});
test('synthetic legacy/converted fixtures stay in sync and project export resolves subtext notes without assets',async()=>{
 const fs=require('node:fs/promises'),path=require('node:path'),{prepareWeb}=require('../src/web-export.cjs');
 const root=path.join(__dirname,'../samples/chat-subtext-project'),legacy=await fs.readFile(path.join(root,'Legacy.md'),'utf8'),converted=await fs.readFile(path.join(root,'scenes/Chat.md'),'utf8');
 assert.equal(convertChats(legacy).text,converted);assert.equal(convertChats(converted).count,0);
 const exported=await prepareWeb(root);assert.equal(exported.assets.size,0);assert.deepEqual(exported.warnings,[]);
 assert.ok(exported.scenes[0].data.source.includes('@subtext'));assert.ok(exported.scenes[0].data.supporting.links['State note']);
});
