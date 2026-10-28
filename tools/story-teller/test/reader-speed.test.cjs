'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {StoryPlayer}=require('../src/player.cjs'),{parseScene}=require('../src/parser.cjs');
const {SPEEDS,readerSpeed,calculatedDuration}=require('../src/reader-speed.cjs');
class Clock {
 time=0;serial=0;jobs=new Map();retired=[];
 now=()=>this.time;
 setTimeout=(callback,ms)=>{this.jobs.set(++this.serial,{callback,at:this.time+ms});return this.serial;};
 clearTimeout=id=>{if(this.jobs.has(id))this.retired.push(this.jobs.get(id).callback);this.jobs.delete(id);};
 advance(ms){const end=this.time+ms;for(;;){const job=[...this.jobs].sort((a,b)=>a[1].at-b[1].at)[0];if(!job||job[1].at>end)break;this.time=job[1].at;this.jobs.delete(job[0]);job[1].callback();}this.time=end;}
}
function session(source,speed=1,prosePacing=false,reducedMotion=false){const clock=new Clock(),player=new StoryPlayer(parseScene(source,{prosePacing}),{scheduler:clock,playbackSpeed:speed,reducedMotion});return{clock,player};}
const chat=body=>'```chat\n'+body+'\n```';
const typed=(speed=10)=>'```typeout\n@format yaml\n@speed '+speed+'\n\n👩🏽‍💻éXY\n```';
for(const speed of SPEEDS){
 test(`${speed}× scales bounded prose/chat/type-out baselines only`,()=>{
  for(const [source,pacing,expected] of [['One.\n\nTwo.',true,1000],[chat('A: Hi'),false,800],[chat('@pace brisk\nA: Hi'),false,560],[chat('@pace deliberate\nA: Hi'),false,1040],[typed(),false,500],[typed(30),false,167]]){
   const {clock,player}=session(source,speed,pacing);player.play();clock.advance(expected/speed-0.001);assert.equal(player.phase,'playing');clock.advance(0.002);assert.equal(player.phase,'completed');
  }
  const {clock,player}=session('First.\n\n@pause 300ms\n@delay 200ms\n\n'+chat('@delay 700ms\nA: Hi\n@pause 400ms'),speed,true);
  player.play();clock.advance(1599);assert.equal(player.phase,'playing');clock.advance(1);assert.equal(player.phase,'completed');
  const zero=session(chat('@delay 0ms\nA: Hi'),speed);zero.player.play();zero.clock.advance(0);assert.equal(zero.player.phase,'completed');
 });
}
test('invalid preferences fall back to default without coercion',()=>{for(const value of [null,undefined,0,-1,2,'0.5',NaN,{},Infinity])assert.equal(readerSpeed(value),1);assert.equal(calculatedDuration(0,.5),0);});
test('calculated wait changes retain proportional progress; stale callbacks cannot reveal',()=>{
 const {clock,player}=session(chat('A: Hi\nB: Hi'));player.play();clock.advance(200);player.setPlaybackSpeed(.5);assert.equal(player.remaining,1200);assert.equal(clock.jobs.size,1);
 clock.retired.forEach(fn=>fn());assert.equal(player.counts.size,0);clock.advance(600);player.setPlaybackSpeed(1.5);assert.equal(player.remaining,200);clock.advance(199);assert.equal(player.counts.size,0);clock.advance(1);assert.equal(player.counts.get(0),1);clock.advance(800/1.5+.001);assert.equal(player.phase,'completed');
});
test('explicit active and paused waits retain remaining duration and timer identity',()=>{
 for(const body of ['@delay 1000ms\nA: Hi','@pause 1000ms\n@delay 0ms\nA: Hi']){
  const {clock,player}=session(chat(body));player.play();clock.advance(200);const timer=player.timer;player.setPlaybackSpeed(.5);assert.equal(player.timer,timer);player.pause();assert.equal(player.remaining,800);player.setPlaybackSpeed(1.5);assert.equal(player.remaining,800);clock.advance(5000);assert.equal(player.phase,'paused');player.play();clock.advance(799);assert.equal(player.phase,'playing');clock.advance(1);assert.equal(player.phase,'completed');
 }
});
test('paused reveal retains graphemes and changes only remaining calculated time',()=>{
 const {clock,player}=session(typed());player.play();clock.advance(150);assert.equal(player.visibleBlocks[0].visibleText,'👩🏽‍💻');player.pause();player.setPlaybackSpeed(.5);assert.equal(player.remaining,100);clock.advance(5000);assert.equal(player.visibleBlocks[0].visibleText,'👩🏽‍💻');assert.equal(player.phase,'paused');player.play();clock.advance(99);assert.equal(player.visibleBlocks[0].visibleText,'👩🏽‍💻');clock.advance(1);assert.equal(player.visibleBlocks[0].visibleText,'👩🏽‍💻é');
 player.setPlaybackSpeed(1.5);clock.advance(201);assert.equal(player.phase,'completed');assert.equal(player.visibleBlocks[0].visibleText,'👩🏽‍💻éXY\n');
});
test('replay, immediate reveal, reduced motion and navigation cancel scaled work',()=>{
 const {clock,player}=session(typed()+'\n---\n'+chat('A: Hi'),.5);player.play();clock.advance(250);player.revealImmediately();assert.equal(player.phase,'completed');assert.equal(clock.jobs.size,0);player.replay();assert.equal(player.playbackSpeed,.5);clock.advance(250);player.setReducedMotion(true);assert.equal(player.phase,'completed');player.next({autoplay:true});clock.advance(100);player.previous();assert.equal(player.phase,'completed');clock.retired.forEach(fn=>fn());assert.equal(clock.jobs.size,0);player.restart();assert.equal(player.phase,'ready');player.play();player.update(parseScene(chat('B: Hi')));assert.equal(clock.jobs.size,0);player.play();player.dispose();clock.advance(50000);assert.equal(player.phase,'disposed');
});
test('frequent speed changes do not accumulate rounding drift',()=>{
 const {clock,player}=session(chat('A: Hi'));player.play();for(let i=0;i<100;i++){player.setPlaybackSpeed(.75);player.setPlaybackSpeed(1);}assert.ok(Math.abs(player.deadline-800)<1e-8);clock.advance(800.001);assert.equal(player.phase,'completed');
});
test('late callback does not accumulate scheduler overhead across reveals',()=>{
 const {clock,player}=session(typed());player.play();clock.advance(0);const job=[...clock.jobs.values()][0];clock.jobs.clear();clock.time=150;job.callback();assert.equal(player.deadline,200);clock.advance(350);assert.equal(player.phase,'completed');
});
test('unavailable VS Code preference reads use 1×',()=>{
 const {storedReaderSpeed}=require('../src/reader-speed.cjs');
 assert.equal(storedReaderSpeed({get(){throw Error('storage unavailable');}}),1);
 assert.equal(storedReaderSpeed({get:()=>.75}),.75);
 assert.equal(storedReaderSpeed({get:()=>'.75'}),1);
});
test('speed changes keep one sound voice and pause/reveal/navigation clean it up',()=>{
 const {TypeoutSound}=require('../src/sound.cjs');let starts=0,stops=0,intervals=0;
 class Context{destination={};currentTime=0;resume(){return Promise.resolve();}close(){}createOscillator(){return{frequency:{value:0},connect(){},disconnect(){},start(){starts++;},stop(){stops++;}};}createGain(){return{gain:{value:0},connect(){},disconnect(){}};}}
 const sound=new TypeoutSound({AudioContext:Context,setInterval:()=>++intervals,clearInterval(){}});sound.unlock();
 const {clock,player}=session(typed()+'\n---\nEnd');player.onChange=()=>sound.sync(player.phase==='playing'&&player.activeTypeout?'keyboard':null);
 player.play();clock.advance(0);assert.equal(starts,1);for(const speed of SPEEDS)player.setPlaybackSpeed(speed);assert.equal(starts,1);assert.equal(intervals,1);
 player.pause();assert.equal(stops,1);player.setPlaybackSpeed(.5);assert.equal(starts,1);player.play();assert.equal(starts,2);player.revealImmediately();assert.equal(stops,2);player.next();sound.sync(null);assert.equal(stops,2);sound.dispose();
});
test('delivery ticks remain 600ms at every speed and are unchanged by an active change',()=>{
 for(const speed of SPEEDS){const {clock,player}=session(chat('@viewer A\n@ticks\nA: Hi'),speed);player.play();clock.advance(800/speed+.001);assert.equal(player.visibleBlocks[0].messages[0].status,'delivered');clock.advance(200);const timer=player.timer;player.setPlaybackSpeed(speed===.5?1.5:.5);assert.equal(player.timer,timer);clock.advance(399);assert.equal(player.phase,'playing');clock.advance(1);assert.equal(player.visibleBlocks[0].messages[0].status,'read');}
});
