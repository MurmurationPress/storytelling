#!/usr/bin/env python3
"""Single-extract EPUB 3 builder. Python standard library only; no network."""
from pathlib import Path
import hashlib
import html
import json
import argparse
import zipfile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / 'source'
PRESENTATION = ROOT / 'presentation'
OUT = ROOT / 'dist'
E = html.escape

def extract():
    provenance = json.loads((SOURCE / 'provenance.json').read_text())
    for name, info in provenance['files'].items():
        assert hashlib.sha256((SOURCE / name).read_bytes()).hexdigest() == info['sha256'], name
    source = (SOURCE / 'scene.md').read_text()
    lines = source.splitlines()
    def find(value):
        return lines.index(value)
    start = find('> Demand reduced. Restoration followed through network operations.')
    state_start = find('> HostComparison:')
    state_end = lines.index('> ```', state_start)
    after_start = find('> Migration preserved execution where local supply failed.')
    image = find('> ![[Story World/Visualisations/PRIME Habitat - Planetary Model - 2030-04-04.svg]]')
    end = find('> Retain dispersal. Recalculate what it protects.') + 1
    opening_end = find('> Extend the assessment beyond the interval.') + 1
    def clean(a, b):
        return '\n'.join(line[2:] if line.startswith('> ') else '' for line in lines[a:b]).strip('\n')
    parts = {'opening': clean(start, opening_end), 'state': clean(state_start, state_end),
             'before-image': clean(after_start, image), 'after-image': clean(image + 1, end)}
    bounds = {'opening': [start + 1, opening_end], 'state': [state_start + 1, state_end],
              'before-image': [after_start + 1, image], 'image': [image + 1, image + 1],
              'after-image': [image + 2, end]}
    return parts, bounds

def document(title, body, fixed=False, script=False, diagnostic=False):
    viewport = '<meta name="viewport" content="width=1000,height=720"/>' if fixed else ''
    js = ('<script src="diagnostics.js"></script>' if diagnostic else '') + ('<script src="state.js"></script>' if script else '')
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en"><head><title>{E(title)}</title>{viewport}<link rel="stylesheet" href="style.css"/></head><body class="{'fixed' if fixed else 'prose'}">{body}{js}</body></html>'''

def paragraphs(text):
    return ''.join('<p>' + E(p) + '</p>' for p in text.split('\n\n'))

def build(diagnostic=False):
    version = "playback-v2" + ("-diagnostic" if diagnostic else "")
    parts, bounds = extract()
    settings = json.loads((PRESENTATION / 'settings.json').read_text())
    assert (settings['surface_width'], settings['surface_height']) == (1000, 720)
    OUT.mkdir(exist_ok=True)
    files = {}
    files['opening.xhtml'] = document('ContinuityReview — closing prose', paragraphs(parts['opening']))
    files['state.xhtml'] = document('HostComparison', f'''<main class="state"><h1>PRIME · 2030-04-04 08:22 <small style="font-size:14px">{version}</small></h1>
<div id="surface" data-burst="{settings['burst_characters']}" data-interval="{settings['interval_ms']}"><pre id="complete">{E(parts['state'])}</pre><pre id="output" aria-hidden="true"></pre></div>
<div id="controls" hidden="hidden"><button id="begin" type="button">Begin output</button><button id="reveal" type="button">Show complete output</button><p id="status" role="status">Complete text is available. Begin output to perform it; turn the page whenever you wish.</p></div></main>''', True, True, diagnostic)
    files['before-image.xhtml'] = document('SharedDependency', paragraphs(parts['before-image']))
    files['image.xhtml'] = document('PRIME habitat', '<main class="map"><img src="habitat.svg" alt="PRIME infrastructure comparison. Hatching estimates UK-linked JANUS operational reach, not sovereignty. Presence does not imply complete access or control; contours illustrate infrastructure concentration."/></main>', True)
    files['after-image.xhtml'] = document('SharedDependency — continued', paragraphs(parts['after-image']))
    titles = ['ContinuityReview — closing prose', 'HostComparison', 'SharedDependency', 'PRIME habitat', 'SharedDependency — continued']
    spine = list(files)
    files['nav.xhtml'] = document('Contents', '<nav xmlns:epub="http://www.idpf.org/2007/ops" epub:type="toc"><h1>Planetary Model — capability extract</h1><ol>' + ''.join(f'<li><a href="{name}">{E(title)}</a></li>' for name, title in zip(spine, titles)) + '</ol></nav>')
    files['style.css'] = (PRESENTATION / 'style.css').read_text()
    files['state.js'] = (PRESENTATION / 'state.js').read_text()
    if diagnostic:
        files['diagnostics.js'] = (PRESENTATION / 'diagnostics.js').read_text()
    files['habitat.svg'] = (SOURCE / 'habitat.svg').read_bytes()
    manifest = []
    for name in files:
        ext = name.rsplit('.', 1)[1]
        media = {'xhtml': 'application/xhtml+xml', 'css': 'text/css', 'js': 'text/javascript', 'svg': 'image/svg+xml'}[ext]
        props = ' properties="nav"' if name == 'nav.xhtml' else ' properties="scripted"' if name == 'state.xhtml' else ''
        manifest.append(f'<item id="{name.replace(".", "-")}" href="{name}" media-type="{media}"{props}/>')
    refs = []
    for name in spine:
        props = ' properties="rendition:layout-pre-paginated rendition:spread-none"' if name in ('state.xhtml', 'image.xhtml') else ''
        refs.append(f'<itemref idref="{name.replace(".", "-")}"{props}/>')
    files['package.opf'] = f'''<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id" prefix="rendition: http://www.idpf.org/vocab/rendition/#"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">urn:murmuration:planetary-model:84fcdb5:{version}</dc:identifier><dc:title>Planetary Model — PRIME {version}</dc:title><dc:language>en</dc:language><meta property="dcterms:modified">2026-10-20T15:00:00Z</meta><meta property="rendition:layout">reflowable</meta><meta property="rendition:spread">none</meta></metadata><manifest>{''.join(manifest)}</manifest><spine>{''.join(refs)}</spine></package>'''
    container = '<?xml version="1.0"?><container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0"><rootfiles><rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/></rootfiles></container>'
    path = OUT / ('planetary-model-' + version + '.epub')
    with zipfile.ZipFile(path, 'w') as z:
        def put(name, data, compression=zipfile.ZIP_DEFLATED):
            info = zipfile.ZipInfo(name, (2026, 10, 20, 0, 0, 0))
            info.compress_type = compression
            z.writestr(info, data)
        put('mimetype', 'application/epub+zip', zipfile.ZIP_STORED)
        put('META-INF/container.xml', container)
        for name, data in files.items():
            if name.endswith(('.xhtml', '.opf', '.svg')):
                ET.fromstring(data)
            put('EPUB/' + name, data)
    (OUT / 'extraction.json').write_text(json.dumps({'source_lines_inclusive': bounds, 'content': parts}, ensure_ascii=False, indent=2) + '\n')
    print(path)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument("--diagnostic", action="store_true")
    build(parser.parse_args().diagnostic)
