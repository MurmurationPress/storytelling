/* Explicit start only. Document visibility is not reader page location. */
(function () {
  'use strict';
  var complete = document.getElementById('complete');
  var output = document.getElementById('output');
  var surface = document.getElementById('surface');
  var begin = document.getElementById('begin');
  var reveal = document.getElementById('reveal');
  var status = document.getElementById('status');
  var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var text = complete.textContent;
  var timer, position = 0, running = false;
  var key = 'planetary-host-comparison-v2';
  function trace(reason) { if (window.primeTrace) { window.primeTrace(reason); } }
  function remember() { try { sessionStorage.setItem(key, 'visited'); } catch (_) {} }
  function showAll(reason) {
    clearInterval(timer);
    running = false;
    surface.classList.remove('performing');
    output.textContent = '';
    status.textContent = motion.matches ?
      'Reduced motion is active. Complete output is shown without animation.' :
      'Complete output. Turn the page whenever you wish.';
    begin.textContent = motion.matches ? 'Static output' : 'Replay output';
    begin.disabled = motion.matches;
    remember();
    trace('show-all:' + reason);
  }
  function tick() {
    position = Math.min(text.length, position + Number(surface.dataset.burst));
    output.textContent = text.slice(0, position);
    if (position === text.length) { showAll('timer-complete'); }
  }
  function startTimer() {
    clearInterval(timer);
    timer = setInterval(tick, Number(surface.dataset.interval));
  }
  begin.addEventListener('click', function () {
    trace('begin-click');
    if (motion.matches) { showAll('reduced-motion'); return; }
    // Ignore duplicate activation while running; replay starts only from complete.
    if (running) { trace('duplicate-begin-ignored'); return; }
    remember();
    position = 0;
    output.textContent = '';
    surface.classList.add('performing');
    running = true;
    status.textContent = 'Output running. You can turn the page at any time.';
    begin.textContent = 'Output running';
    startTimer();
    trace('start');
  });
  reveal.addEventListener('click', function () { showAll('immediate-reveal'); });
  // Actual document departure completes this performance. A new load starts complete.
  window.addEventListener('pagehide', function () { showAll('pagehide'); });
  document.addEventListener('visibilitychange', function () {
    trace('visibilitychange');
    if (!running) { return; }
    // Background visibility may be unrelated to page turns. Preserve the prefix,
    // pause work while hidden, and resume the reader's explicit performance.
    if (document.hidden) {
      clearInterval(timer);
      status.textContent = 'Output paused while the document is hidden.';
      trace('pause-hidden');
    } else {
      startTimer();
      status.textContent = 'Output running. You can turn the page at any time.';
      trace('resume-visible');
    }
  });
  motion.addEventListener('change', function () {
    if (motion.matches) { showAll('motion-change'); }
    else {
      begin.disabled = false;
      begin.textContent = 'Replay output';
      status.textContent = 'Complete output. Select Replay output to perform it.';
      trace('motion-restored');
    }
  });
  document.getElementById('controls').hidden = false;
  try { if (sessionStorage.getItem(key)) { begin.textContent = 'Replay output'; } } catch (_) {}
  if (motion.matches) { showAll('initial-reduced-motion'); }
  trace('ready');
})();
