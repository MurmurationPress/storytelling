"""Actual exported HTTP reader checks; optional Python Playwright + installed Chrome.
Usage: python test/web-reader.py /absolute/export/path [evidence.json]
No browser automation dependency is shipped in the reader/VSIX.
"""
import asyncio, json, pathlib, sys, threading, functools, time
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.async_api import async_playwright

async def run(root):
    class Quiet(SimpleHTTPRequestHandler):
        def log_message(self,*args): pass
    server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    url=f'http://127.0.0.1:{server.server_port}'
    book=json.loads((root/'publication.json').read_text())
    title_by_label={item['label']:item['title'] for item in book['scenes']}
    evidence={'method':'Actual exported directory served over HTTP; installed Chrome headless on Linux','unverified':['actual touch device','iPad/Safari','human listening','Windows/macOS'],'checks':{}}
    try:
      async with async_playwright() as p:
        browser=await p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox'])
        evidence['browser']=browser.version
        context=await browser.new_context(viewport={'width':1100,'height':800})
        page=await context.new_page();errors=[];remote=[]
        audio=[];cdp=await context.new_cdp_session(page);await cdp.send('WebAudio.enable');cdp.on('WebAudio.nodesConnected',lambda e:audio.append('connect'));cdp.on('WebAudio.nodesDisconnected',lambda e:audio.append('disconnect'))
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.on('request',lambda req:remote.append(req.url) if not req.url.startswith(url) else None)
        await page.goto(url);await page.wait_for_selector('#beat button[data-story-target="JANUS early"]')
        assert 'ready' in await page.locator('#status').inner_text()
        light=await page.evaluate('getComputedStyle(document.body).color')
        await page.emulate_media(color_scheme='dark');dark=await page.evaluate('getComputedStyle(document.body).color');assert light!=dark
        await page.emulate_media(color_scheme='light');evidence['checks']['theme_text_colours']={'light':light,'dark':dark}
        assert await page.locator('#beat button[data-story-target^="JANUS"]').all_text_contents()==['JANUS','JANUS']
        await page.locator('#play').click();await page.wait_for_timeout(150)
        await page.locator('#beat button[data-story-target="JANUS early"]').hover()
        await page.wait_for_selector('#supporting-preview:not([hidden])');assert 'unopened harbour ledger' in await page.locator('#supporting-preview').inner_text()
        await page.locator('#supporting-preview').hover();await page.wait_for_timeout(250);assert await page.locator('#supporting-preview').is_visible()
        assert 'playing' in await page.locator('#status').inner_text()
        await page.mouse.move(1,1);await page.locator('#beat button[data-story-target="JANUS later"]').focus();await page.keyboard.press('Enter')
        await page.wait_for_selector('dialog[open]');assert 'public notice' in await page.locator('dialog article').inner_text();assert 'paused' in await page.locator('#status').inner_text()
        held=await page.locator('#beat').inner_text();await page.wait_for_timeout(350);assert held==await page.locator('#beat').inner_text()
        await page.keyboard.press('Escape');assert not await page.locator('dialog').is_visible();assert await page.evaluate('document.activeElement.dataset.storyTarget')=='JANUS later';assert 'paused' in await page.locator('#status').inner_text()
        await page.locator('#beat button[data-story-target="Ted"]').click();await page.wait_for_selector('dialog button[data-story-target="definitions/Accounts"]');await page.locator('dialog button[data-story-target="definitions/Accounts"]').click();assert 'Accounts' in await page.locator('dialog h2').inner_text()
        await page.locator('dialog header button').first.click();assert await page.locator('dialog img').count()==1
        await page.locator('dialog header button').last.click();await page.locator('#pause').click()
        await page.set_viewport_size({'width':600,'height':350})
        counts=[];chat_times=[];chat_started=time.monotonic()
        for _ in range(8):
          await page.wait_for_timeout(650);counts.append(await page.locator('.chat li').count());chat_times.append(round((time.monotonic()-chat_started)*1000))
        assert len(set(counts))>=3,counts
        await page.wait_for_function("() => document.querySelector('#status').textContent.includes('completed')")
        assert await page.locator('.ticks.read').count()>0
        await page.wait_for_function('() => document.scrollingElement.scrollTop>0')
        followed=await page.evaluate('document.scrollingElement.scrollTop')
        await page.mouse.move(250,220);await page.mouse.wheel(0,-300)
        await page.wait_for_timeout(150)
        reread=await page.evaluate('document.scrollingElement.scrollTop')
        assert reread<followed
        await page.wait_for_timeout(200);assert await page.evaluate('document.scrollingElement.scrollTop')<=reread+2
        if await page.locator('#follow-story').is_visible():await page.locator('#follow-story').click()
        evidence['checks']['followed_scroll_top']=followed
        await page.set_viewport_size({'width':1100,'height':800})
        evidence['checks']['chat_temporal_counts']=counts;evidence['checks']['chat_elapsed_ms']=chat_times
        await page.locator('#next').click();await page.wait_for_selector('.typeout-annotation')
        captures=[]
        for _ in range(3):
          await page.wait_for_timeout(160);captures.append(await page.locator('.typeout-progress').inner_text())
          if len(captures)==1: assert await page.locator('.typeout-progress button[data-story-target="JANUS early"]').count()==0
        assert 0<len(captures[0])<len(captures[1])<len(captures[2]),captures
        disconnects=audio.count('disconnect')
        await page.locator('.typeout-progress button[data-story-target="JANUS early"]').click()
        await page.wait_for_selector('dialog[open]');await page.wait_for_timeout(100)
        assert audio.count('disconnect')>disconnects,audio
        await page.keyboard.press('Escape');assert 'paused' in await page.locator('#status').inner_text()
        await page.locator('#pause').click();await page.wait_for_timeout(120)
        await page.locator('#mute').click();await page.wait_for_timeout(80)
        assert await page.locator('#mute').get_attribute('aria-pressed')=='true'
        await page.locator('#mute').click()
        await page.locator('#pause').click();held=await page.locator('.typeout-progress').inner_text();await page.wait_for_timeout(250);assert held==await page.locator('.typeout-progress').inner_text()
        await page.locator('#reveal').click();await page.wait_for_selector('#beat button[data-story-target="Missing definition"]')
        await page.locator('#beat button[data-story-target="Missing definition"]').click();assert 'Missing note' in await page.locator('dialog article').inner_text()
        await page.keyboard.press('Escape');await page.locator('#previous').click();assert 'completed' in await page.locator('#status').inner_text()
        await page.locator('#next').click();await page.locator('#reveal').click();await page.locator('#next').click();await page.wait_for_selector('.typeout-yaml')
        await page.locator('#reveal').click();assert '[[JANUS later|JANUS]]' in await page.locator('.typeout-progress').inner_text()
        await page.wait_for_function("() => document.querySelector('#status').textContent.includes('completed')")
        assert await page.locator('.story-image').count()==1
        await page.locator('.beat-ending button').click();await page.wait_for_function("title => document.querySelector('#scene-title').textContent===title",arg=title_by_label['1.2'])
        await page.wait_for_function("() => document.querySelector('#status').textContent.includes('completed')")
        assert await page.locator('.image-placeholder').count()>=2
        assert await page.evaluate('window.authoredScriptRan') is None
        assert await page.locator('#beat script').count()==0
        await page.locator('#contents-toggle').click();buttons=page.locator('#contents button');assert await buttons.all_text_contents()==['1.1 Two accounts','1.2 The next scene','2.1 The last light']
        # Delay one scene response; a newer selection must win and stale output must not replace it.
        book=json.loads((root/'publication.json').read_text());first=book['scenes'][0]['file'];gate=asyncio.Event()
        async def delayed(route):
          await gate.wait();await route.continue_()
        await page.route('**/'+first,delayed)
        await buttons.nth(0).click();await page.locator('#contents-toggle').click();await buttons.nth(2).click();gate.set()
        await page.wait_for_function("title => document.querySelector('#scene-title').textContent===title",arg=title_by_label['2.1'])
        await page.wait_for_timeout(300);assert title_by_label['2.1']==await page.locator('#scene-title').inner_text()
        await page.wait_for_function("() => document.querySelector('#status').textContent.includes('completed')")
        assert await page.locator('.end-of-scene').inner_text()=='End of scene'
        # A failed local scene load must not leave outgoing story content/timers visible.
        lastfile=book['scenes'][2]['file']
        await page.route('**/'+lastfile,lambda route:route.fulfill(status=503,body='Unavailable'))
        await page.locator('#contents-toggle').click();await buttons.nth(2).click()
        await page.wait_for_function("() => document.querySelector('#warnings').textContent.includes('Scene could not be loaded')")
        assert 'final light' not in await page.locator('#beat').inner_text()
        await page.unroute('**/'+lastfile)
        await page.locator('#contents-toggle').click();await buttons.nth(2).click()
        await page.wait_for_function("() => document.querySelector('#status').textContent.includes('completed')")
        evidence['checks']['scene_load_failure_recovery']=True
        await page.locator('#autoplay').uncheck();await page.reload();await page.wait_for_selector('#beat');await page.wait_for_function("title => document.querySelector('#scene-title').textContent===title",arg=title_by_label['2.1'])
        assert not await page.locator('#autoplay').is_checked();assert 'ready' in await page.locator('#status').inner_text()
        await page.locator('#contents-toggle').click();await page.locator('#contents button').nth(0).click()
        await page.wait_for_function("title => document.querySelector('#scene-title').textContent===title",arg=title_by_label['1.1'])
        await page.locator('#play').click();await page.wait_for_timeout(100)
        await page.goto(url+'/publication.json');await page.go_back();await page.wait_for_selector('#beat')
        await page.wait_for_timeout(200);assert 'playing' not in await page.locator('#status').inner_text()
        evidence['checks']['departure_return_no_resume']=True
        evidence['checks']['actual_audio_graph_pause_mute']=audio
        assert not errors,errors;assert not remote,remote
        evidence['checks'].update({'desktop_notes_keyboard_hover_nested_back_pause':True,'annotation_prefix_lengths':[len(x) for x in captures],'annotation_visible_prefixes':captures,'annotation_requested_sample_interval_ms':160,'silent_previous_literal_yaml':True,'explicit_scene_turn':True,'ordered_contents':True,'rapid_stale_scene_rejection':True,'preference_reopening':True,'missing_images_and_notes':True,'no_remote_requests_or_authored_script':True})
        await context.close()
        # Touch/reduced-motion browser emulation, explicitly not a device test.
        mobile=await browser.new_context(viewport={'width':390,'height':780},is_mobile=True,has_touch=True,reduced_motion='reduce')
        page=await mobile.new_page();await page.goto(url);await page.wait_for_selector('#beat button[data-story-target="JANUS early"]')
        await page.locator('#beat button[data-story-target="JANUS early"]').tap();await page.wait_for_selector('dialog[open]');await page.locator('dialog header button').last.tap();assert not await page.locator('dialog').is_visible()
        await page.locator('#beat button[data-story-target="Ted"]').tap();await page.wait_for_selector('dialog[open]')
        await page.locator('dialog button[data-story-target="definitions/Accounts"]').tap();await page.locator('dialog header button').first.tap()
        await page.touchscreen.tap(1,1);assert not await page.locator('dialog').is_visible()
        await page.locator('#next').tap();await page.wait_for_selector('.typeout-progress');assert 'Remember JANUS.' in await page.locator('.typeout-progress').inner_text()
        assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        await page.locator('#beat button[data-story-target="JANUS early"]').tap();await page.wait_for_selector('dialog[open]')
        await page.locator('#contents-toggle').evaluate('(button)=>button.click()')
        await page.locator('#contents button').nth(2).evaluate('(button)=>button.click()')
        await page.wait_for_function("title => document.querySelector('#scene-title').textContent===title",arg=title_by_label['2.1']);assert not await page.locator('dialog').is_visible()
        evidence['checks']['touch_reduced_motion_narrow_scene_cleanup_emulation']=True
        await browser.close()
    finally: server.shutdown()
    output=pathlib.Path(sys.argv[2]) if len(sys.argv)>2 else pathlib.Path(__file__).parent/'evidence/web-reader.json';output.write_text(json.dumps(evidence,indent=2)+'\n');print(json.dumps(evidence,indent=2))

asyncio.run(run(pathlib.Path(sys.argv[1]).resolve()))
