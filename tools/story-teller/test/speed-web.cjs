'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {spawn}=require('node:child_process');
const {exportWeb}=require('../src/web-export.cjs');
const assert=require('node:assert/strict');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'speed-web-')),root=path.join(dir,'project'),out=path.join(dir,'export');
 await require('./speed-fixture.cjs').create(root);await exportWeb(root,out);
 const server=http.createServer(async(req,res)=>{try{const file=path.join(out,req.url==='/'?'index.html':req.url);res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':'text/html');res.end(await fs.readFile(file));}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const log=await fs.open(path.join(dir,'chrome.log'),'w');
 const chrome=spawn('/usr/bin/google-chrome',['--headless','--no-sandbox',`--user-data-dir=${path.join(dir,'profile')}`,'--remote-debugging-port=0','about:blank'],{stdio:['ignore',log.fd,log.fd]});let socket;
 try{
  let port;for(let i=0;i<100;i++){try{port=(await fs.readFile(path.join(dir,'profile/DevToolsActivePort'),'utf8')).split('\n')[0];break;}catch{await sleep(100);}}
  const target=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t=>t.type==='page');
  socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>socket.onopen=r);
  let id=0;const pending=new Map();socket.onmessage=e=>{const m=JSON.parse(e.data);if(pending.has(m.id)){const {resolve,reject}=pending.get(m.id);pending.delete(m.id);m.error?reject(Error(JSON.stringify(m.error))):resolve(m.result);}};
  const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;const timer=setTimeout(()=>{pending.delete(n);reject(Error('CDP timeout: '+method));},15000);pending.set(n,{resolve:v=>{clearTimeout(timer);resolve(v);},reject:e=>{clearTimeout(timer);reject(e);}});socket.send(JSON.stringify({id:n,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression:`(()=>{const doc=document;return (${expression});})()`,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  await send('Page.enable',{});
  await send('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/`});
  for(let i=0;i<100;i++){if(await evaluate("doc.getElementById('beat')?.textContent.includes('First paragraph')"))break;await sleep(100);}
  const evidence=await require('./speed-probe.cjs')({evaluate,wait:sleep});
  await send('Page.reload');await sleep(1000);assert.equal(await evaluate("doc.getElementById('playback-speed').value"),'0.5');evidence.checks.push('browser preference survives reload');
  await send('Emulation.setDeviceMetricsOverride',{width:320,height:700,deviceScaleFactor:1,mobile:true});
  await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
  evidence.bounds=await evaluate("({width:doc.documentElement.clientWidth,overflow:doc.documentElement.scrollWidth-doc.documentElement.clientWidth,control:doc.getElementById('playback-speed').getBoundingClientRect().toJSON()})");assert.ok(evidence.bounds.overflow<=1);assert.ok(evidence.bounds.control.height>=44);
  await evaluate("doc.getElementById('playback-speed').focus()");await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowDown',code:'ArrowDown',windowsVirtualKeyCode:40});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowDown',code:'ArrowDown',windowsVirtualKeyCode:40});assert.equal(await evaluate("doc.getElementById('playback-speed').value"),'0.75');evidence.checks.push('native keyboard selection and 320px touch-emulated layout');

  await send('Page.addScriptToEvaluateOnNewDocument',{source:"localStorage.setItem(Object.keys(localStorage).find(k=>k.startsWith('story-teller:')),JSON.stringify({playbackSpeed:99}))"});await send('Page.reload');await sleep(800);assert.equal(await evaluate("doc.getElementById('playback-speed').value"),'1');
  await send('Page.addScriptToEvaluateOnNewDocument',{source:"Object.defineProperty(window,'localStorage',{get(){throw Error('storage unavailable')}})"});await send('Page.reload');await sleep(800);assert.equal(await evaluate("doc.getElementById('playback-speed').value"),'1');await evaluate("(()=>{const s=doc.getElementById('playback-speed');s.value='0.75';s.dispatchEvent(new Event('change'));doc.getElementById('play').click()})()");await sleep(1500);assert.equal(await evaluate("doc.getElementById('beat').textContent.includes('Second paragraph')"),true);evidence.checks.push('invalid and unavailable browser storage fall back safely; playback remains usable');
  await evaluate("doc.getElementById('next').click()");await sleep(200);await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await sleep(200);assert.equal(await evaluate("[...doc.querySelectorAll('.typeout-progress [data-story-segment]')].every(s=>s.dataset.complete==='true')"),true);assert.match(await evaluate("doc.getElementById('status').textContent"),/completed/);evidence.checks.push('dynamic reduced motion completes scaled annotation reveal');
  const shot=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(dir,'speed-narrow.png'),Buffer.from(shot.data,'base64'));
  const b=evidence.bounds.control;await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+10,y:b.y+10}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',windowsVirtualKeyCode:27});assert.equal(await evaluate("doc.activeElement.id"),'playback-speed');evidence.checks.push('emulated touch targets native select');
  const result={mode:'synthetic export over HTTP, headless Chrome Linux',...evidence,unverified:['actual touch device','iPad/Safari','human reading comfort','human audio listening']};
  await fs.writeFile(path.join(dir,'speed.json'),JSON.stringify(result,null,2));console.log('PASS standalone playback speed: '+dir);
 }finally{socket?.close();chrome.kill();server.close();await log.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
