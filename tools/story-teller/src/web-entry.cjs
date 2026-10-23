'use strict';
const { createReader } = require('./reader-presentation.cjs');
let receiver, book, generation=0, controller, preference={};
const theme=window.matchMedia('(prefers-color-scheme: dark)');
const applyTheme=()=>document.body.classList.toggle('reader-dark',theme.matches);
applyTheme();theme.addEventListener('change',applyTheme);
const title=document.getElementById('book-title'), contents=document.getElementById('contents');
const notify=message=>receiver?.({data:{instance:'web',...message}});
function save() {try{localStorage.setItem(`story-teller:${book.id}`,JSON.stringify(preference));}catch{/* Private/storage-disabled reading still works. */}}
async function selectScene(index,autoplay=true) {
  if(index<0||index>=book.scenes.length)return;
  if(autoplay && preference.autoplayOnTurn!==false)controller?.prepareAudio();
  const token=++generation;
  notify({type:'source-pending',revision:token});
  contents.querySelectorAll('button').forEach((button,i)=>button.setAttribute('aria-current',i===index?'true':'false'));
  try {
    const scene=book.scenes[index];
    const response=await fetch(scene.file,{cache:'no-store'});if(!response.ok)throw Error('Scene could not be loaded');
    const data=await response.json();if(token!==generation)return;
    bridge.nextScene=index+1<book.scenes.length?()=>void selectScene(index+1,true):null;
    document.getElementById('scene-title').textContent=`${scene.label} ${scene.title}`;
    notify({type:'source',revision:token,uri:scene.id,...data,sceneStart:autoplay,sceneAutoplay:autoplay,muted:preference.muted===true,autoplayOnTurn:preference.autoplayOnTurn!==false});
  } catch(error){if(token===generation){notify({type:'source-error',revision:token,error:error.message});}}
}
const bridge={showSource:false,getState:()=>preference,setState:state=>{preference={...preference,...state};save();},onMessage:listener=>{receiver=listener;},nextScene:null,
  postMessage(message){
    if(message.type==='ready')return;
    if(message.type==='supporting-load') {
      const entry=book.targets[message.target],note=entry?.id?book.notes[entry.id]:null;
      queueMicrotask(()=>notify({type:'supporting-result',revision:message.revision,request:message.request,...(note?{note}:{error:entry?.error||'Supporting note unavailable'})}));
    }
    if(message.type==='mute-preference'||message.type==='autoplay-preference') {Object.assign(preference,message.type==='mute-preference'?{muted:message.muted}:{autoplayOnTurn:message.autoplayOnTurn});save();}
  }};
async function start() {
  try {
    const response=await fetch('publication.json');if(!response.ok)throw Error('Publication could not be loaded');book=await response.json();
    title.textContent=book.title;document.title=book.title;
    try{preference=JSON.parse(localStorage.getItem(`story-teller:${book.id}`)||'{}')||{};}catch{preference={};}
    const ordered=new Map(book.scenes.map((s,i)=>[s.id,i]));
    for(const part of book.parts) {
      const group=document.createElement('details');group.open=true;
      const heading=document.createElement('summary');heading.textContent=part.title;group.append(heading);
      for(const id of part.scenes) {
        const index=ordered.get(id),scene=book.scenes[index],button=document.createElement('button');button.type='button';button.textContent=`${scene.label} ${scene.title}`;
        button.addEventListener('click',()=>{void selectScene(index,true);document.getElementById('contents-toggle').setAttribute('aria-expanded','false');contents.hidden=true;document.getElementById('contents-toggle').focus({preventScroll:true});});group.append(button);
      }
      contents.append(group);
    }
    controller=createReader(bridge);
    notify({type:'presentation',visible:!document.hidden,epoch:0});
    const saved=book.scenes.findIndex(scene=>scene.id===preference.sourceUri);
    await selectScene(saved>=0?saved:0,false);
  } catch(error){document.getElementById('warnings').textContent=error.message;}
}
document.getElementById('contents-toggle').addEventListener('click',event=>{contents.hidden=!contents.hidden;event.currentTarget.setAttribute('aria-expanded',String(!contents.hidden));});
void start();
