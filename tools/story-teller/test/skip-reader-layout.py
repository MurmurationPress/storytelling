"""Full-book export regression: real document turns, following/rereading, themed notes.
Usage: python test/skip-reader-layout.py BUILD_ROOT HTTP_ORIGIN [EVIDENCE_LABEL]
Uses virtual active time for playback and actual wheel/touch input for scrolling.
"""
import asyncio, json, pathlib, re, sys
from playwright.async_api import async_playwright

def contrast(fg,bg):
    def light(value):
        channels=[int(n)/255 for n in re.findall(r'\d+',value)[:3]]
        channels=[n/12.92 if n<=.04045 else ((n+.055)/1.055)**2.4 for n in channels]
        return sum(a*b for a,b in zip(channels,[.2126,.7152,.0722]))
    a,b=sorted([light(fg),light(bg)])
    return (b+.05)/(a+.05)

async def run(build,origin,label):
    book=json.loads((build/'site/skip/publication.json').read_text())
    cases=[]
    async with async_playwright() as p:
        browser=await p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox'])
        version=browser.version
        for width,height,mobile in [(1100,780,False),(768,1024,True),(1024,768,True),(390,780,True),(320,568,True)]:
            for theme in ['light','dark']:
                ctx=await browser.new_context(viewport={'width':width,'height':height},is_mobile=mobile,has_touch=mobile,color_scheme=theme)
                page=await ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
                await page.goto(origin+'/skip/');await page.wait_for_selector('#beat h1');await page.clock.install()
                async def source(item):
                    await page.wait_for_function("({key,id})=>JSON.parse(localStorage.getItem(key)||'{}').sourceUri===id",arg={'key':'story-teller:'+book['id'],'id':item['id']})
                async def advance(ms):await page.clock.run_for(ms)
                async def state():return await page.evaluate("()=>({top:scrollY,height:document.scrollingElement.scrollHeight,viewport:innerHeight,last:document.getElementById('beat').lastElementChild.getBoundingClientRect().bottom,followVisible:!document.getElementById('follow-story').hidden,status:document.getElementById('status').textContent})")
                cdp=await ctx.new_cdp_session(page)
                async def scroll(amount,selector=None):
                    if selector:
                        r=await page.locator(selector).bounding_box();x=r['x']+r['width']/2;y=r['y']+min(r['height']/2,200)
                    else:x=40;y=height*.6
                    if mobile:
                        # Explicit points produce real touchmove/scroll events. The
                        # aggregate synthetic gesture emitted no moves with Clock installed.
                        metrics=await page.evaluate("selector=>{const e=selector?document.querySelector(selector):document.scrollingElement;const r=selector?e.getBoundingClientRect():{top:80,bottom:innerHeight-40};return {top:Math.max(0,r.top),bottom:Math.min(innerHeight,r.bottom),up:e.scrollTop,down:e.scrollHeight-e.clientHeight-e.scrollTop}}",selector)
                        distance=min(abs(amount),max(0,metrics['down' if amount>0 else 'up']))
                        initial=await page.evaluate('selector=>(selector?document.querySelector(selector):document.scrollingElement).scrollTop',selector)
                        target=initial+(distance if amount>0 else -distance)
                        strokes=0
                        span=metrics['bottom']-metrics['top']
                        while distance>2 and strokes<20:
                            strokes+=1
                            stroke=min(max(distance+30,60),span*.4,240)
                            start=metrics['top']+span*(.75 if amount>0 else .25)
                            direction=-1 if amount>0 else 1
                            await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':start}]})
                            for step in range(1,11):
                                await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x,'y':start+direction*stroke*step/10}]})
                                await page.wait_for_timeout(25)
                            await page.wait_for_timeout(100)
                            await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
                            current=await page.evaluate('selector=>(selector?document.querySelector(selector):document.scrollingElement).scrollTop',selector)
                            distance=max(0,(target-current)*(1 if amount>0 else -1))
                    else:
                        await page.mouse.move(x,y);await page.mouse.wheel(0,amount)
                    await page.wait_for_timeout(150)
                # Reproduce the normal front-matter Continue -> Introduction -> story path.
                # Contents-only tests did not exercise the inactive-follower bug.
                await page.locator('.beat-ending button').click();await source(book['scenes'][0]);await advance(600)
                await page.locator('.beat-ending button').click();await source(book['scenes'][1]);await advance(12000)
                await page.locator('#next').click();await advance(20000)
                auto=await state()
                assert auto['height']>auto['viewport']+100,auto
                assert auto['top']>100 and auto['last']<=auto['viewport']-4,('automatic follow after document turn',auto)
                assert not auto['followVisible'],auto
                # While the next mixed chat/prose beat is still growing, scroll back.
                await page.locator('#next').click()
                for _ in range(7):
                    await advance(4000)
                    if (await state())['top']>200:break
                growing=await state();assert growing['top']>100,growing
                await scroll(-300);back=await state()
                assert back['top']<growing['top']-20,('manual rereading',growing,back)
                assert back['followVisible'],back
                await advance(6000);held=await state()
                assert held['top']<=back['top']+3,('following pulled rereader down',back,held)
                await (page.locator('#follow-story').tap() if mobile else page.locator('#follow-story').click());await advance(4000);resumed=await state()
                assert resumed['top']>held['top']+50,('Follow story did not resume',held,resumed)
                await page.locator('#previous').click();await advance(3000)
                assert (await state())['top']==0,('silent Previous must start at top',await state())
                await scroll(10000)
                assert await page.locator('.beat-ending button').evaluate('e=>{const r=e.getBoundingClientRect();return r.top>=0 && r.bottom<=innerHeight}'),await state()
                # Use Contents only now, for the long actual supporting note and matter.
                await page.locator('#contents-toggle').click();await page.locator('#contents button').get_by_text('1 Introduction',exact=True).click();await source(book['scenes'][0]);await advance(600)
                await page.keyboard.press('Tab') # Switch from touch to keyboard focus previews.
                link=page.locator('#beat button.wiki-link[data-story-target="The PRIME Novels"]:visible')
                await link.focus();await page.wait_for_selector('#supporting-preview:not([hidden])')
                tip=await page.locator('#supporting-preview').evaluate('e=>({bg:getComputedStyle(e).backgroundColor,fg:getComputedStyle(e).color,x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y,right:e.getBoundingClientRect().right,bottom:e.getBoundingClientRect().bottom})')
                body=await page.evaluate('({bg:getComputedStyle(document.body).backgroundColor,fg:getComputedStyle(document.body).color,w:innerWidth,h:innerHeight})')
                assert tip['bg']==body['bg'] and tip['fg']==body['fg'],(theme,tip,body)
                assert contrast(tip['fg'],tip['bg'])>=4.5,(theme,tip)
                assert tip['x']>=0 and tip['right']<=body['w'] and tip['y']>=0 and tip['bottom']<=body['h'],tip
                await link.press('Enter');await page.wait_for_selector('dialog[open]')
                panel=await page.locator('dialog').evaluate('e=>({bg:getComputedStyle(e).backgroundColor,fg:getComputedStyle(e).color,x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y,right:e.getBoundingClientRect().right,bottom:e.getBoundingClientRect().bottom,articleHeight:e.querySelector("article").clientHeight,articleScrollHeight:e.querySelector("article").scrollHeight})')
                assert panel['bg']==body['bg'] and panel['fg']==body['fg'],(theme,panel,body)
                assert contrast(panel['fg'],panel['bg'])>=4.5
                assert panel['x']>=0 and panel['right']<=body['w'] and panel['y']>=0 and panel['bottom']<=body['h'],panel
                assert panel['articleScrollHeight']>panel['articleHeight'],panel
                outer=await page.evaluate('scrollY');await scroll(1500,'dialog article')
                assert await page.locator('dialog article').evaluate('e=>e.scrollTop')>0
                assert abs(await page.evaluate('scrollY')-outer)<=2
                await page.screenshot(path=str(build/f'notes-{width}-{theme}-{label}.png'))
                await page.locator('[aria-label="Close supporting note"]').click()
                # A static matter page remains at its start, with manual up/down access.
                await page.locator('#contents-toggle').click();await page.locator('#contents button').get_by_text('Back Matter',exact=True).click();await source(book['readingOrder'][-1]);await advance(1000)
                assert (await state())['top']==0
                await scroll(1000);down=await page.evaluate('scrollY');assert down>100
                await scroll(-300);assert await page.evaluate('scrollY')<down-20
                await page.locator('#previous').click();await source(book['scenes'][-1]);await advance(1200)
                assert (await state())['top']==0,('Previous scene must remain at its start',await state())
                assert 'completed' in (await state())['status']
                assert not errors,errors
                cases.append({'width':width,'height':height,'mobileTouchEmulation':mobile,'theme':theme,'autoAfterDocumentTurn':auto,'suspendedDuringNewContent':held,'followResumed':resumed,'preview':tip,'panel':panel,'contrast':contrast(panel['fg'],panel['bg']),'manualScrolling':True,'endControlReachable':True,'silentPreviousAtTop':True,'silentPreviousAcrossScenes':True,'noteArticleScrollContained':True})
                print('PASS layout/follow/theme',width,theme,flush=True)
                await ctx.close()
        await browser.close()
    report={'origin':origin,'browser':version,'cases':cases,'actualDeviceTest':False,'method':'Full committed book export; virtual playback time, real wheel/touch gestures, computed light/dark colours and contrast','limitations':['No actual iPad/Safari or screen-reader testing','No human listening claim']}
    (build/f'layout-follow-theme-{label}.json').write_text(json.dumps(report,indent=2)+'\n')

if __name__=='__main__':asyncio.run(run(pathlib.Path(sys.argv[1]).resolve(),sys.argv[2].rstrip('/'),sys.argv[3] if len(sys.argv)>3 else 'local'))
