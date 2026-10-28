'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { SupportingReader } = require('../src/supporting-reader.cjs');
const { StoryPlayer } = require('../src/player.cjs');
const { parseScene } = require('../src/parser.cjs');
function fixture() {
  let now=0,id=0;const timers=new Map();
  const scheduler={now:()=>now,setTimeout:(fn,delay)=>{timers.set(++id,{fn,at:now+delay});return id;},clearTimeout:handle=>timers.delete(handle)};
  const player=new StoryPlayer(parseScene('Before.\n\n```chat\n@delay 1000ms\nIvo: Answer.\n```'),{scheduler});
  const document={activeElement:null};
  const reader=Object.create(SupportingReader.prototype),focus=[];let closes=0;
  const article={scrollTop:0,textContent:'',replaceChildren(node){this.node=node;}};
  Object.assign(reader,{document,preview:{replaceChildren(){}},history:[],panelToken:0,hoverToken:0,disposed:false,article,heading:{},back:{},
    dialog:{open:false,contains:()=>false,showModal(){this.open=true;},close(){this.open=false;}},key:link=>({target:link.dataset.storyTarget}),hideHover(){this.hoverToken++;},
    pause:()=>player.pause(),onClose:()=>{closes++;},find:()=>({focus:options=>focus.push(options)}),noteContent:note=>note.html,
    load:async target=>({title:target,html:target})});
  return {reader,player,timers,focus,closes:()=>closes,advance(ms){now+=ms;for(const [handle,job]of [...timers])if(job.at<=now){timers.delete(handle);job.fn();}}};
}
test('reading a note pauses active playback and dismissal requires an explicit reader resume',async()=>{
  const h=fixture();h.player.play();h.advance(250);const remaining=h.player.remaining;
  await h.reader.open({dataset:{storyTarget:'Ted'}});assert.equal(h.player.phase,'paused');assert.equal(h.timers.size,0);
  h.advance(5000);assert.equal(h.player.counts.size,0);
  h.reader.close();assert.equal(h.player.phase,'paused');assert.equal(h.closes(),1);assert.deepEqual(h.focus,[{preventScroll:true}]);
  h.player.play();assert.equal(h.player.phase,'playing');h.advance(remaining);assert.equal(h.player.phase,'completed');
});
test('scene reset closes notes and rejects a late content result without focus restoration',async()=>{
  const h=fixture();let resolve;h.reader.load=()=>new Promise(done=>{resolve=done;});
  const opening=h.reader.open({dataset:{storyTarget:'Ted'}});h.reader.reset();resolve({html:'Stale note.'});await opening;
  assert.equal(h.reader.dialog.open,false);assert.equal(h.reader.history.length,0);assert.notEqual(h.reader.article.node,'Stale note.');assert.deepEqual(h.focus,[]);
});
test('nested-note history and refresh preserve note scroll without advancing the story',async()=>{
  const h=fixture();await h.reader.open({dataset:{storyTarget:'Ted'}});h.reader.article.scrollTop=85;
  h.reader.dialog.contains=()=>true;await h.reader.open({dataset:{storyTarget:'JANUS early'}});
  assert.equal(h.reader.history.length,2);assert.equal(h.reader.history[0].scroll,85);assert.equal(h.reader.back.disabled,false);
  h.reader.history.pop();await h.reader.showPanel(true);assert.equal(h.reader.article.scrollTop,85);assert.equal(h.reader.heading.textContent,'Ted');assert.equal(h.player.phase,'ready');
});

test('a stale or hidden story surface cannot open or load an aside during replacement',async()=>{
  const h=fixture();h.reader.available=()=>false;let loads=0;h.reader.load=async()=>{loads++;return {};};
  await h.reader.open({dataset:{storyTarget:'Ted'}});await h.reader.hover({dataset:{storyTarget:'Ted'}});
  assert.equal(loads,0);assert.equal(h.reader.dialog.open,false);assert.equal(h.player.phase,'ready');
});

test('a delayed hover refresh preserves its visible surface and content while the pointer remains inside',async()=>{
  const reader=Object.create(SupportingReader.prototype);let resolve,moves=0,hides=0,replacements=0,cancels=0;
  const link={dataset:{storyTarget:'Ted'}},preview={hidden:false,textContent:'Old preview',replaceChildren(){replacements++;}};
  Object.assign(reader,{preview,anchor:{target:'Ted',panel:false},hoverToken:0,disposed:false,cancelHide(){cancels++;},hideHover(){hides++;},find:()=>link,position(){},
    document:{body:{append(){moves++;}},createDocumentFragment:()=>({append(){},querySelectorAll:()=>[]})},
    load:()=>new Promise(done=>{resolve=done;}),noteContent:()=>({childNodes:[{textContent:'New preview'}]})});
  const update=reader.hover(link,true);assert.equal(preview.hidden,false);assert.equal(preview.textContent,'Old preview');assert.equal(moves,0);assert.equal(hides,0);assert.equal(cancels,0);
  resolve({html:'New preview'});await update;assert.equal(replacements,1);assert.equal(moves,0);assert.equal(hides,0);assert.equal(cancels,0);
});

test('hover preview stays pinned under the pointer while the story scrolls',()=>{
  const reader=Object.create(SupportingReader.prototype);
  Object.assign(reader,{preview:{hidden:false},anchor:{target:'Ted'},pointerInPreview:true,find(){throw Error('Should not reanchor a pinned preview');}});
  assert.doesNotThrow(()=>reader.position());
});

test('supporting note speed changes retain explicit remaining time and do not resume on close',async()=>{
 const h=fixture();h.player.play();h.advance(250);
 await h.reader.open({dataset:{storyTarget:'Ted'}});assert.equal(h.player.phase,'paused');
 h.player.setPlaybackSpeed(.5);assert.equal(h.player.remaining,750);
 h.reader.close();assert.equal(h.player.phase,'paused');h.player.play();h.advance(749);assert.equal(h.player.phase,'playing');h.advance(1);assert.equal(h.player.phase,'completed');
});
