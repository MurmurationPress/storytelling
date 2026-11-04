'use strict';
// Fictional fixture for native/HTTP review; never reads a manuscript.
const fs=require('node:fs/promises');const path=require('node:path');
const {convertCallouts}=require('../src/convert-callouts.cjs');
const {exportWeb}=require('../src/web-export.cjs');
async function prepare(root,destination){
 await fs.mkdir(path.join(root,'scenes'),{recursive:true});await fs.mkdir(path.join(root,'Supporting Content'),{recursive:true});
 await fs.writeFile(path.join(root,'scenes/scene.md'),convertCallouts('> [!Email] Delivery\n> From: **Mara**\n> To: Receiver\n> Subject: *Signal*\n>\n> First paragraph.\n>\n> See [[Harbour early|harbour background]].\n').text);
 await fs.writeFile(path.join(root,'Supporting Content/Harbour early.md'),'# Harbour background\n\nA public landing beside the receiver.');
 await fs.writeFile(path.join(root,'story-teller.project.json'),JSON.stringify({schema:'story-teller-project',version:1,title:'Email test',parts:[{id:'p',title:'Part',scenes:['s']}],scenes:[{id:'s',partId:'p',label:'1.1',title:'Delivery',file:'scenes/scene.md'}]}));
 return exportWeb(root,destination);
}
if(require.main===module)prepare(path.resolve(process.argv[2]),path.resolve(process.argv[3])).then(console.log).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={prepare};
