'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs/promises'), path = require('node:path'), os = require('node:os');
const { addSceneHeading, hasSceneHeading } = require('../src/scene-heading.cjs');
const { inspectStructure } = require('../src/structure.cjs');
const { parseScene } = require('../src/parser.cjs');
const { createMarkdown, inlineText } = require('../src/markdown.cjs');
const { StoryPlayer } = require('../src/player.cjs');
const importer = require('../src/manuscript-import.cjs');
const { prepareWeb } = require('../src/web-export.cjs');
const md = createMarkdown();
function headings(source) {
  const s=inspectStructure(source),tokens=md.parse(source.slice(s.lines[s.start]?.start ?? source.length),{});
  return tokens.flatMap((token,i)=>token.type==='heading_open' && token.tag==='h1' ? [inlineText(md,tokens[i+1].children)] : []);
}
test('adds a literal H1 to the first body without changing original wording',()=>{
  const source='First paragraph.\n\nSecond paragraph.';
  assert.equal(addSceneHeading(source,'The signal'),'# The signal\n\n'+source);
  assert.equal(addSceneHeading('', 'Empty'),'# Empty\n\n');
});
test('matching leading H1 stays byte-identical, including ATX, Setext and authored inline formatting',()=>{
  for(const source of ['# The signal\n\nWords.','  # **The** signal ###\n\nWords.','The signal\n==========\n\nWords.','<!-- beat: First -->\nThe signal\n==========\n\nWords.','\n\n# The   signal\nWords.']) {
    assert.equal(addSceneHeading(source,'The signal'),source);assert.ok(hasSceneHeading(source,'The signal'));
  }
  assert.equal(addSceneHeading('# [[Target|The signal]]\nWords.','The signal'),'# [[Target|The signal]]\nWords.');
});
test('different H1, H2, fenced examples and quoted headings are preserved rather than mistaken for a matching leading H1',()=>{
  for(const source of ['# Another title\n\nWords.','## The signal\n\nWords.','```md\n# The signal\n```\n','    # The signal\n','> # The signal\n\nWords.','Opening.\n\n# The signal']) {
    assert.equal(addSceneHeading(source,'The signal'),'# The signal\n\n'+source);
  }
});
test('frontmatter, BOM, leading whitespace and original line endings remain intact',()=>{
  const prefix='\uFEFF---\r\ntitle: Signal # author comment\r\ncustom: true\r\n---\r\n\r\n  \r\n';
  const body='Original **words**.\r\n';const result=addSceneHeading(prefix+body,'Signal');
  assert.equal(result,prefix+'# Signal\r\n\r\n'+body);assert.equal(addSceneHeading(prefix+'# Signal\r\n\r\n'+body,'Signal'),prefix+'# Signal\r\n\r\n'+body);
  const noFinalNewline='---\ntitle: Signal\n---';assert.equal(addSceneHeading(noFinalNewline,'Signal'),noFinalNewline+'\n# Signal\n\n');
});
test('Markdown punctuation, entities, Unicode and wiki-looking titles render as exact literal text',()=>{
  for(const title of ['The signal: “Why?” — café 🛰️','A *bold* _word_ &copy; [link](url) # <script>','[[Target|Label]] ![image](x.png) `code` \\ ~ =','Two\nlines']) {
    const result=addSceneHeading('Words.',title);assert.deepEqual(headings(result),[title]);
    assert.equal(addSceneHeading(result,title),result);assert.ok(hasSceneHeading(result,title));
    assert.deepEqual(parseScene(result).wikiReferences,[]);assert.deepEqual(parseScene(result).images,[]);
  }
});
test('leading boundaries and named-beat metadata keep their meaning without adding title-only beats',()=>{
  for(const body of ['Words.\n---\nMore.','\n---\nWords.\n---\nMore.','<!-- beat: First -->\n\nWords.\n---\nMore.','<!-- beat: Empty -->\n---\n<!-- beat: First -->\nWords.\n---\nMore.']) {
    const source='---\ntitle: Signal\n---\n'+body;const original=parseScene(source),result=parseScene(addSceneHeading(source,'Signal'));
    assert.equal(result.beats.length,original.beats.length);assert.deepEqual(result.beats.map(b=>b.title),original.beats.map(b=>b.title));
    assert.deepEqual(headings(addSceneHeading(source,'Signal')),['Signal']);
    for(const prosePacing of [false,true]){const player=new StoryPlayer(parseScene(addSceneHeading(source,'Signal'),{prosePacing}));assert.match(player.visibleBlocks.map(b=>b.html).join(''),/<h1>Signal<\/h1>/);assert.match(player.visibleBlocks.map(b=>b.html).join(''),/Words/);assert.equal(player.timer,null);}
  }
});
test('import changes only story-scene copies; preserves source bytes, identity/order and existing matter/part documents',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'story-heading-import-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const folder=path.join(root,'Book');await fs.mkdir(folder);
  const note=(type,parent,order,body,title)=>`---\ntype: ${type}\nparent: "[[${parent}]]"\norder: ${order}\n${title?`title: ${JSON.stringify(title)}\n`:''}---\n${body}`;
  const sources=new Map([['Book.md',note('book','',1,'','Book')],['Book/Part.md',note('part','Book',1,'Part introduction unchanged.\n','Part')],['Book/Z.md',note('scene','Book/Part',2,'Original wording.\n','Signal: café *λ*')],['Book/A.md',note('scene','Book/Part',10,'# Matching\n\nStill unchanged.\n','Matching')],['Book/Front.md',note('front-matter','Book',1,'Front unchanged.\n')],['Book/Back.md',note('back-matter','Book',1,'Back unchanged.\n')]]);
  for(const [file,content] of sources)await fs.writeFile(path.join(root,file),content);
  const prepared=await importer.resolveAssets(importer.plan(importer.discover(await importer.scan(folder),folder),'order'),folder);
  const before=prepared.scenes.map(s=>({id:s.id,label:s.label,title:s.title,kind:s.kind,partId:s.partId}));const dest=path.join(root,'Adaptation');
  const manifest=await importer.writeProject(prepared,dest);
  assert.deepEqual(importer.orderedScenes(manifest).map(({id,label,title,kind,partId})=>({id,label,title,kind,partId})),before);
  assert.deepEqual(manifest.scenes.map(s=>s.label),['1.1','1.2','1.3']);
  for(const [file,content] of sources)assert.equal(await fs.readFile(path.join(root,file),'utf8'),content);
  const [part,signal,matching]=await Promise.all(manifest.scenes.map(s=>fs.readFile(path.join(dest,s.file),'utf8')));
  assert.equal(part,sources.get('Book/Part.md'));assert.equal(matching,sources.get('Book/A.md'));assert.deepEqual(headings(signal),[before[1].title]);assert.ok(signal.endsWith('Original wording.\n'));
  assert.equal(await fs.readFile(path.join(dest,'Front Matter.md'),'utf8'),'Front unchanged.\n');assert.equal(await fs.readFile(path.join(dest,'Back Matter.md'),'utf8'),'Back unchanged.\n');
  await fs.writeFile(path.join(dest,'Supporting Content/Note.md'),'# Original note\nUnchanged.');
  const web=await prepareWeb(dest);assert.equal(web.scenes.find(s=>s.id===before[1].id).data.sceneTitleInBody,true);assert.equal(web.scenes.find(s=>s.id===before[0].id).data.sceneTitleInBody,false);assert.equal(web.scenes.find(s=>s.id===before[2].id).data.sceneTitleInBody,true);
  assert.equal(web.scenes.find(s=>s.kind==='front').data.sceneTitleInBody,false);assert.equal(await fs.readFile(path.join(dest,'Supporting Content/Note.md'),'utf8'),'# Original note\nUnchanged.');
  const existing='Existing adaptation without a heading.\n';await fs.writeFile(path.join(dest,manifest.scenes[1].file),existing);
  const legacy=await prepareWeb(dest);assert.equal(legacy.scenes.find(s=>s.id===before[1].id).data.sceneTitleInBody,false);assert.equal(await fs.readFile(path.join(dest,manifest.scenes[1].file),'utf8'),existing);
});
