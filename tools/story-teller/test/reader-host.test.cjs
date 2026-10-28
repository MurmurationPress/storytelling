'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
function host(savedAutoplay = true, project = null) {
  const commands = new Map(), panels=[], changes=[], contexts=[], updates=[];
  let integration, held;
  const noop=()=>({dispose(){}});
  const uri=file=>({fsPath:file,scheme:'file',toString:()=>`file://${file}`});
  const doc=(file,text='Opening.\n---\nLast.')=>({uri:uri(file),languageId:'markdown',getText:()=>text,offsetAt:()=>0,positionAt:offset=>offset,version:1});
  const editor=document=>({document,viewColumn:1,selection:{active:0}});
  const source=doc('/standalone/scene.md');
  const vscode={Uri:{file:uri,parse:value=>uri(value.replace('file://','')),joinPath:(base,...segments)=>uri(path.join(base.fsPath,...segments))},
    ViewColumn:{One:1,Beside:2},
    commands:{registerCommand:(id,callback)=>{commands.set(id,callback);return noop();},executeCommand:async(...args)=>{contexts.push(args);}},
    languages:{registerFoldingRangeProvider:noop},
    workspace:{textDocuments:[source],onDidChangeTextDocument:fn=>{changes.push(fn);return noop();},createFileSystemWatcher:()=>({onDidChange:noop,onDidCreate:noop,onDidDelete:noop,dispose(){}})},
    window:{activeTextEditor:editor(source),showInformationMessage:noop,createWebviewPanel:(kind,title,column,options)=>{
      const panel={title,visible:true,active:true,viewColumn:2,webview:{options,html:'',asWebviewUri:value=>value.toString(),postMessage:message=>{panel.messages.push(message);return Promise.resolve(true);},onDidReceiveMessage:fn=>{panel.receive=fn;return noop();}},messages:[],
        onDidChangeViewState:fn=>{panel.viewState=fn;return noop();},onDidDispose:fn=>{panel.onDispose=fn;return noop();},reveal:()=>{panel.visible=true;panel.active=true;panel.viewState?.();},dispose:()=>{panel.disposed=true;panel.onDispose?.();}};
      panels.push(panel);return panel;
    }} };
  const load=Module._load;
  Module._load=function(request,parent,...rest){
    if(parent?.filename.endsWith('/src/extension.cjs')){
      if(request==='vscode')return vscode;
      if(request==='./import-command.cjs')return {registerImport:(v,c,options)=>{integration=options;}};
      if(request==='./conversion-command.cjs')return {registerConversion:()=>{}};
      if(request==='./insert-command.cjs')return {registerInsert:()=>{}};
      if(request==='./pacing-command.cjs')return {registerPacing:()=>{},projectFor:async()=>project,projectFile:()=>null};
      if(request==='./intellisense-command.cjs')return {registerIntelliSense:()=>{}};
      if(request==='./media.cjs')return {baseFor:(v,d)=>({root:path.dirname(d.uri.fsPath)}),resolveMedia:async()=>{if(held)await held;return {media:{}};}};
    }
    return load.call(this,request,parent,...rest);
  };
  const target=require.resolve('../src/extension.cjs');delete require.cache[target];
  try {require(target).activate({subscriptions:[],extensionUri:uri('/extension'),globalState:{get:(key,fallback)=>key==='storyTeller.autoplayOnTurn'?savedAutoplay:fallback,update:async(...args)=>updates.push(args)}});} finally {Module._load=load;}
  const instance=panel=>panel.webview.html.match(/data-reader-instance="([^"]+)"/)[1];
  const ready=panel=>panel.receive({type:'ready',instance:instance(panel)});
  return {vscode,commands,panels,source,doc,editor,changes,contexts,updates,instance,ready,get integration(){return integration;},hold:promise=>{held=promise;}};
}
test('cross-root outline retarget replaces the resource-policy lifetime and rejects disposed ready signals', async t=>{
  const h=host();t.after(()=>h.panels.forEach(p=>p.dispose()));
  await h.commands.get('storyTeller.previewScene')();const panel=h.panels[0];await h.ready(panel);
  assert.equal(panel.messages.find(m=>m.type==='source').sceneStart,false);
  const old=h.instance(panel);h.integration.onScenePending();assert.equal(panel.messages.at(-1).type,'source-pending');
  await h.integration.openScene(h.editor(h.doc('/project/scenes/A.md')));
  assert.equal(h.panels.length,2);assert.equal(panel.disposed,true);
  const replacement=h.panels[1];assert.notEqual(h.instance(replacement),old);
  assert.equal(h.panels.filter(p=>!p.disposed).length,1);
  const sent=panel.messages.filter(m=>m.type==='source').length;
  await panel.receive({type:'ready',instance:old});assert.equal(panel.messages.filter(m=>m.type==='source').length,sent);
  assert.equal(replacement.messages.filter(m=>m.type==='source').length,0);
  await h.ready(replacement);const message=replacement.messages.at(-1);
  assert.equal(message.type,'source');assert.equal(message.uri,'file:///project/scenes/A.md');assert.equal(message.sceneStart,true);assert.equal(message.targetOffset,0);
});
test('same-root outline scenes preserve the webview and saved Autoplay Off; metadata-only events do not reset it', async t=>{
  const h=host(false);t.after(()=>h.panels.forEach(p=>p.dispose()));
  await h.commands.get('storyTeller.previewScene')();const panel=h.panels[0];await h.ready(panel);
  const instance=h.instance(panel);const next=h.doc('/standalone/next.md');h.integration.onScenePending();await h.integration.openScene(h.editor(next));
  assert.equal(h.instance(panel),instance);assert.equal(panel.messages.at(-1).sceneStart,true);assert.equal(panel.messages.at(-1).autoplayOnTurn,false);
  const count=panel.messages.length;h.changes[0]({document:next,contentChanges:[]});assert.equal(panel.messages.length,count);
  h.changes[0]({document:next,contentChanges:[{text:'edited'}]});await new Promise(resolve=>setImmediate(resolve));
  assert.equal(panel.messages.at(-1).sceneStart,false);assert.deepEqual(h.updates,[]);
});
test('superseded asynchronous preparation cannot post an old scene into the reader', async t=>{
  const h=host();t.after(()=>h.panels.forEach(p=>p.dispose()));
  await h.commands.get('storyTeller.previewScene')();const panel=h.panels[0];await h.ready(panel);
  let release;h.hold(new Promise(resolve=>{release=resolve;}));
  h.integration.onScenePending();const first=h.integration.openScene(h.editor(h.doc('/standalone/slow.md')));
  await Promise.resolve();h.integration.onScenePending();h.hold(null);
  await h.integration.openScene(h.editor(h.doc('/standalone/latest.md')));release();await first;
  assert.match(panel.messages.at(-1).uri,/latest.md$/);assert.equal(panel.messages.filter(m=>m.type==='source'&&m.uri.endsWith('slow.md')).length,0);
});

test('supporting Markdown cannot be opened as a performed scene by author preview commands',async()=>{
  const h=host(true,{file:'/project/story-teller.project.json',manifest:{}});
  h.vscode.window.activeTextEditor=h.editor(h.doc('/project/Supporting Content/Ted.md','A note.\n---\nNot a beat.'));
  await h.commands.get('storyTeller.previewScene')();await h.commands.get('storyTeller.previewThisBeat')();
  assert.equal(h.panels.length,0);
  await h.integration.openScene(h.editor(h.doc('/project/scenes/old.md')),()=>false);assert.equal(h.panels.length,0,'a superseded scene selection cannot win during project lookup');
});

test('beat folding targets its source editor before the native action and rejects an intervening edit', async () => {
  const h=host();
  h.vscode.window.showTextDocument=async document=>{
    h.contexts.push(['showTextDocument',document.uri.fsPath]);
    const editor=h.editor(document);h.vscode.window.activeTextEditor=editor;return editor;
  };
  await h.commands.get('storyTeller.collapseBeats')();
  const events=h.contexts.filter(args=>['showTextDocument','workbench.action.focusActiveEditorGroup','editor.fold'].includes(args[0]));
  assert.deepEqual(events.map(args=>args[0]),['showTextDocument','workbench.action.focusActiveEditorGroup','editor.fold']);
  assert.deepEqual(events.at(-1)[1].selectionLines,[1]);
  h.vscode.window.showWarningMessage=()=>{};
  h.vscode.window.showTextDocument=async document=>{document.version++;return h.editor(document);};
  h.contexts.length=0;
  await h.commands.get('storyTeller.expandBeats')();
  assert.equal(h.contexts.some(args=>args[0]==='editor.unfold'),false);
});

test('root replacement before first ready never posts the old source or starts the new reader prematurely',async t=>{
 const h=host();t.after(()=>h.panels.forEach(p=>p.dispose()));
 await h.commands.get('storyTeller.previewScene')();const old=h.panels[0];
 await h.integration.openScene(h.editor(h.doc('/different/scenes/new.md')));
 const current=h.panels[1];assert.equal(old.disposed,true);assert.equal(current.messages.some(m=>m.type==='source'),false);
 await h.ready(old);assert.equal(old.messages.some(m=>m.type==='source'),false);
 await h.ready(current);assert.equal(current.messages.at(-1).uri,'file:///different/scenes/new.md');
});

test('speed uses global reader preference and survives replacement without authoring edits',async t=>{
 const h=host();t.after(()=>h.panels.forEach(p=>p.dispose()));
 await h.commands.get('storyTeller.previewScene')();const old=h.panels[0];await h.ready(old);
 assert.equal(old.messages.find(m=>m.type==='source').playbackSpeed,1);
 await old.receive({type:'speed-preference',playbackSpeed:.75,instance:h.instance(old)});
 assert.deepEqual(h.updates.at(-1),['storyTeller.playbackSpeed',.75]);
 await h.integration.openScene(h.editor(h.doc('/different/scenes/new.md')));const current=h.panels[1];await h.ready(current);
 assert.equal(current.messages.find(m=>m.type==='source').playbackSpeed,.75);
 await current.receive({type:'speed-preference',playbackSpeed:99,instance:h.instance(current)});
 assert.deepEqual(h.updates.at(-1),['storyTeller.playbackSpeed',1]);
});
