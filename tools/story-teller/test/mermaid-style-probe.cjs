'use strict';
// Deliberately self-contained: executed in the actual webview/exported document.
function sampleStyles(doc, selector = '#beat .diagram-surface', index = 0) {
  const surface = doc.querySelectorAll(selector)[index], svg = surface?.querySelector('svg');
  if (!svg || svg.id !== surface.closest('.story-diagram').dataset.diagramToken) return null;
  const win = doc.defaultView;
  const colour = element => {
    const css = win.getComputedStyle(element);
    let behind = win.getComputedStyle(doc.body).backgroundColor;
    const actor = element.closest('text.actor') ? svg.querySelector('rect.actor') : null;
    const group = element.closest('.node,.rough-node,.edgeLabel');
    const background = actor || group?.querySelector('rect.label-container,rect.background,rect.actor,path');
    if (background) { const paint = win.getComputedStyle(background); if (paint.fill !== 'none' && paint.fill !== 'rgba(0, 0, 0, 0)') behind = paint.fill; }
    return { behind, tag: element.tagName, cls: element.getAttribute('class'), text: element.textContent.trim(), fill: css.fill, stroke: css.stroke, color: css.color, width: css.strokeWidth };
  };
  const texts = [...svg.querySelectorAll('text,tspan')].filter(el => !el.querySelector('tspan') && el.textContent.trim()).map(colour);
  const shapes = [...svg.querySelectorAll('rect,path,line,polygon,ellipse')].filter(el => !el.closest('defs')).map(colour);
  const backgrounds = [...svg.querySelectorAll('.nodes rect,.nodes .rough-node path,rect.actor')].map(colour);
  const arrows = [...svg.querySelectorAll('.edgePaths path,.messageLine0,.messageLine1,.relation,marker path,marker polygon')].map(colour);
  const nonce = doc.querySelector('meta[name="story-diagram-style-nonce"]')?.content;
  return { id: svg.id, texts, shapes, backgrounds, arrows,
    background: win.getComputedStyle(doc.body).backgroundColor,
    styles: [...svg.querySelectorAll('style')].map(style => ({ active: !!style.sheet, rules: style.sheet?.cssRules.length || 0, nonceMatches: nonce ? style.nonce === nonce : !style.nonce })),
    csp: doc.querySelector('meta[http-equiv="Content-Security-Policy"]').content,
    width: surface.clientWidth, scrollWidth: surface.scrollWidth };
}
function assertStyles(assert, sample) {
  assert.ok(sample?.texts.length > 0, 'visible SVG labels must exist');
  assert.ok(sample.styles.length > 0 && sample.styles.every(s => s.active && s.rules > 0 && s.nonceMatches), 'generated stylesheets must be authorised and active');
  for (const text of sample.texts) assert.ok(text.fill !== 'none' && contrast(text.fill,text.behind)>=4.5, `readable label/relationship/annotation: ${text.text} (${text.fill} on ${text.behind})`);
  assert.ok(sample.shapes.some(s => s.stroke !== 'none' && s.stroke !== 'rgb(0, 0, 0)'), 'diagram strokes must be styled');
  assert.ok(sample.backgrounds.some(s => (s.fill !== 'none' && s.fill !== 'rgb(0, 0, 0)') || (s.stroke !== 'none' && s.stroke !== 'rgb(0, 0, 0)')), 'node backgrounds/hatching must be styled');
  assert.ok(sample.arrows.some(s => (s.stroke !== 'none' && s.stroke !== 'rgb(0, 0, 0)') || (s.fill !== 'none' && s.fill !== 'rgb(0, 0, 0)')), 'arrows and markers must be styled');
}
function contrast(a,b) {
  const luminance = value => {
    const rgb = value.match(/[\d.]+/g)?.slice(0,3).map(Number); if (!rgb || rgb.length<3) return NaN;
    return rgb.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
  };
  const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
module.exports = { sampleStyles, assertStyles, contrast };
