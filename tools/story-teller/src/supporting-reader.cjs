'use strict';
// Shared reader presentation. Loading, playback and host messaging are injected.
function upgradeLinks(root, links = {}, progressive = false) {
  for (const node of [...root.querySelectorAll('[data-story-target]')]) {
    const segments = [...node.querySelectorAll('[data-story-segment]')];
    if (progressive && segments.some(segment => segment.dataset.complete !== 'true')) continue;
    let button = node;
    if (node.tagName !== 'BUTTON') {
      button = root.ownerDocument.createElement('button'); button.type = 'button'; button.className = 'wiki-link';
      button.dataset.storyTarget = node.dataset.storyTarget;
      button.append(...node.childNodes); node.replaceWith(button);
    }
    const label = button.textContent;
    const error = links[button.dataset.storyTarget]?.error;
    button.classList.toggle('note-unavailable', Boolean(error));
    button.setAttribute('aria-label', error ? `${label} (supporting note unavailable)` : label);
    button.title = error || 'Open supporting note';
  }
}
class SupportingReader {
  constructor({ window, document, content, load, pause, onClose, available = () => true }) {
    Object.assign(this, { window, document, content, load, pause, onClose, available });
    this.links = {}; this.history = []; this.hoverToken = 0; this.panelToken = 0; this.hideTimer = null; this.disposed = false;
    this.preview = document.createElement('aside'); this.preview.id = 'supporting-preview'; this.preview.className = 'supporting-preview';
    this.preview.dataset.storyAside = 'true';
    this.preview.setAttribute('role','tooltip'); this.preview.hidden = true;
    this.dialog = document.createElement('dialog'); this.dialog.className = 'supporting-panel'; this.dialog.dataset.storyAside = 'true'; this.dialog.setAttribute('aria-label','Supporting note');
    const header = document.createElement('header'); this.back = document.createElement('button'); this.back.type = 'button'; this.back.textContent = '← Back'; this.back.disabled = true;
    this.heading = document.createElement('h2'); const close = document.createElement('button'); close.type = 'button'; close.textContent = 'Close'; close.setAttribute('aria-label','Close supporting note');
    header.append(this.back, this.heading, close); this.article = document.createElement('article');
    this.article.tabIndex = 0; this.article.setAttribute('aria-label','Supporting note content'); this.dialog.append(header,this.article); document.body.append(this.preview,this.dialog);
    this.handlers = [];
    const listen = (target,type,fn,options) => { target.addEventListener(type,fn,options); this.handlers.push([target,type,fn,options]); };
    // Touch synthesises mouse/focus events before click. A hover overlay must
    // not replace the tap target; real mouse and keyboard previews still work.
    listen(document,'pointerdown',event=>{this.touchInput=event.pointerType==='touch';if(this.touchInput)this.hideHover();});
    listen(document,'touchstart',()=>{this.touchInput=true;this.hideHover();},{passive:true});
    listen(document,'pointerover',event=>{if(event.pointerType!=='touch')this.touchInput=false;});
    listen(document,'keydown',()=>{this.touchInput=false;});
    listen(document,'mouseover',event=>{ const link=event.target.closest?.('button.wiki-link'); if(!this.touchInput && !this.pointerInPreview && link && !link.contains(event.relatedTarget)) this.hover(link); });
    listen(document,'mouseout',event=>{ const link=event.target.closest?.('button.wiki-link'); if(link && !link.contains(event.relatedTarget)) this.scheduleHide(); });
    listen(document,'focusin',event=>{ if(!this.touchInput && event.target.matches?.('button.wiki-link')) this.hover(event.target); });
    listen(document,'focusout',event=>{ if(event.target.matches?.('button.wiki-link')) this.scheduleHide(); });
    listen(this.preview,'mouseenter',()=>{this.pointerInPreview=true;this.cancelHide();});
    listen(this.preview,'mouseleave',()=>{this.pointerInPreview=false;this.scheduleHide();});
    listen(document,'click',event=>{ const link=event.target.closest?.('button.wiki-link'); if(link) { event.preventDefault(); void this.open(link); } });
    listen(close,'click',()=>this.close());
    listen(this.back,'click',()=>{ if(this.history.length>1) { this.history.pop(); void this.showPanel(true); } });
    listen(this.dialog,'cancel',event=>{event.preventDefault();this.close();});
    listen(this.dialog,'click',event=>{
      if(event.target!==this.dialog)return;
      const rect=this.dialog.getBoundingClientRect();
      if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)this.close();
    });
    listen(document,'keydown',event=>{if(event.key==='Escape'&&!this.dialog.open)this.hideHover();});
    listen(this.article,'scroll',()=>this.position(),{passive:true});
    listen(window,'resize',()=>this.position(true)); listen(window,'scroll',()=>this.position(),{passive:true});
  }
  key(link) {
    const scope=this.dialog.contains(link)?this.article:this.content;
    const target=link.dataset.storyTarget;
    return { target, occurrence:[...scope.querySelectorAll('button.wiki-link')].filter(node=>node.dataset.storyTarget===target).indexOf(link), panel:scope===this.article };
  }
  find(key) {
    return [...(key.panel?this.article:this.content).querySelectorAll('button.wiki-link')].filter(node=>node.dataset.storyTarget===key.target)[key.occurrence];
  }
  cancelHide() { if(this.hideTimer!==null)this.window.clearTimeout(this.hideTimer);this.hideTimer=null; }
  scheduleHide() { this.cancelHide();this.hideTimer=this.window.setTimeout(()=>this.hideHover(),180); }
  hideHover() {
    this.cancelHide();this.hoverToken++;this.preview.hidden=true;this.pointerInPreview=false;this.preview.style.maxHeight='';
    if(this.anchor)this.find(this.anchor)?.removeAttribute('aria-describedby');this.anchor=null;
  }
  async hover(link, refresh = false) {
    if (this.available?.() === false) return;
    if(!refresh)this.cancelHide();
    if(this.anchor && this.find(this.anchor)===link && !this.preview.hidden && !refresh)return;
    if(!refresh) {
      this.hideHover(); this.anchor=this.key(link);
      const parent=this.anchor.panel?this.dialog:this.document.body;
      if(this.preview.parentNode!==parent)parent.append(this.preview);
      this.preview.textContent='Loading supporting note…';this.preview.hidden=false;link.setAttribute('aria-describedby',this.preview.id);this.position();
    }
    const token=++this.hoverToken;
    try {
      const note=await this.load(link.dataset.storyTarget);
      if(token!==this.hoverToken||this.disposed)return;
      const full=this.noteContent(note), excerpt=this.document.createDocumentFragment();let length=0;
      for(const child of [...full.childNodes]) { excerpt.append(child);length+=child.textContent.length;if(length>650)break; }
      // Tooltip is read-only; nested links are available in the reading panel.
      for(const button of excerpt.querySelectorAll('button'))button.replaceWith(this.document.createTextNode(button.textContent));
      this.preview.replaceChildren(excerpt);this.position();
    } catch(error) { if(token===this.hoverToken) {this.preview.textContent=error.message;this.position();} }
  }
  position(force=false) {
    if(this.preview.hidden||!this.anchor||this.pointerInPreview&&!force)return;
    this.preview.style.maxHeight='';
    const link=this.find(this.anchor);if(!link){this.hideHover();return;}
    const rect=link.getBoundingClientRect(), width=Math.min(340,this.window.innerWidth-24);
    this.preview.style.width=`${width}px`;
    const height=this.preview.getBoundingClientRect().height;
    this.preview.style.left=`${Math.max(12,Math.min(rect.left,this.window.innerWidth-width-12))}px`;
    // Keep the originating link clickable, even when a long preview must flip
    // above it or shrink to the available side of a narrow viewport.
    const below=Math.max(0,this.window.innerHeight-rect.bottom-20), above=Math.max(0,rect.top-20);
    const useBelow=height<=below || (height>above && below>=above);
    const available=useBelow?below:above;
    this.preview.style.maxHeight=`min(17rem, ${available}px)`;
    const shown=Math.min(height,available);
    this.preview.style.top=`${Math.max(12,useBelow?rect.bottom+8:rect.top-shown-8)}px`;
  }
  noteContent(note) {
    const section=this.document.createElement('section');
    if(note.error) {section.textContent=note.error;return section;}
    section.innerHTML=note.html; // Only the HTML-disabled shared Markdown renderer.
    for(const image of section.querySelectorAll('img[data-story-src]')) {
      const src=image.dataset.storySrc, media=note.media?.[src];
      if(media?.url&&!media.error) {
        image.src=media.url;image.removeAttribute('data-story-src');
        image.addEventListener('error',()=>{const text=this.document.createElement('span');text.textContent=`[Image unavailable: ${image.alt}]`;image.replaceWith(text);},{once:true});
      } else {const text=this.document.createElement('span');text.className='image-placeholder';text.textContent=`[Image unavailable: ${image.alt}${media?.error?' — '+media.error:''}]`;image.replaceWith(text);}
    }
    upgradeLinks(section,note.links);
    if(note.diagnostics?.length) {const warning=this.document.createElement('p');warning.className='supporting-warning';warning.textContent=note.diagnostics.join('\n');section.append(warning);}
    return section;
  }
  async open(link) {
    if (this.available?.() === false) return;
    const nested=this.dialog.open && this.dialog.contains(link);
    if(!nested) {
      this.returnFocus=this.key(link);this.pause();this.history=[];this.back.disabled=true;
      this.dialog.showModal();
    } else if(this.history.length)this.history.at(-1).scroll=this.article.scrollTop;
    this.hideHover();this.history.push({target:link.dataset.storyTarget,scroll:0});await this.showPanel();
  }
  async showPanel(preserve=false) {
    const current=this.history.at(-1);if(!current)return;
    const token=++this.panelToken;this.heading.textContent=current.target;this.back.disabled=this.history.length<2;
    this.article.textContent='Loading supporting note…';
    try {
      const note=await this.load(current.target);
      if(token!==this.panelToken||!this.dialog.open||this.disposed)return;
      this.heading.textContent=note.title||current.target;this.article.replaceChildren(this.noteContent(note));this.article.scrollTop=preserve?current.scroll:0;
    } catch(error) {if(token===this.panelToken&&this.dialog.open)this.article.textContent=error.message;}
  }
  close(restoreFocus=true) {
    this.hideHover();this.panelToken++;
    if(!this.dialog.open)return;
    this.dialog.close();this.history=[];this.onClose();
    if(restoreFocus)this.find(this.returnFocus)?.focus({preventScroll:true});
  }
  reset() {this.close(false);this.hideHover();this.panelToken++;this.history=[];this.article.replaceChildren();this.heading.textContent='';this.preview.replaceChildren();}
  afterRender() {upgradeLinks(this.content,this.links,true);for(const link of this.content.querySelectorAll('button.wiki-link'))link.disabled=this.available?.()===false;if(this.anchor&&!this.anchor.panel)this.position();}
  refresh(links) {
    this.links=links;this.afterRender();
    if(this.dialog.open&&this.history.length){this.history.at(-1).scroll=this.article.scrollTop;void this.showPanel(true);}
    else if(this.anchor){const link=this.find(this.anchor);if(link)void this.hover(link,true);else this.hideHover();}
  }
  dispose() {this.reset();this.disposed=true;for(const args of this.handlers)args[0].removeEventListener(...args.slice(1));this.preview.remove();this.dialog.remove();}
}
module.exports={ upgradeLinks, SupportingReader };
