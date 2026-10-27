'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const source = 'Synthetic chat link probe\n\n```chat\n# [[Room|Lounge]]\n@viewer StillLearning\n@ticks\n@responding\n@delay 100ms\n[[Celia|StillLearning]]: Thank you, [[Skip]].\n  | Ask [[Jo Ellis|Jo]].\n@delay 30000ms\n[[Jo Ellis|JoMakesThings]]: Have you asked [[Miranda Stubbs|Miranda]]?\n```';
async function create(root) {
  await fs.mkdir(path.join(root,'scenes'),{recursive:true});
  await fs.mkdir(path.join(root,'Supporting Content'),{recursive:true});
  await fs.writeFile(path.join(root,'scenes/Chat.md'),source);
  for(const name of ['Room','Celia','Skip','Jo Ellis','Miranda Stubbs','Nested']) await fs.writeFile(path.join(root,'Supporting Content',name+'.md'),`Synthetic ${name} note.\n\n[[Nested|Further detail]]`);
  await fs.writeFile(path.join(root,'story-teller.project.json'),JSON.stringify({schema:'story-teller-project',version:1,title:'Chat probe',parts:[{id:'p',title:'Probe',scenes:['s']}],scenes:[{id:'s',partId:'p',label:'1.1',title:'Chat',file:'scenes/Chat.md'}]}));
}
module.exports={create,source};
