"""Actual HTTP export order and PNG decoder checks. No screenshots: optional
private image bytes are verified only in a disposable publication."""
import asyncio,functools,json,pathlib,sys,threading
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.async_api import async_playwright
async def run(root,output):
 class Quiet(SimpleHTTPRequestHandler):
  def log_message(self,*args):pass
 server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)));threading.Thread(target=server.serve_forever,daemon=True).start()
 book=json.loads((root/'publication.json').read_text());expected=['Before','Child','Between','Last','After'];assert [s['title'] for s in book['scenes']]==expected
 evidence={'method':'actual exported directory over HTTP; Linux Chrome','orderedTitles':expected,'unverified':['actual iPad/Safari','actual touch','human listening'],'checks':[]}
 try:
  async with async_playwright() as p:
   browser=await p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox']);evidence['browser']=browser.version
   page=await browser.new_page(viewport={'width':1100,'height':800});errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
   await page.goto(f'http://127.0.0.1:{server.server_port}');await page.wait_for_selector('#beat h1');assert await page.locator('#beat h1').inner_text()=='Fictional import repairs'
   await page.locator('#contents-toggle').click();assert await page.locator('#contents button').all_text_contents()==['Front Matter','1 Before','1.1 Child','2 Between','2.1 Last','3 After'];assert await page.locator('#contents details').count()==2;await page.locator('#contents-toggle').click()
   await page.locator('#next').click()
   for index,title in enumerate(expected):
    await page.wait_for_function('(title)=>document.querySelector("#beat h1")?.textContent===title',arg=title)
    assert await page.locator('#beat h1').count()==1
    if title=='Child':
     await page.wait_for_function('()=>document.querySelector("#beat img")?.naturalWidth>0')
     image=await page.locator('#beat img').evaluate('(image)=>({width:image.naturalWidth,height:image.naturalHeight,shown:image.clientWidth,alt:image.alt})');assert image['shown']>0;assert image['alt']=='A fictional chart.';evidence['PNG']=image
     assert await page.locator('#beat svg,#beat iframe').count()==0
    if index<len(expected)-1:
     await page.wait_for_timeout(450);await page.locator('.beat-ending button').click()
   evidence['checks'].append('Contents and manual reading order include book scenes before/between/after genuine parts, no synthetic part or duplicate heading')
   await page.locator('#previous').click();await page.wait_for_function('()=>document.querySelector("#beat h1")?.textContent==="Last"');assert 'completed' in await page.locator('#status').inner_text()
   await page.locator('#contents-toggle').click();await page.locator('#contents button',has_text='1.1 Child').click();await page.wait_for_function('()=>document.querySelector("#beat img")?.naturalWidth>0')
   await page.set_viewport_size({'width':390,'height':740});assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   evidence['checks'].append('resolved PNG decoded with alias at desktop/narrow widths; unsupported SVG/Markdown not executed/transcluded; Previous and Contents selection work')
   assert not errors,errors;evidence['pageErrors']=errors;await browser.close()
 finally:server.shutdown()
 pathlib.Path(output).write_text(json.dumps(evidence,indent=2)+'\n');print(json.dumps(evidence,indent=2))
asyncio.run(run(pathlib.Path(sys.argv[1]).resolve(),sys.argv[2]))
