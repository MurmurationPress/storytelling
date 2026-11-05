'use strict';
// Normal installed VSIX, disposable profile, actual workbench commands.
// Workspace Trust and the OS file picker are outside this test.
const {spawn,execFileSync}=require('node:child_process');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),net=require('node:net'),assert=require('node:assert/strict');
const r=require('../src/readable-project.cjs');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(fn,timeout=30000){const end=Date.now()+timeout;let last;while(Date.now()<end){try{const value=await fn();if(value)return value;}catch(e){last=e;}await sleep(100);}throw last||Error('Native UI timeout');}
(async()=>{
  const vsix=path.resolve(process.argv[2]),directory=await fs.mkdtemp(path.join(os.tmpdir(),'story-installed-readable-'));
  const root=path.join(directory,'legacy'),destination=root+' - readable';
  const supplied=process.argv[3]&&await fs.realpath(process.argv[3]);
  const suppliedBefore=supplied&&await r.inventory(supplied);
  if(supplied)await fs.cp(supplied,root,{recursive:true});
  const manifest=supplied?await r.readManifest(root):await require('./readable-fixture.cjs').legacyWebFixture(root);
  if(!supplied) {
    await fs.copyFile(path.join(root,'assets/harbour-lamp.webp'),path.join(root,'assets/harbour lamp.webp'));
    const file=path.join(root,manifest.scenes[0].file),source=await fs.readFile(file,'utf8');
    await fs.writeFile(file,source.replace('(../assets/harbour-lamp.webp)','(<../assets/harbour lamp.webp> "Authored lamp title")'));
  }
  const before=await r.inventory(root);
  await fs.mkdir(path.join(directory,'profile/User'),{recursive:true});
  await fs.writeFile(path.join(directory,'profile/User/settings.json'),JSON.stringify({'files.simpleDialog.enable':true,'window.dialogStyle':'custom','workbench.startupEditor':'none','files.hotExit':'off'}));
  const log=await fs.open(path.join(directory,'code.log'),'w'),common=[`--user-data-dir=${path.join(directory,'profile')}`,`--extensions-dir=${path.join(directory,'extensions')}`];
  execFileSync('/usr/bin/code',[...common,'--install-extension',vsix,'--force'],{stdio:['ignore',log.fd,log.fd]});
  const server=net.createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port;await new Promise(resolve=>server.close(resolve));
  let code=spawn('/usr/share/code/code',[...common,`--remote-debugging-port=${port}`,'--skip-welcome','--skip-release-notes','--disable-updates','--disable-telemetry','--disable-workspace-trust','--new-window',root],{stdio:['ignore',log.fd,log.fd]});
  let socket,readerSocket,inspect,send;
  async function connect() {
    socket?.close();const page=await until(async()=>{try{return(await(await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t=>t.type==='page');}catch{return false;}});
    socket=new WebSocket(page.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
    let id=0;const pending=new Map();socket.onmessage=event=>{const m=JSON.parse(event.data),p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}};
    send=(method,params={})=>new Promise((resolve,reject)=>{const request=++id,timer=setTimeout(()=>reject(Error(`CDP ${method} timeout`)),15000);pending.set(request,{resolve:v=>{clearTimeout(timer);resolve(v);},reject});socket.send(JSON.stringify({id:request,method,params}));});
    inspect=async expression=>{const v=await send('Runtime.evaluate',{expression,returnByValue:true});if(v.exceptionDetails)throw Error(JSON.stringify(v.exceptionDetails));return v.result.value;};
    await until(()=>inspect("Boolean(document.querySelector('.monaco-workbench'))"));await send('Page.bringToFront');
  }
  const key=async(name,modifiers=0)=>{for(const type of ['keyDown','keyUp'])await send('Input.dispatchKeyEvent',{type,key:name,code:name==='Enter'?'Enter':name==='Escape'?'Escape':`Key${name.toUpperCase()}`,modifiers,nativeVirtualKeyCode:name==='Enter'?13:name==='Escape'?27:name.toUpperCase().charCodeAt(0),windowsVirtualKeyCode:name==='Enter'?13:name==='Escape'?27:name.toUpperCase().charCodeAt(0),...(name==='Enter'&&type==='keyDown'?{text:'\r'}:{})});};
  const widget=()=>inspect("document.querySelector('.quick-input-widget')?.innerText || ''");
  const command=async title=>{await until(async()=>{await key('Escape');await key('P',10);await until(()=>inspect("Boolean(document.querySelector('.quick-input-widget input')?.checkVisibility())"));await send('Input.insertText',{text:title});await sleep(400);return String(await widget()).includes(title.replace('Story Teller: ',''));});await key('Enter');};
  const input=async(text)=>{await inspect("(()=>{const i=document.querySelector('.quick-input-widget input');i.focus();i.select();})()");await send('Input.insertText',{text});await sleep(150);await key('Enter');};
  try {
    await connect();
    await until(async()=>{
      for(const folder of await fs.readdir(path.join(directory,'profile/logs')))try{const text=await fs.readFile(path.join(directory,'profile/logs',folder,'window1/exthost/exthost.log'),'utf8');if(text.includes('murmurationpress.story-teller')&&text.includes('Eager extensions activated'))return true;}catch{}
      return false;
    });
    await command('Story Teller: Migrate Project to Readable Files');await until(async()=>String(await widget()).includes('Dry run only'));
    await key('Escape');assert.deepEqual(await r.inventory(root),before);await assert.rejects(fs.access(destination),/ENOENT/);
    await command('Story Teller: Migrate Project to Readable Files');await until(async()=>String(await widget()).includes('Create Validated Copy'));
    await input('Create Validated Copy');await until(async()=>String(await widget()).includes('Validated sibling project folder'));await key('Enter');
    await until(async()=>{try{return JSON.parse(await fs.readFile(path.join(destination,r.REPORT))).status==='validated';}catch{return false;}});
    assert.deepEqual(await r.inventory(root),before);
    // Open the result in a second disposable installed profile, keeping the
    // installed extension directory. No implementation is injected.
    socket?.close();code.kill('SIGKILL');await sleep(500);
    const nextProfile=path.join(directory,'profile-readable');await fs.mkdir(path.join(nextProfile,'User'),{recursive:true});await fs.copyFile(path.join(directory,'profile/User/settings.json'),path.join(nextProfile,'User/settings.json'));
    code=spawn('/usr/share/code/code',[`--user-data-dir=${nextProfile}`,`--extensions-dir=${path.join(directory,'extensions')}`,`--remote-debugging-port=${port}`,'--skip-welcome','--disable-workspace-trust','--disable-updates','--disable-telemetry','--new-window',destination],{stdio:['ignore',log.fd,log.fd]});await connect();
    await command('Story Teller: Rename / Move Scene File');await until(async()=>String(await widget()).includes(manifest.scenes[0].title));
    await input(manifest.scenes[0].title);await until(async()=>String(await widget()).includes('New scene path'));
    await input('scenes/workshop/renamed-account.md');
    await until(()=>inspect("document.body.innerText.includes('Scene path and project references saved')"));
    await until(async()=>{try{return (await r.readManifest(destination)).scenes.find(s=>s.id===manifest.scenes[0].id).file==='scenes/workshop/renamed-account.md';}catch{return false;}});
    const renamed=await r.readManifest(destination);assert.equal(renamed.scenes[0].id,manifest.scenes[0].id);await fs.access(path.join(destination,renamed.scenes[0].file));
    let titledPreviewImage=false;
    if(!supplied) {
      const text=await fs.readFile(path.join(destination,renamed.scenes[0].file),'utf8');assert.ok(text.includes('"Authored lamp title"'));
      const line=text.split('\n').findIndex(line=>line.includes('![An original pulsing harbour lamp]'))+1;assert.ok(line>0);
      await key('Escape');await key('P',2);await until(()=>inspect("Boolean(document.querySelector('.quick-input-widget input')?.checkVisibility())"));
      await send('Input.insertText',{text:`${renamed.scenes[0].file}:${line}`});await sleep(400);await key('Enter');
      await until(()=>inspect("[...document.querySelectorAll('.tab.active .label-name')].some(n=>n.textContent==='renamed-account.md')"));
      await command('Story Teller: Preview This Beat');
      const target=await until(async()=>(await(await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t=>t.type==='iframe'&&t.url.includes('murmurationpress.story-teller')));
      readerSocket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{readerSocket.onopen=resolve;readerSocket.onerror=reject;});
      let serial=0;const pending=new Map();readerSocket.onmessage=event=>{const response=JSON.parse(event.data),done=pending.get(response.id);if(done){pending.delete(response.id);done(response);}};
      const reader=expression=>new Promise((resolve,reject)=>{
        const id=++serial,timer=setTimeout(()=>{pending.delete(id);reject(Error('Reader probe timeout'));},10000);
        pending.set(id,response=>{clearTimeout(timer);if(response.error||response.result?.exceptionDetails)reject(Error(JSON.stringify(response.error||response.result.exceptionDetails)));else resolve(response.result.result.value);});
        readerSocket.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression:`(()=>{const doc=document.getElementById('active-frame')?.contentDocument;return (${expression});})()`,returnByValue:true,userGesture:true}}));
      });
      await until(()=>reader("doc?.getElementById('status')?.textContent.includes('ready')"));
      await reader("doc.getElementById('play').click()");
      await until(()=>reader("[...doc.querySelectorAll('img')].some(img=>img.alt==='An original pulsing harbour lamp'&&img.complete&&img.naturalWidth>0)"));
      titledPreviewImage=true;
    }
    // Export the actual editor-renamed project through the core exporter; the
    // standalone HTTP playback suite exercises the resulting reader separately.
    const web=path.join(directory,'web');await require('../src/web-export.cjs').exportWeb(destination,web);
    if(supplied)assert.deepEqual(await r.inventory(supplied),suppliedBefore);
    const evidence={version:JSON.parse(await fs.readFile('/usr/share/code/resources/app/package.json')).version,mode:'normal installed VSIX; no development/test flags',fixture:supplied?'private project copied before use':'synthetic',cancellationPreservedOriginal:true,migrationPreservedOriginal:true,reportValidated:true,renameMoveManifestAndFile:true,sceneIdentityPreserved:true,titledPreviewImage,webExport:web,root:directory};
    await fs.writeFile(path.join(directory,'evidence.json'),r.json(evidence));console.log(r.json(evidence));
  }catch(error){if(inspect)await fs.writeFile(path.join(directory,'failure.json'),r.json(await inspect('({body:document.body.innerText})').catch(e=>({error:e.message}))));console.error(`Failure profile: ${directory}`);throw error;}
  finally{readerSocket?.close();socket?.close();code.kill('SIGKILL');await log.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
