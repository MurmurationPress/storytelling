/* Integration tests against the actual EPUB.js browser renderer and real EPUB. */
const {chromium} = require('playwright');
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const ROOT=__dirname, OUT=path.join(ROOT,'evidence');
const url=process.env.READER_URL || 'http://127.0.0.1:4173';
fs.mkdirSync(OUT,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const results={build:JSON.parse(fs.readFileSync(path.join(ROOT,'publication/build.json'),'utf8')),date:new Date().toISOString(),platform:process.platform,toolkit:'epubjs 0.3.93',runs:[]};
async function shell(page, query='') {
  page.on('pageerror',error=>{throw error;});
  await page.goto(url+'/'+query);
  await page.waitForFunction(()=>primeExperiment.ready && primeExperiment.location && primeExperiment.trace.some(t=>t.event==='display-committed'));
  assert.equal(await page.locator('#error').textContent(),'');
}
async function location(page,href) {
  await page.waitForFunction(h=>primeExperiment.location?.start.href===h && !document.querySelector('#reader').classList.contains('transitioning'),href);
}
async function turn(page,direction,href) { await page.click(direction==='next'?'#next':'#previous'); await location(page,href); }
async function stateFrame(page) { return await (await page.locator('#reader iframe').elementHandle()).contentFrame(); }
async function primary(page) { return page.evaluate(()=>primeExperiment.records.find(r=>r.owner==='primary')); }
async function active(page) { await page.waitForFunction(()=>primeExperiment.records.some(r=>r.owner==='primary' && r.progress?.active)); }
async function snap(page,run,name,check=true) {
  const f=await stateFrame(page);
  const data=await f.evaluate(()=> {
    const c=document.getElementById('complete'),o=document.getElementById('output'),s=document.getElementById('surface');
    return {time:performance.now(),prefix:o?.textContent,full:c?.textContent,
      completeOpacity:c && getComputedStyle(c).opacity,outputDisplay:o && getComputedStyle(o).display,
      surface:s?.getBoundingClientRect().toJSON(),complete:c?.getBoundingClientRect().toJSON(),
      controls:document.getElementById('controls')?.getBoundingClientRect().toJSON(),
      textFits:c ? c.scrollWidth<=c.clientWidth : true,
      viewport:{width:innerWidth,height:innerHeight},body:document.body.textContent,
      image:(()=>{const img=document.querySelector('.map img');return img ? {rect:img.getBoundingClientRect().toJSON(),loaded:img.complete && img.naturalWidth>0} : null;})()};
  });
  data.hostTime=await page.evaluate(()=>performance.now());
  data.name=name;
  if (check && data.prefix) {
    assert(data.full.startsWith(data.prefix));
    assert.equal(data.completeOpacity,'0','complete text must not show behind prefix');
    assert.equal(data.outputDisplay,'block');
  }
  if (data.complete) {
    assert(data.textFits,'YAML must not overflow its reserved width');
    assert(data.complete.right<=data.viewport.width+1,'state right bound');
    assert(data.controls.bottom<=data.viewport.height+1,'controls bottom bound');
  }
  if (data.image) {
    assert(data.image.loaded,'original image loaded');
    assert(data.image.rect.right<=data.viewport.width+1 && data.image.rect.bottom<=data.viewport.height+1,'image bounds');
  }
  await page.screenshot({path:path.join(OUT,run.id,name+'.png')});
  run.samples.push(data);
  return data;
}
async function saveTrace(page,run,label) { run.traces.push({label,trace:await page.evaluate(()=>primeExperiment.trace)}); }
(async()=> {
 const browser=await chromium.launch(); results.browser=browser.version();
 for(const viewport of [{width:1280,height:800},{width:820,height:1180}]) {
  const id=viewport.width===1280?'linux-desktop':'tablet-responsive';
  fs.mkdirSync(path.join(OUT,id),{recursive:true});
  const context=await browser.newContext({viewport,recordVideo:{dir:path.join(OUT,id),size:viewport}});
  const run={id,viewport,samples:[],traces:[],checks:[],videos:[]};results.runs.push(run);
  let page=await context.newPage();
  run.videos.push({source:await page.video().path(),name:'reading.webm'});
  await shell(page,'?preload=1&registrationDelay=350');
  await page.waitForFunction(()=>primeExperiment.records.some(r=>r.owner==='preload' && r.progress));
  await snap(page,run,'01-prose');
  await page.waitForTimeout(7000); // longer than 237/3 *65ms = 5135ms
  const pre=await page.evaluate(()=>primeExperiment.records.find(r=>r.owner==='preload'));
  assert.equal(pre.progress.position,0);assert.equal(pre.progress.active,false);
  assert(!(await page.evaluate(()=>primeExperiment.trace.some(t=>t.owner==='preload' && t.reason==='tick'))));
  run.checks.push('Controlled real-toolkit invisible preload: >7s, zero characters/ticks');
  await turn(page,'next','state.xhtml');
  // delayed registration leaves a blank reserved surface, never full text.
  const blank=await snap(page,run,'02-first-blank');assert.equal(blank.completeOpacity,'0');assert.equal(blank.prefix.length,0,'first encounter remains blank until registration');
  await active(page);
  await (await stateFrame(page)).evaluate(()=> { window.statusMutations=0;new MutationObserver(()=>window.statusMutations++).observe(document.getElementById('status'),{childList:true,subtree:true}); });
  await page.waitForTimeout(650);
  const a=await snap(page,run,'03-prefix-a');
  await page.waitForTimeout(900);const b=await snap(page,run,'04-prefix-b');
  assert.equal(await (await stateFrame(page)).evaluate(()=>window.statusMutations),0,'live status must not be rewritten on every burst');
  assert(a.prefix.length>0 && b.prefix.length>a.prefix.length && b.prefix.length<b.full.length);
  run.checks.push('Blank first encounter then sustained visible prefixes, complete text opacity zero');
  // A focused component control must not swallow the ordinary page-turn key.
  await (await stateFrame(page)).focus('#reveal');await page.keyboard.press('ArrowRight');await location(page,'before-image.xhtml');
  await page.waitForTimeout(150);const left=await page.evaluate(()=>primeExperiment.saved.output.position);
  await page.waitForTimeout(350);assert.equal(await page.evaluate(()=>primeExperiment.saved.output.position),left);
  await turn(page,'prev','state.xhtml');await active(page);
  const resumed=await primary(page);assert(resumed.progress.position>=left && resumed.progress.position<left+12);
  await page.waitForTimeout(650);const q=await snap(page,run,'05-quick-return');assert(q.prefix.length>left);
  await turn(page,'next','before-image.xhtml');
  await page.waitForTimeout(150);const leftLater=await page.evaluate(()=>primeExperiment.saved.output.position);
  await page.waitForTimeout(6500);assert.equal(await page.evaluate(()=>primeExperiment.saved.output.position),leftLater);
  await snap(page,run,'06-prose-after-departure');
  await turn(page,'prev','state.xhtml');await active(page);
  const later=await primary(page);assert(later.progress.position>=leftLater && later.progress.position<leftLater+12);
  await snap(page,run,'07-later-return');
  await page.waitForFunction(()=>primeExperiment.saved.output?.done);
  await snap(page,run,'08-natural-completion');
  run.checks.push('Early focused-control departure stops; quick and >6s later return resume; natural completion');
  await turn(page,'next','before-image.xhtml');await snap(page,run,'09-prose-before-image');
  await turn(page,'next','image.xhtml');await snap(page,run,'10-original-image');
  await turn(page,'next','after-image.xhtml');await snap(page,run,'11-prose-after-image');
  await turn(page,'prev','image.xhtml');await turn(page,'prev','before-image.xhtml');await turn(page,'prev','state.xhtml');await active(page);
  assert((await primary(page)).progress.done);await snap(page,run,'12-completed-return');
  // Replay, reject out-of-order/wrong-instance messages, then close mid-performance.
  await (await stateFrame(page)).click('#begin');await page.waitForTimeout(650);
  await page.evaluate(()=>primeExperiment.staleProbe());
  await page.waitForFunction(()=>primeExperiment.records.some(r=>r.owner==='primary' && r.progress?.rejected===2));
  await page.waitForTimeout(350);
  await snap(page,run,'13-before-incomplete-reopen');await saveTrace(page,run,'before-close');
  const closeAt=await page.evaluate(()=>primeExperiment.saved.output.position);assert(closeAt>0);
  run.reopenCheckpoint=closeAt;
  await page.close();
  const stored=(await context.storageState()).origins.find(o=>o.origin===url).localStorage.find(e=>e.name==='planetary-model-encounter-v1:reader-v1');
  const closedPosition=JSON.parse(stored.value).output.position;
  run.closedPosition=closedPosition;assert(closedPosition>=closeAt);
  await sleep(500);
  page=await context.newPage();run.videos.push({source:await page.video().path(),name:'reopening-replay.webm'});await shell(page);await location(page,'state.xhtml');await active(page);
  const restored=await page.evaluate(()=>primeExperiment.trace.find(t=>t.owner==='primary' && t.reason==='enter'));
  run.restoredEnterPosition=restored.position;
  assert.equal(restored.position,closedPosition,'restore must exactly match the persisted checkpoint after the old page actually closed');
  await snap(page,run,'14-incomplete-reopen');
  // Rapid nav commands use actual toolkit turns, without exposing intermediate pages.
  await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowLeft');
  await location(page,'state.xhtml');await active(page);
  run.checks.push('Wrong instance and old sequence rejected; rapid toolkit turns settle correctly; incomplete reopen resumes');
  await (await stateFrame(page)).click('#reveal');await page.waitForFunction(()=>primeExperiment.saved.output.done);
  await snap(page,run,'15-immediate-reveal');
  await saveTrace(page,run,'before-completed-reopen');await page.reload();await location(page,'state.xhtml');await active(page);
  assert((await primary(page)).progress.done);await snap(page,run,'16-completed-reopen');
  // Full uninterrupted replay to measure intended timing from real timer progression.
  await (await stateFrame(page)).click('#begin');
  const replayStart=await page.evaluate(()=>performance.now());
  await page.waitForTimeout(900);await snap(page,run,'17-replay-a');
  await page.waitForTimeout(1500);await snap(page,run,'18-replay-b');
  await page.waitForTimeout(1500);await snap(page,run,'19-replay-c');
  await page.waitForFunction(()=>primeExperiment.saved.output.done);
  const trace=await page.evaluate(()=>primeExperiment.trace);
  const replay=trace.filter(t=>t.reason==='replay' && t.owner==='primary').at(-1);
  const completion=trace.find(t=>t.reason==='complete' && t.instance===replay.instance && t.time>replay.time);
  run.replayDurationMs=completion.time-replay.time;
  assert(run.replayDurationMs>=5100 && run.replayDurationMs<6500,'intended 65ms x79 bursts');
  await snap(page,run,'20-replay-complete');
  // Media change cannot create an unexplained flash or restart.
  await (await stateFrame(page)).click('#begin');await page.waitForTimeout(250);
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>primeExperiment.saved.output.done);
  const reduced=await snap(page,run,'21-dynamic-reduced-motion');assert.equal(reduced.completeOpacity,'1');assert.equal(reduced.outputDisplay,'none');
  run.checks.push('Immediate reveal retained across completed reopen; full replay timing; dynamic reduced-motion static output');
  await saveTrace(page,run,'final');
  await context.close();
  for(const video of run.videos) { fs.renameSync(video.source,path.join(OUT,id,video.name)); delete video.source; }
 }
 // Standalone fallback modes in the actual toolkit, no mocked event callbacks.
 for(const mode of ['reduced-motion','no-publication-script','unsupported-bridge']) {
  const context=await browser.newContext({viewport:{width:1024,height:768},reducedMotion:mode==='reduced-motion'?'reduce':'no-preference'});
  const page=await context.newPage();await shell(page,mode==='no-publication-script'?'?scripts=0':mode==='unsupported-bridge'?'?bridge=0':'');
  await turn(page,'next','state.xhtml');await page.waitForTimeout(500);
  const frame=await stateFrame(page), c=frame.locator('#complete');assert.equal(await c.evaluate(el=>getComputedStyle(el).opacity),'1');
  if(mode==='no-publication-script') assert(await frame.locator('#controls').evaluate(el=>el.hidden));
  if(mode==='unsupported-bridge') {
    await frame.click('#begin');await page.waitForTimeout(800);
    assert((await frame.locator('#output').textContent()).length>0);
    await frame.click('#reveal');assert.equal(await c.evaluate(el=>getComputedStyle(el).opacity),'1');
  }
  if(mode==='reduced-motion') assert(await frame.locator('#begin').isDisabled());
  await page.screenshot({path:path.join(OUT,mode+'.png')});
  results[mode]='PASS';await context.close();
 }
 await browser.close();
 results.status='PASS';fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify(results,null,2)+'\n');
 console.log(JSON.stringify({status:results.status,browser:results.browser,runs:results.runs.map(r=>({id:r.id,replayDurationMs:r.replayDurationMs,checks:r.checks})),fallbacks:[results['reduced-motion'],results['no-publication-script'],results['unsupported-bridge']]},null,2));
})().catch(error=>{results.status='FAIL';results.error=error.stack;fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify(results,null,2));console.error(error);process.exit(1);});
