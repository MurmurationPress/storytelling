'use strict';
const mermaid = require('mermaid').default;
const purify = require('dompurify');
let serial = 0;
let observing = false;
let queue = Promise.resolve();
// Reject resource/configuration syntax before Mermaid creates any measurement DOM.
function sourceError(source) {
  if (source.length > 30000) return 'Diagram exceeds 30,000 characters';
  const lines = source.split('\n');
  const index = lines.findIndex(line => /%%\{|^\s*---|\b(?:click|href|image|img|src|icon|style|classDef|linkStyle)\b|<|>|url\s*\(|(?:https?|data|javascript):/i.test(line.replace(/<?[-=]+[<>]+|<[-=]+/g, '')));
  return index < 0 ? null : `Diagram line ${index + 1}: configuration, HTML, styling, links and external resources are disabled`;
}
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
    const source = figure.querySelector('.diagram-source').textContent;
    const id = `storyDiagram${++serial}`;
    figure.dataset.diagramToken = id;
    queue = queue.catch(() => {}).then(async () => {
      if (!figure.isConnected || figure.dataset.diagramToken !== id) return;
      const status = figure.querySelector('.diagram-status');
      const surface = figure.querySelector('.diagram-surface');
      const holder = document.createElement('div');
      holder.style.cssText = 'position:fixed;left:-100000px;top:0;visibility:hidden;pointer-events:none';
      try {
        const error = sourceError(source); if (error) throw Error(error);
        mermaid.initialize({ startOnLoad: false, htmlLabels: false, securityLevel: 'strict', suppressErrorRendering: true,
          theme: dark ? 'dark' : 'default', fontFamily, maxTextSize: 30000, maxEdges: 300,
          flowchart: { htmlLabels: false }, sequence: { useMaxWidth: false } });
        document.body.append(holder);
        const { svg } = await mermaid.render(id, source, holder);
        if (!figure.isConnected || figure.dataset.diagramToken !== id) return;
        surface.innerHTML = purify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true },
          FORBID_TAGS: ['a', 'image', 'foreignObject', 'script', 'animate', 'set'], FORBID_ATTR: ['href', 'xlink:href'] });
        for (const element of surface.querySelectorAll('*')) for (const attribute of [...element.attributes]) {
          if (/url\s*\(/i.test(attribute.value) && !/^url\(#[\w-]+\)$/.test(attribute.value)) element.removeAttribute(attribute.name);
        }
        const diagram = surface.querySelector('svg');
        if (!diagram) throw Error('No SVG produced');
        const width = Number(diagram.getAttribute('viewBox')?.split(/\s+/)[2]);
        if (width) diagram.style.width = `${Math.ceil(width)}px`;
        const described = /\baccDescr\s*[:{]/.test(source);
        figure.querySelector('details').open = !described;
        status.textContent = described ? 'Diagram · scroll horizontally if needed. Description and source available below.' : 'Diagram · no authored description; readable source available below.';
        figure.querySelector('.diagram-description')?.remove();
        if (described) {
          const description = document.createElement('p');
          description.className = 'diagram-description';
          description.textContent = diagram.querySelector('desc')?.textContent || 'See diagram source for the authored description.';
          surface.before(description);
        }
      } catch (error) {
        if (figure.isConnected) status.textContent = `Diagram unavailable at source line ${figure.dataset.diagramLine}: ${error.message || error}. Source retained below.`;
      } finally { holder.remove(); if (figure.isConnected) changed(); }
    });
  }
}
module.exports = { renderDiagrams, sourceError };
