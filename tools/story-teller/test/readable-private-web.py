"""Private exported-reader smoke check. Stores counts/booleans, never story text.
Usage: python test/readable-private-web.py DISPOSABLE_EXPORT EVIDENCE.json
"""
import asyncio, functools, json, pathlib, sys, threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.async_api import async_playwright

async def run(root, evidence):
    class Quiet(SimpleHTTPRequestHandler):
        def log_message(self, *args): pass
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(root)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    book = json.loads((root/'publication.json').read_text())
    reading = book.get('readingOrder', book['scenes'])
    first = next(i for i, scene in enumerate(reading) if scene['kind'] == 'scene')
    key = 'story-teller:' + book['id']
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--no-sandbox'])
            page = await browser.new_page(reduced_motion='reduce', viewport={'width': 1100, 'height': 800})
            errors, failed = [], []
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.on('response', lambda response: failed.append(response.status) if response.status >= 400 else None)
            await page.goto(f'http://127.0.0.1:{server.server_port}')
            await page.wait_for_selector('#contents-toggle')
            await page.locator('#contents-toggle').click()
            assert await page.locator('#contents button').count() == len(reading)
            await page.locator('#contents button').nth(first).click()
            await page.wait_for_function("arg => JSON.parse(localStorage.getItem(arg.key) || '{}').sourceUri === arg.id", arg={'key': key, 'id': reading[first]['id']})
            await page.locator('#next').click()
            await page.wait_for_function("key => JSON.parse(localStorage.getItem(key) || '{}').index === 1", arg=key)
            await page.reload()
            await page.wait_for_function("key => JSON.parse(localStorage.getItem(key) || '{}').index === 1 && document.querySelector('#status').textContent.includes('ready')", arg=key)
            await page.wait_for_load_state('networkidle')
            assert not errors, errors
            assert not failed, failed
            evidence.write_text(json.dumps({'fixture': 'private disposable migrated/renamed project export', 'browser': browser.version, 'sceneCount': len(book['scenes']), 'contentsCount': len(reading), 'selectedFirstStory': True, 'nextBeatAndReopenPosition': True, 'httpErrors': failed, 'pageErrors': errors, 'reducedMotion': 'browser emulation', 'unverified': ['actual devices', 'human listening', 'human screen reader']}, indent=2)+'\n')
            await browser.close()
    finally:
        server.shutdown()

asyncio.run(run(pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])))
