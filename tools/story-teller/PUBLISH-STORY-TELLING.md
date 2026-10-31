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
| Live production URL | `https://murmuration-story-telling.pages.dev/story-telling/` |

The dedicated Pages project is live following Ted’s explicit approval on 31 October
2026. Future updates must stop at preview until Ted approves their exact immutable URL.
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

## Approved retained candidate — 31 October 2026 (pre-promotion evidence)

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

The command above was run after Ted’s approval; see the production record below.
Keep the pinned worktree, artifact and receipts. Future source edits require a new
preview/build rather than changing this one.


## Production promotion — 31 October 2026

Ted approved the exact preview: “Proceed, looks good.” PR #32 was squash-merged
at `8375f79fc027aaeee40ded6e5ae93a7243eb92d7`; its tree matches the reviewed tree.
The pinned 0.14.3 publisher promoted the retained artifact **without rebuilding**.
The original `site/`, source and renderer pins and preview receipt remain intact.
Only production staging indexing headers/robots differ, as the publisher specifies.

- Live: https://murmuration-story-telling.pages.dev/story-telling/
- Production deployment: `613f0696-0d0a-45c9-922b-688c32c22ad9`.
- Immutable production: https://613f0696.murmuration-story-telling.pages.dev/story-telling/
- Approved artifact inventory digest remains
  `cb76bb2b3a66f00643dd6ab96e186b0cd48d6a8251f9b6c733fbf328f59792fa`.
- Private receipt: `production-613f0696-0d0a-45c9-922b-688c32c22ad9.json`
  beside the retained build, with full public-file hashes and `previousProduction: null`.
- `production-delivery-verification.json` and `production-browser.log` stay beside
  that build. Approved-preview browser reports/screenshots were preserved separately.

All 22 served payload hashes match at **each** production origin; the 404 body is
also compared. Live indexing headers/robots, root redirect and missing/private
paths pass. Cloudflare adds noindex to the immutable deployment URL independently;
the canonical production hostname is indexable. Full guide browser regression
passes on live HTTPS: five documents, 17 beats, all notes/links, chats/type-outs,
images, playback/replay/pause, restored preferences, rapid navigation, light/dark,
1024/768/390/320px and keyboard diagram overflow. Actual computed SVG styles,
connectors, «abstract», hand-drawn paths and absence of source controls pass.
Chrome 156 on Linux; no real iPad/iPhone/Safari or new human audio/screen-reader
coverage is claimed.

Skip remains on `0195b3ac-865d-45f2-ac5c-f7d46f2dc564`, with identical domains
and all 77 checked served hashes. No manuscripts, Ghost, DNS, router or Skip
production changes were made. The existing website-link example now points to
the live guide. Future updates follow the prepare/preview/approval/publish steps
above, retaining their own artifact rather than rebuilding at promotion time.

## Guide-only source download

A separate ZIP was prepared from the pinned Stories-Told source, outside the
approved reader artifact. It contains the guide project’s 13 committed files plus
README: Markdown, three supporting notes, required metadata, manifest and PNG.
Original content bytes are retained. Only recursive manifest `provenance` fields
are removed to exclude machine-specific paths. README states source commit,
Story Teller 0.14.3+ compatibility, opening instructions and existing copyright
boundaries; no blanket MIT licence is applied to fiction/artwork.

- Filename: `story-telling-guide-source-e199b1c-story-teller-0.14.3.zip`.
- SHA-256: `317855880a1ede8670f40e3840ad89f091b2d87612bb7a9bb38a071df19ba237`.
- Private retention directory:
  `/home/thawkins/Documents/story-telling-source-e199b1c-20261031/`.
- Extraction/CRC, single project/path boundaries, byte comparison, privacy scan
  and the pinned renderer’s project preparation pass: five pages, three scenes,
  three supporting notes, one asset and zero warnings.
- The extracted project also opens in actual VS Code with the installed 0.14.3
  VSIX in an isolated profile. Front/back matter and all three scene selections
  are exercised; both diagrams render with passing computed-style checks.
  Extracted file bytes still match the ZIP after opening. Native evidence and
  the temporary probe are retained privately beside the ZIP.

**Public source download — blocker resolved:** Ted authorised the existing public
`MurmurationPress/story-teller-examples` repository. Its public visibility and
existing README were inspected before publishing; no visibility changes were made.

- [Guide source release](https://github.com/MurmurationPress/story-teller-examples/releases/tag/story-telling-guide-source-e199b1c).
- [Download ZIP](https://github.com/MurmurationPress/story-teller-examples/releases/download/story-telling-guide-source-e199b1c/story-telling-guide-source-e199b1c-story-teller-0.14.3.zip).
- [Checksum file](https://github.com/MurmurationPress/story-teller-examples/releases/download/story-telling-guide-source-e199b1c/story-telling-guide-source-e199b1c-story-teller-0.14.3.zip.sha256).

The public repository README links the actual release/assets and explains opening
the extracted folder in VS Code with Story Teller 0.14.3+. Existing rights remain
explicit: no software MIT licence is applied to fiction/artwork. Only the verified
ZIP and checksum were uploaded as release assets. Anonymous HTTPS downloads of
both assets pass checksum verification against the retained original; ZIP CRC and
entry/byte comparisons also pass. Release metadata and download evidence remain
private beside the retained source package. The approved live reader is unchanged.

For future source releases, pin a committed guide source, package only that
project, remove machine provenance, retain copyright terms and verify extraction
and actual opening. Use a distinct source-based release tag/asset name; never
overwrite a reviewed ZIP. Upload ZIP/checksum to this public examples repository,
download without credentials, verify bytes/checksum, then update its README and
these publication records. Reader publication remains the separate approval and
retained-artifact promotion workflow above.
