/* FAILED/UNQUALIFIED arrival hypothesis: pageshow + ordinary intersection.
   Neither event is a supported reader-location contract. Research artifact only. */
(function () {
  var complete = document.getElementById('complete'), output = document.getElementById('output');
  var surface = document.getElementById('surface'), status = document.getElementById('status');
  var begin = document.getElementById('begin'), motion = matchMedia('(prefers-reduced-motion: reduce)');
  var text = complete.textContent, timer, position = 0, loaded = false, intersecting = false, running = false;
  var key = 'prime-arrival-load-v1-complete';
  var completed = false;
  try { completed = localStorage.getItem(key) === 'complete'; } catch (_) {}
  function log(reason, extra) { window.arrivalTrace(reason, extra); }
  function full(reason) {
    clearInterval(timer); running = false; completed = true;
    document.documentElement.classList.add('arrival-complete');
    output.textContent = ''; surface.classList.remove('performing');
    begin.textContent = motion.matches ? 'Static output' : 'Replay output';
    begin.disabled = motion.matches;
    status.textContent = motion.matches ? 'Reduced motion: complete output shown.' : 'Complete output; optional replay.';
    try { localStorage.setItem(key, 'complete'); } catch (_) {}
    log(reason);
  }
  function start(reason) {
    if (running || motion.matches) { return; }
    document.documentElement.classList.add('arrival-script');
    document.documentElement.classList.remove('arrival-complete');
    position = 0; output.textContent = ''; running = true;
    surface.classList.add('performing'); begin.textContent = 'Output running';
    status.textContent = 'Automatic LOAD/INTERSECTION PROBE — arrival is not established.';
    log(reason);
    timer = setInterval(function () {
      position = Math.min(text.length, position + Number(surface.dataset.burst));
      output.textContent = text.slice(0, position);
      if (position === text.length) { full('natural-complete'); }
    }, Number(surface.dataset.interval));
  }
  function consider(reason) {
    log(reason, {loaded:loaded,intersecting:intersecting});
    if (!completed && loaded && intersecting && !document.hidden) { start('heuristic-start'); }
  }
  begin.addEventListener('click', function () { if (!running) { start('explicit-replay'); } });
  document.getElementById('reveal').addEventListener('click', function () { full('immediate-reveal'); });
  document.getElementById('controls').hidden = false;
  begin.textContent = 'Waiting for probe';
  status.textContent = 'Waiting for load and intersection; Show complete output is available.';
  if (completed) { full('return-complete'); }
  if (motion.matches) { full('reduced-motion'); }
  new IntersectionObserver(function (entries) {
    intersecting = entries[0].isIntersecting && entries[0].intersectionRatio > 0.99;
    consider('intersection');
  }, {threshold:[0,1]}).observe(surface);
  // Log experimental visual tracking, but do not treat it as an EPUB arrival API.
  try {
    new IntersectionObserver(function (entries) {
      log('track-visibility-observation', {isVisible:entries[0].isVisible,ratio:entries[0].intersectionRatio});
    }, {trackVisibility:true,delay:100}).observe(surface);
  } catch (_) { log('track-visibility-unavailable'); }
  window.addEventListener('pageshow', function (e) { loaded = true; consider('pageshow'); });
  document.addEventListener('visibilitychange', function () { consider('visibilitychange'); });
  window.addEventListener('pagehide', function () {
    clearInterval(timer); running = false;
    log('pagehide-incomplete', {completed:completed});
  });
  motion.addEventListener('change', function () { if (motion.matches) { full('motion-change'); } });
  log('probe-ready', {completed:completed});
})();
