'use strict';
// Fictional fixture, generated only in disposable test folders. An optional
// explicitly supplied PNG can verify decoder compatibility without committing it.
const fs=require('node:fs/promises'),path=require('node:path');
async function createFixture(root,{asset}={}) {
 const write=async(file,text)=>{await fs.mkdir(path.dirname(path.join(root,file)),{recursive:true});await fs.writeFile(path.join(root,file),text);};
 const note=(type,parent,key,body='')=>`---\ntype: ${type}\nparent: "[[${parent}]]"\nmanuscript_order_key: "${key}"\n---\n${body}`;
 await write('Books/Lantern.md','---\ntype: book\ntitle: Fictional import repairs\n---\n');
 const entries=[['Before','scene','Books/Lantern','1000000000'],['First','part','Books/Lantern','3000000000'],['First/Child','scene','Books/Lantern/First','9000000000'],['Between','scene','Books/Lantern','5000000000'],['Second','part','Books/Lantern','7000000000'],['Second/Last','scene','Books/Lantern/Second','1000000000'],['After','scene','Books/Lantern','9000000000']];
 for(const [file,type,parent,key]of entries)await write(`Books/Lantern/${file}.md`,note(type,parent,key,type==='part'?'':file==='First/Child'?'Child prose.\n\n> ![[Shared graph.png|A fictional chart.]]\n\n![[Drawing.svg]]\n\n![[Companion.md]]\n':`${path.basename(file)} prose.\n`));
 await fs.mkdir(path.join(root,'Media/Charts'),{recursive:true});
 await fs.copyFile(asset || path.join(__dirname,'../samples/assets/harbour-portrait.png'),path.join(root,'Media/Charts/Shared graph.png'));
 await write('Media/Drawing.svg','<svg xmlns="http://www.w3.org/2000/svg"/>');await write('Notes/Companion.md','An unsupported transclusion fixture.');
 return {folder:path.join(root,'Books/Lantern'),expected:['Before','Child','Between','Last','After']};
}
module.exports={createFixture};
