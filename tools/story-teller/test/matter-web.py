"""HTTP browser integration for static book matter; no device/audio-listening claim."""
import asyncio, functools, json, pathlib, sys, threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.async_api import async_playwright
async def run(root):
    class Quiet(SimpleHTTPRequestHandler):
        def log_message(self,*args): pass
    server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    url=f'http://127.0.0.1:{server.server_port}'
    evidence={'method':'actual exported directory over HTTP; Chrome/Linux','checks':[],'unverified':['actual touch','iPad/Safari','human listening']}
    try:
      async with async_playwright() as p:
        browser=await p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox'])
        evidence['browser']=browser.version
        page=await browser.new_page(viewport={'width':1100,'height':800})
        errors=[]; page.on('pageerror',lambda error:errors.append(str(error)))
        await page.goto(url); await page.wait_for_selector('#beat h1')
        assert await page.locator('#beat h1').inner_text()=='An authored opening'
        assert await page.locator('#play').is_hidden()
        await page.wait_for_function('()=>document.querySelector("#beat img").naturalWidth>0')
        await page.locator('#contents-toggle').click()
        assert await page.locator('#contents button').all_text_contents()==['Front Matter','1.1 Signal','Back Matter']
        await page.locator('#contents-toggle').click()
        evidence['checks'].append('front matter fully displayed; relative image and ordered Contents')
        await page.locator('#beat button.wiki-link').click()
        await page.wait_for_selector('dialog[open]'); assert 'definition' in await page.locator('dialog article').inner_text()
        await page.keyboard.press('Escape')
        assert await page.locator('#beat button.wiki-link').evaluate('(el)=>el===document.activeElement')
        evidence['checks'].append('matter wikilink opens safe supporting panel and restores focus')
        await page.locator('#next').click()
        await page.wait_for_function('()=>document.getElementById("status").textContent.includes("playing")')
        await page.wait_for_timeout(250)
        frames=[]
        for _ in range(3):
          frames.append(await page.locator('.typeout-progress').inner_text()); await page.wait_for_timeout(250)
        assert len(frames[0])<len(frames[-1]);evidence['typeoutFrames']=frames
        await page.locator('#previous').click()
        await page.wait_for_selector('#beat h1')
        assert await page.locator('.typeout-progress').count()==0
        held=await page.locator('#beat').inner_text(); await page.wait_for_timeout(450); assert held==await page.locator('#beat').inner_text()
        evidence['checks'].append('Continue starts scene automatically; Previous cancels active reveal')
        await page.locator('#autoplay').uncheck();await page.locator('#next').click()
        await page.wait_for_function('()=>document.getElementById("status").textContent.includes("ready")')
        await page.locator('#next').click();await page.locator('#play').click()
        await page.wait_for_function('()=>document.getElementById("status").textContent.includes("completed")')
        await page.locator('.beat-ending button').click()
        await page.wait_for_selector('#beat h2');assert 'authored ending' in await page.locator('#beat h2').inner_text()
        assert await page.locator('#play').is_hidden()
        await page.locator('#previous').click()
        await page.wait_for_function('()=>document.getElementById("status").textContent.includes("completed")')
        assert 'She closed the ledger.' in await page.locator('#beat').inner_text()
        evidence['checks'].append('autoplay Off leaves scene ready; end action enters back matter; Previous returns silently completed')
        await page.set_viewport_size({'width':390,'height':740})
        await page.locator('.beat-ending button').click();await page.wait_for_selector('#beat h2')
        assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        await page.locator('#previous').focus();await page.keyboard.press('Enter')
        await page.wait_for_function('()=>document.getElementById("status").textContent.includes("completed")')
        await page.locator('.beat-ending button').focus();await page.keyboard.press('Enter')
        await page.wait_for_selector('#beat h2')
        evidence['checks'].append('390px narrow layout, keyboard navigation and no horizontal overflow')
        assert errors==[], errors;evidence['pageErrors']=errors
        await page.screenshot(path=str(pathlib.Path(sys.argv[2]).with_suffix('.png') if len(sys.argv)>2 else root.parent/'matter-narrow.png'),full_page=True)
        await browser.close()
    finally: server.shutdown()
    print(json.dumps(evidence,indent=2))
    if len(sys.argv)>2:pathlib.Path(sys.argv[2]).write_text(json.dumps(evidence,indent=2)+'\n')
asyncio.run(run(pathlib.Path(sys.argv[1]).resolve()))
