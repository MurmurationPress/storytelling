'use strict';
// Normal installed VS Code, deliberately WITHOUT extensionTestsPath: that mode
// refuses modal dialogs. Only this disposable profile uses the simple picker
// and disables Workspace Trust (as the existing host runner does). Trust UI and
// the operating-system picker are not verified by this test.
const {spawn,execFileSync}=require('node:child_process');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),net=require('node:net');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
async function sourceHashes(root){const result={};async function walk(dir){for(const item of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory())await walk(file);else result[path.relative(root,file)]=crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex');}}await walk(root);return result;}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,timeout=30000){const end=Date.now()+timeout;let last;while(Date.now()<end){try{const value=await fn();if(value)return value;}catch(error){last=error;}await sleep(100);}throw last||Error('Native UI timeout');}
(async()=>{
 const vsix=path.resolve(process.argv[2]);const dir=await fs.mkdtemp(path.join(os.tmpdir(),'story-installed-export-'));
 const root=path.join(dir,'project');
 const source=path.join(dir,'source');await require('./import-repair-fixture.cjs').createFixture(source,{asset:process.env.STORY_TELLER_PRIVATE_PNG});
 await fs.cp(path.join(__dirname,'../samples/web-project'),root,{recursive:true});
 await fs.mkdir(path.join(dir,'profile/User'),{recursive:true});
 await fs.writeFile(path.join(dir,'profile/User/settings.json'),JSON.stringify({'files.simpleDialog.enable':true,'window.dialogStyle':'custom','workbench.startupEditor':'none'}));
 const log=await fs.open(path.join(dir,'code.log'),'w');
 const common=[`--user-data-dir=${path.join(dir,'profile')}`,`--extensions-dir=${path.join(dir,'extensions')}`];
 if(process.env.STORY_TELLER_DEVELOPMENT!=='1')execFileSync('/usr/bin/code',[...common,'--install-extension',vsix,'--force'],{stdio:['ignore',log.fd,log.fd]});
 const server=net.createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;await new Promise(r=>server.close(r));
 const code=spawn('/usr/share/code/code',[...common,`--remote-debugging-port=${port}`,'--skip-welcome','--skip-release-notes','--disable-updates','--disable-telemetry','--disable-workspace-trust','--new-window',...(process.env.STORY_TELLER_DEVELOPMENT==='1'?[`--extensionDevelopmentPath=${path.resolve(__dirname,'..')}`]:[]),root],{stdio:['ignore',log.fd,log.fd]});
 let socket,inspect,send;
 try{
  const page=await until(async()=>{try{return (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t=>t.type==='page');}catch{return false;}});
  socket=new WebSocket(page.webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});
  let id=0;const pending=new Map();socket.onmessage=event=>{const message=JSON.parse(event.data),call=pending.get(message.id);if(call){pending.delete(message.id);message.error?call.reject(Error(JSON.stringify(message.error))):call.resolve(message.result);}};
  send=(method,params={})=>new Promise((resolve,reject)=>{const request=++id,timer=setTimeout(()=>{pending.delete(request);reject(Error(`Native ${method} timeout`));},15000);pending.set(request,{resolve:v=>{clearTimeout(timer);resolve(v);},reject:e=>{clearTimeout(timer);reject(e);}});socket.send(JSON.stringify({id:request,method,params}));});
  inspect=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  const key=async(name)=>{for(const type of ['keyDown','keyUp'])await send('Input.dispatchKeyEvent',{type,key:name,code:name,windowsVirtualKeyCode:13,nativeVirtualKeyCode:13,...(type==='keyDown'?{text:'\r'}:{})});};
  await until(()=>inspect("Boolean(document.querySelector('.monaco-workbench'))"));await send('Page.bringToFront');
  await until(async()=>{for(const folder of await fs.readdir(path.join(dir,'profile/logs')))try{const text=await fs.readFile(path.join(dir,'profile/logs',folder,'window1/exthost/exthost.log'),'utf8');if(text.includes('murmurationpress.story-teller')&&text.includes('Eager extensions activated'))return true;}catch{}return false;});
  async function command(name) {
    for(const type of ['keyDown','keyUp'])await send('Input.dispatchKeyEvent',{type,key:'P',code:'KeyP',modifiers:10,windowsVirtualKeyCode:80,nativeVirtualKeyCode:80});
    await until(()=>inspect("Boolean(document.querySelector('.quick-input-widget input')?.checkVisibility())"));
    await click("document.querySelector('.quick-input-widget input')");
    await send('Input.insertText',{text:name});await until(()=>inspect(`document.querySelector('.quick-input-list .monaco-list-row.focused')?.innerText.includes(${JSON.stringify(name.replace('Story Teller: ',''))})`));
    await click("document.querySelector('.quick-input-widget input')");
    await until(()=>inspect("document.querySelector('.quick-input-widget input')?.checkVisibility() && document.activeElement===document.querySelector('.quick-input-widget input')"));
    await fs.writeFile(path.join(dir,'command-selection.json'),JSON.stringify(await inspect("({focus:document.activeElement?.outerHTML,selected:document.querySelector('.quick-input-list .monaco-list-row.focused')?.innerText,value:document.querySelector('.quick-input-widget input')?.value})")));
    await key('Enter');
  }
  const click=async selector=>{const point=await inspect(`(()=>{const b=${selector};if(!b)return null;const r=b.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};})()`);assert.ok(point);for(const type of ['mousePressed','mouseReleased'])await send('Input.dispatchMouseEvent',{type,...point,button:'left',clickCount:1});};
  async function input(text) {await inspect("(()=>{const i=document.querySelector('.quick-input-widget input');i.focus();i.select();})()");await send('Input.insertText',{text});await sleep(250);}
  async function acceptOrder() {
    await until(()=>inspect("document.querySelector('.quick-input-widget input')?.checkVisibility() && document.querySelector('.quick-input-widget')?.innerText.includes('Choose the frontmatter order key') && document.querySelector('.quick-input-list .monaco-list-row.focused')?.innerText.includes('manuscript_order_key')"));
    await click("document.querySelector('.quick-input-widget input')");await key('Enter');
  }
  const sourceBefore=await sourceHashes(source);
  await command('Story Teller: Import Markdown Manuscript');
  await until(()=>inspect("document.querySelector('.quick-input-widget')?.innerText.includes('Select manuscript book folder')"));
  await until(()=>inspect("(()=>{const i=document.querySelector('.quick-input-widget input');return i?.placeholder==='Folder path' && i.value.startsWith('/') && i.value.endsWith('/');})()"));
  await until(()=>inspect(`document.querySelector('.quick-input-widget input')?.value===${JSON.stringify(root+'/')}`));
  await input(path.join(source,'Books/Lantern')+'/');
  await until(()=>inspect("document.querySelector('.quick-input-list')?.innerText.includes('First') && document.querySelector('.quick-input-list')?.innerText.includes('Second')"));await key('Enter');
  // Some folder entries navigate; others accept directly. Never let a blind
  // second Enter accept the following order/name prompt.
  await sleep(300);if(await inspect("document.querySelector('.quick-input-widget input')?.checkVisibility() && document.querySelector('.quick-input-widget')?.innerText.includes('Select manuscript book folder')"))await key('Enter');
  await acceptOrder();
  await until(()=>inspect("document.querySelector('.monaco-dialog-box')?.innerText.includes('cannot be safely resolved')"));
  await click("[...document.querySelectorAll('.monaco-dialog-box [role=button],.monaco-dialog-box button')].find(b=>b.textContent.trim()==='Review Blockers')");
  async function connectReview() {
    const target=await until(async()=>(await(await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t=>t.type==='iframe'&&t.url.includes('murmurationpress.story-teller')));
    const socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});
    let id=0;const evaluate=expression=>new Promise((resolve,reject)=>{const request=++id,timer=setTimeout(()=>reject(Error('Review inspector timeout')),15000);socket.onmessage=event=>{const r=JSON.parse(event.data);if(r.id===request){clearTimeout(timer);r.error?reject(Error(JSON.stringify(r.error))):resolve(r.result?.result?.value);}};socket.send(JSON.stringify({id:request,method:'Runtime.evaluate',params:{expression:`(()=>{const doc=document.getElementById('active-frame')?.contentDocument;return (${expression});})()`,returnByValue:true}}));});
    await until(()=>evaluate('doc?.body.innerText.includes("Review manuscript import")'));return{evaluate,close:()=>socket.close()};
  }
  let review=await connectReview();
  const blocked=await review.evaluate('({disabled:doc.getElementById("continue").disabled,reasons:doc.getElementById("import-blockers").textContent,body:doc.body.innerText,visible:doc.getElementById("continue").getBoundingClientRect().bottom<=doc.documentElement.clientHeight})');
  assert.equal(blocked.disabled,true);assert.match(blocked.reasons,/Shared graph.png/);assert.match(blocked.reasons,/Child.md:/);assert.equal(blocked.visible,true);assert.match(blocked.body,/Warnings \(non-blocking\)/);
  await review.evaluate('doc.getElementById("back").click()');review.close();
  await acceptOrder();
  await until(()=>inspect("document.querySelector('.monaco-dialog-box')?.innerText.includes('cannot be safely resolved')"));
  await click("[...document.querySelectorAll('.monaco-dialog-box [role=button],.monaco-dialog-box button')].find(b=>b.textContent.trim()==='Select Asset Root')");
  await until(()=>inspect("document.querySelector('.quick-input-widget')?.innerText.includes('Select asset root')"));
  await until(()=>inspect("(()=>{const i=document.querySelector('.quick-input-widget input');return i?.placeholder==='Folder path'&&i.value.startsWith('/')&&i.value.endsWith('/');})()"));
  await input(source+'/');await key('Enter');await sleep(300);
  if(await inspect("document.querySelector('.quick-input-widget input')?.checkVisibility()&&document.querySelector('.quick-input-widget')?.innerText.includes('Select asset root')"))await key('Enter');
  review=await connectReview();const ready=await review.evaluate('({disabled:doc.getElementById("continue").disabled,reasons:doc.getElementById("import-blockers").textContent,body:doc.body.innerText})');assert.equal(ready.disabled,false);assert.match(ready.reasons,/Ready to continue/);
  const labels=['1 Before','1.1 Child','2 Between','2.1 Last','3 After'];let previous=-1;
  for(const label of labels){const at=ready.body.indexOf(label);assert.ok(at>previous,`${label}: ${ready.body}`);previous=at;}
  await review.evaluate('doc.getElementById("continue").click()');review.close();
  await until(()=>inspect("document.querySelector('.quick-input-widget')?.innerText.includes('Choose destination parent folder')"));
  await until(()=>inspect("(()=>{const i=document.querySelector('.quick-input-widget input');return i?.placeholder==='Folder path' && i.value.startsWith('/') && i.value.endsWith('/');})()"));
  await input(dir+'/');await key('Enter');await sleep(300);
  if(await inspect("document.querySelector('.quick-input-widget input')?.checkVisibility() && document.querySelector('.quick-input-widget')?.innerText.includes('Choose destination parent folder')"))await key('Enter');
  await until(()=>inspect("document.querySelector('.quick-input-widget')?.innerText.includes('New Story Teller project folder')"));
  await until(()=>inspect("document.querySelector('.quick-input-widget input')?.checkVisibility() && document.querySelector('.quick-input-widget input').value==='Story Teller - Fictional import repairs'"));
  await input('Imported repairs');await key('Enter');
  await until(()=>inspect("document.querySelector('.monaco-dialog-box')?.innerText.includes('Source files remain unchanged')"));
  await click("[...document.querySelectorAll('.monaco-dialog-box button,.monaco-dialog-box [role=button]')].find(b=>b.textContent.trim()==='Import')");
  const imported=path.join(dir,'Imported repairs');
  await until(async()=>{try{await fs.access(path.join(imported,'story-teller.project.json'));return true;}catch{return false;}});
  const manifest=JSON.parse(await fs.readFile(path.join(imported,'story-teller.project.json'),'utf8'));
  const importer=require('../src/manuscript-import.cjs');
  assert.deepEqual(importer.orderedScenes(manifest).map(s=>s.title),['Before','Child','Between','Last','After']);assert.equal(manifest.parts.length,2);
  const child=manifest.scenes.find(scene=>scene.title==='Child'),text=await fs.readFile(path.join(imported,child.file),'utf8');assert.ok(require('../src/scene-heading.cjs').hasSceneHeading(text,child.title));assert.match(text,/> !\[A fictional chart\.\]\(\.\.\/assets\/Shared%20graph-/);
  const assets=await fs.readdir(path.join(imported,'assets'));assert.equal(assets.length,1);assert.deepEqual(await fs.readFile(path.join(imported,'assets',assets[0])),await fs.readFile(path.join(source,'Media/Charts/Shared graph.png')));
  assert.deepEqual(await sourceHashes(source),sourceBefore);
  const evidence={mode:process.env.STORY_TELLER_DEVELOPMENT==='1'?'real Extension Development Host, no extensionTestsPath':'normal installed VSIX',vsCode:JSON.parse(await fs.readFile('/usr/share/code/resources/app/package.json','utf8')).version,sourcePreserved:true,workspaceTrust:'disabled only in disposable test profile; VS Code simple picker',blockedReview:{disabled:blocked.disabled,footerExplainsPNG:blocked.reasons.includes('Shared graph.png'),controlsVisible:blocked.visible},correctedReview:{disabled:ready.disabled,unsupportedWarningsNonBlocking:true},orderedTitles:importer.orderedScenes(manifest).map(s=>s.title),partCount:manifest.parts.length,PNGBytesPreserved:true,headingPreserved:true,imported,privateAssetUsed:Boolean(process.env.STORY_TELLER_PRIVATE_PNG)};
  await fs.writeFile(path.join(dir,'repairs-evidence.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence,null,2));
 }catch(error){if(inspect)await fs.writeFile(path.join(dir,'failure.json'),JSON.stringify(await inspect("({body:document.body.innerText,focus:document.activeElement?.outerHTML,widgets:[...document.querySelectorAll('.quick-input-widget')].map(e=>({html:e.outerHTML.slice(0,200),visible:e.checkVisibility(),rect:e.getBoundingClientRect().toJSON()})),inputs:[...document.querySelectorAll('input')].map(i=>({value:i.value,placeholder:i.placeholder}))})").catch(e=>({captureError:e.message}))));console.error(`Failure profile: ${dir}`);throw error;}
 finally{socket?.close();code.kill('SIGTERM');await log.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
