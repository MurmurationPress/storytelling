"""Exercise an actual retained export; collection is intercepted, never sent to GA.
Usage: python test/analytics-reader.py BUILD_ROOT [REPORT_PATH]
Requires test-only Playwright and installed Chrome. Does not modify the artifact.
"""
import asyncio, functools, json, pathlib, re, sys, threading, urllib.parse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.async_api import async_playwright

async def run(build, origin_override=None):
    root=build/'site'; book=json.loads((root/'skip/publication.json').read_text())
    class Quiet(SimpleHTTPRequestHandler):
        def log_message(self,*args): pass
    server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    origin=origin_override or f'http://127.0.0.1:{server.server_port}'
    url=origin+'/skip/';key='story-teller:'+book['id']
    report={'origin':origin, 'method':'Retained actual Skip export, HTTP(S), Chrome headless Linux; live Google tag; ALL remote collection intercepted', 'checks':[], 'unverified':['GA dashboard ingestion', 'actual iPad/Safari', 'human audio', 'screen reader']}
    try:
      async with async_playwright() as p:
        browser=await p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox'])
        report['browser']=browser.version
        async def context(**options):
            ctx=await browser.new_context(viewport={'width':320,'height':740},reduced_motion='reduce',**options)
            requests=[];errors=[]
            async def remote(route):
                req=route.request
                if req.url.startswith(origin+'/'): await route.continue_();return
                requests.append({'url':req.url,'body':req.post_data or ''})
                if req.url.startswith('https://www.googletagmanager.com/gtag/js?'):
                    await route.continue_()
                else:
                    await route.fulfill(status=204,headers={'Access-Control-Allow-Origin':'*'})
            await ctx.route('**/*',remote)
            page=await ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
            await page.goto(url+'?private=SHOULD_NOT_SEND#secret', referer='https://murmurationpress.co.uk/story-teller/?private=SHOULD_NOT_SEND')
            await page.wait_for_selector('#beat h1')
            return ctx,page,requests,errors
        async def choose_scene(page,scene):
            await page.locator('#contents-toggle').click()
            await page.locator('#contents button').get_by_text(f"{scene['label']} {scene['title']}",exact=True).click()
            await page.wait_for_function('(id)=>document.querySelector("#scene-title").textContent===id',arg=scene['title'])
            await page.wait_for_function('() => !document.querySelector("#status").textContent.includes("Preparing")')
        async def more(page,selector):
            if not await page.locator('#more-options').is_visible():await page.locator('#more-toggle').click()
            await page.locator(selector).click()
        async def stored(page):return await page.evaluate('(key)=>JSON.parse(localStorage.getItem(key))',key)
        async def entries(page):
            frame=page.frame_locator('iframe[title="Optional analytics"]')
            return await frame.locator('body').evaluate('() => window.dataLayer.filter(x=>x && x.length).map(x=>Array.from(x))')
        ctx,page,requests,errors=await context()
        await page.wait_for_timeout(800);assert not requests,requests
        panel=page.locator('#analytics-consent-panel');badge=page.get_by_role('button',name='Privacy and analytics settings',exact=True)
        assert await panel.is_visible()
        assert await page.locator('.analytics-consent').count()==0
        assert await page.locator('#more-options #analytics-privacy-button').count()==0
        header_top=await page.locator('body > header').evaluate('(e)=>e.getBoundingClientRect().top')
        assert header_top==0,header_top
        # Dismiss without recording a choice; reopening works by Enter and Space.
        await page.get_by_role('button',name='Close privacy settings without changing consent').click()
        assert not await panel.is_visible();assert await badge.evaluate('(e)=>e===document.activeElement')
        assert (await stored(page)).get('analyticsConsent') is None
        await page.keyboard.press('Enter');assert await panel.is_visible()
        assert await page.locator('#analytics-consent-title').evaluate('(e)=>e===document.activeElement')
        await page.keyboard.press('Escape');assert not await panel.is_visible()
        assert await badge.evaluate('(e)=>e===document.activeElement')
        assert await page.locator('.analytics-privacy-label').is_visible()
        await page.keyboard.press('Space');assert await panel.is_visible()
        # Compact geometry and both equally sized choice targets across themes/viewports.
        geometry=[]
        for width,height in [(320,740),(390,844),(768,1024),(1024,768),(320,240)]:
            await page.set_viewport_size({'width':width,'height':height})
            for theme in ['light','dark']:
                await page.emulate_media(color_scheme=theme)
                bounds=await panel.bounding_box();button=await badge.bounding_box()
                assert bounds['x']>=0 and bounds['y']>=0 and bounds['x']+bounds['width']<=width
                assert bounds['y']+bounds['height']<=button['y']-8
                assert button['width']==46 and button['height']==46
                assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
                a=await page.get_by_role('button',name='Accept analytics',exact=True).bounding_box()
                d=await page.get_by_role('button',name='Decline analytics',exact=True).bounding_box()
                assert abs(a['width']-d['width'])<=1 and a['height']>=44 and d['height']>=44
                geometry.append({'width':width,'height':height,'theme':theme,'panel':bounds})
        report['privacy_geometry']=geometry
        await page.locator('#analytics-consent-title').focus()
        for _ in range(3): await page.keyboard.press('Tab')
        focused=await page.get_by_role('button',name='Decline analytics',exact=True).bounding_box()
        bounds=await panel.bounding_box()
        assert focused['y']>=bounds['y'] and focused['y']+focused['height']<=bounds['y']+bounds['height']
        assert await panel.evaluate('(e)=>e.scrollTop>0')
        await page.set_viewport_size({'width':320,'height':740});await page.emulate_media(color_scheme='light')
        # Safe-area values are honored even when the desktop browser reports zero native insets.
        await page.locator('.analytics-privacy').evaluate("e=>{e.style.setProperty('--privacy-left','24px');e.style.setProperty('--privacy-bottom','34px')}")
        assert (await badge.bounding_box())['x']==24
        assert round((await badge.bounding_box())['y']+46)==740-34
        await page.locator('.analytics-privacy').evaluate("e=>e.removeAttribute('style')")
        await page.locator('#contents-toggle').click();assert not await panel.is_visible()
        await badge.hover();assert await page.locator('.analytics-privacy-label').is_visible()
        await page.mouse.move(160,100);assert not await page.locator('.analytics-privacy-label').is_visible()
        await badge.click();await page.keyboard.press('Tab')
        assert await page.get_by_role('button',name='Close privacy settings without changing consent').evaluate('(e)=>e===document.activeElement')
        await page.keyboard.press('Tab');assert await page.get_by_role('button',name='Accept analytics',exact=True).evaluate('(e)=>e===document.activeElement')
        await page.keyboard.press('Tab');assert await page.get_by_role('button',name='Decline analytics',exact=True).evaluate('(e)=>e===document.activeElement')
        assert not requests
        report['checks'].append('Privacy badge only, no strip/menu entry or header displacement; unset dismiss/reopen via Enter/Space/Escape, focus return, hover label, equal targets, safe-area offsets, short-panel keyboard scrolling, 10 viewport/theme cases')
        await page.get_by_role('button',name='Decline analytics',exact=True).focus();await page.keyboard.press('Enter')
        await page.wait_for_timeout(600);assert not requests;assert await page.locator('iframe').count()==0
        assert not await panel.is_visible()
        await page.reload();await page.wait_for_selector('#beat h1');assert not await page.locator('#analytics-consent-panel').is_visible();assert 'declined' in await page.locator('#analytics-consent-choice').text_content()
        assert not requests
        report['checks'].append('Unset/declined including reload: no remote script, iframe or collection; 320px keyboard consent')
        await page.get_by_role('button',name='Privacy and analytics settings',exact=True).click()
        assert 'declined' in await page.locator('#analytics-consent-choice').inner_text()
        await page.get_by_role('button',name='Accept analytics',exact=True).click()
        assert not await page.locator('#analytics-consent-panel').is_visible()
        await page.wait_for_timeout(3500)
        assert any('googletagmanager.com/gtag/js?' in r['url'] for r in requests),requests
        assert any('google-analytics.com/g/collect' in r['url'] for r in requests),requests
        commands=await entries(page)
        assert not any(c[0]=='event' for c in commands),commands
        config=next(c[2] for c in commands if c[0]=='config')
        assert config['page_location']==url
        assert config['page_referrer']=='https://murmurationpress.co.uk/'
        assert 'SHOULD_NOT_SEND' not in json.dumps(requests) and '#secret' not in json.dumps(requests)
        intro=book['scenes'][0];await choose_scene(page,intro)
        await page.wait_for_timeout(150);assert not any(c[0]=='event' for c in await entries(page))
        story=book['scenes'][1];await choose_scene(page,story)
        await more(page,'#reveal')
        commands=await entries(page);events=[c for c in commands if c[0]=='event']
        assert sum(c[1]=='reading_start' for c in events)==1,events
        assert any(c[1]=='reading_interaction' and c[2]['evidence']=='reader_action' for c in events)
        assert all('source' not in c[2] and 'raw' not in c[2] for c in events)
        for _ in range(20):
            if any('en=reading_start' in r['url']+r['body'] for r in requests): break
            await page.wait_for_timeout(250)
        assert any('en=reading_start' in r['url']+r['body'] for r in requests),requests
        position=await stored(page);index=position['index'];raw=position['raw']
        assert position['analyticsState']['stories'][story['id']]['displayed']==[index]
        await more(page,'#replay');await page.wait_for_timeout(100);await more(page,'#reveal')
        assert sum(c[1]=='reading_start' for c in await entries(page) if c[0]=='event')==1
        await page.reload();await page.wait_for_function('(title)=>document.querySelector("#scene-title").textContent===title',arg=story['title'])
        await page.wait_for_timeout(400);assert 'ready' in await page.locator('#status').inner_text()
        assert (await stored(page))['raw']==raw
        assert not any(c[0]=='event' for c in await entries(page))
        report['checks'].append('Accepted: live tag and intercepted GA collect; clean page URL; intro excluded; explicit action; replay dedup; reload/resume ready without milestones')
        # Resume beyond the first beat; content edits restore by raw text, then clamp if removed.
        await page.locator('#next').click();await more(page,'#reveal');await page.locator('#next').click();await more(page,'#reveal')
        position=await stored(page);old_index=position['index'];old_raw=position['raw'];assert old_index>=2
        scene_url=origin+'/skip/'+story['file'];data=json.loads((root/'skip'/story['file']).read_text())
        edited={**data,'source':'New editorial opening.\n\n---\n\n'+data['source']}
        await page.route(scene_url,lambda route:route.fulfill(json=edited))
        await page.reload();await page.wait_for_timeout(700)
        restored=await stored(page);assert restored['raw']==old_raw,(restored['index'],old_index)
        assert restored['index']==old_index+1
        assert not any(c[0]=='event' for c in await entries(page))
        edited['source']='Replacement single beat.'
        await page.reload();await page.wait_for_timeout(700)
        assert (await stored(page))['index']==0
        assert not any(c[0]=='event' for c in await entries(page))
        await page.unroute(scene_url);await page.reload();await page.wait_for_timeout(700)
        await more(page,'#restart');assert (await stored(page))['index']==0
        assert 'ready' in await page.locator('#status').inner_text()
        report['checks'].append('Existing position record: exact raw beat relocation after insertion, clamp after removal, restart first beat; no restore backfill')
        # Withdrawal after real GA is active; keep page open to detect delayed sends.
        await page.get_by_role('button',name='Privacy and analytics settings',exact=True).click()
        assert 'accepted' in await page.locator('#analytics-consent-choice').inner_text()
        await page.get_by_role('button',name='Decline analytics',exact=True).click()
        before=len(requests);await page.wait_for_timeout(2500)
        assert len(requests)==before,requests[before:]
        assert await page.locator('iframe').count()==0
        assert not any(c['name'].startswith('stga_ga') for c in await ctx.cookies())
        await page.locator('#next').click();await more(page,'#reveal');await page.wait_for_timeout(500);assert len(requests)==before
        assert (await stored(page))['sourceUri']==story['id']
        await page.reload();await page.wait_for_timeout(500);assert len(requests)==before
        assert not errors,errors
        report['checks'].append('Withdrawn: frame terminated, prefixed GA cookies removed, no delayed/navigation/reload requests; position preserved')
        report['observed_collection_events']=sorted(set(name for r in requests for name in re.findall(r'(?:[?&\n]|^)en=([^&\n]+)',r['url']+'\n'+r['body'])))
        report['remote_script_requests']=sum('googletagmanager.com' in r['url'] for r in requests)
        report['intercepted_collection_requests']=sum('google-analytics.com' in r['url'] for r in requests)
        await ctx.close()
        # Cross-tab withdrawal uses the same preference record.
        ctx,page,requests,errors=await context();await page.get_by_role('button',name='Accept analytics',exact=True).click();await page.wait_for_timeout(1000)
        other=await ctx.new_page();await other.goto(url);await other.get_by_role('button',name='Privacy and analytics settings',exact=True).click();await other.get_by_role('button',name='Decline analytics',exact=True).click()
        await page.wait_for_timeout(600);assert await page.locator('iframe').count()==0
        assert 'declined' in await page.locator('#analytics-consent-choice').text_content()
        report['checks'].append('Cross-tab withdrawal stops active analytics')
        await other.get_by_role('button',name='Privacy and analytics settings',exact=True).click();await other.get_by_role('button',name='Accept analytics',exact=True).click()
        await page.wait_for_timeout(500);assert await page.locator('iframe').count()==1
        await other.evaluate('localStorage.clear()');await page.wait_for_timeout(500)
        assert await page.locator('iframe').count()==0
        report['checks'].append('Clearing consent in another tab restores unset and stops active analytics')
        assert not errors,errors
        await ctx.close()
        # Real runtime timed exposure: every beat advances only on a reader turn;
        # timers reveal content without fabricating further actions.
        ctx,page,requests,errors=await context()
        await page.get_by_role('button',name='Accept analytics',exact=True).click();await page.wait_for_timeout(1000)
        await page.clock.install()
        plan=json.loads((build/'playback-plan.json').read_text())
        story_plan=next(item for item in plan if item['id']==story['id'])
        await choose_scene(page,story)
        for index,beat in enumerate(story_plan['beats']):
            if index: await page.locator('#next').click()
            await page.clock.run_for(beat['reducedMotionDuration']+50)
            await page.wait_for_function('() => document.querySelector("#status").textContent.includes("completed")')
        events=[c for c in await entries(page) if c[0]=='event']
        complete=next(c[2] for c in events if c[1]=='story_complete')
        assert complete['evidence']=='display_only' and complete['playback_mode']=='autoplay'
        assert complete['autoplay_beats']==len(story_plan['beats']),complete
        assert sum(c[1]=='reading_interaction' for c in events)==len(story_plan['beats'])
        assert not any(c[1]=='publication_complete' for c in events)
        assert not errors,errors
        report['checks'].append('Actual timed autoplay completes every beat of first story; completion display_only, autoplay beat count exact, no timer-generated interactions or publication completion')
        await ctx.close()
        # A readable site rejection is honored and cannot be bypassed locally.
        ctx,page,requests,errors=await context()
        await ctx.add_cookies([{'name':'CookieScriptConsent','value':json.dumps({'action':'reject','categories':'[]'}),'url':origin}])
        await page.reload();await page.wait_for_timeout(200)
        assert 'declined' in await page.locator('#analytics-consent-choice').text_content()
        await page.get_by_role('button',name='Privacy and analytics settings',exact=True).click();await page.get_by_role('button',name='Accept analytics',exact=True).click()
        await page.wait_for_timeout(600);assert not requests
        report['checks'].append('Readable shared-site rejection wins over local acceptance')
        await ctx.close()
        ctx,page,requests,errors=await context(has_touch=True,is_mobile=True)
        await page.tap('[aria-label="Close privacy settings without changing consent"]')
        assert not await page.locator('#analytics-consent-panel').is_visible()
        await page.tap('#analytics-privacy-button');assert await page.locator('#analytics-consent-panel').is_visible()
        await page.get_by_role('button',name='Decline analytics',exact=True).tap()
        assert not await page.locator('#analytics-consent-panel').is_visible()
        await page.tap('#analytics-privacy-button');assert 'declined' in await page.locator('#analytics-consent-choice').inner_text()
        assert not requests and not errors
        report['checks'].append('Touch-emulated dismissal/reopen/decline and current-choice display without analytics requests')
        await ctx.close();await browser.close()
    finally:server.shutdown()
    return report

result=asyncio.run(run(pathlib.Path(sys.argv[1]), sys.argv[3].rstrip('/') if len(sys.argv)>3 else None))
text=json.dumps(result,indent=2)+'\n'
if len(sys.argv)>2:pathlib.Path(sys.argv[2]).write_text(text)
print(text)
