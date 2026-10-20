#!/usr/bin/env python3
"""Verify package text/order against independently specified pinned source ranges."""
from pathlib import Path, PurePosixPath
import argparse
import hashlib
import json
import posixpath
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parent
NS = {'x': 'http://www.w3.org/1999/xhtml', 'o': 'http://www.idpf.org/2007/opf'}
source = (ROOT / 'source/scene.md').read_text().splitlines()
# Inclusive manuscript lines, not generated extraction output.
ranges = {'opening.xhtml': (48, 58), 'state.xhtml': (63, 69),
          'before-image.xhtml': (72, 78), 'after-image.xhtml': (81, 96)}
parser = argparse.ArgumentParser()
parser.add_argument('--diagnostic', action='store_true')
variant = '-diagnostic' if parser.parse_args().diagnostic else ''
with zipfile.ZipFile(ROOT / ('dist/planetary-model-playback-v2' + variant + '.epub')) as z:
    assert z.infolist()[0].filename == 'mimetype'
    assert z.infolist()[0].compress_type == zipfile.ZIP_STORED
    assert z.read('mimetype') == b'application/epub+zip'
    assert z.read('EPUB/habitat.svg') == (ROOT / 'source/habitat.svg').read_bytes()
    package = ET.fromstring(z.read('EPUB/package.opf'))
    manifest = {i.attrib['id']: i.attrib for i in package.findall('o:manifest/o:item', NS)}
    actual_order = [manifest[i.attrib['idref']]['href'] for i in package.findall('o:spine/o:itemref', NS)]
    assert actual_order == ['opening.xhtml', 'state.xhtml', 'before-image.xhtml', 'image.xhtml', 'after-image.xhtml']
    for name, (first, last) in ranges.items():
        expected = '\n'.join(line.removeprefix('> ') if line.startswith('> ') else '' for line in source[first-1:last]).strip('\n')
        doc = ET.fromstring(z.read('EPUB/' + name))
        if name == 'state.xhtml':
            actual = doc.find('.//x:pre[@id="complete"]', NS).text
        else:
            actual = '\n\n'.join(''.join(p.itertext()) for p in doc.findall('.//x:p', NS))
        assert actual == expected, name
    names = set(z.namelist())
    for name in names:
        if name.endswith(('.xhtml', '.opf', '.svg')):
            doc = ET.fromstring(z.read(name))
            for el in doc.iter():
                for attr in ('href', 'src', '{http://www.w3.org/1999/xlink}href'):
                    ref = el.get(attr)
                    if ref and not ref.startswith('#'):
                        assert '://' not in ref and not ref.startswith('//'), (name, ref)
                        target = posixpath.normpath(str(PurePosixPath(name).parent / ref.split('#')[0]))
                        assert target in names, (name, target)
    for item in manifest.values():
        assert 'EPUB/' + item['href'] in names
provenance = json.loads((ROOT / 'source/provenance.json').read_text())
for name, info in provenance['files'].items():
    assert hashlib.sha256((ROOT / 'source' / name).read_bytes()).hexdigest() == info['sha256']
print('PASS: pinned source hashes; exact prose/YAML; reading order; original SVG; package references; no remote resources')
