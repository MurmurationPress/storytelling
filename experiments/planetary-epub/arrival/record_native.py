#!/usr/bin/env python3
"""Optional native X11 evidence runner. Requires python-xlib, ffmpeg and Gtk 3.
Run only against your own test reader window, already open in an isolated profile.
Does not alter the reader or its settings. Each scenario assumes opening prose,
except reopening, which records the reader's saved position without navigation.
"""
from pathlib import Path
import argparse
import json
import os
import subprocess
import time
from Xlib import display, X, XK, error
from Xlib.ext import xtest

parser = argparse.ArgumentParser()
parser.add_argument('scenario', choices=['first-return', 'early-return', 'preload', 'reopening'])
parser.add_argument('--title', required=True, help='Exact suffix of reader window title')
parser.add_argument('--out', type=Path, required=True)
args = parser.parse_args()
args.out.mkdir(parents=True, exist_ok=True)
d = display.Display()
root = d.screen().root
window = None
for wid in root.get_full_property(d.intern_atom('_NET_CLIENT_LIST'), X.AnyPropertyType).value:
    try:
        w = d.create_resource_object('window', wid)
        prop = w.get_full_property(d.intern_atom('_NET_WM_NAME'), X.AnyPropertyType)
        if prop and prop.value.decode().endswith(args.title): window = w
    except error.BadWindow: pass
assert window is not None, 'Matching native reader window not found'
window.configure(stack_mode=X.Above)
window.set_input_focus(X.RevertToParent, X.CurrentTime)
d.sync()
start = time.monotonic()
actions = []

def key(name, ctrl=False):
    window.configure(stack_mode=X.Above)
    if not ctrl: window.set_input_focus(X.RevertToParent, X.CurrentTime)
    names = ['Control_L', name] if ctrl else [name]
    actions.append({'seconds':round(time.monotonic()-start, 3), 'key':name, 'ctrl':ctrl})
    for k in names: xtest.fake_input(d, X.KeyPress, d.keysym_to_keycode(XK.string_to_keysym(k)))
    for k in reversed(names): xtest.fake_input(d, X.KeyRelease, d.keysym_to_keycode(XK.string_to_keysym(k)))
    d.sync()

logfile = (args.out / 'capture.log').open('w')
record = subprocess.Popen(['ffmpeg', '-y', '-v', 'error', '-f', 'x11grab', '-framerate', '15',
    '-draw_mouse', '0', '-window_id', str(window.id), '-i', os.environ.get('DISPLAY', ':0'),
    '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '36', str(args.out / 'native.webm')],
    stdin=subprocess.PIPE, stderr=logfile)
try:
    time.sleep(2)
    if args.scenario == 'first-return':
        key('Right'); time.sleep(8)
        key('Right'); time.sleep(3)
        key('Left'); time.sleep(3)
    elif args.scenario == 'early-return':
        key('Right'); time.sleep(1.2)
        key('Right'); time.sleep(3)
        key('Left'); time.sleep(7)
    elif args.scenario == 'preload':
        time.sleep(7)
        key('Right'); time.sleep(4)
    elif args.scenario == 'reopening':
        time.sleep(7)
    # Click the publication log first; do not refocus the outer reader between
    # Select All and Copy (that would select the app shell, not book content).
    point = root.translate_coords(window, 0, 0)
    xtest.fake_input(d, X.MotionNotify, x=point.x+250, y=point.y+620)
    xtest.fake_input(d, X.ButtonPress, 1); xtest.fake_input(d, X.ButtonRelease, 1)
    d.sync(); time.sleep(.2)
    key('a', True); time.sleep(.3); key('c', True); time.sleep(1)
    env = dict(os.environ, GDK_BACKEND='x11')
    copied = subprocess.check_output(['/usr/bin/python3', '-c',
        'import gi; gi.require_version("Gtk","3.0"); from gi.repository import Gtk,Gdk; '
        'print(Gtk.Clipboard.get(Gdk.SELECTION_CLIPBOARD).wait_for_text() or "")'], env=env, text=True)
    index = copied.find('[\n  {')
    assert index >= 0, 'No JSON trace in native copy; inspect the recording'
    trace = json.loads(copied[index:])
    (args.out / 'trace.json').write_text(json.dumps(trace, indent=2) + '\n')
finally:
    record.communicate(b'q', timeout=20)
    logfile.close()
    (args.out / 'actions.json').write_text(json.dumps({'scenario':args.scenario, 'window':hex(window.id),
        'timing':'Seconds since capture process launch; media start may lag slightly.', 'actions':actions}, indent=2) + '\n')
assert record.returncode == 0, 'Native capture failed; see capture.log'
