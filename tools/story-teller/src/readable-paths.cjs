'use strict';
const crypto = require('node:crypto');
const key = value => value.normalize('NFKC').toLowerCase();
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const opaque=value=>/^(?:[a-f0-9]{32,64}|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})$/i.test(value);
function slug(value) {
  let result = String(value).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
  while (Buffer.byteLength(result) > 100) result = Array.from(result).slice(0, -1).join('');
  result = result.replace(/-+$/g, '') || 'untitled';
  if (/^(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³])$/i.test(result)) result = `story-${result}`;
  return result;
}
function allocator(existing = []) {
  const used = new Set(existing.map(key));
  return (directory, title, extension, identity) => {
    const base = `${directory}/${slug(title)}`, ext = extension.toLowerCase();
    let name = base + ext;
    const suffix = hash(String(identity));
    for (let length = 8; used.has(key(name)); length += 4) {
      if (length > 64) throw Error(`Cannot allocate collision-free path for ${title}`);
      name = `${base}-${suffix.slice(0, length)}${ext}`;
    }
    used.add(key(name)); return name;
  };
}
module.exports = { key, hash, slug, opaque, allocator };
