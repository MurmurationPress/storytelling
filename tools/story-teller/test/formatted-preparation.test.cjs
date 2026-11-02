'use strict';
// Exercise the shared Mermaid lifecycle with a deliberately stalled upstream
// renderer; actual SVG/security/layout are checked in the HTTP/native readers.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
function harness() {
 let release,calls=0,replaced=0,removed=0;const diagnostics=[];
 const status={hidden:true,textContent:''},surface={replaceChildren:()=>replaced++};
 const figure={dataset:{diagramSource:'flowchart TD\n A-->B',diagramLine:'12'},isConnected:true,getBoundingClientRect:()=>({width:400}),querySelector:s=>s==='.diagram-status'?status:surface};
 const root={querySelectorAll:()=>[figure]};
 const document={hidden:false,body:{append(){}},addEventListener(){},dispatchEvent:e=>diagnostics.push(e.detail),createElement:()=>({style:{},remove(){removed++;}})};
 const module={exports:{}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../src/mermaid-reader.cjs'),'utf8'),{
  module,document,console,setTimeout,clearTimeout,
  getComputedStyle:()=>({color:'rgb(20, 40, 60)',fontFamily:'serif'}),
  MutationObserver:class{observe(){}},CustomEvent:class{constructor(type,options){this.detail=options.detail;}},window:{matchMedia:()=>({addEventListener(){}})},
  require:name=>name==='mermaid'?{default:{initialize(){},render(){calls++;return new Promise(r=>release=r);}}}:name==='dompurify'?{sanitize(){throw Error('Stale SVG must never reach sanitisation/display');}}:name==='./mermaid-config.cjs'?{prepareDiagram:source=>({text:source,config:{},offset:0}),diagramOptions:()=>({})}:{}
 });
 return {render:module.exports.renderDiagrams,root,figure,status,diagnostics,document,release:()=>release?.({svg:'obsolete'}),calls:()=>calls,replaced:()=>replaced,removed:()=>removed};
}
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
test('a stalled Mermaid job resolves to a source-located fallback within its preparation bound; late SVG is ignored',async()=>{
 const h=harness();await h.render(h.root,()=>{},{timeoutMs:15});
 assert.equal(h.calls(),1);assert.ok(h.removed()>0);assert.equal(h.status.hidden,false);assert.match(h.status.textContent,/could not be displayed/);
 assert.equal(h.diagnostics[0].line,12);assert.match(h.diagnostics[0].message,/timed out/);
 h.release();await flush();assert.equal(h.replaced(),0);
});
test('aborting shared diagram preparation resolves the wait without stale output or diagnostics',async()=>{
 const h=harness(),controller=new AbortController();const work=h.render(h.root,()=>{},{signal:controller.signal});
 await flush();assert.equal(h.calls(),1);controller.abort();await work;h.release();await flush();
 assert.equal(h.replaced(),0);assert.ok(h.removed()>0);assert.equal(h.diagnostics.length,0);
});
test('reveal updates share pending diagram work and hidden/zero-width panes defer layout',async()=>{
 const h=harness();h.document.hidden=true;await h.render(h.root);assert.equal(h.calls(),0);
 h.document.hidden=false;h.figure.getBoundingClientRect=()=>({width:0});await h.render(h.root);assert.equal(h.calls(),0);
 h.figure.getBoundingClientRect=()=>({width:400});const controller=new AbortController();
 const first=h.render(h.root,()=>{},{signal:controller.signal}),second=h.render(h.root);await flush();assert.equal(h.calls(),1);
 controller.abort();await Promise.all([first,second]);h.release();await flush();assert.equal(h.replaced(),0);
});
