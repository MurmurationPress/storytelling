/* Real EPUB.js integration: no mocked reader location/presentation callbacks. */
const {chromium}=require('../prime-reader/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const ROOT=__dirname,OUT=process.env.ART_EVIDENCE_DIR || path.join(ROOT,'evidence');
const URL=process.env.READER_URL || 'http://127.0.0.1:4190',ASK='art.robin-presence',ALLOW='art.robin-permission';
fs.mkdirSync(OUT,{recursive:true});
const result={build:JSON.parse(fs.readFileSync(path.join(ROOT,'publication/build.json'))),platform:process.platform,runs:[],checks:[]};
async function open(p,query='') {
 p.on('pageerror',e=>{throw e;});await p.goto(URL+'/?book=art'+query);
 await p.waitForFunction(()=>primeExperiment.ready && primeExperiment.location && !document.querySelector('#reader').classList.contains('transitioning'));
 assert.equal(await p.locator('#error').textContent(),'');
}
async function at(p,href) {await p.waitForFunction(h=>primeExperiment.location?.start.href===h && !document.querySelector('#reader').classList.contains('transitioning'),href);}
async function turn(p,dir,href) {await p.click(dir==='next'?'#next':'#previous');await at(p,href);}
async function frame(p) {return (await p.locator('#reader iframe').elementHandle()).contentFrame();}
async function active(p,id=ASK) {await p.waitForFunction(id=>primeExperiment.records.some(r=>r.owner==='primary' && r.component===id && r.progress?.active),id);}
async function phase(p,name,id=ASK) {await p.waitForFunction(({id,name})=>primeExperiment.records.some(r=>r.owner==='primary' && r.component===id && r.progress?.snapshot.progress.phase===name),{id,name});}
async function stored(p,id=ASK) {return p.evaluate(id=>Object.entries(primeExperiment.saved.components).find(([key])=>JSON.parse(key)[2]===id)?.[1],id);}
async function snap(p,run,name) {
 const f=await frame(p),data=await f.evaluate(()=> {
  const rect=id=>document.getElementById(id)?.getBoundingClientRect().toJSON();
  const perf=document.getElementById('performance'),transcript=document.getElementById('transcript');
  return {text:document.body.innerText,shown:perf ? [...perf.querySelectorAll('.message')].filter(e=>!e.hidden).map(e=>e.innerText):[],
   staticVisible:transcript ? getComputedStyle(transcript).display!=='none' && !transcript.hidden : false,
   indicator:document.getElementById('typing') ? !document.getElementById('typing').hidden : false,
   surface:rect('surface'),controls:rect('controls'),width:innerWidth,height:innerHeight,
   textFits:perf ? perf.scrollWidth<=perf.clientWidth : true,hostTime:performance.now()};
 });
 if(data.controls){assert(data.controls.bottom<=data.height+1,'controls bounds');assert(data.surface.right<=data.width+1);assert(data.textFits,'message width');}
 data.name=name;run.samples.push(data);await p.screenshot({path:path.join(OUT,run.id,name+'.png')});return data;
}
async function trace(p,run,label){run.traces.push({label,trace:await p.evaluate(()=>primeExperiment.trace)});}
async function restoredEntry(p,id) {
 return p.evaluate(id=>primeExperiment.trace.filter(t=>t.event==='progress' && t.component===id && t.reason==='enter').at(-1).progress,id);
}
(async()=>{
 const browser=await chromium.launch();result.browser=browser.version();
 for(const viewport of [{width:1280,height:800},{width:820,height:1180}]) {
  const run={id:viewport.width===1280?'linux-desktop':'tablet-responsive',viewport,samples:[],traces:[],videos:[]};result.runs.push(run);
  const dir=path.join(OUT,run.id);fs.mkdirSync(dir,{recursive:true});
  const ctx=await browser.newContext({viewport,recordVideo:{dir,size:viewport}});let p=await ctx.newPage();
  run.videos.push({source:await p.video().path(),name:'reading.webm'});
  await open(p,'&preload=1&registrationDelay=350');await at(p,'opening.xhtml');
  const before=await snap(p,run,'01-prose');assert(!before.text.includes('then typed'));assert(before.text.includes('She had kept Robin out of their conversations'));
  await p.waitForFunction(()=>primeExperiment.records.some(r=>r.owner==='preload' && r.progress));
  await p.waitForTimeout(4500);
  const pre=await p.evaluate(()=>primeExperiment.records.find(r=>r.owner==='preload'));
  assert.equal(pre.progress.snapshot.progress.shown,0);assert.equal(pre.progress.snapshot.progress.remainingMs,900);assert.equal(pre.active,false);
  assert(!(await p.evaluate(()=>primeExperiment.trace.some(t=>t.owner==='preload' && t.reason==='tick'))));
  await turn(p,'next','ask.xhtml');const blank=await snap(p,run,'02-blank-arrival');assert.equal(blank.shown.length,0);assert(!blank.staticVisible);
  await active(p);await p.waitForTimeout(100);await phase(p,'delay');await snap(p,run,'03-message-delay');
  // Reader page-turn key while a component control owns focus.
  await (await frame(p)).focus('#reveal');await p.keyboard.press('ArrowRight');await at(p,'between.xhtml');
  await p.waitForTimeout(150);const delay=await stored(p);assert.equal(delay.progress.phase,'delay');
  await p.waitForTimeout(550);assert.deepEqual(await stored(p),delay);
  await turn(p,'prev','ask.xhtml');await active(p);assert.deepEqual(await restoredEntry(p,ASK),delay.progress);
  await phase(p,'typing');const typing=await snap(p,run,'04-typing');assert.equal(typing.shown.length,1);assert(typing.indicator);assert(!typing.staticVisible);
  await turn(p,'next','between.xhtml');await p.waitForTimeout(150);const frozen=await stored(p);assert.equal(frozen.progress.phase,'typing');
  await p.waitForTimeout(4500);assert.deepEqual(await stored(p),frozen);
  const middle=await snap(p,run,'05-prose-with-interpretation');assert(middle.text.includes('It had waited.'));assert(middle.text.includes('leaving the camera off'));
  await turn(p,'prev','ask.xhtml');await active(p);assert.deepEqual(await restoredEntry(p,ASK),frozen.progress);
  await snap(p,run,'06-resumed-typing');await phase(p,'complete');const complete=await snap(p,run,'07-complete');assert.equal(complete.shown.length,2);assert(complete.text.includes('May I ask what colour?'));
  await turn(p,'next','between.xhtml');await turn(p,'prev','ask.xhtml');await active(p);await phase(p,'complete');await snap(p,run,'08-completed-return');
  await (await frame(p)).click('#begin');await phase(p,'delay');await p.waitForTimeout(150);
  await (await frame(p)).click('#reveal');await phase(p,'complete');await snap(p,run,'09-immediate-reveal');
  await turn(p,'next','between.xhtml');await turn(p,'next','permission.xhtml');await active(p,ALLOW);
  await snap(p,run,'10-second-exchange');await trace(p,run,'before-close');await p.close();
  const local=(await ctx.storageState()).origins.find(o=>o.origin===URL).localStorage.find(i=>i.name==='art-chat-v1:reader-v1');
  const checkpoint=Object.entries(JSON.parse(local.value).components).find(([k])=>JSON.parse(k)[2]===ALLOW)[1];
  assert(!checkpoint.done,'close during initial message delay');run.closedSnapshot=checkpoint;
  p=await ctx.newPage();run.videos.push({source:await p.video().path(),name:'reopening.webm'});
  await open(p);await at(p,'permission.xhtml');await active(p,ALLOW);
  assert.deepEqual(await restoredEntry(p,ALLOW),checkpoint.progress);await snap(p,run,'11-incomplete-reopening');
  await p.keyboard.press('ArrowRight');await p.keyboard.press('ArrowLeft');await p.keyboard.press('ArrowRight');await p.keyboard.press('ArrowLeft');
  await at(p,'permission.xhtml');await active(p,ALLOW);
  await p.evaluate(()=>primeExperiment.staleProbe());
  await p.waitForFunction(()=>primeExperiment.records.some(r=>r.owner==='primary' && r.progress?.rejected===2));
  await phase(p,'typing',ALLOW);await snap(p,run,'12-second-typing');await phase(p,'complete',ALLOW);
  const second=await snap(p,run,'13-second-complete');assert.equal(second.shown.length,2);assert(second.text.includes('You can ask. Just this drawing for now.'));assert(second.text.includes('What colour shall the bird be, Robin?'));
  await turn(p,'next','after.xhtml');const after=await snap(p,run,'14-prose-after');assert(after.text.includes('“Blue.”'));assert(!after.text.includes('Canvas'));
  await turn(p,'prev','permission.xhtml');await active(p,ALLOW);await phase(p,'complete',ALLOW);
  await (await frame(p)).click('#begin');await phase(p,'delay',ALLOW);await snap(p,run,'15-replay-delay');
  await phase(p,'typing',ALLOW);await snap(p,run,'16-replay-typing');await phase(p,'complete',ALLOW);
  await snap(p,run,'17-replay-complete');await trace(p,run,'before-completed-reopen');
  await p.reload();await at(p,'permission.xhtml');await active(p,ALLOW);await phase(p,'complete',ALLOW);await snap(p,run,'18-completed-reopening');
  await (await frame(p)).click('#begin');await phase(p,'delay',ALLOW);await p.emulateMedia({reducedMotion:'reduce'});
  await p.waitForTimeout(200);const reduced=await snap(p,run,'19-dynamic-reduced-motion');assert(reduced.staticVisible);assert.equal(reduced.shown.length,2);
  await trace(p,run,'final');await ctx.close();
  for(const v of run.videos){fs.renameSync(v.source,path.join(dir,v.name));delete v.source;}
 }
 for(const mode of ['reduced-motion','no-script','unsupported-host','late-reveal','invalid-progress','long-message','compact-window']) {
  const ctx=await browser.newContext({viewport:mode==='compact-window'?{width:1024,height:600}:{width:820,height:1180},reducedMotion:mode==='reduced-motion'?'reduce':'no-preference'}),p=await ctx.newPage();
  const query=mode==='no-script'?'&scripts=0':mode==='unsupported-host'?'&bridge=0':mode==='late-reveal'?'&registrationDelay=2000':'';
  await open(p,query);
  if(['no-script','unsupported-host','reduced-motion'].includes(mode)) assert((await (await frame(p)).locator('body').innerText()).includes('then typed'));
  await turn(p,'next','ask.xhtml');const f=await frame(p);
  if(['no-script','unsupported-host','reduced-motion'].includes(mode)) {
   assert(await f.locator('#transcript').isVisible());assert(!(await f.locator('#performance').isVisible()));
   if(mode==='no-script') assert(!(await f.locator('#controls').isVisible()));
   if(mode==='reduced-motion') assert(await f.locator('#begin').isDisabled());
   if(mode==='unsupported-host'){await f.click('#begin');await p.waitForTimeout(1200);assert.equal(await f.locator('#performance .message:visible').count(),1);await f.click('#reveal');assert.equal(await f.locator('#performance .message:visible').count(),2);}
  } else if(mode==='late-reveal') {
   await f.click('#reveal');await active(p);assert((await stored(p)).done,'pre-registration reveal takes precedence over restore');
  } else if(mode==='invalid-progress') {
   await active(p);await p.evaluate(()=> {
    const [key,value]=Object.entries(primeExperiment.saved.components)[0];
    value.progress.shown=99;localStorage.setItem('art-chat-v1:reader-v1',JSON.stringify({...primeExperiment.saved,components:{[key]:value}}));
   });
   await p.reload();await at(p,'ask.xhtml');await active(p);
   assert(await p.evaluate(()=>primeExperiment.trace.some(t=>t.reason==='restore-rejected')));
  } else if(mode==='long-message') {
   await active(p);await f.click('#reveal');
   // Explicit non-manuscript layout stress, outside recorded narrative runs.
   await f.locator('#performance .message').last().locator('.bubble').evaluate(e=>e.textContent='Layout stress fixture. '.repeat(500));
   assert(await f.locator('#performance').evaluate(e=>e.scrollHeight>e.clientHeight && e.scrollWidth<=e.clientWidth));
   await f.focus('#reveal');await p.keyboard.press('ArrowRight');await at(p,'between.xhtml');
  }
  if(mode==='compact-window') {
   await active(p);await f.click('#reveal');
   assert(await f.locator('#controls').evaluate(e=>e.getBoundingClientRect().bottom<=innerHeight+1));
   assert(await f.locator('#surface').evaluate(e=>e.getBoundingClientRect().right<=innerWidth+1));
   await f.focus('#reveal');await p.keyboard.press('ArrowRight');await at(p,'between.xhtml');
  }
  if(mode!=='long-message') await p.screenshot({path:path.join(OUT,mode+'.png')});
  result.checks.push({mode,status:'PASS'});await ctx.close();
 }
 await browser.close();result.status='PASS';fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify(result,null,2)+'\n');console.log('PASS: real Art EPUB lifecycle, phase timing, fallback and layout suite; desktop and responsive tablet');
})().catch(e=>{result.status='FAIL';result.error=e.stack;fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify(result,null,2));console.error(e);process.exit(1);});
