'use strict';
const { parseScene } = require('./parser.cjs');
const { StoryPlayer } = require('./player.cjs');
const api = acquireVsCodeApi();
const player = new StoryPlayer(undefined, { onChange: render });
let presented = true;
let revision = -1;
let sourceUri = '';
const content = document.getElementById('beat');
const status = document.getElementById('status');
const warnings = document.getElementById('warnings');
function render() {
  content.replaceChildren();
  const beat = player.current;
  if (!beat) content.textContent = 'No story beats yet. Add prose or a chat block in the Markdown document.';
  for (const block of player.visibleBlocks) {
    if (block.type === 'prose') {
      const section = document.createElement('section');
      section.className = 'prose';
      // Only our configured, HTML-disabled Markdown renderer produces this HTML.
      section.innerHTML = block.html;
      content.append(section);
    } else {
      if (block.title) {
        const heading = document.createElement('h2');
        heading.className = 'chat-title';
        heading.textContent = block.title;
        content.append(heading);
      }
      const list = document.createElement('ol');
      list.className = 'chat';
      list.setAttribute('aria-label', block.title || 'Conversation');
      for (const message of block.messages) {
        const item = document.createElement('li');
        const speaker = document.createElement('strong');
        speaker.textContent = message.speaker;
        const text = document.createElement('p');
        text.textContent = message.text;
        item.append(speaker, text);
        if (message.speaker === block.viewer) item.className = 'outgoing';
        if (message.status) {
          const ticks = document.createElement('span');
          ticks.className = `ticks ${message.status}`;
          ticks.textContent = message.status === 'read' ? '✓✓' : '✓';
          ticks.setAttribute('aria-label', `Authored status: ${message.status}`);
          item.append(ticks);
        }
        list.append(item);
      }
      content.append(list);
      if (block.responding) {
        const indicator = document.createElement('p');
        indicator.className = 'responding';
        indicator.setAttribute('role', 'status');
        indicator.textContent = `${block.responding} is responding…`;
        content.append(indicator);
      }
    }
  }
  status.textContent = beat ? `Beat ${player.index + 1} of ${player.scene.beats.length} · ${player.phase}` : 'No beats';
  warnings.textContent = player.scene.diagnostics.join('\n');
  document.getElementById('previous').disabled = player.index === 0;
  document.getElementById('next').disabled = !beat || player.index >= player.scene.beats.length - 1;
  document.getElementById('restart').disabled = !beat;
  document.getElementById('play').disabled = !beat || player.phase !== 'ready' || !presented || document.hidden;
  document.getElementById('pause').disabled = !['playing', 'paused'].includes(player.phase) || !presented || document.hidden;
  document.getElementById('pause').textContent = player.phase === 'paused' ? 'Resume' : 'Pause';
  document.getElementById('replay').disabled = !beat || !presented || document.hidden;
  if (sourceUri) api.setState({ sourceUri, index: player.index, raw: player.current?.raw });
}
for (const action of ['previous', 'next', 'restart']) {
  document.getElementById(action).addEventListener('click', () => {
    player[action](); render(); content.scrollTop = 0;
  });
}
document.getElementById('play').addEventListener('click', () => { if (presented && !document.hidden) player.play(); });
document.getElementById('pause').addEventListener('click', () => {
  if (!presented || document.hidden) return;
  if (player.phase === 'playing') player.pause(); else player.play();
});
document.getElementById('replay').addEventListener('click', () => { if (presented && !document.hidden) player.replay(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) player.pause(); render(); });
window.addEventListener('pagehide', () => player.dispose());
window.addEventListener('message', event => {
  const message = event.data;
  if (message?.type === 'presentation' && typeof message.visible === 'boolean') {
    presented = message.visible;
    if (!presented) player.pause();
    render(); return;
  }
  if (message?.type !== 'source' || typeof message.source !== 'string' || !Number.isInteger(message.revision) || message.revision <= revision) return;
  revision = message.revision;
  const first = !sourceUri;
  sourceUri = message.uri;
  player.update(parseScene(message.source));
  const saved = api.getState();
  if (first && saved?.sourceUri === sourceUri && Number.isInteger(saved.index)) {
    const matches = player.scene.beats.map((beat, i) => beat.raw === saved.raw ? i : -1).filter(i => i >= 0);
    const restored = matches.length ? matches.reduce((a, b) => Math.abs(a - saved.index) <= Math.abs(b - saved.index) ? a : b) : saved.index;
    player.index = Math.max(0, Math.min(restored, player.scene.beats.length - 1));
    player.reset();
  }
  render();
});
api.postMessage({ type: 'ready' });
