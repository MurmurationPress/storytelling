'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {spawn}=require('node:child_process');
const {exportWeb}=require('../src/web-export.cjs');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'chat-web-')),root=path.join(dir,'project'),out=path.join(dir,'export');
 await require('./chat-link-fixture.cjs').create(root);await exportWeb(root,out);
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
  await send('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/`});
  for(let i=0;i<100;i++){if(await evaluate("doc.getElementById('beat')?.textContent.includes('Synthetic chat link probe') && doc.getElementById('status')?.textContent.includes('ready')"))break;await sleep(100);}
  await evaluate("doc.getElementById('play').click()");
  const checks=await require('./chat-link-probe.cjs')({evaluate,wait:sleep,key:async(key,virtual,text)=>{for(const type of ['keyDown','keyUp'])await send('Input.dispatchKeyEvent',{type,key,code:key,windowsVirtualKeyCode:virtual,...(text&&type==='keyDown'?{text}:{})});},hover:async selector=>{const point=await evaluate(`(()=>{const r=doc.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return{x:r.x+5,y:r.y+5};})()`);await send('Input.dispatchMouseEvent',{type:'mouseMoved',...point});}});
  const result={mode:'fresh standalone HTTP export, headless Chrome on Linux',checks,unverified:['human hands-on review','iPad/Safari','touch','other operating systems']};
  await fs.writeFile(path.join(dir,'chat-links.json'),JSON.stringify(result,null,2));console.log('PASS standalone chat links: '+dir);
 }finally{socket?.close();chrome.kill();server.close();await log.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
