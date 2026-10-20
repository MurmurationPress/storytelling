const assert=require('node:assert/strict');
const p=require('../prime-reader/component/presentation.js');
const legacy={publication:'planetary-model-encounter-v1',resource:'state.xhtml',component:'surface'};
const chat={publication:'art-chat-v1',resource:'ask.xhtml',component:'art.robin-presence',contract:'presentation-v1-draft1',stateVersion:1,contentVersion:'fixture-content'};
for(const identity of [legacy,chat]) {
 const message={...identity,version:1,type:'presentation',instance:'fresh-instance',sequence:2,active:true};
 assert(p.accepts(message,identity,'fresh-instance',1));
 assert(!p.accepts({...message,instance:'old-instance'},identity,'fresh-instance',1));
 assert(!p.accepts({...message,sequence:1},identity,'fresh-instance',1));
 assert(!p.accepts({...message,sequence:NaN},identity,'fresh-instance',1));
 assert(!p.accepts({...message,active:'yes'},identity,'fresh-instance',1));
}
const snapshot={contentVersion:chat.contentVersion,stateVersion:1,done:false,progress:{shown:1,phase:'typing',remainingMs:400}};
assert(p.snapshot(snapshot,chat));assert(!p.snapshot({...snapshot,contentVersion:'changed'},chat));
assert(!p.snapshot({...snapshot,stateVersion:2},chat));
assert.notEqual(p.key(chat),p.key({...chat,contentVersion:'changed'}));
assert.notEqual(p.key(chat),p.key({...chat,component:'another-occurrence'}));
console.log('PASS: executable envelope examples for accepted PRIME identity and Art versioned snapshot; stale/invalid identity and state rejected');
