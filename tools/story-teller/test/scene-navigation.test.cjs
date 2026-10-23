'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { SceneSelection, SceneAutoplay, autoplayPreference, currentReaderMessage } = require('../src/scene-navigation.cjs');
const { registerInsert } = require('../src/insert-command.cjs');
const metadata = require('../package.json');
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
test('scene selection cancels immediately and rejects stale validated loads', async () => {
  const calls = []; const selection = new SceneSelection(() => calls.push('stop'));
  const first = selection.begin(), second = selection.begin();
  await selection.commit(first, () => calls.push('first'));
  await selection.commit(second, () => calls.push('second'));
  assert.deepEqual(calls, ['stop', 'stop', 'second']);
});
test('scene editor commits serialize and a newer selection wins after an in-flight open', async () => {
  const selection = new SceneSelection(); const gate = deferred(); const calls = [];
  const first = selection.begin();
  const a = selection.commit(first, async current => { calls.push('open A'); await gate.promise; if (current()) calls.push('play A'); });
  await Promise.resolve(); await Promise.resolve();
  const second = selection.begin();
  const b = selection.commit(second, current => { calls.push('open B'); if (current()) calls.push('play B'); });
  gate.resolve(); await Promise.all([a,b]);
  assert.deepEqual(calls, ['open A', 'open B', 'play B']);
});
test('a failed scene commit does not poison subsequent selections', async () => {
  const selection = new SceneSelection();
  await assert.rejects(selection.commit(selection.begin(), () => { throw Error('missing'); }), /missing/);
  assert.equal(await selection.commit(selection.begin(), () => 'next'), 'next');
});
test('scene autoplay waits for current loaded presentation, fires once and respects off/hide/edit cancellation', () => {
  const start = new SceneAutoplay();
  start.arm(3, true); assert.equal(start.take(3, false), false);
  assert.equal(start.take(2, true), false); assert.equal(start.take(3, true), true); assert.equal(start.take(3, true), false);
  start.arm(4, false); assert.equal(start.take(4, true), false);
  start.arm(5, true); start.cancel(); assert.equal(start.take(5, true), false);
  start.arm(6, true); start.arm(7, true); assert.equal(start.take(6, true), false); assert.equal(start.take(7, true), true);
});
test('departure during asynchronous scene preparation prevents autoplay on a later return', () => {
  const start=new SceneAutoplay();const beforeLoad=start.departure;
  start.leave();start.arm(10,true,beforeLoad);assert.equal(start.take(10,true),false);
  start.arm(11,true,start.departure);assert.equal(start.take(11,true),true);
});
test('replacement readers reject queued source and presentation messages from obsolete documents', () => {
  for(const type of ['source','source-pending','presentation']) {
    assert.equal(currentReaderMessage('new',{type,instance:'old'}),false);
    assert.equal(currentReaderMessage('new',{type}),false);
    assert.equal(currentReaderMessage('new',{type,instance:'new'}),true);
  }
  assert.equal(currentReaderMessage('new',{type:'autoplay-preference',autoplayOnTurn:false}),true);
});
test('Autoplay retains the existing saved page-turn preference without migration writes', () => {
  const keys = [];
  for (const [stored, expected] of [[undefined,true],[false,false],[true,true]]) {
    assert.equal(autoplayPreference({ get(key, fallback) { keys.push(key); return stored ?? fallback; } }), expected);
  }
  assert.deepEqual(keys, Array(3).fill('storyTeller.autoplayOnTurn'));
});
function insertHost(source, title, start = source.length, end = start) {
  const registered = new Map(), calls = [];
  const selection = { start, end, isEqual: other => other === selection };
  const doc = { languageId:'markdown', uri:{scheme:'file'}, version:1, getText:()=>source, offsetAt:p=>p, positionAt:p=>p };
  const editor = { document:doc, selection, selections:[selection], insertSnippet:async (snippet, at, options) => { calls.push({snippet:snippet.value,at,options}); return true; } };
  const vscode = { SnippetString: class { constructor(value){this.value=value;} }, window:{activeTextEditor:editor,
    showQuickPick:()=>{ throw Error('Direct command must not show Insert picker'); }, showInputBox:async()=>title,
    showWarningMessage:message=>calls.push({warning:message}),showInformationMessage:()=>{} }, commands:{registerCommand:(id,fn)=>{registered.set(id,fn);return {dispose(){}};}} };
  registerInsert(vscode,{subscriptions:[]});
  return { registered, calls, doc };
}
test('direct Insert Beat reuses the title/snippet/Undo path and preserves selected text', async () => {
  const selected = insertHost('Opening paragraph.', 'The signal', 0, 7);
  assert.equal((await selected.registered.get('storyTeller.insertBeat')()).status, 'refused');
  assert.ok(!selected.calls.some(call => call.snippet));
  const host = insertHost('Opening paragraph.', 'The signal');
  assert.equal((await host.registered.get('storyTeller.insertBeat')()).status, 'inserted');
  assert.match(host.calls[0].snippet, /<!-- beat: The signal -->/);
  assert.equal(host.calls[0].at, 18);
  assert.deepEqual(host.calls[0].options, {undoStopBefore:true,undoStopAfter:true,keepWhitespace:true});
});
test('direct Insert Beat cancels, refuses nested fences and rejects stale source', async () => {
  const cancelled=insertHost('Text.',undefined); assert.equal((await cancelled.registered.get('storyTeller.insertBeat')()).status,'cancelled'); assert.equal(cancelled.calls.length,0);
  const nested=insertHost('```chat\nIvo: Hello.\n```','Title',12); assert.equal((await nested.registered.get('storyTeller.insertBeat')()).status,'refused'); assert.match(nested.calls[0].warning,/fence/i);
  const stale=insertHost('Text.','Title'); const work=stale.registered.get('storyTeller.insertBeat')(); stale.doc.version++; assert.equal((await work).status,'stale');
});
test('all five shortcuts are contributed, scoped, discoverable and use one consistent chord family', () => {
  const commands = metadata.contributes.commands.map(item=>item.command);
  assert.equal(metadata.contributes.keybindings.length,5);
  for (const binding of metadata.contributes.keybindings) {
    assert.ok(commands.includes(binding.command));
    assert.match(binding.key,/^ctrl\+k shift\+[bpcse]$/);
    assert.equal(binding.mac,binding.key.replaceAll('ctrl','cmd'));
    assert.match(binding.when,binding.command.endsWith('showBeatInSource') ? /storyTeller.previewActive/ : /editorTextFocus.*editorLangId == markdown/);
  }
});
