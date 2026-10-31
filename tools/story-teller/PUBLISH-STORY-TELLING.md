# Story Telling guide publication

This target is the **examples and authoring guide** from
`tedwarddick/Stories-Told/Story Teller - Story Telling`, not The Curious Adventures
of Skip. It uses one self-contained book per Pages project and the existing
[author publishing workflow](AUTHOR-PUBLISHING.md).

| Item | Guide target |
| --- | --- |
| Pages project | `murmuration-story-telling` |
| Production branch | `main` |
| Review branch | `story-telling-review` |
| Export slug | `story-telling` |
| Target configuration | `scripts/story-telling-target.json` |
| Proposed production URL | `https://murmuration-story-telling.pages.dev/story-telling/` |

The dedicated Pages project has been created. **Stop at preview until Ted approves
its exact immutable URL.** No guide production has been deployed by preparation.
Skip's project, domain and live reader must remain untouched. Never use
`skip-target.json` for this guide or upload a guide-only site to `murmuration-skip`.

## Prepare a future update

Save and commit the guide project in Stories-Told. Fetch both repositories and
choose explicit full committed source and renderer revisions. Use accepted current
main for the renderer (0.14.3 or later, including the Mermaid fixes through #31).
Preserve other uncommitted work: use a detached renderer worktree if necessary;
uncommitted source edits are never included by Git archive.

In the pinned renderer checkout's `tools/story-teller`, run `npm ci`, then:

```bash
node scripts/publication.cjs prepare \
  --project '/path/to/Stories-Told/Story Teller - Story Telling' \
  --source SOURCE_COMMIT \
  --renderer RENDERER_COMMIT \
  --target '/path/to/storytelling/tools/story-teller/scripts/story-telling-target.json' \
  --build '/path/to/private-builds/story-telling-YYYYMMDD'
```

The target JSON may be read from the publishing-configuration checkout while the
renderer remains pinned in its clean main worktree. The existing publisher already
accepts arbitrary explicit project paths and slugs; the legacy Skip-named helper
and verifier need no runtime changes for this target. No multi-book hosting or
shared renderer service is introduced.

Only `BUILD/site/` is deployable. Keep `snapshot/`, `review-plan.json`, receipts,
reports, screenshots, ZIP and any audit records beside it, outside the upload.
Inspect `build-report.json` and require zero warnings/problems, correct title,
source/renderer pins and expected guide document IDs/order. This target contains
front matter, Overview, Getting Started, Example and back matter, with three
supporting notes and one content-addressed PNG. The current guide has 17 beats,
13 authored messages, three type-outs and two live Mermaid examples; future edits
may change these counts and need their own review.

Review the whole export over local HTTP, including explicit delays, book prose
pacing, chats, formatted/literal type-out, all images, both diagrams, ordinary code
samples, front/back matter and every supporting link. Inspect note previews/full
panels and cyclic onward paths at first access per the Supporting Content rule.
Check light/dark, desktop and narrow layouts, actual computed Mermaid styles,
connectors, class annotations, hand-drawn paths and simplified diagram presentation.
Browser viewport/touch emulation is not real iPad/iPhone/Safari testing.

Then, using the same pinned publisher:

```bash
node scripts/publication.cjs preview --build '/path/to/private-builds/story-telling-YYYYMMDD'
node scripts/verify-skip-preview.cjs \
  '/path/to/private-builds/story-telling-YYYYMMDD' 'IMMUTABLE_PREVIEW_ORIGIN'
```

The verifier reads the slug from the build report despite its historic filename.
It compares served hashes, HTTPS, cache/noindex policies, private-path 404s and
canonical redirects. Recheck playback and visuals on that immutable HTTPS URL.
Generate a private validation plan and run the guide browser checks from this
publishing configuration checkout (Playwright/Chrome are test tools, not shipped
reader dependencies):

```bash
node test/story-telling-review-plan.cjs \
  '/path/to/private-builds/story-telling-YYYYMMDD' \
  '/path/to/pinned-renderer/tools/story-teller'
python test/story-telling-publication.py '/path/to/private-builds/story-telling-YYYYMMDD'
python test/story-telling-publication.py \
  '/path/to/private-builds/story-telling-YYYYMMDD' 'IMMUTABLE_PREVIEW_ORIGIN'
```

The plan helper verifies its parser's renderer commit matches the build report.
The browser script loads the retained public site and checks actual delivery,
wording, source notes and diagram styles. Update expected guide-specific counts and worked-example indices
when the committed book changes; do not reuse stale plans. Do not edit an already reviewed `site/`.

## Promotion after explicit approval

Keep the preview receipt and complete artifact. After Ted approves that exact
preview, the following is a separate action, **not part of preparation**:

```bash
node scripts/publication.cjs publish \
  --build '/path/to/private-builds/story-telling-YYYYMMDD' \
  --reviewed PREVIEW_DEPLOYMENT_ID
```

It checks the receipt/target, local and hosted hashes and expected current guide
production, then copies the retained artifact without rebuilding. Only indexing
headers/robots change. It deploys to `murmuration-story-telling`, not Skip. Keep
production/preview receipts and prior guide artifacts for guarded rollback using
the shared author procedure. This project's first approved promotion will have no
previous guide production; rollback is not tested against a live deployment.

## Website link and optional domain

The proposed production Pages URL needs **no DNS or custom-domain step**. Once
approved and promoted, Ted can add a link on the Murmuration Press website:

```html
<a href="https://murmuration-story-telling.pages.dev/story-telling/">Read the Story Telling guide</a>
```

No Ghost post or website page is edited by these commands. The production URL
will not serve the guide until promotion; share the immutable preview for review.

Fresh account inspection found `read.murmurationpress.co.uk` associated with
`murmuration-skip` and no zone Worker routes. DNS-record API access returns 403.
A hostname cannot route different paths to separate Pages projects using CNAMEs
alone. Serving this guide at `read.murmurationpress.co.uk/story-telling/` while
keeping Skip would require an explicitly approved path router (for example a
Worker) or another hosting change. **No such infrastructure, reassignment or Skip
deployment is performed here.**

If a separate branded guide hostname is later wanted, first associate that new
hostname with `murmuration-story-telling` in Pages Custom domains, then add its
CNAME to `murmuration-story-telling.pages.dev` in the zone dashboard. For example,
`story-telling` would use `https://story-telling.murmurationpress.co.uk/story-telling/`.
That optional operation needs separate authorisation and subsequent TLS/cache
verification. Preserve `read`, root/www, Ghost, email and existing cache rules.
Reader position/preferences are scoped to origin/publication ID; preview, Pages
production and any future custom hostname do not automatically share them.

## Current review candidate — 31 October 2026

- Review: https://e4a234d8.murmuration-story-telling.pages.dev/story-telling/
- Source: `e199b1c7bd177fec75690d7e0f119fc8766389b4` (Stories-Told main).
- Renderer: `6bbcd23c6d4358040430f640fe6c1a3e07dcfae6` (storytelling main,
  accepted PR #31, runtime 0.14.3).
- Dedicated target: `murmuration-story-telling`, preview branch
  `story-telling-review`, production branch `main`, slug `story-telling`.
- Preview deployment: `e4a234d8-aa08-4030-928f-e14999a4b20c`.
- Retained private build:
  `/home/thawkins/Documents/story-telling-guide-review-e199b1c-0.14.3-20261031/`.
- Artifact inventory digest:
  `cb76bb2b3a66f00643dd6ab96e186b0cd48d6a8251f9b6c733fbf328f59792fa`.

Zero preparation warnings/problems. All 17 beats, 13 authored messages, three
type-outs, both image placements, the PNG, all three notes and both diagrams pass
local HTTP and immutable HTTPS review. All 22 served payload hashes match the
25-file retained public site (the three remaining files are Pages routing/header
configuration and the independently exercised 404 document). HTTPS, cache,
noindex, redirects and missing/private paths pass. Screenshots and detailed
reports remain private beside the build. Source wording, timing and assets are
unchanged; public output contains no author paths/import provenance/private files.

Checks include real-time pause/resume/replay and supporting-panel pause policy,
virtual-time complete delivery in both themes, source-matched dialogue/type-out,
front/back matter, actual scene turns and Back Matter Previous, restored ready
position/preferences, desktop/1024/768/390/320px layouts, emulated touch and
keyboard overflow. Mermaid labels/fills/strokes/connectors, «abstract» and
roughjs hand-drawn paths are checked under the real exported-reader CSP. No
page errors, unresolved resources or external requests were observed. These are
Chrome 156/Linux browser checks; no new actual iPad/iPhone/Safari, human audio or
screen-reader testing is claimed. The pinned main renderer also passes 301 unit
tests, syntax, both builds and VSIX packaging in an isolated worktree.

The entire three-note cyclic link graph is reviewed from its earliest Overview
entry, including hover/full titles and all onward links. It deliberately explains
generic authoring categories before the examples without disclosing their story
outcomes. This is an editorial review, not an automatic spoiler filter.

Fresh Cloudflare inspection and a 77-file live comparison confirm Skip's
production `0195b3ac-865d-45f2-ac5c-f7d46f2dc564`, domain association and served bytes
are unchanged. The guide has **no production deployment**. Nothing was promoted,
no domain/DNS/routing change was made and Ghost remains untouched.

After Ted approves this exact preview, its separate promotion command is:

```bash
node /path/to/pinned-renderer/tools/story-teller/scripts/publication.cjs publish \
  --build '/home/thawkins/Documents/story-telling-guide-review-e199b1c-0.14.3-20261031' \
  --reviewed e4a234d8-aa08-4030-928f-e14999a4b20c
```

This command has **not** been run. Keep the pinned worktree, artifact and receipt;
future source edits require a new preview/build rather than changing this one.
