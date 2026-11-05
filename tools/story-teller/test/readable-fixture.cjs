'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),{randomUUID}=require('node:crypto');
async function legacyWebFixture(root) {
  await fs.cp(path.join(__dirname,'../samples/web-project'),root,{recursive:true});
  const file=path.join(root,'story-teller.project.json'),m=JSON.parse(await fs.readFile(file));
  const ids=new Map([...m.parts,...m.scenes].map(item=>[item.id,randomUUID()]));
  for(const p of m.parts){p.id=ids.get(p.id);p.scenes=p.scenes.map(id=>ids.get(id));}
  for(const s of m.scenes){s.id=ids.get(s.id);s.partId=ids.get(s.partId);const old=s.file;s.file=`scenes/${s.id}.md`;await fs.rename(path.join(root,old),path.join(root,s.file));}
  m.sequence=m.parts.map(p=>({kind:'part',id:p.id}));m.unknown={keep:'custom metadata'};
  await fs.writeFile(file,JSON.stringify(m,null,2)+'\n');return m;
}
module.exports={legacyWebFixture};
