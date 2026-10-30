'use strict';
const { createWebControls } = require('./web-controls.cjs');
const { createWebAnalytics } = require('./web-analytics.cjs');
const { createReader } = require('./reader-presentation.cjs');
let analytics, receiver, book, generation=0, controller, preference={};
const theme=window.matchMedia('(prefers-color-scheme: dark)');
const applyTheme=()=>document.body.classList.toggle('reader-dark',theme.matches);
applyTheme();theme.addEventListener('change',applyTheme);
const title=document.getElementById('book-title'), contents=document.getElementById('contents');
const notify=message=>receiver?.({data:{instance:'web',...message}});
window.addEventListener('storage', event => {
  if (book && event.key === `story-teller:${book.id}`) {
    try { const stored = JSON.parse(event.newValue || '{}'); preference.analyticsConsent = stored.analyticsConsent; preference.analyticsState = stored.analyticsState; } catch { preference.analyticsConsent = undefined; }
  }
});
function save() {try{localStorage.setItem(`story-teller:${book.id}`,JSON.stringify(preference));}catch{/* Private/storage-disabled reading still works. */}}
async function selectScene(index,autoplay=true,previous=false) {
  if(index<0||index>=book.readingOrder.length)return;
  if(!previous && autoplay && preference.autoplayOnTurn!==false)controller?.prepareAudio();
  const token=++generation;
  notify({type:'source-pending',revision:token});
  contents.querySelectorAll('button').forEach((button,i)=>button.setAttribute('aria-current',i===index?'true':'false'));
  try {
    const scene=book.readingOrder[index];
    const response=await fetch(scene.file,{cache:'no-store'});if(!response.ok)throw Error('Scene could not be loaded');
    const data=await response.json();if(token!==generation)return;
    bridge.nextScene=index+1<book.readingOrder.length?()=>void selectScene(index+1,true):null;
    document.getElementById('scene-title').textContent=scene.title;
    notify({type:'source',revision:token,uri:scene.id,...data,sceneTitle:scene.title,documentPrevious:previous,documentNavigation:{previous:index>0,next:index+1<book.readingOrder.length},sceneStart:autoplay,sceneAutoplay:autoplay,muted:preference.muted===true,autoplayOnTurn:preference.autoplayOnTurn!==false});
  } catch(error){if(token===generation){notify({type:'source-error',revision:token,error:error.message});}}
}
const compactControls=createWebControls(document,window);
const bridge={showSource:false,compactHeader:true,compactControls:true,onReading:snapshot=>analytics?.observe(snapshot),onControls:state=>compactControls.update(state),getState:()=>preference,setState:state=>{preference={...preference,...state};save();},onMessage:listener=>{receiver=listener;},nextScene:null,
  postMessage(message){
    if(message.type==='ready')return;
    if(message.type==='project-turn' && message.revision===generation) {
      const index=book.readingOrder.findIndex(item=>item.id===preference.sourceUri);
      if(['next','previous'].includes(message.direction))void selectScene(index+(message.direction==='next'?1:-1),true,message.direction==='previous');
    }
    if(message.type==='supporting-load') {
      const entry=book.targets[message.target],note=entry?.id?book.notes[entry.id]:null;
      queueMicrotask(()=>notify({type:'supporting-result',revision:message.revision,request:message.request,...(note?{note}:{error:entry?.error||'Supporting note unavailable'})}));
    }
    if(message.type==='mute-preference'||message.type==='autoplay-preference') {Object.assign(preference,message.type==='mute-preference'?{muted:message.muted}:{autoplayOnTurn:message.autoplayOnTurn});save();}
  }};
async function start() {
  try {
    const response=await fetch('publication.json');if(!response.ok)throw Error('Publication could not be loaded');book=await response.json();book.readingOrder ||= book.scenes;
    title.textContent=book.title;document.title=book.title;
    try{preference=JSON.parse(localStorage.getItem(`story-teller:${book.id}`)||'{}')||{};}catch{preference={};}
    const ordered=new Map(book.readingOrder.map((s,i)=>[s.id,i]));
    const entryButton = (item, parent=contents, numbered=false) => {
      const button=document.createElement('button');button.type='button';button.textContent=numbered ? `${item.label} ${item.title}` : item.title;
      button.addEventListener('click',()=>{void selectScene(ordered.get(item.id),true);document.getElementById('contents-toggle').setAttribute('aria-expanded','false');contents.hidden=true;document.getElementById('contents-toggle').focus({preventScroll:true});});parent.append(button);
    };
    for(const item of book.readingOrder.filter(item=>item.kind==='front'))entryButton(item);
    const sequence=book.sequence || (book.parts.length ? book.parts.map(part=>({kind:'part',id:part.id})) : book.scenes.map(scene=>({kind:'scene',id:scene.id})));
    for(const entry of sequence) {
      if(entry.kind==='scene') { entryButton(book.readingOrder[ordered.get(entry.id)],contents,true); continue; }
      const part=book.parts.find(part=>part.id===entry.id),group=document.createElement('details');group.open=true;
      const heading=document.createElement('summary');heading.textContent=part.title;group.append(heading);
      for(const id of part.scenes)entryButton(book.readingOrder[ordered.get(id)],group,true);
      contents.append(group);
    }
    for(const item of book.readingOrder.filter(item=>item.kind==='back'))entryButton(item);
    analytics=createWebAnalytics({window,document,config:book.analytics,getState:()=>preference,setState:state=>{preference={...preference,...state};save();}});
    controller=createReader(bridge);
    notify({type:'presentation',visible:!document.hidden,epoch:0});
    const saved=book.readingOrder.findIndex(scene=>scene.id===preference.sourceUri);
    if(book.readingOrder.length) await selectScene(saved>=0?saved:0,false);
    else document.getElementById('beat').textContent='This book has no nonempty reading pages yet.';
  } catch(error){document.getElementById('warnings').textContent=error.message;}
}
document.getElementById('contents-toggle').addEventListener('click',event=>{contents.hidden=!contents.hidden;event.currentTarget.setAttribute('aria-expanded',String(!contents.hidden));});
void start();
