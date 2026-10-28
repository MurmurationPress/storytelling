'use strict';
const assert=require('node:assert/strict');
module.exports=async({evaluate,wait})=>{
 const checks=[],timings=[];
 const click=id=>evaluate(`doc.getElementById('${id}').click()`);
 const speed=value=>evaluate(`(()=>{const s=doc.getElementById('playback-speed');s.value='${value}';s.dispatchEvent(new Event('change',{bubbles:true}));return s.value;})()`);
 const until=async(fn)=>{const end=Date.now()+10000;while(Date.now()<end){try{if(await fn())return;}catch{}await wait(20);}throw Error('Speed probe timed out');};
 await until(()=>evaluate("doc.getElementById('beat').textContent.includes('First paragraph')"));
 assert.deepEqual(await evaluate("[...doc.getElementById('playback-speed').options].map(o=>o.textContent)"),['0.5×','0.75×','1× (default)','1.25×','1.5×']);
 for(const value of [.5,.75,1,1.25,1.5]){
  await speed(value);await click('replay');const start=Date.now();await wait(1000/value*.7);assert.equal(await evaluate("doc.getElementById('beat').textContent.includes('Second paragraph')"),false);
  await until(()=>evaluate("doc.getElementById('beat').textContent.includes('Second paragraph')"));const elapsed=Date.now()-start;assert.ok(Math.abs(elapsed-1000/value)<300,`${value}: ${elapsed}`);timings.push({speed:value,expected:1000/value,observed:elapsed});
 }
 checks.push('all five actual select values and temporal paragraph pacing');
 await click('replay');await wait(200);await evaluate("doc.querySelector('button.wiki-link').click()");await until(()=>evaluate("doc.querySelector('.supporting-panel').open"));await speed(.75);await evaluate("doc.querySelector('[aria-label=\"Close supporting note\"]').click()");await wait(1400);assert.equal(await evaluate("doc.getElementById('beat').textContent.includes('Second paragraph')"),false);assert.match(await evaluate("doc.getElementById('status').textContent"),/paused/);checks.push('supporting note pauses; speed change and close leave playback paused');
 await speed(1);await click('replay');await wait(250);await click('pause');await speed(.5);await wait(900);assert.equal(await evaluate("doc.getElementById('beat').textContent.includes('Second paragraph')"),false);await click('pause');await wait(900);assert.equal(await evaluate("doc.getElementById('beat').textContent.includes('Second paragraph')"),false);await until(()=>evaluate("doc.getElementById('beat').textContent.includes('Second paragraph')"));checks.push('paused change stays paused and retains proportional progress on resume');
 await speed(.5);await click('replay');await wait(500);await speed(1.5);await wait(200);assert.equal(await evaluate("doc.getElementById('beat').textContent.includes('Second paragraph')"),false);await until(()=>evaluate("doc.getElementById('beat').textContent.includes('Second paragraph')"));checks.push('active speed change retains current paragraph');
 await evaluate("(()=>{const w=doc.defaultView;w.speedAudio={starts:0,stops:0};const proto=w.AudioContext?.prototype;if(proto){const original=proto.createOscillator;proto.createOscillator=function(){const voice=original.call(this);w.speedAudio.starts++;const stop=voice.stop.bind(voice);voice.stop=(...args)=>{w.speedAudio.stops++;return stop(...args)};return voice;}}})()");
 await click('next');await wait(300);
 const revealed=()=>evaluate("[...doc.querySelectorAll('.typeout-progress [data-story-segment]')].map(s=>s.firstChild.textContent).join('')");
 const activeBefore=await revealed(),voices=await evaluate('doc.defaultView.speedAudio.starts');await speed(.5);await wait(250);assert.ok((await revealed()).startsWith(activeBefore));assert.equal(await evaluate('doc.defaultView.speedAudio.starts'),voices);
 await click('pause');const before=await revealed();await speed(.75);await wait(300);assert.equal(await revealed(),before);assert.equal(await evaluate('doc.defaultView.speedAudio.stops'),voices);await click('reveal');assert.match(await revealed(),/synthetic output/);checks.push('active Unicode reveal preserves text, speed change keeps one audio voice, paused reveal and cleanup');
 await click('next');await wait(1800);assert.match(await evaluate("doc.getElementById('beat').textContent"),/Hi.*Yes/s);checks.push('chat completes using authored brisk baseline');
 await click('next');const start=Date.now();await wait(200);await speed(.5);await wait(500);assert.equal(await evaluate("doc.getElementById('beat').textContent.includes('Explicit wait finished')"),false);await until(()=>evaluate("doc.getElementById('beat').textContent.includes('Explicit wait finished')"));assert.ok(Date.now()-start<1300);checks.push('active explicit wait duration unchanged by speed change');
 return {checks,timings};
};
