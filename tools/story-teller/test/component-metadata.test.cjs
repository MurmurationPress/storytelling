'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {parseScene} = require('../src/parser.cjs');
const formats = ['yaml','annotation','janus','janus-log'];
const fence = (format, header = '', body = 'A complete body.') => `\`\`\`typeout\n@format ${format}\n${header}\n${body}\n\`\`\``;
test('all typeouts accept independently optional component identities, preserving exact values and body', () => {
  for (const format of formats) for (const header of ['', '@title A — **title**\n', '@timestamp  2026-10-30 01:13 local  \n', '@title @format yaml\n@timestamp Yesterday, at dawn\n']) {
    const source = fence(format, header, '@title body content\n@timestamp not configuration');
    const parsed = parseScene(source); assert.deepEqual(parsed.diagnostics, []);
    const block = parsed.beats[0].blocks[0];
    assert.equal(block.format, format); assert.equal(block.text, '@title body content\n@timestamp not configuration\n');
    if (header.includes('@timestamp  ')) assert.equal(block.timestamp, ' 2026-10-30 01:13 local  ');
    if (header.includes('@title @format')) assert.equal(block.title, '@format yaml');
    if (header.includes('**title**')) assert.match(block.titleHtml, /<strong>title<\/strong>/);
  }
});
test('header Markdown and supporting links follow existing safe rendering rules', () => {
  for (const format of formats) {
    const scene = parseScene(fence(format, '@title [[Identity|A label]] <script>alert(1)</script>\n@timestamp [[Clock|Before dawn]]\n'));
    const block = scene.beats[0].blocks[0]; assert.ok(!block.titleHtml.includes('<script>'));
    assert.match(block.titleHtml, /data-story-target="Identity"/);
    assert.deepEqual(scene.wikiReferences.map(ref => ref.target), ['Identity','Clock']);
  }
});
test('explicit JANUS identities override legacy beat headings, without changing beat titles', () => {
  for (const header of ['@title Component name\n', '@timestamp Unspecified dawn\n']) {
    const scene = parseScene('<!-- beat: Navigation name -->\n\n' + fence('janus', header));
    assert.equal(scene.beats[0].title, 'Navigation name');
    assert.equal(scene.beats[0].blocks[0].document.titleHtml, header.startsWith('@title') ? 'Component name' : null);
  }
});
test('duplicate or empty metadata is diagnosed and retained as readable code', () => {
  for (const header of ['@title X\n@title Y\n', '@timestamp X\n@timestamp Y\n', '@title \n']) {
    const parsed = parseScene(fence('yaml',header));
    assert.ok(parsed.diagnostics.length); assert.equal(parsed.beats[0].blocks[0].type, 'prose');
  }
});
test('component headers neither add playback steps nor enter the animated body', () => {
  const {StoryPlayer} = require('../src/player.cjs');
  for (const format of formats) {
    const plain = new StoryPlayer(parseScene(fence(format)));
    const titled = new StoryPlayer(parseScene(fence(format,'@title Header\n@timestamp At dawn\n@identity component\n')));
    assert.deepEqual(titled.steps,plain.steps);
    assert.deepEqual(titled.typeoutParts.get(0),plain.typeoutParts.get(0));
    plain.dispose();titled.dispose();
  }
});
test('legacy inheritance is restricted to unmarked JANUS; intentionally untitled new components remain untitled',()=>{
  for (const format of formats) {
    const legacy=parseScene('<!-- beat: Navigation -->\n\n'+fence(format)).beats[0].blocks[0];
    const scoped=parseScene('<!-- beat: Navigation -->\n\n'+fence(format,'@identity component\n')).beats[0].blocks[0];
    if (legacy.document) {assert.equal(legacy.document.titleHtml,'Navigation');assert.equal(scoped.document.titleHtml,null);}
    else assert.equal(legacy.titleHtml,undefined);
  }
});
