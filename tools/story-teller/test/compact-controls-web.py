"""Synthetic standalone export: real toolbar/disclosure and playback in automated Chrome.
No private book data. Uses virtual time, mouse and emulated touch, not actual devices.
"""
import asyncio,functools,json,pathlib,subprocess,tempfile,threading,sys,re
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.async_api import async_playwright
def contrast(fg,bg):
 def light(value):
  c=[int(n)/255 for n in re.findall(r'\d+',value)[:3]];c=[n/12.92 if n<=.04045 else ((n+.055)/1.055)**2.4 for n in c];return sum(a*b for a,b in zip(c,[.2126,.7152,.0722]))
 a,b=sorted([light(fg),light(bg)]);return (b+.05)/(a+.05)
async def run():
 root=pathlib.Path(tempfile.mkdtemp(prefix='story-compact-'));project=root/'project';(project/'scenes').mkdir(parents=True);(project/'Supporting Content').mkdir()
 title='A very long scene title: café, λ, and the curious adventures of an extraordinarily patient reader'
 source='# '+title+'\n\nOpening prose.\n\n```chat\n@pace deliberate\nA: First message.\nB: Second message.\n```\n\n```typeout\n@format yaml\n@sound modem\n@speed 4\n\nstate: 👩🏽‍🚀 é\n```\n\n[[Detail|Supporting detail]]\n\nFinal paragraph.\n\n---\n\nSecond beat.\n\n```chat\n@pace deliberate\nA: Another message.\n```'
 (project/'scenes/One.md').write_text(source);(project/'scenes/Two.md').write_text('Second scene.\n\n```chat\n@pace deliberate\nA: Last message.\n```')
 (project/'Supporting Content/Detail.md').write_text('# Detail\n\n'+('Readable supporting content. '*200))
 manifest={'schema':'story-teller-project','version':1,'title':'Synthetic compact controls','settings':{'prosePacing':'on'},'parts':[],'scenes':[{'id':'one','partId':None,'label':'1','title':title,'file':'scenes/One.md'},{'id':'two','partId':None,'label':'2','title':'Second scene','file':'scenes/Two.md'}]}
 (project/'story-teller.project.json').write_text(json.dumps(manifest));renderer=pathlib.Path(__file__).resolve().parent.parent
 subprocess.run(['node',str(renderer/'src/web-export.cjs'),str(project),str(root/'site')],check=True,capture_output=True)
 class Quiet(SimpleHTTPRequestHandler):
  def log_message(self,*args):pass
 server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root/'site')));threading.Thread(target=server.serve_forever,daemon=True).start()
 cases=[]
 try:
  async with async_playwright() as p:
   browser=await p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox'])
   for width,height,touch in [(768,1024,True),(1024,768,True),(820,1180,True),(1180,820,True),(390,844,True),(320,568,True),(1100,780,False)]:
    for theme in ['light','dark']:
     ctx=await browser.new_context(viewport={'width':width,'height':height},is_mobile=touch,has_touch=touch,color_scheme=theme);await ctx.add_init_script('''window.__voices={starts:0,stops:0,live:0};const proto=(window.AudioContext||window.webkitAudioContext)?.prototype;if(proto){const original=proto.createOscillator;proto.createOscillator=function(){const node=original.call(this),start=node.start.bind(node),stop=node.stop.bind(node);let active=false;node.start=(...args)=>{start(...args);active=true;__voices.starts++;__voices.live++;};node.stop=(...args)=>{stop(...args);if(active){active=false;__voices.stops++;__voices.live--;}};return node;};}''');page=await ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));await page.goto(f'http://127.0.0.1:{server.server_port}/');await page.wait_for_function('()=>document.querySelector("#status").textContent.includes("ready")');await page.clock.install()
     async def click(selector):
      locator=page.locator(selector)
      if touch:await locator.tap()
      else:await locator.click()
     async def options():
      if not await page.locator('#more-options').is_visible():await click('#more-toggle')
      assert await page.locator('#more-toggle').get_attribute('aria-expanded')=='true'
     async def action(selector):await options();await click(selector);assert not await page.locator('#more-options').is_visible();assert await page.evaluate('document.activeElement.id')=='more-toggle'
     async def phase(expected):assert expected in await page.locator('#status').inner_text(),await page.locator('#status').inner_text()
     assert await page.locator('#scene-title').inner_text()==title
     assert await page.locator('#previous').is_disabled();assert await page.locator('#playback-toggle').get_attribute('aria-label')=='Play';assert not await page.locator('#playback-toggle').is_disabled()
     for selector in ['#previous','#playback-toggle','#next','#sound-toggle','#more-toggle']:
      bounds=await page.locator(selector).bounding_box();assert bounds['width']>=44 and bounds['height']>=44,bounds
      assert await page.locator(selector+' svg[aria-hidden=true]').count()==1
      assert await page.locator(selector).get_attribute('title')==await page.locator(selector).get_attribute('aria-label')
     colours=await page.locator('#sound-toggle').evaluate('e=>({fg:getComputedStyle(e).color,bg:getComputedStyle(e).backgroundColor})')
     assert contrast(colours['fg'],colours['bg'])>=4.5,colours
     # Native keyboard navigation, not custom menu-item arrow keys or a focus trap.
     await page.locator('#more-toggle').focus();await page.keyboard.press('Enter');assert await page.evaluate('document.activeElement.id')=='reveal'
     await page.keyboard.press('Tab');assert await page.evaluate('document.activeElement.id')=='replay'
     await page.keyboard.press('Tab');assert await page.evaluate('document.activeElement.id')=='restart'
     await page.keyboard.press('Tab');assert await page.evaluate('document.activeElement.id')=='playback-speed'
     await page.keyboard.press('Escape');assert not await page.locator('#more-options').is_visible();assert await page.evaluate('document.activeElement.id')=='more-toggle'
     assert await page.locator('#more-toggle').evaluate('e=>getComputedStyle(e).outlineStyle')!='none'
     await options();await page.mouse.click(width-2,height-2);assert not await page.locator('#more-options').is_visible();assert await page.evaluate('document.activeElement.id')=='more-toggle'
     await options();await page.locator('#autoplay').uncheck();await page.locator('#playback-speed').select_option('0.75');assert await page.locator('#more-options').is_visible()
     colours=await page.locator('#more-options').evaluate('e=>({fg:getComputedStyle(e).color,bg:getComputedStyle(e).backgroundColor})');assert contrast(colours['fg'],colours['bg'])>=4.5,colours
     assert await page.locator('#more-options').evaluate('e=>e.scrollWidth<=e.clientWidth')
     r=await page.locator('#more-options').bounding_box();assert r['x']>=0 and r['y']>=0 and r['x']+r['width']<=width+1 and r['y']+r['height']<=height+1,r
     await page.screenshot(path=str(root/f'options-{width}-{theme}.png'),full_page=False)
     await page.keyboard.press('Escape');await phase('ready')
     # Reveal from ready, playing and paused always completes the current beat, never advances.
     for initial in ['ready','playing','paused']:
      await action('#restart');await phase('ready')
      if initial!='ready':
       await click('#playback-toggle');await phase('playing');assert await page.locator('#playback-toggle').get_attribute('aria-label')=='Pause'
       if initial=='paused':await click('#playback-toggle');await phase('paused');assert await page.locator('#playback-toggle').get_attribute('aria-label')=='Resume'
      await action('#reveal');await phase('completed');assert 'Beat 1 of 2' in await page.locator('#status').inner_text();assert 'state: 👩🏽‍🚀 é' in await page.locator('#beat').inner_text();assert await page.locator('#beat .chat li').count()==2;assert await page.locator('#playback-toggle').is_disabled()
      text=await page.locator('#beat').inner_text();await page.clock.run_for(60000);assert await page.locator('#beat').inner_text()==text
     await options();assert await page.locator('#reveal').is_disabled();await page.keyboard.press('Escape')
     # Replay differs from restart, and paused resume preserves visible content.
     await action('#replay');await phase('playing');await page.clock.run_for(900);await click('#playback-toggle');await phase('paused');text=await page.locator('#beat').inner_text();await page.clock.run_for(5000);assert await page.locator('#beat').inner_text()==text
     await click('#playback-toggle');await phase('playing');await action('#reveal');await phase('completed')
     # Reach an active type-out with a single audio voice, then reveal the entire beat.
     await action('#replay')
     for _ in range(100):
      if await page.locator('.typeout-progress.active').count():break
      await page.clock.run_for(250)
     assert await page.locator('.typeout-progress.active').count()==1
     voices=await page.evaluate('__voices');assert voices['live']==1,voices
     await action('#reveal');assert (await page.evaluate('__voices'))['live']==0
     await page.clock.run_for(5000);assert (await page.evaluate('__voices'))['live']==0
     await click('#sound-toggle');assert await page.locator('#sound-toggle').get_attribute('aria-pressed')=='true';assert await page.locator('#sound-toggle').get_attribute('aria-label')=='Unmute sound';assert await page.locator('#sound-toggle').get_attribute('data-icon')=='muted'
     await click('#sound-toggle');assert await page.locator('#sound-toggle').get_attribute('aria-pressed')=='false'
     await click('#next');await phase('ready');assert 'Beat 2 of 2' in await page.locator('#status').inner_text();assert await page.locator('#next').is_disabled()
     await click('#previous');await phase('completed');assert 'Beat 1 of 2' in await page.locator('#status').inner_text()
     await action('#restart');await phase('ready');await options();await page.locator('#autoplay').check();await page.keyboard.press('Escape');await click('#next');await phase('playing')
     await action('#reveal');await click('.beat-ending button');await page.wait_for_function('()=>document.querySelector("#scene-title").textContent==="Second scene"');await phase('playing')
     await click('#previous');await page.wait_for_function('title=>document.querySelector("#scene-title").textContent===title',arg=title);await phase('completed')
     # Disclosure choices persist; the book remains authored, including Unicode.
     await page.reload();await page.wait_for_function('()=>document.querySelector("#status").textContent.includes("ready")');await options();assert await page.locator('#playback-speed').input_value()=='0.75';assert await page.locator('#autoplay').is_checked();await page.keyboard.press('Escape')
     assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
     await page.screenshot(path=str(root/f'controls-{width}-{theme}.png'),full_page=True)
     assert not errors,errors;cases.append({'width':width,'height':height,'theme':theme,'touchEmulated':touch,'result':'pass'});print('PASS',cases[-1],flush=True);await ctx.close()
   await browser.close()
 finally:server.shutdown()
 evidence={'method':'Synthetic actual export, automated Linux Chrome, virtual playback time, keyboard/mouse/emulated touch','cases':cases,'coverage':['ready/playing/paused/completed controls','reveal whole beat without advance, Unicode, cancelled timers','replay versus restart','manual/autoplay turns, scene boundary previous and end-of-scene next','keyboard sequence, Escape, outside dismissal, focus return','44px targets, SVG names/tooltips, long title, light/dark narrow layouts','speed/autoplay persistence','active type-out has one oscillator; reveal stops it and cancelled work stays stopped'],'limitations':['Not actual iPad/Safari or human audio listening'],'artifacts':str(root)}
 destination=pathlib.Path(sys.argv[1]) if len(sys.argv)>1 else root/'compact-controls-validation.json';destination.write_text(json.dumps(evidence,indent=2)+'\n');print(json.dumps(evidence,indent=2))
asyncio.run(run())
