'use strict';
const fs=require('node:fs/promises'),path=require('node:path');
async function create(root){
 await fs.mkdir(path.join(root,'scenes'),{recursive:true});await fs.mkdir(path.join(root,'Supporting Content'));
 await fs.writeFile(path.join(root,'Supporting Content/Guide.md'),'# Guide\n\nA synthetic supporting note.');
 await fs.writeFile(path.join(root,'scenes/Speed.md'),'First paragraph with [[Guide|guide]].\n\nSecond paragraph.\n---\n```typeout\n@format annotation\n@sound keyboard\n@speed 10\n\n👩🏽‍💻é '+ 'synthetic output '.repeat(8)+'\n```\n---\n```chat\n@pace brisk\nA: Hi\nB: Yes\n```\n---\n@pause 1000ms\n\nExplicit wait finished.\n');
 await fs.writeFile(path.join(root,'scenes/Other.md'),'Other scene.\n\nAnother paragraph.');
 await fs.writeFile(path.join(root,'story-teller.project.json'),JSON.stringify({schema:'story-teller-project',version:1,title:'Synthetic reader speed',settings:{prosePacing:'on'},parts:[],scenes:[{id:'speed',partId:null,title:'Speed',label:'1',file:'scenes/Speed.md'},{id:'other',partId:null,title:'Other',label:'2',file:'scenes/Other.md'}]}));
}
module.exports={create};
