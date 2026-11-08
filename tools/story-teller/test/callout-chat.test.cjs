'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {convertCallouts} = require('../src/convert-callouts.cjs');
const {convertChats} = require('../src/convert.cjs');
const {parseScene} = require('../src/parser.cjs');
const {StoryPlayer} = require('../src/player.cjs');
const {applyChanges} = require('../src/component-identity.cjs');
const quote = body => body.split('\n').map(l => '> ' + l).join('\n');
const chat = body => '```chat\n' + body + '\n```';
const callout = (body, type = 'annotation', title = 'A title') => `> [!${type}]- ${title}\n` + quote(body) + '\n';
const blocks = source => parseScene(source).beats.flatMap(b => b.blocks);
const fixture = fs.readFileSync(process.env.STORY_TELLER_CALLOUT_SOURCE || require('node:path').join(__dirname, 'fixtures/mixed-callout-sequence.md'), 'utf8');
const mixedTitle = fixture.match(/> \[!divergent\] (.+SequenceDependency)/)[1].trim();
const speaker = fixture.match(/> > (.+)/)[1];

test('scene-derived sequence: all five callouts, all five messages and original prose/YAML order survive', () => {
  const result = convertCallouts(fixture);
  assert.equal(result.count, 5); assert.deepEqual(result.warnings, []);
  assert.deepEqual(parseScene(result.text).diagnostics, []);
  assert.equal(parseScene(result.text).beats.length, 1);
  const converted = blocks(result.text), chats = converted.filter(b => b.type === 'chat');
  const originalMessages = [...fixture.matchAll(/\{\{[^|]+\|([^\n]*?)\|\}\}/g)].map(m => m[1]);
  assert.equal(chats.length, 4);
  assert.deepEqual(chats.flatMap(b => b.messages.map(m => m.text)), originalMessages);
  assert.ok(chats.every(b => b.viewer === speaker && b.callout.type === 'divergent' && b.callout.title === mixedTitle));
  const sourceYaml = [...fixture.matchAll(/> ```yaml\n([\s\S]*?)> ```/g)].map(m => m[1].split('\n').filter((_,i,a) => i < a.length-1).map(l => l.replace(/^> ?/, '')).join('\n') + '\n');
  assert.deepEqual(converted.filter(b => b.type === 'typeout').map(b => b.text), sourceYaml);
  assert.deepEqual(converted.filter(b=>b.callout).map(b=>b.type), ['typeout','chat','prose','chat','prose','chat','prose','chat','prose']);
  // Each prose paragraph is preserved verbatim in either a prose block or YAML.
  const prose = fixture.split('\n').filter(l => l.startsWith('> ') && !/^> (?:[\s`>]|\[!|\{\{|\d{4}-)/.test(l));
  for (const line of prose) assert.ok(result.text.includes(line.slice(2)), line);
  const md = require('../src/markdown.cjs').createMarkdown();
  const sourceStructure = require('../src/structure.cjs').inspectStructure(fixture);
  const sourceTokens = md.parse(sourceStructure.lines.slice(sourceStructure.start).map(l=>l.text.replace(/^> ?/, '')).join('\n'), {});
  const paragraphs = [];
  for(let i=0;i<sourceTokens.length;i++) if(sourceTokens[i].type==='paragraph_open' && !sourceTokens[i+1].content.startsWith('[!')) paragraphs.push(md.renderer.render(sourceTokens.slice(i,i+3),md.options,{}).trim());
  const renderedParagraphs = converted.filter(b=>b.type==='prose').flatMap(b=>[...b.html.matchAll(/<p>[\s\S]*?<\/p>/g)].map(m=>m[0]));
  assert.deepEqual(renderedParagraphs,paragraphs, 'all narrative paragraphs, including repeated ones, retain exact order and formatting');
  assert.equal(applyChanges(fixture, result.changes), result.text);
  assert.equal(convertCallouts(result.text).text, result.text);
  assert.equal(convertChats(result.text).text, result.text);
  assert.ok(result.text.startsWith(fixture.slice(0, fixture.indexOf('> [!'))));
  const player = new StoryPlayer(parseScene(result.text)); player.revealBeat();
  assert.equal(player.visibleBlocks.filter(b => b.type === 'chat').flatMap(b => b.messages).length, 5);
  assert.equal(player.phase, 'completed'); player.dispose();
});

test('mixed prose, multiple adjacent chats, viewer and multiline third-field subtext retain identity and paragraph boundaries', () => {
  const body = '2030-01-02 03:04\n\nBefore one.\n\nBefore two.\n\n' + chat('# Channel\n> A\n@pace brisk\n@ticks\n{{A|One|first note}}\n{{B|Two\ncontinued|second\nline}}') + '\n' + chat('{{C|Three|}}') + '\n\nAfter.';
  for (const eol of ['\n', '\r\n']) {
    const source = ('Opening.\n\n' + callout(body) + '\nClosing.\n---\nLast.').replaceAll('\n', eol);
    const r = convertCallouts(source); assert.equal(r.count, 1); assert.deepEqual(r.warnings, []);
    const scene = parseScene(r.text); assert.deepEqual(scene.diagnostics, []); assert.equal(scene.beats.length, 2);
    const children = scene.beats[0].blocks.filter(b => b.callout);
    assert.deepEqual(children.map(b => b.type), ['prose', 'chat', 'chat', 'prose']);
    assert.match(children[0].html, /<p>Before one\.<\/p>\n<p>Before two\.<\/p>/);
    assert.equal(children[0].callout.timestamp, '2030-01-02 03:04'); assert.equal(children[0].callout.fold, '-');
    assert.equal(children[1].title, 'Channel'); assert.equal(children[1].viewer, 'A'); assert.equal(children[1].pace, 'brisk'); assert.equal(children[1].ticks, true);
    assert.deepEqual(children[1].messages.map(m => [m.speaker,m.text,m.subtext]), [['A','One','first note'],['B','Two\ncontinued','second\nline']]);
    assert.deepEqual(children[2].messages.map(m => [m.speaker,m.text,m.subtext]), [['C','Three',undefined]]);
    assert.equal(convertCallouts(r.text).count, 0); assert.equal(applyChanges(source,r.changes),r.text);
    if(eol === '\r\n') assert.doesNotMatch(r.text, /(?<!\r)\n/);
  }
});

test('adjacent callouts, quote indentation, bare blank lines and literal header-like chat lines are structural', () => {
  const first = callout('Start.\n\n' + chat('> A\n{{A|One\n[!annotation] literal\n> [!annotation] also literal|}}') + '\n\nEnd.');
  const second = callout(chat('{{B|Two|note}}'), 'email', 'Second');
  for(const source of [first + second, (first + '\n' + second).replace(/^> /gm, '  > '), first.replace('> \n', '\n') + second]) {
    const r=convertCallouts(source); assert.equal(r.count,2,JSON.stringify(r.warnings)); assert.deepEqual(r.warnings,[]);
    const scene=parseScene(r.text); assert.deepEqual(scene.diagnostics,[]);
    const chats=blocks(r.text).filter(b=>b.type==='chat'); assert.equal(chats.length,2); assert.equal(chats[0].messages[0].text,'One\n[!annotation] literal\n> [!annotation] also literal');
    assert.deepEqual(scene.beats[0].callouts.map(c=>[c.type,c.title]),[['annotation','A title'],['email','Second']]);
  }
});

test('current chats remain byte-identical inside a mixed container, with precise source references', () => {
  const current = chat('@viewer A\nA: One\n@subtext\n  | [[Note|local]]');
  const r=convertCallouts(callout('Before.\n\n' + current + '\n\nAfter.'));
  assert.equal(r.count,1); assert.ok(r.text.includes(current));
  const parsed=parseScene(r.text); assert.deepEqual(parsed.diagnostics,[]);
  const ref=parsed.wikiReferences[0]; assert.equal(r.text.split('\n')[ref.line-1], '  | [[Note|local]]');
});

test('malformed/unclosed or unsupported nested content leaves entire callout unchanged and reports a source line', () => {
  for(const body of [chat('{{A|Unclosed'), '```chat\n{{A|Hi|}}', '```chat\n{{A|Hi|}}\n``', chat('{{A|Hi|}}')+'\n\n```other\nunsupported\n```', chat('{{A|Hi|}}')+'\n\n---\nBad beat', chat('{{A|Hi|}}')+'\n\n> [!annotation] Nested\n> body']) {
    const source=callout(body),r=convertCallouts(source); assert.equal(r.count,0,body); assert.equal(r.text,source); assert.equal(r.warnings[0].line,1); assert.match(r.warnings[0].message,/fence|chat|structure|nested/);
  }
});

test('invalid callout containers remain fully readable without silently executing child chats', () => {
  for(const source of ['````callout\n@type annotation\n\n'+chat('A: One'), '````callout\n@type annotation\n@type email\n\n'+chat('A: One')+'\n````']) {
    const p=parseScene(source);assert.ok(p.diagnostics.length);assert.ok(blocks(source).every(b=>b.type==='prose'));assert.match(blocks(source)[0].html,/A: One/);
  }
});

test('all existing recognized callout types support mixed content and complete selections only', () => {
  for(const type of ['prime-log','divergent','annotation','email','janus','janus-log']) {
    const source='Before.\n\n'+callout('Before chat.\n\n'+chat('{{A|One|note}}')+'\n\nAfter chat.',type)+'\nAfter.';
    const start=source.indexOf('> [!'),end=source.lastIndexOf('\nAfter.');
    assert.equal(convertCallouts(source,{scope:{start,end:end-1}}).count,0);
    const r=convertCallouts(source,{scope:{start,end}});assert.equal(r.count,1);
    const children=blocks(r.text).filter(b=>b.callout);assert.equal(children[0].callout.type,type);assert.equal(children[1].messages[0].subtext,'note');
  }
});

test('ordinary prose-only quotes retain the pre-existing conversion boundary', () => {
  const source=callout('Body.')+'\n> A separate ordinary quotation.\n';
  const r=convertCallouts(source);assert.equal(r.count,1);assert.ok(r.text.endsWith('\n> A separate ordinary quotation.\n'));
});

test('mixed containers preserve line numbers, pacing, child sequence and safe identity rendering', () => {
  const source='Before.\n\n'+callout('First.\n\nSecond.\n\n'+chat('{{A|One|note}}')+'\n\nLast.','annotation','**Title** <script>bad</script>');
  const r=convertCallouts(source),parsed=parseScene(r.text,{prosePacing:true});assert.deepEqual(parsed.diagnostics,[]);
  const children=parsed.beats[0].blocks.filter(b=>b.callout);
  assert.deepEqual(children.map(b=>b.type),['prose','prose','chat','prose']);assert.ok(children[0].pacedParagraph);
  assert.match(children[0].callout.titleHtml,/<strong>Title<\/strong> &lt;script&gt;/);
  assert.equal(r.text.split('\n')[children[2].line-1],'```chat');
  assert.deepEqual(parsed.beats[0].sequence.filter(e=>e.type==='component').map(e=>e.blockIndex),[0,1,2,3,4]);
});
