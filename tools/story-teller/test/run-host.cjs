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
  async function request(action, source) {
    await fs.writeFile(path.join(directory, 'request.json'), JSON.stringify({ id: ++id, action, source }));
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
    await frame.locator('#next').click();
    await until(async () => (await frame.locator('#status').textContent()).includes('ready'));
    assert.equal(await frame.locator('.chat li').count(), 0);
    await sleep(500); assert.equal(await frame.locator('.chat li').count(), 0);
    const temporal = [];
    const capture = async label => temporal.push({ label, at: Date.now(), count: await frame.locator('.chat li').count(), status: await frame.locator('#status').textContent() });
    await capture('ready');
    assert.equal(await locator('.chat-title').count(), 0);
    await frame.locator('#play').click();
    assert.equal(await locator('.chat-title').textContent(), 'Lighthouse radio');
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
    const sample = (await fs.readFile(path.join(root, 'samples/lantern.md'), 'utf8'))
      .replace('```chat\nIvo:', '```chat\n@viewer Mara\nIvo:');
    await request('edit', sample.replace('# The Last Lantern', 'Inserted first beat\n---\n# The Last Lantern'));
    await until(async () => (await frame.locator('#status').textContent()).includes('Beat 3 of 4 · ready'));
    assert.equal(await frame.locator('.chat li').count(), 0);
    await request('edit', sample.replace('Only me.', 'Only me, Mara.'));
    await until(async () => (await frame.locator('#status').textContent()).includes('Beat 2 of 3 · ready'));
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
    assert.equal(await frame.locator('#next').isDisabled(), true);
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
      const expression = `Array.from(document.querySelectorAll('.notification-toast .monaco-button')).find(b => b.textContent.trim() === ${JSON.stringify(text)})`;
      await until(async () => await workbench(`Boolean(${expression})`));
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
    console.log('PASS: actual VS Code Extension Development Host — playback regressions; native conversion diff/count/warnings, cancellation, stale refusal/regeneration, unsaved Apply and single Undo.');
    console.log(`Isolated test profile/log: ${directory}`);
    await fs.writeFile(path.join(directory, 'request.json'), JSON.stringify({ id: ++id, action: 'stop' }));
  } finally {
    if (socket) socket.close();
    code.kill('SIGTERM');
    await log.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
