/* Small trusted-publication shell. EPUB parsing, pagination and turns are EPUB.js. */
(() => {
  'use strict';
  const params = new URLSearchParams(location.search);
  const art = params.get('book') === 'art';
  const publication = art ? 'art-chat-v1' : 'planetary-model-encounter-v1';
  const packageURL = art ? 'publication/art-chat-v1.epub' : 'publication/planetary-model-encounter-v1.epub';
  const preloadResource = art ? 'ask.xhtml' : 'state.xhtml';
  const storageKey = publication + ':reader-v1', protocol = MurmurationPresentation;
  document.getElementById('book-title').textContent = art ? 'Art' : 'Planetary Model';
  document.title = (art ? 'Art' : 'Planetary Model') + ' · reader integration';
  const reader = document.getElementById('reader');
  const token = crypto.randomUUID(), records = new Set(), trace = [];
  let saved;
  try { saved = JSON.parse(localStorage.getItem(storageKey)) || {}; } catch { saved = {}; }
  if (typeof saved !== 'object' || Array.isArray(saved)) saved={};
  if (!saved.components || typeof saved.components !== 'object' || Array.isArray(saved.components)) saved.components={};
  let book, rendition, preloadBook, preloadRendition, currentLocation, pending = 0, generation = 0;
  let chain = Promise.resolve(), latestPrimary, ready = false;
  const frames = n => new Promise(resolve => { const step=()=> --n <= 0 ? resolve() : requestAnimationFrame(step); requestAnimationFrame(step); });
  function log(event, detail = {}) {
    trace.push({time:Math.round(performance.now()), event, ...detail});
    if (trace.length > 4000) trace.shift();
    if (document.getElementById('development').open) {
      document.getElementById('log').textContent = trace.slice(-30).map(x=>JSON.stringify(x)).join('\n');
    }
  }
  function persist() { try { localStorage.setItem(storageKey,JSON.stringify(saved)); } catch { log('storage-unavailable'); } }
  function presentation(rec, active, reason, force = false) {
    if (!rec.instance || rec.closed || (!force && rec.active === active)) return;
    rec.active = active;
    const payload = {...rec.identity,type:'presentation',version:1,
      instance:rec.instance,sequence:++rec.sequence,active,reason};
    if (!rec.initialized) { payload.restore = rec.legacy ? saved.output || {position:0,done:false} : saved.components[protocol.key(rec.identity)] || null; rec.initialized = true; }
    rec.lastMessage = payload;
    rec.port.postMessage(payload);
    log(active ? 'enter-sent' : 'leave-sent',{instance:rec.instance,sequence:rec.sequence,owner:rec.owner,component:rec.identity.component,reason});
  }
  function isPresented(rec) {
    if (rec.owner !== 'primary' || pending || document.hidden || !ready || rec.closed) return false;
    if (!currentLocation || rec.contents.sectionIndex < currentLocation.start.index || rec.contents.sectionIndex > currentLocation.end.index) return false;
    if (!rendition.getContents().includes(rec.contents)) return false;
    const frame = rec.contents.window.frameElement, el = rec.contents.document.getElementById('surface');
    if (!frame?.isConnected || !el) return false;
    // Host-owned visible container + actual frame + component geometry. Never just
    // an intersection computed within a loaded/preloaded publication frame.
    for (let node = frame; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility !== 'visible' || Number(style.opacity) === 0 || node.hidden) return false;
    }
    const f = frame.getBoundingClientRect(), e = el.getBoundingClientRect(), r = reader.getBoundingClientRect();
    const sx = f.width / frame.clientWidth, sy = f.height / frame.clientHeight;
    const left = Math.max(r.left, f.left, f.left + e.left*sx,0);
    const right = Math.min(r.right, f.right, f.left + e.right*sx,innerWidth);
    const top = Math.max(r.top, f.top, f.top + e.top*sy,0);
    const bottom = Math.min(r.bottom,f.bottom,f.top + e.bottom*sy,innerHeight);
    return right-left > 1 && bottom-top > 1;
  }
  function reconcile(reason) {
    for (const rec of records) {
      if (!rec.contents.window.frameElement?.isConnected) {
        presentation(rec,false,'document-replaced');
        rec.closed=true; rec.port.close(); rec.resizeObserver?.disconnect(); records.delete(rec);
        if (latestPrimary === rec) latestPrimary=undefined;
        log('retired',{instance:rec.instance,owner:rec.owner});
      } else presentation(rec,isPresented(rec),reason);
    }
  }
  function suspend(reason) { for (const rec of records) presentation(rec,false,reason); }
  function connect(contents, owner) {
    // Both visible and artificial-preload renditions use this same public hook.
    const doc = contents.document;
    doc.addEventListener('keydown',key,true);
    let touch;
    doc.addEventListener('touchstart',e=> { if (!e.target.closest('button,a,input,textarea,select')) touch=e.changedTouches[0]; else touch=undefined; },{passive:true});
    doc.addEventListener('touchend',e=> {
      if (!touch) return;
      const dx=e.changedTouches[0].clientX-touch.clientX, dy=e.changedTouches[0].clientY-touch.clientY;
      if (Math.abs(dx)>60 && Math.abs(dy)<40) turn(dx<0 ? 'next':'prev');
      touch=undefined;
    },{passive:true});
    if (!doc.getElementById('surface') || !doc.querySelector('meta[name="prime-presentation-v1"]')) return;
    let identity;
    try { identity = JSON.parse(doc.querySelector('meta[name="murmuration-component"]')?.content || 'null'); } catch { return; }
    const legacy = !identity;
    identity ||= {publication,resource:'state.xhtml',component:'surface'};
    if (identity.publication !== publication) return;
    const channel = new MessageChannel();
    const rec = {contents,owner,identity,legacy,port:channel.port1,sequence:0,active:null,closed:false};
    records.add(rec);
    if (owner === 'primary') latestPrimary=rec;
    rec.port.onmessage = ({data:m}) => {
      if (rec.closed || !protocol.sameIdentity(m,rec.identity)) return;
      if (m.type === 'ready' && !rec.instance && typeof m.instance === 'string') {
        rec.instance=m.instance;
        rec.capabilities=rec.legacy ? ['replay','reveal','reduced-motion','static'] : m.capabilities;
        // Atomic initial inactive snapshot, including progress restoration. A late
        // subscriber is then reconciled with the current host presentation.
        presentation(rec,false,'initial',true);
        log('registered',{owner,instance:rec.instance});
        reconcile('registration');
      } else if (m.type === 'progress' && m.instance === rec.instance && m.sequence === rec.sequence) {
        log('progress',{owner,component:identity.component,instance:m.instance,sequence:m.sequence,position:m.position,done:m.done ?? m.snapshot?.done,progress:m.snapshot?.progress,active:m.active,reason:m.reason,rejected:m.rejected});
        rec.progress=m;
        if (rec.legacy && rec === latestPrimary && owner === 'primary' && Number.isInteger(m.position) && m.position>=0 && m.position<=m.total) {
          saved.output={position:m.position,done:m.done===true}; persist();
        } else if (!rec.legacy && rec === latestPrimary && owner === 'primary' && protocol.snapshot(m.snapshot,identity)) {
          saved.components[protocol.key(identity)]=m.snapshot; persist();
        }
      } else log('host-rejected-stale',{owner,instance:m.instance,sequence:m.sequence});
    };
    const attach = () => {
      if (rec.closed || !contents.window.frameElement?.isConnected) return;
      contents.window.postMessage({...identity,type:'prime:connect',version:1,token},'*',[channel.port2]);
    };
    const delay = Number(params.get('registrationDelay') || 0);
    if (delay > 0) setTimeout(attach,Math.min(delay,10000)); else attach();
    rec.resizeObserver = new ResizeObserver(()=>reconcile('component-resize'));
    rec.resizeObserver.observe(doc.getElementById('surface'));
  }
  async function create(owner, target) {
    const b = ePub();
    // Documented source hook runs before serialization and script execution.
    b.spine.hooks.content.register((doc,section)=> {
      if ((!art && section.href !== 'state.xhtml') || params.get('bridge') === '0' || params.get('scripts') === '0') return;
      const meta = doc.createElementNS('http://www.w3.org/1999/xhtml','meta');
      meta.setAttribute('name','prime-presentation-v1'); meta.setAttribute('content',token);
      doc.head.insertBefore(meta,doc.head.firstChild);
    });
    await b.open(packageURL);
    const r = b.renderTo(target,{width:'100%',height:'100%',spread:'none',flow:'paginated',manager:'default',
      allowScriptedContent:params.get('scripts') !== '0',allowPopups:false});
    r.hooks.content.register(contents=>connect(contents,owner));
    r.hooks.unloaded.register(view=> {
      for (const rec of records) if (rec.contents === view.contents) {
        presentation(rec,false,'unloaded'); rec.closed=true; rec.port.close(); records.delete(rec);
      }
    });
    if (owner === 'primary') {
      r.on('relocated',location=> {
        currentLocation=location;
        saved.location=location.start.cfi; persist();
        log('relocated',{href:location.start.href,index:location.start.index,page:location.start.displayed.page});
        reconcile('relocated');
      });
      r.on('resized',()=>{ suspend('resize'); frames(2).then(()=>reconcile('resize-settled')); });
    }
    return {b,r};
  }
  function navigate(action) {
    pending++; generation++; suspend('navigation-start'); reader.classList.add('transitioning');
    chain=chain.then(async()=> {
      await action(); await frames(2);
    }).catch(error=> { document.getElementById('error').textContent=error.message; log('error',{message:error.message}); })
      .finally(()=> {
        pending--;
        if (!pending) {
          reader.classList.remove('transitioning');
          log('display-committed',{generation,href:currentLocation?.start.href});
          reconcile('display-committed');
        }
      });
    return chain;
  }
  function turn(direction) { if (ready) return navigate(()=>direction === 'next' ? rendition.next() : rendition.prev()); }
  function key(e) {
    if (e.altKey || e.ctrlKey || e.metaKey || e.target.closest('input,textarea,select,[contenteditable="true"]')) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); turn(e.key === 'ArrowRight' ? 'next' : 'prev'); }
  }
  document.addEventListener('keydown',key,true);
  document.getElementById('previous').onclick=()=>turn('prev');
  document.getElementById('next').onclick=()=>turn('next');
  document.getElementById('reset').onclick=()=> { localStorage.removeItem(storageKey); location.reload(); };
  async function preload() {
    if (preloadRendition) return;
    ({b:preloadBook,r:preloadRendition}=await create('preload',document.getElementById('preloader')));
    await preloadRendition.display(preloadResource);
    log('invisible-preload-ready');
  }
  document.getElementById('preload').onclick=preload;
  document.addEventListener('visibilitychange',()=> { if (document.hidden) suspend('host-hidden'); else reconcile('host-visible'); });
  window.addEventListener('pagehide',()=>suspend('host-pagehide'));
  window.addEventListener('pageshow',()=>reconcile('host-pageshow'));
  window.addEventListener('resize',()=> { suspend('host-resize'); frames(3).then(()=>reconcile('host-resize-settled')); });
  // Optional development interface, used by the real-browser regression suite.
  // It is host-only; not part of the publication bridge or a replacement navigator.
  window.primeExperiment={
    trace, get ready(){return ready;}, get location(){return currentLocation;}, get saved(){return saved;},
    get records(){return [...records].map(r=>({owner:r.owner,component:r.identity.component,capabilities:r.capabilities,instance:r.instance,active:r.active,sequence:r.sequence,progress:r.progress}));},
    preload,
    staleProbe(){const r=[...records].find(r=>r.owner==='primary' && !r.closed); if(r?.lastMessage) {
      r.port.postMessage({...r.lastMessage,sequence:r.sequence-1,active:true});
      r.port.postMessage({...r.lastMessage,instance:'obsolete-document',sequence:r.sequence+100,active:true});
    }}
  };
  (async()=> {
    ({b:book,r:rendition}=await create('primary',reader));
    ready=true;
    await navigate(()=>rendition.display(saved.location || undefined));
    if (params.has('preload')) await preload();
    document.getElementById('diagnostic').textContent='EPUB.js 0.3.93 · ' + publication + ' · presentation extension v1';
    log('shell-ready');
  })().catch(e=> { document.getElementById('error').textContent=e.stack; });
})();
