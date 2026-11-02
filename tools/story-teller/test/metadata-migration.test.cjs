'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {migrateComponentMetadata: migrate} = require('../src/migrate-component-metadata.cjs');
const {parseScene} = require('../src/parser.cjs');
const {inspectStructure} = require('../src/structure.cjs');
const {applyChanges} = require('../src/component-identity.cjs');
const f = (format,body,header='') => `\`\`\`typeout\n@format ${format}\n${header}\n${body}\n\`\`\`\n`;
test('beat title plus a lone fence is unproven; explicit author attribution changes only the selected fence',()=>{
  const source='<!-- beat: Navigation -->\n\n'+f('janus','First.')+'\nProse.\n\n'+f('yaml','x: 2');
  const held=migrate(source); assert.equal(held.text,source); assert.equal(held.summary.ambiguous,2);
  const start=source.indexOf('```typeout');
  const selected=migrate(source,{associate:start}); assert.equal(selected.count,1); assert.equal(selected.summary.ambiguous,1);
  assert.equal((selected.text.match(/@title Navigation/g)||[]).length,1);
  assert.equal(parseScene(selected.text).beats[0].title,'Navigation');
  assert.equal(migrate(selected.text).text,selected.text);
});
test('matching in-component heading provides evidence, and beat metadata and explicit timing stay unchanged',()=>{
  const source='Opening.\n\n---\n<!-- beat: Report -->\n\n@delay 500ms\n\n'+f('janus-log','# Report\n\nTimestamp: Before dawn\n\n| A |\n|---|\n| 2030-04-01 |','@sound none\n@speed 30\n')+'\n@pause 900ms\n';
  const result=migrate(source); assert.equal(result.count,1); assert.deepEqual(result.warnings,[]);
  assert.match(result.text,/@title Report\n@timestamp Before dawn/);
  assert.ok(result.text.includes('---\n<!-- beat: Report -->\n\n@delay 500ms'));
  assert.ok(result.text.endsWith('@pause 900ms\n')); assert.match(result.text,/\| 2030-04-01 \|/);
  assert.equal(migrate(result.text).count,0); assert.equal(migrate(result.text).summary.alreadyMigrated,1);
});
test('component-owned leading labels migrate without beat association, but YAML data and prose dates do not',()=>{
  const source=f('annotation','Title: **Margin**\nTimestamp: Tomorrow, unspecified\n\nA note on 2030-01-02.')+f('yaml','Title: data\nTimestamp: data\ndate: 2030-01-02')+f('janus','An event on 2030-01-02.');
  const result=migrate(source); assert.equal(result.count,1); assert.equal(result.summary.skipped,2);
  const blocks=parseScene(result.text).beats[0].blocks;
  assert.equal(blocks[0].title,'**Margin**'); assert.equal(blocks[0].timestamp,'Tomorrow, unspecified');
  assert.equal(blocks[1].text,'Title: data\nTimestamp: data\ndate: 2030-01-02\n');
});
test('partial migrations preserve matching values; conflicts preserve the entire candidate',()=>{
  const source=f('annotation','Timestamp: Dawn\n\nA note.','@title Existing\n');
  const result=migrate(source); assert.equal(result.count,1); assert.equal((result.text.match(/@title Existing/g)||[]).length,1);
  const conflict=f('annotation','Title: Other\nTimestamp: New\n\nA note.','@title Existing\n@timestamp Old\n');
  const held=migrate(conflict); assert.equal(held.text,conflict); assert.equal(held.summary.ambiguous,1); assert.match(held.warnings[0].message,/conflicting/);
});
test('outside bare timestamps need author association; explicitly labelled isolated fields can be migrated',()=>{
  const stamp='2030-01-02 03:04';
  const source='<!-- beat: Report -->\n\n'+stamp+'\n\n'+f('yaml','x: 1');
  assert.equal(migrate(source).text,source);
  const result=migrate(source,{associate:source.indexOf('```')}); assert.equal(result.count,1); assert.match(result.text,/@timestamp 2030-01-02 03:04/); assert.equal((result.text.match(/2030-01-02 03:04/g)||[]).length,1);
  const labelled='Timestamp: Dawn\n\n'+f('yaml','x: 1'); assert.equal(migrate(labelled).count,1);
  const prose='The report says:\nTimestamp: Dawn\n\n'+f('yaml','x: 1'); assert.equal(migrate(prose).text,prose);
});
test('selection scope, CRLF and safe fences retain exact bytes outside edits',()=>{
  const first=f('annotation','Title: First\n\nText.'), second=f('janus','Title: Second\nTimestamp:  2030-01-02 03:04 local\n\nText.');
  const source=(first+'\n---\n<!-- beat: Navigation -->\n\n'+second).replaceAll('\n','\r\n');
  const start=source.lastIndexOf('```typeout'), scope={start,end:source.length};
  const result=migrate(source,{scope}); assert.equal(result.count,1); assert.equal(result.text.slice(0,start),source.slice(0,start));
  assert.equal(parseScene(result.text).beats[1].blocks[0].timestamp,' 2030-01-02 03:04 local'); assert.ok(!/(?<!\r)\n/.test(result.text));
  assert.equal(result.text,applyChanges(source,result.changes)); assert.equal(inspectStructure(result.text).boundaries.length,1);
});
test('malformed fences, nested fences and literals remain unchanged',()=>{
  for(const source of ['```typeout\n@format yaml\n\nx: 1', '> ```typeout\n> @format annotation\n>\n> Title: X\n> ```', '````example\n'+f('annotation','Title: X\n\nText.')+'````']) assert.equal(migrate(source).text,source);
});

test('an explicit timestamp-only component is already migrated, not an unproven legacy beat heading',()=>{
 const source='<!-- beat: Unrelated -->\n\n'+f('janus','Text.','@timestamp Dawn\n');
 const result=migrate(source);assert.equal(result.text,source);assert.equal(result.summary.alreadyMigrated,1);assert.equal(result.summary.ambiguous,0);
});

test('an indented apparent closer does not establish a closed fence for migration',()=>{
 const source='```typeout\n@format annotation\n\nTitle: Keep me\n\nBody.\n    ```\n';
 const result=migrate(source);assert.equal(result.text,source);assert.equal(result.count,0);assert.equal(result.summary.skipped,1);
});
