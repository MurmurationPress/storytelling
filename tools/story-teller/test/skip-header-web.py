"""Actual exported book: compact scene context, distinct speed and narrow layouts."""
import asyncio,json,pathlib,sys
from playwright.async_api import async_playwright
async def run(build,origin):
    book=json.loads((build/'site/skip/publication.json').read_text());checks=[]
    async with async_playwright() as p:
      browser=await p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox'])
      page=await browser.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
      await page.goto(origin+'/skip/');await page.wait_for_selector('#beat h1');await page.locator('#autoplay').uncheck()
      for item in book['scenes']:
        await page.locator('#contents-toggle').click();await page.locator('#contents button').get_by_text(f"{item['label']} {item['title']}",exact=True).click()
        await page.wait_for_function('title=>document.querySelector("#scene-title").textContent===title',arg=item['title'])
        await page.wait_for_function('()=>document.querySelector("#status").textContent.includes("ready")')
        assert 'Beat 1 of ' in await page.locator('#status').inner_text()
        assert 'Prose pacing On (book)' in await page.locator('#status').inner_text()
        assert await page.locator('#playback-speed').input_value()=='1'
        headings=await page.locator('#beat h1').all_text_contents();assert item['title'] not in headings,(item['title'],headings)
        checks.append(item['title'])
      for width in [1100,390,320]:
        await page.set_viewport_size({'width':width,'height':780})
        assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        await page.screenshot(path=str(build/f'header-{width}.png'),full_page=True)
      await page.locator('#playback-speed').select_option('0.75');assert 'Prose pacing On (book)' in await page.locator('#status').inner_text()
      await page.reload();await page.wait_for_selector('#scene-title');assert await page.locator('#playback-speed').input_value()=='0.75'
      assert not errors,errors
      evidence={'origin':origin,'browser':browser.version,'allSceneTitles':checks,'widths':[1100,390,320],'matchingBodyTitlesSuppressed':True,'separateSpeedAndAuthoredPacing':True,'errors':errors,'method':'Automated Linux Chrome; not actual device or screen reader testing'}
      (build/'header-validation.json').write_text(json.dumps(evidence,indent=2)+'\n');print(json.dumps(evidence,indent=2));await browser.close()
asyncio.run(run(pathlib.Path(sys.argv[1]),sys.argv[2]))
