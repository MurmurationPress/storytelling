'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {createReadingMeasurements}=require('../src/reading-analytics.cjs');
const {websiteChoice}=require('../src/web-analytics.cjs');
const {analyticsConfig}=require('../src/web-export.cjs');
const config={publicationId:'skip',revision:'v1',stories:[{id:'story',sceneId:'scene'}]};
function fixture() {
 let state,allowed=true;const events=[];
 const tracker=createReadingMeasurements({config,load:()=>state,save:s=>state=s,send:(name,params)=>events.push({name,params}),allowed:()=>allowed});
 const beat=(index,extra={})=>tracker.observe({sceneId:'scene',count:4,index,visible:true,completed:true,source:'next',mode:'autoplay',interaction:true,...extra});
 return {events,beat,tracker,setAllowed:value=>allowed=value,getState:()=>state};
}
test('unset/declined gate all events and persistence; restores and introduction never count skipped content',()=>{
 const f=fixture();f.setAllowed(false);f.beat(0);assert.equal(f.events.length,0);assert.equal(f.getState(),undefined);
 f.setAllowed(true);f.beat(3,{source:'restore'});f.beat(0,{sceneId:'introduction'});f.beat(0,{visible:false});assert.equal(f.events.length,0);
 f.beat(3);assert.deepEqual(f.events.map(e=>e.name),['reading_start','reading_interaction','story_progress']);assert.equal(f.events.at(-1).params.progress_percent,25);
});
test('milestones require actual unique completed beats; rerender/replay/back and refresh deduplicate',()=>{
 const f=fixture();f.beat(0,{completed:false});assert.equal(f.events.filter(e=>e.name==='story_progress').length,0);
 for(const i of [0,0,1,0,1,2,3,3,0])f.beat(i);
 assert.deepEqual(f.events.filter(e=>e.name==='story_progress').map(e=>e.params.progress_percent),[25,50,75,100]);
 assert.equal(f.events.filter(e=>e.name==='story_complete').length,1);assert.equal(f.events.filter(e=>e.name==='publication_complete').length,1);
 const tracker=createReadingMeasurements({config,load:f.getState,save:()=>{},send:()=>assert.fail('duplicate after reload'),allowed:()=>true});tracker.observe({sceneId:'scene',count:4,index:3,visible:true,completed:true,source:'replay',mode:'autoplay',interaction:true});
});
test('autoplay exposure completion is display_only; explicit action has separate evidence',()=>{
 const f=fixture();for(let i=0;i<4;i++)f.beat(i,{interaction:false,source:'autoplay'});
 const complete=f.events.find(e=>e.name==='story_complete');assert.equal(complete.params.evidence,'display_only');assert.equal(complete.params.interacted_beats,0);assert.equal(complete.params.autoplay_beats,4);
 assert.ok(!f.events.some(e=>e.name==='reading_interaction'));
 f.beat(0,{source:'reveal',mode:'manual'});assert.equal(f.events.at(-1).params.evidence,'reader_action');
});
test('withdrawal does not collect or backfill; resumed last beat cannot establish whole story completion',()=>{
 const f=fixture();f.beat(0);f.setAllowed(false);f.beat(1);f.beat(2);f.setAllowed(true);f.beat(3,{source:'restore'});f.beat(3);
 assert.ok(!f.events.some(e=>e.name==='story_complete'));assert.equal(f.getState().stories.story.displayed.length,2);
});
test('only allowlisted identifiers/metadata leave tracker; no raw snapshot or content',()=>{
 const f=fixture();f.beat(0,{raw:'SECRET',text:'PRIVATE',supporting:'NO'});
 assert.ok(!/SECRET|PRIVATE|NO/.test(JSON.stringify(f.events)));
});
test('CookieScript performance choice parses conservatively including ambiguous duplicate cookies',()=>{
 const cookie=data=>'CookieScriptConsent='+encodeURIComponent(JSON.stringify(data));
 assert.equal(websiteChoice(''),null);assert.equal(websiteChoice('CookieScriptConsent=broken'),null);
 const yes=cookie({action:'accept',categories:'["performance"]'}),no=cookie({action:'reject',categories:[]});
 assert.equal(websiteChoice(yes),'accepted');assert.equal(websiteChoice(no),'declined');assert.equal(websiteChoice(yes+'; '+no),'declined');assert.equal(websiteChoice(cookie({action:'accept',categories:[]})),'declined');
});
test('optional analytics config validates stable identity, excludes matter and derives content revision',()=>{
 assert.equal(analyticsConfig(undefined,[]),undefined);
 const value={measurementId:'G-TEST123',publicationId:'skip',stories:[{id:'s',sceneId:'a'}]};
 const scenes=[{id:'a',kind:'scene',data:{source:'One'}}];const first=analyticsConfig(value,scenes);
 scenes[0].data.source='Two';assert.notEqual(first.revision,analyticsConfig(value,scenes).revision);
 assert.throws(()=>analyticsConfig({...value,measurementId:'invented'},scenes));
 assert.throws(()=>analyticsConfig({...value,stories:[...value.stories,...value.stories]},scenes));
 assert.throws(()=>analyticsConfig(value,[{...scenes[0],kind:'front'}]));
});
test('last story alone cannot complete a multi-story publication, and source revisions reset coverage without restore events',()=>{
 let state;const events=[];const multi={...config,stories:[...config.stories,{id:'second',sceneId:'last'}]};
 const make=c=>createReadingMeasurements({config:c,load:()=>state,save:value=>state=value,send:name=>events.push(name),allowed:()=>true});
 const beat=sceneId=>({sceneId,index:0,count:1,visible:true,completed:true,source:'reveal',mode:'manual',interaction:true});
 const tracker=make(multi);tracker.observe(beat('last'));assert.ok(!events.includes('publication_complete'));
 tracker.observe(beat('scene'));assert.equal(events.filter(n=>n==='publication_complete').length,1);
 const updated=make({...multi,revision:'v2'});updated.observe({...beat('scene'),source:'restore'});assert.equal(state.key,'skip:v1');
 updated.observe(beat('last'));assert.equal(state.key,'skip:v2');assert.equal(events.filter(n=>n==='publication_complete').length,1);
});
