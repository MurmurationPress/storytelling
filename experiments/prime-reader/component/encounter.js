/* PRIME presentation extension v1. Publication component; no reader internals. */
(() => {
  'use strict';
  const publication = 'planetary-model-encounter-v1', resource = 'state.xhtml', component = 'surface';
  const instance = crypto.randomUUID();
  const marker = document.querySelector('meta[name="prime-presentation-v1"]');
  const complete = document.getElementById('complete'), output = document.getElementById('output');
  const surface = document.getElementById(component), begin = document.getElementById('begin');
  const status = document.getElementById('status'), motion = matchMedia('(prefers-reduced-motion: reduce)');
  const text = complete.textContent;
  let port, sequence = 0, position = 0, done = false, active = false, timer, initialized = false;
  let manual = !marker, rejected = 0;
  const setText = (el, value) => { if (el.textContent !== value) el.textContent = value; };
  const paint = () => {
    document.documentElement.classList.toggle('prime-pending', !done && !manual);
    surface.classList.toggle('performing', !done && (active || !manual));
    output.textContent = done ? '' : text.slice(0, position);
    setText(begin, motion.matches ? 'Static output' : done ? 'Replay output' : active ? 'Output running' : manual ? 'Begin output' : 'Output ready');
    begin.disabled = motion.matches || (!done && !manual);
    setText(status, motion.matches ? 'Reduced motion: complete output without animation.' :
      done ? 'Complete output. Turn the page whenever you wish.' :
      active ? 'Output running. You can turn the page at any time.' :
      manual ? 'Complete text is available. Begin output to perform it.' : 'Output paused until presented.');
  };
  const report = reason => port?.postMessage({type:'progress', version:1, publication, resource, component,
    instance, sequence, position, done, active, reducedMotion:motion.matches, reason, rejected,
    time:performance.now(), total:text.length});
  function stop() { clearTimeout(timer); timer = undefined; }
  function tick() {
    if (!active || done || motion.matches) return;
    position = Math.min(text.length, position + Number(surface.dataset.burst));
    if (position === text.length) done = true;
    paint(); report(done ? 'complete' : 'tick');
    if (!done) timer = setTimeout(tick, Number(surface.dataset.interval));
  }
  function run() {
    stop();
    if (motion.matches) { position = text.length; done = true; }
    paint();
    if (active && !done) timer = setTimeout(tick, Number(surface.dataset.interval));
  }
  function all(reason) { stop(); position = text.length; done = true; paint(); report(reason); }
  window.addEventListener('message', event => {
    const m = event.data;
    if (!marker || port || event.source !== parent || !m || m.type !== 'prime:connect' ||
        m.version !== 1 || m.token !== marker.content || m.publication !== publication ||
        m.resource !== resource || !event.ports[0]) return;
    port = event.ports[0];
    port.onmessage = ({data:m}) => {
      if (!m || m.version !== 1 || m.type !== 'presentation' || m.publication !== publication ||
          m.resource !== resource || m.component !== component || m.instance !== instance ||
          !Number.isSafeInteger(m.sequence) || m.sequence <= sequence || typeof m.active !== 'boolean') {
        rejected++; report('rejected-stale-or-invalid'); return;
      }
      sequence = m.sequence;
      if (!initialized) {
        position = Number.isInteger(m.restore?.position) ? Math.max(0, Math.min(text.length, m.restore.position)) : 0;
        done = m.restore?.done === true || position === text.length;
        initialized = true;
      }
      active = m.active;
      run(); report(active ? 'enter' : 'leave');
    };
    port.postMessage({type:'ready',version:1,publication,resource,component,instance});
  });
  begin.addEventListener('click', () => {
    if (motion.matches || (!done && (!manual || active))) return;
    position = 0; done = false;
    if (manual) active = true;
    run(); report('replay');
  });
  document.getElementById('reveal').addEventListener('click', () => all('immediate-reveal'));
  motion.addEventListener('change', () => { if (motion.matches) all('reduced-motion'); else paint(); });
  // Reader presentation is authoritative. Browser hiding can only stop work.
  document.addEventListener('visibilitychange', () => { if (document.hidden) { active = false; stop(); report('browser-hidden'); } });
  window.addEventListener('pagehide', () => { active = false; stop(); report('pagehide'); });
  document.getElementById('controls').hidden = false;
  if (motion.matches) { position = text.length; done = true; }
  paint();
})();
