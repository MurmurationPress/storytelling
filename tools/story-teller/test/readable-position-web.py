"""Same-origin saved-position check across legacy/readable export replacement.
Usage: python test/readable-position-web.py OLD_EXPORT NEW_EXPORT EVIDENCE.json
Requires optional local Playwright and installed Chrome; nothing ships to authors.
"""
import asyncio, functools, json, pathlib, sys, threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.async_api import async_playwright

async def run(old, new, evidence):
    current = {'root': old}
    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(current['root']), **kwargs)
        def log_message(self, *args): pass
    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    old_book = json.loads((old/'publication.json').read_text())
    new_book = json.loads((new/'publication.json').read_text())
    assert old_book['id'] == new_book['id']
    assert [s['id'] for s in old_book['readingOrder']] == [s['id'] for s in new_book['readingOrder']]
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--no-sandbox'])
            page = await browser.new_page(viewport={'width': 1100, 'height': 800})
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            await page.goto(f'http://127.0.0.1:{server.server_port}')
            await page.wait_for_selector('#beat button[data-story-target="JANUS early"]')
            await page.locator('#next').click()
            await page.wait_for_selector('.typeout-annotation')
            key = 'story-teller:' + old_book['id']
            before = await page.evaluate('(key) => JSON.parse(localStorage.getItem(key))', key)
            assert before['index'] == 1
            current['root'] = new
            await page.reload()
            await page.wait_for_function("key => JSON.parse(localStorage.getItem(key) || '{}').index === 1 && document.querySelector('#status').textContent.includes('ready')", arg=key)
            after = await page.evaluate('(key) => JSON.parse(localStorage.getItem(key))', key)
            assert after['sourceUri'] == before['sourceUri']
            assert after['index'] == before['index']
            assert 'ready' in await page.locator('#status').inner_text()
            await page.locator('#playback-toggle').click()
            await page.wait_for_selector('.typeout-annotation')
            assert not errors, errors
            evidence.write_text(json.dumps({'method': 'same HTTP origin; existing browser localStorage; legacy export replaced by migrated export', 'browser': browser.version, 'publicationKeyPreserved': True, 'sceneIdentityPreserved': True, 'beatIndexPreserved': True, 'reopensReady': True, 'pageErrors': errors, 'unverified': ['Safari/iPad/iPhone', 'human screen-reader use']}, indent=2)+'\n')
            await browser.close()
    finally:
        server.shutdown()

asyncio.run(run(pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]), pathlib.Path(sys.argv[3])))
