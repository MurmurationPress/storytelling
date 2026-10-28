'use strict';
// One book, existing exporter, static /skip/ directory. Never deploys or changes source.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { exportWeb, publicationBody } = require('../src/web-export.cjs');
const { parseScene } = require('../src/parser.cjs');
const { StoryPlayer } = require('../src/player.cjs');
const { resolveSettings } = require('../src/pacing-settings.cjs');
const PROJECT = 'Story Teller - The Curious Adventures of Skip';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const git = (root, ...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();
async function files(root) {
  const result = [];
  for (const entry of await fs.readdir(root, { withFileTypes: true })) {
    const name = path.join(root, entry.name);
    if (entry.isSymbolicLink()) throw Error('Publication cannot include symlinks');
    if (entry.isDirectory()) result.push(...await files(name));
    else if (entry.isFile()) result.push(name);
    else throw Error('Unexpected publication file type');
  }
  return result.sort();
}
async function snapshot(repo, revision, destination) {
  const archive = path.join(path.dirname(destination), 'snapshot.tar');
  execFileSync('git', ['-C', repo, 'archive', '--output', archive, revision, '--', PROJECT]);
  try { execFileSync('tar', ['-xf', archive, '-C', destination]); }
  finally { await fs.unlink(archive); }
}
function zipSite(site, destination) {
  const script = 'import pathlib,sys,zipfile\nroot=pathlib.Path(sys.argv[1])\nwith zipfile.ZipFile(sys.argv[2], "x", zipfile.ZIP_DEFLATED) as archive:\n for file in sorted(root.rglob("*")):\n  if file.is_file(): archive.write(file, file.relative_to(root).as_posix())\n';
  execFileSync('python3', ['-c', script, site, destination]);
}
async function prepare(repo, ref, destination, mode = 'preview') {
  if (!['preview', 'production'].includes(mode)) throw Error('Mode must be preview or production');
  const revision = git(repo, 'rev-parse', '--verify', `${ref}^{commit}`);
  const toolRoot = path.resolve(__dirname, '..');
  const rendererRevision = git(toolRoot, 'rev-parse', 'HEAD');
  // Refuse unstaged/staged reader changes: the record must identify committed code.
  execFileSync('git', ['-C', toolRoot, 'diff', '--exit-code', 'HEAD', '--', 'src', 'media', 'package.json', 'package-lock.json']);
  const output = path.resolve(destination);
  const rendererRepo = git(toolRoot, 'rev-parse', '--show-toplevel');
  for (const sourceRoot of [await fs.realpath(repo), await fs.realpath(rendererRepo)]) {
    const relative = path.relative(sourceRoot, output);
    if (!relative.startsWith(`..${path.sep}`) && relative !== '..') throw Error('Choose an output outside both repositories');
  }
  await fs.mkdir(output); // Exclusive new build; never overwrite a reviewed candidate.
  await fs.mkdir(path.join(output, 'snapshot'));
  await snapshot(repo, revision, path.join(output, 'snapshot'));
  const project = path.join(output, 'snapshot', PROJECT);
  const before = new Map(await Promise.all((await files(project)).map(async file => [file, sha(await fs.readFile(file))])));
  execFileSync('npm', ['run', 'build'], { cwd: toolRoot, stdio: 'inherit' });
  const site = path.join(output, 'site'); await fs.mkdir(site);
  const exported = await exportWeb(project, path.join(site, 'skip'));
  const manifest = JSON.parse(await fs.readFile(path.join(project, 'story-teller.project.json'), 'utf8'));
  const book = JSON.parse(await fs.readFile(path.join(site, 'skip/publication.json'), 'utf8'));
  const problems = [...exported.warnings];
  for (const [target, entry] of Object.entries(book.targets)) if (!entry.id || !book.notes[entry.id]) problems.push(`Unresolved note: ${target}`);
  const allMedia = [];
  const playbackPlan = [];
  for (const item of book.readingOrder) {
    const data = JSON.parse(await fs.readFile(path.join(site, 'skip', item.file), 'utf8'));
    const authored = manifest.scenes.find(scene => scene.id === item.id) || (item.kind === 'front' ? manifest.matter.front : manifest.matter.back);
    const original = await fs.readFile(path.join(project, authored.file), 'utf8');
    if (data.source !== publicationBody(original)) problems.push(`Scene wording changed: ${item.id}`);
    if (data.prosePacing !== resolveSettings(original, manifest).enabled) problems.push(`Pacing changed: ${item.id}`);
    if (!data.matter) {
      const player = new StoryPlayer(parseScene(data.source, { prosePacing: data.prosePacing }));
      const beats = player.scene.beats.map((beat, index) => {
        player.index = index; player.reset();
        return { blocks: beat.blocks.map(block => ({ type: block.type, messages: block.messages?.length || 0 })),
          reducedMotionDuration: player.steps.filter(step => step.type !== 'typeout-grapheme').reduce((sum, step) => sum + step.delayMs, 0),
          images: beat.blocks.filter(block => block.type === 'image').length };
      });
      player.dispose(); playbackPlan.push({ id: item.id, title: item.title, beats });
    }
    allMedia.push(...Object.entries(data.media));
  }
  for (const note of Object.values(book.notes)) allMedia.push(...Object.entries(note.media));
  for (const [reference, item] of allMedia) {
    if (!item.url) { problems.push(`Missing image: ${reference}`); continue; }
    const bytes = await fs.readFile(path.join(site, 'skip', item.url));
    if (!before.has(path.resolve(project, 'scenes', decodeURIComponent(reference))) && !before.has(path.resolve(project, 'Supporting Content', decodeURIComponent(reference)))) problems.push(`Unexpected image source: ${reference}`);
    if (!item.url.includes(sha(bytes))) problems.push(`Image digest mismatch: ${reference}`);
  }
  if (!book.targets.Canvas?.id) problems.push('Canvas must resolve');
  const final = JSON.parse(await fs.readFile(path.join(site, 'skip', book.scenes.at(-1).file), 'utf8'));
  if (Object.keys(final.media).length !== 3) problems.push('Final chapter must retain its three illustrations');
  for (const [file, hash] of before) if (sha(await fs.readFile(file)) !== hash) problems.push('Snapshot changed during preparation');
  await fs.writeFile(path.join(site, '_redirects'), '/ /skip/ 302\n/skip /skip/ 301\n');
  await fs.writeFile(path.join(site, '404.html'), '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Page not found</title><h1>Page not found</h1><p><a href="/skip/">Read The Curious Adventures of Skip</a></p></html>\n');
  const revalidate = ['/skip/', '/skip/index.html', '/skip/reader.js', '/skip/reader.css', '/skip/web.css', '/skip/publication.json', '/skip/content/*'];
  await fs.writeFile(path.join(site, '_headers'), `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: same-origin\n${mode === 'preview' ? '  X-Robots-Tag: noindex, nofollow\n' : ''}${revalidate.map(route => `${route}\n  Cache-Control: no-cache\n`).join('')}/skip/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n`);
  await fs.writeFile(path.join(site, 'robots.txt'), `User-agent: *\n${mode === 'preview' ? 'Disallow: /' : 'Allow: /skip/'}\n`);
  // Carry existing software notices; the book/artwork retain their separate copyright.
  await fs.copyFile(path.join(toolRoot, 'LICENSE'), path.join(site, 'skip/licences/story-teller.txt'));
  await fs.copyFile(path.join(rendererRepo, 'LICENSING.md'), path.join(site, 'skip/licences/story-teller-scope.txt'));
  const publicFiles = {};
  let totalBytes = 0;
  for (const file of await files(site)) {
    const name = path.relative(site, file).split(path.sep).join('/'); const bytes = await fs.readFile(file);
    totalBytes += bytes.length; publicFiles[name] = { bytes: bytes.length, sha256: sha(bytes) };
    if (bytes.length > 25 * 1024 * 1024) problems.push(`Cloudflare Pages 25 MiB limit: ${name}`);
    if (name.split('/').some(piece => piece.startsWith('.')) || name.endsWith('.md') || name.includes('metadata/') || name.includes('node_modules/')) problems.push(`Private/unexpected file: ${name}`);
    if (/\.(json|html|js|css|txt)$/.test(name) && /\/home\/thawkins\/|file:\/\/|"provenance"\s*:|"sourceScope"\s*:/.test(bytes.toString('utf8'))) problems.push(`Authoring path/provenance in public output: ${name}`);
  }
  if (Object.keys(publicFiles).length > 20000) problems.push('Cloudflare Pages file limit exceeded');
  const report = { sourceRepository: 'tedwarddick/Stories-Told', sourceRevision: revision, sourceProject: PROJECT, rendererRevision, mode,
    readerUrl: 'https://read.murmurationpress.co.uk/skip/', ...exported, destination: 'site/skip',
    supportingNotes: Object.keys(book.notes).length, noteTargets: Object.keys(book.targets).length,
    readingOrder: book.readingOrder.map(({ id, kind, title, label }) => ({ id, kind, title, label })),
    imageReferences: allMedia.length, finalChapterIllustrations: Object.keys(final.media).length,
    publicFileCount: Object.keys(publicFiles).length, totalBytes, problems: [...new Set(problems)], publicFiles };
  await fs.writeFile(path.join(output, 'playback-plan.json'), JSON.stringify(playbackPlan, null, 2) + '\n');
  await fs.writeFile(path.join(output, 'build-report.json'), JSON.stringify(report, null, 2) + '\n');
  if (report.problems.length) throw Error(`Publication blocked; inspect ${path.join(output, 'build-report.json')}`);
  zipSite(site, path.join(output, `skip-${mode}-upload.zip`));
  console.log(JSON.stringify({ output, sourceRevision: revision, rendererRevision, mode, scenes: exported.scenes, pages: exported.pages, assets: exported.assets, supportingNotes: report.supportingNotes, warnings: exported.warnings, totalBytes }, null, 2));
  return report;
}
module.exports = { prepare, zipSite };
if (require.main === module) {
  const [repo, ref, destination, mode = 'preview'] = process.argv.slice(2);
  if (!repo || !ref || !destination) { console.error('Usage: node scripts/prepare-skip-publication.cjs SOURCE_REPO SOURCE_COMMIT NEW_OUTPUT [preview|production]'); process.exitCode = 1; }
  else prepare(path.resolve(repo), ref, destination, mode).catch(error => { console.error(error.message); process.exitCode = 1; });
}
