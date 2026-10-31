"""Actual exported reader, Chromium viewport checks; no Apple hardware claim."""
import asyncio, functools, json, pathlib, sys, threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.async_api import async_playwright
async def run(root):
 class Quiet(SimpleHTTPRequestHandler):
  def log_message(self,*args): pass
 server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)))
 threading.Thread(target=server.serve_forever,daemon=True).start()
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
  page=await browser.new_page(viewport={'width':1100,'height':850})
  errors=[];external=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  async def route(r):
   if not r.request.url.startswith(f'http://127.0.0.1:{server.server_port}'):
    external.append(r.request.url);await r.abort()
   else: await r.continue_()
  await page.route('**/*',route)
  page.set_default_timeout(10000)
  page.on('console',lambda m:print('CONSOLE',m.text) if m.type=='error' else None)
  await page.goto(f'http://127.0.0.1:{server.server_port}')
  await page.wait_for_selector('#beat .diagram-surface svg')
  await page.locator('#next').click()
  await page.wait_for_timeout(1000)
  await page.wait_for_selector('#beat .diagram-surface svg')
  await page.wait_for_function('()=>document.getElementById("beat").textContent.includes("A neutral example")')
  if await page.locator('#play').is_enabled(): await page.locator('#play').click()
  await page.wait_for_function('()=>document.querySelectorAll("#beat .diagram-surface svg").length===2')
  await page.wait_for_function('()=>document.getElementById("beat").textContent.includes("Received.")')
  assert 'Received.' in await page.locator('#beat').inner_text()
  assert 'Sender' in await page.locator('#beat .diagram-surface').first.inner_text()
  await page.locator('#beat .wiki-link').click()
  await page.wait_for_function('()=>document.querySelectorAll("dialog article .diagram-surface svg").length===2')
  await page.keyboard.press('Escape')
  await page.locator('#more-toggle').click();await page.locator('#replay').click()
  await page.wait_for_function('()=>document.querySelectorAll("#beat .diagram-surface svg").length===2')
  await page.locator('#next').click()
  await page.wait_for_function('()=>document.querySelector("#beat .diagram-status")?.textContent.includes("unavailable")')
  assert 'const value = 1' in '\n'.join(await page.locator('#beat pre').all_text_contents())
  await page.locator('#previous').click()
  await page.wait_for_function('()=>document.querySelectorAll("#beat .diagram-surface svg").length===2')
  for width in [1024,768,390,320]:
   await page.set_viewport_size({'width':width,'height':800})
   assert await page.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth+1')
  await page.locator('#beat .diagram-surface').first.focus()
  await page.keyboard.press('ArrowRight')
  await page.emulate_media(reduced_motion='reduce',color_scheme='dark')
  for _ in range(4):
   await page.locator('#more-toggle').click();await page.locator('#replay').click();await page.locator('#next').click();await page.locator('#previous').click()
  await page.wait_for_function('()=>document.querySelectorAll("#beat .diagram-surface svg").length===2')
  ids=await page.locator('[id]').evaluate_all('(els)=>els.map(e=>e.id)')
  assert len(ids)==len(set(ids)), 'duplicate IDs'
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
  await page.screenshot(path=str(root.parent/'mermaid-narrow.png'))
  print(json.dumps({'browser':browser.version,'checks':'front matter, flowchart/sequence, multiple diagrams, notes, malformed fallback, code, replay, rapid turns, Previous, 1024/768/390/320px, keyboard focus, reduced motion, unique IDs, no external requests','errors':errors}))
  await browser.close()
 server.shutdown()
asyncio.run(run(pathlib.Path(sys.argv[1])))
