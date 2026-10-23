'use strict';
const { spawn, execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(fn, timeout = 60000) {
  const deadline = Date.now() + timeout;
  let error;
  while (Date.now() < deadline) {
    try { const result = await fn(); if (result) return result; } catch (e) { error = e; }
    await sleep(100);
  }
  throw error || new Error('Timed out');
}
(async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'story-teller-host-'));
  const server = net.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  let importProject;
  if (['import', 'prose', 'navigation'].includes(process.env.STORY_TELLER_HOST_SCOPE)) {
    importProject = path.join(directory, 'fictional-project');
    await fs.mkdir(path.join(importProject, 'scenes'), { recursive: true });
    await fs.writeFile(path.join(importProject, 'scenes', 'The Signal.md'), process.env.STORY_TELLER_HOST_SCOPE === 'prose'
      ? '---\ntitle: Lantern\n---\nFirst paragraph.\n\nSecond paragraph.\n\nThird paragraph.\n---\nLast beat.\n'
      : '---\ntitle: Lantern\n---\nFictional prose.\n');
    await fs.writeFile(path.join(importProject, 'story-teller.project.json'), JSON.stringify({
      schema: 'story-teller-project', version: 1, title: 'Lantern', ...(process.env.STORY_TELLER_HOST_SCOPE === 'prose' ? { settings: { prosePacing: 'on' } } : {}),
      parts: [{ id: 'p', title: 'First', scenes: ['s'] }],
      scenes: [{ id: 's', partId: 'p', label: '1.1', title: 'The Signal', file: 'scenes/The Signal.md' }]
    }));
  }
  if (process.env.STORY_TELLER_HOST_SCOPE === 'navigation') {
    await fs.cp(path.join(root,'samples/assets'),path.join(importProject,'assets'),{recursive:true});
    await fs.writeFile(path.join(importProject,'scenes/The Signal.md'), 'Signal opening.\n\n```typeout\n@format yaml\n@sound modem\n@speed 10\n\nstatus: ' + 'observing the fictional harbour '.repeat(10) + '\n```\n---\nSignal last beat.');
    await fs.writeFile(path.join(importProject,'scenes/The Answer.md'), 'Answer opening.\n\n```chat\n@viewer Mara\n@responding\n@delay 1500ms\nIvo: The answer is waiting.\nMara: I can see it.\n```\n---\nAnswer last beat.\n\n![Harbour](../assets/harbour-portrait.png)');
    await fs.writeFile(path.join(importProject,'story-teller.project.json'),JSON.stringify({schema:'story-teller-project',version:1,title:'Lantern',parts:[{id:'p',title:'First',scenes:['s','a']}],scenes:[{id:'s',partId:'p',label:'1.1',title:'The Signal',file:'scenes/The Signal.md'},{id:'a',partId:'p',label:'1.2',title:'The Answer',file:'scenes/The Answer.md'}]}));
  }
  const log = await fs.open(path.join(directory, 'code.log'), 'w');
  const executable = process.env.VSCODE_EXECUTABLE || '/usr/share/code/code';
  const vsix = process.env.STORY_TELLER_VSIX;
  let developmentPath = root;
  if (vsix) {
    // The test adapter is a separate, disposable development extension. Story
    // Teller itself must be loaded from the installed VSIX, not from `root`.
    developmentPath = path.join(directory, 'test-adapter');
    await fs.mkdir(developmentPath);
    await fs.writeFile(path.join(developmentPath, 'package.json'), JSON.stringify({
      name: 'story-teller-test-adapter', publisher: 'local', version: '0.0.1',
      engines: { vscode: '^1.95.0' }, main: './extension.cjs'
    }));
    await fs.writeFile(path.join(developmentPath, 'extension.cjs'), 'exports.activate = () => {};\n');
    execFileSync(process.env.VSCODE_CLI || '/usr/bin/code', [
      `--user-data-dir=${path.join(directory, 'profile')}`,
      `--extensions-dir=${path.join(directory, 'extensions')}`,
      '--install-extension', path.resolve(vsix), '--force'
    ], { stdio: ['ignore', log.fd, log.fd] });
  }
  const code = spawn(executable, [
    `--user-data-dir=${path.join(directory, 'profile')}`, `--extensions-dir=${path.join(directory, 'extensions')}`,
    `--extensionDevelopmentPath=${developmentPath}`, `--extensionTestsPath=${path.join(__dirname, 'host.cjs')}`,
    `--remote-debugging-port=${port}`, '--skip-welcome', '--skip-release-notes', '--disable-updates', '--disable-workspace-trust', '--disable-telemetry', '--new-window', ...(importProject ? [importProject] : [])
  ], { env: { ...process.env, STORY_TELLER_TEST_DIR: directory }, stdio: ['ignore', log.fd, log.fd] });
  let socket;
  let id = 0;
  async function request(action, source, options = {}) {
    await fs.writeFile(path.join(directory, 'request.json'), JSON.stringify({ id: ++id, action, source, ...options }));
    const ack = await until(async () => {
      const value = JSON.parse(await fs.readFile(path.join(directory, 'ack.json'), 'utf8'));
      return value.id === id && value;
    });
    assert.equal(ack.error, undefined);
  }
  try {
    await until(async () => { await fs.access(path.join(directory, 'ready')); return true; }, 60000);
    const target = await until(async () => {
      const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      return targets.find(t => t.type === 'iframe' && t.url.includes('murmurationpress.story-teller'));
    });
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let callId = 0;
    const pending = new Map();
    socket.onmessage = event => {
      const response = JSON.parse(event.data);
      const callbacks = pending.get(response.id);
      if (callbacks) { pending.delete(response.id); response.error ? callbacks.reject(new Error(JSON.stringify(response.error))) : callbacks.resolve(response.result); }
    };
    const send = (method, params) => new Promise((resolve, reject) => {
      const id = ++callId;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
    async function evaluate(expression, userGesture = false) {
      const result = await send('Runtime.evaluate', {
        expression: `(() => { const doc = document.getElementById('active-frame')?.contentDocument; return (${expression}); })()`, returnByValue: true, userGesture
      });
      if (result.exceptionDetails) throw new Error(`${result.exceptionDetails.exception?.description || result.exceptionDetails.text} [${expression}]`);
      return result.result.value;
    }
    const locator = selector => ({
      textContent: () => evaluate(`doc.querySelector(${JSON.stringify(selector)})?.textContent`),
      count: () => evaluate(`doc.querySelectorAll(${JSON.stringify(selector)}).length`),
      isDisabled: () => evaluate(`doc.querySelector(${JSON.stringify(selector)}).disabled`),
      click: () => evaluate(`doc.querySelector(${JSON.stringify(selector)}).click()`)
    });
    const frame = { locator };
    const beat = locator('#beat');
    if (process.env.STORY_TELLER_HOST_SCOPE === 'navigation') {
      const main = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(item=>item.type==='page');
      const ws=new WebSocket(main.webSocketDebuggerUrl); await new Promise(resolve=>{ws.onopen=resolve;});
      let mainId=0; const replies=new Map();
      ws.onmessage=event=>{const m=JSON.parse(event.data), done=replies.get(m.id);if(done){replies.delete(m.id);m.error?done.reject(Error(JSON.stringify(m.error))):done.resolve(m.result);}};
      const mainSend=(method,params)=>new Promise((resolve,reject)=>{const id=++mainId;replies.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
      const workbench=async expression=>{const result=await mainSend('Runtime.evaluate',{expression,returnByValue:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.text);return result.result.value;};
      const key=async(name,modifiers=0,text)=>{const code=name.length===1?'Key'+name.toUpperCase():name;const virtual=name.length===1?name.toUpperCase().charCodeAt(0):({Enter:13,Escape:27,Tab:9}[name]);for(const type of ['keyDown','keyUp'])await mainSend('Input.dispatchKeyEvent',{type,key:name,code,modifiers,windowsVirtualKeyCode:virtual,nativeVirtualKeyCode:virtual,...(text&&type==='keyDown'?{text}:{})});};
      const chord=async letter=>{await mainSend('Page.bringToFront',{});await sleep(150);await key('k',2);await sleep(120);await key(letter.toUpperCase(),8);};
      const snapshot=async()=>{await request('snapshot');return JSON.parse(await fs.readFile(path.join(directory,'snapshot.json'),'utf8'));};
      const source='<!-- beat: Opening -->\nOpening paragraph.\n\nMore opening prose.\n---\n<!-- beat: Turn -->\nA second beat.\n\nLast paragraph.';
      await request('edit',source);await request('focus-at',undefined,{start:source.length});
      await chord('b');await until(()=>workbench("document.querySelector('.quick-input-widget')?.checkVisibility() && document.querySelector('.quick-input-widget')?.innerText.includes('Beat title')"));
      await mainSend('Input.insertText',{text:'Keyboard turn'});await key('Enter',0,'\r');
      await until(async()=>(await snapshot()).text.includes('<!-- beat: Keyboard turn -->'));
      await key('z',2);assert.equal((await snapshot()).text,source,'one Undo reverses the insertion');
      await request('focus-at',undefined,{start:source.length});await chord('b');await until(()=>workbench("document.querySelector('.quick-input-widget')?.checkVisibility() && document.querySelector('.quick-input-widget')?.innerText.includes('Beat title')"));await key('Escape');assert.equal((await snapshot()).text,source);
      await until(()=>workbench("!document.querySelector('.quick-input-widget')?.checkVisibility()"));
      await mainSend('Input.insertText',{text:'x'});await until(async()=>(await snapshot()).text===source+'x');assert.equal((await snapshot()).text,source+'x','cancelling returns to writing');await key('z',2);assert.equal((await snapshot()).text,source);
      await request('focus-at',undefined,{start:source.indexOf('A second')});await chord('p');
      await until(async()=>/Beat 2 of 2.*ready/.test(await locator('#status').textContent()));
      await chord('s');await until(async()=>{await request('active-source-state');const state=JSON.parse(await fs.readFile(path.join(directory,'active-source-state.json'),'utf8'));return state.uri===path.join(directory,'scene.md')&&state.line===5;});
      await chord('c');
      const lineNumbers=()=>workbench("[...document.querySelectorAll('.editor-group-container:first-child .line-numbers')].filter(e=>e.checkVisibility()).map(e=>Number(e.textContent))");
      await until(async()=>!(await lineNumbers()).includes(9));await chord('e');await until(async()=>(await lineNumbers()).includes(9));
      await request('open-outline');
      const select=async title=>{
        const rect=await until(()=>workbench(`(()=>{const row=[...document.querySelectorAll('.monaco-list-row')].find(e=>e.innerText.includes(${JSON.stringify(title)}));if(!row)return null;const r=row.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`));
        for(const type of ['mousePressed','mouseReleased'])await mainSend('Input.dispatchMouseEvent',{type,x:rect.x,y:rect.y,button:'left',clickCount:1});
      };
      const events=[];const receive=socket.onmessage;socket.onmessage=event=>{const m=JSON.parse(event.data);if(m.method?.startsWith('WebAudio.'))events.push({method:m.method,params:m.params});receive(event);};await send('WebAudio.enable',{});
      await select('1.1 The Signal');
      await until(async()=>(await beat.textContent())?.includes('Signal opening.'));
      console.log('scene arrival',await evaluate("({status:doc.getElementById('status').textContent,hidden:doc.hidden,autoplay:doc.getElementById('autoplay').checked,replayDisabled:doc.getElementById('replay').disabled})"));
      await until(async()=>await evaluate("doc.querySelector('.typeout-progress')?.textContent.length>2"),10000);
      assert.equal(await evaluate('doc.scrollingElement.scrollTop'),0);assert.match(await locator('#status').textContent(),/Beat 1 of 2.*playing/);
      assert.equal(await evaluate("doc.getElementById('enable-sound').hidden"),false,'outline autoplay needs an explicit webview audio gesture');
      assert.equal(events.filter(event=>event.method==='WebAudio.contextCreated').length,0,'outline autoplay does not create an audio context without a reader gesture');
      await evaluate("doc.getElementById('enable-sound').click()",true);
      await until(()=>events.some(e=>e.method==='WebAudio.nodesConnected'));
      const progress=await locator('.typeout-progress').textContent();await sleep(300);assert.ok((await locator('.typeout-progress').textContent()).length>progress.length);
      const disconnected=events.filter(e=>e.method==='WebAudio.nodesDisconnected').length;
      await select('1.2 The Answer');
      await until(async()=>(await beat.textContent())?.includes('Answer opening.'));
      await until(()=>events.filter(e=>e.method==='WebAudio.nodesDisconnected').length>disconnected);
      assert.equal(await evaluate('doc.scrollingElement.scrollTop'),0);assert.match(await locator('#status').textContent(),/Beat 1 of 2.*playing/);
      await evaluate("doc.getElementById('next').click()");
      await until(async()=>await evaluate("doc.querySelector('.story-image')?.naturalWidth===360"));
      await evaluate("doc.getElementById('previous').click()");assert.match(await locator('#status').textContent(),/completed/);assert.equal(await evaluate('doc.scrollingElement.scrollTop'),0);
      await request('active-source-state');let state=JSON.parse(await fs.readFile(path.join(directory,'active-source-state.json'),'utf8'));assert.equal(state.previews.length,1);assert.match(state.uri,/The Answer.md$/);
      await evaluate("(doc.getElementById('autoplay').checked=false,doc.getElementById('autoplay').dispatchEvent(new Event('change')))");await sleep(150);
      await select('1.1 The Signal');await until(async()=>(await beat.textContent())?.includes('Signal opening.'));assert.match(await locator('#status').textContent(),/ready/);assert.equal(await locator('.typeout-progress').count(),0);
      await evaluate("(doc.getElementById('autoplay').checked=true,doc.getElementById('autoplay').dispatchEvent(new Event('change')))");await sleep(150);
      await request('rapid-scenes',undefined,{projectRoot:importProject});await until(async()=>(await beat.textContent())?.includes('Answer opening.'));await sleep(400);assert.doesNotMatch(await beat.textContent(),/Signal opening/);
      await request('hide-preview');await until(async()=>/paused/.test(await locator('#status').textContent()));
      await request('return-preview-tab');
      await until(async()=>!(await locator('#pause').isDisabled()));assert.match(await locator('#status').textContent(),/paused/);
      const held=await beat.textContent();await sleep(300);assert.equal(await beat.textContent(),held);
      assert.equal((await snapshot()).text,source,'outline reading preserves the unsaved authoring buffer');
      await request('default-bindings');
      const bindings=await fs.readFile(path.join(directory,'default-bindings.txt'),'utf8');
      // VS Code's generated defaults include extension contributions: confirm
      // these chords resolve to Story Teller rather than another installed command.
      const conflicts=bindings.split('\n').filter(line=>/ctrl\+k shift\+[bpcse]"/.test(line));
      assert.equal(conflicts.length,5,JSON.stringify(conflicts));assert.ok(conflicts.every(line=>line.includes('storyTeller.')));
      await fs.writeFile(path.join(directory,'navigation-evidence.json'),JSON.stringify({conflicts,progress,events:events.map(e=>e.method),state},null,2));
      ws.close();console.log(`PASS: native keyboard chords/title/cancel/Undo/folding/source, outline autoplay/on-off/latest scene, local asset, audio graph cleanup; ${directory}`);
      await fs.writeFile(path.join(directory,'request.json'),JSON.stringify({id:++id,action:'stop'}));return;
    }
    if (process.env.STORY_TELLER_HOST_SCOPE === 'follow') {
      const prose = Array.from({ length: 5 }, (_, i) => `Paragraph ${i + 1}. The fictional harbour wall stretched past the lamps, past the ferry, and into the dark water where Mara waited for an answer.`).join('\n\n');
      const chat = ['```chat', '@viewer Mara', 'Mara: I can see the lantern from here.', 'Ivo: Follow the light along the wall.', 'Mara: The path is narrow.', 'Ivo: There is room beside the steps.', 'Mara: I am nearly there.', 'Ivo: I will wait by the gate.', '```'].join('\n');
      const note = ['```typeout', '@format annotation', '@sound none', '@speed 40', '', '**A note at the gate.** The painted letters had worn thin, but the message remained legible.', '', '- Keep the lantern low.', '- Wait for the tide.', '', '> The last line crossed the whole page and ended beyond the crease. ' + 'The lamps marked each turn along the wall. '.repeat(8), '```'].join('\n');
      const source = `---\nstory_teller_prose_pacing: on\n---\n${prose}\n\n${chat}\n\n![Harbour portrait](assets/harbour-portrait.png)\n\n*Caption: The landing.*\n\n${note}\n\n@pause 250ms\n---\nA short second beat.`;
      await request('edit', source);
      await until(async () => (await beat.textContent())?.includes('Paragraph 1.'));
      const metrics = () => evaluate("(() => { const d=doc, w=d.defaultView, r=d.scrollingElement, last=d.querySelector('#beat').lastElementChild; return {top:r.scrollTop, height:w.innerHeight, latest:last?.getBoundingClientRect().bottom, follow:!d.getElementById('follow-story').hidden, phase:d.getElementById('status').textContent}; })()");
      assert.equal((await metrics()).top, 0);
      await evaluate("doc.getElementById('play').click()");
      await until(async () => (await beat.textContent())?.includes('Paragraph 3.'));
      const proseProgress = await metrics();
      await until(async () => (await evaluate("doc.querySelectorAll('.chat li').length")) >= 2);
      await until(async () => (await metrics()).top > 30);
      await until(async () => { const m=await metrics(); return m.latest <= m.height + 20; });
      const firstFollow = await metrics();
      assert.ok(firstFollow.latest <= firstFollow.height + 20, JSON.stringify(firstFollow));
      console.log('follow native: first overflow visible');
      await send('Input.dispatchMouseEvent', { type:'mouseWheel', x:180, y:350, deltaY:-350, deltaX:0 });
      // CDP targets the outer webview iframe; ensure the inner reading document
      // receives the wheel intent and movement before asserting its state.
      await evaluate("(doc.dispatchEvent(new WheelEvent('wheel',{deltaY:-350,bubbles:true})), doc.defaultView.scrollBy({top:-350,behavior:'instant'}))");
      await until(async () => (await metrics()).top < firstFollow.top - 20);
      await until(async () => (await metrics()).follow);
      const reread = await metrics();
      const before = await beat.textContent();
      await sleep(1400);
      const after = await beat.textContent();
      assert.notEqual(after, before, 'playback continues during rereading');
      assert.ok((await metrics()).top <= reread.top + 2, 'following must not drag a rereading reader');
      console.log('follow native: rereading remains stationary');
      const focused = await evaluate("(document.getElementById('active-frame').focus(), doc.getElementById('follow-story').focus(), doc.activeElement?.id)", true);
      assert.equal(focused, 'follow-story');
      await send('Input.dispatchKeyEvent', { type:'keyDown', key:'Enter', code:'Enter', windowsVirtualKeyCode:13, nativeVirtualKeyCode:13, text:'\r' });
      await send('Input.dispatchKeyEvent', { type:'keyUp', key:'Enter', code:'Enter', windowsVirtualKeyCode:13, nativeVirtualKeyCode:13 });
      await until(async () => !(await metrics()).follow);
      await until(async () => { const m = await metrics(); return m.latest <= m.height + 20 && m.top > reread.top + 20; });
      console.log('follow native: resumed to latest');
      const chatProgress = await metrics();
      await until(async () => (await evaluate("doc.querySelector('.beat-ending button')?.textContent")) === 'Next →');
      await until(async () => { const m=await metrics(); return m.latest <= m.height + 20; });
      const completed = await metrics();
      console.log('follow native: completed control visible');
      await request('hide-preview');
      await sleep(180);
      await request('show-preview');
      await until(async () => (await locator('#status').textContent())?.includes('completed'));
      await until(async () => !(await locator('#replay').isDisabled()));
      console.log('follow native: hide/return positions', completed.top, (await metrics()).top);
      assert.ok(Math.abs((await metrics()).top - completed.top) <= 2, 'hide/return preserves reading position');
      await evaluate("doc.getElementById('replay').click()");
      assert.equal((await metrics()).top, 0, 'Replay starts at the top');
      const partialState = () => evaluate("(() => { const d=doc, p=d.querySelector('.typeout-progress'), s=d.querySelector('.typeout-surface'), r=d.scrollingElement; if (!p) return null; const shown=[...p.querySelectorAll('[data-story-segment] > span:first-child')], last=shown.filter(e=>e.firstChild?.length).at(-1)?.firstChild; let visibleBottom=null; if(last){ const range=d.createRange();range.setStart(last,last.length-1);range.setEnd(last,last.length);visibleBottom=range.getBoundingClientRect().bottom; } return {count:shown.reduce((n,e)=>n+e.textContent.length,0), top:r.scrollTop, visibleBottom, reserveBottom:s.getBoundingClientRect().bottom, height:d.defaultView.innerHeight}; })()");
      const partial = await until(async () => { const p=await partialState(); return p?.count > 12 && p.count < 200 && p.visibleBottom <= p.height + 20 && p; });
      assert.ok(partial.reserveBottom > partial.height, JSON.stringify(partial));
      console.log('follow native: partial type-out captured without following its reserve');
      await evaluate("doc.getElementById('reveal').click()");
      await until(async () => (await evaluate("doc.querySelector('.beat-ending button')?.textContent")) === 'Next →');
      await evaluate("doc.documentElement.style.width='320px'");
      const narrow = await evaluate("(() => { const d=doc, a=d.getElementById('beat'); return {width:a.clientWidth, overflow:a.scrollWidth-a.clientWidth}; })()");
      assert.ok(narrow.width <= 320 && narrow.overflow <= 1, JSON.stringify(narrow));
      await evaluate("doc.getElementById('next').click()");
      await until(async () => (await locator('#status').textContent())?.includes('Beat 2 of 2'));
      console.log('follow native: next beat selected');
      assert.equal((await metrics()).top, 0);
      await evaluate("doc.getElementById('previous').click()");
      const previous = await metrics();
      assert.equal(previous.top, 0); assert.match(previous.phase, /completed/);
      assert.equal(previous.follow, true, 'silent Previous offers Follow without jumping');
      await evaluate("doc.scrollingElement.scrollTop=doc.scrollingElement.scrollHeight");
      await until(async () => !(await metrics()).follow);
      assert.ok((await metrics()).top > 0, 'manual return to the bottom resumes following');
      await evaluate("doc.getElementById('next').click()");
      await evaluate("doc.getElementById('previous').click()");
      assert.equal((await metrics()).top, 0);
      await sleep(180);
      assert.equal((await metrics()).top, 0, 'rapid navigation leaves no stale follow work');
      await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
      await until(async () => await evaluate("doc.defaultView.matchMedia('(prefers-reduced-motion: reduce)').matches"));
      await evaluate("doc.getElementById('follow-story').click()");
      await until(async () => { const m=await metrics(); return m.top > 0 && m.latest <= m.height + 20; });
      await send('Emulation.setEmulatedMedia', { features: [] });
      await evaluate("doc.getElementById('restart').click()");
      assert.equal((await metrics()).top, 0); assert.match((await metrics()).phase, /ready/);
      await fs.writeFile(path.join(directory, 'follow-temporal.json'), JSON.stringify({ proseProgress, firstFollow, reread, chatProgress, partial, completed, previous, narrow }, null, 2));
      console.log(`PASS: ${vsix ? 'installed VSIX' : 'Development Host'} scroll-follow temporal prose/chat/image/type-out, rereading, keyboard Follow, narrow view and silent Previous; isolated profile/log: ${directory}`);
      await fs.writeFile(path.join(directory, 'request.json'), JSON.stringify({ id: ++id, action: 'stop' }));
      return;
    }
    if (process.env.STORY_TELLER_HOST_SCOPE === 'end-button') {
      const source = [
        'Opening prose.', '', '@pause 400ms', '---',
        '```chat', 'Mara: The lantern is lit.', '```', '---',
        '![Harbour](assets/harbour-landscape.webp)', '---',
        '```typeout', '@format yaml', '@sound none', '@speed 120', '', 'status: awake', '```', '---',
        'Closing prose.'
      ].join('\n');
      await request('edit', source);
      await until(async () => (await beat.textContent())?.includes('Opening prose.'));
      const ending = () => evaluate("doc.querySelector('.beat-ending')?.textContent || ''");
      const state = () => evaluate("({status:doc.getElementById('status').textContent, ending:doc.querySelector('.beat-ending')?.textContent || '', last:doc.getElementById('beat').lastElementChild?.className})");
      assert.equal(await ending(), '');
      await evaluate("(document.getElementById('active-frame').focus(), doc.getElementById('play').focus(), doc.getElementById('play').click())", true);
      const focusBeforeCompletion = await evaluate("doc.activeElement?.id || ''");
      await sleep(150); assert.equal(await ending(), '');
      await until(async () => (await ending()).includes('Next'));
      assert.equal(await evaluate("doc.activeElement?.id || ''"), focusBeforeCompletion, 'completion must not move focus');
      assert.equal((await state()).last, 'beat-ending');
      assert.equal(await evaluate("doc.getElementById('beat').children[0]?.className"), 'prose');
      await evaluate("doc.getElementById('autoplay').click()");
      await evaluate("doc.querySelector('.beat-ending button').click()");
      await until(async () => (await locator('#status').textContent())?.includes('Beat 2 of 5'));
      assert.equal(await ending(), '', 'autoplay off leaves destination ready');
      await evaluate("doc.getElementById('play').click()");
      await until(async () => (await ending()).includes('Next'));
      assert.equal(await evaluate("doc.getElementById('beat').children[0]?.className"), 'chat');
      await evaluate("(document.getElementById('active-frame').focus(), doc.querySelector('.beat-ending button').focus())", true);
      await send('Input.dispatchKeyEvent', { type:'keyDown', key:'Enter', code:'Enter', windowsVirtualKeyCode:13, nativeVirtualKeyCode:13, text:'\r' });
      await send('Input.dispatchKeyEvent', { type:'keyUp', key:'Enter', code:'Enter', windowsVirtualKeyCode:13, nativeVirtualKeyCode:13 });
      await until(async () => (await locator('#status').textContent())?.includes('Beat 3 of 5'));
      assert.equal(await ending(), '');
      await evaluate("doc.getElementById('autoplay').click()");
      await evaluate("doc.getElementById('play').click()");
      await until(async () => (await ending()).includes('Next'));
      assert.equal(await evaluate("doc.getElementById('beat').children[0]?.className"), 'story-figure');
      await evaluate("doc.documentElement.style.width='320px'");
      const bounds = await evaluate("(() => { const area=doc.getElementById('beat'), button=doc.querySelector('.beat-ending button'); return { overflow:area.scrollWidth-area.clientWidth, buttonRight:button.getBoundingClientRect().right-area.getBoundingClientRect().right, last:area.lastElementChild?.className }; })()");
      assert.ok(bounds.overflow <= 1 && bounds.buttonRight <= 1 && bounds.last === 'beat-ending', JSON.stringify(bounds));
      await sleep(420); // A separate deliberate turn after the keyboard activation.
      await evaluate("doc.querySelector('.beat-ending button').click()");
      await until(async () => (await locator('#status').textContent())?.includes('Beat 4 of 5'));
      await until(async () => (await ending()).includes('Next'));
      assert.match(await beat.textContent(), /status: awake/);
      assert.match(await evaluate("doc.getElementById('beat').children[0]?.className"), /typeout/);
      await evaluate("doc.getElementById('replay').click()");
      assert.equal(await ending(), '', 'Replay hides button until completion');
      await until(async () => (await ending()).includes('Next'));
      await evaluate("doc.getElementById('previous').click()");
      assert.equal(await ending(), 'Next →', 'silent Previous exposes completed state');
      await sleep(420);
      await evaluate("(() => { const button=doc.querySelector('.beat-ending button'); button.click(); button.click(); })()");
      await until(async () => (await locator('#status').textContent())?.includes('Beat 4 of 5'));
      assert.ok((await locator('#status').textContent()).includes('Beat 4 of 5'), 'double activation of one button cannot skip a beat');
      await until(async () => (await ending()).includes('Next'));
      await sleep(420);
      await evaluate("doc.querySelector('.beat-ending button').click()");
      await until(async () => (await locator('#status').textContent())?.includes('Beat 5 of 5'));
      await until(async () => (await ending()) === 'End of scene');
      assert.equal(await evaluate("doc.querySelectorAll('.beat-ending button').length"), 0);
      await evaluate("doc.getElementById('restart').click()");
      assert.equal(await ending(), '');
      await evaluate("doc.getElementById('play').click()");
      await until(async () => (await ending()).includes('Next'));
      await request('edit', source.replace('Opening prose.', 'Edited opening prose.'));
      await until(async () => (await beat.textContent())?.includes('Edited opening prose.'));
      assert.equal(await ending(), '', 'source edit resets button');
      console.log(`PASS: ${vsix ? 'installed VSIX' : 'Development Host'} end-of-beat flow, keyboard, silent return, replay, source edit, narrow image and rapid click; isolated profile/log: ${directory}`);
      await fs.writeFile(path.join(directory, 'request.json'), JSON.stringify({ id: ++id, action: 'stop' }));
      return;
    }
    if (process.env.STORY_TELLER_HOST_SCOPE === 'review') {
      await request('show-import-review');
      const reviewTarget = await until(async () => (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json())
        .find(item => item.type === 'iframe' && item.url.includes('murmurationpress.story-teller') && item.id !== target.id));
      const receive = socket.onmessage;
      socket.close(); socket = new WebSocket(reviewTarget.webSocketDebuggerUrl);
      await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; }); socket.onmessage = receive;
      const state = () => evaluate("(() => { const body=doc.body; const main=doc.querySelector('main'); const foot=doc.querySelector('footer'); return { text:body.innerText, focus:doc.activeElement?.id, buttons:[...foot.querySelectorAll('button')].map(b=>({id:b.id,disabled:b.disabled})), flex:doc.defaultView.getComputedStyle(body).display, overflow:doc.defaultView.getComputedStyle(main).overflowY, footer:doc.defaultView.getComputedStyle(foot).position }; })()");
      const snapshot = await until(async () => { const value = await state(); return value?.text?.includes('The signal') && value; });
      assert.equal(snapshot.focus, 'back'); assert.equal(snapshot.flex, 'flex'); assert.equal(snapshot.overflow, 'auto'); assert.equal(snapshot.footer, 'sticky');
      assert.deepEqual(snapshot.buttons.map(item => item.id), ['back', 'continue', 'cancel']);
      assert.match(snapshot.text, /Excluded draft/); assert.match(snapshot.text, /Unsupported SVG/);
      await send('Input.dispatchKeyEvent', { type:'keyDown', key:'Tab', code:'Tab' });
      await send('Input.dispatchKeyEvent', { type:'keyUp', key:'Tab', code:'Tab' });
      assert.equal((await state()).focus, 'continue');
      await evaluate("doc.getElementById('cancel').click()");
      await until(async () => { try { return JSON.parse(await fs.readFile(path.join(directory, 'review-result.json'), 'utf8')).result === 'cancel'; } catch { return false; } });
      console.log(`PASS: native import review panel keyboard/fixed controls; isolated profile/log: ${directory}`);
      await fs.writeFile(path.join(directory, 'request.json'), JSON.stringify({ id: ++id, action: 'stop' }));
      return;
    }
    if (process.env.STORY_TELLER_HOST_SCOPE === 'prose') {
      await request('open-project-scene', undefined, { projectRoot: importProject });
      await request('preview-project-scene');
      assert.equal((await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).filter(item=>item.type==='iframe' && item.url.includes('murmurationpress.story-teller')).length, 1, 'outline navigation reuses the reader');
      await until(async () => (await beat.textContent())?.includes('First paragraph.'));
      assert.doesNotMatch(await beat.textContent(), /Second paragraph/);
      assert.match(await locator('#status').textContent(), /prose pacing On \(book\)/);
      const captures = [{ at: Date.now(), text: await beat.textContent() }];
      await locator('#play').click();
      await sleep(420); captures.push({ at: Date.now(), text: await beat.textContent() });
      assert.doesNotMatch(captures[1].text, /Second paragraph/);
      await until(async () => (await beat.textContent()).includes('Second paragraph.'));
      captures.push({ at: Date.now(), text: await beat.textContent() });
      assert.doesNotMatch(captures[2].text, /Third paragraph/);
      await until(async () => (await beat.textContent()).includes('Third paragraph.'));
      captures.push({ at: Date.now(), text: await beat.textContent() });
      assert.ok(captures[2].at - captures[0].at >= 800, JSON.stringify(captures));
      assert.ok(captures[3].at - captures[2].at >= 800, JSON.stringify(captures));
      await request('start-scene-pacing');
      const main = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(item => item.type === 'page');
      const ws = new WebSocket(main.webSocketDebuggerUrl);
      await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
      const run = (expression, id) => new Promise((resolve, reject) => { ws.onmessage = event => { const value = JSON.parse(event.data); if (value.id === id) value.error ? reject(Error(JSON.stringify(value.error))) : resolve(value.result?.result?.value); }; ws.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression, returnByValue: true } })); });
      await until(async () => (await run("document.body.innerText.includes('Scene prose pacing')", 1001)));
      const pickerText = await run("document.body.innerText.slice(-1800)", 1002);
      assert.match(pickerText, /Inherit/); assert.match(pickerText, /Off/);
      await run("Array.from(document.querySelectorAll('.quick-input-list .monaco-list-row')).find(row=>row.textContent.includes('Off'))?.click()", 1003);
      await until(async () => {
        await request('snapshot-active');
        const snapshot = JSON.parse(await fs.readFile(path.join(directory, 'active-snapshot.json'), 'utf8'));
        return snapshot.text?.includes('story_teller_prose_pacing: off') && snapshot.dirty;
      }, 10000);
      await until(async () => (await locator('#status').textContent())?.includes('prose pacing Off (scene)'));
      assert.match(await beat.textContent(), /Third paragraph/);
      await request('start-book-pacing');
      await until(async () => (await run("document.body.innerText.includes('Book prose pacing')", 1011)));
      const bookPickerText = await run("document.body.innerText.slice(-1800)", 1012);
      assert.match(bookPickerText, /effective off from scene/);
      await run("Array.from(document.querySelectorAll('.quick-input-list .monaco-list-row')).find(row=>row.textContent.includes('Off'))?.click()", 1013);
      await until(async () => JSON.parse(await fs.readFile(path.join(importProject, 'story-teller.project.json'), 'utf8')).settings.prosePacing === 'off');
      await until(async () => (await locator('#status').textContent())?.includes('prose pacing Off (scene)'));
      await fs.writeFile(path.join(directory, 'prose-temporal.json'), JSON.stringify({ captures, pickerText, bookPickerText }, null, 2));
      console.log(`PASS: ${vsix ? 'installed VSIX' : 'Extension Development Host'} paragraph pacing and scene override in VS Code; isolated profile/log: ${directory}`);
      ws.close(); await fs.writeFile(path.join(directory, 'request.json'), JSON.stringify({ id: ++id, action: 'stop' }));
      return;
    }
    if (process.env.STORY_TELLER_HOST_SCOPE === 'import') {
      await request('open-outline');
      const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const main = targets.find(item => item.type === 'page');
      const ws = new WebSocket(main.webSocketDebuggerUrl);
      await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
      await sleep(1300);
      const snapshot = await new Promise((resolve, reject) => { const id = 999; ws.onmessage = e => { const r=JSON.parse(e.data); if(r.id===id) r.error ? reject(Error(JSON.stringify(r.error))) : resolve(r.result.result.value); }; ws.send(JSON.stringify({ id, method:'Runtime.evaluate', params:{ expression:'document.body.innerText.slice(0,6000)', returnByValue:true }})); });
      assert.match(snapshot, /Part–Scene Outline/);
      assert.match(snapshot, /FirstPart 1/);
      assert.match(snapshot, /1\.1 The Signal/);
      await request('open-project-scene', undefined, { projectRoot: importProject });
      const opened = JSON.parse(await fs.readFile(path.join(directory, 'project-navigation.json'), 'utf8'));
      assert.equal(opened.active, path.join(importProject, 'scenes', 'The Signal.md'));
      await request('preview-project-scene');
      const previewed = JSON.parse(await fs.readFile(path.join(directory, 'project-preview.json'), 'utf8'));
      assert.ok(previewed.titles.some(title => title.includes('The%20Signal.md') || title.includes('The Signal.md')), JSON.stringify(previewed));
      await request('start-import');
      await sleep(1300);
      console.log(`PASS: actual VS Code ${vsix ? 'installed VSIX' : 'Extension Development Host'} outline and scene navigation; system folder chooser invoked (picker interaction remains manual). Profile: ${directory}`);
      ws.close();
      await fs.writeFile(path.join(directory, 'request.json'), JSON.stringify({ id: ++id, action: 'stop' }));
      return;
    }
    if (process.env.STORY_TELLER_HOST_SCOPE === 'annotation') {
      const source = [
        'Before [[place|the inlet]].', '---',
        '```typeout', '@format annotation', '@speed 5', '',
        '**A🛰️** *B*', '', '- First', '- Second', '', '> Quote `code`', '```',
        '---', '```typeout', '@format yaml', '', '**literal** [[target|label]]', '```'
      ].join('\n');
      await request('edit', source);
      await locator('#restart').click();
      await until(async () => (await beat.textContent()).includes('the inlet'));
      assert.doesNotMatch(await beat.textContent(), /\[\[place\|/);
      await locator('#next').click();
      await until(async () => (await locator('#status').textContent()).includes('Beat 2 of 3'));
      const progress = () => evaluate("Array.from(doc.querySelectorAll('.typeout-progress [data-story-segment]')).map(s => s.firstChild.textContent).join('')");
      await until(async () => await evaluate("Boolean(doc.querySelector('.typeout-annotation .typeout-progress'))"));
      const samples = [];
      const capture = async label => samples.push({ label, at: Date.now(), text: await progress(),
        visible: await evaluate("doc.querySelector('.typeout-progress').innerText"),
        firstListVisibility: await evaluate("doc.defaultView.getComputedStyle(doc.querySelector('.typeout-progress li')).visibility") });
      await capture('arrival');
      assert.equal(samples[0].text, '');
      assert.equal(samples[0].firstListVisibility, 'hidden');
      await until(async () => (await progress()).length >= 1);
      await capture('early');
      await sleep(550); await capture('middle');
      assert.ok(samples[2].text.length > samples[1].text.length, JSON.stringify(samples));
      assert.match(await evaluate("doc.querySelector('.typeout-progress').innerHTML"), /<strong>|<em>|<ul>|<blockquote>|<code>/);
      assert.doesNotMatch(samples[2].visible, /\*|\[\[/);
      assert.equal(await evaluate("doc.defaultView.getComputedStyle(doc.querySelector('.typeout-progress li')).visibility"), 'hidden');
      assert.equal(await evaluate("doc.defaultView.getComputedStyle(doc.querySelector('.typeout-progress .typeout-unrevealed')).visibility"), 'hidden');
      await evaluate("doc.documentElement.style.width = '320px'");
      const bounds = await evaluate("(() => { const area=doc.getElementById('beat'); return {width:area.clientWidth, overflow:area.scrollWidth-area.clientWidth}; })()");
      assert.ok(bounds.width <= 320 && bounds.overflow <= 1, JSON.stringify(bounds));
      await evaluate("doc.documentElement.style.width = ''");
      await locator('#pause').click(); const stopped = await progress(); await sleep(450); assert.equal(await progress(), stopped);
      await locator('#pause').click(); await until(async () => (await progress()).length > stopped.length);
      await locator('#reveal').click(); await capture('revealed');
      assert.equal(samples.at(-1).text, 'A🛰️ BFirstSecondQuote code');
      assert.equal(samples.at(-1).firstListVisibility, 'visible');
      await locator('#replay').click(); await until(async () => (await progress()).length < samples.at(-1).text.length);
      await locator('#next').click();
      await until(async () => (await locator('#status').textContent()).includes('Beat 3 of 3'));
      await until(async () => (await locator('#status').textContent()).includes('completed'));
      assert.equal(await evaluate("doc.querySelector('.typeout-yaml .typeout-progress').textContent"), '**literal** [[target|label]]\n');
      await locator('#previous').click();
      assert.equal(await progress(), 'A🛰️ BFirstSecondQuote code');
      assert.match(await locator('#status').textContent(), /completed/);
      await fs.writeFile(path.join(directory, 'annotation-temporal.json'), JSON.stringify({ samples, bounds }, null, 2));
      console.log(`PASS: ${vsix ? 'installed VSIX' : 'Extension Development Host'} formatted annotation temporal DOM in VS Code; isolated profile/log: ${directory}`);
      await fs.writeFile(path.join(directory, 'request.json'), JSON.stringify({ id: ++id, action: 'stop' }));
      return;
    }
    if (process.env.STORY_TELLER_HOST_SCOPE === 'metadata') {
      const fixture = await fs.readFile(path.join(root, 'samples/state-conversion.md'), 'utf8');
      await request('edit', fixture);
      await request('start-state-conversion');
      await until(async () => {
        await request('snapshot');
        return JSON.parse(await fs.readFile(path.join(directory, 'snapshot.json'), 'utf8')).snapshots
          .some(item => item.text.includes('**Date:** 2030-04-01'));
      });
      const mainTarget = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(item => item.type === 'page');
      const receive = socket.onmessage;
      socket.close(); socket = new WebSocket(mainTarget.webSocketDebuggerUrl);
      await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
      socket.onmessage = receive;
      const workbench = async expression => (await send('Runtime.evaluate', { expression, returnByValue: true })).result.value;
      await request('show-notifications');
      await until(async () => await workbench("document.body.innerText.includes('1 State callout(s) to convert; 0 review warning(s).')"));
      const apply = "Array.from(document.querySelectorAll('.monaco-button')).filter(b => b.textContent.trim() === 'Apply').at(-1)";
      await until(async () => await workbench(`Boolean(${apply})`));
      await workbench(`${apply}.click()`);
      await until(async () => {
        await request('snapshot');
        return JSON.parse(await fs.readFile(path.join(directory, 'snapshot.json'), 'utf8')).text.includes('**Date:** 2030-04-01');
      });
      await request('snapshot');
      const applied = JSON.parse(await fs.readFile(path.join(directory, 'snapshot.json'), 'utf8'));
      assert.ok(applied.dirty);
      await request('preview-this', undefined, { start: applied.text.indexOf('**Date:** 2030-04-01') });
      socket.close(); socket = new WebSocket(target.webSocketDebuggerUrl);
      await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
      socket.onmessage = receive;
      await until(async () => (await beat.textContent()).includes('Date: 2030-04-01'));
      const readSnapshot = async () => { await request('snapshot'); return JSON.parse(await fs.readFile(path.join(directory, 'snapshot.json'), 'utf8')); };
      await request('undo');
      let restored = await readSnapshot();
      if (restored.text !== fixture && restored.text.includes('**Date:** 2030-04-01')) {
        // A native focus handoff can swallow the first command invocation.
        await request('undo');
        restored = await readSnapshot();
      }
      assert.equal(restored.text, fixture);
      console.log(`PASS: ${vsix ? 'installed VSIX' : 'Extension Development Host'} State conversion and rendered preview in VS Code; isolated profile/log: ${directory}`);
      await fs.writeFile(path.join(directory, 'request.json'), JSON.stringify({ id: ++id, action: 'stop' }));
      return;
    }
    if (['intellisense', 'intellisense-timing'].includes(process.env.STORY_TELLER_HOST_SCOPE)) {
      const mainTarget = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(item => item.type === 'page');
      const receive = socket.onmessage;
      socket.close(); socket = new WebSocket(mainTarget.webSocketDebuggerUrl);
      await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
      socket.onmessage = receive;
      const workbench = async expression => (await send('Runtime.evaluate', { expression, returnByValue: true })).result.value;
      const key = async (name, code, text = '', modifiers = 0) => {
        await send('Input.dispatchKeyEvent', { type: 'keyDown', key: name, code, text, modifiers });
        await send('Input.dispatchKeyEvent', { type: 'keyUp', key: name, code, modifiers });
      };
      const controlSpace = async () => {
        await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Control', code: 'ControlLeft', modifiers: 2 });
        await key(' ', 'Space', '', 2);
        await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Control', code: 'ControlLeft' });
      };
      const suggest = () => workbench("document.querySelector('.suggest-widget.visible')?.innerText || ''");
      const snapshot = async () => { await request('snapshot'); return JSON.parse(await fs.readFile(path.join(directory, 'snapshot.json'), 'utf8')); };
      if (process.env.STORY_TELLER_HOST_SCOPE === 'intellisense-timing') {
        const pauseCase = process.env.STORY_TELLER_TIMING === 'pause';
        const outside = pauseCase ? '@pa\n\nProse.' : '@de\n\nProse.';
        await request('edit', outside);
        await request('focus-at', undefined, { start: 3 });
        await request('completion-at', undefined, { start: 3 });
        const provider = JSON.parse(await fs.readFile(path.join(directory, 'intellisense-completion.json'), 'utf8'));
        await controlSpace();
        const widget = await until(async () => { const content = await suggest(); return content.includes(pauseCase ? '@pause' : '@delay') && content; }, 10000);
        await fs.writeFile(path.join(directory, 'intellisense-timing.json'), JSON.stringify({ provider, widget }, null, 2));
        console.log(`PASS: ${vsix ? 'installed VSIX' : 'Extension Development Host'} outside timing keyboard completion; isolated profile/log: ${directory}`);
        await fs.writeFile(path.join(directory, 'request.json'), JSON.stringify({ id: ++id, action: 'stop' }));
        return;
      }
      const typeout = '```typeout\n@format yaml\n\n\nbody\n```';
      await request('edit', typeout);
      await request('focus-at', undefined, { start: typeout.indexOf('\n\n\n') + 1 });
      await until(async () => await workbench("Boolean(document.activeElement?.closest('.monaco-editor.focused'))"), 10000);
      await key('@', 'Digit2', '@');
      await until(async () => (await suggest()).includes('@sound'));
      const automatic = await suggest();
      const partial = '```typeout\n@format yaml\n@sp\n\nbody\n```';
      await request('edit', partial);
      await request('focus-at', undefined, { start: partial.indexOf('@sp') + 3 });
      await controlSpace();
      await until(async () => (await suggest()).includes('@speed'));
      await key('Enter', 'Enter');
      await until(async () => (await snapshot()).text.includes('@speed 30'));
      const selected = (await snapshot()).selection?.text;
      await key('2', 'Digit2', '2'); await key('4', 'Digit4', '4');
      await key('Tab', 'Tab');
      await until(async () => (await snapshot()).text.includes('@speed 24'));
      const edited = await snapshot();
      await request('undo');
      const undone = await snapshot();
      const oneMoreUndo = await (async () => { await request('undo'); return (await snapshot()).text; })();
      assert.equal(oneMoreUndo, partial);
      const complete = async (source, marker, label, expected) => {
        await request('edit', source);
        await request('focus-at', undefined, { start: source.indexOf(marker) + marker.length });
        await controlSpace();
        await until(async () => (await suggest()).includes(label));
        await key('Enter', 'Enter');
        await until(async () => (await snapshot()).text.includes(expected));
        return (await snapshot()).text;
      };
      const sound = await complete('```typeout\n@format yaml\n@sound mo\n\nbody\n```', '@sound mo', 'modem', '@sound modem');
      const border = await complete('```typeout\n@format yaml\n@border gr\n\nbody\n```', '@border gr', 'grey', '@border grey');
      const fill = await complete('```typeout\n@format yaml\n@fill ye\n\nbody\n```', '@fill ye', 'yellow', '@fill yellow');
      const chat = '```chat\n@pace\nMara: Hello.\n```';
      await request('edit', chat);
      await request('focus-at', undefined, { start: chat.indexOf('@pace') + 5 });
      await controlSpace();
      await until(async () => (await suggest()).includes('@pace'));
      const chatSuggestions = await suggest();
      await request('hover-at', undefined, { start: chat.indexOf('@pace') + 2 });
      const hover = JSON.parse(await fs.readFile(path.join(directory, 'intellisense-hover.json'), 'utf8'));
      assert.ok(hover.some(item => item.includes('0.7×')));
      await fs.writeFile(path.join(directory, 'intellisense-keyboard.json'), JSON.stringify({ automatic, selected, edited: edited.text, undone: undone.text, oneMoreUndo, sound, border, fill, chatSuggestions, hover,
        settings: JSON.parse(await fs.readFile(path.join(directory, 'intellisense-settings.json'), 'utf8')) }, null, 2));
      console.log(`PASS: ${vsix ? 'installed VSIX' : 'Extension Development Host'} keyboard IntelliSense; isolated profile/log: ${directory}`);
      await fs.writeFile(path.join(directory, 'request.json'), JSON.stringify({ id: ++id, action: 'stop' }));
      return;
    }
    await until(async () => (await beat.textContent()).includes('old radio'));
    assert.equal(await frame.locator('#previous').isDisabled(), true);
    assert.match(await locator('#status').textContent(), /Beat 1 of 7 · The old radio · ready/);
    assert.equal(await evaluate("doc.getElementById('autoplay').checked"), true);
    // Existing regression cases exercise explicit Play. The new page-turn
    // policy is exercised separately below before closing the preview.
    await evaluate("doc.getElementById('autoplay').click()");
    assert.equal(await evaluate("doc.getElementById('autoplay').checked"), false);
    const authoredSample = await fs.readFile(path.join(root, 'samples/lantern.md'), 'utf8');
    const chatOffset = authoredSample.indexOf('Lighthouse contact');
    await request('preview-this', undefined, { start: chatOffset });
    await until(async () => /Beat 2 of 7 · Lighthouse contact · ready/.test(await locator('#status').textContent()));
    await request('snapshot');
    assert.equal(JSON.parse(await fs.readFile(path.join(directory, 'snapshot.json'), 'utf8')).selection.start, chatOffset);
    await locator('#show-source').click();
    await until(async () => {
      await request('snapshot');
      return JSON.parse(await fs.readFile(path.join(directory, 'snapshot.json'), 'utf8')).selection?.start === authoredSample.indexOf('<!-- beat: Lighthouse contact -->');
    });
    const mainPage = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(item => item.type === 'page');
    if (process.env.STORY_TELLER_HOST_SCOPE !== 'no-fold') {
    const sourceLineNumbers = async () => {
      const connection = new WebSocket(mainPage.webSocketDebuggerUrl);
      await new Promise((resolve, reject) => { connection.onopen = resolve; connection.onerror = reject; });
      try {
        return await new Promise((resolve, reject) => {
          connection.onmessage = event => {
            const response = JSON.parse(event.data);
            if (response.id !== 1) return;
            if (response.error || response.result?.exceptionDetails) reject(new Error(JSON.stringify(response.error || response.result.exceptionDetails)));
            else resolve(response.result?.result?.value || []);
          };
          connection.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: {
            expression: `(() => {
              const editor = Array.from(document.querySelectorAll('.monaco-editor.focused'))
                .find(candidate => candidate.getBoundingClientRect().width > 100);
              return editor ? Array.from(editor.querySelectorAll('.margin-view-overlays .line-numbers'))
                .filter(line => { const rect=line.getBoundingClientRect(); return rect.height > 0 && rect.width > 0 && getComputedStyle(line).visibility !== 'hidden'; })
                .map(line => Number(line.textContent)).filter(Number.isInteger) : [];
            })()`, returnByValue: true
          } }));
        });
      } finally { connection.close(); }
    };
    await request('beat-folds');
    const nativeFolds = JSON.parse(await fs.readFile(path.join(directory, 'beat-folds.json'), 'utf8'));
    assert.ok(nativeFolds.some(range => range.start === 12 && range.end > range.start));
    let foldedLines;
    try {
      foldedLines = await until(async () => {
        const value = await sourceLineNumbers();
        return value.includes(13) && !value.includes(22) && value;
      }, 10000);
    } catch (error) {
      await fs.writeFile(path.join(directory, 'fold-failure-lines.json'), JSON.stringify(await sourceLineNumbers()));
      const capture = new WebSocket(mainPage.webSocketDebuggerUrl);
      await new Promise(resolve => { capture.onopen = resolve; });
      const screenshot = await new Promise(resolve => {
        capture.onmessage = event => { const response = JSON.parse(event.data); if (response.id === 1) resolve(response.result?.data); };
        capture.send(JSON.stringify({ id: 1, method: 'Page.captureScreenshot', params: { format: 'png' } }));
      });
      capture.close();
      if (screenshot) await fs.writeFile(path.join(directory, 'fold-failure.png'), Buffer.from(screenshot, 'base64'));
      throw error;
    }
    await fs.writeFile(path.join(directory, 'folded-lines.txt'), JSON.stringify(foldedLines));
    assert.ok(foldedLines.includes(13));
    assert.ok(!foldedLines.includes(22));
    await locator('#show-source').click();
    await until(async () => (await sourceLineNumbers()).includes(22));
    await request('expand-beats');
    await request('fold-all-test');
    await until(async () => !(await sourceLineNumbers()).includes(22));
    await locator('#show-source').click();
    await until(async () => (await sourceLineNumbers()).includes(22));
    }
    await request('preview-this', undefined, { start: authoredSample.indexOf('old radio') });
    await until(async () => /Beat 1 of 7 · The old radio · ready/.test(await locator('#status').textContent()));
    const webAudioEvents = [];
    const priorReceiver = socket.onmessage;
    socket.onmessage = event => {
      const payload = JSON.parse(event.data);
      if (payload.method?.startsWith('WebAudio.')) webAudioEvents.push({ at: Date.now(), method: payload.method,
        contextState: payload.params?.context?.contextState });
      priorReceiver(event);
    };
    let webAudioTracing = true;
    try { await send('WebAudio.enable', {}); } catch { webAudioTracing = false; }
    const typeoutSource = await fs.readFile(path.join(root, 'samples/typeout.md'), 'utf8');
    await request('edit', typeoutSource);
    await frame.locator('#restart').click();
    await until(async () => (await beat.textContent()).includes('receiver beside the lantern'));
    assert.equal(await locator('.typeout-progress').count(), 0);
    assert.equal(await evaluate("doc.defaultView.matchMedia('(prefers-reduced-motion: reduce)').matches"), false);
    const typeoutTemporal = [];
    const prefix = () => evaluate("doc.querySelector('.typeout-progress')?.textContent || ''");
    await evaluate("doc.getElementById('play').click()", true);
    await until(async () => (await prefix()).length >= 4);
    assert.doesNotMatch(await locator('#warnings').textContent(), /Sound unavailable/);
    if (webAudioTracing) {
      await until(() => webAudioEvents.filter(event => event.method === 'WebAudio.nodesConnected').length >= 2);
      assert.equal(webAudioEvents.filter(event => event.method === 'WebAudio.nodesDisconnected').length, 0);
      await until(() => webAudioEvents.some(event => event.method === 'WebAudio.contextChanged' && event.contextState === 'running'));
    }
    typeoutTemporal.push({ phase: 'early', text: await prefix(), at: Date.now() });
    assert.equal(await evaluate("doc.defaultView.getComputedStyle(doc.querySelector('.typeout-reserve')).visibility"), 'hidden');
    await sleep(350);
    const later = await prefix(); assert.ok(later.length > typeoutTemporal[0].text.length);
    typeoutTemporal.push({ phase: 'later', text: later, at: Date.now() });
    await evaluate("doc.documentElement.style.width = '320px'");
    const typeoutBounds = await evaluate("(() => { const area=doc.getElementById('beat'), surface=doc.querySelector('.typeout-surface'); return {width:area.clientWidth, overflow:area.scrollWidth-area.clientWidth, surface:surface.getBoundingClientRect().width}; })()");
    assert.ok(typeoutBounds.width <= 320 && typeoutBounds.overflow <= 1 && typeoutBounds.surface <= typeoutBounds.width, JSON.stringify(typeoutBounds));
    await evaluate("doc.documentElement.style.width = ''");
    await locator('#pause').click();
    if (webAudioTracing) await until(() => webAudioEvents.filter(event => event.method === 'WebAudio.nodesDisconnected').length >= 2);
    const pausedPrefix = await prefix(); await sleep(350); assert.equal(await prefix(), pausedPrefix);
    await locator('#mute').click(); assert.equal(await evaluate("doc.getElementById('mute').getAttribute('aria-pressed')"), 'true');
    await locator('#pause').click();
    await request('hide-preview');
    await until(async () => (await locator('#status').textContent()).includes('paused'));
    const hiddenPrefix = await prefix(); await sleep(400); assert.equal(await prefix(), hiddenPrefix);
    await request('show-preview');
    await until(async () => (await locator('#status').textContent()).includes('paused'));
    assert.equal(await prefix(), hiddenPrefix);
    assert.equal(await evaluate("doc.getElementById('mute').getAttribute('aria-pressed')"), 'true');
    await fs.writeFile(path.join(directory, 'typeout-hide-state.json'), JSON.stringify(await evaluate("({hidden: doc.hidden, pauseDisabled: doc.getElementById('pause').disabled, status: doc.getElementById('status').textContent})"), null, 2));
    await until(async () => !(await locator('#pause').isDisabled()), 10000);
    await evaluate("doc.defaultView.dispatchEvent(new MessageEvent('message', { data: { type: 'presentation', visible: false, epoch: 0 } }))");
    assert.equal(await locator('#pause').isDisabled(), false, 'A stale hide event must not override the latest presentation');
    await locator('#pause').click();
    await until(async () => (await prefix()).length > hiddenPrefix.length);
    await locator('#reveal').click();
    assert.equal(await prefix(), 'status: listening\nsource:\n  direction: beyond the harbour\n  confidence: unresolved\n');
    assert.equal((await beat.textContent()).includes('The light beyond the wall remained still.'), false);
    await until(async () => (await beat.textContent()).includes('The light beyond the wall remained still.'));
    typeoutTemporal.push({ phase: 'complete', text: await prefix(), at: Date.now() });
    await fs.writeFile(path.join(directory, 'typeout-temporal.json'), JSON.stringify(typeoutTemporal, null, 2));
    await locator('#replay').click();
    assert.equal(await locator('.typeout-progress').count(), 0);
    await until(async () => (await prefix()).length > 0);
    await request('edit', typeoutSource.replace('status: listening', 'status: changed'));
    await until(async () => (await locator('#status').textContent()).includes('ready'));
    assert.equal(await locator('.typeout-progress').count(), 0);
    assert.equal(await evaluate("doc.getElementById('mute').getAttribute('aria-pressed')"), 'true');
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await until(async () => await evaluate("doc.defaultView.matchMedia('(prefers-reduced-motion: reduce)').matches"));
    await locator('#play').click();
    await until(async () => (await prefix()).includes('confidence: unresolved'));
    assert.equal(await prefix(), 'status: changed\nsource:\n  direction: beyond the harbour\n  confidence: unresolved\n');
    await send('Emulation.setEmulatedMedia', { features: [] });
    await until(async () => !(await evaluate("doc.defaultView.matchMedia('(prefers-reduced-motion: reduce)').matches")));
    await frame.locator('#next').click();
    await until(async () => (await locator('#status').textContent()).includes('A note in the margin'));
    await locator('#mute').click(); assert.equal(await evaluate("doc.getElementById('mute').getAttribute('aria-pressed')"), 'false');
    await locator('#play').click();
    await until(async () => (await prefix()).length > 0);
    assert.equal(await evaluate("doc.querySelector('.typeout-annotation') !== null"), true);
    assert.equal(await evaluate("doc.getElementById('reveal').hidden"), false);
    const keyboardAudioState = await evaluate("({warning:doc.getElementById('warnings').textContent,mute:doc.getElementById('mute').getAttribute('aria-pressed'),reduced:doc.defaultView.matchMedia('(prefers-reduced-motion: reduce)').matches})");
    await locator('#reveal').click();
    await frame.locator('#next').click();
    await until(async () => (await locator('#status').textContent()).includes('An older machine'));
    await locator('#play').click();
    await until(async () => (await prefix()).length > 0);
    assert.equal(await evaluate("doc.getElementById('reveal').hidden"), false);
    const typewriterAudioState = await evaluate("({warning:doc.getElementById('warnings').textContent,mute:doc.getElementById('mute').getAttribute('aria-pressed'),reduced:doc.defaultView.matchMedia('(prefers-reduced-motion: reduce)').matches})");
    await locator('#reveal').click();
    await sleep(100);
    const nodesBeforeSilent = webAudioEvents.filter(event => event.method === 'WebAudio.audioNodeCreated').length;
    await fs.writeFile(path.join(directory, 'typeout-audio-states.json'), JSON.stringify({ keyboardAudioState, typewriterAudioState, nodesBeforeSilent }, null, 2));
    assert.doesNotMatch(keyboardAudioState.warning, /Sound unavailable/);
    assert.doesNotMatch(typewriterAudioState.warning, /Sound unavailable/);
    if (webAudioTracing) assert.ok(nodesBeforeSilent >= 7, `Expected modem, keyboard and typewriter voices; saw ${nodesBeforeSilent} audio nodes`);
    await frame.locator('#next').click();
    await until(async () => (await locator('#status').textContent()).includes('Silent output'));
    await locator('#play').click();
    await until(async () => (await prefix()).length > 0);
    await locator('#reveal').click();
    await sleep(100);
    assert.equal(webAudioEvents.filter(event => event.method === 'WebAudio.audioNodeCreated').length, nodesBeforeSilent);
    await locator('#mute').click();
    assert.equal(await evaluate("doc.getElementById('mute').getAttribute('aria-pressed')"), 'true');
    await request('edit', authoredSample);
    await until(async () => (await locator('#status').textContent()).includes('of 7'));
    await frame.locator('#restart').click();
    await until(async () => (await beat.textContent()).includes('old radio'));
    await fs.writeFile(path.join(directory, 'typeout-audio-events.json'), JSON.stringify({ webAudioTracing, events: webAudioEvents }, null, 2));
    // Regression fixture: header flag alone, followed by viewer-first dialogue.
    // Strip per-message cues only in this temporary test buffer, never the sample file.
    const headerSource = (await fs.readFile(path.join(root, 'samples/lantern.md'), 'utf8'))
      .replace('# The Last Lantern', '# The Last Lantern\n\nHeader cue regression.')
      .replace(/```chat([\s\S]*?)```/, (fence, body) => '```chat' + body.replace(/^@responding\n/gm, '').replace('@viewer Mara\n', '@viewer Mara\n@responding\n') + '```');
    await request('edit', headerSource);
    await until(async () => (await beat.textContent()).includes('Header cue regression.'));
    await frame.locator('#next').click();
    await until(async () => (await frame.locator('#status').textContent()).includes('ready'));
    assert.equal(await frame.locator('.chat li').count(), 0);
    await sleep(500); assert.equal(await frame.locator('.chat li').count(), 0);
    const temporal = [];
    const capture = async label => temporal.push({ label, at: Date.now(), count: await frame.locator('.chat li').count(), status: await frame.locator('#status').textContent() });
    await capture('ready');
    assert.equal(await locator('.chat-title').count(), 0);
    await frame.locator('#play').click();
    await until(async () => (await locator('.chat-title').textContent()) === 'Lighthouse radio');
    assert.equal(await locator('.chat li').count(), 0);
    await until(async () => await frame.locator('.chat li').count() === 1);
    await capture('first message');
    await until(async () => (await locator('.responding').textContent()) === 'Ivo is responding…');
    await frame.locator('#pause').click();
    assert.equal(await locator('.responding').count(), 0);
    await sleep(900); assert.equal(await frame.locator('.chat li').count(), 1);
    await capture('paused');
    await frame.locator('#pause').click();
    assert.equal(await locator('.responding').textContent(), 'Ivo is responding…');
    await until(async () => await frame.locator('.chat li').count() === 2);
    await capture('second message');
    assert.equal(await locator('.responding').count(), 0);
    await until(async () => (await frame.locator('.chat li').count()) === 3);
    assert.equal((await beat.textContent()).includes("engine fell silent"), false);
    await until(async () => (await beat.textContent()).includes("engine fell silent"));
    assert.ok((await locator('#status').textContent()).includes('playing'));
    await until(async () => (await frame.locator('#status').textContent()).includes('completed'));
    assert.equal(await frame.locator('.chat li').count(), 3);
    assert.equal(await frame.locator('.ticks.read').count(), 2);
    await capture('completed');
    await frame.locator('#replay').click();
    assert.equal(await frame.locator('.chat li').count(), 0);
    await frame.locator('#pause').click();
    // Configure the test's final beat explicitly; do not depend on local sample edits.
    const sample = headerSource; // Keep the current chat identical while testing a preceding beat insertion.
    await request('edit', sample.replace('# The Last Lantern', 'Inserted first beat\n---\n# The Last Lantern'));
    await until(async () => /Beat 3 of 8 .* ready/.test(await frame.locator('#status').textContent()));
    assert.equal(await frame.locator('.chat li').count(), 0);
    await request('edit', sample.replace('Only me.', 'Only me, Mara.'));
    await until(async () => /Beat 2 of 7 .* ready/.test(await frame.locator('#status').textContent()));
    await frame.locator('#next').click();
    await until(async () => (await beat.textContent()).includes('ferry touched'));
    assert.equal((await beat.textContent()).includes('Beyond the wake'), false);
    assert.equal(await frame.locator('.prose').count(), 1);
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    assert.equal(await evaluate("doc.defaultView.matchMedia('(prefers-reduced-motion: reduce)').matches"), true);
    await frame.locator('#play').click();
    await sleep(250);
    assert.equal(await locator('.responding').count(), 0);
    assert.equal(await locator('.chat li').count(), 0);
    await capture('mixed: outside pause');
    await until(async () => (await locator('.responding').textContent()) === 'Ivo is responding…');
    assert.equal(await locator('.chat li').count(), 0);
    await capture('mixed: first-message delay with responding');
    await until(async () => await locator('.chat li').count() === 3);
    assert.equal((await beat.textContent()).includes('Beyond the wake'), false);
    await capture('mixed: prose entry delay');
    await until(async () => (await beat.textContent()).includes('Beyond the wake'));
    assert.ok((await locator('#status').textContent()).includes('playing'));
    await capture('mixed: trailing pause');
    await until(async () => (await locator('#status').textContent()).includes('completed'));
    await capture('mixed: completed');
    assert.equal(await frame.locator('.prose').count(), 2);
    assert.equal(await frame.locator('.chat li').count(), 3);
    assert.equal(await frame.locator('.ticks').count(), 0);
    assert.equal(await locator('.chat-title').count(), 0);
    assert.equal(await frame.locator('.chat li.outgoing').count(), 1);
    assert.equal(await evaluate("doc.querySelector('.chat li.outgoing strong').textContent"), 'Mara');
    assert.ok(await evaluate("doc.querySelector('.chat li.outgoing').getBoundingClientRect().left - doc.querySelector('.chat li:not(.outgoing)').getBoundingClientRect().left") >= 10);
    assert.equal(await frame.locator('#next').isDisabled(), false);
    await fs.writeFile(path.join(directory, 'temporal.json'), JSON.stringify(temporal, null, 2));
    await frame.locator('#previous').click();
    await frame.locator('#restart').click();
    await until(async () => (await beat.textContent()).includes('old radio'));
    await request('switch');
    assert.match(await beat.textContent(), /old radio/);
    await request('reopen-command');
    assert.match(await beat.textContent(), /old radio/);
    const fetched = [];
    const receive = socket.onmessage;
    socket.onmessage = event => {
      const message = JSON.parse(event.data);
      if (message.method === 'Network.requestWillBeSent' && message.params.request.url.includes('story-teller-blocked.invalid')) fetched.push(message.params.request.url);
      receive(event);
    };
    await send('Network.enable', {});
    await request('edit', '# Safety\n\n<script>window.STORY_ATTACK = true</script>\n\n![photo](https://story-teller-blocked.invalid/img) [external](https://story-teller-blocked.invalid)\n\n```chat\n@title <img src=x onerror=alert(1)>\n<img src=x onerror=alert(1)>: <iframe src="https://story-teller-blocked.invalid"></iframe>\n```');
    await until(async () => (await beat.textContent()).includes('Safety'));
    await locator('#play').click();
    await until(async () => (await locator('.chat li').count()) === 1);
    assert.equal(await locator('#beat script, #beat img, #beat iframe, #beat a, #beat style').count(), 0);
    assert.equal(await evaluate('doc.defaultView.STORY_ATTACK'), undefined);
    assert.equal(await locator('.chat-title').textContent(), '<img src=x onerror=alert(1)>');
    await sleep(300);
    assert.deepEqual(fetched, []);
    await request('edit', '');
    await until(async () => (await beat.textContent()).includes('No story beats yet'));
    await request('edit', sample);
    await until(async () => (await beat.textContent()).includes('old radio'));
    await evaluate("doc.getElementById('next').focus()");
    assert.equal(await evaluate("doc.activeElement.id"), 'next');
    await locator('#next').click();
    await until(async () => (await locator('#status').textContent()).includes('ready'));
    assert.equal(await evaluate("doc.activeElement.id"), 'next');
    const autoplaySource = 'First page.\n---\n<!-- beat: Performed state -->\n@delay 100ms\n\n```typeout\n@format yaml\n@sound modem\n@speed 2\n\nstatus: still observing\n```\n\n![Wide harbour](assets/harbour-landscape.webp)\n\n*Caption: The wall.*\n\nAfter the output.\n---\n<!-- beat: The reply -->\n```chat\n@viewer Mara\n@responding\nIvo: I am here.\n```';
    await request('edit', autoplaySource);
    await until(async () => (await locator('#status').textContent()).includes('of 3'));
    await locator('#restart').click();
    await until(async () => (await locator('#status').textContent()).includes('Beat 1 of 3 · ready'));
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
    await until(async () => !(await evaluate("doc.defaultView.matchMedia('(prefers-reduced-motion: reduce)').matches")));
    assert.equal(await evaluate("doc.getElementById('autoplay').checked"), false);
    await evaluate("doc.getElementById('autoplay').click()");
    assert.equal(await evaluate("doc.getElementById('autoplay').checked"), true);
    if (await evaluate("doc.getElementById('mute').getAttribute('aria-pressed')") === 'true') await locator('#mute').click();
    const connectedBeforeTurn = webAudioEvents.filter(event => event.method === 'WebAudio.nodesConnected').length;
    const disconnectedBeforeTurn = webAudioEvents.filter(event => event.method === 'WebAudio.nodesDisconnected').length;
    await evaluate("doc.getElementById('next').click()", true);
    await until(async () => (await locator('#status').textContent()).includes('Beat 2 of 3 · Performed state · playing'));
    assert.equal(await evaluate("doc.querySelector('.typeout-progress')?.textContent || ''"), '');
    await until(async () => (await evaluate("doc.querySelector('.typeout-progress')?.textContent.length || 0")) >= 2);
    const autoplayEarly = { at: Date.now(), text: await evaluate("doc.querySelector('.typeout-progress').textContent") };
    await until(async () => (await evaluate("doc.querySelector('.typeout-progress').textContent.length")) > autoplayEarly.text.length);
    const autoplayLater = { at: Date.now(), text: await evaluate("doc.querySelector('.typeout-progress').textContent") };
    if (webAudioTracing) await until(() => webAudioEvents.filter(event => event.method === 'WebAudio.nodesConnected').length >= connectedBeforeTurn + 2, 5000)
      .catch(async error => { throw new Error(`Autoplay audio graph missing: ${JSON.stringify(await evaluate("({status:doc.getElementById('status').textContent,mute:doc.getElementById('mute').getAttribute('aria-pressed'),reduced:doc.defaultView.matchMedia('(prefers-reduced-motion: reduce)').matches,progress:doc.querySelector('.typeout-progress')?.textContent,warning:doc.getElementById('warnings').textContent})"))}`, { cause: error }); });
    await evaluate("doc.getElementById('next').click()", true);
    await until(async () => (await locator('#status').textContent()).includes('Beat 3 of 3 · The reply · playing'));
    if (webAudioTracing) await until(() => webAudioEvents.filter(event => event.method === 'WebAudio.nodesDisconnected').length >= disconnectedBeforeTurn + 2);
    assert.equal(await locator('.typeout-progress').count(), 0);
    await locator('#previous').click();
    await until(async () => (await locator('#status').textContent()).includes('Beat 2 of 3 · Performed state · completed'));
    assert.equal(await evaluate("doc.querySelector('.typeout-progress').textContent"), 'status: still observing\n');
    await fs.writeFile(path.join(directory, 'autoplay-temporal.json'), JSON.stringify({ early: autoplayEarly, later: autoplayLater,
      previous: { at: Date.now(), text: await evaluate("doc.querySelector('.typeout-progress').textContent") },
      audioConnectionsBefore: connectedBeforeTurn, audioDisconnectionsBefore: disconnectedBeforeTurn,
      audioDisconnectionsAfter: webAudioEvents.filter(event => event.method === 'WebAudio.nodesDisconnected').length }, null, 2));
    assert.equal(await evaluate("doc.querySelector('.story-figure img')?.alt"), 'Wide harbour');
    assert.equal(await evaluate("doc.querySelector('figcaption')?.textContent"), 'The wall.');
    assert.ok((await beat.textContent()).includes('After the output.'));
    assert.equal(await evaluate("doc.querySelector('.typeout-progress.active') !== null"), false);
    await sleep(650);
    assert.equal(await evaluate("doc.querySelector('.typeout-progress').textContent"), 'status: still observing\n');
    await evaluate("doc.getElementById('replay').click()", true);
    assert.equal(await locator('.typeout-progress').count(), 0);
    await until(async () => (await evaluate("doc.querySelector('.typeout-progress')?.textContent.length || 0")) > 0);
    await evaluate("doc.getElementById('autoplay').click()");
    await locator('#next').click();
    await until(async () => (await locator('#status').textContent()).includes('Beat 3 of 3 · The reply · ready'));
    await locator('#restart').click();
    await until(async () => (await locator('#status').textContent()).includes('Beat 1 of 3 · ready'));
    if (await evaluate("doc.getElementById('mute').getAttribute('aria-pressed')") === 'false') await locator('#mute').click();
    await request('edit', authoredSample);
    await until(async () => (await locator('#status').textContent()).includes('of 7'));
    await locator('#play').click();
    await request('close-preview');
    await until(async () => !(await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).some(t => t.type === 'iframe' && t.url.includes('murmurationpress.story-teller')));
    // Switch the test-only CDP inspection to the actual workbench for native
    // diff/notification buttons; extension code never sees this connection.
    const mainTarget = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page');
    const receiveWorkbench = socket.onmessage;
    socket.close(); socket = new WebSocket(mainTarget.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    socket.onmessage = receiveWorkbench;
    async function workbench(expression) {
      const response = await send('Runtime.evaluate', { expression, returnByValue: true });
      if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
      return response.result.value;
    }
    const action = async text => {
      await request('show-notifications');
      // Earlier conversion notices can remain in the notification centre;
      // the newest matching action belongs to the current review.
      const expression = `Array.from(document.querySelectorAll('.monaco-button')).filter(b => b.textContent.trim() === ${JSON.stringify(text)}).at(-1)`;
      try { await until(async () => await workbench(`Boolean(${expression})`)); }
      catch (error) {
        await fs.writeFile(path.join(directory, 'failed-notification.txt'), await workbench("document.body.innerText"));
        throw error;
      }
      await workbench(`${expression}.click()`);
    };
    const snapshot = async () => {
      await request('snapshot'); return JSON.parse(await fs.readFile(path.join(directory, 'snapshot.json'), 'utf8'));
    };
    const result = () => until(async () => JSON.parse(await fs.readFile(path.join(directory, 'conversion-result.json'), 'utf8')));
    await request('close-cover'); // Remove the synthetic tab used to test preview hiding.
    const fixture = await fs.readFile(path.join(root, 'samples/conversion-example.md'), 'utf8');
    await request('edit', fixture); const initial = await snapshot();
    await request('start-conversion');
    await until(async () => (await snapshot()).snapshots.some(s => s.text.includes('Bo: First line.')));
    const prepared = await snapshot();
    assert.equal(prepared.text, fixture); assert.equal(prepared.disk, initial.disk);
    assert.ok(prepared.snapshots.some(s => s.text === fixture));
    assert.ok(await workbench("document.body.innerText.includes('2 chat(s) to convert; 1 review warning(s).')"));
    await action('Review Warnings');
    await until(async () => await workbench("document.body.innerText.includes('subtext')"));
    await action('Cancel'); assert.equal((await result()).status, 'cancelled');
    assert.equal((await snapshot()).text, fixture);

    await request('start-conversion');
    await request('edit', fixture + '\nAn unsaved edit after preview.');
    await action('Apply');
    await until(async () => await workbench("document.body.innerText.includes('Nothing was applied.')"));
    assert.equal((await snapshot()).text, fixture + '\nAn unsaved edit after preview.');
    await request('show-notifications');
    await action('Regenerate');
    await until(async () => (await snapshot()).snapshots.some(s => s.text.includes('Bo: First line.') && s.text.endsWith('An unsaved edit after preview.')));
    await action('Cancel'); assert.equal((await result()).status, 'cancelled');
    const unsaved = (await snapshot()).text;

    await request('start-conversion'); await action('Apply');
    const applied = await result(); assert.equal(applied.status, 'applied'); assert.equal(applied.count, 2);
    const after = await snapshot();
    assert.ok(after.text.includes('# Harbour link\n@viewer Ari\nAri: Is the lamp still lit?'));
    assert.ok(after.text.includes('  | Second line, with a colon: keep this together.'));
    assert.ok(after.text.endsWith('An unsaved edit after preview.'));
    assert.ok(after.dirty); assert.equal(after.disk, initial.disk);
    await request('preview-current');
    const convertedTarget = await until(async () => (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'iframe' && t.url.includes('murmurationpress.story-teller')));
    async function inspectConverted(expression) {
      const connection = new WebSocket(convertedTarget.webSocketDebuggerUrl);
      await new Promise((resolve, reject) => { connection.onopen = resolve; connection.onerror = reject; });
      try {
        return await new Promise((resolve, reject) => {
          connection.onmessage = event => {
            const message = JSON.parse(event.data);
            if (message.id !== 1) return;
            if (message.result?.exceptionDetails || message.error) reject(new Error(JSON.stringify(message)));
            else resolve(message.result.result.value);
          };
          connection.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: `(() => { const doc = document.getElementById('active-frame')?.contentDocument; return (${expression}); })()`, returnByValue: true } }));
        });
      } finally { connection.close(); }
    }
    await until(async () => (await inspectConverted("doc?.getElementById('status')?.textContent || ''")).includes('· ready'));
    assert.equal(await inspectConverted("doc.getElementById('mute').getAttribute('aria-pressed')"), 'true');
    assert.equal(await inspectConverted("doc.getElementById('autoplay').checked"), false);
    await inspectConverted("doc.getElementById('play').click()");
    await until(async () => (await inspectConverted("doc.querySelector('.chat-title')?.textContent")) === 'Harbour link');
    await until(async () => (await inspectConverted("doc.querySelectorAll('.chat li').length")) >= 2);
    const multiline = await inspectConverted("doc.querySelectorAll('.chat li p')[1].textContent");
    assert.ok(multiline.includes('Second line, with a colon: keep this together.\n\n@pause 500ms is part of this message, not a setting.'));
    await request('undo'); const undone = await snapshot();
    assert.equal(undone.text, unsaved); assert.equal(undone.disk, initial.disk);
    const calloutFixture = await fs.readFile(path.join(root, 'samples/callout-conversion.md'), 'utf8');
    await request('edit', calloutFixture);
    const calloutInitial = await snapshot();
    const calloutResult = () => until(async () => JSON.parse(await fs.readFile(path.join(directory, 'callout-conversion-result.json'), 'utf8')));
    await request('start-callout-conversion');
    await until(async () => (await snapshot()).snapshots.some(item => item.text.includes('<!-- beat: Harbour.Signal -->')));
    assert.ok(await workbench("document.body.innerText.includes('2 callout(s) to convert; 1 review warning(s).')"));
    await action('Review Warnings');
    await until(async () => await workbench("document.body.innerText.replaceAll('\\u00a0', ' ').includes('one top-level YAML fence')"));
    await action('Cancel'); assert.equal((await calloutResult()).status, 'cancelled');
    assert.equal((await snapshot()).text, calloutFixture);
    await request('start-callout-conversion');
    const calloutUnsaved = calloutFixture + '\nAn unsaved ending.';
    await request('edit', calloutUnsaved);
    await action('Apply');
    await until(async () => await workbench("document.body.innerText.includes('Nothing was applied.')"));
    assert.equal((await snapshot()).text, calloutUnsaved);
    await request('show-notifications'); await action('Regenerate');
    await until(async () => (await snapshot()).snapshots.some(item => item.text.includes('<!-- beat: Harbour.Signal -->') && item.text.endsWith('An unsaved ending.')));
    await action('Apply');
    assert.deepEqual(await calloutResult(), { status: 'applied', count: 2 });
    const calloutApplied = await snapshot();
    assert.ok(calloutApplied.text.includes('<!-- beat: Harbour.Signal -->'));
    assert.ok(calloutApplied.text.includes('@format annotation\n@sound keyboard'));
    assert.ok(calloutApplied.text.includes('> [!prime-log] Unresolved note'));
    assert.ok(calloutApplied.dirty); assert.equal(calloutApplied.disk, calloutInitial.disk);
    await request('preview-this', undefined, { start: calloutApplied.text.indexOf('<!-- beat: Harbour.Signal -->') });
    await until(async () => (await inspectConverted("doc.getElementById('status').textContent")).includes('Harbour.Signal'));
    assert.equal(await inspectConverted("doc.querySelectorAll('.typeout-progress').length"), 0);
    await inspectConverted("doc.getElementById('play').click()");
    await until(async () => (await inspectConverted("doc.querySelector('.typeout-progress')?.textContent.length || 0")) >= 4);
    const firstOutput = await inspectConverted("doc.querySelector('.typeout-progress').textContent.length");
    await until(async () => (await inspectConverted("doc.querySelector('.typeout-progress').textContent.length")) > firstOutput, 2000);
    await inspectConverted("doc.getElementById('next').click()");
    await until(async () => (await inspectConverted("doc.getElementById('status').textContent")).includes('Mara — Margin note'));
    await inspectConverted("doc.getElementById('play').click()");
    await until(async () => (await inspectConverted("doc.querySelector('.typeout-annotation .typeout-progress')?.textContent.length || 0")) >= 4);
    await request('undo');
    assert.equal((await snapshot()).text, calloutUnsaved);
    assert.equal((await snapshot()).disk, calloutInitial.disk);
    await request('hide-notifications');
    const stateFixture = await fs.readFile(path.join(root, 'samples/state-conversion.md'), 'utf8');
    await request('edit', stateFixture);
    const stateInitial = await snapshot();
    const stateResult = () => until(async () => JSON.parse(await fs.readFile(path.join(directory, 'state-conversion-result.json'), 'utf8')));
    await request('start-state-conversion');
    await until(async () => (await snapshot()).snapshots.some(item => item.text.includes('**Date:** 2030-04-01')));
    await until(async () => await workbench("document.body.innerText.includes('1 State callout(s) to convert; 0 review warning(s).')"));
    await action('Cancel'); assert.equal((await stateResult()).status, 'cancelled');
    assert.equal((await snapshot()).text, stateFixture);
    const ambiguousState = stateFixture + '\n> [!State]\n> **Unknown**: `=this.missing`\n';
    await request('edit', ambiguousState);
    await request('start-state-conversion');
    await until(async () => await workbench("document.body.innerText.includes('1 State callout(s) to convert; 1 review warning(s).')"));
    await action('Review Warnings');
    await fs.writeFile(path.join(directory, 'state-warning-view.txt'), await workbench("document.body.innerText"));
    await action('Cancel'); assert.equal((await stateResult()).status, 'cancelled');
    assert.equal((await snapshot()).text, ambiguousState);
    await request('hide-notifications');
    await request('start-state-conversion');
    const stateUnsaved = ambiguousState + '\nAn unsaved ending.';
    await request('edit', stateUnsaved);
    await action('Apply');
    await until(async () => await workbench("document.body.innerText.includes('Nothing was applied.')"));
    assert.equal((await snapshot()).text, stateUnsaved);
    await request('show-notifications'); await action('Regenerate');
    await until(async () => (await snapshot()).snapshots.some(item => item.text.includes('**Date:** 2030-04-01') && item.text.endsWith('An unsaved ending.')));
    await action('Apply'); assert.deepEqual(await stateResult(), { status: 'applied', count: 1 });
    const stateApplied = await snapshot();
    assert.ok(stateApplied.text.includes('**Date:** 2030-04-01  \n**Location:** West Sussex'));
    assert.ok(stateApplied.text.includes('> **Unknown**: `=this.missing`'));
    assert.ok(stateApplied.text.startsWith(stateFixture.slice(0, stateFixture.indexOf('> [!State]'))));
    assert.ok(stateApplied.dirty); assert.equal(stateApplied.disk, stateInitial.disk);
    await request('preview-this', undefined, { start: stateApplied.text.indexOf('**Date:** 2030-04-01') });
    await until(async () => (await inspectConverted("doc.querySelector('#beat')?.textContent"))?.includes('Date: 2030-04-01'));
    assert.ok((await inspectConverted("doc.querySelector('#beat')?.textContent")).includes('Location: West Sussex'));
    await request('undo'); assert.equal((await snapshot()).text, stateUnsaved);
    assert.equal((await snapshot()).disk, stateInitial.disk);
    await request('hide-notifications');
    const pick = async label => {
      const expression = `Array.from(document.querySelectorAll('.quick-input-list .monaco-list-row')).find(row => row.textContent.includes(${JSON.stringify(label)}))`;
      await until(async () => await workbench(`Boolean(${expression})`));
      await workbench(`${expression}.click()`);
    };
    const insertResult = () => until(async () => JSON.parse(await fs.readFile(path.join(directory, 'insert-result.json'), 'utf8')));
    await request('edit', 'Before\n\n');
    await request('start-insert'); await pick('Chat block');
    assert.equal((await insertResult()).status, 'inserted');
    let inserted = await snapshot();
    assert.equal(inserted.selection.text, 'Conversation title');
    assert.ok(inserted.text.includes('# Conversation title\n@viewer Viewer\nViewer: First message.'));
    assert.ok(!inserted.text.includes('@ticks') && !inserted.text.includes('@responding'));
    await request('type', undefined, { text: 'Harbour test' });
    await request('snippet-next'); assert.equal((await snapshot()).selection.text, 'Viewer');
    await request('type', undefined, { text: 'Ari' });
    inserted = await snapshot(); assert.ok(inserted.text.includes('@viewer Ari\nAri: First message.'));
    await request('snippet-next'); assert.equal((await snapshot()).selection.text, 'First message.');
    await request('snippet-next'); assert.equal((await snapshot()).selection.text, 'Other participant');
    await request('snippet-next'); assert.equal((await snapshot()).selection.text, 'Reply.');
    await request('snippet-next');
    // A clean insertion is one undoable operation, without subsequent typing edits.
    await request('edit', 'Before\n\n'); await request('start-insert'); await pick('Chat block'); await insertResult();
    await request('undo'); assert.equal((await snapshot()).text, 'Before\n\n');

    await request('edit', 'Before\n\nAfter');
    await request('start-insert', undefined, { start: 8 }); await pick('Delay');
    assert.equal((await insertResult()).status, 'inserted');
    inserted = await snapshot(); assert.equal(inserted.selection.text, '1200');
    assert.ok(inserted.text.includes('@delay 1200ms'));
    await request('undo'); assert.equal((await snapshot()).text, 'Before\n\nAfter');
    await request('start-insert', undefined, { start: 8 }); await pick('Beat boundary');
    await until(async () => await workbench("document.querySelector('.quick-input-widget input')?.getAttribute('placeholder') === '' || document.querySelector('.quick-input-widget')?.innerText.includes('Beat title')"));
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await insertResult();
    assert.ok((await snapshot()).text.includes('\n---\n'));
    await request('undo'); assert.equal((await snapshot()).text, 'Before\n\nAfter');
    await request('start-insert', undefined, { start: 8 }); await pick('Beat boundary');
    await until(async () => await workbench("document.querySelector('.quick-input-widget')?.innerText.includes('Beat title')"));
    await send('Input.insertText', { text: 'A named turn' });
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    assert.equal((await insertResult()).status, 'inserted');
    assert.ok((await snapshot()).text.includes('<!-- beat: A named turn -->'));
    await request('undo'); assert.equal((await snapshot()).text, 'Before\n\nAfter');
    await request('start-insert', undefined, { start: 8 }); await pick('Beat boundary');
    await until(async () => await workbench("document.querySelector('.quick-input-widget')?.innerText.includes('Beat title')"));
    await workbench("document.querySelector('.quick-input-widget input')?.focus()");
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    assert.equal((await insertResult()).status, 'cancelled');
    assert.equal((await snapshot()).text, 'Before\n\nAfter');

    const imageWithoutCaption = 'Before.\n\n![Tall tower](assets/harbour-portrait.png)\n\nAfter.';
    await request('edit', imageWithoutCaption);
    await request('start-insert', undefined, { start: imageWithoutCaption.indexOf('Tall tower') }); await pick('Caption');
    assert.equal((await insertResult()).status, 'inserted');
    inserted = await snapshot();
    assert.equal(inserted.selection.text, 'Your caption here');
    assert.ok(inserted.text.includes('![Tall tower](assets/harbour-portrait.png)\n\n*Caption: Your caption here*'));
    await request('undo'); assert.equal((await snapshot()).text, imageWithoutCaption);
    const imageWithCaption = imageWithoutCaption.replace('After.', '*Caption: From the path.*\n\nAfter.');
    await request('edit', imageWithCaption);
    await request('start-insert', undefined, { start: imageWithCaption.indexOf('From the path') }); await pick('Caption');
    assert.equal((await insertResult()).status, 'selected');
    assert.equal((await snapshot()).selection.text, 'From the path.');

    await request('edit', 'Before\n\nAfter');
    await request('start-insert', undefined, { start: 8 }); await pick('Type-out'); await pick('PRIME / Divergent YAML');
    assert.equal((await insertResult()).status, 'inserted');
    inserted = await snapshot();
    assert.equal(inserted.selection.text, 'status: observing');
    assert.ok(inserted.text.includes('@format yaml\n@sound modem\n\nstatus: observing'));
    await request('undo'); assert.equal((await snapshot()).text, 'Before\n\nAfter');
    await request('start-insert', undefined, { start: 8 }); await pick('Type-out'); await pick('Annotation');
    assert.equal((await insertResult()).status, 'inserted');
    assert.ok((await snapshot()).text.includes('@format annotation\n@sound keyboard'));
    await request('undo'); assert.equal((await snapshot()).text, 'Before\n\nAfter');
    await request('start-insert', undefined, { start: 0, end: 6 }); await pick('Type-out'); await pick('Annotation');
    assert.equal((await insertResult()).status, 'refused');
    assert.equal((await snapshot()).text, 'Before\n\nAfter');

    const settingSource = 'Setting probe\n\n```typeout\n@format yaml\n@sound none\n\nstatus: observing\n```';
    await request('edit', settingSource);
    await request('start-insert', undefined, { start: settingSource.indexOf('status:') });
    await pick('Component settings'); await pick('Speed'); await pick('Set speed');
    await until(async () => await workbench("document.querySelector('.quick-input-widget input')?.value === '30'"));
    await workbench("document.querySelector('.quick-input-widget input')?.focus()");
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, modifiers: 2 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, modifiers: 2 });
    await send('Input.insertText', { text: '15' });
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    assert.equal((await insertResult()).status, 'inserted');
    assert.ok((await snapshot()).text.includes('@speed 15\n'));
    await request('undo'); assert.equal((await snapshot()).text, settingSource);
    await request('start-insert', undefined, { start: settingSource.indexOf('status:') });
    await pick('Component settings'); await pick('Fill');
    await request('edit', settingSource + '\nLater source edit.');
    await pick('Yellow');
    assert.equal((await insertResult()).status, 'stale');
    assert.equal((await snapshot()).text, settingSource + '\nLater source edit.');
    await request('start-insert', undefined, { start: settingSource.indexOf('status:') });
    await pick('Component settings');
    await until(async () => await workbench("document.querySelector('.quick-input-widget')?.innerText.includes('Format')"));
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    assert.equal((await insertResult()).status, 'cancelled');

    const styleSource = 'Style probe\n\n```typeout\n@format yaml\n@sound none\n@border none\n@fill none\n\nstatus: observing\n```';
    await request('edit', styleSource);
    await until(async () => (await inspectConverted("doc.querySelector('#beat')?.textContent"))?.includes('Style probe'));
    await inspectConverted("doc.getElementById('play').click()");
    await until(async () => await inspectConverted("Boolean(doc.querySelector('.typeout-border-none.typeout-fill-none'))"));
    const noPanel = await inspectConverted("(() => { const el=doc.querySelector('.typeout-surface'); const pre=el.querySelector('pre'); return {border:doc.defaultView.getComputedStyle(el).borderTopWidth,fill:doc.defaultView.getComputedStyle(el).backgroundColor,preFill:doc.defaultView.getComputedStyle(pre).backgroundColor}; })()");
    assert.deepEqual(noPanel, { border: '0px', fill: 'rgba(0, 0, 0, 0)', preFill: 'rgba(0, 0, 0, 0)' });
    const colouredSource = styleSource.replace('@border none', '@border grey').replace('@fill none', '@fill yellow');
    await request('edit', colouredSource);
    await until(async () => (await inspectConverted("doc.getElementById('status')?.textContent"))?.includes('· ready'));
    await inspectConverted("doc.getElementById('play').click()");
    await until(async () => await inspectConverted("Boolean(doc.querySelector('.typeout-border-grey.typeout-fill-yellow'))"));
    const styleEvidence = {};
    for (const [theme, klass] of [['Light Modern', 'vscode-light'], ['Dark Modern', 'vscode-dark'], ['Default High Contrast', 'vscode-high-contrast'], ['Default High Contrast Light', 'vscode-high-contrast-light']]) {
      await request('set-theme', undefined, { theme });
      await until(async () => await inspectConverted(`doc.body.classList.contains(${JSON.stringify(klass)})`));
      styleEvidence[theme] = await inspectConverted("(() => { const el=doc.querySelector('.typeout-surface'); const pre=el.querySelector('pre'); const style=doc.defaultView.getComputedStyle(el); const preStyle=doc.defaultView.getComputedStyle(pre); return {border:style.borderTopWidth,fill:style.backgroundColor,text:preStyle.color,preFill:preStyle.backgroundColor}; })()");
      assert.ok(parseFloat(styleEvidence[theme].border) > 0);
      assert.notEqual(styleEvidence[theme].fill, styleEvidence[theme].text);
      assert.equal(styleEvidence[theme].fill, styleEvidence[theme].preFill);
    }
    await request('set-theme', undefined, { theme: 'Dark Modern' });
    const greySource = colouredSource.replace('@fill yellow', '@fill grey');
    await request('edit', greySource);
    await until(async () => (await inspectConverted("doc.getElementById('status')?.textContent"))?.includes('· ready'));
    await inspectConverted("doc.getElementById('play').click()");
    await until(async () => await inspectConverted("Boolean(doc.querySelector('.typeout-fill-grey'))"));
    styleEvidence.grey = {};
    for (const [theme, klass] of [['Light Modern', 'vscode-light'], ['Dark Modern', 'vscode-dark'], ['Default High Contrast', 'vscode-high-contrast']]) {
      await request('set-theme', undefined, { theme });
      await until(async () => await inspectConverted(`doc.body.classList.contains(${JSON.stringify(klass)})`));
      styleEvidence.grey[theme] = await inspectConverted("(() => { const el=doc.querySelector('.typeout-surface'); const pre=el.querySelector('pre'); const style=doc.defaultView.getComputedStyle(el); return {fill:style.backgroundColor,text:doc.defaultView.getComputedStyle(pre).color}; })()");
      assert.notEqual(styleEvidence.grey[theme].fill, styleEvidence.grey[theme].text);
      assert.notEqual(styleEvidence.grey[theme].fill, 'rgba(0, 0, 0, 0)');
    }
    await request('set-theme', undefined, { theme: 'Dark Modern' });
    await fs.writeFile(path.join(directory, 'typeout-style.json'), JSON.stringify({ noPanel, styleEvidence }, null, 2));

    await request('edit', 'Before\n\nAfter');
    await request('start-insert', undefined, { start: 8 }); await pick('Responding');
    assert.equal((await insertResult()).status, 'refused'); assert.equal((await snapshot()).text, 'Before\n\nAfter');
    await request('start-insert', undefined, { start: 0, end: 6 }); await pick('Chat block');
    assert.equal((await insertResult()).status, 'refused'); assert.equal((await snapshot()).text, 'Before\n\nAfter');
    await request('start-insert', undefined, { start: 0, end: 6, wrap: true });
    assert.equal((await insertResult()).status, 'inserted');
    assert.ok((await snapshot()).text.startsWith('```chat\nBefore\n```'));
    await request('undo'); assert.equal((await snapshot()).text, 'Before\n\nAfter');

    const chatHeader = '```chat\n# Test\n@viewer Ari\n\nAri: Hello\nBo: Yes\n```';
    for (const [label, expected] of [['Ticks', '@ticks'], ['Responding', '@responding'], ['Pause', '@pause 800ms']]) {
      await request('edit', chatHeader); await request('start-insert', undefined, { start: chatHeader.indexOf('\n\n') + 1 }); await pick(label);
      assert.equal((await insertResult()).status, 'inserted');
      assert.ok((await snapshot()).text.includes(expected));
      await request('undo'); assert.equal((await snapshot()).text, chatHeader);
    }
    await request('start-insert', undefined, { start: chatHeader.indexOf('\n\n') + 1 }); await pick('Chat block');
    assert.equal((await insertResult()).status, 'refused'); assert.equal((await snapshot()).text, chatHeader);
    await request('start-insert', undefined, { start: 0 });
    await request('edit', chatHeader + '\nLater edit.'); await pick('Chat block');
    assert.equal((await insertResult()).status, 'stale');
    assert.equal((await snapshot()).text, chatHeader + '\nLater edit.');
    await request('start-insert', undefined, { start: 0 });
    await until(async () => await workbench("document.querySelector('.quick-input-widget')?.innerText.includes('Wrap Selection as Chat')"));
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    assert.equal((await insertResult()).status, 'cancelled');
    assert.equal((await snapshot()).text, chatHeader + '\nLater edit.');
    // Exercise both picker levels, replacement, single Undo and outside-chat refusal.
    await request('edit', chatHeader);
    await request('start-insert', undefined, { start: chatHeader.indexOf('Ari: Hello') });
    await pick('Pace'); await pick('Brisk');
    assert.equal((await insertResult()).status, 'inserted');
    const briskSource = (await snapshot()).text;
    assert.ok(briskSource.includes('```chat\n@pace brisk\n'));
    await request('start-insert', undefined, { start: briskSource.indexOf('Bo: Yes') });
    await pick('Pace'); await pick('Deliberate');
    assert.equal((await insertResult()).status, 'inserted');
    assert.equal((await snapshot()).text, briskSource.replace('@pace brisk', '@pace deliberate'));
    await request('undo'); assert.equal((await snapshot()).text, briskSource);
    await request('undo'); assert.equal((await snapshot()).text, chatHeader);
    await request('start-insert', undefined, { start: 0 }); await pick('Pace'); await pick('Normal');
    assert.equal((await insertResult()).status, 'refused');
    assert.equal((await snapshot()).text, chatHeader);
    // Real webview playback: responding occupies the scaled wait itself, not another phase.
    const paceEvidence = [];
    for (const [pace, expected] of [['normal', 800], ['brisk', 560], ['deliberate', 1040]]) {
      await request('edit', `Pace probe ${pace}\n\n\`\`\`chat\n@pace ${pace}\n@viewer Ari\n@responding\nBo: Hi\n@pause 300ms\n@delay 1200ms\nBo: Yes\n\`\`\``);
      await until(async () => (await inspectConverted("doc.querySelector('#beat')?.textContent"))?.includes(`Pace probe ${pace}`));
      await inspectConverted("doc.getElementById('play').click()");
      const began = Date.now();
      assert.equal(await inspectConverted("doc.querySelector('.responding')?.textContent"), 'Bo is responding…');
      await until(async () => await inspectConverted("doc.querySelectorAll('.chat li').length") === 1);
      const first = Date.now() - began;
      // CDP connection setup and an overloaded desktop can delay observation.
      // The injected-clock tests assert exact waits; this only checks temporal order.
      assert.ok(first >= expected - 100 && first < expected + 1500, `${pace}: first message ${first}ms`);
      await until(async () => await inspectConverted("doc.querySelectorAll('.chat li').length") === 2);
      const complete = Date.now() - began;
      // IPC/polling can delay observation; the injected scheduler tests exact totals.
      assert.ok(complete >= first + 1100 && complete < first + 4000, `${pace}: ${first}ms → ${complete}ms`);
      paceEvidence.push({ pace, expectedFirstMs: expected, observedFirstMs: first, observedCompleteMs: complete });
    }
    await fs.writeFile(path.join(directory, 'pace-temporal.json'), JSON.stringify(paceEvidence, null, 2));
    const imageSource = 'Harbour image probe\n\n@delay 900ms\n\n![Wide harbour](assets/harbour-landscape.webp)\n\n*Caption: The harbour wall.*\n\n@pause 600ms\n\n```chat\nA: Hi\n```';
    await request('edit', imageSource);
    await until(async () => (await inspectConverted("doc.querySelector('#beat')?.textContent"))?.includes('Harbour image probe'));
    assert.equal(await inspectConverted("doc.querySelectorAll('.story-figure').length"), 0);
    assert.equal(await inspectConverted("doc.getElementById('warnings').textContent"), '');
    await inspectConverted("doc.getElementById('play').click()");
    await sleep(300);
    assert.equal(await inspectConverted("doc.querySelectorAll('.story-figure').length"), 0);
    await until(async () => await inspectConverted("doc.querySelectorAll('.story-figure img').length") === 1);
    assert.equal(await inspectConverted("doc.querySelector('.story-figure img').naturalWidth"), 720);
    assert.equal(await inspectConverted("doc.querySelector('.story-figure img').alt"), 'Wide harbour');
    assert.equal(await inspectConverted("doc.querySelector('figcaption').textContent"), 'The harbour wall.');
    assert.equal(await inspectConverted("doc.querySelectorAll('.chat li').length"), 0);
    await until(async () => await inspectConverted("doc.querySelectorAll('.chat li').length") === 1);
    await inspectConverted("doc.documentElement.style.width = '320px'");
    const narrow = await inspectConverted("(() => { const area=doc.getElementById('beat'), image=doc.querySelector('.story-figure img'); return {area:area.clientWidth, overflow:area.scrollWidth-area.clientWidth, image:image.getBoundingClientRect().width, right:image.getBoundingClientRect().right-area.getBoundingClientRect().right}; })()");
    assert.ok(narrow.area <= 320 && narrow.overflow <= 1 && narrow.right <= 1, JSON.stringify(narrow));
    await inspectConverted("doc.getElementById('replay').click()");
    assert.equal(await inspectConverted("doc.querySelectorAll('.story-figure').length"), 0);
    await until(async () => await inspectConverted("doc.querySelectorAll('.story-figure img').length") === 1);
    await inspectConverted("doc.documentElement.style.width = ''");
    const portraitSource = 'Portrait probe\n\n![Tall tower](assets/harbour-portrait.png)\n\n*Caption: The landing.*\n\nA small print ![Harbour detail](assets/harbour-detail.jpg) remained nearby.';
    await request('edit', portraitSource);
    await until(async () => (await inspectConverted("doc.querySelector('#beat')?.textContent"))?.includes('Portrait probe'));
    assert.equal(await inspectConverted("doc.querySelector('.story-figure img')?.naturalHeight"), 560);
    assert.equal(await inspectConverted("doc.querySelector('.story-inline-image')?.naturalWidth"), 360);
    assert.equal(await inspectConverted("doc.querySelectorAll('.prose').length"), 2);
    await sleep(2200);
    assert.equal(await inspectConverted("doc.querySelectorAll('.chat li').length"), 0); // No callback from the abandoned image beat.
    const brokenSource = 'Broken image probe\n\n![Missing harbour](assets/missing.png)\n\n```chat\nA: Continue.\n```';
    await request('edit', brokenSource);
    await until(async () => (await inspectConverted("doc.querySelector('#beat')?.textContent"))?.includes('Broken image probe'));
    assert.ok((await inspectConverted("doc.querySelector('.image-placeholder')?.textContent")).includes('Missing harbour'));
    assert.ok((await inspectConverted("doc.getElementById('warnings').textContent")).includes('missing or unreadable'));
    await inspectConverted("doc.getElementById('play').click()");
    await until(async () => await inspectConverted("doc.querySelectorAll('.chat li').length") === 1);
    await request('edit', 'Stale image probe\n\n![Old](assets/harbour-portrait.png)');
    await request('edit', 'Latest image probe\n\nPlain prose only.');
    await until(async () => (await inspectConverted("doc.querySelector('#beat')?.textContent"))?.includes('Latest image probe'));
    assert.equal(await inspectConverted("doc.querySelectorAll('img').length"), 0);
    console.log(`PASS: actual VS Code ${vsix ? 'installed VSIX in a disposable profile' : 'Extension Development Host'} — callout diff/review/stale Apply/Undo and converted type-out playback, plus accepted preview/authoring regressions.`);
    console.log(`Isolated test profile/log: ${directory}`);
    await fs.writeFile(path.join(directory, 'request.json'), JSON.stringify({ id: ++id, action: 'stop' }));
  } finally {
    if (socket) socket.close();
    code.kill('SIGTERM');
    await log.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
