"""Computed-style regression under exported reader's real CSP. No device claim."""
import asyncio, functools, json, pathlib, subprocess, sys, threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.async_api import async_playwright
async def run(root):
 class Quiet(SimpleHTTPRequestHandler):
  def log_message(self,*args): pass
 server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)))
 threading.Thread(target=server.serve_forever,daemon=True).start()
 origin=sys.argv[2].rstrip('/') if len(sys.argv)>2 else f'http://127.0.0.1:{server.server_port}'
 tool=pathlib.Path(__file__).resolve().parent.parent
 functions=json.loads(subprocess.check_output(['node','-e',"const p=require('./test/mermaid-style-probe.cjs');process.stdout.write(JSON.stringify(Object.fromEntries(Object.entries(p).map(([k,v])=>[k,v.toString()]))))"],cwd=tool))
 probe='([selector,index])=>{const sampleStyles='+functions['sampleStyles']+';const contrast='+functions['contrast']+';const assertStyles='+functions['assertStyles']+';const assert={ok(value,message){if(!value)throw Error(message);}};const sample=sampleStyles(document,selector,index);if(sample)assertStyles(assert,sample);return sample;}'
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
  page=await browser.new_page(viewport={'width':1200,'height':900},color_scheme='light')
  errors=[];external=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  await page.add_init_script("window.styleViolations=[];document.addEventListener('securitypolicyviolation',e=>window.styleViolations.push({directive:e.effectiveDirective,blocked:e.blockedURI}));")
  async def route(r):
   if not r.request.url.startswith(origin+'/'):external.append(r.request.url);await r.abort()
   else:await r.continue_()
  await page.route('**/*',route)
  await page.goto(origin+'/')
  async def sample(selector='#beat .diagram-surface',index=0):
   for _ in range(100):
    result=await page.evaluate(probe,[selector,index])
    if result:return result
    await page.wait_for_timeout(100)
   raise AssertionError('No stable diagram '+selector)
  evidence={'browser':browser.version,'themes':{}}
  evidence_dir=root.parent.parent if root.parent.name=='site' else root.parent
  for theme in ['light','dark','light']:
   await page.emulate_media(color_scheme=theme,reduced_motion='reduce')
   await page.locator('#contents-toggle').click();await page.locator('#contents button',has_text='1.1 Diagrams').click()
   beats=[]
   for index in range(6):
    s=await sample();beats.append(s)
    if index in [0,2,5]:
     annotation=page.locator('#beat svg text').filter(has_text='abstract')
     if await annotation.count():await annotation.first.scroll_into_view_if_needed()
     else:await page.locator('#beat svg').scroll_into_view_if_needed()
     await page.screenshot(path=str(evidence_dir/f'web-{theme}-{index}.png'))
    if index<5:await page.locator('#next').click()
   await page.locator('#contents-toggle').click();await page.locator('#contents button',has_text='1.1 Diagrams').click();await sample()
   await page.locator('#beat .wiki-link').click()
   panel=[await sample('dialog .diagram-surface',i) for i in range(6)]
   panel_ids=await page.locator('[id]').evaluate_all('(els)=>els.map(e=>e.id)');assert len(panel_ids)==len(set(panel_ids))
   await page.keyboard.press('Escape')
   matter=[]
   for name in ['Front Matter','Back Matter']:
    await page.locator('#contents-toggle').click();await page.locator('#contents button',has_text=name).click()
    matter += [await sample(index=i) for i in range(3)]
   evidence['themes'][theme]={'beats':beats,'panel':panel,'matter':matter}
  await page.locator('#contents-toggle').click();await page.locator('#contents button',has_text='1.1 Diagrams').click();await sample()
  for width in [1024,768,390,320]:
   await page.set_viewport_size({'width':width,'height':850})
   assert await page.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth+1')
  for _ in range(5):await page.locator('#next').click()
  await sample()
  surface=page.locator('#beat .diagram-surface');await surface.evaluate('(el)=>el.scrollLeft=0');await surface.focus();await page.keyboard.press('ArrowRight');await page.wait_for_timeout(200)
  assert await surface.evaluate('(el)=>el.scrollLeft>0')
  for _ in range(3):
   await sample()  # Wait for the destination; Contents changes below remain rapid.
   await page.locator('#more-toggle').click();await page.locator('#replay').click()
   await page.locator('#contents-toggle').click();await page.locator('#contents button',has_text='1.2 Empty').click()
   await page.locator('#contents-toggle').click();await page.locator('#contents button',has_text='1.1 Diagrams').click()
  await sample()
  ids=await page.locator('[id]').evaluate_all('(els)=>els.map(el=>el.id)');assert len(ids)==len(set(ids))
  assert await page.locator('#beat pre,#beat details,#beat .diagram-status:not([hidden])').count()==0
  violations=await page.evaluate('window.styleViolations');assert not violations,violations
  assert not errors,errors
  assert not external,external
  evidence.update({'violations':violations,'errors':errors,'external':external,'checks':'computed leaf-text contrast, fills, strokes, backgrounds, arrows, relationship labels and annotations; default/handDrawn flow/sequence/class; light/dark refresh; beats/panels/matter; replay/rapid scenes; keyboard overflow at 320px; unique IDs; real exported CSP unchanged'})
  (evidence_dir/'web-style-report.json').write_text(json.dumps(evidence,indent=2))
  print(json.dumps({k:v for k,v in evidence.items() if k!='themes'}))
  await browser.close()
 server.shutdown()
asyncio.run(run(pathlib.Path(sys.argv[1])))
