/* Local-only research log, including controlled child preload messages. */
(function () {
  var start = performance.now(), instance = new Date().toISOString();
  var embedded = window !== window.top, records = [];
  var key = 'prime-arrival-trace-v1';
  try { records = JSON.parse(localStorage.getItem(key) || '[]'); } catch (_) {}
  var panel = document.createElement('aside');
  panel.id = 'arrival-log';
  panel.innerHTML = '<div>ARRIVAL RESEARCH PROBE · Ctrl+A / Ctrl+C copies page and log</div><pre id="arrival-records" tabindex="0"></pre>';
  document.body.appendChild(panel);
  var pre = document.getElementById('arrival-records');
  function append(row) {
    // Reload to merge traces from separate publication documents in this origin.
    try { records = JSON.parse(localStorage.getItem(key) || '[]'); } catch (_) {}
    records.push(row); if (records.length > 200) { records.shift(); }
    pre.textContent = JSON.stringify(records, null, 2);
    try { localStorage.setItem(key, pre.textContent); } catch (_) {}
  }
  window.arrivalTrace = function (reason, extra) {
    var complete = document.getElementById('complete'), output = document.getElementById('output');
    var row = {at:new Date().toISOString(),instance:instance,ms:Math.round(performance.now()-start),reason:reason,
      embedded:embedded,document:location.pathname.split('/').pop(),visibility:document.visibilityState,
      focus:document.hasFocus(),motion:matchMedia('(prefers-reduced-motion: reduce)').matches,
      chars:output ? output.textContent.length : null,
      completeOpacity:complete ? getComputedStyle(complete).opacity : null,extra:extra};
    append(row);
    if (embedded) { parent.postMessage({primeArrivalProbe:row}, '*'); }
  };
  window.addEventListener('message', function (e) {
    if (e.data && e.data.primeArrivalProbe) {
      try { records = JSON.parse(localStorage.getItem(key) || '[]'); } catch (_) {}
      pre.textContent = JSON.stringify(records, null, 2);
    }
  });
  ['load','pageshow','pagehide','visibilitychange','focus','blur'].forEach(function (name) {
    window.addEventListener(name, function () { arrivalTrace('event:' + name); }, true);
  });
  setInterval(function () {
    var surface = document.getElementById('surface');
    if (surface && surface.classList.contains('performing')) { arrivalTrace('sample'); }
  }, 250);
  arrivalTrace('script', {readingSystemKeys:Object.keys(navigator.epubReadingSystem || {}),
    userAgent:navigator.userAgent,trackVisibility:'isVisible' in IntersectionObserverEntry.prototype});
})();
