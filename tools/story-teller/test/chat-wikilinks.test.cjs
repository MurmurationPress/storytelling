'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseScene } = require('../src/parser.cjs');
const { renderChat } = require('../src/markdown.cjs');
const { convertChats } = require('../src/convert.cjs');
const { StoryPlayer } = require('../src/player.cjs');
const { automaticDelay } = require('../src/pace.cjs');
const wrap = body => '```chat\n' + body + '\n```';
const parse = body => parseScene(wrap(body));
test('links in speaker, either heading form, body and continuation use shared rendering and source lines', () => {
  for (const title of ['#', '@title']) for (const suffix of ['', '|handle']) {
    const scene = parse(`${title} [[Room${suffix}]]\n[[Celia${suffix}]]: Thank you, [[Skip]].\n  | Ask [[Jo Ellis|Jo]].`);
    assert.deepEqual(scene.diagnostics, []);
    const block = scene.beats[0].blocks[0], message = block.messages[0];
    assert.equal(block.title, suffix ? 'handle' : 'Room');
    assert.equal(message.speaker, suffix ? 'handle' : 'Celia');
    assert.equal(message.speakerSource, `[[Celia${suffix}]]`);
    assert.equal(message.speakerHtml, renderChat(message.speakerSource).html);
    assert.equal(block.titleHtml, renderChat(block.titleSource).html);
    assert.equal(message.timingText, 'Thank you, Skip.\nAsk Jo.');
    assert.deepEqual(scene.wikiReferences.map(r => [r.target,r.line]), [['Room',2],['Skip',3],['Celia',3],['Jo Ellis',4]]);
  }
});
test('display handles drive viewer, ticks, responding and automatic timing, preserving distinct handles per target', () => {
  for (const viewer of ['StillLearning', '[[Celia|StillLearning]]']) {
    const scene = parse(`@viewer ${viewer}\n@ticks\n@responding\n[[Celia|StillLearning]]: [[A very long supporting target|Hello there, reader.]]\n[[Celia|AnotherHandle]]: Hi`);
    assert.deepEqual(scene.diagnostics, []);
    const player = new StoryPlayer(scene);
    assert.equal(player.steps[0].delayMs, automaticDelay('Hello there, reader.'));
    assert.deepEqual(player.steps.map(s=>s.type), ['message','read','message']);
    player.phase = 'playing'; player.remaining = 100;
    assert.equal(player.responding, null);
    player.cursor = 2;
    assert.equal(player.responding.speaker, 'AnotherHandle');
    player.counts.set(0, 2);
    assert.deepEqual(player.visibleBlocks[0].messages.map(m=>m.status), ['delivered',null]);
    player.read.add('0:0');
    assert.equal(player.visibleBlocks[0].messages[0].status, 'read');
    player.dispose();
  }
});
test('escaping and literal code are identical in all chat labels; ordinary Markdown stays literal', () => {
  for (const text of ['\\[[Celia|Handle]]', '`[[Celia|Handle]]`', '[[unclosed', '[[Celia|]]', '**bold** [url](example.test)', '<img onerror="bad"> & [[Note|<b>Handle</b>]]']) {
    const rendered = renderChat(text);
    const scene = parse(`# ${text}\n${text}: ${text}\n  | ${text}`);
    assert.deepEqual(scene.diagnostics, []);
    const block = scene.beats[0].blocks[0], msg = block.messages[0];
    assert.equal(block.title, rendered.visibleText);
    assert.equal(msg.speaker, rendered.visibleText);
    if (rendered.references.length) {
      assert.equal(msg.speakerHtml, rendered.html);
      assert.equal(block.titleHtml, rendered.html);
      assert.equal(msg.html, renderChat(text + '\n' + text).html);
      assert.doesNotMatch(msg.speakerHtml, /<img|<b>/);
      assert.match(msg.speakerHtml, /&lt;b&gt;/);
    } else assert.equal(msg.speakerHtml, undefined);
  }
});
test('legacy alias pipes are shielded, with inheritance, escapes and exact continuation wording', () => {
  const source = wrap('# [[Room|Lounge]]\n> [[Celia|StillLearning]]\n@ticks\n{{[[Celia|StillLearning]]|Thank you, [[Skip]].\nAsk [[Jo Ellis|Jo]]. A literal \\| mark.|}}\n{{|Again, [[Skip|friend]].}}');
  const result = convertChats(source);
  assert.equal(result.count, 1); assert.deepEqual(result.warnings, []);
  const block = parseScene(result.text).beats[0].blocks[0];
  assert.equal(block.viewer, 'StillLearning');
  assert.deepEqual(block.messages.map(m=>m.speaker), ['StillLearning','StillLearning']);
  assert.equal(block.messages[0].text, 'Thank you, [[Skip]].\nAsk [[Jo Ellis|Jo]]. A literal | mark.');
  assert.equal(convertChats(result.text).text, result.text);
  assert.equal(convertChats(wrap('{{[[Celia]]|Hello [[Skip|friend]]}}')).count, 1);
});
test('legacy malformed, ambiguous and unsupported input stays unchanged with warnings', () => {
  for (const body of ['{{[[Celia|Handle]|Hello}}','{{[[Celia|]]|Hello}}','{{Celia|One|Two|}}','{{**Celia**|Hello}}','{{Celia|[[broken|alias}}']) {
    const source = wrap(body), result = convertChats(source);
    assert.equal(result.text, source); assert.equal(result.count, 0); assert.equal(result.warnings.length, 1);
  }
});
test('speaker and heading targets participate in export resolution and diagnostics, directives remain metadata', async t => {
  const fs = require('node:fs/promises'), os = require('node:os'), path = require('node:path');
  const { prepareWeb } = require('../src/web-export.cjs');
  const root = await fs.mkdtemp(path.join(os.tmpdir(),'chat-reference-test-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  await require('./chat-link-fixture.cjs').create(root);
  await fs.writeFile(path.join(root,'scenes/Chat.md'),wrap('# [[Missing heading|Meeting]]\n@viewer [[MetadataOnly|StillLearning]]\n@ticks\n[[https://invalid.test|StillLearning]]: Hello\n[[Celia|Other]]: [[Missing body]]\n[[Missing speaker|Friend]]: Hi'));
  const result = await prepareWeb(root), refs = result.scenes[0].data.supporting;
  assert.equal(result.book.targets.Celia.id, 'Celia.md');
  for (const target of ['Missing heading','https://invalid.test','Missing body','Missing speaker']) assert.ok(Object.hasOwn(refs.links,target), target);
  assert.ok(!Object.hasOwn(refs.links,'MetadataOnly'));
  assert.match(JSON.stringify(refs.diagnostics),/Missing heading/);
  assert.match(JSON.stringify(refs.diagnostics),/Missing speaker/);
  assert.match(JSON.stringify(refs.diagnostics),/unsupported|URLs/);
  assert.equal(parseScene(result.scenes[0].data.source).beats[0].blocks[0].messages[0].speaker,'StillLearning');
});

test('legacy delimiter decoding preserves escapes inside wiki source and blank inherited headers', () => {
  const converted = convertChats(wrap(String.raw`{{[[Celia|Handle\|literal]]|[[Skip|a\|b]] and \| outside.}}
{{  |Inherited.}}`));
  assert.equal(converted.count, 1);
  const block = parseScene(converted.text).beats[0].blocks[0];
  assert.equal(block.messages[0].speakerSource, String.raw`[[Celia|Handle\|literal]]`);
  assert.equal(block.messages[0].text, String.raw`[[Skip|a\|b]] and | outside.`);
  assert.equal(block.messages[1].speaker, String.raw`Handle\|literal`);
  const trailing = convertChats(wrap('{{Celia|Text\n  |}}'));
  assert.equal(trailing.count, 1);
  assert.equal(parseScene(trailing.text).beats[0].blocks[0].messages[0].text, 'Text\n  ');
});
