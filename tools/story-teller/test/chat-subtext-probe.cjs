'use strict';
function probeChatSubtext(doc) {
 const css=e=>doc.defaultView.getComputedStyle(e),rgb=value=>value.match(/[\d.]+/g)?.map(Number)||[0,0,0,0];
 const blend=(fg,bg,alpha=fg[3]??1)=>fg.slice(0,3).map((v,i)=>v*alpha+bg[i]*(1-alpha));
 const background=node=>{const chain=[];for(let e=node;e;e=e.parentElement)chain.unshift(e);return chain.reduce((bg,e)=>blend(rgb(css(e).backgroundColor),bg),[255,255,255]);};
 const lum=color=>color.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
 return [...doc.querySelectorAll('#beat .chat li')].map(item=>{
  const body=item.querySelector('p'),note=item.querySelector('.chat-subtext');
  const data={speaker:item.querySelector('strong').textContent,text:body.textContent,subtext:note?.textContent??null,outgoing:item.classList.contains('outgoing'),status:item.querySelector('.ticks')?.textContent??null};
  if(note){const bg=background(note),fg=blend(rgb(css(note).color),bg,Number(css(note).opacity)),a=lum(fg),b=lum(bg),rect=note.getBoundingClientRect(),outer=item.getBoundingClientRect();Object.assign(data,{contrast:(Math.max(a,b)+.05)/(Math.min(a,b)+.05),fontSize:parseFloat(css(note).fontSize),bodySize:parseFloat(css(body).fontSize),associated:body.nextElementSibling===note,inside:rect.left>=outer.left&&rect.right<=outer.right+1,ariaHidden:note.closest('[aria-hidden=true]')!==null,live:note.hasAttribute('aria-live')});}
  return data;
 });
}
module.exports={probeChatSubtext};
