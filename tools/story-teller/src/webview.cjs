'use strict';
const { parseScene } = require('./parser.cjs');
const { StoryPlayer } = require('./player.cjs');
const api = acquireVsCodeApi();
const player = new StoryPlayer(undefined, { onChange: render });
let presented = true;
let revision = -1;
let incomingRevision = -1;
let sourceUri = '';
let media = Object.create(null);
let mediaDiagnostics = [];
let preparing = false;
const content = document.getElementById('beat');
const status = document.getElementById('status');
const warnings = document.getElementById('warnings');
function imageElement(src, alt, inline = false) {
  const image = document.createElement('img');
  image.alt = alt;
  image.className = inline ? 'story-inline-image' : 'story-image';
  image.src = media[src].url;
  image.addEventListener('error', () => {
    if (!image.isConnected) return;
    const placeholder = document.createElement('span');
    placeholder.className = 'image-placeholder';
    placeholder.textContent = `[Image unavailable: ${alt || src}]`;
    image.replaceWith(placeholder);
    if (!mediaDiagnostics.includes(`Image ${src}: could not display image`)) mediaDiagnostics.push(`Image ${src}: could not display image`);
    warnings.textContent = [...player.scene.diagnostics, ...mediaDiagnostics].join('\n');
  }, { once: true });
  return image;
}
function imageOrPlaceholder(src, alt, inline = false) {
  const entry = media[src];
  if (entry?.url && !entry.error) return imageElement(src, alt, inline);
  const placeholder = document.createElement('span');
  placeholder.className = 'image-placeholder';
  placeholder.textContent = `[Image unavailable: ${alt || src || 'missing path'}${entry?.error ? ` — ${entry.error}` : ''}]`;
  return placeholder;
}
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
      for (const image of section.querySelectorAll('img[data-story-src]')) {
        image.replaceWith(imageOrPlaceholder(image.getAttribute('data-story-src'), image.alt, true));
      }
      content.append(section);
    } else if (block.type === 'image') {
      const figure = document.createElement('figure');
      figure.className = 'story-figure';
      figure.append(imageOrPlaceholder(block.src, block.alt));
      if (block.caption) {
        const caption = document.createElement('figcaption');
        caption.textContent = block.caption;
        figure.append(caption);
      }
      content.append(figure);
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
  status.textContent = preparing ? 'Preparing local images…' : beat ? `Beat ${player.index + 1} of ${player.scene.beats.length} · ${player.phase}` : 'No beats';
  warnings.textContent = [...player.scene.diagnostics, ...mediaDiagnostics].join('\n');
  document.getElementById('previous').disabled = preparing || player.index === 0;
  document.getElementById('next').disabled = preparing || !beat || player.index >= player.scene.beats.length - 1;
  document.getElementById('restart').disabled = preparing || !beat;
  document.getElementById('play').disabled = preparing || !beat || player.phase !== 'ready' || !presented || document.hidden;
  document.getElementById('pause').disabled = preparing || !['playing', 'paused'].includes(player.phase) || !presented || document.hidden;
  document.getElementById('pause').textContent = player.phase === 'paused' ? 'Resume' : 'Pause';
  document.getElementById('replay').disabled = preparing || !beat || !presented || document.hidden;
  if (sourceUri && !preparing) api.setState({ sourceUri, index: player.index, raw: player.current?.raw });
}
function preload(url) {
  return new Promise(resolve => {
    const image = new Image();
    let settled = false;
    const finish = error => {
      if (settled) return;
      settled = true; clearTimeout(timeout);
      image.onload = image.onerror = null;
      resolve(error);
    };
    const timeout = setTimeout(() => finish('image load timed out'), 5000);
    image.onload = () => finish(null);
    image.onerror = () => finish('could not display image');
    image.src = url;
  });
}
for (const action of ['previous', 'next', 'restart']) {
  document.getElementById(action).addEventListener('click', () => {
    player[action](); render(); content.scrollTop = 0;
  });
}
document.getElementById('play').addEventListener('click', () => { if (!preparing && presented && !document.hidden) player.play(); });
document.getElementById('pause').addEventListener('click', () => {
  if (preparing || !presented || document.hidden) return;
  if (player.phase === 'playing') player.pause(); else player.play();
});
document.getElementById('replay').addEventListener('click', () => { if (!preparing && presented && !document.hidden) player.replay(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) player.pause(); render(); });
window.addEventListener('pagehide', () => player.dispose());
window.addEventListener('message', async event => {
  const message = event.data;
  if (message?.type === 'source-pending' && Number.isInteger(message.revision) && message.revision > incomingRevision) {
    incomingRevision = message.revision;
    player.reset(); // Stop current timers before the host reads and validates local files.
    preparing = true; render(); return;
  }
  if (message?.type === 'presentation' && typeof message.visible === 'boolean') {
    presented = message.visible;
    if (!presented) player.pause();
    render(); return;
  }
  if (message?.type !== 'source' || typeof message.source !== 'string' || !Number.isInteger(message.revision) || message.revision < incomingRevision || message.revision <= revision) return;
  incomingRevision = message.revision;
  player.reset(); // The pending message already cancelled playback; this also covers a missing pending message.
  preparing = true; render();
  const prepared = Object.create(null);
  const entries = Object.entries(message.media || {});
  await Promise.all(entries.map(async ([src, entry]) => {
    prepared[src] = { ...entry };
    if (entry.url) prepared[src].error = await preload(entry.url);
  }));
  if (message.revision !== incomingRevision || player.disposed) return;
  revision = message.revision;
  media = prepared;
  mediaDiagnostics = [...(message.mediaDiagnostics || [])];
  for (const [src, entry] of Object.entries(media)) if (entry.error && !(message.mediaDiagnostics || []).some(line => line.includes(`Image ${src}:`))) mediaDiagnostics.push(`Image ${src}: ${entry.error}`);
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
  preparing = false;
  render();
});
api.postMessage({ type: 'ready' });
