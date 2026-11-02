"""Actual HTTP reader: complete prepared media in three formatted typeouts."""
import asyncio, functools, json, pathlib, sys, threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.async_api import async_playwright
async def run(root,evidence):
 class Quiet(SimpleHTTPRequestHandler):
  def log_message(self,*args):pass
 server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)))
 threading.Thread(target=server.serve_forever,daemon=True).start()
 evidence.mkdir(parents=True,exist_ok=True)
 origin=f'http://127.0.0.1:{server.server_port}'
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
  page=await browser.new_page(viewport={'width':1100,'height':850})
  errors=[];requests=[];diagnostics=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('request',lambda r:requests.append(r.url))
  await page.add_init_script("window.mediaDiagnostics=[];document.addEventListener('story-diagram-diagnostic',e=>window.mediaDiagnostics.push({line:e.detail.line,message:e.detail.message}));")
  await page.goto(origin+'/')
  await page.wait_for_function('()=>document.querySelectorAll("[data-media-ready=true]").length===3')
  assert await page.locator('#beat .formatted-component').count()==0
  assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  assert await page.evaluate('document.documentElement.scrollHeight<=innerHeight+100')
  assert await page.locator('.formatted-preparation svg').count()==6
  await page.clock.install()
  await page.locator('#playback-toggle').click();await page.clock.run_for(100)
  component=page.locator('#beat .formatted-component').first
  assert await component.locator('img').count()==4
  assert await component.locator('img').evaluate_all('(images)=>images.every(i=>i.complete&&i.naturalWidth===720)')
  assert await component.locator('[data-janus-unit]:not(.formatted-future)').count()==1
  assert await component.evaluate('(e)=>e.getBoundingClientRect().height<400')
  ids=await component.locator('svg').evaluate_all('(svg)=>svg.map(s=>s.id)')
  await page.locator('#playback-toggle').click();await page.clock.run_for(5000)
  assert await component.locator('[data-janus-unit]:not(.formatted-future)').count()==1
  await page.locator('#more-toggle').click();await page.locator('#playback-speed').select_option('1.5');await page.locator('#playback-toggle').click()
  await page.clock.run_for(650)
  image=component.locator('.story-figure img').first
  assert await image.evaluate('(e)=>!e.closest(".formatted-future")')
  assert ids==await component.locator('svg').evaluate_all('(svg)=>svg.map(s=>s.id)')
  await page.clock.run_for(2200)
  await page.set_viewport_size({'width':375,'height':800})
  diagram=component.locator('.diagram-surface').first
  assert not await diagram.evaluate('(e)=>Boolean(e.closest(".formatted-future"))')
  await diagram.dispatch_event('wheel',{'deltaX':50,'deltaY':0})
  await diagram.evaluate('(e)=>e.scrollLeft=50')
  inspected=await diagram.evaluate('(e)=>e.scrollLeft');assert inspected>0
  table_widths=await component.locator('col').evaluate_all('(cols)=>cols.map(c=>c.style.width)')
  await page.clock.run_for(1000)
  assert inspected==await diagram.evaluate('(e)=>e.scrollLeft')
  assert table_widths==await component.locator('col').evaluate_all('(cols)=>cols.map(c=>c.style.width)')
  await page.set_viewport_size({'width':1100,'height':850})
  await page.clock.run_for(60000)
  await page.wait_for_function('()=>document.getElementById("status").textContent.includes("completed")')
  assert await page.locator('#beat .formatted-component').count()==3
  assert await page.locator('#beat .formatted-component img').count()==12
  assert await page.locator('#beat svg').count()==6
  assert await page.locator('#beat .formatted-component img').evaluate_all('(images)=>images.every(i=>i.complete&&i.naturalWidth>0)')
  assert ids==await component.locator('svg').evaluate_all('(svg)=>svg.map(s=>s.id)')
  assert await page.locator('#beat .typeout-janus-log .story-diagram').first.get_attribute('data-diagram-look')=='handDrawn'
  assert await page.locator('#beat .typeout-janus .story-diagram').first.get_attribute('data-diagram-look')=='classic'
  assert await page.locator('#beat .typeout-annotation [data-story-segment]').count()>10
  assert await page.locator('#beat .typeout-annotation [data-story-atomic]').count()==6
  assert await page.locator('#beat figcaption').count()==6
  all_ids=await page.locator('[id]').evaluate_all('(nodes)=>nodes.map(n=>n.id)');assert len(all_ids)==len(set(all_ids))
  assert await page.locator('#beat svg title').count()>=3
  assert await page.locator('#beat .formatted-body > [aria-hidden=true]').count()==0
  assert await page.locator('#beat .typeout-annotation th').first.evaluate('(e)=>e.getBoundingClientRect().width>80')
  note=page.locator('#beat .typeout-annotation button.wiki-link')
  assert await note.get_attribute('aria-label')=='Read the media note'
  await note.focus();await page.keyboard.press('Enter')
  assert 'This note describes the synthetic illustration' in await page.locator('dialog article').inner_text()
  await page.keyboard.press('Escape')
  assert await note.evaluate('(e)=>e===document.activeElement')
  await page.screenshot(path=str(evidence/'desktop.png'),full_page=True)
  await page.set_viewport_size({'width':375,'height':800})
  assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  assert await component.locator('img').first.evaluate('(e)=>e.getBoundingClientRect().width<=e.closest(".formatted-component").getBoundingClientRect().width')
  await page.screenshot(path=str(evidence/'narrow.png'),full_page=True)
  # Theme refresh uses existing per-diagram styles and keeps canonical IDs unique.
  await page.emulate_media(color_scheme='dark')
  await page.wait_for_function('()=>document.querySelectorAll("#beat .story-diagram svg").length===6')
  await page.screenshot(path=str(evidence/'dark-narrow.png'),full_page=True)
  # Replay preparation can be interrupted with Next. No outgoing media returns.
  if not await page.locator('#replay').is_visible():await page.locator('#more-toggle').click()
  await page.locator('#replay').click();await page.locator('#next').click()
  await page.wait_for_function('()=>document.getElementById("status").textContent.includes("completed")')
  assert await page.locator('#beat .image-placeholder').count()==1
  assert 'Missing local illustration' in await page.locator('#beat .image-placeholder').inner_text()
  assert 'This diagram could not be displayed.' in await page.locator('#beat .diagram-status').inner_text()
  assert 'Further analysis continues' in await page.locator('#beat').inner_text()
  diagnostics=await page.evaluate('window.mediaDiagnostics');assert any(d['line']>1 for d in diagnostics)
  await page.locator('#next').click()
  await page.wait_for_function('()=>document.getElementById("status").textContent.includes("completed")')
  assert await page.locator('#beat .component-title').inner_text()=='Legacy media heading'
  assert await page.locator('#beat img').evaluate_all('(images)=>images.every(i=>i.naturalWidth>0)')
  await page.locator('#next').click();await page.clock.run_for(60000)
  assert await page.locator('#beat img,#beat svg').count()==0
  assert 'flowchart TD' in await page.locator('#beat .typeout-progress').inner_text()
  assert not any('yaml-only-secret' in url for url in requests)
  assert not any(not url.startswith(origin) for url in requests)
  await page.locator('#previous').click()
  await page.wait_for_function('()=>document.getElementById("status").textContent.includes("completed")')
  assert await page.locator('#beat svg').count()==1
  await page.emulate_media(reduced_motion='reduce')
  if not await page.locator('#replay').is_visible():await page.locator('#more-toggle').click()
  await page.locator('#replay').click()
  await page.wait_for_function('()=>document.getElementById("status").textContent.includes("completed")')
  assert await page.locator('#beat img').first.evaluate('(e)=>e.naturalWidth>0&&!e.closest(".formatted-future")')
  assert errors==[],errors
  (evidence/'browser.json').write_text(json.dumps({'browser':browser.version,'errors':errors,'diagnostics':diagnostics,'checks':'three formats; images loaded; complete SVG; atomic order; annotation characters; styles; unique IDs; no duplicate media; captions; desktop/narrow/dark; failures; literal YAML; navigation during preparation; replay/Previous/reduced motion'},indent=2))
  await browser.close()
 server.shutdown()
asyncio.run(run(pathlib.Path(sys.argv[1]),pathlib.Path(sys.argv[2] if len(sys.argv)>2 else '/tmp/formatted-media-evidence')))
