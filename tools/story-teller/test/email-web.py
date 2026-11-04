"""Converted email in an actual HTTP export, using shared annotation controls."""
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
  page=await browser.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  await page.clock.install();await page.goto(f'http://127.0.0.1:{server.server_port}/')
  await page.locator('#playback-toggle').click();await page.clock.run_for(100)
  await page.locator('#playback-toggle').click()
  held=await page.locator('.typeout-progress').inner_text();await page.clock.run_for(1000)
  assert held==await page.locator('.typeout-progress').inner_text()
  await page.locator('#more-toggle').click();await page.locator('#reveal').click()
  themes={}
  for theme in ['light','dark']:
   await page.emulate_media(color_scheme=theme);await asyncio.sleep(.1)
   themes[theme]=await page.locator('.typeout-surface').evaluate('''e=>{const css=getComputedStyle(e);return {fill:css.backgroundColor,text:getComputedStyle(e.querySelector('p')).color,emphasis:getComputedStyle(e.querySelector('em')).color,body:e.innerText};}''')
   assert themes[theme]['fill']==('rgb(233, 235, 237)' if theme=='light' else 'rgb(52, 56, 60)'),themes
   assert themes[theme]['text']==('rgb(32, 33, 36)' if theme=='light' else 'rgb(240, 240, 240)'),themes
   assert themes[theme]['text']==themes[theme]['emphasis']
   assert 'From: Mara' in themes[theme]['body'] and 'Subject: Signal' in themes[theme]['body']
  await page.locator('.typeout-progress button.wiki-link').click()
  assert 'A public landing' in await page.locator('dialog article').inner_text()
  assert errors==[],errors
  print(json.dumps({'browser':browser.version,'themes':themes,'checks':'pause; reveal; formatted headers/body; supporting link; light/dark colours','errors':errors},indent=2))
  await browser.close()
 server.shutdown()
asyncio.run(run(pathlib.Path(sys.argv[1])))
