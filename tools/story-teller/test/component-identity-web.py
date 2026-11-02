"""Synthetic component metadata in the actual exported reader; no Safari claim."""
import asyncio, functools, json, pathlib, sys, threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.async_api import async_playwright

async def run(root, evidence):
    class Quiet(SimpleHTTPRequestHandler):
        def log_message(self,*args): pass
    server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    evidence.mkdir(parents=True,exist_ok=True)
    async with async_playwright() as p:
        browser=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        page=await browser.new_page(viewport={'width':1100,'height':850})
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        await page.clock.install()
        await page.goto(f'http://127.0.0.1:{server.server_port}/')
        assert await page.locator('.component-header').count()==0
        await page.locator('#playback-toggle').click();await page.clock.run_for(0)
        assert await page.locator('.component-title').count()==1
        assert 'PRIME — Observation reading note' in await page.locator('.component-title').inner_text()
        assert 'body text' not in await page.locator('.typeout-progress').inner_text()
        await page.clock.run_for(100);await page.locator('#playback-toggle').click()
        held=await page.locator('.typeout-progress').inner_text();await page.clock.run_for(10000)
        assert held==await page.locator('.typeout-progress').inner_text()
        await page.locator('#more-toggle').click();await page.locator('#playback-speed').select_option('1.5')
        await page.locator('#playback-toggle').click();await page.clock.run_for(60000)
        assert 'completed' in await page.locator('#status').text_content()
        assert await page.locator('.typeout').count()==6
        assert await page.locator('.component-header').count()==5
        assert await page.locator('.component-title').count()==4
        assert await page.locator('.component-timestamp').count()==3
        assert await page.locator('.typeout-janus').last.locator('.component-header').count()==0
        assert await page.locator('.typeout-yaml').first.locator('.typeout-progress').inner_text()=='status: listening\nchange: +0.91\n@title body text, not a directive\n'
        assert await page.locator('.typeout-janus-log script').count()==0
        assert '<script>literal</script>' in await page.locator('.typeout-janus-log .component-title').inner_text()
        assert await page.locator('.component-title strong').count()==3
        assert await page.locator('.janus-document .typeout-progress tbody tr:visible').count()==4
        await page.screenshot(path=str(evidence/'desktop.png'),full_page=True)
        for width in [375,768]:
            await page.set_viewport_size({'width':width,'height':850})
            assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
            for header in await page.locator('.component-header').all():
                assert await header.evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
            await page.screenshot(path=str(evidence/f'width-{width}.png'),full_page=True)
        await page.locator('.component-title .wiki-link').focus();await page.keyboard.press('Enter')
        assert 'signed change' in await page.locator('dialog article').inner_text()
        await page.keyboard.press('Escape')
        if not await page.locator('#replay').is_visible():await page.locator('#more-toggle').click()
        await page.locator('#replay').click();await page.clock.run_for(100)
        assert await page.locator('.component-header').count()==1
        await page.locator('#next').click();await page.clock.run_for(60000)
        assert await page.locator('.component-header').count()==0
        await page.locator('#previous').click()
        assert await page.locator('.component-header').count()==5
        await page.emulate_media(reduced_motion='reduce')
        if not await page.locator('#replay').is_visible():await page.locator('#more-toggle').click()
        await page.locator('#replay').click();await page.clock.run_for(0)
        assert await page.locator('.component-header').count()==5
        assert 'completed' in await page.locator('#status').text_content()
        assert errors==[],errors
        (evidence/'browser.json').write_text(json.dumps({'browser':browser.version,'errors':errors,'checks':'metadata at entry; independent mixed-format headers; exact timestamp; body directives; safe HTML; header supporting link; widths 1100/768/375; replay/navigation/reduced motion; no metadata pauses'},indent=2))
        await browser.close()
    server.shutdown()
asyncio.run(run(pathlib.Path(sys.argv[1]),pathlib.Path(sys.argv[2] if len(sys.argv)>2 else '/tmp/component-identity-evidence')))
