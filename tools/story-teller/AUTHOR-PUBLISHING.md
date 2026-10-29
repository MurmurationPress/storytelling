# Standalone book updates

Use the existing exporter, one self-contained book per Cloudflare Pages project.
This is an author command line workflow, not a new publishing platform. Obsidian
remains the writing environment. Keep every build directory outside both repos:
its `snapshot/`, reports and receipts are private; **only `site/` is public**.

## Prepare and review

Commit the book project first. Uncommitted edits are not exported. Checkout the
intended committed renderer in a separate checkout if your current checkout has
unrelated work. Install its dependencies with `npm ci` in `tools/story-teller`.
Use full commit IDs for both revisions. The command checks the renderer checkout
matches the requested revision, builds it, archives the specified project from
Git and refuses warnings or unresolved resources. It preserves the source and
never exports other repository folders. Keep the existing licence notices.

From `tools/story-teller`:

```bash
node scripts/publication.cjs prepare \
  --project '/path/to/Stories-Told/Story Teller - The Curious Adventures of Skip' \
  --source SOURCE_COMMIT \
  --renderer RENDERER_COMMIT \
  --target scripts/skip-target.json \
  --build '/path/to/private-builds/skip-YYYYMMDD'

node scripts/publication.cjs preview --build '/path/to/private-builds/skip-YYYYMMDD'
node scripts/verify-skip-preview.cjs '/path/to/private-builds/skip-YYYYMMDD' 'IMMUTABLE_PREVIEW_ORIGIN'
```

Wrangler 4.155.0 is pinned by the command and needs Node/npm/network access. Login
once using `npx --yes wrangler@4.155.0 login`. Commands capture credentials privately
through Wrangler, never put them in a target or build. A target contains the
existing Pages project, distinct preview/production branches and book slug; add
`accountId` if you have multiple accounts. These commands do not create projects,
configure domains, change DNS, edit Ghost or publish a release.

Inspect `build-report.json`: source revision, project path, renderer revision and
version, publication identity, reading order, warnings, file sizes and SHA-256s.
Review `site/skip/` over HTTP, then the immutable HTTPS URL printed in the preview
receipt. Test scene/beat navigation, refresh, position, speed, notes, images and
animations on your intended devices. The existing Skip HTTP verifier compares
all served payload files, checks caching/noindex/404s and writes a private report.
The verifier reads the slug from the build report (the legacy filename is retained).

Keep the preview receipt `preview-DEPLOYMENT_ID.json`, full build, upload ZIP and
validation reports together. The receipt binds the file inventory, target,
source/renderer revisions and production deployment at preview time. Review the
immutable URL: the friendly review branch alias moves on the next preview.
Do not modify an already reviewed build. Prepare a new directory for updates.

## Publish only after approval

**Skip publication is authorised following Ted's actual iPad/iPhone acceptance
of the f519ec23 preview.** For subsequent updates, after reviewing the exact
immutable preview, publishing is a separate explicit command:

```bash
node scripts/publication.cjs publish \
  --build '/path/to/private-builds/skip-YYYYMMDD' \
  --reviewed PREVIEW_DEPLOYMENT_ID
```

This checks the receipt, local hashes, hosted preview bytes and current production
identity. It copies the retained artifact; it does not rebuild or export again.
Only `_headers` (remove preview noindex) and `robots.txt` (allow the book) differ.
Every reader, content and asset byte stays identical to the reviewed candidate.
A private production receipt records the new and previous deployments and full
production inventory. The upload uses the configured production branch.

Cloudflare does not provide a compare-and-swap deployment in this command. Its
current-production checks reduce mistakes but are not an atomic lock: use one
publisher at a time. If production changed since preview, prepare/review a fresh
preview rather than editing the receipt. If a network failure occurs during
upload, inspect the Pages dashboard before retrying; a deployment may exist even
when the local receipt could not be written.

## Roll back

Retain previous builds and production receipts in secure backed-up storage.
After choosing a previously published build and checking the current production
ID in Cloudflare, redeploy that retained build explicitly:

```bash
node scripts/publication.cjs rollback \
  --build '/path/to/private-builds/PREVIOUS-BUILD' \
  --reviewed PREVIOUS_PRODUCTION_DEPLOYMENT_ID \
  --expected CURRENT_PRODUCTION_DEPLOYMENT_ID
```

This creates a new production deployment containing the old artifact. It checks
both the old receipt and expected current production. It does not change Git,
DNS or Ghost. Previous Cloudflare deployments also remain available for dashboard
inspection. Production promotion/rollback have automated guard/copy tests;
neither has been exercised against live production during this preview task.

## Address and saved positions

Ted has authorised the initial reader custom-domain/DNS setup. He will edit
and publish the Ghost link himself. Thereafter updates use the same `/skip/` address; no routine DNS or Ghost
edit is needed. The intended link is:

```html
<a href="https://read.murmurationpress.co.uk/skip/">Read The Curious Adventures of Skip</a>
```

Position and reader preferences use browser-local storage, scoped to origin and
the exported publication identity. Keep document IDs and order stable for routine
text updates. Adding, deleting or reordering documents changes the current
publication identity and can reset saved position/preferences. Edited beats are
restored best-effort by existing beat identity/index, at ready state rather than
mid-wait elapsed time. Preview and production origins do not share storage;
neither do devices/browsers. Private browsing, cleared or unavailable storage
cannot guarantee persistence. Rollback does not erase storage, but changed IDs or
beat structure can affect where a previous position restores.
