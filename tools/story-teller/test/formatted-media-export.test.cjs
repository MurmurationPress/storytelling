'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {prepareWeb,exportWeb}=require('../src/web-export.cjs');
const {parseScene}=require('../src/parser.cjs');
const {resolveMedia}=require('../src/media.cjs');
const fixture=path.join(__dirname,'../samples/formatted-media-project');
test('nested formatted media exports once by content hash, rewrites all references and remains portable',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'formatted-export-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const project=path.join(dir,'project');await fs.cp(fixture,project,{recursive:true});
 const prepared=await prepareWeb(project);assert.equal(prepared.assets.size,3);
 const data=prepared.scenes[0].data;assert.equal(Object.keys(data.media).length,5);
 assert.equal(data.media['../assets/Relationship%20model%20%CE%B1.png'].url,data.media['../assets/Repeated.png'].url);
 assert.ok(!Object.keys(data.media).some(src=>src.includes('yaml-only-secret')));
 assert.match(prepared.warnings.join('\n'),/scenes\/Media.md:\d+: Image unavailable: .*missing/);
 const destination=path.join(dir,'reader');await exportWeb(project,destination);await fs.rename(project,path.join(dir,'source-offline'));
 for(const entry of Object.values(data.media))if(entry.url)assert.ok((await fs.readFile(path.join(destination,entry.url))).length>0);
 assert.equal((await fs.readdir(path.join(destination,'assets'))).length,3);
});
test('formatted references use the existing webview resolver and preserve source-located fallbacks and restrictions',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'formatted-resolve-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));await fs.cp(fixture,dir,{recursive:true});
 const doc={uri:{scheme:'file',fsPath:path.join(dir,'scenes/Media.md')}};
 const scene=parseScene('````typeout\n@format annotation\n\n![Good](<../assets/Relationship model α.png>)\n\n![Remote](https://example.test/a.png)\n\n![Embedded](data:image/png;base64,aGVsbG8=)\n\n![Missing](../assets/missing.png)\n\n![Unsupported](../assets/diagram.svg)\n````');
 const vscode={Uri:{file:fsPath=>({scheme:'file',fsPath})},FileType:{File:1},workspace:{getWorkspaceFolder:()=>({uri:{fsPath:dir}}),fs:{stat:async uri=>({type:(await fs.stat(uri.fsPath)).isFile()?1:2}),readFile:uri=>fs.readFile(uri.fsPath)}}};
 const result=await resolveMedia(vscode,doc,{asWebviewUri:uri=>({toString:()=>`webview:${uri.fsPath}`})},scene);
 assert.match(result.media[scene.images[0]].url,/webview:.*Relationship model α.png/);
 for(const src of scene.images.slice(1))assert.ok(result.media[src].error);
 assert.ok(result.diagnostics.every(message=>/^Line \d+: Image /.test(message)));
 assert.match(result.diagnostics.join('\n'),/remote and embedded URLs are disabled/);
 assert.match(result.diagnostics.join('\n'),/Unsupported image format/);
});
test('nested path traversal and symlink escapes are rejected by export, just like ordinary images',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'formatted-escape-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const root=path.join(dir,'project');await fs.cp(fixture,root,{recursive:true});await fs.copyFile(path.join(root,'assets/Repeated.png'),path.join(dir,'outside.png'));
 const file=path.join(root,'scenes/Media.md');
 for(const src of ['../../outside.png','../assets/escape.png']){
  if(src.includes('escape.png'))await fs.symlink(path.join(dir,'outside.png'),path.join(root,'assets/escape.png'));
  await fs.writeFile(file,'```typeout\n@format janus-log\n\n![Forbidden]('+src+')\n```');
  await assert.rejects(prepareWeb(root),/escapes/);
 }
});
