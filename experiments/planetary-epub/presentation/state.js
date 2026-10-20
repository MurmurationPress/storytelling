/* No load/visibility-based automatic start: reader location is not established. */
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
  var timer, position = 0;
  var key = 'planetary-host-comparison-v1';
  function remember() { try { sessionStorage.setItem(key, 'visited'); } catch (_) {} }
  function showAll() {
    clearInterval(timer);
    surface.classList.remove('performing');
    output.textContent = '';
    status.textContent = 'Complete output. Turn the page whenever you wish.';
    begin.textContent = 'Replay output';
    remember();
  }
  begin.addEventListener('click', function () {
    if (motion.matches) { showAll(); return; }
    clearInterval(timer);
    remember();
    position = 0;
    output.textContent = '';
    surface.classList.add('performing');
    status.textContent = 'Output running. You can turn the page at any time.';
    begin.textContent = 'Restart output';
    timer = setInterval(function () {
      position = Math.min(text.length, position + Number(surface.dataset.burst));
      output.textContent = text.slice(0, position);
      if (position === text.length) { showAll(); }
    }, Number(surface.dataset.interval));
  });
  reveal.addEventListener('click', showAll);
  // These are conservative exits, not claims about reader page visibility.
  window.addEventListener('pagehide', showAll);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { showAll(); }
  });
  motion.addEventListener('change', function () { if (motion.matches) { showAll(); } });
  document.getElementById('controls').hidden = false;
  try { if (sessionStorage.getItem(key)) { begin.textContent = 'Replay output'; } } catch (_) {}
})();
