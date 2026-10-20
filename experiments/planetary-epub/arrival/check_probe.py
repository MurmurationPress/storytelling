#!/usr/bin/env python3
"""Browser component checks only; native recordings establish reader observations."""
from pathlib import Path
import json
import tempfile
import zipfile
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parent.parent
with tempfile.TemporaryDirectory() as td, sync_playwright() as p:
    dest = Path(td)
    with zipfile.ZipFile(ROOT / 'dist/planetary-model-arrival-load-probe-v1.epub') as z:
        z.extractall(dest)
    url = (dest / 'EPUB/state.xhtml').as_uri()
    b = p.chromium.launch()
    page = b.new_page(viewport={'width':1000,'height':720})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(url)
    assert page.locator('#complete').evaluate('(e)=>getComputedStyle(e).opacity') == '0'
    counts=[]
    for _ in range(3):
        page.wait_for_timeout(500)
        counts.append(len(page.locator('#output').text_content()))
    assert 0 < counts[0] < counts[1] < counts[2], counts
    page.locator('#reveal').click()
    assert page.locator('#complete').evaluate('(e)=>getComputedStyle(e).opacity') == '1'
    page.reload()
    assert page.locator('#complete').evaluate('(e)=>getComputedStyle(e).opacity') == '1'
    assert page.locator('#begin').text_content() == 'Replay output'
    nojs = b.new_context(java_script_enabled=False)
    fallback = nojs.new_page()
    fallback.goto(url)
    assert fallback.locator('#complete').is_visible()
    assert fallback.locator('#complete').evaluate('(e)=>getComputedStyle(e).opacity') == '1'
    reduced = b.new_context(reduced_motion='reduce')
    static = reduced.new_page()
    static.goto(url)
    assert static.locator('#complete').evaluate('(e)=>getComputedStyle(e).opacity') == '1'
    assert 'Reduced motion' in static.locator('#status').text_content()
    assert static.locator('#begin').is_disabled()
    assert not errors, errors
    result={'scope':'Browser component checks, not native arrival evidence', 'browser':b.version,
            'passed':['head bootstrap hides full text', 'automatic prefixes increase', 'immediate reveal',
                      'completed reload stays complete', 'no-script full text', 'reduced-motion full text and explanation'],
            'arrival_contract':'NOT established; probe is not an approved arrival implementation'}
    (ROOT / 'evidence/arrival-v1/browser-results.json').write_text(json.dumps(result,indent=2)+'\n')
    print(result)
    b.close()
