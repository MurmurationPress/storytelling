/* Small draft-v1 envelope helpers shared by the host and Art. Not a component SDK. */
(function (root) {
  'use strict';
  const fields = ['publication','resource','component'];
  function sameIdentity(message, identity) {
    return !!message && message.version === 1 && fields.every(k => message[k] === identity[k]) &&
      (!identity.contract || (message.contract === identity.contract &&
        message.contentVersion === identity.contentVersion && message.stateVersion === identity.stateVersion));
  }
  function accepts(message, identity, instance, sequence) {
    return sameIdentity(message,identity) && message.type === 'presentation' &&
      message.instance === instance && Number.isSafeInteger(message.sequence) &&
      message.sequence > sequence && typeof message.active === 'boolean';
  }
  function key(identity) {
    return JSON.stringify(fields.concat(['contract','contentVersion','stateVersion']).map(k=>identity[k] ?? null));
  }
  function snapshot(value, identity) {
    if (!value || value.contentVersion !== identity.contentVersion || value.stateVersion !== identity.stateVersion ||
        typeof value.done !== 'boolean' || !value.progress || typeof value.progress !== 'object' || Array.isArray(value.progress)) return false;
    try { return JSON.stringify(value).length <= 16384; } catch { return false; }
  }
  const api={sameIdentity,accepts,key,snapshot};
  if(typeof module !== 'undefined' && module.exports) module.exports=api;
  else root.MurmurationPresentation=api;
})(globalThis);
