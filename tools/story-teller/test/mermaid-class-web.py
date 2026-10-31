"""Full class diagram through the exported reader; Chrome viewport, not device, tests."""
import asyncio, functools, json, pathlib, sys, threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.async_api import async_playwright
async def run(root):
 class Quiet(SimpleHTTPRequestHandler):
  def log_message(self,*args): pass
 server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)))
 threading.Thread(target=server.serve_forever,daemon=True).start()
 baseline='--baseline' in sys.argv
 origin=next((arg.rstrip('/') for arg in sys.argv[2:] if arg.startswith('https://')),f'http://127.0.0.1:{server.server_port}')
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
  page=await browser.new_page(viewport={'width':1200,'height':900},color_scheme='light')
  errors=[];external=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  await page.add_init_script("window.diagramDiagnostics=[];document.addEventListener('story-diagram-diagnostic',e=>window.diagramDiagnostics.push(e.detail));")
  async def route(r):
   if not r.request.url.startswith(origin+'/'):external.append(r.request.url);await r.abort()
   else:await r.continue_()
  await page.route('**/*',route)
  await page.goto(origin+'/')
  if baseline:
   for _ in range(2):
    await page.wait_for_function('()=>document.querySelector("#beat .diagram-status")?.textContent==="This diagram could not be displayed."')
    assert await page.locator('#beat svg').count()==0
    assert await page.locator('#beat pre,#beat details').count()==0
    if _==0:await page.locator('#next').click()
   diagnostics=await page.evaluate('window.diagramDiagnostics')
   assert len(diagnostics)>=2 and all('HTML and resource/CSS' in d['message'] for d in diagnostics)
   print(json.dumps({'mode':'unmodified main 0.14.1 complete exported reader failure','svgCount':0,'readerMessage':'This diagram could not be displayed.','diagnostics':[d['message'] for d in diagnostics],'browser':browser.version}))
  else:
   async def diagram(selector):
    await page.wait_for_selector(selector+' svg')
    text='\n'.join(await page.locator(selector+' svg text').all_text_contents())
    for name in ['Book','Part','Scene','Beat','Component','Image','MermaidDiagram','Text','Chat','Typeout','Renderable','ComponentKind']:
     assert name in text,(name,text)
    for annotation in ['abstract','interface','enumeration']:
     assert '«'+annotation+'»' in text,(annotation,text)
     assert await page.locator(selector+' svg text').filter(has_text='«'+annotation+'»').first.is_visible(),annotation
    for attribute in ['title','author','order','file','index','label','src','alt','source','markdown','viewer','format']:
     assert attribute in text,attribute
    assert '0..*' in text and '1..*' in text
    assert await page.locator(selector+' script,'+selector+' image,'+selector+' a,'+selector+' foreignObject').count()==0
   await diagram('#beat .diagram-surface')
   await page.locator('#beat .wiki-link').click()
   surfaces=page.locator('dialog .diagram-surface')
   await page.wait_for_function('()=>document.querySelectorAll("dialog .diagram-surface svg").length===2')
   for i in range(2):
    text='\n'.join(await surfaces.nth(i).locator('svg text').all_text_contents())
    for annotation in ['abstract','interface','enumeration']:
     assert '«'+annotation+'»' in text
     assert await surfaces.nth(i).locator('svg text').filter(has_text='«'+annotation+'»').first.is_visible()
   await page.keyboard.press('Escape')
   await page.locator('#next').click()
   await diagram('#beat .diagram-surface')
   assert await page.locator('#beat .story-diagram').get_attribute('data-diagram-look')=='handDrawn'
   assert await page.locator('#beat svg .rough-node path').count()>0
   await page.locator('#more-toggle').click();await page.locator('#replay').click();await diagram('#beat .diagram-surface')
   await page.locator('#previous').click();await diagram('#beat .diagram-surface')
   assert await page.locator('#beat svg .rough-node').count()==0
   for width in [1024,768,390,320]:
    await page.set_viewport_size({'width':width,'height':850})
    assert await page.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth+1')
   surface=page.locator('#beat .diagram-surface');await surface.focus();await page.keyboard.press('ArrowRight');await page.wait_for_timeout(200)
   assert await surface.evaluate('(el)=>el.scrollLeft>0')
   await page.emulate_media(color_scheme='dark',reduced_motion='reduce')
   await page.wait_for_function('()=>document.querySelector("#beat .story-diagram").dataset.diagramTheme.startsWith("rgb(238, 238, 238)")')
   await diagram('#beat .diagram-surface')
   for _ in range(3):
    await page.locator('#contents-toggle').click();await page.locator('#contents button',has_text='Return').click()
    await page.locator('#contents-toggle').click();await page.locator('#contents button',has_text='1.1 Structure').click()
   await diagram('#beat .diagram-surface')
   ids=await page.locator('[id]').evaluate_all('(els)=>els.map(el=>el.id)');assert len(ids)==len(set(ids))
   assert await page.locator('#beat pre,#beat details,#beat .diagram-status:not([hidden])').count()==0
   assert not await page.evaluate('window.diagramDiagnostics')
   assert not errors,errors
   assert not external,external
   evidence_dir=root.parent.parent if root.parent.name=='site' else root.parent
   await page.locator('#beat svg text').filter(has_text='«abstract»').first.scroll_into_view_if_needed()
   await page.screenshot(path=str(evidence_dir/'class-diagram-narrow.png'))
   print(json.dumps({'browser':browser.version,'checks':'complete default and hand-drawn class fixture; annotation glyphs and attributes/multiplicities survive SVG sanitization; panels; replay/Previous; rapid scene changes; classic isolation; keyboard overflow; light/dark/reduced motion; 1024/768/390/320px; unique IDs; unchanged presentation; no errors/diagnostics/external requests'}))
  await browser.close()
 server.shutdown()
asyncio.run(run(pathlib.Path(sys.argv[1])))
