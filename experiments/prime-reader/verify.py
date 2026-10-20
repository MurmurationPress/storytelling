#!/usr/bin/env python3
"""Content/package preservation and explicitly bounded derivative checks."""
from pathlib import Path
import hashlib,json,subprocess,sys,zipfile
ROOT=Path(__file__).resolve().parent
baseline=ROOT.parent/'planetary-epub/dist/planetary-model-playback-v2.epub'
epub=ROOT/'publication/planetary-model-encounter-v1.epub'
metadata=json.loads((ROOT/'publication/build.json').read_text())
assert hashlib.sha256(baseline.read_bytes()).hexdigest() == metadata['baseline_sha256'] == '9acb254df2428995f7e69fd6f78f2cb90abd04c1aad06dc703103766445ba0ed'
assert hashlib.sha256(epub.read_bytes()).hexdigest() == metadata['epub_sha256']
subprocess.run([sys.executable,str(ROOT.parent/'planetary-epub/verify.py'),'--epub',str(epub)],check=True)
with zipfile.ZipFile(baseline) as a,zipfile.ZipFile(epub) as b:
 changed={n for n in a.namelist() if a.read(n)!=b.read(n)}
 assert changed == {'EPUB/package.opf','EPUB/style.css','EPUB/state.xhtml','EPUB/image.xhtml'},changed
 assert set(b.namelist())-set(a.namelist()) == {'EPUB/encounter-head.js','EPUB/encounter.js'}
 for name in ['encounter-head.js','encounter.js']:
  assert b.read('EPUB/'+name)==(ROOT/'component'/name).read_bytes()
 assert 'rendition:layout-pre-paginated' not in b.read('EPUB/package.opf').decode()
 assert b'data-burst="3" data-interval="65"' in b.read('EPUB/state.xhtml')
 assert b'prime-presentation-v1' not in b.read('EPUB/state.xhtml'), 'Host marker must not ship in ordinary-reader fallback'
print('PASS: pinned baseline; derivative hash; exact allowed changes; component copies; original timing; host-only opt-in')
