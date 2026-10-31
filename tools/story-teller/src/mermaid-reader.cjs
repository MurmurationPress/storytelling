'use strict';
const mermaid = require('mermaid').default;
const purify = require('dompurify');
const { authorizeDiagramStyle, applyGeneratedInlineStyle } = require('./mermaid-styles.cjs');
let serial = 0;
let observing = false;
let queue = Promise.resolve();
const { prepareDiagram, sourceError, diagramOptions } = require('./mermaid-config.cjs');
function renderDiagrams(root, changed = () => {}) {
  if (!observing) {
    observing = true;
    const observer = new MutationObserver(() => renderDiagrams(document));
    observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'style', 'data-vscode-theme-kind'] });
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => renderDiagrams(document));
  }
  for (const figure of root.querySelectorAll('.story-diagram')) {
    const presentation = getComputedStyle(figure);
    const themeKey = `${presentation.color}:${presentation.fontFamily}`;
    if (figure.dataset.diagramTheme === themeKey) continue;
    figure.dataset.diagramTheme = themeKey;
    const fontFamily = presentation.fontFamily;
    const dark = presentation.color.match(/\d+/g)?.slice(0,3).map(Number).reduce((a,b)=>a+b,0) > 450;
    const source = figure.dataset.diagramSource;
    const id = `storyDiagram${++serial}`;
    figure.dataset.diagramToken = id;
    queue = queue.catch(() => {}).then(async () => {
      if (!figure.isConnected || figure.dataset.diagramToken !== id) return;
      const status = figure.querySelector('.diagram-status');
      const surface = figure.querySelector('.diagram-surface');
      const holder = document.createElement('div');
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
        surface.replaceChildren(fragment);
        const width = Number(diagram.getAttribute('viewBox')?.split(/\s+/)[2]);
        if (width) diagram.style.width = `${Math.ceil(width)}px`;
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
      } finally { holder.remove(); if (figure.isConnected) changed(); }
    });
  }
}
module.exports = { renderDiagrams, sourceError };
