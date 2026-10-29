"""Compare exact same book/scene/state and CSS viewports before/after toolbar refinement."""
import asyncio,json,pathlib,sys
from playwright.async_api import async_playwright
async def run(build,origin,baseline):
 book=json.loads((build/'site/skip/publication.json').read_text());scene=book['scenes'][2];cases=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox'])
  for width,height in [(768,1024),(1024,768),(820,1180),(1180,820),(390,844),(320,568)]:
   samples={}
   for label,url in [('before',baseline),('after',origin)]:
    ctx=await browser.new_context(viewport={'width':width,'height':height},is_mobile=True,has_touch=True,color_scheme='light')
    await ctx.add_init_script('localStorage.setItem('+json.dumps('story-teller:'+book['id'])+', '+json.dumps(json.dumps({'sourceUri':scene['id'],'index':0,'autoplayOnTurn':False}))+');')
    page=await ctx.new_page();await page.goto(url+'/skip/');await page.wait_for_function('title=>document.querySelector("#scene-title").textContent===title&&document.querySelector("#status").textContent.includes("ready")',arg=scene['title'])
    assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    samples[label]=await page.evaluate('''()=>({headerHeight:document.querySelector('body>header').getBoundingClientRect().height,toolbarHeight:document.querySelector('nav').getBoundingClientRect().height,readingStart:document.querySelector('#beat').getBoundingClientRect().top+scrollY,viewportHeight:innerHeight})''')
    samples[label]['supportingHeaderPadding']=await page.locator('dialog header').evaluate('e=>getComputedStyle(e).padding')
    samples[label]['bodyHeadingFontSize']=await page.locator('#beat').evaluate('e=>{const h=document.createElement("h1");e.append(h);const size=getComputedStyle(h).fontSize;h.remove();return size;}')
    await page.screenshot(path=str(build/f'space-{width}-{height}-{label}.png'),full_page=False);await ctx.close()
   assert samples['before']['supportingHeaderPadding']==samples['after']['supportingHeaderPadding'],samples
   assert samples['before']['bodyHeadingFontSize']==samples['after']['bodyHeadingFontSize'],samples
   before=samples['before']['readingStart'];after=samples['after']['readingStart'];assert after<before,(width,samples)
   cases.append({'width':width,'height':height,**samples,'recoveredPixels':round(before-after,2),'controlAreaReductionPercent':round((before-after)/before*100,2),'viewportRecoveredPercent':round((before-after)/height*100,2)})
  await browser.close()
 result={'baseline':baseline,'candidate':origin,'sceneId':scene['id'],'sceneTitle':scene['title'],'state':'ready, first beat; Contents/More closed; autoplay disabled; browser storage reset','method':'Automated Linux Chrome, CSS viewports and touch emulation; browser chrome not simulated','cases':cases}
 (build/'compact-space-validation.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
asyncio.run(run(pathlib.Path(sys.argv[1]),sys.argv[2].rstrip('/'),sys.argv[3].rstrip('/')))
