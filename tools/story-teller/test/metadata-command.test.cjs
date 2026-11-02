'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {registerConversion}=require('../src/conversion-command.cjs');
const {applyChanges}=require('../src/component-identity.cjs');
function harness(source, action='Apply', change=false, associate=false) {
 const commands=new Map(), diffs=[];let edits=0;
 const uri={scheme:'file',toString:()=>'/synthetic.md'};
 const doc={uri,languageId:'markdown',isClosed:false,version:1,getText:()=>source,positionAt:n=>n,offsetAt:n=>n};
 const editor={document:doc,selection:{start:0,end:0,active:0,isEmpty:true},edit:async fn=>{const changes=[];fn({replace:(range,text)=>changes.push({start:range.start,end:range.end,text})});source=applyChanges(source,changes);doc.version++;edits++;return true;}};
 const vscode={Uri:{parse:value=>({scheme:'story-teller-conversion',toString:()=>value})},Range:class{constructor(start,end){this.start=start;this.end=end;}},workspace:{registerTextDocumentContentProvider:()=>({}),onDidCloseTextDocument:()=>({})},commands:{registerCommand:(name,fn)=>{commands.set(name,fn);return{};},executeCommand:async(...args)=>diffs.push(args)},window:{activeTextEditor:editor,createOutputChannel:()=>({appendLine(){},show(){}}),showTextDocument:async()=>editor,showQuickPick:async items=>items[associate?1:0],showWarningMessage:async()=> 'Cancel',showInformationMessage:async(message,...actions)=>{
 if(actions.includes('Cancel')) {if(change){source+='\nA concurrent edit.';doc.version++;}return actions.includes(action) ? action : 'Cancel';}return undefined;
 }}};
 registerConversion(vscode,{subscriptions:[]});return{commands,diffs,doc,editor,edits:()=>edits};
}
const f='```typeout\n@format annotation\n\nTitle: Note\n\nText.\n```\n';
test('migration uses real conversion diff, explicit Apply, one editor edit and idempotent repeat',async()=>{
 const h=harness(f);const result=await h.commands.get('storyTeller.migrateComponentMetadata')();
 assert.equal(result.status,'applied');assert.equal(result.count,1);assert.equal(h.edits(),1);assert.equal(h.diffs[0][0],'vscode.diff');assert.match(h.doc.getText(),/@title Note/);
 assert.equal((await h.commands.get('storyTeller.migrateComponentMetadata')()).count,0);assert.equal(h.edits(),1);
});
test('Cancel and stale-source checks never apply migration changes',async()=>{
 for(const [action,change] of [['Cancel',false],['Apply',true]]) {
  const h=harness(f,action,change);const result=await h.commands.get('storyTeller.migrateComponentMetadata')();
  assert.equal(result.status,change?'stale':'cancelled');assert.equal(h.edits(),0);assert.ok(!h.doc.getText().includes('@title Note'));
 }
});
test('beat attribution requires the individual author choice, never just one fence',async()=>{
 const source='<!-- beat: Name -->\n\n'+f.replace('Title: Note\n\n','');
 const h=harness(source,'Apply',false,true);h.editor.selection.active=source.indexOf('@format');
 const result=await h.commands.get('storyTeller.migrateComponentMetadata')();assert.equal(result.count,1);assert.match(h.doc.getText(),/@title Name/);assert.ok(h.doc.getText().startsWith('<!-- beat: Name -->'));
 const safe=harness(source);safe.editor.selection.active=source.indexOf('@format');const held=await safe.commands.get('storyTeller.migrateComponentMetadata')();assert.equal(held.count,0);assert.equal(safe.edits(),0);
});
test('conversion command selection changes only fully selected callouts',async()=>{
 const first='> [!annotation] First\n> Body.\n',second='> [!annotation] Second\n> Other.\n';
 const source=first+'\n'+second,h=harness(source);h.editor.selection={start:first.length+1,end:source.length,active:source.length,isEmpty:false};
 const result=await h.commands.get('storyTeller.convertCallouts')();assert.equal(result.count,1);assert.ok(h.doc.getText().startsWith(first+'\n'));assert.match(h.doc.getText(),/@title Second/);
});

test('explicit attribution can target one complete selected component, without requiring its ending caret inside',async()=>{
 const source='<!-- beat: Chosen -->\n\n'+f.replace('Title: Note\n\n','');
 const h=harness(source,'Apply',false,true);const start=source.indexOf('```');
 h.editor.selection={start,end:source.length,active:source.length,isEmpty:false};
 const result=await h.commands.get('storyTeller.migrateComponentMetadata')();
 assert.equal(result.count,1);assert.match(h.doc.getText(),/@title Chosen/);
});

test('chat subtext conversion preserves document/selection review and Apply boundaries',async()=>{
 const first='```chat\n{{A|One|first note}}\n```',second='```chat\n{{B|Two|second note}}\n```';
 const source='<!-- beat: Rhythm -->\n\n'+first+'\n\nProse bridge.\n\n'+second+'\n';
 const h=harness(source);const start=source.indexOf(second);
 h.editor.selection={start,end:source.length,active:source.length,isEmpty:false};
 const result=await h.commands.get('storyTeller.convertChats')();assert.equal(result.count,1);assert.equal(h.edits(),1);assert.equal(h.diffs[0][0],'vscode.diff');
 assert.equal(h.doc.getText().slice(0,start),source.slice(0,start));assert.match(h.doc.getText().slice(start),/B: Two\n@subtext\n  \| second note/);
 h.editor.selection.end=h.doc.getText().length;h.editor.selection.active=h.editor.selection.end;
 assert.equal((await h.commands.get('storyTeller.convertChats')()).count,0);assert.equal(h.edits(),1);
 const doc=harness(source);assert.equal((await doc.commands.get('storyTeller.convertChats')()).count,2);assert.equal(doc.edits(),1);assert.ok(doc.doc.getText().includes('Prose bridge.'));
 for(const [action,change] of [['Cancel',false],['Apply',true]]){const held=harness(second,action,change);const r=await held.commands.get('storyTeller.convertChats')();assert.equal(r.status,change?'stale':'cancelled');assert.equal(held.edits(),0);assert.ok(held.doc.getText().includes('{{B|Two|second note}}'));}
});
