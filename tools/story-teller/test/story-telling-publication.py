"""Actual pinned Story Telling book review, over local HTTP or immutable HTTPS.
Private plans/reports and screenshots stay outside site/. No device coverage claim.
"""
import asyncio, json, pathlib, subprocess, sys, functools, threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.async_api import async_playwright

async def run(build, origin=None):
 slug='story-telling';site=build/'site'/slug
 book=json.loads((site/'publication.json').read_text());plan=json.loads((build/'review-plan.json').read_text());timings=json.loads((build/'playback-plan.json').read_text())
 assert book['title']=='Story Telling' and len(book['scenes'])==3 and not book.get('analytics')
 server=None
 if not origin:
  class Quiet(SimpleHTTPRequestHandler):
   def log_message(self,*args):pass
  server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(build/'site')))
  threading.Thread(target=server.serve_forever,daemon=True).start();origin=f'http://127.0.0.1:{server.server_port}'
 origin=origin.rstrip('/');label='https' if origin.startswith('https:') else 'http'
 report={'origin':origin,'slug':slug,'checks':[],'unverified':['Actual iPad/iPhone/Safari','Human screen-reader use','Human audio listening']}
 functions=json.loads(subprocess.check_output(['node','-e',"const p=require('./test/mermaid-style-probe.cjs');process.stdout.write(JSON.stringify(Object.fromEntries(Object.entries(p).map(([k,v])=>[k,v.toString()]))))"],cwd=pathlib.Path(__file__).resolve().parent.parent))
 probe='()=>{const sampleStyles='+functions['sampleStyles']+';const contrast='+functions['contrast']+';const assertStyles='+functions['assertStyles']+';const assert={ok(value,message){if(!value)throw Error(message);}};const sample=sampleStyles(document);if(sample)assertStyles(assert,sample);return sample;}'
 errors=[];failed=[];external=[];diagrams=[];visited=set();beat_count=0;messages=0;typeouts=0;image_refs=0
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']);report['browser']=browser.version
  async def context(**kwargs):
   ctx=await browser.new_context(**kwargs)
   await ctx.add_init_script("window.reviewViolations=[];window.diagramDiagnostics=[];document.addEventListener('securitypolicyviolation',e=>window.reviewViolations.push(e.effectiveDirective));document.addEventListener('story-diagram-diagnostic',e=>window.diagramDiagnostics.push(e.detail));")
   async def route(r):
    if not r.request.url.startswith(origin+'/'):external.append(r.request.url);await r.abort()
    else:await r.continue_()
   await ctx.route('**/*',route)
   page=await ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('requestfailed',lambda r:failed.append({'url':r.url,'failure':r.failure}));page.on('response',lambda r:failed.append({'url':r.url,'status':r.status}) if r.status>=400 and not r.url.endswith('/favicon.ico') else None)
   await page.goto(origin+'/'+slug+'/');await page.wait_for_selector('#beat h1')
   return ctx,page
  async def preference(page,selector,value):
   if not await page.locator('#more-options').is_visible():await page.locator('#more-toggle').click()
   if selector=='#autoplay':await page.locator(selector).set_checked(value)
   else:await page.locator(selector).select_option(value)
   await page.keyboard.press('Escape')
  async def select(page,item):
   await page.locator('#contents-toggle').click();name=(item['label']+' ' if item['kind']=='scene' else '')+item['title']
   await page.locator('#contents button').get_by_text(name,exact=True).click()
   await page.wait_for_function('id=>Object.values(localStorage).some(v=>{try{return JSON.parse(v).sourceUri===id}catch{return false}})',arg=item['id'])
  async def reveal(page):
   await page.locator('#more-toggle').click();await page.locator('#reveal').click()
   await page.wait_for_function('()=>document.getElementById("status").textContent.includes("completed")')
  async def notes(page,target,scope='#beat'):
   if target in visited:return
   link=page.locator(scope+f' button.wiki-link[data-story-target={json.dumps(target)}]:visible').first
   await link.focus();await page.wait_for_selector('.supporting-preview:not([hidden])')
   await link.press('Enter');await page.wait_for_selector('dialog[open]')
   title=book['notes'][book['targets'][target]['id']]['title']
   await page.wait_for_function('title=>document.querySelector("dialog header h2").textContent===title',arg=title)
   assert await page.locator('dialog .supporting-warning').count()==0
   visited.add(target)
   onward=await page.locator('dialog article .wiki-link').evaluate_all('els=>[...new Set(els.map(e=>e.dataset.storyTarget))]')
   for child in onward:
    if child not in visited:
     await notes(page,child,'dialog article');await page.locator('dialog header button').filter(has_text='Back').click()
     await page.wait_for_function('title=>document.querySelector("dialog header h2").textContent===title',arg=title)
  by_id={item['id']:item for item in book['readingOrder']}
  for theme in ['light','dark']:
   visited.clear()
   ctx,page=await context(viewport={'width':1280,'height':900},color_scheme=theme,reduced_motion='reduce')
   assert await page.locator('#beat h1').inner_text()=='Story Telling'
   await preference(page,'#autoplay',False);await page.clock.install()
   for scene,time_scene in zip(plan,timings):
    await select(page,by_id[scene['id']])
    for index,(beat,timing) in enumerate(zip(scene['beats'],time_scene['beats'])):
     if index:await page.locator('#next').click()
     await page.locator('#playback-toggle').click();await page.clock.run_for(timing['reducedMotionDuration']+200)
     await page.wait_for_function('()=>document.getElementById("status").textContent.includes("completed")')
     assert await page.locator('#warnings').inner_text()==''
     speakers=await page.locator('#beat .chat li strong').all_text_contents();texts=await page.locator('#beat .chat li p').all_text_contents()
     assert speakers==[m['speaker']for m in beat['chats']] and texts==[m['text']for m in beat['chats']],(scene['title'],index)
     for i,output in enumerate(beat['typeouts']):
      progress=page.locator('#beat .typeout-progress').nth(i)
      text=await progress.locator('[data-story-segment]').evaluate_all("els=>els.map(e=>e.firstChild.textContent).join('')") if output['format']=='annotation' else await progress.text_content();assert text==output['text'],(scene['title'],index,output['format'],text,output['text'])
     assert await page.locator('#beat .image-placeholder').count()==0
     await page.wait_for_function('()=>[...document.querySelectorAll("#beat img")].every(i=>i.complete&&i.naturalWidth>0)')
     if beat['diagrams']:
      await page.wait_for_selector('#beat .diagram-surface svg')
      sample=await page.evaluate(probe);assert sample
      assert await page.locator('#beat .story-diagram details,#beat .story-diagram pre,#beat .diagram-description').count()==0
      if beat['diagrams'][0]['kind']=='class':
       assert await page.locator('#beat svg .rough-node path').count()>0
       assert any('«abstract»' in t['text']for t in sample['texts'])
      await page.locator('#beat .diagram-surface').scroll_into_view_if_needed()
      await page.screenshot(path=str(build/f'{label}-{theme}-diagram-{index}.png'))
      diagrams.append({'theme':theme,'beat':index,'stylesApplied':True,'textFills':sorted({x['fill']for x in sample['texts']}),'arrowStrokes':sorted({x['stroke']for x in sample['arrows']})})
     targets=await page.locator('#beat .wiki-link:visible').evaluate_all('els=>[...new Set(els.map(e=>e.dataset.storyTarget))]')
     for target in targets:
      if target not in visited:
       await notes(page,target);await page.screenshot(path=str(build/f'{label}-{theme}-supporting.png'));await page.locator('[aria-label="Close supporting note"]').click()
     if theme=='light':beat_count+=1;messages+=len(beat['chats']);typeouts+=len(beat['typeouts']);image_refs+=await page.locator('#beat img').count()
    # Exercise the real document-turn action, not only Contents selections.
    destination=book['readingOrder'][book['readingOrder'].index(by_id[scene['id']])+1]
    await page.locator('#beat .beat-ending button').click()
    await page.wait_for_function('id=>Object.values(localStorage).some(v=>{try{return JSON.parse(v).sourceUri===id}catch{return false}})',arg=destination['id'])
    if destination['kind']=='back':
     assert 'Book matter' in await page.locator('#status').inner_text()
     await page.locator('#previous').click()
     await page.wait_for_function('()=>document.getElementById("status").textContent.includes("completed")')
     assert f"Beat {len(scene['beats'])} of {len(scene['beats'])}" in await page.locator('#status').inner_text()
   for item in [book['readingOrder'][0],book['readingOrder'][-1]]:
    await select(page,item);assert 'Book matter' in await page.locator('#status').inner_text();assert await page.locator('#beat').inner_text()
   assert not await page.evaluate('window.reviewViolations')
   assert not await page.evaluate('window.diagramDiagnostics')
   await ctx.close()
  assert visited==set(book['targets']),visited
  # Real-time playback and persisted preferences, without virtual time/reduced motion.
  ctx,page=await context(viewport={'width':1100,'height':850},color_scheme='light')
  await page.locator('#next').click();await page.wait_for_function('()=>document.getElementById("status").textContent.includes("playing")')
  assert 'On' in await page.locator('#status').inner_text()
  await preference(page,'#autoplay',False)
  example=next(item for item in book['readingOrder']if item['title']=='Example')
  async def example_beat(index):
   await select(page,example)
   for _ in range(index):await page.locator('#next').click()
  await example_beat(2);await page.locator('#playback-toggle').click()
  await page.locator('#beat .wiki-link:visible').first.click();assert 'paused' in await page.locator('#status').inner_text()
  await page.locator('[aria-label="Close supporting note"]').click();assert 'paused' in await page.locator('#status').inner_text()
  await example_beat(3);await page.locator('#playback-toggle').click();await page.wait_for_selector('#beat .chat li')
  await page.locator('#playback-toggle').click();held=await page.locator('#beat .chat li').count();await page.wait_for_timeout(250);assert await page.locator('#beat .chat li').count()==held
  await example_beat(6);await page.locator('#playback-toggle').click()
  await page.wait_for_function('()=>document.querySelector("#beat .typeout-progress")?.textContent.length>0')
  await page.locator('#playback-toggle').click();held=await page.locator('#beat .typeout-progress').text_content();await page.wait_for_timeout(250);assert await page.locator('#beat .typeout-progress').text_content()==held
  await preference(page,'#playback-speed','0.75');assert 'paused' in await page.locator('#status').inner_text()
  await page.locator('#playback-toggle').click();await page.wait_for_function('held=>document.querySelector("#beat .typeout-progress").textContent.length>held',arg=len(held))
  await page.locator('#more-toggle').click();await page.locator('#replay').click();assert await page.locator('#beat .typeout-progress').count()==0
  await page.locator('#sound-toggle').click();state=await page.evaluate('Object.values(localStorage).map(v=>JSON.parse(v)).find(v=>v.sourceUri)')
  await page.reload();await page.wait_for_function('()=>document.getElementById("status").textContent.includes("ready")')
  assert await page.locator('#playback-speed').input_value()=='0.75' and not await page.locator('#autoplay').is_checked()
  assert await page.locator('#sound-toggle').get_attribute('aria-pressed')=='true'
  restored=await page.evaluate('Object.values(localStorage).map(v=>JSON.parse(v)).find(v=>v.sourceUri)');assert restored['sourceUri']==state['sourceUri']and restored['index']==state['index']
  await ctx.close()
  # Narrow and tablet-sized viewports: both actual diagrams, image, panels and menu.
  ctx,page=await context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,color_scheme='dark')
  await preference(page,'#autoplay',False)
  for index in [7,8,9]:
   await example_beat(index);await reveal(page)
   if index in [8,9]:await page.wait_for_selector('#beat svg');await page.evaluate(probe)
   for width in [1024,768,390,320]:
    await page.set_viewport_size({'width':width,'height':844});assert await page.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth+1')
   if index==9:
    surface=page.locator('#beat .diagram-surface');await surface.evaluate('el=>el.scrollLeft=0');await surface.focus();await page.keyboard.press('ArrowRight');await page.wait_for_timeout(200);assert await surface.evaluate('el=>el.scrollLeft>0')
   await page.screenshot(path=str(build/f'{label}-narrow-{index}.png'))
  await example_beat(2);await reveal(page);await page.locator('#beat .wiki-link:visible').first.tap();await page.wait_for_selector('dialog[open]');await page.locator('[aria-label="Close supporting note"]').tap()
  for _ in range(3):await select(page,book['readingOrder'][1]);await select(page,example)
  for asset in (site/'assets').iterdir():
   dimensions=await page.evaluate('async url=>{const i=new Image();i.src=url;await i.decode();return [i.naturalWidth,i.naturalHeight]}',origin+'/'+slug+'/assets/'+asset.name);assert all(dimensions)
  await ctx.close();await browser.close()
 assert not errors,errors
 assert not failed,failed
 assert not external,external
 report.update({'beats':beat_count,'messages':messages,'typeouts':typeouts,'imageReferences':image_refs,'decodedAssets':len(list((site/'assets').iterdir())),'supportingTargets':sorted(visited),'diagrams':diagrams,'errors':errors,'failed':failed,'external':external,'checks':['all five documents and 17 beats; normal Play sequence with virtual time in both themes','authored chat and typeout wording; pacing; images; all notes and recursive Back','real-time pause/resume/chat/typeout/replay; note pauses and stays paused on close','autoplay/front-to-story; speed/mute/preferences/location restore ready','Mermaid computed fills/strokes/text contrast; connectors; abstract annotation; actual roughjs class; no source controls','1024/768/390/320px, keyboard diagram overflow, emulated touch panels, rapid scenes']})
 (build/f'guide-browser-{label}.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k not in ['checks','diagrams']},indent=2))
 if server:server.shutdown()

asyncio.run(run(pathlib.Path(sys.argv[1]),sys.argv[2] if len(sys.argv)>2 else None))
