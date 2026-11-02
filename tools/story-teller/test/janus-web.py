"""Synthetic exported JANUS reader, actual Chromium layout and lifecycle checks.
Usage: python3 test/janus-web.py /absolute/export [evidence-directory]
"""
import asyncio, functools, json, pathlib, sys, threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.async_api import async_playwright

async def run(root, evidence):
    class Quiet(SimpleHTTPRequestHandler):
        def log_message(self, *args): pass
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(root)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    evidence.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        page = await browser.new_page(viewport={'width': 1100, 'height': 800})
        errors = []; page.on('pageerror', lambda e: errors.append(str(e)))
        await page.clock.install()
        await page.goto(f'http://127.0.0.1:{server.server_port}/')
        await page.locator('#playback-toggle').click()
        await page.clock.run_for(400)
        surface = page.locator('.janus-document .typeout-progress')
        assert await surface.locator('[data-janus-unit]:not([hidden])').count() == 1
        assert await surface.locator('table:visible').count() == 0
        widths = await surface.locator('col').evaluate_all('(cols)=>cols.map(c=>c.style.width)')
        await page.locator('#playback-toggle').click()
        before = await surface.inner_text(); await page.clock.run_for(15000)
        assert before == await surface.inner_text()
        await page.locator('#more-toggle').click()
        await page.locator('#playback-speed').select_option('1.5')
        await page.locator('#playback-toggle').click()
        await page.evaluate("window.statusChanges=0; new MutationObserver(()=>window.statusChanges++).observe(document.getElementById('status'),{childList:true,subtree:true,characterData:true})")
        await page.clock.run_for(9500)
        assert await page.evaluate('window.statusChanges') == 0
        assert await surface.locator('thead:visible').count() == 1
        assert await surface.locator('tbody tr:visible').count() >= 1
        assert widths == await surface.locator('col').evaluate_all('(cols)=>cols.map(c=>c.style.width)')
        await page.clock.run_for(60000)
        assert 'completed' in await page.locator('#status').text_content()
        assert await surface.locator('table:visible').count() == 2
        assert await surface.locator('tbody tr:visible').count() == 5
        assert widths == await surface.locator('col').evaluate_all('(cols)=>cols.map(c=>c.style.width)')
        assert await surface.locator('th:not([scope="col"])').count() == 0
        accessible_link = page.locator('.janus-accessible button.wiki-link')
        assert await accessible_link.count() == 1
        assert await surface.locator('button.wiki-link').get_attribute('tabindex') == '-1'
        await accessible_link.focus()
        assert await accessible_link.is_visible()
        await page.keyboard.press('Enter')
        assert 'signed change' in await page.locator('dialog article').inner_text()
        await page.keyboard.press('Escape')
        await page.locator('#more-toggle').focus()
        await page.screenshot(path=str(evidence/'report-desktop.png'), full_page=True)
        await page.set_viewport_size({'width': 375, 'height': 740})
        assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
        table = surface.locator('.janus-table-scroll').first
        assert await table.evaluate('(e)=>e.scrollWidth > e.clientWidth')
        await table.evaluate('(e)=>e.scrollLeft=60')
        assert await table.evaluate('(e)=>e.scrollLeft') > 0
        if not await page.locator('#replay').is_visible(): await page.locator('#more-toggle').click()
        await page.locator('#replay').click()
        await page.clock.run_for(500)
        assert await surface.locator('[data-janus-unit]:not([hidden])').count() < 4
        await page.clock.run_for(9500)
        table = surface.locator('.janus-table-scroll').first
        await table.focus(); await page.keyboard.press('ArrowRight')
        await page.clock.run_for(500)
        # Native keyboard scrolling uses the compositor's real clock.
        await asyncio.sleep(0.5)
        await table.evaluate('(e)=>e.scrollLeft=60')
        left = await table.evaluate('(e)=>e.scrollLeft')
        top = await page.evaluate('scrollY')
        await page.clock.run_for(1200)
        assert await table.evaluate('(e)=>e.scrollLeft') == left, {'before':left, 'after':await table.evaluate('(e)=>e.scrollLeft')}
        assert await page.evaluate('scrollY') == top
        if not await page.locator('#reveal').is_visible(): await page.locator('#more-toggle').click()
        await page.locator('#reveal').click(); await page.clock.run_for(100)
        assert 'completed' in await page.locator('#status').text_content()
        await page.screenshot(path=str(evidence/'report-phone.png'), full_page=True)
        await page.locator('#next').click(); await page.clock.run_for(500)
        assert await page.locator('.typeout-janus-log').count() == 1
        await page.locator('#next').click(); await page.clock.run_for(60000)
        assert await page.locator('.janus-document').count() == 0
        await page.locator('#previous').click()
        assert await page.locator('.typeout-janus-log .typeout-progress tbody tr:visible').count() == 2
        await page.screenshot(path=str(evidence/'analysis-phone.png'), full_page=True)
        await page.emulate_media(color_scheme='dark')
        assert await page.locator('.janus-document').evaluate('(e)=>getComputedStyle(e).color') == 'rgb(228, 237, 244)'
        await page.screenshot(path=str(evidence/'analysis-dark-phone.png'), full_page=True)
        await page.emulate_media(reduced_motion='reduce')
        if not await page.locator('#replay').is_visible(): await page.locator('#more-toggle').click()
        await page.locator('#replay').click(); await page.clock.run_for(100)
        assert 'completed' in await page.locator('#status').text_content()
        assert await page.locator('.typeout-progress [hidden]').count() == 0
        if not await page.locator('#restart').is_visible(): await page.locator('#more-toggle').click()
        await page.locator('#restart').click(); await page.clock.run_for(100)
        assert 'ready' in await page.locator('#status').text_content()
        await page.locator('#playback-toggle').click(); await page.clock.run_for(100)
        assert await page.locator('.typeout-janus .typeout-progress tbody tr:visible').count() == 5
        # Two type-outs in one beat must update their own surfaces.
        await page.emulate_media(reduced_motion='no-preference')
        for _ in range(3):
            await page.locator('#next').click(); await page.clock.run_for(100)
        await page.clock.run_for(8000)
        assert await page.locator('.janus-document').count() == 2
        assert await page.locator('.typeout-progress tbody tr:visible').count() == 2
        assert (await page.locator('.typeout-janus .typeout-progress tbody tr').inner_text()).split() == ['First', '+1']
        assert (await page.locator('.typeout-janus-log .typeout-progress tbody tr').inner_text()).split() == ['Second', '−1']
        assert 'completed' in await page.locator('#status').text_content()
        assert errors == [], errors
        (evidence/'web.json').write_text(json.dumps({'browser': browser.version, 'checks': 'unit reveal, tables/widths, pause/resume/speed, reveal, replay, navigation cancellation, Previous, restart, reduced motion, desktop/phone overflow', 'errors': errors}, indent=2))
        await browser.close()
    server.shutdown()

asyncio.run(run(pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2] if len(sys.argv)>2 else '/tmp/janus-evidence')))
