'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { convertCallouts } = require('../src/convert-callouts.cjs');
const { parseScene } = require('../src/parser.cjs');
const { inspectStructure,beatRanges } = require('../src/structure.cjs');
const mappings = {'prime-log':['yaml','modem'], divergent:['yaml','modem'], annotation:['annotation','keyboard'],janus:['janus','none'],'janus-log':['janus-log','none']};
const callout = (label,title,body,marker='') => `> [!${label}]${marker}${title ? ' '+title : ''}\n`+body.split('\n').map(l=>'> '+l).join('\n')+'\n';
const content = label => ['prime-log','divergent'].includes(label) ? '```yaml\nstatus: observing\n  nested: +2\n```' : 'A **complete** paragraph.\n\n| A | B |\n| :--- | ---: |\n| α | −2 |';
const beats = source => beatRanges(inspectStructure(source)).map(beat=>beat.title);
test('every mapping carries its own title and timestamp without changing navigation metadata',()=>{
  for(const [label,[format,sound]] of Object.entries(mappings)) for(const marker of ['','+','-']) for(const eol of ['\n','\r\n']) {
    const body=content(label), title='Report — **α** @pause 1ms -->';
    const source=('Opening.\n\n---\n<!-- beat: Reading rhythm -->\n\nBefore.\n\n'+callout(label.toUpperCase(),title,'2030-01-02 03:04\n\n'+body,marker)+'\nAfter.\n\n---\nLast.\n').replaceAll('\n',eol);
    const result=convertCallouts(source); assert.equal(result.count,1); assert.deepEqual(result.warnings,[]);
    assert.deepEqual(beats(result.text),beats(source));
    assert.deepEqual(result.text.match(/^---\r?$/gm),source.match(/^---\r?$/gm));
    assert.ok(result.text.includes(`<!-- beat: Reading rhythm -->${eol}${eol}Before.${eol}${eol}`));
    assert.ok(result.text.endsWith(`${eol}After.${eol}${eol}---${eol}Last.${eol}`));
    const block=parseScene(result.text).beats[1].blocks.find(b=>b.type==='typeout');
    assert.equal(block.title,title); assert.equal(block.timestamp,'2030-01-02 03:04'); assert.equal(block.format,format); assert.equal(block.sound,sound); assert.equal(block.identity,'component');
    assert.equal((result.text.match(/2030-01-02 03:04/g)||[]).length,1);
    assert.equal(convertCallouts(result.text).text,result.text);
    assert.ok(result.changes.every(c=>source.slice(c.start,c.end).startsWith('> [!')));
    if(eol==='\r\n') assert.ok(!/(?<!\r)\n/.test(result.text));
  }
});
test('title-only, timestamp-only, both and neither work for every mapping, without generated labels',()=>{
  for(const label of Object.keys(mappings)) for(const title of ['','Title']) for(const stamp of ['','Timestamp: Yesterday — local wording']) {
    const result=convertCallouts('<!-- beat: Unrelated -->\n\n'+callout(label,title,(stamp?stamp+'\n\n':'')+content(label)));
    assert.equal(result.count,1); const block=parseScene(result.text).beats[0].blocks[0];
    assert.equal(block.title,title || undefined); assert.equal(block.timestamp,stamp ? 'Yesterday — local wording' : undefined);
    if(block.document && !title) assert.equal(block.document.titleHtml,null);
  }
});
test('multiple differently titled callouts and prose retain one beat and exact component order',()=>{
  const source='<!-- beat: Rhythm -->\n\nOpening.\n\n'+callout('prime-log','One',content('prime-log'))+'\nBridge.\n\n'+callout('annotation','Two',content('annotation'))+'\nClosing.';
  const result=convertCallouts(source); const scene=parseScene(result.text); assert.equal(result.count,2); assert.equal(scene.beats.length,1); assert.equal(scene.beats[0].title,'Rhythm');
  assert.deepEqual(scene.beats[0].blocks.map(b=>b.title || b.type),['prose','One','prose','Two','prose']);
});
test('machine prose before and after nested YAML stays in order; dates in data and prose are retained',()=>{
  const body='2030-01-02 03:04\n\nPreceding **prose**.\n\n```yaml\ndate: 2031-02-03\nTimestamp: body_data\n```\n\nFollowing prose on 2032-04-05.';
  const result=convertCallouts(callout('divergent','Report',body)); assert.equal(result.count,1);
  const scene=parseScene(result.text); assert.deepEqual(scene.beats[0].blocks.map(b=>b.type),['prose','typeout','prose']);
  assert.match(scene.beats[0].blocks[0].html,/Preceding <strong>prose/); assert.equal(scene.beats[0].blocks[1].text,'date: 2031-02-03\nTimestamp: body_data\n');
  assert.match(scene.beats[0].blocks[2].html,/Following prose on 2032-04-05/);
  const table=convertCallouts(callout('janus','Report','| Date |\n|---|\n|2030-01-02 03:04|')); assert.equal(parseScene(table.text).beats[0].blocks[0].timestamp,undefined);
  const prose=convertCallouts(callout('annotation','Report','2030-01-02 was the date mentioned in the note.')); assert.equal(parseScene(prose.text).beats[0].blocks[0].timestamp,undefined);
});
test('containing fence is safe for metadata and literal body; directive-looking body text is content',()=>{
  const result=convertCallouts(callout('annotation','``` title','```example\n@pause 900ms\n```'));
  assert.match(result.text,/^````typeout/); const block=parseScene(result.text).beats[0].blocks[0]; assert.equal(block.title,'``` title'); assert.equal(block.text,'```example\n@pause 900ms\n```\n');
});
test('ambiguous and unsupported structures stay unchanged with actionable source warnings',()=>{
  for(const source of [callout('prime-log','Report','Prose only.'),callout('prime-log','Report','```yaml\nx: 1'),callout('prime-log','Report','```yaml\nx: 1\n```\n```yaml\ny: 2\n```'),callout('annotation','Report','> [!janus] Nested\n> A'),callout('annotation','Report','2030-01-02 03:04\nContinuing prose.'),callout('janus','Report','Timestamp: Dawn\n\nTimestamp: Dusk\n\nBody.'),'> [!annotation Broken\n> Body.\n']) {
    const result=convertCallouts(source); assert.equal(result.text,source); assert.ok(result.warnings.length); assert.equal(result.warnings[0].line,1);
  }
});
test('unrelated callouts, frontmatter and fenced examples are not converted; selection is local',()=>{
  const first=callout('annotation','One','Body.'), second=callout('janus','Two','Other.');
  const source='---\ntitle: Note\n---\n\n'+first+'\n'+second+'\n> [!State]\n> date: data\n\n~~~~md\n'+first+'~~~~\n';
  const start=source.indexOf(second); const result=convertCallouts(source,{scope:{start,end:start+second.length}});
  assert.equal(result.count,1); assert.equal(result.text.slice(0,start),source.slice(0,start)); assert.ok(result.text.endsWith('> [!State]\n> date: data\n\n~~~~md\n'+first+'~~~~\n'));
});
