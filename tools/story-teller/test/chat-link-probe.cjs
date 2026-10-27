'use strict';
const assert = require('node:assert/strict');
// The same assertions run against a real VS Code webview and a fresh HTTP export.
module.exports = async function probe({evaluate,key,hover,wait}) {
  const until = async fn => {const end=Date.now()+12000;while(Date.now()<end){try{if(await fn())return;}catch{}await wait(80);}throw Error('Chat probe timed out');};
  const click = selector => evaluate(`doc.querySelector(${JSON.stringify(selector)}).click()`);
  await until(()=>evaluate("doc.querySelectorAll('.chat li').length===1"));
  assert.equal(await evaluate("doc.querySelector('.chat-title').textContent"),'Lounge');
  assert.equal(await evaluate("doc.querySelector('.chat').getAttribute('aria-label')"),'Lounge');
  assert.equal(await evaluate("doc.querySelector('.chat strong').textContent"),'StillLearning');
  assert.equal(await evaluate("doc.querySelector('.chat li').className"),'outgoing');
  await until(()=>evaluate("doc.querySelector('.ticks.read')!==null"));
  assert.equal(await evaluate("doc.querySelector('.responding').textContent"),'JoMakesThings is responding…');
  assert.equal(await evaluate("doc.querySelectorAll('button button,a button,button a').length"),0);
  for(const selector of ['.chat-title button','.chat strong button','.chat p button']) {
    await hover(selector);
    await until(()=>evaluate("!doc.querySelector('.supporting-preview').hidden"));
    assert.match(await evaluate("doc.querySelector('#status').textContent"),/playing/);
    await evaluate(`doc.querySelector(${JSON.stringify(selector)}).focus()`);
    await until(()=>evaluate("!doc.querySelector('.supporting-preview').hidden"));
    const target=await evaluate('doc.activeElement.dataset.storyTarget');
    await key('Enter',13,'\r');
    await until(()=>evaluate("doc.querySelector('dialog').open"));
    assert.match(await evaluate("doc.querySelector('#status').textContent"),/paused/);
    await until(()=>evaluate("doc.querySelector('dialog article').textContent.includes('Synthetic')"));
    const held=await evaluate("doc.querySelector('#beat').textContent");await wait(180);
    assert.equal(await evaluate("doc.querySelector('#beat').textContent"),held);
    await click('dialog article button[data-story-target="Nested"]');
    await until(()=>evaluate("doc.querySelector('dialog h2').textContent==='Nested'"));
    await click('dialog header button');
    await until(()=>evaluate("doc.querySelector('dialog h2').textContent!=='Nested'"));
    await key('Escape',27);
    await until(()=>evaluate("!doc.querySelector('dialog').open"));
    assert.equal(await evaluate('doc.activeElement.dataset.storyTarget'),target);
    assert.match(await evaluate("doc.querySelector('#status').textContent"),/paused/);
    await click('#pause');
  }
  await click('#replay');
  await until(()=>evaluate("doc.querySelectorAll('.chat li').length===1"));
  await until(()=>evaluate("doc.querySelector('.ticks.read')!==null"));
  assert.equal(await evaluate("doc.querySelector('.responding').textContent"),'JoMakesThings is responding…');
  return ['linked heading/speaker/body and continuation','outgoing alignment and read ticks','handle-only responding','hover and focus previews','keyboard Enter/Escape','nested note/back','pause, focus return and explicit resume','replay','no nested interactive elements'];
};
