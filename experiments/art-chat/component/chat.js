/* Authored Art messages. Same presentation-v1 bridge; component owns its clock. */
(() => {
  'use strict';
  const identity=JSON.parse(document.querySelector('meta[name="murmuration-component"]').content);
  const messages=JSON.parse(document.getElementById('settings').textContent).messages;
  const protocol=MurmurationPresentation, instance=crypto.randomUUID();
  const marker=document.querySelector('meta[name="prime-presentation-v1"]');
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const transcript=document.getElementById('transcript'), performanceView=document.getElementById('performance');
  const rows=[...performanceView.querySelectorAll('.message')], indicator=document.getElementById('typing');
  const begin=document.getElementById('begin'), status=document.getElementById('status');
  const capabilities=['replay','reveal','reduced-motion','static','pause-on-leave'];
  let port, sequence=0, active=false, initialized=false, rejected=0, timer, clock=0;
  let localBeforeRestore=false;
  let playing=!!marker, done=false, shown=0, phase='delay', remaining=messages[0].delay_ms, lastShown=-1;
  const setText=(el,text)=>{if(el.textContent!==text)el.textContent=text;};
  const snapshot=()=>({contentVersion:identity.contentVersion,stateVersion:identity.stateVersion,
    done,progress:{shown,phase,remainingMs:Math.round(remaining)}});
  const report=reason=>port?.postMessage({...identity,type:'progress',version:1,instance,sequence,
    snapshot:snapshot(),active,capabilities,reason,rejected,time:performance.now()});
  function paint() {
    const perform=playing && !motion.matches;
    transcript.hidden=perform; performanceView.hidden=!perform;
    document.documentElement.classList.toggle('local-performance',perform);
    rows.forEach((el,i)=>{el.hidden=i>=shown;});
    indicator.hidden=!perform || phase!=='typing' || done;
    if (!indicator.hidden) setText(indicator.querySelector('span'),messages[shown].speaker+' is responding');
    if(shown!==lastShown) { performanceView.scrollTop=performanceView.scrollHeight; lastShown=shown; }
    begin.disabled=motion.matches || (playing && !done);
    setText(begin,motion.matches?'Static conversation':done?'Replay conversation':playing?'Conversation running':'Begin conversation');
    setText(status,motion.matches?'Reduced motion: complete conversation without animation.':
      !playing?'Complete conversation. Optional playback is available.':
      done?'Conversation complete. Turn the page whenever you wish.':
      !active?'Conversation paused until presented.':phase==='typing'?'A response is arriving. You can turn the page at any time.':
      'Conversation running. You can turn the page at any time.');
  }
  function stop() {clearTimeout(timer);timer=undefined;}
  function step() {
    if(phase==='delay' && messages[shown].typing_ms>0) {
      phase='typing';remaining+=messages[shown].typing_ms;
    } else {
      shown++;
      if(shown===messages.length) {done=true;phase='complete';remaining=0;}
      else {phase='delay';remaining+=messages[shown].delay_ms;}
    }
  }
  function consume() {
    if(!active || done) return;
    const now=performance.now();remaining-=now-clock;clock=now;
    while(remaining<=0 && !done) step();
  }
  function arm() {
    stop();
    if(active && !done && !motion.matches) timer=setTimeout(()=>{
      consume();paint();report(done?'complete':'tick');arm();
    },Math.min(50,Math.max(1,remaining)));
  }
  function all(reason) {stop();shown=messages.length;done=true;phase='complete';remaining=0;paint();report(reason);}
  function restore(value) {
    if(!value) return true;
    if(!protocol.snapshot(value,identity)) return false;
    const p=value.progress;
    if(!Number.isInteger(p.shown) || p.shown<0 || p.shown>messages.length ||
       !Number.isFinite(p.remainingMs) || p.remainingMs<0) return false;
    if(value.done) {
      if(p.shown!==messages.length || p.phase!=='complete' || p.remainingMs!==0) return false;
    } else {
      if(p.shown===messages.length || !['delay','typing'].includes(p.phase)) return false;
      const duration=messages[p.shown][p.phase==='delay'?'delay_ms':'typing_ms'];
      if(duration===0 || p.remainingMs>duration) return false;
    }
    shown=p.shown;phase=p.phase;remaining=p.remainingMs;done=value.done;return true;
  }
  window.addEventListener('message',event=>{
    const m=event.data;
    if(!marker || port || event.source!==parent || !protocol.sameIdentity(m,identity) ||
       m.type!=='prime:connect' || m.token!==marker.content || !event.ports[0]) return;
    port=event.ports[0];
    port.onmessage=({data:m})=>{
      if(!protocol.accepts(m,identity,instance,sequence)) {rejected++;report('rejected-stale-or-invalid');return;}
      consume();stop();sequence=m.sequence;
      let restored=true;
      if(!initialized) {restored=localBeforeRestore || restore(m.restore);initialized=true;}
      active=m.active;clock=performance.now();
      if(motion.matches) all('reduced-motion'); else {paint();arm();}
      report(!restored?'restore-rejected':active?'enter':'leave');
    };
    port.postMessage({...identity,type:'ready',version:1,instance,capabilities});
  });
  begin.addEventListener('click',()=>{
    if(motion.matches || (playing && !done)) return;
    localBeforeRestore ||= !initialized;
    stop();shown=0;phase='delay';remaining=messages[0].delay_ms;done=false;playing=true;
    if(!marker) active=true;
    clock=performance.now();paint();report('replay');arm();
  });
  document.getElementById('reveal').addEventListener('click',()=>{localBeforeRestore ||= !initialized;playing=true;all('immediate-reveal');});
  motion.addEventListener('change',()=>{if(motion.matches) all('reduced-motion');else paint();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){consume();active=false;stop();paint();report('browser-hidden');}});
  window.addEventListener('pagehide',()=>{consume();active=false;stop();report('pagehide');});
  document.getElementById('controls').hidden=false;
  if(motion.matches) {shown=messages.length;done=true;phase='complete';remaining=0;}
  paint();
})();
