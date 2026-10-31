'use strict';
// Read-only actual-guide validation plan. Its output is PRIVATE, never under site/.
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const build=path.resolve(process.argv[2]||''),renderer=path.resolve(process.argv[3]||path.join(__dirname,'..'));
if(!process.argv[2])throw Error('Usage: node test/story-telling-review-plan.cjs BUILD_ROOT [PINNED_RENDERER_TOOL_ROOT]');
const report=JSON.parse(fs.readFileSync(path.join(build,'build-report.json')));
if(report.slug!=='story-telling')throw Error('Use the dedicated Story Telling guide build');
if(execFileSync('git',['-C',renderer,'rev-parse','HEAD'],{encoding:'utf8'}).trim()!==report.rendererRevision)throw Error('Validation parser must match the pinned renderer revision');
execFileSync('git',['-C',renderer,'diff','--exit-code','HEAD','--','src','package.json','package-lock.json'],{stdio:'pipe'});
const{parseScene}=require(path.join(renderer,'src/parser.cjs'));
const site=path.join(build,'site',report.slug),book=JSON.parse(fs.readFileSync(path.join(site,'publication.json')));
if(book.title!=='Story Telling')throw Error('Unexpected book');
const plan=book.scenes.map(item=>{const data=JSON.parse(fs.readFileSync(path.join(site,item.file)));const scene=parseScene(data.source,{prosePacing:data.prosePacing});return{id:item.id,title:item.title,beats:scene.beats.map(beat=>({title:beat.title,chats:beat.blocks.filter(b=>b.type==='chat').flatMap(b=>b.messages).map(m=>({speaker:m.speaker,text:m.text})),typeouts:beat.blocks.filter(b=>b.type==='typeout').map(b=>({format:b.format,text:b.format==='annotation'?b.annotation.segments.join(''):b.text})),diagrams:beat.blocks.filter(b=>b.html?.includes('class="story-diagram"')).map(b=>({line:b.line,kind:b.html.includes('classDiagram')?'class':'flowchart'})),hasProsePacing:beat.blocks.some(b=>b.pacedParagraph),blocks:beat.blocks.map(b=>b.type)}))};});
fs.writeFileSync(path.join(build,'review-plan.json'),JSON.stringify(plan,null,2)+'\n');
console.log(JSON.stringify({scenes:plan.length,beats:plan.reduce((n,s)=>n+s.beats.length,0),privatePlan:path.join(build,'review-plan.json')}));
