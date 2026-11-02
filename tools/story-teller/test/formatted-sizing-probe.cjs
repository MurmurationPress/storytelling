'use strict';
// Shared browser/native measurements: actual CSS dimensions, not load success.
function measureSizing(root) {
  const doc=root.ownerDocument || root, win=doc.defaultView;
  return [...root.querySelectorAll('.formatted-component')].map(section=>{
    const image=section.querySelector('.story-figure img'),figure=image.closest('figure'),wrapper=figure.parentElement,body=section.querySelector('.formatted-body');
    const rect=e=>{const r=e.getBoundingClientRect();return {width:r.width,height:r.height};};
    const svg=section.querySelector('.diagram-surface svg'),surface=section.querySelector('.diagram-surface');
    const text=svg?.querySelector('text');
    return {viewportWidth:doc.documentElement.clientWidth,format:[...section.classList].find(c=>/^typeout-(janus|janus-log|annotation)$/.test(c)),image:{...rect(image),naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight,maxHeight:win.getComputedStyle(image).maxHeight},body:rect(body),figure:rect(figure),wrapper:{...rect(wrapper),display:win.getComputedStyle(wrapper).display},inline:rect(section.querySelector('p img')),cell:rect(section.querySelector('td img')),table:rect(section.querySelector('table')),columns:[...section.querySelectorAll('col')].map(c=>c.style.width),diagram:svg?{...rect(svg),viewBox:svg.viewBox.baseVal.width,surface:rect(surface),scrollWidth:surface.scrollWidth,textSize:text?parseFloat(win.getComputedStyle(text).fontSize):null}:null};
  });
}
function captureSizingPreparation(doc) {
  doc.sizingPreparation=[];
  doc.sizingObserver?.disconnect();
  doc.sizingObserver=new doc.defaultView.MutationObserver(()=>{
    for(const stage of doc.querySelectorAll('.formatted-preparation')) {
      const results=measureSizing(stage);
      for(const result of results) {
        const previous=doc.sizingPreparation.find(r=>r.format===result.format);
        if(result.image.width<=2){if(previous && result.columns.length)previous.columns=result.columns;continue;}
        // Capture both loaded-image and complete-diagram layout before clipping.
        if(!previous || (!previous.diagram && result.diagram)){
          if(previous)doc.sizingPreparation.splice(doc.sizingPreparation.indexOf(previous),1);
          doc.sizingPreparation.push({...result,stageVisibility:doc.defaultView.getComputedStyle(stage).visibility});
        }
      }
    }
  }).observe(doc.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-media-ready']});
}
module.exports={measureSizing,captureSizingPreparation};
