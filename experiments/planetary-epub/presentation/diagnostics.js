/* Diagnostic build only. Local, bounded trace; no network or developer tools. */
(function () {
  var start = performance.now(), instance = new Date().toISOString();
  var key = 'prime-playback-v2-diagnostics', records = [];
  try { records = JSON.parse(sessionStorage.getItem(key) || '[]'); } catch (_) {}
  var panel = document.createElement('div');
  panel.id = 'diagnostic-panel';
  panel.innerHTML = '<p style="margin:0">Diagnostics: Ctrl+A then Ctrl+C copies the page and log.</p><pre id="diagnostics" tabindex="0" aria-label="Playback diagnostic log"></pre>';
  document.body.appendChild(panel);
  var area = document.getElementById('diagnostics');
  function style(id) {
    var s = getComputedStyle(document.getElementById(id));
    return {color:s.color,opacity:s.opacity,visibility:s.visibility,display:s.display,clipPath:s.clipPath,position:s.position};
  }
  window.primeTrace = function (reason, extra) {
    records.push({at:new Date().toISOString(),instance:instance,ms:Math.round(performance.now()-start),reason:reason,
      motion:matchMedia('(prefers-reduced-motion: reduce)').matches,visibility:document.visibilityState,
      chars:document.getElementById('output').textContent.length,
      performing:document.getElementById('surface').classList.contains('performing'),
      complete:style('complete'),output:style('output'),extra:extra});
    if (records.length > 240) { records.shift(); }
    area.textContent = JSON.stringify(records, null, 2);
    try { sessionStorage.setItem(key, area.textContent); } catch (_) {}
  };
  ['click','keydown','pagehide','pageshow','visibilitychange'].forEach(function (name) {
    window.addEventListener(name, function (e) {
      if (e.target === area) { return; }
      primeTrace('event:' + name, {target:e.target.id,key:e.key,detail:e.detail});
    }, true);
  });
  setInterval(function () {
    if (document.getElementById('surface').classList.contains('performing')) { primeTrace('sample'); }
  }, 250);
  primeTrace('load');
})();
