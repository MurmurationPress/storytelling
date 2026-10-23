'use strict';
// Normal installed VS Code, deliberately WITHOUT extensionTestsPath: that mode
// refuses modal dialogs. Only this disposable profile uses the simple picker.
const {spawn,execFileSync}=require('node:child_process');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),net=require('node:net');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
async function sourceHashes(root){const result={};async function walk(dir){for(const item of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory())await walk(file);else result[path.relative(root,file)]=crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex');}}await walk(root);return result;}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,timeout=30000){const end=Date.now()+timeout;let last;while(Date.now()<end){try{const value=await fn();if(value)return value;}catch(error){last=error;}await sleep(100);}throw last||Error('Native UI timeout');}
(async()=>{
 const vsix=path.resolve(process.argv[2]);const dir=await fs.mkdtemp(path.join(os.tmpdir(),'story-installed-export-'));
 const root=path.join(dir,'project'),destination=path.join(dir,'web-reader');
 await fs.cp(path.join(__dirname,'../samples/web-project'),root,{recursive:true});
 const originalSources=await sourceHashes(root);
 await fs.mkdir(path.join(dir,'profile/User'),{recursive:true});
 await fs.writeFile(path.join(dir,'profile/User/settings.json'),JSON.stringify({'files.simpleDialog.enable':true,'window.dialogStyle':'custom','workbench.startupEditor':'none'}));
 const log=await fs.open(path.join(dir,'code.log'),'w');
 const common=[`--user-data-dir=${path.join(dir,'profile')}`,`--extensions-dir=${path.join(dir,'extensions')}`];
 execFileSync('/usr/bin/code',[...common,'--install-extension',vsix,'--force'],{stdio:['ignore',log.fd,log.fd]});
 const server=net.createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;await new Promise(r=>server.close(r));
 const code=spawn('/usr/share/code/code',[...common,`--remote-debugging-port=${port}`,'--skip-welcome','--skip-release-notes','--disable-updates','--disable-telemetry','--new-window',root],{stdio:['ignore',log.fd,log.fd]});
 let socket,inspect,send;
 try{
  const page=await until(async()=>{try{return (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t=>t.type==='page');}catch{return false;}});
  socket=new WebSocket(page.webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});
  let id=0;const pending=new Map();socket.onmessage=event=>{const message=JSON.parse(event.data),call=pending.get(message.id);if(call){pending.delete(message.id);message.error?call.reject(Error(JSON.stringify(message.error))):call.resolve(message.result);}};
  send=(method,params={})=>new Promise((resolve,reject)=>{const request=++id,timer=setTimeout(()=>{pending.delete(request);reject(Error(`Native ${method} timeout`));},15000);pending.set(request,{resolve:v=>{clearTimeout(timer);resolve(v);},reject:e=>{clearTimeout(timer);reject(e);}});socket.send(JSON.stringify({id:request,method,params}));});
  inspect=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  const key=async(name,modifiers=0)=>{for(const type of ['keyDown','keyUp'])await send('Input.dispatchKeyEvent',{type,key:name,code:name==='Enter'?'Enter':`Key${name.toUpperCase()}`,modifiers,windowsVirtualKeyCode:name==='Enter'?13:name.toUpperCase().charCodeAt(0),nativeVirtualKeyCode:name==='Enter'?13:name.toUpperCase().charCodeAt(0),...(name==='Enter'&&type==='keyDown'?{text:'\r'}:{})});};
  await until(()=>inspect("Boolean(document.querySelector('.monaco-workbench'))"));await send('Page.bringToFront');
  // The command palette snapshots contributions when opened. Workbench DOM
  // readiness precedes extension registration in a fresh normal installation.
  let trustPromptHandled=false,trustManageOpened=false;
  await until(async()=>{
    if(!trustManageOpened && await inspect("document.body.innerText.includes('Restricted Mode')")) {
      const point=await inspect("(()=>{const node=[...document.querySelectorAll('*')].find(n=>n.children.length===0&&n.textContent==='Manage'&&n.getBoundingClientRect().width>0);if(!node)return null;const r=node.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};})()");
      if(point){for(const type of ['mousePressed','mouseReleased'])await send('Input.dispatchMouseEvent',{type,...point,button:'left',clickCount:1});trustManageOpened=true;}
    }
    const trustWindow=await inspect("(()=>{const b=[...document.querySelectorAll('button,[role=button],a.monaco-button')].find(n=>n.textContent.trim()==='Trust'&&n.getBoundingClientRect().width>0);if(!b)return null;const r=b.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};})()");
    if(trustWindow){for(const type of ['mousePressed','mouseReleased'])await send('Input.dispatchMouseEvent',{type,...trustWindow,button:'left',clickCount:1});trustPromptHandled=true;}
    const trust=await inspect("(()=>{const button=[...document.querySelectorAll('.monaco-dialog-box button,.monaco-dialog-box [role=button]')].find(b=>/yes.*trust.*authors/i.test(b.textContent));if(!button)return null;const r=button.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};})()");
    if(trust){for(const type of ['mousePressed','mouseReleased'])await send('Input.dispatchMouseEvent',{type,...trust,button:'left',clickCount:1});trustPromptHandled=true;}
    const folders=await fs.readdir(path.join(dir,'profile/logs'));
    for(const folder of folders)try{const text=await fs.readFile(path.join(dir,'profile/logs',folder,'window1/exthost/exthost.log'),'utf8');if(text.includes('murmurationpress.story-teller')&&text.includes('Eager extensions activated'))return true;}catch{}
    return false;
  });
  await key('P',10); // CDP: Control=2, Shift=8 (Meta is 4).
  await until(()=>inspect("Boolean(document.querySelector('.quick-input-widget input')?.checkVisibility())"));
  await send('Input.insertText',{text:'Story Teller: Export Web Reader'});
  await until(()=>inspect("document.querySelector('.quick-input-widget')?.innerText.includes('Export Web Reader')"));await key('Enter');
  await until(()=>inspect("document.querySelector('.quick-input-widget')?.innerText.includes('Choose a NEW web reader folder')"));
  await until(async()=>await inspect("document.querySelector('.quick-input-widget input').value")===path.join(dir,'project-web'));
  await inspect("(()=>{const input=document.querySelector('.quick-input-widget input');input.focus();input.select();})()");
  await send('Input.insertText',{text:destination});assert.equal(await inspect("document.querySelector('.quick-input-widget input').value"),destination);await sleep(250);await key('Enter');
  await until(()=>inspect("[...document.querySelectorAll('.monaco-dialog-box')].some(d=>d.textContent.includes('Export saved scenes'))"));
  const confirmation=await inspect("[...document.querySelectorAll('.monaco-dialog-box')].find(d=>d.textContent.includes('Export saved scenes')).innerText");
  const shot=await send('Page.captureScreenshot');await fs.writeFile(path.join(dir,'confirmation.png'),Buffer.from(shot.data,'base64'));
  const point=await inspect("(()=>{const b=[...document.querySelectorAll('.monaco-dialog-box button, .monaco-dialog-box [role=button]')].find(b=>b.textContent.trim()==='Export'),r=b.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};})()");
  for(const type of ['mousePressed','mouseReleased'])await send('Input.dispatchMouseEvent',{type,...point,button:'left',clickCount:1});
  await until(async()=>{try{return JSON.parse(await fs.readFile(path.join(destination,'publication.json'),'utf8'));}catch{return false;}});
  await until(()=>inspect("[...document.querySelectorAll('.monaco-dialog-box')].some(d=>d.textContent.includes('Exported 3 scenes'))"));
  await key('Enter');const book=JSON.parse(await fs.readFile(path.join(destination,'publication.json'),'utf8'));
  assert.deepEqual(book.scenes.map(s=>s.label),['1.1','1.2','2.1']);assert.ok(!(await fs.readFile(path.join(destination,'reader.js'),'utf8')).includes('acquireVsCodeApi'));
  const version=JSON.parse(await fs.readFile('/usr/share/code/resources/app/package.json','utf8')).version;
  assert.deepEqual(await sourceHashes(root),originalSources,'saved adaptation files must remain unchanged');
  const result={vsCode:version,sourcePreserved:true,workspaceTrustPromptHandled:trustPromptHandled,mode:'normal installed VSIX; no development/test extension flags',picker:'VS Code simple file picker in disposable profile',confirmationObserved:confirmation,exportedLabels:book.scenes.map(s=>s.label),destination};
  await fs.writeFile(path.join(dir,'evidence.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
 }catch(error){if(inspect)await fs.writeFile(path.join(dir,'failure.json'),JSON.stringify(await inspect("({body:document.body.innerText,inputs:[...document.querySelectorAll('input')].map(i=>({value:i.value,placeholder:i.placeholder}))})").catch(e=>({captureError:e.message}))));console.error(`Failure profile: ${dir}`);throw error;}
 finally{socket?.close();code.kill('SIGTERM');await log.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
