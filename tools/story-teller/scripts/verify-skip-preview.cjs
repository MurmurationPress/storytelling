'use strict';
// Read-only HTTPS verification of the exact prepared candidate; no account token.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
async function verify(build, origin) {
  const base = new URL(origin);
  if (base.protocol !== 'https:') throw Error('A hosted preview must use HTTPS');
  const manifest = JSON.parse(await fs.readFile(path.join(build, 'build-report.json'), 'utf8'));
  const checked = [];
  for (const [name, expected] of Object.entries(manifest.publicFiles)) {
    if (['_headers', '_redirects', '404.html'].includes(name)) continue;
    const response = await fetch(new URL(name, base.origin + '/'));
    if (!response.ok || new URL(response.url).origin !== base.origin) throw Error(`Unexpected response for ${name}: ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    const hash = crypto.createHash('sha256').update(bytes).digest('hex');
    if (bytes.length !== expected.bytes || hash !== expected.sha256) throw Error(`Hosted bytes differ: ${name}`);
    const cache = response.headers.get('cache-control') || '';
    if (name.startsWith('skip/assets/')) {
      if (!cache.includes('immutable') || cache.includes('no-cache')) throw Error(`Wrong image cache policy: ${name}`);
    } else if ((['skip/index.html', 'skip/reader.js', 'skip/reader.css', 'skip/web.css', 'skip/publication.json'].includes(name) || name.startsWith('skip/content/')) && !cache.includes('no-cache')) throw Error(`Missing revalidation: ${name}`);
    if (!(response.headers.get('x-robots-tag') || '').includes('noindex')) throw Error(`Preview indexing header missing: ${name}`);
    checked.push({ file: name, bytes: bytes.length, sha256: hash, cacheControl: cache });
  }
  for (const name of ['/skip/not-a-scene.json', '/skip/missing-image.png', '/build-report.json', '/snapshot/', '/skip/story-teller.project.json']) {
    const response = await fetch(base.origin + name);
    if (response.status !== 404) throw Error(`Expected 404, got ${response.status}: ${name}`);
  }
  for (const [name, status] of [['/', 302], ['/skip', 301]]) {
    const response = await fetch(base.origin + name, { redirect: 'manual' });
    if (response.status !== status || new URL(response.headers.get('location'), base).pathname !== '/skip/') throw Error(`Wrong canonical redirect: ${name}`);
  }
  const result = { previewUrl: base.origin + '/skip/', httpsCertificateValidated: true, publicFilesCompared: checked.length,
    sha256MatchesPreparedFiles: true, sourceSnapshotsAndReports404: true, missingContent404: true,
    canonicalRedirects: true, previewNoindex: true, revalidationAndImmutableAssets: true, checked };
  await fs.writeFile(path.join(build, 'http-preview-validation.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ previewUrl: result.previewUrl, publicFilesCompared: checked.length, result: 'PASS' }, null, 2));
  return result;
}
module.exports = { verify };
if (require.main === module) {
  const [build, origin] = process.argv.slice(2);
  if (!build || !origin) { console.error('Usage: node scripts/verify-skip-preview.cjs BUILD_ROOT PREVIEW_HTTPS_ORIGIN'); process.exitCode = 1; }
  else verify(path.resolve(build), origin).catch(error => { console.error(error.message); process.exitCode = 1; });
}
