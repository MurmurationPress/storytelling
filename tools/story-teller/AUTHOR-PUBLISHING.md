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

## Editorial Supporting Content check

Before approving a publication or content update, review each supporting note from its earliest accessible point in the book, including hover previews, full panels and all onward note links. Check titles, images and captions as well as text for premature revelations or assumed knowledge. Recheck the reachable chain when a shared note changes; resolve unintended spoilers with existing explicit note versions/aliases or link/content edits, and record intentional disclosures. See [the editorial review rule](../../vault/Supporting%20Content.md#editorial-review-rule-information-at-the-point-of-access).

Zero export warnings verify resources and syntax, not spoiler safety. This is an editorial check, not an automatic reader-progress filter.

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
inspection. Production promotion has now been executed and verified for accepted Skip build
f519ec23 (deployment 42ffb0fd). Rollback has automated guard/copy tests and has not
been invoked against live production. Retain that build and its production receipt
as the rollback target for later updates; the first publication had no previous
production deployment.

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

## First Skip publication record

Accepted artifact: f519ec23 preview, renderer 0.12.4 (`2f2e5fb`), source `7c030a1`.
Integrated by Stories-Told #2 (`fe8ebbb`) and storytelling #23 (`437b70e`), with
reviewed/merged tree equality. The publish command created production deployment
`42ffb0fd-152c-4e9b-9651-c388519fc002` without re-exporting reader content.
Production Pages URL: https://murmuration-skip.pages.dev/skip/ . The final custom domain https://read.murmurationpress.co.uk/skip/ is active and
verified, following the account-holder CNAME setup. The connected DNS/settings
API returns 403; the account holder used the dashboard, preserving other records.
The project’s Custom domains tab confirms active validation.

For a future rollback after a later deployment, using the retained first build:

```bash
node scripts/publication.cjs rollback \
  --build '/path/to/private-builds/skip-preview-0.12.4-final-20261029' \
  --reviewed 42ffb0fd-152c-4e9b-9651-c388519fc002 \
  --expected CURRENT_PRODUCTION_DEPLOYMENT_ID
```

Do not run a rollback merely to test it on the live reader. Publication receipts
and all source/renderer files stay outside the public `site/`. At that first publication, original source PR #1 had later editorial work and
remained open. Those updates have since merged and are included in the approved
b002eb1 edition below. Always publish the accepted snapshot, not later edits. Ghost publication remains Ted's.

## Custom-domain cache verification

The final hostname is live at https://read.murmurationpress.co.uk/skip/. Its
reader/content bytes, navigation, notes, storage and following pass. Initial verification
found a custom-domain cache exception: JavaScript/CSS return `max-age=14400`
instead of the export's `no-cache`; HTML/book JSON already revalidate. Correct
this once at the reader hostname so subsequent renderer updates do not leave
repeat visitors with old script/style files. Do not change global zone caching
for the Ghost website.

In Cloudflare Cache Rules, append a rule matching:

```text
(http.host eq "read.murmurationpress.co.uk" and starts_with(http.request.uri.path, "/skip/"))
```

Set Browser TTL to **Respect origin**, leaving unrelated settings/rules intact.
The connected OAuth cache/settings API returns 403. Ted deployed this reader-only
rule in the dashboard; the subsequent final-host header and full-payload checks
pass. Keep the rule for routine updates and recheck headers after hosting changes. Expected outcomes:
HTML, publication/content JSON and reader.js/reader.css/web.css revalidate;
content-addressed images retain their long immutable cache. Existing browser
caches may retain their previous TTL until expiration or a reload that bypasses
the local cache; Cloudflare cache purging does not clear browser caches.
See [Cloudflare Browser TTL settings](https://developers.cloudflare.com/cache/how-to/cache-rules/settings/#browser-ttl).

## Accepted b002eb1 update

Ted approved preview `0bd22c55-2f79-4f26-b776-f6f610c25fb2` (“Reviewed and happy
to publish”). The exact retained build was promoted without export/rebuild to
production `bcc3d61e-81f1-4a33-a246-e17543e3d257`; source is b002eb1, renderer
0.12.4 at d4e3601. https://read.murmurationpress.co.uk/skip/ remains unchanged.
All 76 served hashes and final-origin functional/persistence/follow tests pass.
The previous 42ffb0fd production and its retained first build are available for
rollback using the earlier example with current-production expectation bcc3d61e.
Use full deployment IDs from the receipts. The first build is not overwritten.

Publication follows the point-of-access editorial review rule. All 23 notes and
recursive onward paths were reviewed; no blocking finding required changing the
approved snapshot. The minor early Clive/Companion terminology item is recorded
for a future editorial update. This review is distinct from syntax/resource checks
and does not add automatic filtering. Ghost remains Ted's responsibility.

## Optional More-menu destination

A publication can set `webReader.moreLink` in its project manifest, with `label`
and an absolute HTTP(S) `url`. A deployment target may supply `moreLink` instead;
the target value takes precedence. Omit it to show no additional link. The generic
reader has no publisher default. The link is text-labelled, keyboard accessible
and opens a separate tab with `noopener noreferrer`. Book-matter Markdown HTTP(S)
links use the same separate-tab behaviour; other protocols remain inert.
