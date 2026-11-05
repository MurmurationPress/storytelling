'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {registerReadable}=require('../src/readable-command.cjs'),{legacyWebFixture}=require('./readable-fixture.cjs'),{inventory,REPORT}=require('../src/readable-project.cjs');
async function fixture(t,answers={}) {
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'readable-command-'));t.after(()=>fs.rm(directory,{recursive:true,force:true}));
  const root=path.join(directory,'project');await legacyWebFixture(root);
  const commands=new Map(),messages=[],reviews=[],d={dispose(){}};
  let provider;
  const uri=file=>({fsPath:file,scheme:'file',toString:()=>file});
  const vscode={Uri:{file:uri,parse:value=>({scheme:'story-teller-storage-review',toString:()=>value})},workspace:{workspaceFolders:[{uri:uri(root)}],textDocuments:answers.dirty?[{isDirty:true,uri:uri(path.join(root,'story-teller.project.json'))}]:[],registerTextDocumentContentProvider:(scheme,p)=>{provider=p;return d;},onDidCloseTextDocument:()=>d,openTextDocument:async uri=>({uri,text:provider.provideTextDocumentContent(uri)})},window:{showTextDocument:async doc=>reviews.push(doc),showQuickPick:async()=>{await answers.onDecision?.(root);return answers.action;},showInputBox:async()=>answers.name,showInformationMessage:async m=>messages.push(m),showWarningMessage:async m=>messages.push(m),showErrorMessage:async m=>messages.push(m)},commands:{registerCommand:(name,fn)=>{commands.set(name,fn);return d;},executeCommand:async()=>assert.fail('No external command authorized by fake host')}};
  registerReadable(vscode,{subscriptions:[]});return{directory,root,commands,messages,reviews};
}
test('migration Cancel and dry-run provide a read-only machine-readable preview with zero filesystem changes',async t=>{
  for(const action of [undefined,'Dry run only']) {
    const f=await fixture(t,{action}),before=await inventory(f.root);await f.commands.get('storyTeller.migrateReadableFiles')();
    assert.deepEqual(await inventory(f.root),before);assert.equal(f.reviews[0].uri.scheme,'story-teller-storage-review');assert.equal(JSON.parse(f.reviews[0].text).status,'planned');assert.equal(f.messages.length,0);
  }
});
test('migration command creates a validated sibling and retains the original',async t=>{
  const f=await fixture(t,{action:'Create Validated Copy',name:'readable'}),before=await inventory(f.root);await f.commands.get('storyTeller.migrateReadableFiles')();
  assert.deepEqual(await inventory(f.root),before);assert.equal(JSON.parse(await fs.readFile(path.join(f.directory,'readable',REPORT))).status,'validated');assert.match(f.messages.join('\n'),/Validated copy/);
});
test('dirty buffers and concurrent source edits stop the command before a destination can appear',async t=>{
  const dirty=await fixture(t,{dirty:true,action:'Create Validated Copy',name:'readable'});await dirty.commands.get('storyTeller.migrateReadableFiles')();assert.match(dirty.messages.join('\n'),/Save or revert/);assert.equal(dirty.reviews.length,0);
  const changed=await fixture(t,{action:'Create Validated Copy',name:'readable',onDecision:root=>fs.writeFile(path.join(root,'concurrent.txt'),'Concurrent author file')});await changed.commands.get('storyTeller.migrateReadableFiles')();assert.match(changed.messages.join('\n'),/changed after review/);await assert.rejects(fs.access(path.join(changed.directory,'readable')),/ENOENT/);
});
