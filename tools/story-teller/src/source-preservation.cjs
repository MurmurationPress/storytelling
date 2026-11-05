'use strict';
const path=require('node:path');
const {inspectStructure}=require('./structure.cjs');
const {formattedInfo}=require('./source-literals.cjs');
function losslessUtf8(bytes,file) {
  const source=bytes.toString('utf8');
  if(!Buffer.from(source,'utf8').equals(bytes))throw Error(`${file}: non-UTF-8 encoding cannot be rewritten losslessly; preserve the original bytes and explicitly convert a disposable copy before retrying`);
  return source; // Buffer conversion preserves a UTF-8 BOM and original EOLs.
}
// Independent of reference rewriting: compare literal parser tokens and authored
// component headers. Formatted prose may change resource URLs; its code may not.
function literalSnapshot(source) {
  const structure=inspectStructure(source),result=[];
  function collect(tokens,formattedBodies) {
    for(const token of tokens) {
      if(['fence','code_block'].includes(token.type)) {
        const formatted=formattedBodies?formattedInfo({type:token.type,level:token.level,info:token.info?.trim(),token}):null;
        if(formatted) {result.push(['component-header',formatted.header]);collect(formatted.inner.tokens,false);}
        else result.push([token.type,token.info||'',token.content]);
      }
      if(token.children)for(const child of token.children)if(child.type==='code_inline')result.push(['code_inline',child.content]);
    }
  }
  collect(structure.tokens,true);return result;
}
function assertLiteralPreserved(before,after,file) {
  if(JSON.stringify(literalSnapshot(before))!==JSON.stringify(literalSnapshot(after)))throw Error(`${file}: authored literal/component text changed; refusing to validate or save the rewrite`);
}
// Compare authored Markdown tokens, resolving only parsed URI attributes to
// their original project identities. No expected text comes from the rewriter.
function authoredSnapshot(source,file,mapping,after) {
  function uri(value) {
    if(/^(?:[a-z][\w+.-]*:|[\/#?])/i.test(value))return value;
    const [,raw,suffix]=value.match(/^([^#?]*)(.*)$/);
    let decoded;try{decoded=decodeURIComponent(raw);}catch{return value;}
    const resolved=decoded?path.posix.normalize(path.posix.join(path.posix.dirname(file),decoded)):file;
    const identity=after?(Object.keys(mapping).find(old=>mapping[old]===resolved)||resolved):resolved;
    return `project:${identity}${suffix}`;
  }
  function tokens(list,formattedBodies) {
    return list.map(token=>{
      const formatted=formattedBodies&&token.type==='fence'?formattedInfo({type:token.type,level:token.level,info:token.info?.trim(),token}):null;
      return {type:token.type,tag:token.tag,markup:token.markup,info:token.info,
        attrs:token.attrs?.map(([name,value])=>[name,['src','href'].includes(name)?uri(value):value]),
        content:formatted?{header:formatted.header,body:tokens(formatted.inner.tokens,false)}:['inline','image'].includes(token.type)?undefined:token.content,
        children:token.children?tokens(token.children,false):undefined};
    });
  }
  return tokens(inspectStructure(source).tokens,true);
}
function assertAuthoredPreserved(before,after,oldFile,newFile,mapping) {
  assertLiteralPreserved(before,after,oldFile);
  if(JSON.stringify(authoredSnapshot(before,oldFile,mapping,false))!==JSON.stringify(authoredSnapshot(after,newFile,mapping,true)))throw Error(`${oldFile}: unrelated authored content or reference identity changed; refusing to validate or save the rewrite`);
}
module.exports={losslessUtf8,literalSnapshot,assertLiteralPreserved,assertAuthoredPreserved};
