'use strict';
function sameDocument(saved,message) {
  if(!saved)return false;
  if(saved.sourceUri===message.uri)return true;
  if(saved.sourceIdentity&&message.sourceIdentity)return saved.sourceIdentity===message.sourceIdentity;
  if(message.sourceAliases?.includes(saved.sourceUri))return true;
  // Old editor snapshots predate logical identities. Only the scene's full UUID
  // is safe to recognize across a sibling-copy migration; readable basenames
  // alone are not unique across books.
  const id=message.legacySceneId;
  if(typeof saved.sourceUri==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id||'')) {
    try{return decodeURIComponent(saved.sourceUri).endsWith(`/scenes/${id}.md`);}catch{return false;}
  }
  return false;
}
module.exports={sameDocument};
