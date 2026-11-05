'use strict';
const {inspectStructure}=require('./structure.cjs');
function formattedInfo(span) {
  if(span.type!=='fence'||span.level!==0||span.info.trim()!=='typeout')return null;
  const inner=inspectStructure(span.token.content);
  const separator=inner.lines.findIndex(line=>!line.text.trim());
  if(separator<0||!inner.lines.slice(0,separator).some(line=>/^@format (annotation|janus|janus-log)\s*$/.test(line.text)))return null;
  return {inner,bodyLine:separator+1,header:span.token.content.slice(0,inner.lines[separator+1]?.start??span.token.content.length)};
}
function literalLine(structure,line) {
  const span=structure.spans.find(s=>['fence','code_block'].includes(s.type)&&line>=s.start&&line<s.end);
  if(!span)return false;
  const formatted=formattedInfo(span);
  if(!formatted)return true;
  // Formatted bodies may themselves contain literal fenced examples/diagrams.
  const {inner,bodyLine}=formatted,local=line-span.start-1;
  if(local<bodyLine||line===span.end-1)return true;
  return inner.spans.some(s=>['fence','code_block'].includes(s.type)&&local>=s.start&&local<s.end);
}
module.exports={literalLine,formattedInfo};
