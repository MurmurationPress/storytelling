"""Inspect a real imported publication over HTTP; desktop/narrow browser, not a device test."""
import asyncio, functools, json, pathlib, sys, threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.async_api import async_playwright
async def run(root):
    class Quiet(SimpleHTTPRequestHandler):
        def log_message(self,*args): pass
    server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    book=json.loads((root/'publication.json').read_text());scene=book['scenes'][0]
    evidence={'method':'Actual GUI-imported project exported and served over HTTP; Linux Chrome','title':scene['title'],'unverified':['actual iPad/Safari','actual touch','human listening'],'checks':[]}
    try:
      async with async_playwright() as p:
        browser=await p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox']);evidence['browser']=browser.version
        page=await browser.new_page(viewport={'width':1100,'height':800});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        await page.goto(f'http://127.0.0.1:{server.server_port}');await page.wait_for_selector('#beat h1')
        assert await page.locator('#beat h1').inner_text()=='An authored opening'
        await page.locator('#next').click()
        await page.wait_for_function('(title)=>document.querySelector("#scene-title")?.textContent===title',arg=scene['title'])
        assert await page.locator('#beat h1').count()==0
        assert await page.locator('#beat h1 em,#beat h1 a,#beat h1 img').count()==0
        assert await page.locator('#scene-title').inner_text()==scene['title']
        assert 'Mara watched' in await page.locator('#beat').inner_text()
        assert 'Beat 1 of 2' in await page.locator('#status').inner_text()
        evidence['checks'].append('one literal header title with punctuation/Unicode, first prose in same beat, redundant matching body title suppressed')
        await page.locator('#contents-toggle').click();assert f'{scene["label"]} {scene["title"]}' in await page.locator('#contents button').all_text_contents();await page.locator('#contents-toggle').click()
        await page.locator('#next').click();await page.wait_for_function('()=>document.getElementById("beat").textContent.includes("She closed the ledger")')
        assert await page.locator('#beat h1').count()==0
        await page.locator('#previous').click();assert await page.locator('#scene-title').inner_text()==scene['title'];assert await page.locator('#beat h1').count()==0;assert 'completed' in await page.locator('#status').inner_text()
        await page.locator('#restart').click();assert await page.locator('#scene-title').inner_text()==scene['title'];assert await page.locator('#beat h1').count()==0;assert 'ready' in await page.locator('#status').inner_text()
        evidence['checks'].append('Contents retains full scene label/title; Next, silent Previous and Restart preserve existing beat semantics')
        await page.set_viewport_size({'width':390,'height':740});assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        await page.screenshot(path=str(pathlib.Path(sys.argv[2]).with_suffix('.png')),full_page=True)
        evidence['checks'].append('390px layout without horizontal overflow')
        assert not errors,errors;evidence['pageErrors']=errors;await browser.close()
    finally:server.shutdown()
    pathlib.Path(sys.argv[2]).write_text(json.dumps(evidence,indent=2)+'\n');print(json.dumps(evidence,indent=2))
asyncio.run(run(pathlib.Path(sys.argv[1]).resolve()))
