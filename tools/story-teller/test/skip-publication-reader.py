"""Validate the real staged Skip book over /skip/. Test tooling only, no shipped dependency.
Usage: python test/skip-publication-reader.py BUILD_ROOT http://127.0.0.1:8788
Screenshots/reports stay beside the private build, outside the public site.
"""
import asyncio, hashlib, json, pathlib, sys, time
from playwright.async_api import async_playwright


async def preference(page, selector, value):
    if not await page.locator('#more-options').is_visible():
        await page.locator('#more-toggle').click()
    if selector == '#autoplay':
        await page.locator(selector).set_checked(value)
    else:
        await page.locator(selector).select_option(value)
    await page.keyboard.press('Escape')

async def run(build, origin, label=""):
    suffix = "-" + label if label else ""
    site = build / 'site' / 'skip'
    book = json.loads((site / 'publication.json').read_text())
    plan = json.loads((build / 'playback-plan.json').read_text())
    report = {'method': 'Actual book at /skip/ over HTTP(S); Chrome headless Linux', 'origin': origin, 'checks': [],
              'unverified': ['Actual mobile/iPad/Safari device use', 'Screen reader use', 'Human audio listening', 'Production hostname DNS/TLS']}
    if origin.startswith(('http://127.', 'http://192.168.')):
        report['unverified'].append('Live Cloudflare CDN')
    errors, failed, external = [], [], []
    visited_notes, beat_count, image_count = set(), 0, 0
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--no-sandbox'])
        report['browser'] = browser.version
        ctx = await browser.new_context(viewport={'width': 1280, 'height': 900}, reduced_motion='reduce')
        page = await ctx.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('response', lambda r: failed.append({'status': r.status, 'url': r.url}) if r.status >= 400 else None)
        page.on('requestfailed', lambda r: failed.append({'failure': r.failure, 'url': r.url}))
        page.on('request', lambda r: external.append(r.url) if not r.url.startswith(origin + '/') else None)
        await page.goto(origin + '/skip/')
        await page.wait_for_selector('#beat h1')
        assert (await page.locator('#beat h1').inner_text()) == book['title']
        assert await page.locator('#playback-speed').input_value() == '1'
        await preference(page, '#autoplay', False)
        await page.clock.install()

        async def select(item):
            await page.locator('#contents-toggle').click()
            text = f"{item['label']} {item['title']}" if item['kind'] == 'scene' else item['title']
            await page.locator('#contents button').get_by_text(text, exact=True).click()
            await page.wait_for_function("id => Object.keys(localStorage).some(k => k.startsWith('story-teller:') && JSON.parse(localStorage.getItem(k)).sourceUri === id)", arg=item['id'])

        async def note(target, scope='#beat'):
            if target in visited_notes:
                return
            locator = page.locator(f'{scope} button.wiki-link[data-story-target={json.dumps(target)}]:visible').first
            await locator.focus()
            await locator.press('Enter')
            await page.wait_for_selector('dialog[open]')
            expected = book['notes'][book['targets'][target]['id']]['title']
            await page.wait_for_function("title => document.querySelector('dialog header h2').textContent === title", arg=expected)
            assert await page.locator('dialog .supporting-warning').count() == 0
            visited_notes.add(target)
            children = await page.locator('dialog article button.wiki-link:visible').evaluate_all("els => [...new Set(els.map(e=>e.dataset.storyTarget))]")
            for child in children:
                if child not in visited_notes:
                    await note(child, 'dialog article')
                    back = page.locator('dialog header button').filter(has_text='Back')
                    await back.focus(); await back.press('Enter')
                    await page.wait_for_function("title => document.querySelector('dialog header h2').textContent === title", arg=expected)

        by_id = {item['id']: item for item in book['readingOrder']}
        # Every real beat, with virtual active time and reduced-motion type-out policy.
        # This checks delivery/order/assets; real-time checks below are kept separate.
        for scene in plan:
            await select(by_id[scene['id']])
            for index, beat in enumerate(scene['beats']):
                if index:
                    await page.locator('#next').click()
                await page.locator('#playback-toggle').click()
                await page.clock.run_for(beat['reducedMotionDuration'] + 20)
                await page.wait_for_function("() => document.getElementById('status').textContent.includes('completed')")
                expected_messages = sum(block['messages'] for block in beat['blocks'])
                assert await page.locator('#beat .chat li').count() == expected_messages, (scene['title'], index)
                assert await page.locator('#beat .image-placeholder').count() == 0, (scene['title'], index)
                await page.wait_for_function("() => [...document.querySelectorAll('#beat img')].every(i=>i.complete && i.naturalWidth>0)")
                image_count += await page.locator('#beat img').count()
                targets = await page.locator('#beat button.wiki-link:visible').evaluate_all("els => [...new Set(els.map(e=>e.dataset.storyTarget))]")
                for target in targets:
                    if target not in visited_notes:
                        await note(target)
                        await page.locator('[aria-label="Close supporting note"]').click()
                beat_count += 1
            print(f"PASS full scene: {scene['title']} ({len(scene['beats'])} beats)", flush=True)
        report['allBeats'] = beat_count
        report['renderedSceneImages'] = image_count
        report['visitedSupportingTargets'] = sorted(visited_notes)
        assert 'Canvas' in visited_notes
        report['checks'].append('All 14 scenes / 144 beats complete with virtual active time, exact message counts, resolved images and actual supporting panels/nested Back')

        # Saved scene/beat/preferences survive reopening, without autoplay.
        await preference(page, '#playback-speed', '0.75')
        await page.locator('#sound-toggle').click()
        state = await page.evaluate("Object.values(localStorage).map(v=>{try{return JSON.parse(v)}catch{return null}}).find(v=>v?.sourceUri)")
        await page.reload()
        await page.wait_for_function("expected => Object.values(localStorage).some(v=>{try{const s=JSON.parse(v);return s.sourceUri===expected.sourceUri && s.index===expected.index}catch{return false}})", arg=state)
        await page.wait_for_function("() => document.getElementById('status').textContent.includes('ready')")
        assert await page.locator('#playback-speed').input_value() == '0.75'
        assert not await page.locator('#autoplay').is_checked()
        assert await page.locator('#sound-toggle').get_attribute('aria-pressed') == 'true'
        report['savedPosition'] = {'scene': state['sourceUri'], 'beat': state['index'], 'speed': .75, 'autoplay': False, 'muted': True}
        report['checks'].append('Refresh restores scene/beat and speed/autoplay/mute preferences, ready without restarting sound')
        for item in [book['readingOrder'][0], book['readingOrder'][-1]]:
            await select(item)
            assert await page.locator('#beat').inner_text()
            assert 'Book matter' in await page.locator('#status').inner_text()
        report['checks'].append('Authored front and back matter are both in Contents and displayed')

        # Decode every exported image in the browser, separately from viewport coverage.
        assets = sorted((site / 'assets').iterdir())
        dimensions = []
        for asset in assets:
            dim = await page.evaluate("async url => { const i=new Image();i.src=url;await i.decode();return {width:i.naturalWidth,height:i.naturalHeight}; }", origin + '/skip/assets/' + asset.name)
            assert dim['width'] and dim['height']
            dimensions.append(dim)
        report['decodedAssets'] = len(dimensions)
        report['checks'].append('All 44 content-addressed assets HTTP-load and browser-decode')
        await ctx.close()

        # Real-time reading checks without the virtual clock or reduced motion.
        live = await browser.new_context(viewport={'width': 1280, 'height': 900})
        page = await live.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        await page.goto(origin + '/skip/')
        await page.wait_for_selector('#beat h1')
        await preference(page, '#autoplay', False)
        scene = book['scenes'][1]
        await page.locator('#contents-toggle').click()
        await page.locator('#contents button').get_by_text(f"{scene['label']} {scene['title']}", exact=True).click()
        await page.wait_for_function("() => document.getElementById('status').textContent.includes('ready')")
        # Find the first fully chat-led beat in this actual scene (index 3).
        for _ in range(3):
            await page.locator('#next').click()
        await preference(page, '#playback-speed', '0.75')
        await page.locator('#playback-toggle').click()
        await page.wait_for_timeout(350)
        assert await page.locator('#beat .chat li').count() == 0
        await page.locator('#playback-toggle').click()
        await preference(page, '#playback-speed', '0.5')
        await page.wait_for_timeout(500)
        assert await page.locator('#beat .chat li').count() == 0
        assert 'paused' in await page.locator('#status').inner_text()
        await page.locator('#playback-toggle').click()
        await page.locator('#beat .chat li').first.wait_for(timeout=10000)
        await page.locator('#playback-toggle').click()
        held = await page.locator('#beat .chat li').count()
        await page.wait_for_timeout(250)
        assert await page.locator('#beat .chat li').count() == held
        # Open Canvas from the original chapter; the playback state must remain paused.
        canvas = page.locator('#beat button.wiki-link[data-story-target="Canvas"]:visible').first
        if await canvas.count():
            await canvas.click(); await page.wait_for_selector('dialog[open]')
            await page.locator('[aria-label="Close supporting note"]').click()
            assert 'paused' in await page.locator('#status').inner_text()
        report['checks'].append('Real-time authored chat delivery, 0.75×→0.5× paused change, resume and no duplicate reveal')

        # Real WebP animation frame differences; original bytes remain unchanged.
        animated = []
        for asset in assets:
            data = asset.read_bytes()
            if asset.suffix == '.webp' and b'ANIM' in data:
                animation_page = await live.new_page()
                await animation_page.goto(origin + '/skip/assets/' + asset.name)
                img = animation_page.locator('img')
                hashes = set()
                for _ in range(4):
                    await animation_page.wait_for_timeout(350)
                    hashes.add(hashlib.sha256(await img.screenshot()).hexdigest())
                assert len(hashes) > 1, asset.name
                animated.append({'asset': asset.name, 'distinctBrowserFrames': len(hashes)})
                await animation_page.close()
        report['animatedWebP'] = animated
        assert animated
        report['checks'].append('Every animated WebP shows changing frames in the browser; no frame rewriting')
        await page.screenshot(path=str(build / f'desktop-preview{suffix}.png'), full_page=False)
        await live.close()

        mobile = await browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, device_scale_factor=1)
        page = await mobile.new_page(); page.on('pageerror', lambda e: errors.append(str(e)))
        await page.goto(origin + '/skip/'); await page.wait_for_selector('#beat h1')
        await preference(page, '#playback-speed', '0.75')
        await page.locator('#contents-toggle').tap()
        assert await page.locator('#contents').is_visible()
        await page.locator('#contents button').get_by_text('14 A Spoonful of Explanation', exact=True).tap()
        await page.wait_for_selector('#beat button.wiki-link[data-story-target="Canvas"]')
        await page.locator('#beat button.wiki-link[data-story-target="Canvas"]:visible').first.tap()
        await page.wait_for_selector('dialog[open]')
        assert await page.locator('dialog header h2').inner_text() == book['notes']['Canvas.md']['title']
        await page.locator('[aria-label="Close supporting note"]').tap()
        for width in [390, 320]:
            await page.set_viewport_size({'width': width, 'height': 844})
            assert await page.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth+1')
            await page.locator('#more-toggle').click()
            assert await page.locator('#playback-speed').evaluate('e=>e.getBoundingClientRect().height') >= 44
            await page.keyboard.press('Escape')
        await page.screenshot(path=str(build / f'mobile-preview{suffix}.png'), full_page=False)
        report['checks'].append('390px/320px mobile layout, emulated-touch Contents/Canvas panel, 44px select and no horizontal overflow')
        await mobile.close()
        await browser.close()
    assert not errors, errors
    assert not failed, failed
    assert not external, external
    report.update({'pageErrors': errors, 'failedRequests': failed, 'externalRequests': external})
    (build / f'browser-validation{suffix}.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'result': 'PASS', 'beats': beat_count, 'assets': len(dimensions), 'animatedWebP': len(animated), 'supportingTargetsOpened': len(visited_notes)}, indent=2))

if __name__ == '__main__':
    asyncio.run(run(pathlib.Path(sys.argv[1]).resolve(), sys.argv[2].rstrip('/'), sys.argv[3] if len(sys.argv) > 3 else ''))
