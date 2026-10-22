'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { parseScene } = require('../src/parser.cjs');

test('initial frontmatter is recognised, not rendered or evaluated; CRLF and BOM supported', () => {
  const scene = parseScene('\uFEFF---\r\ntitle: Example\r\n---\r\nHello\r\n---\r\nGoodbye');
  assert.equal(scene.frontmatter, 'title: Example');
  assert.equal(scene.beats.length, 2);
  assert.equal(scene.beats[0].blocks[0].html, '<p>Hello</p>\n');
  assert.equal(scene.beats[0].line, 4);
  assert.equal(parseScene('---\ntitle: Example\n...\nHello').beats.length, 1);
});
test('unclosed frontmatter warns instead of losing text', () => {
  const scene = parseScene('---\ntitle: unfinished');
  assert.equal(scene.frontmatter, null);
  assert.equal(scene.diagnostics.length, 1);
  assert.match(scene.beats[0].blocks[0].html, /unfinished/);
});
test('fictional sample contains prose, chat and mixed beats in source order', () => {
  const scene = parseScene(readFileSync('samples/lantern.md', 'utf8'));
  assert.equal(scene.beats.length, 7);
  assert.deepEqual(scene.beats.slice(0, 3).map(b => b.blocks.map(c => c.type)), [['prose'], ['chat', 'prose'], ['prose', 'chat', 'prose']]);
  assert.deepEqual(scene.beats[1].blocks[0].messages[1], { speaker: 'Ivo', text: 'Only me. The stairs have gone quiet.', delayMs: 1200, responding: true });
  assert.deepEqual(scene.beats[3].blocks[1].messages, scene.beats[4].blocks[1].messages);
  assert.equal(scene.beats[3].blocks[1].pace, 'normal');
  assert.equal(scene.beats[4].blocks[1].pace, 'brisk');
  assert.deepEqual(scene.beats[5].blocks.map(b => b.type), ['prose', 'image', 'chat']);
  assert.deepEqual(scene.beats[6].blocks.map(b => b.type), ['prose', 'image', 'prose']);
  assert.equal(scene.diagnostics.length, 0);
});
test('fence separators remain literal, including longer fences, tildes and unclosed fences', () => {
  for (const code of ['```text\na\n---\nb\n```', '````\n```\n---\n````', '~~~\n---\n~~~', '```\n---\nend']) {
    assert.equal(parseScene(`Before\n\n${code}`).beats.length, 1);
  }
  assert.equal(parseScene('Before\n\n    ---\n\nAfter').beats.length, 1);
  assert.equal(parseScene('Before\n---\nAfter').beats.length, 2);
  assert.equal(parseScene('Before\n***\nAfter').beats.length, 1);
});
test('empty beats omitted; empty scene works; later YAML is not frontmatter', () => {
  assert.equal(parseScene('').beats.length, 0);
  assert.equal(parseScene('---\ntitle: only metadata\n---').beats.length, 0);
  assert.equal(parseScene('A\n---\n\n---\nB\n---').beats.length, 2);
  const scene = parseScene('A\n---\ntitle: prose\n---\nB');
  assert.equal(scene.frontmatter, null);
  assert.equal(scene.beats.length, 3);
});
test('chat preserves speakers, punctuation, colons and order as literal text', () => {
  const scene = parseScene('```chat\nMara: At 12:30, say **hello**.\nIvo: <img src=x onerror=alert(1)>\n```');
  assert.deepEqual(scene.beats[0].blocks[0].messages, [
    { speaker: 'Mara', text: 'At 12:30, say **hello**.' },
    { speaker: 'Ivo', text: '<img src=x onerror=alert(1)>' }
  ]);
});
test('malformed or empty chat stays readable code with diagnostics, no partial loss', () => {
  for (const content of ['Mara: Hello\nnot a message', '', ': nobody']) {
    const scene = parseScene('```chat\n' + content + '\n```');
    assert.equal(scene.beats[0].blocks[0].type, 'prose');
    assert.equal(scene.diagnostics.length, 1);
    assert.match(scene.beats[0].blocks[0].html, /<pre>/);
  }
});
test('nested chat fences remain prose; multiple top-level chat blocks can mix', () => {
  assert.equal(parseScene('> ```chat\n> A: Hello\n> ```').beats[0].blocks[0].type, 'prose');
  assert.deepEqual(parseScene('```chat\nA: Hello\n```\n\nMiddle\n\n```chat\nB: Yes\n```').beats[0].blocks.map(b => b.type), ['chat', 'prose', 'chat']);
});
test('safe prose escapes HTML and leaves link and image references inert', () => {
  const scene = parseScene('<script>alert(1)</script>\n\n<iframe src="https://bad.test"></iframe>\n\n[x](command:do.bad) ![alt](https://bad.test/a.png) [site](https://bad.test)\n\n<style>@import "https://bad.test";</style>');
  const html = scene.beats[0].blocks[0].html;
  assert.doesNotMatch(html, /<(script|iframe|style|a)\b/i);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /<img class="story-inline-image" data-story-src="https:\/\/bad\.test\/a\.png" alt="alt">/);
  assert.deepEqual(scene.images, ['https://bad.test/a.png']);
});
test('chat titles are optional plain text scoped to one fence; invalid headers diagnose', () => {
  const scene = parseScene('```chat\n@title Canvas: Pip & Skip\nPip: Hello\n```\n\n```chat\nSkip: Yes\n```');
  assert.equal(scene.beats[0].blocks[0].title, 'Canvas: Pip & Skip');
  assert.equal(scene.beats[0].blocks[1].title, null);
  assert.equal(scene.diagnostics.length, 0);
  for (const body of ['@title\nA: Hi', '@title One\n@title Two\nA: Hi', 'A: Hi\n@title Late']) {
    const invalid = parseScene('```chat\n' + body + '\n```');
    assert.equal(invalid.diagnostics.length, 1);
    assert.match(invalid.diagnostics[0], /@title/);
    assert.doesNotMatch(invalid.beats[0].blocks[0].html, /@title/);
  }
});
test('bare ticks flag enables status, omission disables it; legacy drafts still parse', () => {
  const parse = header => parseScene('```chat\n@viewer Mara\n' + header + '\nMara: Hello\n```');
  assert.equal(parse('@ticks').beats[0].blocks[0].ticks, true);
  assert.equal(parse('').beats[0].blocks[0].ticks, false);
  assert.equal(parse('@ticks on').beats[0].blocks[0].ticks, true);
  assert.equal(parse('@ticks off').beats[0].blocks[0].ticks, false);
  for (const header of ['@ticks\n@ticks', '@ticks on\n@ticks', 'Mara: Earlier\n@ticks']) {
    assert.equal(parse(header).diagnostics.length, 1);
  }
});

test('standalone image and separate plain caption form one component; inline images remain prose', () => {
  const source = 'Before ![inline](<assets/my%20print.jpg>) after.\n\n@delay 700ms\n\n![**Tall** tower](<assets/tower%20%CE%A9.png> "Not a caption")\n\n*Caption: The lower landing.*\n\n@pause 300ms\n\n```chat\nA: Hi\n```';
  const scene = parseScene(source);
  assert.deepEqual(scene.beats[0].blocks.map(b => b.type), ['prose', 'image', 'chat']);
  assert.match(scene.beats[0].blocks[0].html, /class="story-inline-image"/);
  assert.deepEqual(scene.beats[0].blocks[1], { type: 'image', src: 'assets/tower%20%CE%A9.png', alt: 'Tall tower', caption: 'The lower landing.', line: 5, captionLine: 7, delayMs: 700 });
  assert.deepEqual(scene.images, ['assets/my%20print.jpg', 'assets/tower%20%CE%A9.png']);
  assert.deepEqual(scene.beats[0].sequence.map(s => s.type), ['component', 'component', 'pause', 'component']);
  assert.equal(scene.diagnostics.length, 0);
});
test('image syntax in literal Markdown or mixed paragraphs never creates another timed component', () => {
  const scene = parseScene('`![inline](x.png)`\n\n```md\n![code](x.png)\n```\n\n> ![quote](q.png)\n\nText ![inline](a.png) continues.');
  assert.deepEqual(scene.beats[0].blocks.map(b => b.type), ['prose']);
  assert.deepEqual(scene.images, ['q.png', 'a.png']);
  assert.equal(scene.beats[0].blocks[0].html.includes('data-story-src="x.png"'), false);
});
