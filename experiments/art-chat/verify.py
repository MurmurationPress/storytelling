#!/usr/bin/env python3
"""Independent Art source, adaptation, package and baseline-preservation checks."""
from pathlib import Path,PurePosixPath
import json,hashlib,zipfile,xml.etree.ElementTree as ET,posixpath,subprocess
R=Path(__file__).resolve().parent; prov=json.loads((R/'source/provenance.json').read_text());raw=(R/'source/art.md').read_bytes()
assert hashlib.sha256(raw).hexdigest()==prov['sha256']
assert hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()==prov['blob']
lines=raw.decode().splitlines();NS={'x':'http://www.w3.org/1999/xhtml','o':'http://www.idpf.org/2007/opf'}
metadata=json.loads((R/'publication/build.json').read_text());artifact=R/'publication/art-chat-v1.epub'
assert hashlib.sha256(artifact.read_bytes()).hexdigest()==metadata['sha256']
with zipfile.ZipFile(artifact) as z:
 assert z.infolist()[0].filename=='mimetype' and z.infolist()[0].compress_type==0
 names=set(z.namelist());p=ET.fromstring(z.read('EPUB/package.opf'))
 manifest={i.attrib['id']:i.attrib for i in p.findall('o:manifest/o:item',NS)}
 order=[manifest[i.attrib['idref']]['href'] for i in p.findall('o:spine/o:itemref',NS)]
 assert order==['opening.xhtml','ask.xhtml','between.xhtml','permission.xhtml','after.xhtml']
 # Static treatment retains every selected prose paragraph, including the procedural clause.
 for name,first,last in [('opening.xhtml',462,470),('between.xhtml',482,488),('after.xhtml',500,504)]:
  doc=ET.fromstring(z.read('EPUB/'+name)); paragraphs=[''.join(e.itertext()) for e in doc.findall('.//x:main/x:p',NS)]
  assert paragraphs==[lines[n-1] for n in range(first,last+1) if lines[n-1]],name
 opening=ET.fromstring(z.read('EPUB/opening.xhtml'))
 changes=opening.findall('.//x:span',NS)
 assert len(changes)==1 and changes[0].attrib['class']=='static-only' and changes[0].text==', then typed'
 for name,source_lines in [('ask.xhtml',[477,479]),('permission.xhtml',[495,497])]:
  doc=ET.fromstring(z.read('EPUB/'+name))
  descriptor=json.loads(doc.find('x:head/x:meta[@name="murmuration-component"]',NS).attrib['content'])
  assert descriptor==metadata['identities'][name]
  for section in ['transcript','performance']:
   rows=doc.findall('.//x:section[@id="'+section+'"]/x:ol/x:li',NS)
   expected=[]
   for n in source_lines:
    speaker,words,_=lines[n-1][2:-2].split('|');expected.append((speaker,words))
   actual=[(r.find('x:strong',NS).text,r.find('x:p',NS).text) for r in rows]
   assert actual==expected,(name,section)
  settings=json.loads(doc.find('.//x:script[@id="settings"]',NS).text)
  assert [(m['source_line'],m['speaker'],m['text']) for m in settings['messages']]==[(n,*v) for n,v in zip(source_lines,expected)]
  assert hashlib.sha256(json.dumps(settings,ensure_ascii=False,sort_keys=True).encode()).hexdigest()==descriptor['contentVersion']
 for n in names:
  if n.endswith(('.xhtml','.opf')):
   doc=ET.fromstring(z.read(n))
   for el in doc.iter():
    for attr in ['href','src']:
     ref=el.get(attr)
     if not ref or ref.startswith('#'):continue
     assert not ref.startswith('//') and '://' not in ref
     assert posixpath.normpath(str(PurePosixPath(n).parent/ref.split('#')[0])) in names,(n,ref)
 for item in manifest.values():assert 'EPUB/'+item['href'] in names
 for name in ['chat.js','head.js','style.css']:assert z.read('EPUB/'+name)==(R/'component'/name).read_bytes()
 assert z.read('EPUB/presentation.js')==(R.parent/'prime-reader/component/presentation.js').read_bytes()
# Guard all accepted package bytes against main's accepted foundation, not just a regenerated hash.
repo=R.parents[1]
for path in list((R.parent/'planetary-epub/dist').glob('*'))+list((R.parent/'prime-reader/publication').glob('*')):
 if path.is_file():
  rel=str(path.relative_to(repo))
  original=subprocess.check_output(['git','show','5946536:'+rel],cwd=repo)
  assert path.read_bytes()==original,rel
print('PASS: exact source/blob; four dialogue lines/speakers/order; complete static narration; single adapted clause; local EPUB references; reproducible identity; every accepted PRIME artifact unchanged')
