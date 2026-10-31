'use strict';
const purify = require('dompurify');
function resourceFree(css) {
  // Generated marker/filter references may point inside the SVG, never outside it.
  const remaining = css.replace(/url\(\s*['"]?#[\w-]+['"]?\s*\)/gi, '');
  if (/url\s*\(|@import|@font-face|(?:image-set|image|cross-fade|paint|src|attr|expression)\s*\(|(?:https?|file|blob|javascript|data):|\/\/|\\/i.test(remaining))
    throw Error('Unsafe generated diagram style');
}
function scopedSelector(selector, id) {
  const prefix = `#${id}`;
  return selector.split(',').every(part => {
    const value = part.trim();
    return value === prefix || (value.startsWith(prefix + ' ') && !/^[+~]/.test(value.slice(prefix.length).trim()));
  });
}
function authorizeDiagramStyle(style, id, phase = 'measurement') {
  if (!/^storyDiagram\d+$/.test(id)) throw Error('Unexpected diagram style identity');
  // This hook receives only the bundled renderer's generated style, after source
  // validation. Sanitize before granting a nonce, including in measurement DOM.
  const wrapper = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const copy = document.createElementNS(wrapper.namespaceURI, 'style');
  copy.textContent = style.textContent; wrapper.append(copy);
  purify.sanitize(wrapper, { IN_PLACE: true, USE_PROFILES: { svg: true } });
  if (!wrapper.contains(copy)) throw Error('Generated diagram style was removed by sanitization');
  style.textContent = copy.textContent;
  resourceFree(style.textContent);
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(style.textContent);
  const output = [];
  for (const rule of sheet.cssRules) {
    // Mermaid emits global keyframes even for static graphs. They are unnecessary
    // here; omitting them also prevents global animation-name collisions.
    if (rule.type === 7) continue;
    if (rule.type !== 1 || !scopedSelector(rule.selectorText, id)) throw Error('Unscoped generated diagram style');
    for (const property of [...rule.style]) if (property.startsWith('animation')) rule.style.removeProperty(property);
    output.push(rule.cssText);
  }
  style.textContent = output.join('\n');
  const nonce = document.querySelector('meta[name="story-diagram-style-nonce"]')?.content;
  if (nonce) style.setAttribute('nonce', nonce);
  style.dataset.storyDiagramStyle = phase;
}
function applyGeneratedInlineStyle(element, value) {
  resourceFree(String(value));
  // Use CSSOM property assignment, not style attributes parsed/inserted as HTML.
  // CSP still rejects arbitrary authored inline attributes. Both callers are
  // trusted renderer paths; source CSS/HTML remains forbidden by the validator.
  const parsed = document.createElement('span').style;
  parsed.cssText = String(value);
  element.removeAttribute('style');
  for (const name of [...parsed]) element.style.setProperty(name, parsed.getPropertyValue(name), parsed.getPropertyPriority(name));
}
function setGeneratedAttribute(element, name, value) {
  if (name === 'style') applyGeneratedInlineStyle(element, value);
  else element.setAttribute(name, value);
}
module.exports = { authorizeDiagramStyle, applyGeneratedInlineStyle, setGeneratedAttribute, scopedSelector, resourceFree };
// Convert trusted renderer style attributes before either sanitizer parses the
// serialized SVG. Even inert DOMParser documents report CSP violations for inline
// attributes. The generated rules retain inline precedence without permitting
// inline style attributes in the webview policy.
function extractGeneratedInlineStyles(svg) {
  const rules = [];
  let index = 0;
  for (const element of [svg, ...svg.querySelectorAll('[style]')]) {
    const value = element.getAttribute('style');
    if (!value) { element.removeAttribute('style'); continue; }
    resourceFree(value);
    const parsed = document.createElement('span').style;
    parsed.cssText = value;
    element.removeAttribute('style');
    let selector = `#${svg.id}`;
    if (element !== svg) {
      element.dataset.storyDiagramInline = String(index++);
      selector += ` [data-story-diagram-inline="${element.dataset.storyDiagramInline}"]`;
    }
    const declarations = [];
    for (const name of [...parsed]) {
      if (name.startsWith('animation') || (element === svg && ['width','height','max-width'].includes(name))) continue;
      declarations.push(`${name}:${parsed.getPropertyValue(name)} !important;`);
    }
    if (declarations.length) rules.push(`${selector}{${declarations.join('')}}`);
  }
  if (rules.length) {
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = rules.join('\n');
    authorizeDiagramStyle(style, svg.id);
    svg.append(style);
  }
}
module.exports.extractGeneratedInlineStyles = extractGeneratedInlineStyles;
