"""Synthetic regression for a hover preview intercepting a first touch tap.
Uses test-only Python Playwright and installed Chrome. No private book data.
"""
import asyncio, functools, json, pathlib, subprocess, tempfile, threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.async_api import async_playwright

async def run():
    root = pathlib.Path(tempfile.mkdtemp(prefix='supporting-touch-'))
    project = root/'project';(project/'scenes').mkdir(parents=True);(project/'Supporting Content').mkdir()
    (project/'scenes/Scene.md').write_text('Opening.\n\n[[Detail|Touch detail]]')
    (project/'Supporting Content/Detail.md').write_text('# Detail\n\n'+('A fictional supporting explanation. '*40)+'\n\n[[Other|Nested detail]]')
    (project/'Supporting Content/Other.md').write_text('# Other\n\nAnother fictional note.')
    (project/'story-teller.project.json').write_text(json.dumps({'schema':'story-teller-project','version':1,'title':'Synthetic touch regression','parts':[],'scenes':[{'id':'s','partId':None,'label':'1','title':'Scene','file':'scenes/Scene.md'}]}))
    renderer=pathlib.Path(__file__).resolve().parent.parent
    subprocess.run(['node',str(renderer/'src/web-export.cjs'),str(project),str(root/'export')],check=True,capture_output=True)
    class Quiet(SimpleHTTPRequestHandler):
        def log_message(self,*args):pass
    server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root/'export')))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    try:
        async with async_playwright() as p:
            browser=await p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox'])
            ctx=await browser.new_context(viewport={'width':390,'height':500},is_mobile=True,has_touch=True)
            page=await ctx.new_page();await page.goto(f'http://127.0.0.1:{server.server_port}/')
            link=page.locator('#beat button.wiki-link');await link.wait_for()
            await page.add_style_tag(content='#beat { padding-top: 350px; padding-bottom: 0; }')
            await link.scroll_into_view_if_needed()
            # A single touch, not retrying/tapping through the hover surface.
            await link.tap();await page.wait_for_selector('dialog[open]',timeout=2000)
            assert await page.locator('dialog h2').inner_text()=='Detail'
            assert await page.locator('#supporting-preview').is_hidden()
            await page.locator('dialog button.wiki-link').tap();await page.wait_for_function("() => document.querySelector('dialog h2').textContent==='Other'")
            await page.locator('dialog header button').first.tap();await page.wait_for_function("() => document.querySelector('dialog h2').textContent==='Detail'")
            await page.locator('[aria-label="Close supporting note"]').tap()
            # Switching from touch to keyboard restores focus previews.
            await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab')
            await page.wait_for_selector('#supporting-preview:not([hidden])')
            await page.keyboard.press('Enter');await page.wait_for_selector('dialog[open]')
            await page.keyboard.press('Escape')
            # Switching from touch/keyboard back to a real mouse restores hover.
            await link.evaluate('(e)=>e.blur()');await page.mouse.move(1,1)
            await page.wait_for_timeout(400)
            rect=await link.bounding_box();await page.mouse.move(rect['x']+rect['width']/2,rect['y']+rect['height']/2)
            await page.wait_for_selector('#supporting-preview:not([hidden])')
            tip=await page.locator('#supporting-preview').bounding_box()
            await page.mouse.move(tip['x']+5,tip['y']+5)
            bounds=await page.evaluate('''()=>{const a=document.querySelector('#beat button.wiki-link').getBoundingClientRect(),b=document.getElementById('supporting-preview').getBoundingClientRect();return {overlap:!(b.bottom<=a.top || b.top>=a.bottom || b.right<=a.left || b.left>=a.right)}}''')
            assert not bounds['overlap']
            await link.click();await page.wait_for_selector('dialog[open]')
            await browser.close()
        print('PASS synthetic single-touch, nested/back/close, keyboard and mouse hover: '+str(root))
    finally:server.shutdown()

asyncio.run(run())
