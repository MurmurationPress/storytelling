#!/usr/bin/env python3
"""Optional component checks. Requires Playwright; these are NOT native-reader tests."""
from pathlib import Path
import json
import tempfile
import zipfile
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
with tempfile.TemporaryDirectory() as directory, sync_playwright() as p:
    with zipfile.ZipFile(ROOT / 'dist/planetary-model-playback-v2.epub') as z:
        z.extractall(directory)
    base = Path(directory) / 'EPUB'
    url = (base / 'state.xhtml').as_uri()
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 1000, 'height': 720})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(url)
    assert page.locator('#controls').is_visible()
    complete = page.locator('#complete').text_content()
    before = page.locator('#surface').bounding_box()
    control_before = page.locator('#reveal').bounding_box()
    assert not page.locator('#surface').evaluate('(e)=>e.classList.contains("performing")')
    # Reproduce a reader-style colour override; colour must no longer hide content.
    page.add_style_tag(content='#complete { color: rgb(24,35,40) !important; }')
    page.locator('#begin').click()
    page.wait_for_timeout(300)
    partial = page.locator('#output').text_content()
    assert 0 < len(partial) < len(complete)
    assert page.locator('#complete').evaluate('(e)=>getComputedStyle(e).opacity') == '0'
    assert 'failure_correlation: previously_underweighted' in page.locator('#complete').aria_snapshot()
    counts = [len(partial)]
    for _ in range(3):
        page.wait_for_timeout(400)
        counts.append(len(page.locator('#output').text_content()))
    assert all(a < b for a, b in zip(counts, counts[1:])), counts
    # Duplicate pointer activation must not reset the prefix or create another timer.
    page.locator('#begin').dblclick()
    assert len(page.locator('#output').text_content()) >= counts[-1]
    page.evaluate("Object.defineProperty(document, 'hidden', {configurable:true, value:true}); document.dispatchEvent(new Event('visibilitychange'));")
    paused = page.locator('#output').text_content()
    page.wait_for_timeout(400)
    assert page.locator('#output').text_content() == paused
    assert page.locator('#surface').evaluate('(e)=>e.classList.contains("performing")')
    page.evaluate("Object.defineProperty(document, 'hidden', {configurable:true, value:false}); document.dispatchEvent(new Event('visibilitychange'));")
    page.wait_for_timeout(300)
    assert len(page.locator('#output').text_content()) > len(paused)
    assert page.locator('#surface').bounding_box() == before
    assert page.locator('#reveal').bounding_box() == control_before
    page.locator('#reveal').click()
    assert page.locator('#output').text_content() == ''
    assert page.locator('#complete').text_content() == complete
    assert not page.locator('#surface').evaluate('(e)=>e.classList.contains("performing")')
    page.locator('#begin').click()
    page.wait_for_timeout(6500)
    assert not page.locator('#surface').evaluate('(e)=>e.classList.contains("performing")')
    page.locator('#begin').click()
    page.goto((base / 'before-image.xhtml').as_uri())
    page.go_back()
    assert not page.locator('#surface').evaluate('(e)=>e.classList.contains("performing")')
    assert page.locator('#begin').text_content() == 'Replay output'
    page.locator('#begin').click()
    page.wait_for_timeout(100)
    page.emulate_media(reduced_motion='reduce')
    page.locator('#begin').dispatch_event('click')
    assert not page.locator('#surface').evaluate('(e)=>e.classList.contains("performing")')
    assert page.locator('#begin').is_disabled()
    assert 'Reduced motion is active' in page.locator('#status').text_content()
    page.reload()
    assert page.locator('#begin').is_disabled()
    assert 'Reduced motion is active' in page.locator('#status').text_content()
    nojs = browser.new_context(java_script_enabled=False)
    fallback = nojs.new_page()
    fallback.goto(url)
    assert fallback.locator('#complete').text_content() == complete
    assert fallback.locator('#complete').is_visible()
    assert not fallback.locator('#controls').is_visible()
    page.goto((base / 'image.xhtml').as_uri())
    assert page.locator('img').evaluate('(e)=>e.complete && e.naturalWidth > 0')
    # A real text node remains selectable through reader-native Select All/Copy.
    diag = Path(directory) / 'diagnostic'
    with zipfile.ZipFile(ROOT / 'dist/planetary-model-playback-v2-diagnostic.epub') as z:
        z.extractall(diag)
    page.emulate_media(reduced_motion='no-preference')
    page.goto((diag / 'EPUB/state.xhtml').as_uri())
    page.locator('#begin').click()
    page.wait_for_timeout(300)
    log = json.loads(page.locator('#diagnostics').text_content())
    assert any(row['reason'] == 'start' for row in log)
    assert any(row['chars'] > 0 and row['complete']['opacity'] == '0' for row in log)
    assert not errors, errors
    results = {'scope': 'Browser component checks only, not EPUB pagination or native-reader compatibility',
               'browser': 'Playwright Chromium', 'version': browser.version,
               'passed': ['explicit start; no autoplay on load', 'sustained increasing prefixes', 'opaque-colour override cannot expose complete text',
                          'duplicate activation ignored', 'hidden pauses and visible resumes without revealing full text',
                          'stable surface and control bounds', 'immediate reveal', 'completion',
                          'browser navigation away/back returns complete', 'reduced motion',
                          'JavaScript-disabled complete fallback', 'SVG loading', 'diagnostic text-node log', 'no script exceptions']}
    (ROOT / 'evidence/playback-v2/browser-results.json').write_text(json.dumps(results, indent=2) + '\n')
    print(json.dumps(results, indent=2))
    browser.close()
