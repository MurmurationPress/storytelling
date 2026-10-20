#!/usr/bin/env python3
"""Two labelled research EPUBs from the unchanged explicit-start artifact.
The preload variant is an artificial invisible-load counterexample, not a claim
that Thorium normally preloads this book's next spine document.
"""
from pathlib import Path
import argparse
import zipfile

ROOT = Path(__file__).resolve().parent.parent

def build(preload=False):
    version = 'arrival-preload-counterexample-v1' if preload else 'arrival-load-probe-v1'
    with zipfile.ZipFile(ROOT / 'dist/planetary-model-playback-v2.epub') as z:
        files = {i.filename: z.read(i.filename) for i in z.infolist()}
        infos = {i.filename:i for i in z.infolist()}
    def edit(name, old, new):
        files['EPUB/' + name] = files['EPUB/' + name].decode().replace(old, new).encode()
    edit('state.xhtml', '</head>', '<script src="arrival-bootstrap.js"></script></head>')
    edit('state.xhtml', '<script src="state.js"></script>', '<script src="arrival-log.js"></script><script src="arrival-probe.js"></script>')
    edit('state.xhtml', 'playback-v2', version)
    for name in ('bootstrap', 'probe', 'log'):
        files['EPUB/arrival-' + name + '.js'] = (ROOT / 'arrival' / (name + '.js')).read_text().replace('prime-arrival-load-v1-complete', version + '-complete').replace('prime-arrival-trace-v1', version + '-trace').encode()
    # Keep original complete text and space in normal flow. Hide before body paint
    # only when head bootstrap executes. No JavaScript => no class => readable.
    extra = '''
.arrival-script:not(.arrival-complete) #complete { opacity: 0; }
.arrival-script:not(.arrival-complete) #output { display: block; }
.arrival-script:not(.arrival-complete) #output::after { content: '▏'; }
#arrival-log { position:fixed; bottom:8px; left:55px; right:55px; background:white; color:#182328; font:13px/1.2 sans-serif; }
#arrival-records { font:11px/1.2 monospace; max-height:65px; overflow:auto; border:1px solid #526b72; }
@media (prefers-reduced-motion:reduce) {
  .arrival-script:not(.arrival-complete) #complete { opacity:1; }
  .arrival-script:not(.arrival-complete) #output { display:none; }
}
'''
    files['EPUB/style.css'] += extra.encode()
    resources = ''.join(f'<item id="arrival-{name}" href="arrival-{name}.js" media-type="text/javascript"/>' for name in ('bootstrap', 'probe', 'log'))
    edit('package.opf', '</manifest>', resources + '</manifest>')
    edit('package.opf', '84fcdb5:playback-v2', '84fcdb5:' + version)
    edit('package.opf', 'PRIME playback-v2', 'PRIME ' + version)
    if preload:
        # Invisible but geometrically intersecting iframe, analogous to the class
        # of opacity-masked containers. It does not alter manuscript paragraphs.
        iframe = '<div style="position:fixed;left:0;top:0;width:450px;height:324px;overflow:hidden;opacity:0;pointer-events:none"><iframe title="Controlled invisible preload" src="state.xhtml" style="position:absolute;left:0;top:0;width:1000px;height:720px;transform:scale(.45);transform-origin:0 0;border:0"></iframe></div>'
        edit('opening.xhtml', '</body>', iframe + '<script src="arrival-log.js"></script></body>')
        edit('package.opf', 'href="opening.xhtml" media-type="application/xhtml+xml"', 'href="opening.xhtml" media-type="application/xhtml+xml" properties="scripted"')
    dest = ROOT / 'dist' / ('planetary-model-' + version + '.epub')
    with zipfile.ZipFile(dest, 'w') as z:
        for name, data in files.items():
            info = infos.get(name, zipfile.ZipInfo(name, (2026,10,20,0,0,0)))
            if name not in infos: info.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(info, data)
    print(dest)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--preload-counterexample', action='store_true')
    build(parser.parse_args().preload_counterexample)
