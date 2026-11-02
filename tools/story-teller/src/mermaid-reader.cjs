'use strict';
const mermaid = require('mermaid').default;
const purify = require('dompurify');
const { authorizeDiagramStyle, applyGeneratedInlineStyle } = require('./mermaid-styles.cjs');
let serial = 0;
let observing = false;
let queue = Promise.resolve();
const { prepareDiagram, sourceError, diagramOptions } = require('./mermaid-config.cjs');
function renderDiagrams(root, changed = () => {}, {signal,timeoutMs = 10000} = {}) {
  const tasks = [];
  if (!observing) {
    observing = true;
    const observer = new MutationObserver(() => renderDiagrams(document));
    observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'style', 'data-vscode-theme-kind'] });
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)renderDiagrams(document);});
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => renderDiagrams(document));
  }
  if(document.hidden)return Promise.resolve();
  for (const figure of root.querySelectorAll('.story-diagram')) {
    if(!figure.getBoundingClientRect().width)continue;
    const presentation = getComputedStyle(figure);
    const themeKey = `${presentation.color}:${presentation.fontFamily}`;
    if (figure.dataset.diagramTheme === themeKey) { if (figure.storyDiagramTask) tasks.push(figure.storyDiagramTask); continue; }
    figure.dataset.diagramTheme = themeKey;
    const fontFamily = presentation.fontFamily;
    const dark = presentation.color.match(/\d+/g)?.slice(0,3).map(Number).reduce((a,b)=>a+b,0) > 450;
    const source = figure.dataset.diagramSource;
    const id = `storyDiagram${++serial}`;
    figure.dataset.diagramToken = id;
    let complete, holder;
    const done = new Promise(resolve=>complete=resolve); figure.storyDiagramTask=done; tasks.push(done);
    const finish = () => { holder?.remove(); clearTimeout(timeout); signal?.removeEventListener('abort',abort); complete(); };
    const abort = () => { if (figure.dataset.diagramToken === id) figure.dataset.diagramToken = ''; finish(); };
    const timeout = setTimeout(()=>{
      if (figure.isConnected && figure.dataset.diagramToken === id) {
        figure.dataset.diagramToken = '';
        const status=figure.querySelector('.diagram-status');status.hidden=false;status.textContent='This diagram could not be displayed.';
        document.dispatchEvent(new CustomEvent('story-diagram-diagnostic',{detail:{line:Number(figure.dataset.diagramLine),bodyLine:1,document:figure.dataset.diagramDocument || '',source,message:'Diagram preparation timed out'}}));
      }
      finish(); changed();
    },timeoutMs);
    signal?.addEventListener('abort',abort,{once:true});
    if (signal?.aborted) abort();
    queue = queue.catch(() => {}).then(async () => {
      if (!figure.isConnected || figure.dataset.diagramToken !== id) { finish(); return; }
      const status = figure.querySelector('.diagram-status');
      const surface = figure.querySelector('.diagram-surface');
      holder = document.createElement('div');
      holder.className = 'diagram-measurement';
      holder.style.cssText = 'position:fixed;left:-100000px;top:0;visibility:hidden;pointer-events:none';
      let bodyLine = 1;
      try {
        const prepared = prepareDiagram(source);
        bodyLine = prepared.offset + 1;
        mermaid.initialize(diagramOptions(prepared.config, { dark, fontFamily }));
        const renderSource = prepared.title ? `---\ntitle: ${JSON.stringify(prepared.title)}\n---\n${prepared.text}` : prepared.text;
        document.body.append(holder);
        const { svg } = await mermaid.render(id, renderSource, holder);
        if (!figure.isConnected || figure.dataset.diagramToken !== id) return;
        const fragment = purify.sanitize(svg, { RETURN_DOM_FRAGMENT: true, USE_PROFILES: { svg: true, svgFilters: true },
          FORBID_TAGS: ['a', 'image', 'foreignObject', 'script', 'animate', 'set'], FORBID_ATTR: ['href', 'xlink:href'] });
        for (const style of fragment.querySelectorAll('style')) authorizeDiagramStyle(style, id, 'display');
        for (const element of fragment.querySelectorAll('[style]')) applyGeneratedInlineStyle(element, element.getAttribute('style'));
        for (const element of fragment.querySelectorAll('*')) for (const attribute of [...element.attributes]) {
          if (/url\s*\(/i.test(attribute.value) && !/^url\(#[\w-]+\)$/.test(attribute.value)) element.removeAttribute(attribute.name);
        }
        const diagram = fragment.querySelector('svg');
        if (!diagram || diagram.id !== id) throw Error('No matching SVG produced');
        const left=surface.scrollLeft, top=surface.scrollTop;
        surface.replaceChildren(fragment);
        const width = Number(diagram.getAttribute('viewBox')?.split(/\s+/)[2]);
        if (width) diagram.style.width = `${Math.ceil(width)}px`;
        surface.scrollLeft=left;surface.scrollTop=top;
        status.hidden = true; status.textContent = '';
        figure.dataset.diagramLook = prepared.config.flowchart?.look || prepared.config.look || 'classic';

      } catch (error) {
        if (figure.isConnected && figure.dataset.diagramToken === id) {
          surface.replaceChildren(); status.hidden = false;
          status.textContent = 'This diagram could not be displayed.';
          const diagnostic = { line: Number(figure.dataset.diagramLine), bodyLine, document: figure.dataset.diagramDocument || '', source, message: error.message || String(error) };
          document.dispatchEvent(new CustomEvent('story-diagram-diagnostic', { detail: diagnostic }));
          console.warn('Story Teller authoring diagnostic', diagnostic);
        }
      } finally { holder.remove(); finish(); if (figure.isConnected && figure.dataset.diagramToken === id) changed(); }
    });
  }
  return Promise.all(tasks);
}
module.exports = { renderDiagrams, sourceError };
