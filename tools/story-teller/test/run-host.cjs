'use strict';
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(fn, timeout = 60000) {
  const deadline = Date.now() + timeout;
  let error;
  while (Date.now() < deadline) {
    try { const result = await fn(); if (result) return result; } catch (e) { error = e; }
    await sleep(100);
  }
  throw error || new Error('Timed out');
}
(async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'story-teller-host-'));
  const server = net.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  const log = await fs.open(path.join(directory, 'code.log'), 'w');
  const code = spawn(process.env.VSCODE_EXECUTABLE || '/usr/share/code/code', [
    `--user-data-dir=${path.join(directory, 'profile')}`, `--extensions-dir=${path.join(directory, 'extensions')}`,
    `--extensionDevelopmentPath=${root}`, `--extensionTestsPath=${path.join(__dirname, 'host.cjs')}`,
    `--remote-debugging-port=${port}`, '--skip-welcome', '--skip-release-notes', '--disable-updates', '--disable-workspace-trust', '--disable-telemetry', '--new-window'
  ], { env: { ...process.env, STORY_TELLER_TEST_DIR: directory }, stdio: ['ignore', log.fd, log.fd] });
  let socket;
  let id = 0;
  async function request(action, source, options = {}) {
    await fs.writeFile(path.join(directory, 'request.json'), JSON.stringify({ id: ++id, action, source, ...options }));
    const ack = await until(async () => {
      const value = JSON.parse(await fs.readFile(path.join(directory, 'ack.json'), 'utf8'));
      return value.id === id && value;
    });
    assert.equal(ack.error, undefined);
  }
  try {
    await until(async () => { await fs.access(path.join(directory, 'ready')); return true; }, 60000);
    const target = await until(async () => {
      const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      return targets.find(t => t.type === 'iframe' && t.url.includes('murmurationpress.story-teller'));
    });
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let callId = 0;
    const pending = new Map();
    socket.onmessage = event => {
      const response = JSON.parse(event.data);
      const callbacks = pending.get(response.id);
      if (callbacks) { pending.delete(response.id); response.error ? callbacks.reject(new Error(JSON.stringify(response.error))) : callbacks.resolve(response.result); }
    };
    const send = (method, params) => new Promise((resolve, reject) => {
      const id = ++callId;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
    async function evaluate(expression) {
      const result = await send('Runtime.evaluate', {
        expression: `(() => { const doc = document.getElementById('active-frame')?.contentDocument; return (${expression}); })()`, returnByValue: true
      });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
      return result.result.value;
    }
    const locator = selector => ({
      textContent: () => evaluate(`doc.querySelector(${JSON.stringify(selector)})?.textContent`),
      count: () => evaluate(`doc.querySelectorAll(${JSON.stringify(selector)}).length`),
      isDisabled: () => evaluate(`doc.querySelector(${JSON.stringify(selector)}).disabled`),
      click: () => evaluate(`doc.querySelector(${JSON.stringify(selector)}).click()`)
    });
    const frame = { locator };
    const beat = locator('#beat');
    await until(async () => (await beat.textContent()).includes('old radio'));
    assert.equal(await frame.locator('#previous').isDisabled(), true);
    // Regression fixture: header flag alone, followed by viewer-first dialogue.
    // Strip per-message cues only in this temporary test buffer, never the sample file.
    const headerSource = (await fs.readFile(path.join(root, 'samples/lantern.md'), 'utf8'))
      .replace('# The Last Lantern', '# The Last Lantern\n\nHeader cue regression.')
      .replace(/```chat([\s\S]*?)```/, (fence, body) => '```chat' + body.replace(/^@responding\n/gm, '').replace('@viewer Mara\n', '@viewer Mara\n@responding\n') + '```');
    await request('edit', headerSource);
    await until(async () => (await beat.textContent()).includes('Header cue regression.'));
    await frame.locator('#next').click();
    await until(async () => (await frame.locator('#status').textContent()).includes('ready'));
    assert.equal(await frame.locator('.chat li').count(), 0);
    await sleep(500); assert.equal(await frame.locator('.chat li').count(), 0);
    const temporal = [];
    const capture = async label => temporal.push({ label, at: Date.now(), count: await frame.locator('.chat li').count(), status: await frame.locator('#status').textContent() });
    await capture('ready');
    assert.equal(await locator('.chat-title').count(), 0);
    await frame.locator('#play').click();
    await until(async () => (await locator('.chat-title').textContent()) === 'Lighthouse radio');
    assert.equal(await locator('.chat li').count(), 0);
    await until(async () => await frame.locator('.chat li').count() === 1);
    await capture('first message');
    await until(async () => (await locator('.responding').textContent()) === 'Ivo is responding…');
    await frame.locator('#pause').click();
    assert.equal(await locator('.responding').count(), 0);
    await sleep(900); assert.equal(await frame.locator('.chat li').count(), 1);
    await capture('paused');
    await frame.locator('#pause').click();
    assert.equal(await locator('.responding').textContent(), 'Ivo is responding…');
    await until(async () => await frame.locator('.chat li').count() === 2);
    await capture('second message');
    assert.equal(await locator('.responding').count(), 0);
    await until(async () => (await frame.locator('.chat li').count()) === 3);
    assert.equal((await beat.textContent()).includes("engine fell silent"), false);
    await until(async () => (await beat.textContent()).includes("engine fell silent"));
    assert.ok((await locator('#status').textContent()).includes('playing'));
    await until(async () => (await frame.locator('#status').textContent()).includes('completed'));
    assert.equal(await frame.locator('.chat li').count(), 3);
    assert.equal(await frame.locator('.ticks.read').count(), 2);
    await capture('completed');
    await frame.locator('#replay').click();
    assert.equal(await frame.locator('.chat li').count(), 0);
    await frame.locator('#pause').click();
    // Configure the test's final beat explicitly; do not depend on local sample edits.
    const sample = headerSource; // Keep the current chat identical while testing a preceding beat insertion.
    await request('edit', sample.replace('# The Last Lantern', 'Inserted first beat\n---\n# The Last Lantern'));
    await until(async () => (await frame.locator('#status').textContent()).includes('Beat 3 of 8 · ready'));
    assert.equal(await frame.locator('.chat li').count(), 0);
    await request('edit', sample.replace('Only me.', 'Only me, Mara.'));
    await until(async () => (await frame.locator('#status').textContent()).includes('Beat 2 of 7 · ready'));
    await frame.locator('#next').click();
    await until(async () => (await beat.textContent()).includes('ferry touched'));
    assert.equal((await beat.textContent()).includes('Beyond the wake'), false);
    assert.equal(await frame.locator('.prose').count(), 1);
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    assert.equal(await evaluate("doc.defaultView.matchMedia('(prefers-reduced-motion: reduce)').matches"), true);
    await frame.locator('#play').click();
    await sleep(250);
    assert.equal(await locator('.responding').count(), 0);
    assert.equal(await locator('.chat li').count(), 0);
    await capture('mixed: outside pause');
    await until(async () => (await locator('.responding').textContent()) === 'Ivo is responding…');
    assert.equal(await locator('.chat li').count(), 0);
    await capture('mixed: first-message delay with responding');
    await until(async () => await locator('.chat li').count() === 3);
    assert.equal((await beat.textContent()).includes('Beyond the wake'), false);
    await capture('mixed: prose entry delay');
    await until(async () => (await beat.textContent()).includes('Beyond the wake'));
    assert.ok((await locator('#status').textContent()).includes('playing'));
    await capture('mixed: trailing pause');
    await until(async () => (await locator('#status').textContent()).includes('completed'));
    await capture('mixed: completed');
    assert.equal(await frame.locator('.prose').count(), 2);
    assert.equal(await frame.locator('.chat li').count(), 3);
    assert.equal(await frame.locator('.ticks').count(), 0);
    assert.equal(await locator('.chat-title').count(), 0);
    assert.equal(await frame.locator('.chat li.outgoing').count(), 1);
    assert.equal(await evaluate("doc.querySelector('.chat li.outgoing strong').textContent"), 'Mara');
    assert.ok(await evaluate("doc.querySelector('.chat li.outgoing').getBoundingClientRect().left - doc.querySelector('.chat li:not(.outgoing)').getBoundingClientRect().left") >= 10);
    assert.equal(await frame.locator('#next').isDisabled(), false);
    await fs.writeFile(path.join(directory, 'temporal.json'), JSON.stringify(temporal, null, 2));
    await frame.locator('#previous').click();
    await frame.locator('#restart').click();
    await until(async () => (await beat.textContent()).includes('old radio'));
    await request('switch');
    assert.match(await beat.textContent(), /old radio/);
    await request('reopen-command');
    assert.match(await beat.textContent(), /old radio/);
    const fetched = [];
    const receive = socket.onmessage;
    socket.onmessage = event => {
      const message = JSON.parse(event.data);
      if (message.method === 'Network.requestWillBeSent' && message.params.request.url.includes('story-teller-blocked.invalid')) fetched.push(message.params.request.url);
      receive(event);
    };
    await send('Network.enable', {});
    await request('edit', '# Safety\n\n<script>window.STORY_ATTACK = true</script>\n\n![photo](https://story-teller-blocked.invalid/img) [external](https://story-teller-blocked.invalid)\n\n```chat\n@title <img src=x onerror=alert(1)>\n<img src=x onerror=alert(1)>: <iframe src="https://story-teller-blocked.invalid"></iframe>\n```');
    await until(async () => (await beat.textContent()).includes('Safety'));
    await locator('#play').click();
    await until(async () => (await locator('.chat li').count()) === 1);
    assert.equal(await locator('#beat script, #beat img, #beat iframe, #beat a, #beat style').count(), 0);
    assert.equal(await evaluate('doc.defaultView.STORY_ATTACK'), undefined);
    assert.equal(await locator('.chat-title').textContent(), '<img src=x onerror=alert(1)>');
    await sleep(300);
    assert.deepEqual(fetched, []);
    await request('edit', '');
    await until(async () => (await beat.textContent()).includes('No story beats yet'));
    await request('edit', sample);
    await until(async () => (await beat.textContent()).includes('old radio'));
    await evaluate("doc.getElementById('next').focus()");
    assert.equal(await evaluate("doc.activeElement.id"), 'next');
    await locator('#next').click();
    await until(async () => (await locator('#status').textContent()).includes('ready'));
    assert.equal(await evaluate("doc.activeElement.id"), 'next');
    await locator('#play').click();
    await request('close-preview');
    await until(async () => !(await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).some(t => t.type === 'iframe' && t.url.includes('murmurationpress.story-teller')));
    // Switch the test-only CDP inspection to the actual workbench for native
    // diff/notification buttons; extension code never sees this connection.
    const mainTarget = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page');
    const receiveWorkbench = socket.onmessage;
    socket.close(); socket = new WebSocket(mainTarget.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    socket.onmessage = receiveWorkbench;
    async function workbench(expression) {
      const response = await send('Runtime.evaluate', { expression, returnByValue: true });
      if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
      return response.result.value;
    }
    const action = async text => {
      await request('show-notifications');
      const expression = `Array.from(document.querySelectorAll('.monaco-button')).find(b => b.textContent.trim() === ${JSON.stringify(text)})`;
      try { await until(async () => await workbench(`Boolean(${expression})`)); }
      catch (error) {
        await fs.writeFile(path.join(directory, 'failed-notification.txt'), await workbench("document.body.innerText"));
        throw error;
      }
      await workbench(`${expression}.click()`);
    };
    const snapshot = async () => {
      await request('snapshot'); return JSON.parse(await fs.readFile(path.join(directory, 'snapshot.json'), 'utf8'));
    };
    const result = () => until(async () => JSON.parse(await fs.readFile(path.join(directory, 'conversion-result.json'), 'utf8')));
    const fixture = await fs.readFile(path.join(root, 'samples/conversion-example.md'), 'utf8');
    await request('edit', fixture); const initial = await snapshot();
    await request('start-conversion');
    await until(async () => (await snapshot()).snapshots.some(s => s.text.includes('Bo: First line.')));
    const prepared = await snapshot();
    assert.equal(prepared.text, fixture); assert.equal(prepared.disk, initial.disk);
    assert.ok(prepared.snapshots.some(s => s.text === fixture));
    assert.ok(await workbench("document.body.innerText.includes('2 chat(s) to convert; 1 review warning(s).')"));
    await action('Review Warnings');
    await until(async () => await workbench("document.body.innerText.includes('subtext')"));
    await action('Cancel'); assert.equal((await result()).status, 'cancelled');
    assert.equal((await snapshot()).text, fixture);

    await request('start-conversion');
    await request('edit', fixture + '\nAn unsaved edit after preview.');
    await action('Apply');
    await until(async () => await workbench("document.body.innerText.includes('Nothing was applied.')"));
    assert.equal((await snapshot()).text, fixture + '\nAn unsaved edit after preview.');
    await request('show-notifications');
    await action('Regenerate');
    await until(async () => (await snapshot()).snapshots.some(s => s.text.includes('Bo: First line.') && s.text.endsWith('An unsaved edit after preview.')));
    await action('Cancel'); assert.equal((await result()).status, 'cancelled');
    const unsaved = (await snapshot()).text;

    await request('start-conversion'); await action('Apply');
    const applied = await result(); assert.equal(applied.status, 'applied'); assert.equal(applied.count, 2);
    const after = await snapshot();
    assert.ok(after.text.includes('# Harbour link\n@viewer Ari\nAri: Is the lamp still lit?'));
    assert.ok(after.text.includes('  | Second line, with a colon: keep this together.'));
    assert.ok(after.text.endsWith('An unsaved edit after preview.'));
    assert.ok(after.dirty); assert.equal(after.disk, initial.disk);
    await request('preview-current');
    const convertedTarget = await until(async () => (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'iframe' && t.url.includes('murmurationpress.story-teller')));
    async function inspectConverted(expression) {
      const connection = new WebSocket(convertedTarget.webSocketDebuggerUrl);
      await new Promise((resolve, reject) => { connection.onopen = resolve; connection.onerror = reject; });
      try {
        return await new Promise((resolve, reject) => {
          connection.onmessage = event => {
            const message = JSON.parse(event.data);
            if (message.id !== 1) return;
            if (message.result?.exceptionDetails || message.error) reject(new Error(JSON.stringify(message)));
            else resolve(message.result.result.value);
          };
          connection.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: `(() => { const doc = document.getElementById('active-frame')?.contentDocument; return (${expression}); })()`, returnByValue: true } }));
        });
      } finally { connection.close(); }
    }
    await until(async () => await inspectConverted("Boolean(doc?.getElementById('play'))"));
    await inspectConverted("doc.getElementById('play').click()");
    await until(async () => (await inspectConverted("doc.querySelector('.chat-title')?.textContent")) === 'Harbour link');
    await until(async () => (await inspectConverted("doc.querySelectorAll('.chat li').length")) >= 2);
    const multiline = await inspectConverted("doc.querySelectorAll('.chat li p')[1].textContent");
    assert.ok(multiline.includes('Second line, with a colon: keep this together.\n\n@pause 500ms is part of this message, not a setting.'));
    await request('undo'); const undone = await snapshot();
    assert.equal(undone.text, unsaved); assert.equal(undone.disk, initial.disk);
    const pick = async label => {
      const expression = `Array.from(document.querySelectorAll('.quick-input-list .monaco-list-row')).find(row => row.textContent.includes(${JSON.stringify(label)}))`;
      await until(async () => await workbench(`Boolean(${expression})`));
      await workbench(`${expression}.click()`);
    };
    const insertResult = () => until(async () => JSON.parse(await fs.readFile(path.join(directory, 'insert-result.json'), 'utf8')));
    await request('edit', 'Before\n\n');
    await request('start-insert'); await pick('Chat block');
    assert.equal((await insertResult()).status, 'inserted');
    let inserted = await snapshot();
    assert.equal(inserted.selection.text, 'Conversation title');
    assert.ok(inserted.text.includes('# Conversation title\n@viewer Viewer\nViewer: First message.'));
    assert.ok(!inserted.text.includes('@ticks') && !inserted.text.includes('@responding'));
    await request('type', undefined, { text: 'Harbour test' });
    await request('snippet-next'); assert.equal((await snapshot()).selection.text, 'Viewer');
    await request('type', undefined, { text: 'Ari' });
    inserted = await snapshot(); assert.ok(inserted.text.includes('@viewer Ari\nAri: First message.'));
    await request('snippet-next'); assert.equal((await snapshot()).selection.text, 'First message.');
    await request('snippet-next'); assert.equal((await snapshot()).selection.text, 'Other participant');
    await request('snippet-next'); assert.equal((await snapshot()).selection.text, 'Reply.');
    await request('snippet-next');
    // A clean insertion is one undoable operation, without subsequent typing edits.
    await request('edit', 'Before\n\n'); await request('start-insert'); await pick('Chat block'); await insertResult();
    await request('undo'); assert.equal((await snapshot()).text, 'Before\n\n');

    await request('edit', 'Before\n\nAfter');
    await request('start-insert', undefined, { start: 8 }); await pick('Delay');
    assert.equal((await insertResult()).status, 'inserted');
    inserted = await snapshot(); assert.equal(inserted.selection.text, '1200');
    assert.ok(inserted.text.includes('@delay 1200ms'));
    await request('undo'); assert.equal((await snapshot()).text, 'Before\n\nAfter');
    await request('start-insert', undefined, { start: 8 }); await pick('Beat boundary'); await insertResult();
    assert.ok((await snapshot()).text.includes('\n---\n'));
    await request('undo'); assert.equal((await snapshot()).text, 'Before\n\nAfter');

    await request('start-insert', undefined, { start: 8 }); await pick('Responding');
    assert.equal((await insertResult()).status, 'refused'); assert.equal((await snapshot()).text, 'Before\n\nAfter');
    await request('start-insert', undefined, { start: 0, end: 6 }); await pick('Chat block');
    assert.equal((await insertResult()).status, 'refused'); assert.equal((await snapshot()).text, 'Before\n\nAfter');
    await request('start-insert', undefined, { start: 0, end: 6, wrap: true });
    assert.equal((await insertResult()).status, 'inserted');
    assert.ok((await snapshot()).text.startsWith('```chat\nBefore\n```'));
    await request('undo'); assert.equal((await snapshot()).text, 'Before\n\nAfter');

    const chatHeader = '```chat\n# Test\n@viewer Ari\n\nAri: Hello\nBo: Yes\n```';
    for (const [label, expected] of [['Ticks', '@ticks'], ['Responding', '@responding'], ['Pause', '@pause 800ms']]) {
      await request('edit', chatHeader); await request('start-insert', undefined, { start: chatHeader.indexOf('\n\n') + 1 }); await pick(label);
      assert.equal((await insertResult()).status, 'inserted');
      assert.ok((await snapshot()).text.includes(expected));
      await request('undo'); assert.equal((await snapshot()).text, chatHeader);
    }
    await request('start-insert', undefined, { start: chatHeader.indexOf('\n\n') + 1 }); await pick('Chat block');
    assert.equal((await insertResult()).status, 'refused'); assert.equal((await snapshot()).text, chatHeader);
    await request('start-insert', undefined, { start: 0 });
    await request('edit', chatHeader + '\nLater edit.'); await pick('Chat block');
    assert.equal((await insertResult()).status, 'stale');
    assert.equal((await snapshot()).text, chatHeader + '\nLater edit.');
    await request('start-insert', undefined, { start: 0 });
    await until(async () => await workbench("document.querySelector('.quick-input-widget')?.innerText.includes('Wrap Selection as Chat')"));
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    assert.equal((await insertResult()).status, 'cancelled');
    assert.equal((await snapshot()).text, chatHeader + '\nLater edit.');
    // Exercise both picker levels, replacement, single Undo and outside-chat refusal.
    await request('edit', chatHeader);
    await request('start-insert', undefined, { start: chatHeader.indexOf('Ari: Hello') });
    await pick('Pace'); await pick('Brisk');
    assert.equal((await insertResult()).status, 'inserted');
    const briskSource = (await snapshot()).text;
    assert.ok(briskSource.includes('```chat\n@pace brisk\n'));
    await request('start-insert', undefined, { start: briskSource.indexOf('Bo: Yes') });
    await pick('Pace'); await pick('Deliberate');
    assert.equal((await insertResult()).status, 'inserted');
    assert.equal((await snapshot()).text, briskSource.replace('@pace brisk', '@pace deliberate'));
    await request('undo'); assert.equal((await snapshot()).text, briskSource);
    await request('undo'); assert.equal((await snapshot()).text, chatHeader);
    await request('start-insert', undefined, { start: 0 }); await pick('Pace'); await pick('Normal');
    assert.equal((await insertResult()).status, 'refused');
    assert.equal((await snapshot()).text, chatHeader);
    // Real webview playback: responding occupies the scaled wait itself, not another phase.
    const paceEvidence = [];
    for (const [pace, expected] of [['normal', 800], ['brisk', 560], ['deliberate', 1040]]) {
      await request('edit', `Pace probe ${pace}\n\n\`\`\`chat\n@pace ${pace}\n@viewer Ari\n@responding\nBo: Hi\n@pause 300ms\n@delay 1200ms\nBo: Yes\n\`\`\``);
      await until(async () => (await inspectConverted("doc.querySelector('#beat')?.textContent"))?.includes(`Pace probe ${pace}`));
      await inspectConverted("doc.getElementById('play').click()");
      const began = Date.now();
      assert.equal(await inspectConverted("doc.querySelector('.responding')?.textContent"), 'Bo is responding…');
      await until(async () => await inspectConverted("doc.querySelectorAll('.chat li').length") === 1);
      const first = Date.now() - began;
      assert.ok(first >= expected - 100 && first < expected + 700, `${pace}: first message ${first}ms`);
      await until(async () => await inspectConverted("doc.querySelectorAll('.chat li').length") === 2);
      const complete = Date.now() - began;
      // IPC/polling can delay observation; the injected scheduler tests exact totals.
      assert.ok(complete >= first + 1100 && complete < first + 4000, `${pace}: ${first}ms → ${complete}ms`);
      paceEvidence.push({ pace, expectedFirstMs: expected, observedFirstMs: first, observedCompleteMs: complete });
    }
    await fs.writeFile(path.join(directory, 'pace-temporal.json'), JSON.stringify(paceEvidence, null, 2));
    const imageSource = 'Harbour image probe\n\n@delay 900ms\n\n![Wide harbour](assets/harbour-landscape.webp)\n\n*Caption: The harbour wall.*\n\n@pause 600ms\n\n```chat\nA: Hi\n```';
    await request('edit', imageSource);
    await until(async () => (await inspectConverted("doc.querySelector('#beat')?.textContent"))?.includes('Harbour image probe'));
    assert.equal(await inspectConverted("doc.querySelectorAll('.story-figure').length"), 0);
    assert.equal(await inspectConverted("doc.getElementById('warnings').textContent"), '');
    await inspectConverted("doc.getElementById('play').click()");
    await sleep(300);
    assert.equal(await inspectConverted("doc.querySelectorAll('.story-figure').length"), 0);
    await until(async () => await inspectConverted("doc.querySelectorAll('.story-figure img').length") === 1);
    assert.equal(await inspectConverted("doc.querySelector('.story-figure img').naturalWidth"), 720);
    assert.equal(await inspectConverted("doc.querySelector('.story-figure img').alt"), 'Wide harbour');
    assert.equal(await inspectConverted("doc.querySelector('figcaption').textContent"), 'The harbour wall.');
    assert.equal(await inspectConverted("doc.querySelectorAll('.chat li').length"), 0);
    await until(async () => await inspectConverted("doc.querySelectorAll('.chat li').length") === 1);
    await inspectConverted("doc.documentElement.style.width = '320px'");
    const narrow = await inspectConverted("(() => { const area=doc.getElementById('beat'), image=doc.querySelector('.story-figure img'); return {area:area.clientWidth, overflow:area.scrollWidth-area.clientWidth, image:image.getBoundingClientRect().width, right:image.getBoundingClientRect().right-area.getBoundingClientRect().right}; })()");
    assert.ok(narrow.area <= 320 && narrow.overflow <= 1 && narrow.right <= 1, JSON.stringify(narrow));
    await inspectConverted("doc.getElementById('replay').click()");
    assert.equal(await inspectConverted("doc.querySelectorAll('.story-figure').length"), 0);
    await until(async () => await inspectConverted("doc.querySelectorAll('.story-figure img').length") === 1);
    await inspectConverted("doc.documentElement.style.width = ''");
    const portraitSource = 'Portrait probe\n\n![Tall tower](assets/harbour-portrait.png)\n\n*Caption: The landing.*\n\nA small print ![Harbour detail](assets/harbour-detail.jpg) remained nearby.';
    await request('edit', portraitSource);
    await until(async () => (await inspectConverted("doc.querySelector('#beat')?.textContent"))?.includes('Portrait probe'));
    assert.equal(await inspectConverted("doc.querySelector('.story-figure img')?.naturalHeight"), 560);
    assert.equal(await inspectConverted("doc.querySelector('.story-inline-image')?.naturalWidth"), 360);
    assert.equal(await inspectConverted("doc.querySelectorAll('.prose').length"), 2);
    await sleep(2200);
    assert.equal(await inspectConverted("doc.querySelectorAll('.chat li').length"), 0); // No callback from the abandoned image beat.
    const brokenSource = 'Broken image probe\n\n![Missing harbour](assets/missing.png)\n\n```chat\nA: Continue.\n```';
    await request('edit', brokenSource);
    await until(async () => (await inspectConverted("doc.querySelector('#beat')?.textContent"))?.includes('Broken image probe'));
    assert.ok((await inspectConverted("doc.querySelector('.image-placeholder')?.textContent")).includes('Missing harbour'));
    assert.ok((await inspectConverted("doc.getElementById('warnings').textContent")).includes('missing or unreadable'));
    await inspectConverted("doc.getElementById('play').click()");
    await until(async () => await inspectConverted("doc.querySelectorAll('.chat li').length") === 1);
    await request('edit', 'Stale image probe\n\n![Old](assets/harbour-portrait.png)');
    await request('edit', 'Latest image probe\n\nPlain prose only.');
    await until(async () => (await inspectConverted("doc.querySelector('#beat')?.textContent"))?.includes('Latest image probe'));
    assert.equal(await inspectConverted("doc.querySelectorAll('img').length"), 0);
    console.log('PASS: actual VS Code Extension Development Host — accepted playback/conversion regressions; native chat/Pace helpers; delayed WebP, portrait PNG, inline JPEG, narrow image bounds, replay, missing-file fallback and stale-source cancellation.');
    console.log(`Isolated test profile/log: ${directory}`);
    await fs.writeFile(path.join(directory, 'request.json'), JSON.stringify({ id: ++id, action: 'stop' }));
  } finally {
    if (socket) socket.close();
    code.kill('SIGTERM');
    await log.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
