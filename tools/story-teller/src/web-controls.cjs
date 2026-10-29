'use strict';
// Standalone-only disclosure and icon controls. Playback remains owned by createReader.
const icons = {
  previous:'<path d="m14 5-7 7 7 7"/>', next:'<path d="m10 5 7 7-7 7"/>',
  play:'<path d="m8 5 11 7-11 7Z"/>', pause:'<path d="M8 5v14M16 5v14"/>',
  sound:'<path d="M11 4 6 8H3v8h3l5 4Z"/><path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/>',
  muted:'<path d="M11 4 6 8H3v8h3l5 4Z"/><path d="m16 9 6 6m0-6-6 6"/>',
  more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>'
};
function iconButton(button, icon, label) {
  if (button.dataset.icon !== icon) {
    button.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${icons[icon]}</svg>`;
    button.dataset.icon=icon;
  }
  button.setAttribute('aria-label',label);button.title=label;
}
function createWebControls(document, window) {
  const get=id=>document.getElementById(id);
  const toggle=get('playback-toggle'), sound=get('sound-toggle'), more=get('more-toggle'), panel=get('more-options');
  let phase='ready';
  iconButton(get('previous'),'previous','Previous beat');iconButton(get('next'),'next','Next beat');
  iconButton(toggle,'play','Play');iconButton(sound,'sound','Mute sound');iconButton(more,'more','More options');
  function place() {
    if(panel.hidden)return;
    const rect=more.getBoundingClientRect(), width=Math.min(320,window.innerWidth-16);
    panel.style.width=`${width}px`;
    panel.style.left=`${Math.max(8,Math.min(rect.right-width,window.innerWidth-width-8))}px`;
    // Remain usable with short landscape viewports and mobile browser chrome.
    panel.style.maxHeight=`${Math.max(44,window.innerHeight-16)}px`;
    const top=Math.max(8,Math.min(rect.bottom+6,window.innerHeight-panel.getBoundingClientRect().height-8));
    panel.style.top=`${top}px`;
    panel.style.maxHeight=`${Math.max(44,window.innerHeight-top-8)}px`;
  }
  function close(returnFocus=true) {
    if(panel.hidden)return;
    panel.hidden=true;more.setAttribute('aria-expanded','false');
    if(returnFocus)more.focus({preventScroll:true});
  }
  more.addEventListener('click',()=>{
    if(!panel.hidden){close();return;}
    panel.hidden=false;more.setAttribute('aria-expanded','true');place();
    panel.querySelector('button:not([disabled]):not([hidden]),select:not([disabled])')?.focus({preventScroll:true});
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!panel.hidden){event.preventDefault();event.stopPropagation();close();}
  });
  document.addEventListener('pointerdown',event=>{
    if(panel.hidden||panel.contains(event.target)||more.contains(event.target))return;
    // Preserve an intentional click on another control; otherwise restore the trigger.
    const returnFocus=!event.target.closest('button,a,input,select,textarea');
    close(returnFocus);
    if(returnFocus)document.addEventListener('pointerup',()=>more.focus({preventScroll:true}),{once:true});
  });
  document.addEventListener('focusin',event=>{
    if(!panel.hidden&&!panel.contains(event.target)&&event.target!==more)close(false);
  });
  for(const id of ['reveal','replay','restart','enable-sound']) get(id).addEventListener('click',()=>close());
  toggle.addEventListener('click',()=>get(phase==='ready'?'play':'pause').click());
  sound.addEventListener('click',()=>get('mute').click());
  window.addEventListener('resize',place);window.addEventListener('scroll',place,{passive:true});
  return {update(state) {
    phase=state.phase;
    const unavailable=state.preparing||state.isMatter||!state.presented;
    toggle.disabled=unavailable||!['ready','playing','paused'].includes(phase)||get(phase==='ready'?'play':'pause').disabled;
    iconButton(toggle,phase==='playing'?'pause':'play',phase==='playing'?'Pause':phase==='paused'?'Resume':'Play');
    sound.disabled=unavailable;
    sound.setAttribute('aria-pressed',String(state.muted));
    iconButton(sound,state.muted?'muted':'sound',state.muted?'Unmute sound':'Mute sound');
    iconButton(get('next'),'next',state.isMatter?'Continue to next scene':'Next beat');
    // A document/beat action closes through its button; async source changes also close.
    if(state.preparing)close(panel.contains(document.activeElement));
    place();
  }};
}
module.exports={createWebControls};
