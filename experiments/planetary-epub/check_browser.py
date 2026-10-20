#!/usr/bin/env python3
"""Optional component checks. Requires Playwright; these are NOT native-reader tests."""
from pathlib import Path
import json
import tempfile
import zipfile
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
with tempfile.TemporaryDirectory() as directory, sync_playwright() as p:
    with zipfile.ZipFile(ROOT / 'dist/planetary-model.epub') as z:
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
    page.locator('#begin').click()
    page.wait_for_timeout(300)
    partial = page.locator('#output').text_content()
    assert 0 < len(partial) < len(complete)
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
    page.emulate_media(reduced_motion='reduce')
    page.locator('#begin').click()
    assert not page.locator('#surface').evaluate('(e)=>e.classList.contains("performing")')
    nojs = browser.new_context(java_script_enabled=False)
    fallback = nojs.new_page()
    fallback.goto(url)
    assert fallback.locator('#complete').text_content() == complete
    assert fallback.locator('#complete').is_visible()
    assert not fallback.locator('#controls').is_visible()
    page.goto((base / 'image.xhtml').as_uri())
    assert page.locator('img').evaluate('(e)=>e.complete && e.naturalWidth > 0')
    assert not errors, errors
    results = {'scope': 'Browser component checks only, not EPUB pagination or native-reader compatibility',
               'browser': 'Playwright Chromium', 'version': browser.version,
               'passed': ['explicit start; no autoplay on load', 'partial burst output',
                          'stable surface and control bounds', 'immediate reveal', 'completion',
                          'browser navigation away/back returns complete', 'reduced motion',
                          'JavaScript-disabled complete fallback', 'SVG loading', 'no script exceptions']}
    (ROOT / 'evidence/browser-results.json').write_text(json.dumps(results, indent=2) + '\n')
    print(json.dumps(results, indent=2))
    browser.close()
