"""Actual exported reader, Chromium viewport checks; no Apple hardware claim."""
import asyncio, functools, json, pathlib, sys, threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.async_api import async_playwright
async def run(root):
 class Quiet(SimpleHTTPRequestHandler):
  def log_message(self,*args): pass
 server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)))
 threading.Thread(target=server.serve_forever,daemon=True).start()
 origin=sys.argv[2].rstrip('/') if len(sys.argv)>2 else f'http://127.0.0.1:{server.server_port}'
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
  page=await browser.new_page(viewport={'width':1100,'height':850})
  errors=[];external=[]
  await page.add_init_script("window.diagramDiagnostics=[];document.addEventListener('story-diagram-diagnostic',e=>window.diagramDiagnostics.push(e.detail));")
  page.on('pageerror',lambda e:errors.append(str(e)))
  async def route(r):
   if not r.request.url.startswith(origin):
    external.append(r.request.url);await r.abort()
   else: await r.continue_()
  await page.route('**/*',route)
  page.set_default_timeout(10000)
  page.on('console',lambda m:print('CONSOLE',m.text) if m.type=='error' else None)
  await page.goto(origin+'/')
  await page.wait_for_selector('#beat .diagram-surface svg')
  assert await page.locator('#beat details,#beat pre,#beat summary,.diagram-description').count()==0
  assert await page.locator('#beat .diagram-status:not([hidden])').inner_text()=='This diagram could not be displayed.'
  assert await page.locator('#beat figcaption').inner_text()=='An explicitly authored diagram.'
  await page.locator('#next').click()
  await page.wait_for_timeout(1000)
  await page.wait_for_selector('#beat .diagram-surface svg')
  await page.wait_for_function('()=>document.getElementById("beat").textContent.includes("A neutral example")')
  if await page.locator('#play').is_enabled(): await page.locator('#playback-toggle').click()
  await page.wait_for_function('()=>document.querySelectorAll("#beat .diagram-surface svg").length===2')
  await page.wait_for_function('()=>document.getElementById("beat").textContent.includes("Received.")')
  assert 'Received.' in await page.locator('#beat').inner_text()
  assert 'Satellite image' in await page.locator('#beat .diagram-surface').first.inner_text()
  assert await page.locator('#beat figcaption').inner_text()=='The default signal route.'
  assert await page.locator('#beat details,#beat summary,.diagram-description').count()==0
  assert 'PRIME examines an image of the reserve.' not in await page.locator('#beat').inner_text()
  assert await page.locator('#beat svg desc').first.text_content()=='PRIME examines an image of the reserve.'
  await page.locator('#beat .wiki-link').click()
  await page.wait_for_function('()=>document.querySelectorAll("dialog article .diagram-surface svg").length===2')
  await page.wait_for_function('()=>document.querySelector("dialog .diagram-status:not([hidden])")?.textContent.includes("could not be displayed")')
  assert await page.locator('dialog details,dialog summary,dialog pre,dialog .diagram-description').count()==0
  assert await page.locator('dialog .story-diagram').first.get_attribute('data-diagram-look')=='handDrawn'
  # A hand-drawn flowchart uses roughjs paths instead of classic node rectangles.
  assert await page.locator('dialog .diagram-surface').first.locator('svg .rough-node path').count()>0
  await page.keyboard.press('Escape')
  await page.locator('#more-toggle').click();await page.locator('#replay').click()
  await page.wait_for_function('()=>document.querySelectorAll("#beat .diagram-surface svg").length===2')
  await page.locator('#next').click()
  await page.wait_for_function('()=>document.querySelector("#beat .diagram-status")?.textContent.includes("could not be displayed")')
  assert 'const value = 1' in '\n'.join(await page.locator('#beat pre').all_text_contents())
  await page.locator('#previous').click()
  await page.wait_for_function('()=>document.querySelectorAll("#beat .diagram-surface svg").length===2')
  await page.locator('#next').click();await page.locator('#next').click()
  await page.wait_for_function('()=>document.querySelector("#beat .story-diagram")?.dataset.diagramLook==="handDrawn"')
  assert await page.locator('#beat svg .rough-node path').count()>0
  await page.locator('#previous').click();await page.locator('#previous').click()
  await page.wait_for_function('()=>document.querySelectorAll("#beat .diagram-surface svg").length===2')
  assert await page.locator('#beat .story-diagram').first.get_attribute('data-diagram-look')=='classic'
  assert await page.locator('#beat svg .rough-node').count()==0
  for width in [1024,768,390,320]:
   await page.set_viewport_size({'width':width,'height':800})
   assert await page.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth+1')
  await page.locator('#beat .diagram-surface').first.focus()
  wide=page.locator('#beat .diagram-surface').first
  assert await wide.evaluate('(el)=>el.scrollWidth>el.clientWidth')
  await page.keyboard.press('ArrowRight')
  await page.wait_for_timeout(200)
  assert await wide.evaluate('(el)=>el.scrollLeft>0')
  old_token=await page.locator('#beat .story-diagram').first.get_attribute('data-diagram-token')
  await page.emulate_media(reduced_motion='reduce',color_scheme='dark')
  await page.wait_for_function('(old)=>document.querySelector("#beat .story-diagram").dataset.diagramToken!==old',arg=old_token)
  await page.wait_for_function('()=>document.querySelectorAll("#beat .diagram-surface svg").length===2')
  assert await page.locator('#beat .story-diagram').first.evaluate('(el)=>getComputedStyle(el).color')=='rgb(238, 238, 238)'
  for _ in range(4):
   await page.locator('#more-toggle').click();await page.locator('#replay').click();await page.locator('#next').click();await page.locator('#previous').click()
  await page.wait_for_function('()=>document.querySelectorAll("#beat .diagram-surface svg").length===2')
  ids=await page.locator('[id]').evaluate_all('(els)=>els.map(e=>e.id)')
  assert len(ids)==len(set(ids)), 'duplicate IDs'
  assert await page.evaluate('window.diagramDiagnostics.some(d=>d.source.includes("broken [") && d.line>0 && d.message.includes("Parse error"))')
  assert not errors,errors
  assert not external,external
  await page.locator('#contents-toggle').click()
  await page.locator('#contents button',has_text='Other').click()
  await page.wait_for_function('()=>document.getElementById("beat").textContent.includes("Another scene")')
  await page.wait_for_selector('#beat .diagram-surface svg')
  await page.locator('#contents-toggle').click()
  await page.locator('#contents button',has_text='Back Matter').click()
  await page.wait_for_function('()=>document.getElementById("beat").textContent.includes("End of example")')
  await page.wait_for_selector('#beat .diagram-surface svg')
  await page.wait_for_function('()=>document.querySelector("#beat .diagram-status:not([hidden])")?.textContent.includes("could not be displayed")')
  assert await page.locator('#beat details,#beat pre,#beat summary,.diagram-description').count()==0
  await page.screenshot(path=str(root.parent/'mermaid-narrow.png'))
  print(json.dumps({'browser':browser.version,'checks':'simplified beats/panels/front/back matter incl failures; explicit captions; accessible descriptions not prose; default and actual roughjs handDrawn SVG; isolation; ordinary text; code fences; replay and rapid scene/beat turns; 1024/768/390/320px; keyboard horizontal scrolling; light/dark refresh and reduced motion; author diagnostics; unique IDs; no external requests','errors':errors}))
  await browser.close()
 server.shutdown()
asyncio.run(run(pathlib.Path(sys.argv[1])))
