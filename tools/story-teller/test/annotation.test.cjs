'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseScene } = require('../src/parser.cjs');
const { StoryPlayer } = require('../src/player.cjs');
const tick = '```';
const sceneFor = (body, header = '@format annotation\n@speed 10') => parseScene(`${tick}typeout\n${header}\n\n${body}\n${tick}`);
class Clock {
  time = 0; id = 0; jobs = new Map(); retired = [];
  now = () => this.time;
  setTimeout = (fn, ms) => { this.jobs.set(++this.id, { fn, at: this.time + ms }); return this.id; };
  clearTimeout = id => { const job = this.jobs.get(id); if (job) this.retired.push(job.fn); this.jobs.delete(id); };
  advance(ms) {
    const end = this.time + ms;
    for (;;) {
      const next = [...this.jobs].sort((a, b) => a[1].at - b[1].at)[0];
      if (!next || next[1].at > end) break;
      this.time = next[1].at; this.jobs.delete(next[0]); next[1].fn();
    }
    this.time = end;
  }
}
const output = player => player.visibleBlocks.find(block => block.type === 'typeout');
test('annotation parses once into stable safe structure and counts rendered graphemes, not Markdown markers', () => {
  const body = '**A👩🏽‍💻** *é*\n\n- [[field|Label]]\n- `[[literal]]`\n\n> Quote';
  const block = sceneFor(body).beats[0].blocks[0];
  assert.match(block.annotation.html, /<strong>.*A👩🏽‍💻.*<\/strong>/);
  assert.match(block.annotation.html, /<em>/);
  assert.match(block.annotation.html, /<ul>/);
  assert.match(block.annotation.html, /<blockquote>/);
  assert.match(block.annotation.html, /<code>.*\[\[literal\]\].*<\/code>/);
  assert.equal(block.annotation.segments.join(''), 'A👩🏽‍💻 éLabel[[literal]]Quote');
  assert.equal(block.annotation.count, 25);
  assert.doesNotMatch(block.annotation.html, /field\|Label/);
  const clock = new Clock(); const player = new StoryPlayer(sceneFor(body), { scheduler: clock });
  player.play(); clock.advance(0); clock.advance(100);
  assert.equal(output(player).visibleText, 'A');
  clock.advance(100); assert.equal(output(player).visibleText, 'A👩🏽‍💻');
  clock.advance(100); assert.equal(output(player).visibleText, 'A👩🏽‍💻 ');
  player.pause(); clock.advance(5000); assert.equal(output(player).visibleText, 'A👩🏽‍💻 ');
  player.play(); clock.advance(100); assert.equal(output(player).visibleText, 'A👩🏽‍💻 é');
  player.revealImmediately(); assert.equal(output(player).revealCount, block.annotation.count);
  assert.equal(output(player).visibleText, block.annotation.segments.join(''));
});
test('wiki labels render in prose and annotations, while escapes, code and embeds remain literal', () => {
  const prose = 'See [[target|Label]], [[Other]], \\[[escaped]], `[[code]]`, and ![[media.png]].';
  const scene = parseScene(prose + '\n\n' + `${tick}typeout\n@format annotation\n\n[[target|Shown]] \\[[escaped]] ` + '`[[code]]`' + ' ![[media.png]]\n' + tick);
  assert.match(scene.beats[0].blocks[0].html.replace(/<span[^>]*>|<\/span>/g, ''), /See Label, Other, \[\[escaped\]\], <code>\[\[code\]\]<\/code>, and !\[\[media.png\]\]/);
  const rendered = scene.beats[0].blocks[1].annotation;
  assert.equal(rendered.segments.join(''), 'Shown [[escaped]] [[code]] ![[media.png]]');
  assert.doesNotMatch(rendered.html, /<a|<img/);
  const fenced = parseScene('~~~example\n[[raw|not a link]]\n~~~').beats[0].blocks[0].html;
  assert.match(fenced, /\[\[raw\|not a link\]\]/);
});
test('structural block boundaries consume no reveal step; code-block newlines remain text', () => {
  const block = sceneFor('One.\n\nTwo.\n\n1. First\n2. Next').beats[0].blocks[0];
  assert.equal(block.annotation.segments.join(''), 'One.Two.FirstNext');
  assert.equal(block.annotation.count, 17);
  const code = sceneFor('~~~text\nx\ny\n~~~').beats[0].blocks[0];
  assert.match(code.annotation.html, /<pre><code>/);
  assert.equal(code.annotation.segments.join(''), 'x\ny\n');
  assert.equal(code.annotation.count, 4);
  const invalid = sceneFor('** PRIME **').beats[0].blocks[0];
  assert.doesNotMatch(invalid.annotation.html, /<strong>/);
});
test('annotation HTML and URL links stay inert; image references use the media resolver; YAML remains literal', () => {
  const body = '<script>alert(1)</script> [remote](https://example.test/) ![pic](https://example.test/a.png)';
  const annotation = sceneFor(body).beats[0].blocks[0].annotation;
  assert.doesNotMatch(annotation.html, /<script|<a\b/);
  assert.match(annotation.html, /&lt;script&gt;/);
  assert.match(annotation.html, /data-story-src="https:\/\/example.test\/a.png"/);
  assert.doesNotMatch(annotation.html, /<img[^>]*\ssrc=/);
  assert.deepEqual(annotation.images,['https://example.test/a.png']);
  const yaml = sceneFor('**raw** [[target|label]]\n  key: value', '@format yaml').beats[0].blocks[0];
  assert.equal(yaml.annotation, undefined);
  assert.equal(yaml.text, '**raw** [[target|label]]\n  key: value\n');
  const player = new StoryPlayer(sceneFor('**raw** [[target|label]]', '@format yaml'), { reducedMotion: true });
  player.play();
});
test('annotation reveal completes identically on reduced motion, silent Previous and Replay', () => {
  const source = sceneFor('**One** and *two*');
  const scene = parseScene(`${tick}typeout\n@format annotation\n\n**One** and *two*\n${tick}\n---\nAfter.`);
  const clock = new Clock();
  const player = new StoryPlayer(scene, { scheduler: clock, reducedMotion: true });
  player.play(); clock.advance(0);
  assert.equal(output(player).visibleText, 'One and two');
  player.next(); player.previous(); assert.equal(output(player).visibleText, 'One and two');
  player.replay(); clock.advance(0); assert.equal(output(player).visibleText, 'One and two');
  assert.deepEqual(source.beats[0].blocks[0].annotation.segments, scene.beats[0].blocks[0].annotation.segments);
});
