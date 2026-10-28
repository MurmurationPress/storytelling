# Skip: one standalone web export

This is a small publication trial, not a shared renderer or a new publishing
platform. The existing exporter is unchanged; the 0.12.1 reader candidate fixes supporting-note activation/preview overlap without changing playback policy. Ghost remains the main
Murmuration Press website; the reader is an independent static directory.

Review preview: **https://c548539c.murmuration-skip.pages.dev/skip/**.
Branch alias: **https://skip-review-7c030a1.murmuration-skip.pages.dev/skip/**.

Proposed production URL: **https://read.murmurationpress.co.uk/skip/**.
Production deployment, custom-domain/DNS changes and Ghost publication require
Ted's approval after reviewing the preview. Nothing here performs them.

## Prepared candidate — 2026-10-28

- Book baseline: `tedwarddick/Stories-Told` main
  `bf92b8e0faa05db9fefde823054c465c428249f5`.
- Candidate source: `7c030a14c8911f26d468e1d5de2b714445da9648`, on
  `publication/skip-supporting-link-targets`, [source review PR #1](https://github.com/tedwarddick/Stories-Told/pull/1).
  Two files have four explicit note-target repairs. Wiki-link labels are verified
  identical: `the PRIME novels` points to `The PRIME Novels`; Miranda Stubbs and
  Jo Ellis references point to the existing Miranda/Jo notes. No prose, dialogue,
  timing, settings, order, matter or artwork changes. The PR is not merged.
- Reader runtime: `fa09c675900fecdd04cc9a846e628ec20e53ead2` (0.12.1 review candidate).
- Source project: `Story Teller - The Curious Adventures of Skip`.
- Export: 14 scenes / 144 beats, front and back matter, 23 notes, 44 unique image
  files; all four initial warnings resolved, zero final warnings. Canvas resolves;
  all three final-chapter illustrations are included. Original animated WebP
  bytes are preserved. There are no authored type-out blocks in this source;
  renderer support and sound/mute controls are retained without inventing any.
- Public upload: 78 files, 101,599,211 bytes, every asset below 25 MiB.
- Local build: `/home/thawkins/Documents/Publication Builds/skip-cloudflare-review-20261028/`.
  `site/` is the **only** upload directory. `skip-preview-upload.zip` contains just
  that directory's contents, with `skip/` paths preserved.
- Local Pages preview: **http://192.168.4.43:8788/skip/** on Ted's LAN while the
  development server/computer remains running. This is not a Cloudflare-hosted
  deployment or production URL.

`build-report.json`, `playback-plan.json`, browser evidence and screenshots live
beside `site/`, never inside it. The pinned private source snapshot also stays
outside `site/`. Do not upload the build's parent directory or either repository.
Existing software MIT/scope notices and dependency licences are included without
changing any terms; the book/artwork retain their original copyright.
The build record lists every public filename, byte length and SHA-256; the ZIP
is checked against that list. There are no manuscript frontmatter/provenance,
local authoring paths, credentials, `.git`, metadata folders or unrelated assets
in the upload. The exported story text and supporting notes themselves are
publication content, accessible to anyone given the preview.

## Repeat the export or prepare an update

Save and commit editorial changes first. The CLI cannot inspect unsaved editor
buffers. Fetch source changes, inspect the selected commit and preserve stable
manifest identities/scene order; do not reimport or reconstruct the book.
Before publishing main, resolve/merge the source review PR or otherwise retain
its four target repairs in the chosen committed source.

From the storytelling repository, using the reviewed tooling branch/commit:

```sh
npm ci --prefix tools/story-teller
node tools/story-teller/scripts/prepare-skip-publication.cjs \
  /home/thawkins/Documents/GitHub/Stories-Told \
  7c030a14c8911f26d468e1d5de2b714445da9648 \
  '/home/thawkins/Documents/Publication Builds/skip-NEW-CANDIDATE'
```

Use a new destination each time. The preparation script resolves a commit,
archives only the specified project into a private snapshot, builds the existing
reader and calls `exportWeb`. It refuses reader source changes, output inside
either repository, warnings, unresolved links, missing images, changed scene
wording/settings or oversized files. It adds only static Pages hosting files and
a private build record/ZIP. It does not log in, upload, alter source, change DNS
or deploy. Keep the pinned source and renderer revisions with each candidate.

The stage is `site/skip/`, so all fetches and media URLs resolve below `/skip/`.
`_redirects` canonicalises `/skip` and redirects `/` to the book. Root `404.html`
prevents an unknown JSON/asset path becoming a successful SPA response.
`_headers` requires revalidation of reader/content files; content-addressed image
files are immutable. Preview headers/robots discourage indexing; they are not
access control. No Functions, Worker, API, external assets or build service is
needed in the deployed output.

## Validate locally

Use the installed Chrome and a test-only virtual environment; nothing is added
to the public reader's dependencies:

```sh
python3 -m venv /tmp/skip-validation
/tmp/skip-validation/bin/pip install playwright
skip_build='/home/thawkins/Documents/Publication Builds/skip-NEW-CANDIDATE'
npx --yes wrangler@4.155.0 --cwd "$skip_build" pages dev site \
  --port 8788 --ip 0.0.0.0 --persist-to "$skip_build/wrangler-state"
```

In another terminal, from storytelling:

```sh
/tmp/skip-validation/bin/python tools/story-teller/test/skip-publication-reader.py \
  '/home/thawkins/Documents/Publication Builds/skip-NEW-CANDIDATE' \
  http://127.0.0.1:8788
npm test --prefix tools/story-teller
npm run check --prefix tools/story-teller
```

The whole-book sweep uses virtual active time/reduced motion to traverse every
beat and check delivery counts, illustrations, notes and nested navigation.
Real-time checks are separate: chat delivery, paused speed changes, resume,
WebP frame changes and mobile interaction. The report explicitly distinguishes
emulated touch from actual device use. Screenshots and reports stay outside
`site/`. Test again against the actual returned Cloudflare preview URL before
production approval; local Pages emulation is not a live-CDN check.

Try the preview on an actual iPad/phone: read at 0.75× and 0.5×, inspect Canvas,
follow notes/Back/Close, turn pages, refresh and revisit, check the final chapter's
three illustrations and the Christmas animations. Listen if an authored sound
component is added later. Current book content has no type-out/sound component.
Positions/preferences persist per browser and origin; a pages.dev preview and
read.murmurationpress.co.uk do not share local storage. Reopening restores a
scene/beat ready, not elapsed playback time. Updates keep stable identities;
edited beat text uses the reader's existing best-effort position matching.

## Cloudflare preview and account access

Ted completed Wrangler OAuth login on 2026-10-28. Read-only inspection found one
account, no existing Pages projects/Workers/Worker domains, and the
`murmurationpress.co.uk` zone. DNS-record inspection returned 403; public lookup
did not resolve the proposed `read` hostname. No DNS changes were made.
A dedicated Direct Upload Pages project, `murmuration-skip`, was then created
with production branch `main` and no production deployment or custom domain.
The review branch is `skip-review-7c030a1`; it is explicitly distinct from `main`.
Account identifiers/credentials are not copied into the publication or public
records. Do not use an anonymous temporary account.

For future login or checking access on another machine, use the existing account:

In Ted's own terminal:

```sh
npx --yes wrangler@4.155.0 login
npx --yes wrangler@4.155.0 whoami
npx --yes wrangler@4.155.0 pages project list --json
```

Confirm the intended Murmuration Press account, existing Pages project (if any),
its production branch and whether `read.murmurationpress.co.uk` already belongs
to another deployment. Share the account/project names, not API tokens. Once
login is available, these read-only checks can be completed before an upload.
If an existing project serves other content, do not replace it with this small
upload: a deployment is a complete snapshot, not a directory patch.

The dedicated Direct Upload Pages project `murmuration-skip` now exists.
The following is the one-time creation command used after checking the account;
do not rerun it during normal updates. Production branch `main` has no deployment:

```sh
npx --yes wrangler@4.155.0 pages project create murmuration-skip --production-branch main --force
```

Wrangler 4.155.0 initially attempted automatic Pages-to-Workers delegation and
failed without deploying. Its supported direct-Pages creation mode (`--force`
on initial project creation) was used to keep the explicit preview/production
branch workflow. The project now exists; ordinary updates do not need that flag.
Do not recreate it or accidentally migrate it during an update.

Deploy **only to a non-production branch**, after checking the real project name
and production branch. The review branch below must differ from production:

```sh
npx --yes wrangler@4.155.0 pages deploy \
  '/home/thawkins/Documents/Publication Builds/skip-cloudflare-review-20261028/site' \
  --project-name murmuration-skip --branch skip-review-7c030a1 \
  --commit-hash 7c030a14c8911f26d468e1d5de2b714445da9648
```

The completed review deployment is `c548539c-3169-41f5-b9d2-651459c64fe0` at
`https://c548539c.murmuration-skip.pages.dev/skip/`. It is a preview, not a
production deployment. For updates, use the **actual URL returned by Wrangler**,
followed by `/skip/`; the expected shape is
`https://<deployment-id>.<verified-project>.pages.dev/skip/`. Record deployment ID,
account/project, branch, source SHA, renderer SHA and build hashes outside the
public directory. Recheck navigation, refresh, headers, assets and notes over
that HTTPS URL. Keep the existing production branch/custom domains untouched.
A review branch provides a preview without publishing to Ghost or changing DNS.

For read-only byte/header verification of a hosted candidate:

```sh
node tools/story-teller/scripts/verify-skip-preview.cjs \
  '/home/thawkins/Documents/Publication Builds/skip-cloudflare-review-20261028' \
  https://c548539c.murmuration-skip.pages.dev
```

This compares every served publication file with the build hashes, checks real
404s for missing content/private paths, confirms redirects, no-index preview
headers and non-overlapping revalidation/immutable-image cache rules. To repeat
the full browser sweep on the hosted candidate, pass the HTTPS origin to the
browser probe and `cloudflare` as its optional final evidence label.
The initial preview hostname briefly failed TLS while provisioning; regular
certificate-validated requests subsequently worked. No TLS bypass or production
upload was used to make it accessible.

Cloudflare references (checked 2026-10-28): [Direct Upload and preview branches](https://developers.cloudflare.com/pages/get-started/direct-upload/),
[preview deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/),
[static routing/404 handling](https://developers.cloudflare.com/pages/configuration/serving-pages/),
[headers](https://developers.cloudflare.com/pages/configuration/headers/) and
[custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/).

## Only after Ted approves the hosted preview

1. Confirm the exact committed book/reader revisions and approved archive hashes.
   Produce a separate stage with the same command and a final `production`
   argument. This removes only preview no-index metadata; compare every
   `site/skip/` file hash with the reviewed preview before uploading.
2. Upload that approved stage to the verified project's **actual production
   branch**. Do not assume a project or branch name from the examples above.
   Record the prior deployment for rollback; use Pages' deployment rollback if
   a material problem appears. Do not combine this with unrelated site content.
3. Associate `read.murmurationpress.co.uk` in that project's Custom domains UI,
   then follow Cloudflare's generated DNS instructions. Inspect existing DNS
   first; changing or replacing any record requires the stated approval.
   Do not change the Ghost apex/www records. Verify TLS, `/skip/`, revalidation,
   asset loading and the actual-device reading path before sharing the link.
4. Add this link to Ghost as a normal text link or HTML card, publishing only
   after approval:

   ```html
   <a href="https://read.murmurationpress.co.uk/skip/">Read The Curious Adventures of Skip</a>
   ```

   Markdown equivalent:
   `[Read The Curious Adventures of Skip](https://read.murmurationpress.co.uk/skip/)`.

Subsequent updates repeat the committed snapshot/export/preview/approval process.
Do not upload source repositories, private reports, credentials or unrelated files.

## Validation result

All 272 unit tests, syntax checks, both builds and 0.12.1 VSIX packaging pass.
The installed VSIX supporting-note regression passes (mouse hover/focus/Enter,
nested/Back, dismissal, pause, narrow layout, annotation and scene cleanup).
The standalone synthetic regression verifies one-touch activation, keyboard/mouse
mode changes and that the preview cannot cover its link.

Local and live Cloudflare browser runs traverse all 144 actual beats, open all 23
supporting targets (including Canvas), decode all 44 assets, observe four distinct
frames from each of four animated WebP files, restore saved position/preferences,
and exercise real-time chat and 390px/320px emulated touch. There are no browser
errors, failed resource requests or external content requests. The final upload
adds only unchanged software notices to the fully browser-tested deployment; all
prior files are byte-identical. Certificate-validated HTTPS verification compares
all 75 served files with the final build, including those added notices; wrapper
headers/redirects and real 404s are checked separately.

No actual-device or human listening results are claimed. The production hostname,
DNS and Ghost link await approval and remain untested. The full export is about
102 MB because original artwork/animation bytes are preserved. Source fixes and
the 0.12.1 note-activation fix remain review candidates, not a release.
Detailed summary: `test/evidence/skip-publication.json`. Full build inventory,
ZIP hashes, browser/HTTP reports and screenshots stay beside the private build.
