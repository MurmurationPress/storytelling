"""Actual HTTP export: message completion gates subtext; no invented typing mode."""
import asyncio,functools,json,pathlib,sys,threading
from datetime import datetime,timedelta,timezone
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.async_api import async_playwright
probe=pathlib.Path(__file__).with_name('chat-subtext-probe.cjs').read_text().split('module.exports=')[0]
async def run(root,evidence):
 class Quiet(SimpleHTTPRequestHandler):
  def log_message(self,*args):pass
 server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)));threading.Thread(target=server.serve_forever,daemon=True).start();evidence.mkdir(parents=True,exist_ok=True)
 origin=f'http://127.0.0.1:{server.server_port}';report={'layouts':{}}
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']);report['browser']=browser.version
  for width in [1100,375]:
   page=await browser.new_page(viewport={'width':width,'height':850});errors=[];requests=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url))
   start=datetime(2030,1,1,tzinfo=timezone.utc);await page.clock.install(time=start);await page.clock.pause_at(start+timedelta(seconds=1));await page.goto(origin+'/');await page.locator('#playback-toggle').click();await page.clock.run_for(500)
   assert await page.locator('.responding').inner_text()=='Companion is responding…'
   assert await page.locator('.chat li,.chat-subtext').count()==0
   await page.emulate_media(reduced_motion='reduce');await asyncio.sleep(.05);assert await page.locator('.chat-subtext').count()==0
   await page.emulate_media(reduced_motion='no-preference');await asyncio.sleep(.05)
   assert 'local state' not in await page.locator('#beat').aria_snapshot()
   await page.screenshot(path=str(evidence/f'web-{width}-waiting.png'),full_page=True)
   await page.locator('#playback-toggle').click();await page.clock.run_for(5000);assert await page.locator('.chat-subtext').count()==0
   await page.locator('#more-toggle').click();await page.locator('#playback-speed').select_option('1.5');await page.locator('#playback-toggle').click()
   await page.clock.run_for(1400);assert await page.locator('.chat-subtext').count()==0 # Explicit first delay never scales.
   await page.clock.run_for(200);assert await page.locator('.chat li').count()==1
   assert await page.locator('.chat-subtext').inner_text()=='local state'
   assert await page.locator('.chat li > p').first.inner_text()=='Limited continuity. External context unavailable.'
   await page.locator('#playback-toggle').click()
   accessible=await page.locator('.chat').aria_snapshot()
   assert accessible.count('local state')==1 and accessible.index('Limited continuity.')<accessible.index('local state')
   await page.screenshot(path=str(evidence/f'web-{width}-message.png'),full_page=True)
   await page.reload();await page.wait_for_function('()=>document.getElementById("status").textContent.includes("ready")')
   assert await page.locator('.chat-subtext').count()==0
   await page.locator('#playback-toggle').click();await page.clock.run_for(60000)
   assert 'completed' in await page.locator('#status').inner_text()
   rows=await page.evaluate('()=>{'+probe+';return probeChatSubtext(document);}')
   assert len(rows)==5 and [r['subtext'] is not None for r in rows]==[True,True,False,False,True],rows
   assert rows[0]['speaker']==rows[1]['speaker']=='Companion' and rows[0]['subtext']!=rows[1]['subtext']
   assert rows[2]['outgoing'] and rows[2]['status']=='✓✓'
   for row in rows:
    if row['subtext'] is not None:assert row['contrast']>=4.5 and row['fontSize']>=14 and row['fontSize']<row['bodySize'] and row['associated'] and row['inside'] and not row['ariaHidden'] and not row['live'],row
   assert await page.locator('.chat script').count()==0
   assert '<script>literal</script>' in rows[-1]['subtext'] and '@pause 900ms is metadata text.' in rows[-1]['subtext']
   assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
   await page.screenshot(path=str(evidence/f'web-{width}-complete.png'),full_page=True)
   note=page.locator('.chat-subtext button.wiki-link');await note.focus();await page.keyboard.press('Enter')
   assert 'labels information retained' in await page.locator('dialog article').inner_text();await page.keyboard.press('Escape');assert await note.evaluate('(e)=>e===document.activeElement')
   await page.emulate_media(color_scheme='dark');dark=await page.evaluate('()=>{'+probe+';return probeChatSubtext(document);}')
   assert all(r.get('contrast',5)>=4.5 for r in dark),dark
   # Replay cancels metadata immediately; Next cannot receive late outgoing content.
   await page.locator('#more-toggle').click();await page.locator('#replay').click();await page.clock.run_for(500);assert await page.locator('.chat-subtext').count()==0
   await page.locator('#next').click();await page.clock.run_for(60000);assert await page.locator('.chat-subtext').count()==0
   # Reload restores beat/navigation preferences, never a detached stale subtext tree.
   await page.reload();assert await page.locator('.chat-subtext').count()==0
   await page.locator('#previous').click();assert await page.locator('.chat-subtext').count()==3
   await page.emulate_media(reduced_motion='reduce');await asyncio.sleep(.1)
   await page.locator('#more-toggle').click();await page.locator('#replay').click();await page.clock.run_for(1800);assert await page.locator('.chat-subtext').count()==0
   await page.clock.run_for(300);assert await page.locator('.chat-subtext').count()==1
   await page.locator('#more-toggle').click();await page.locator('#reveal').click();assert await page.locator('.chat-subtext').count()==3
   await page.locator('#more-toggle').click();await page.locator('#restart').click();assert await page.locator('.chat-subtext').count()==0
   assert errors==[],errors;assert all(url.startswith(origin) for url in requests)
   report['layouts'][str(width)]={'light':rows,'dark':dark,'firstMessageAccessibility':accessible,'errors':errors,'checks':'responding wait; no early subtext; atomic completion; pause/speed; no extra delay; consecutive speakers; alignment/ticks; literal HTML; note keyboard/focus; reveal/replay/restart/Next/Previous/autoplay; restored beat; reduced motion; overflow; contrast'}
   await page.close()
  (evidence/'web.json').write_text(json.dumps(report,indent=2));await browser.close()
 server.shutdown()
asyncio.run(run(pathlib.Path(sys.argv[1]),pathlib.Path(sys.argv[2])))
