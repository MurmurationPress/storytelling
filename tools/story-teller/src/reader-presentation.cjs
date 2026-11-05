'use strict';
const { renderDiagrams } = require('./mermaid-reader.cjs');
const { matterScene } = require('./matter-presentation.cjs');
const { parseScene } = require('./parser.cjs');
const { beatAtOffset } = require('./structure.cjs');
const { readerSpeed } = require('./reader-speed.cjs');
const { StoryPlayer } = require('./player.cjs');
const { TypeoutSound } = require('./sound.cjs');
const { createFormattedCache, revealFormatted } = require('./formatted-reader.cjs');
const { prepareDocument, revealDocument } = require('./janus-reader.cjs');
const { graphemes } = require('./typeout.cjs');
const { SceneAutoplay, currentReaderMessage } = require('./scene-navigation.cjs');
const { SupportingReader } = require('./supporting-reader.cjs');
const { ScrollFollower } = require('./follow.cjs');
function createReader(api) {
const sceneAutoplay = new SceneAutoplay();
let needsAudioGesture = false;
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
const player = new StoryPlayer(undefined, { onChange: render, reducedMotion: motion.matches, playbackSpeed: readerSpeed(api.getState()?.playbackSpeed), prepareTypeout: block => formattedCache.prepare(player,block) });
const sound = new TypeoutSound();
let muted = Boolean(api.getState()?.muted);
let autoplayOnTurn = api.getState()?.autoplayOnTurn !== false;
let lastTypeoutRender = null;
let diagramContext = null;
let presented = false;
let presentationEpoch = -1;
let revision = -1;
let incomingRevision = -1;
let pendingDeparture = 0;
let sourceUri = '';
let sourceIdentity;
let readingSource = 'restore', readingMode = 'manual', readingInteraction = false;
let media = Object.create(null);
let mediaDiagnostics = [];
let preparing = false;
let sourcePreparation = null;
let isMatter = false;
let sceneTitle = '', hideMatchingHeading = false;
let documentNavigation = {};
let pacingWarning = null;
let pacingLabel = 'Off (unchanged default)';
let lastEndTurnAt = -Infinity;
let supportingDiagnostics = [];
let supportingVersion = -1, noteRequest = 0;
const noteRequests = new Map();
const content = document.getElementById('beat');
const status = document.getElementById('status');
const warnings = document.getElementById('warnings');
const follower = new ScrollFollower({ window, document, content, nav: document.querySelector('nav'),
  button: document.getElementById('follow-story'), reducedMotion: () => motion.matches });
const formattedCache = createFormattedCache({document,content,available:()=>presented&&!document.hidden&&content.clientWidth>0,header:componentHeader,image:imageOrPlaceholder,prepareImage:(node,signal)=>preload(node.src,signal,node),changed:()=>render()});
document.addEventListener('story-diagram-diagnostic', event => {
  if (!event.detail.document) event.detail.document = sourceUri;
  api.postMessage({ type: 'diagram-diagnostic', instance: document.body.dataset.readerInstance, revision, diagnostic: event.detail });
});
const notes = new SupportingReader({ window, document, content,
  available: () => !preparing && presented && !document.hidden,
  load(target) {
    return new Promise((resolve, reject) => {
      const request = ++noteRequest;
      noteRequests.set(request, { resolve, reject });
      api.postMessage({ type: 'supporting-load', instance: document.body.dataset.readerInstance, revision, request, target });
    });
  },
  pause() { sceneAutoplay.cancel(); follower.setActive(false); player.pause(); sound.stop(); },
  onClose() { follower.setActive(presented && !document.hidden); }
});
function resetNotes() {
  notes.reset();
  for (const request of noteRequests.values()) request.reject(Error('The scene changed'));
  noteRequests.clear();
}
function controls() {
  const beat = player.current;
  const active = player.activeTypeout;
  const statusText = (player.waitingTypeout !== null || player.revealingBeat) ? 'Preparing component media…' : isMatter && !preparing ? 'Book matter · fully displayed' : preparing ? 'Preparing local images…' : beat ? `Beat ${player.index + 1} of ${player.scene.beats.length}${!api.compactHeader && beat.title ? ` · ${beat.title}` : ''} · ${player.phase} · ${api.compactHeader ? 'Prose pacing' : 'prose pacing'} ${pacingLabel}` : 'No beats';
  if (status.textContent !== statusText) status.textContent = statusText;
  warnings.textContent = [...player.scene.diagnostics, ...mediaDiagnostics, ...supportingDiagnostics, ...(pacingWarning ? [pacingWarning] : []),
    ...(sound.unavailable && beat?.blocks.some(block => block.type === 'typeout' && block.sound !== 'none') ? [`Sound unavailable (${sound.failure?.phase}: ${sound.failure?.name}: ${sound.failure?.message}; context ${sound.failure?.contextState || 'unavailable'}); visual reveal continues.`] : [])].join('\n');
  document.getElementById('previous').disabled = preparing || (player.index === 0 && !documentNavigation.previous);
  document.getElementById('next').disabled = preparing || !beat || (isMatter ? !documentNavigation.next : player.index >= player.scene.beats.length - 1);
  if (!api.compactControls) document.getElementById('next').textContent = isMatter ? 'Continue →' : 'Next';
  for (const id of ['restart','play','pause','replay','mute','enable-sound']) document.getElementById(id).hidden = isMatter;
  document.getElementById('restart').disabled = preparing || !beat;
  document.getElementById('play').disabled = preparing || !beat || player.phase !== 'ready' || player.revealingBeat || !presented;
  document.getElementById('pause').disabled = preparing || !['playing', 'paused'].includes(player.phase) || !presented;
  document.getElementById('pause').textContent = player.phase === 'paused' ? 'Resume' : 'Pause';
  document.getElementById('replay').disabled = preparing || !beat || !presented;
  const reveal = document.getElementById('reveal');
  reveal.hidden = api.compactControls ? false : !(active || player.activeMessage);
  reveal.disabled = preparing || !presented || (api.compactControls ? isMatter || !beat || player.phase === 'completed' : !(active || player.activeMessage));
  const mute = document.getElementById('mute');
  mute.textContent = muted ? 'Unmute sound' : 'Mute sound'; mute.setAttribute('aria-pressed', String(muted));
  document.getElementById('enable-sound').hidden = isMatter || !needsAudioGesture || muted || player.reducedMotion || sound.unavailable || sound.context?.state === 'running';
  document.getElementById('playback-speed').value = String(player.playbackSpeed);
  document.getElementById('autoplay').checked = autoplayOnTurn;
  document.getElementById('show-source').disabled = preparing || !beat;
  document.getElementById('show-source').hidden = api.showSource === false;
  sound.sync(!preparing && presented && !document.hidden && !muted && !player.reducedMotion && player.phase === 'playing' && player.waitingTypeout === null ? active?.block.sound : null);
  if (!preparing && presented && !document.hidden && !isMatter && api.onReading) {
    const blocks = player.visibleBlocks;
    const visible = blocks.some(block => ['prose', 'image'].includes(block.type) || (block.type === 'typeout' ? block.revealCount > 0 : block.messages?.length > 0));
    const fullyDisplayed = blocks.length > 0 && blocks.length === player.current?.blocks.length && blocks.every((block, index) =>
      block.type === 'chat' ? block.messages.length === player.current.blocks[index].messages.length : block.type === 'typeout' ? block.complete : true);
    api.onReading({ sceneId: sourceUri, index: player.index, count: player.scene.beats.length, visible, completed: fullyDisplayed,
      source: readingSource, mode: readingMode, interaction: readingInteraction });
  }
  api.onControls?.({ phase: player.phase, preparing, presented, isMatter, muted });
  if (sourceUri && !preparing) api.setState({ sourceUri, sourceIdentity, index: player.index, raw: player.current?.raw, muted, autoplayOnTurn, playbackSpeed: player.playbackSpeed });
}
function imageElement(src, alt, inline = false) {
  const image = document.createElement('img');
  image.alt = alt;
  image.className = inline ? 'story-inline-image' : 'story-image';
  if(media[src].width && media[src].height){image.width=media[src].width;image.height=media[src].height;}
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
function revealAnnotation(progress, count) {
  let remaining = count;
  for (const segment of progress.querySelectorAll('[data-story-segment]')) {
    const parts = progress.storyParts[Number(segment.dataset.storySegment)];
    const shown = Math.min(remaining, parts.length);
    remaining -= shown;
    segment.firstChild.textContent = parts.slice(0, shown).join('');
    segment.lastChild.textContent = parts.slice(shown).join('');
    segment.dataset.revealed = shown ? 'true' : 'false';
    segment.dataset.complete = shown === parts.length ? 'true' : 'false';
  }
  // Hidden future list items must not show bullets; the same rule hides
  // empty future paragraphs and quote borders without changing their layout.
  for (const block of progress.querySelectorAll('p, li, blockquote, pre'))
    block.style.visibility = block.querySelector('[data-revealed="true"]') ? '' : 'hidden';
}
function refreshDocumentLinks() {
  notes.afterRender();
  for(const target of content.querySelectorAll('.formatted-component button.wiki-link,.formatted-component [tabindex]')) {
    if(target.closest('.formatted-future')) {target.tabIndex=-1;target.setAttribute('aria-disabled','true');if(target.tagName==='BUTTON')target.disabled=true;}
    else {target.tabIndex=0;target.removeAttribute('aria-disabled');}
  }
  // The complete reading copy provides keyboard/screen-reader links. Visual
  // links still accept pointer input, without a second hidden tab sequence.
  for (const link of content.querySelectorAll('.janus-document:not(.formatted-component) .typeout-progress button.wiki-link')) link.tabIndex = -1;
}
function componentHeader(block, legacyTitleHtml = null) {
  const titleHtml = block.titleHtml ?? legacyTitleHtml;
  if (titleHtml == null && block.timestampHtml == null) return null;
  const header = document.createElement('header'); header.className = 'component-header';
  if (titleHtml != null) {
    const heading = document.createElement('h2'); heading.className = 'component-title';
    heading.innerHTML = titleHtml; header.append(heading);
  }
  if (block.timestampHtml != null) {
    const timestamp = document.createElement('p'); timestamp.className = 'component-timestamp';
    timestamp.innerHTML = block.timestampHtml; header.append(timestamp);
  }
  return header;
}
function render() {
  formattedCache.sync(player);
  if(preparing){lastTypeoutRender=null;content.replaceChildren();controls();return;}
  formattedCache.prefetch(player);
  const focusedLink = document.activeElement?.matches?.('button.wiki-link') && content.contains(document.activeElement) ? notes.key(document.activeElement) : null;
  const active = player.activeTypeout;
  if (active && lastTypeoutRender?.scene === player.scene && lastTypeoutRender.index === player.index && lastTypeoutRender.blockIndex === active.blockIndex) {
    const progress = content.querySelector(`[data-typeout-line="${active.block.line}"] .typeout-progress`);
    if (progress) {
      const shown = player.visibleBlocks.find(block => block.type === 'typeout' && block.line === active.block.line);
      if (progress.storyFormatted) revealFormatted(progress,shown);
      else if (shown?.document) revealDocument(progress, shown.revealCount);
      else if (shown?.format === 'annotation') revealAnnotation(progress, shown.revealCount);
      else progress.textContent = shown?.visibleText || '';
      progress.classList.toggle('active', player.phase === 'playing' && !player.reducedMotion);
      refreshDocumentLinks(); controls(); follower.changed(); return;
    }
  }
  lastTypeoutRender = null;
  const diagramKey = `${sourceUri}:${revision}:${player.index}`;
  const retainedDiagrams = diagramContext === diagramKey ? [...content.querySelectorAll('.story-diagram')] : [];
  diagramContext = diagramKey;
  const retainedDocuments = new Map([...content.querySelectorAll('[data-janus-line]')].map(node => {
    // Detaching even a retained node can reset nested scrolling in Chromium.
    node.storyScroll = [...node.querySelectorAll('.janus-table-scroll, .janus-accessible')]
      .map(surface => ({ surface, left: surface.scrollLeft, top: surface.scrollTop }));
    return [node.dataset.janusLine, node];
  }));
  formattedCache.capture();
  content.replaceChildren();
  const beat = player.current;
  if (!beat) content.textContent = 'No story beats yet. Add prose or a chat block in the Markdown document.';
  let openingTitle = player.index === 0 && hideMatchingHeading;
  for (const block of player.visibleBlocks) {
    if (block.type === 'prose') {
      const section = document.createElement('section');
      section.className = 'prose';
      // Only our configured, HTML-disabled Markdown renderer produces this HTML.
      section.innerHTML = block.html;
      if (openingTitle) {
        const heading = section.firstElementChild;
        const text = value => value.replace(/\s+/gu, ' ').trim();
        // Move only a redundant title's presentation. Preserve semantic links,
        // different headings, source wording and all timing/parser steps.
        if (heading?.tagName === 'H1' && text(heading.textContent) === text(sceneTitle) && !heading.querySelector('[data-story-target],a,img')) heading.remove();
        openingTitle = false;
      }
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
    } else if (block.type === 'typeout') {
      if (block.hasMedia) {
        formattedCache.append(player,block);
        if(active && active.block.line===block.line)lastTypeoutRender={scene:player.scene,index:player.index,blockIndex:active.blockIndex};
        continue;
      }
      if (block.document) {
        let section = retainedDocuments.get(String(block.line));
        if (section?.storyDocument !== block.document) section = null;
        if (!section) {
          section = document.createElement('section');
          section.className = `typeout typeout-${block.format} janus-document${block.border === null ? '' : ` typeout-border-${block.border}`}${block.fill === null ? '' : ` typeout-fill-${block.fill}`}`;
          section.dataset.typeoutLine = String(block.line);
          section.dataset.janusLine = String(block.line); section.storyDocument = block.document;
          const header = componentHeader(block, block.document.titleHtml);
          if (header) section.append(header);
          section.setAttribute('aria-label', block.format === 'janus' ? 'JANUS report' : 'JANUS internal analysis');
          const accessible = document.createElement('div'); accessible.className = 'visually-hidden janus-accessible';
          accessible.innerHTML = block.document.html;
          for (const unit of accessible.querySelectorAll('[data-janus-unit]')) unit.removeAttribute('data-janus-unit');
          const surface = document.createElement('div'); surface.className = 'typeout-surface';
          const progress = document.createElement('div'); progress.className = 'typeout-progress';
          progress.innerHTML = block.document.html;
          // Complete semantic content is available once, without live row announcements.
          for (const child of progress.children) child.setAttribute('aria-hidden', 'true');
          surface.append(progress); section.append(accessible, surface); content.append(section);
          prepareDocument(progress);
        } else content.append(section);
        revealDocument(section.querySelector('.typeout-progress'), block.revealCount);
        for (const position of section.storyScroll || []) {
          position.surface.scrollLeft = position.left; position.surface.scrollTop = position.top;
        }
        delete section.storyScroll;
        if (active && active.block.line === block.line) lastTypeoutRender = { scene: player.scene, index: player.index, blockIndex: active.blockIndex };
        continue;
      }
      const section = document.createElement('section');
      section.className = `typeout typeout-${block.format}${block.border === null ? '' : ` typeout-border-${block.border}`}${block.fill === null ? '' : ` typeout-fill-${block.fill}`}`;
      section.dataset.typeoutLine = String(block.line);
      section.setAttribute('aria-label', block.format === 'yaml' ? 'PRIME state output' : 'Annotation');
      const header = componentHeader(block);
      if (header) section.append(header);
      const accessible = document.createElement(block.format === 'annotation' ? 'div' : 'span');
      accessible.className = 'visually-hidden';
      if (block.format === 'annotation') {
        accessible.innerHTML = block.annotation.html;
        for (const segment of accessible.querySelectorAll('[data-story-segment]')) segment.removeAttribute('data-story-segment');
        for (const link of accessible.querySelectorAll('[data-story-target]')) link.removeAttribute('data-story-target');
      } else accessible.textContent = block.text;
      const surface = document.createElement('div'); surface.className = 'typeout-surface';
      const progress = document.createElement(block.format === 'annotation' ? 'div' : 'pre');
      progress.className = 'typeout-progress'; if (block.format !== 'annotation') progress.setAttribute('aria-hidden', 'true');
      if (block.format === 'annotation') {
        progress.innerHTML = block.annotation.html;
        progress.storyParts = block.annotation.segments.map(graphemes);
        for (const segment of progress.querySelectorAll('[data-story-segment]')) {
          const shown = document.createElement('span');
          const hidden = document.createElement('span'); hidden.className = 'typeout-unrevealed';
          segment.setAttribute('aria-hidden', 'true');
          segment.replaceChildren(shown, hidden);
        }
        revealAnnotation(progress, block.revealCount);
      } else progress.textContent = block.visibleText;
      progress.classList.toggle('active', Boolean(active) && player.phase === 'playing' && !player.reducedMotion);
      if (block.format === 'yaml') {
        const reserve = document.createElement('pre'); reserve.className = 'typeout-reserve'; reserve.setAttribute('aria-hidden', 'true'); reserve.textContent = block.text;
        surface.append(reserve);
      }
      surface.append(progress); section.append(accessible, surface); content.append(section);
      if (active && active.block.line === block.line) lastTypeoutRender = { scene: player.scene, index: player.index, blockIndex: active.blockIndex };
    } else {
      if (block.title) {
        const heading = document.createElement('h2');
        heading.className = 'chat-title';
        if (block.titleHtml) heading.innerHTML = block.titleHtml; else heading.textContent = block.title;
        content.append(heading);
      }
      const list = document.createElement('ol');
      list.className = 'chat';
      list.setAttribute('aria-label', block.title || 'Conversation');
      for (const message of block.messages) {
        const item = document.createElement('li');
        const speaker = document.createElement('strong');
        if (message.speakerHtml) speaker.innerHTML = message.speakerHtml; else speaker.textContent = message.speaker;
        const text = document.createElement('p');
        if (message.html) text.innerHTML = message.html; else text.textContent = message.text;
        item.append(speaker, text);
        if(message.subtext?.trim()) {
          const subtext=document.createElement('p');subtext.className='chat-subtext';
          if(message.subtextHtml)subtext.innerHTML=message.subtextHtml;else subtext.textContent=message.subtext;
          item.append(subtext);
        }
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
  if (!preparing && player.endAction) {
    const ending = document.createElement('div');
    ending.className = 'beat-ending';
    if (player.endAction === 'next') {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = 'Next →';
      button.setAttribute('aria-label', 'Next beat');
      const sourceIndex = player.index;
      button.addEventListener('click', () => {
        // A double click may land on the new beat's end button if that beat
        // completes immediately. Reject stale buttons and the second click.
        if (sourceIndex !== player.index || player.endAction !== 'next' || performance.now() - lastEndTurnAt < 400) return;
        lastEndTurnAt = performance.now();
        turnNext();
      });
      ending.append(button);
    } else {
      if (documentNavigation.next || api.nextScene) {
        const button = document.createElement('button'); button.type='button'; button.textContent=isMatter ? 'Continue →' : 'Next scene →';
        button.addEventListener('click', () => { if (performance.now()-lastEndTurnAt<400)return;lastEndTurnAt=performance.now();turnDocument('next'); });
        ending.append(button);
      } else {
        const label = document.createElement('p');label.className='end-of-scene';label.textContent=isMatter ? 'End of book' : 'End of scene';ending.append(label);
      }
    }
    content.append(ending);
  }
  const candidates = [...retainedDiagrams];
  for (const figure of content.querySelectorAll('.story-diagram')) {
    const index = candidates.findIndex(old => old.dataset.diagramLine === figure.dataset.diagramLine &&
      old.dataset.diagramSource === figure.dataset.diagramSource);
    if (index >= 0) {const old=candidates.splice(index,1)[0];if(old!==figure)figure.replaceWith(old);}
  }
  renderDiagrams(content, () => follower.changed());
  refreshDocumentLinks();
  if (focusedLink) notes.find(focusedLink)?.focus({ preventScroll: true });
  controls();
  follower.changed();
}
function preload(url,signal,target = null) {
  return new Promise(resolve => {
    const image = target || new Image();
    let settled = false;
    const finish = error => {
      if (settled) return;
      settled = true; clearTimeout(timeout);
      image.onload = image.onerror = null; signal?.removeEventListener('abort',abort);
      const result={error,width:image.naturalWidth,height:image.naturalHeight};
      if(error)image.removeAttribute('src');
      resolve(result);
    };
    const abort=()=>finish('image preparation cancelled');
    const timeout = setTimeout(() => finish('image load timed out'), 5000);
    signal?.addEventListener('abort',abort,{once:true});
    if(signal?.aborted){abort();return;}
    image.onload = () => finish(null);
    image.onerror = () => finish('could not display image');
    if(target && image.complete){finish(image.naturalWidth ? null : 'could not display image');return;}
    if(!target)image.src = url;
  });
}
const unlockSound = (beat = player.current) => {
  if (player.reducedMotion !== motion.matches) player.setReducedMotion(motion.matches);
  if (!muted && !player.reducedMotion && beat?.blocks.some(block => block.type === 'typeout' && block.sound !== 'none')) {
    const unlocked = sound.unlock();
    if (unlocked) unlocked.then(() => render());
  }
};
function startSelectedScene() {
  if(presented&&!document.hidden&&player.revealingBeat){player.revealBeat();return;}
  if (sceneAutoplay.take(revision, !preparing && presented && !document.hidden)) player.play();
}
function turnDocument(direction) {
  if (preparing || !presented || document.hidden) return;
  sceneAutoplay.cancel(); sound.stop(); player.pause(); follower.setActive(false); resetNotes();
  if (direction === 'next' && autoplayOnTurn && !muted && !player.reducedMotion) sound.unlock()?.then(render);
  preparing = true; render();
  if (direction === 'next' && api.nextScene) api.nextScene();
  else api.postMessage({ type: 'project-turn', revision, direction });
}
function markInteraction(source) {
  readingSource = source; readingMode = ['reveal', 'previous', 'restart'].includes(source) ? 'manual' : autoplayOnTurn ? 'autoplay' : 'manual'; readingInteraction = true;
}
function turnNext() {
  if (isMatter) { if(documentNavigation.next) turnDocument('next'); return; }
  if (preparing || !presented || document.hidden || player.index >= player.scene.beats.length - 1) return;
  resetNotes(); follower.beginTurn();
  sound.stop();
  if (autoplayOnTurn) unlockSound(player.scene.beats[player.index + 1]);
  markInteraction('next');
  player.next({ autoplay: autoplayOnTurn }); render(); follower.endTurn();
}
document.getElementById('next').addEventListener('click', turnNext);
document.getElementById('previous').addEventListener('click', () => {
  lastEndTurnAt = -Infinity;
  if (preparing || !presented || document.hidden) return;
  if (player.index === 0 && documentNavigation.previous) { turnDocument('previous'); return; }
  markInteraction('previous');
  resetNotes(); follower.beginTurn({ silent: true }); sound.stop(); player.previous(); render(); follower.endTurn();
});
document.getElementById('restart').addEventListener('click', () => {
  if (preparing || !presented || document.hidden) return;
  markInteraction('restart');
  resetNotes(); follower.beginTurn(); sound.stop(); player.restart(); render(); follower.endTurn();
});
document.getElementById('play').addEventListener('click', () => { if (!preparing && presented && !document.hidden) { markInteraction('play'); readingMode = 'autoplay'; unlockSound(); player.play(); } });
document.getElementById('pause').addEventListener('click', () => {
  if (preparing || !presented || document.hidden) return;
  if (player.phase === 'playing') player.pause(); else { markInteraction('play'); readingMode = 'autoplay'; unlockSound(); player.play(); }
});
document.getElementById('replay').addEventListener('click', () => { if (!preparing && presented && !document.hidden) { markInteraction('replay'); readingMode = 'autoplay'; resetNotes(); follower.beginTurn(); sound.stop(); unlockSound(); player.replay(); follower.endTurn(); } });
document.getElementById('reveal').addEventListener('click', () => { if (!preparing && presented && !document.hidden) {
  markInteraction('reveal');
  if (api.compactControls) { sceneAutoplay.cancel(); sound.stop(); player.revealBeat(); }
  else player.revealImmediately();
} });
document.getElementById('enable-sound').addEventListener('click', () => {
  if (!preparing && presented && !document.hidden) { unlockSound(player.scene.beats.find(beat => beat.blocks.some(block => block.type === 'typeout' && block.sound !== 'none'))); render(); }
});
document.getElementById('mute').addEventListener('click', () => {
  muted = !muted; api.postMessage({ type: 'mute-preference', muted });
  if (!muted && player.phase === 'playing') unlockSound(); render();
});
document.getElementById('playback-speed').addEventListener('change', event => {
  player.setPlaybackSpeed(Number(event.target.value));
  api.postMessage({ type: 'speed-preference', playbackSpeed: player.playbackSpeed });
});
document.getElementById('autoplay').addEventListener('change', event => {
  autoplayOnTurn = event.target.checked;
  if (!autoplayOnTurn) sceneAutoplay.cancel();
  api.postMessage({ type: 'autoplay-preference', autoplayOnTurn });
  render();
});
motion.addEventListener('change', event => player.setReducedMotion(event.matches));
function showSource() {
  if (preparing || !player.current) return;
  resetNotes(); sceneAutoplay.cancel();
  const range = player.current.sourceRange;
  follower.beginTurn(); player.reset(); render(); follower.endTurn();
  api.postMessage({ type: 'show-source', uri: sourceUri, revision, index: player.index, startOffset: range.startOffset, endOffset: range.endOffset });
}
document.getElementById('show-source').addEventListener('click', showSource);
document.addEventListener('visibilitychange', () => { follower.setActive(!document.hidden && presented); if (document.hidden) { resetNotes(); sceneAutoplay.leave(); if(player.revealingBeat)player.cancelTimer(); player.pause(); } render(); startSelectedScene(); });
window.addEventListener('pagehide', event => { resetNotes(); if(event.persisted){sceneAutoplay.leave();player.pause();sound.stop();follower.setActive(false);}else{notes.dispose();follower.dispose();player.dispose();sound.dispose();} });
window.addEventListener('pageshow', event=>{if(event.persisted){follower.setActive(!document.hidden&&presented);render();}});
window.addEventListener('beforeunload', () => {sourcePreparation?.abort();formattedCache.dispose();sound.stop();});
api.onMessage(async event => {
  const message = event.data;
  if (message?.type?.startsWith('supporting-') && (message.instance !== document.body.dataset.readerInstance || message.revision !== revision)) return;
  if (message?.type === 'source-error' && message.instance === document.body.dataset.readerInstance && message.revision === incomingRevision) {
    isMatter=false;documentNavigation={};preparing=false;mediaDiagnostics=[message.error];player.update({beats:[],diagnostics:[]});render();return;
  }
  if (message?.type === 'supporting-result') {
    const request = noteRequests.get(message.request);
    if (request) { noteRequests.delete(message.request); message.error ? request.reject(Error(message.error)) : request.resolve(message.note); }
    return;
  }
  if (message?.type === 'supporting-refresh' && message.version > supportingVersion) {
    supportingVersion = message.version; supportingDiagnostics = message.supporting.diagnostics;
    notes.refresh(message.supporting.links); controls(); return;
  }
  if (!currentReaderMessage(document.body.dataset.readerInstance, message)) return;
  if (message?.type === 'show-source-request') { showSource(); return; }
  if (message?.type === 'source-pending' && Number.isInteger(message.revision) && message.revision > incomingRevision) {
    sourcePreparation?.abort();
    incomingRevision = message.revision;
    resetNotes();
    pendingDeparture = sceneAutoplay.departure;
    sceneAutoplay.cancel(); sound.stop();
    follower.beginTurn();
    player.reset(); // Stop current timers before the host reads and validates local files.
    preparing = true; render(); return;
  }
  if (message?.type === 'presentation' && typeof message.visible === 'boolean' && Number.isInteger(message.epoch)) {
    if (message.epoch >= presentationEpoch) {
      if (message.epoch > presentationEpoch) {
        presentationEpoch = message.epoch;
        presented = message.visible;
        follower.setActive(presented && !document.hidden);
        if (!presented) { resetNotes(); sceneAutoplay.leave(); if(player.revealingBeat)player.cancelTimer(); player.pause(); }
        render(); startSelectedScene();
      }
      api.postMessage({ type: 'presentation-ack', epoch: message.epoch });
    }
    return;
  }
  if (message?.type === 'speed-preference') {
    player.setPlaybackSpeed(message.playbackSpeed); return;
  }
  if (message?.type === 'mute-preference' && typeof message.muted === 'boolean') {
    muted = message.muted; render(); return;
  }
  if (message?.type === 'autoplay-preference' && typeof message.autoplayOnTurn === 'boolean') {
    autoplayOnTurn = message.autoplayOnTurn; if (!autoplayOnTurn) sceneAutoplay.cancel(); render(); return;
  }
  if (message?.type !== 'source' || typeof message.source !== 'string' || !Number.isInteger(message.revision) || message.revision < incomingRevision || message.revision <= revision) return;
  resetNotes();
  const departure = message.revision === incomingRevision ? pendingDeparture : sceneAutoplay.departure;
  incomingRevision = message.revision;
  sceneAutoplay.cancel();
  follower.beginTurn({ silent: message.documentPrevious === true || message.matter === true });
  player.reset(); // The pending message already cancelled playback; this also covers a missing pending message.
  preparing = true; render();
  sourcePreparation?.abort(); sourcePreparation = new AbortController();
  const parsedScene = message.matter === true ? matterScene(message.source) : parseScene(message.source,{prosePacing:message.prosePacing===true});
  const preloads = new Map();
  const prepared = Object.create(null);
  const entries = Object.entries(message.media || {});
  await Promise.all(entries.map(async ([src, entry]) => {
    prepared[src] = { ...entry };
    if (entry.url) {
      if(!preloads.has(entry.url))preloads.set(entry.url,preload(entry.url,sourcePreparation.signal));
      Object.assign(prepared[src],await preloads.get(entry.url));
    }
  }));
  if (message.revision !== incomingRevision || player.disposed) return;
  revision = message.revision;
  supportingVersion = message.supportingVersion ?? -1;
  supportingDiagnostics = message.supporting?.diagnostics || [];
  notes.links = message.supporting?.links || {};
  if ('playbackSpeed' in message) player.setPlaybackSpeed(message.playbackSpeed);
  if (typeof message.muted === 'boolean') muted = message.muted;
  if (typeof message.autoplayOnTurn === 'boolean') autoplayOnTurn = message.autoplayOnTurn;
  media = prepared;
  mediaDiagnostics = [...(message.mediaDiagnostics || [])];
  for (const [src, entry] of Object.entries(media)) if (entry.error && !(message.mediaDiagnostics || []).some(line => line.includes(`Image ${src}:`))) mediaDiagnostics.push(`Line ${parsedScene.imageLines?.[src] || '?'}: Image ${src}: ${entry.error}`);
  const first = !sourceUri;
  sourceUri = message.uri;
  sourceIdentity = message.sourceIdentity;
  pacingWarning = message.pacingWarning;
  pacingLabel = `${message.prosePacing ? 'On' : 'Off'} (${message.pacingSource || 'unchanged default'})`;
  isMatter = message.matter === true;
  sceneTitle = typeof message.sceneTitle === 'string' ? message.sceneTitle : '';
  hideMatchingHeading = api.compactHeader === true && message.sceneTitleInBody === true && !isMatter;
  documentNavigation = message.documentNavigation || {};
  player.update(parsedScene);
  const saved = api.getState();
  if (isMatter) { player.revealBeat(); needsAudioGesture = false; } else if (message.documentPrevious === true) { player.index = player.scene.beats.length - 1; player.reset(); player.revealBeat(); needsAudioGesture = false; } else if (message.sceneStart === true) {
    player.index = 0; player.reset();
    needsAudioGesture = player.scene.beats.some(beat => beat.blocks.some(block => block.type === 'typeout' && block.sound !== 'none'));
    sceneAutoplay.arm(revision, autoplayOnTurn && message.sceneAutoplay === true, departure);
  } else if (Number.isInteger(message.targetOffset)) {
    const selected = beatAtOffset(player.scene.beats.map(beat => beat.sourceRange), message.targetOffset);
    if (selected >= 0) { player.index = selected; player.reset(); }
  } else if (first && require('./reader-position.cjs').sameDocument(saved,message) && Number.isInteger(saved.index)) {
    const matches = player.scene.beats.map((beat, i) => beat.raw === saved.raw ? i : -1).filter(i => i >= 0);
    const restored = matches.length ? matches.reduce((a, b) => Math.abs(a - saved.index) <= Math.abs(b - saved.index) ? a : b) : saved.index;
    player.index = Math.max(0, Math.min(restored, player.scene.beats.length - 1));
    player.reset();
  }
  readingSource = message.sceneStart === true ? (message.documentPrevious ? 'previous' : 'scene_selection') : 'restore';
  readingMode = message.sceneStart === true && !message.documentPrevious && autoplayOnTurn ? 'autoplay' : 'manual';
  readingInteraction = message.sceneStart === true;
  preparing = false;
  // A document turn suspends following while its snapshot loads. The browser
  // has no new host presentation event to reactivate it after that turn.
  if (!follower.active && presented && !document.hidden) follower.setActive(true);
  render();
  follower.endTurn();
  startSelectedScene();
});
api.postMessage({ type: 'ready', instance: document.body.dataset.readerInstance });

return { player, sound, prepareAudio() { if(!muted&&!player.reducedMotion) sound.unlock()?.then(render); } };
}
module.exports = { createReader };
