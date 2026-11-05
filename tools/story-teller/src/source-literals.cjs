'use strict';
const {inspectStructure}=require('./structure.cjs');
function literalLine(structure,line) {
  const span=structure.spans.find(s=>['fence','code_block'].includes(s.type)&&line>=s.start&&line<s.end);
  if(!span)return false;
  if(span.type!=='fence'||span.info.trim()!=='typeout'||!/^@format (annotation|janus|janus-log)\s*$/m.test(span.token.content))return true;
  // Formatted bodies may themselves contain literal fenced examples/diagrams.
  const inner=inspectStructure(span.token.content),local=line-span.start-1;
  return inner.spans.some(s=>['fence','code_block'].includes(s.type)&&local>=s.start&&local<s.end);
}
module.exports={literalLine};
