'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises'), os = require('node:os'), path = require('node:path');
const {planProjectMigration} = require('../src/migration-project.cjs');
const {planSetting} = require('../src/settings.cjs');
const {applyChanges} = require('../src/component-identity.cjs');
const {parseScene} = require('../src/parser.cjs');
const {suggestionsAt,hoverAt} = require('../src/intellisense.cjs');
test('project planning is manifest-bounded, read-only and reports file, line and all outcome categories', async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'component-project-'));
 try {
  const fence = body => '```typeout\n@format annotation\n\n'+body+'\n```\n';
  await fs.writeFile(path.join(root,'One.md'),fence('Title: **One**\n\nText.'));
  await fs.writeFile(path.join(root,'Two.md'),'<!-- beat: Unknown owner -->\n\n'+fence('Text.'));
  await fs.writeFile(path.join(root,'Ignored.md'),fence('Title: Never scan me\n\nPrivate.'));
  const manifest={schema:'story-teller-project',version:1,title:'Synthetic',parts:[{id:'p',title:'P',scenes:['one','two']}],scenes:[{id:'one',partId:'p',label:'1',title:'One',file:'One.md'},{id:'two',partId:'p',label:'2',title:'Two',file:'Two.md'}]};
  const before=await fs.readFile(path.join(root,'One.md'),'utf8'); const plan=await planProjectMigration(root,manifest);
  assert.deepEqual(plan.files.map(f=>f.name),['One.md','Two.md']); assert.equal(plan.summary.converted,1); assert.equal(plan.summary.ambiguous,1);
  assert.ok(plan.files[1].warnings[0].line > 0); assert.match(plan.files[1].warnings[0].message,/ownership/);
  assert.equal(await fs.readFile(path.join(root,'One.md'),'utf8'),before);
  const dirty=await planProjectMigration(root,manifest, async file=>file.endsWith('One.md') ? plan.files[0].text : fs.readFile(file,'utf8'));
  assert.equal(dirty.summary.alreadyMigrated,1); assert.equal(dirty.summary.converted,0);
  manifest.scenes[0].file='../escape.md'; await assert.rejects(planProjectMigration(root,manifest));
 } finally {await fs.rm(root,{recursive:true,force:true});}
});
test('settings and directive help edit only component headers and preserve exact timestamp strings',()=>{
 const source='```typeout\n@format janus\n@identity component\n\n@title body.\n```';
 let text=source;
 for(const [key,value] of [['title','**Review** — @pause 7ms'],['timestamp',' 2030-01-02 03:04 local  ']]) {
  const plan=planSetting(text,{start:text.indexOf('@format'),end:text.indexOf('@format')},key,value);
  assert.equal(plan.error,undefined); text=applyChanges(text,plan.edits);
 }
 const block=parseScene(text).beats[0].blocks[0]; assert.equal(block.title,'**Review** — @pause 7ms'); assert.equal(block.timestamp,' 2030-01-02 03:04 local  '); assert.equal(block.text,'@title body.\n');
 const pos=text.indexOf('@timestamp'); assert.match(hoverAt(text,pos+2).markdown,/Exact/);
 const snippet='```typeout\n@\n\nBody.\n```'; const names=suggestionsAt(snippet,snippet.indexOf('@')+1).map(s=>s.name);
 assert.ok(names.includes('title') && names.includes('timestamp') && names.includes('identity'));
 assert.deepEqual(suggestionsAt(text,text.lastIndexOf('@title')+2,true),[]);
});

test('metadata values that resemble flags remain literal text',()=>{
  const source='```typeout\n@format annotation\n\nBody.\n```';
  for (const key of ['title','timestamp']) {
    const plan=planSetting(source,{start:14,end:14},key,'on');
    assert.equal(plan.error,undefined); assert.equal(parseScene(applyChanges(source,plan.edits)).beats[0].blocks[0][key],'on');
  }
});
