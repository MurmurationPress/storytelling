#!/usr/bin/env python3
"""Derivative of the preserved playback-v2 package; no manuscript or baseline writes."""
from pathlib import Path
import zipfile,xml.etree.ElementTree as ET,hashlib,json
ROOT=Path(__file__).resolve().parent
BASE=ROOT.parent/'planetary-epub/dist/planetary-model-playback-v2.epub'
OUT=ROOT/'publication/planetary-model-encounter-v1.epub'
NS={'o':'http://www.idpf.org/2007/opf'}
with zipfile.ZipFile(BASE) as z: files={n:z.read(n) for n in z.namelist()}
op=files['EPUB/package.opf'].decode().replace('playback-v2','encounter-v1')
# EPUB.js 0.3.93's default rendition uses one global layout. All items reflow here.
op=op.replace(' properties="rendition:layout-pre-paginated rendition:spread-none"','')
op=op.replace('</manifest>','<item id="encounter-head" href="encounter-head.js" media-type="text/javascript"/><item id="encounter" href="encounter.js" media-type="text/javascript"/></manifest>')
files['EPUB/package.opf']=op.encode()
s=files['EPUB/state.xhtml'].decode().replace('playback-v2','encounter-v1')
s=s.replace('<meta name="viewport" content="width=1000,height=720"/>','')
s=s.replace('<link rel="stylesheet"','<script src="encounter-head.js"></script><link rel="stylesheet"',1)
s=s.replace('src="state.js"','src="encounter.js"').replace('class="fixed"','class="state-page"')
files['EPUB/state.xhtml']=s.encode()
s=files['EPUB/image.xhtml'].decode().replace('<meta name="viewport" content="width=1000,height=720"/>','').replace('class="fixed"','class="image-page"')
files['EPUB/image.xhtml']=s.encode()
files['EPUB/style.css']+=b'''\n/* encounter-v1 only: bounded reflowable surfaces for EPUB.js */
body.state-page, body.image-page { margin: 0; }
.state-page main.state { padding: 28px 24px; max-width: 890px; margin: auto; }
.state-page pre { font-size: clamp(12px, 2.2vw, 22px); }
.state-page h1 { font-size: clamp(18px, 2.4vw, 24px); }
.state-page #controls { font-size: clamp(14px, 1.7vw, 17px); margin-top: 28px; }
.state-page #status { font-size: inherit; min-height: 3em; }
.prime-pending #complete { opacity: 0; }
.prime-pending #output { display: block; }
.prime-pending #output::after { content: '\\258F'; color: #526b72; }
.image-page .map { height: 80vh; }
.image-page .map img { width: 100%; height: 100%; object-fit: contain; }
@media (prefers-reduced-motion: reduce) {
  .prime-pending #complete { opacity: 1; }
  .prime-pending #output { display: none; }
}
'''
for name in ['encounter-head.js','encounter.js']: files['EPUB/'+name]=(ROOT/'component'/name).read_bytes()
OUT.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(OUT,'w') as z:
 for name,data in files.items():
  if name.endswith(('.xhtml','.opf','.svg')): ET.fromstring(data)
  info=zipfile.ZipInfo(name,(2026,10,20,0,0,0)); info.compress_type=zipfile.ZIP_STORED if name=='mimetype' else zipfile.ZIP_DEFLATED
  z.writestr(info,data)
(ROOT/'publication/build.json').write_text(json.dumps({'version':'encounter-v1','baseline_sha256':hashlib.sha256(BASE.read_bytes()).hexdigest(),'epub_sha256':hashlib.sha256(OUT.read_bytes()).hexdigest()},indent=2)+'\n')
print(OUT)
