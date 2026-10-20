#!/usr/bin/env python3
"""One audited Art slice, not a manuscript compiler or general storyboard language."""
from pathlib import Path
import hashlib,html,json,zipfile,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parent
E=html.escape
PROV=json.loads((ROOT/'source/provenance.json').read_text())
raw=(ROOT/'source/art.md').read_bytes()
assert hashlib.sha256(raw).hexdigest()==PROV['sha256']
lines=raw.decode().splitlines(); storyboard=json.loads((ROOT/'storyboard.json').read_text())
files={}
def prose(first,last):return ''.join('<p>'+E(lines[n-1])+'</p>' for n in range(first,last+1) if lines[n-1])
def doc(title,body,identity=None):
 meta='<meta name="murmuration-component" content="'+E(json.dumps(identity,separators=(',',':')),quote=True)+'"/>' if identity else ''
 scripts='<script src="presentation.js"></script><script src="chat.js"></script>' if identity else ''
 return ('<?xml version="1.0" encoding="UTF-8"?>\n<html xmlns="http://www.w3.org/1999/xhtml" lang="en" xml:lang="en"><head><title>'+E(title)+'</title>'+meta+'<script src="head.js"></script><link rel="stylesheet" href="style.css"/></head><body>'+body+scripts+'</body></html>').encode()
opening=prose(462,470)
original="She looked at the two versions of the bird, then typed."
adapted="She looked at the two versions of the bird."
assert original in opening
opening=opening.replace(E(original),E(adapted[:-1])+'<span class="static-only">, then typed</span>.')
files['opening.xhtml']=doc('Art', '<main class="prose">'+opening+'</main>')
identities={}
for seq in storyboard['sequences']:
 for m in seq['messages']:
  assert lines[m['source_line']-1]=='{{'+m['speaker']+'|'+m['text']+'|}}'
  assert isinstance(m['delay_ms'],int) and 0<=m['delay_ms']<=10000
  assert isinstance(m['typing_ms'],int) and 0<=m['typing_ms']<=10000
 version=hashlib.sha256(json.dumps(seq,ensure_ascii=False,sort_keys=True).encode()).hexdigest()
 identity={k:seq[k] for k in ['resource','component']}
 identity.update(publication=storyboard['publication'],contract=storyboard['contract'],stateVersion=storyboard['state_version'],contentVersion=version)
 identities[seq['resource']]=identity
 def rows():return ''.join('<li class="message '+m['speaker'].lower()+'"><strong class="speaker">'+E(m['speaker'])+'</strong><p class="bubble">'+E(m['text'])+'</p></li>' for m in seq['messages'])
 body='<main class="chat"><h1>Canvas</h1><div id="surface"><section id="transcript" aria-label="Complete conversation"><ol>'+rows()+'</ol></section><section id="performance" aria-label="Conversation" tabindex="0" hidden="hidden"><ol aria-live="polite" aria-relevant="additions text">'+rows()+'</ol><p id="typing" hidden="hidden"><span></span> <b aria-hidden="true">···</b></p></section></div><div id="controls" hidden="hidden"><button id="begin" type="button">Begin conversation</button><button id="reveal" type="button">Show complete conversation</button><p id="status" role="status"></p></div><script id="settings" type="application/json">'+E(json.dumps(seq,ensure_ascii=False))+'</script></main>'
 files[seq['resource']]=doc(seq['title'],body,identity)
files['between.xhtml']=doc('Art · permission', '<main class="prose">'+prose(482,488)+'</main>')
files['after.xhtml']=doc('Art · Blue', '<main class="prose">'+prose(500,504)+'</main>')
spine=['opening.xhtml','ask.xhtml','between.xhtml','permission.xhtml','after.xhtml']
files['nav.xhtml']=doc('Contents','<nav xmlns:epub="http://www.idpf.org/2007/ops" epub:type="toc"><h1>Art · a short conversation</h1><ol>'+''.join('<li><a href="'+n+'">'+E(t)+'</a></li>' for n,t in zip(spine,['Art','Canvas · permission to ask','Art · permission','Canvas · just this drawing','Art · Blue']))+'</ol></nav>')
for n in ['head.js','chat.js','style.css']:files[n]=(ROOT/'component'/n).read_bytes()
files['presentation.js']=(ROOT.parent/'prime-reader/component/presentation.js').read_bytes()
manifest=[]
for n in files:
 media={'xhtml':'application/xhtml+xml','js':'text/javascript','css':'text/css'}[n.split('.')[-1]]
 props='nav scripted' if n=='nav.xhtml' else 'scripted' if n.endswith('.xhtml') else ''
 manifest.append('<item id="'+n.replace('.','-')+'" href="'+n+'" media-type="'+media+'"'+(' properties="'+props+'"' if props else '')+'/>')
files['package.opf']=('''<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id" prefix="rendition: http://www.idpf.org/vocab/rendition/#"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">urn:murmuration:art-chat-v1:'''+PROV['revision']+'''</dc:identifier><dc:title>CONSTRAINT · Art chat slice v1</dc:title><dc:language>en</dc:language><meta property="dcterms:modified">2026-10-20T18:00:00Z</meta><meta property="rendition:layout">reflowable</meta><meta property="rendition:spread">none</meta></metadata><manifest>'''+''.join(manifest)+'</manifest><spine>'+''.join('<itemref idref="'+n.replace('.','-')+'"/>' for n in spine)+'</spine></package>').encode()
container=b'<?xml version="1.0"?><container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0"><rootfiles><rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/></rootfiles></container>'
out=ROOT/'publication/art-chat-v1.epub'
with zipfile.ZipFile(out,'w') as z:
 for name,data in {'mimetype':b'application/epub+zip','META-INF/container.xml':container,**{'EPUB/'+k:v for k,v in files.items()}}.items():
  if name.endswith(('.xhtml','.opf')):ET.fromstring(data)
  info=zipfile.ZipInfo(name,(2026,10,20,0,0,0));info.compress_type=zipfile.ZIP_STORED if name=='mimetype' else zipfile.ZIP_DEFLATED
  z.writestr(info,data)
(ROOT/'publication/build.json').write_text(json.dumps({'publication':storyboard['publication'],'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'identities':identities},indent=2)+'\n')
print(out)
