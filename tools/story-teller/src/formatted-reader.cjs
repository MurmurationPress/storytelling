'use strict';
const {graphemes} = require('./typeout.cjs');
const {renderDiagrams} = require('./mermaid-reader.cjs');
const {prepareDocument} = require('./janus-reader.cjs');
// One semantic body: no second SVG tree or duplicate image alternatives. Future
// complete units remain readable to AT, clipped out of visual flow until entry.
const future = (node, hidden) => node.classList.toggle('formatted-future',hidden);
function revealFormatted(progress, block) {
  if (block.document) {
    for (const unit of progress.querySelectorAll('[data-janus-unit]')) future(unit,Number(unit.dataset.janusUnit) >= block.revealCount);
    for (const wrapper of [...progress.querySelectorAll('ul,ol,blockquote,table,.janus-table-scroll,p')].reverse())
      if (!wrapper.hasAttribute('data-janus-unit') && (wrapper.tagName !== 'P' || wrapper.querySelector('[data-janus-unit]')))
        future(wrapper,![...wrapper.querySelectorAll('[data-janus-unit]')].some(unit=>!unit.classList.contains('formatted-future')));
  } else {
    for (const segment of progress.querySelectorAll('[data-story-segment]')) {
      const index=Number(segment.dataset.storySegment), parts=progress.storyParts[index];
      const shown=Math.max(0,Math.min(parts.length,block.revealCount-block.annotation.offsets[index]));
      segment.querySelector('.formatted-shown').textContent=parts.slice(0,shown).join('');
      segment.querySelector('.typeout-unrevealed').textContent=parts.slice(shown).join('');
      segment.dataset.revealed=shown ? 'true':'false';segment.dataset.complete=shown===parts.length ? 'true':'false';
    }
    for (const atomic of progress.querySelectorAll('[data-story-atomic]')) future(atomic,Number(atomic.dataset.storyAtomic) >= block.revealCount);
    for (const wrapper of [...progress.querySelectorAll('p,li,blockquote,pre,thead,tr,table,.janus-table-scroll')].reverse()) {
      if(wrapper.closest('[data-story-atomic]'))continue;
      future(wrapper,!wrapper.querySelector('[data-revealed="true"], [data-story-atomic]:not(.formatted-future)'));
    }
  }
  for (const focus of progress.querySelectorAll('[tabindex],button.wiki-link')) {
    const hidden=Boolean(focus.closest('.formatted-future'));
    if(hidden){focus.tabIndex=-1;focus.setAttribute('aria-disabled','true');}
    else {focus.tabIndex=0;focus.removeAttribute('aria-disabled');}
  }
}
function createFormattedCache({document,content,header,image,prepareImage,available,changed}) {
  let beat=null,run=-1,entries=new Map(), waiting=[];
  function sync(player) {
    if(beat===player.current && run===player.run)return;
    for(const entry of entries.values()){entry.controller.abort();entry.stage.remove();entry.section.remove();}
    for(const task of waiting)task.resolve();waiting=[];
    entries=new Map();beat=player.current;run=player.run;
  }
  function ensure(player,block) {
    sync(player);if(entries.has(block.line))return entries.get(block.line);
    const controller=new AbortController(), section=document.createElement('section');
    section.className=`typeout typeout-${block.format} formatted-component${block.document ? ' janus-document':''}${block.border===null?'':` typeout-border-${block.border}`}${block.fill===null?'':` typeout-fill-${block.fill}`}`;
    section.dataset.typeoutLine=String(block.line);
    section.setAttribute('aria-label',block.format==='annotation'?'Annotation':block.format==='janus'?'JANUS report':'JANUS internal analysis');
    const heading=header(block,block.document?.titleHtml);if(heading)section.append(heading);
    const surface=document.createElement('div');surface.className='typeout-surface';
    const progress=document.createElement('div');progress.className='typeout-progress formatted-body';progress.storyFormatted=true;
    progress.innerHTML=(block.document || block.annotation).html;
    if(block.annotation) {
      progress.storyParts=block.annotation.segments.map(graphemes);
      for(const segment of progress.querySelectorAll('[data-story-segment]')){
        const complete=document.createElement('span');complete.className='visually-hidden';complete.textContent=segment.textContent;
        const visual=document.createElement('span');visual.className='formatted-text';visual.setAttribute('aria-hidden','true');
        const shown=document.createElement('span');shown.className='formatted-shown';
        const tail=document.createElement('span');tail.className='typeout-unrevealed';tail.textContent=segment.textContent;visual.append(shown,tail);
        segment.replaceChildren(complete,visual);
      }
    }
    for(const node of progress.querySelectorAll('img[data-story-src]'))node.replaceWith(image(node.getAttribute('data-story-src'),node.alt,true));
    surface.append(progress);section.append(surface);
    const stage=document.createElement('div');stage.className='formatted-preparation';stage.setAttribute('aria-hidden','true');stage.inert=true;
    const style=document.defaultView.getComputedStyle(content);
    stage.style.width=`${Math.max(1,content.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight))}px`;
    stage.append(section);document.body.append(stage);
    const entry={section,progress,stage,controller,ready:false,scroll:[]};entries.set(block.line,entry);
    entry.promise=Promise.all([renderDiagrams(progress,()=>{}, {signal:controller.signal}),...[...progress.querySelectorAll('img')].map(node=>prepareImage(node,controller.signal))]).then(()=>{
      if(controller.signal.aborted)return;
      prepareDocument(progress);
      entry.ready=true; section.dataset.mediaReady='true';
      revealFormatted(progress,{...block,revealCount:0});
    }).catch(error=>{console.warn('Story Teller component preparation diagnostic',error);entry.ready=true;revealFormatted(progress,{...block,revealCount:0});}).finally(()=>{if(!controller.signal.aborted)changed();});
    return entry;
  }
  return {
    sync,
    prepare(player,block){sync(player);if(!available())return new Promise(resolve=>waiting.push({block,resolve}));return ensure(player,block).promise;},
    prefetch(player){sync(player);if(!available()){for(const [key,e] of entries)if(!e.ready){e.controller.abort();e.stage.remove();entries.delete(key);}return;}for(const block of player.current?.blocks || [])if(block.hasMedia)ensure(player,block);const tasks=waiting;waiting=[];for(const task of tasks)task.resolve(ensure(player,task.block).promise);},
    capture(){for(const e of entries.values())e.scroll=[...e.section.querySelectorAll('.diagram-surface,.janus-table-scroll')].map(node=>({node,left:node.scrollLeft,top:node.scrollTop}));},
    append(player,block){const e=ensure(player,block);if(!e.ready)return false;content.append(e.section);e.stage.remove();revealFormatted(e.progress,block);for(const s of e.scroll){s.node.scrollLeft=s.left;s.node.scrollTop=s.top;}return true;},
    dispose(){for(const task of waiting)task.resolve();waiting=[];for(const e of entries.values()){e.controller.abort();e.stage.remove();}entries.clear();}
  };
}
module.exports={revealFormatted,createFormattedCache};
