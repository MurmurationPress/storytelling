"""HTTP sizing regression; --baseline records the unfixed PR for comparison."""
import asyncio,functools,json,pathlib,sys,threading
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.async_api import async_playwright
probe=(pathlib.Path(__file__).with_name('formatted-sizing-probe.cjs')).read_text().split('module.exports=')[0]
def check(rows):
 assert len(rows)==3,rows
 for r in rows:
  image=r['image'];assert image['naturalWidth']==1000 and image['naturalHeight']==1800,r
  assert abs(image['width']-r['body']['width'])<=2,r
  assert abs(r['wrapper']['width']-r['body']['width'])<=2,r
  assert abs(image['height']/image['width']-1.8)<.02,r
  assert image['maxHeight']=='none' and image['height']>192,r
  assert r['inline']['height']<=192.1 and r['cell']['height']<=192.1,r
  assert r['inline']['width']<r['body']['width']*.6 and r['cell']['width']<r['body']['width']*.6,r
  d=r['diagram'];assert d and d['width']>=d['viewBox']-2 and d['width']>1200,r
  assert d['textSize']>=15 and d['surface']['width']<=r['body']['width']+2,r
async def run(root,evidence,baseline):
 class Quiet(SimpleHTTPRequestHandler):
  def log_message(self,*args):pass
 server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)));threading.Thread(target=server.serve_forever,daemon=True).start();evidence.mkdir(parents=True,exist_ok=True)
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']);report={'browser':browser.version,'baseline':baseline,'layouts':{}}
  for width in [1100,375]:
   page=await browser.new_page(viewport={'width':width,'height':850});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   await page.add_init_script(probe+'\ndocument.addEventListener("DOMContentLoaded",()=>captureSizingPreparation(document));')
   await page.goto(f'http://127.0.0.1:{server.server_port}/')
   await page.wait_for_function('()=>document.querySelectorAll("[data-media-ready=true]").length===3')
   prepared=await page.evaluate('document.sizingPreparation');assert len(prepared)==3,prepared
   assert all(r['stageVisibility']=='hidden' for r in prepared)
   if not baseline:check(prepared)
   await page.clock.install();await page.locator('#playback-toggle').click();await page.clock.run_for(500);await page.locator('#playback-toggle').click()
   first=page.locator('#beat .formatted-component').first
   assert not await first.locator('.story-figure').first.evaluate('(e)=>Boolean(e.closest(".formatted-future"))')
   assert await first.locator('.story-diagram').first.evaluate('(e)=>Boolean(e.closest(".formatted-future"))')
   columns=await first.locator('col').evaluate_all('(c)=>c.map(e=>e.style.width)')
   # Previous uses the common full, silent preparation path, not a test DOM rewrite.
   await page.locator('#next').click();await page.locator('#previous').click()
   await page.wait_for_function('()=>document.getElementById("status").textContent.includes("completed")')
   rows=await page.evaluate('()=>{'+probe+';return measureSizing(document.getElementById("beat"));}')
   if not baseline:check(rows)
   assert columns==await first.locator('col').evaluate_all('(c)=>c.map(e=>e.style.width)')
   assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
   assert await page.locator('#beat figcaption').count()==6
   # Each phase fits its own available width; native scrollbars may consume
   # viewport width once the tall portrait enters normal document flow.
   await page.locator('#beat .typeout-janus-log').screenshot(path=str(evidence/f'web-{width}.png'))
   diagram=first.locator('.diagram-surface');await diagram.dispatch_event('wheel',{'deltaX':80,'deltaY':0});await diagram.evaluate('(e)=>e.scrollLeft=80')
   left=await diagram.evaluate('(e)=>e.scrollLeft');assert left>0
   await page.clock.run_for(1000);assert left==await diagram.evaluate('(e)=>e.scrollLeft')
   assert errors==[],errors
   report['layouts'][str(width)]={'preparation':prepared,'visible':rows,'errors':errors}
   await page.close()
  (evidence/'web-sizing.json').write_text(json.dumps(report,indent=2));await browser.close()
 server.shutdown()
asyncio.run(run(pathlib.Path(sys.argv[1]),pathlib.Path(sys.argv[2]),'--baseline' in sys.argv))
