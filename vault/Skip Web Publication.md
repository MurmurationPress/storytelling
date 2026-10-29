---
type: publication-preparation
status: published-verified
created: 2026-10-28
---

# Skip Web Publication

**Ted's direction:** prepare The Curious Adventures of Skip using the existing
standalone Story Teller export, one self-contained book at `/skip/`. The aim is
to learn whether readers enjoy the presentation before investing in a shared
architecture. Ghost remains the main website with a link to the reader. No
shared multi-book renderer, accounts, payments or new platform is authorised.

**Review preview:** https://f519ec23.murmuration-skip.pages.dev/skip/ (0.12.4; supersedes the earlier previews below)

**Live production address:** `https://read.murmurationpress.co.uk/skip/`.
Ted requested Cloudflare static hosting subject to inspecting the existing
account/deployment arrangements; that inspection and the review deployment are
now complete. Ted now accepts this preview on his actual iPad and iPhone and authorises scoped
integration, production upload and reader-subdomain configuration. Ghost editing
and publication remain his responsibility. Earlier pending-approval statements
below are historical and superseded by this acceptance.

**Book source:** committed Stories-Told main `bf92b8e`, plus four target-only
wikilink repairs at `7c030a1` in [source review PR #1](https://github.com/tedwarddick/Stories-Told/pull/1).
All displayed words, dialogue, timing, settings, order, matter and artwork are
preserved. These repairs resolve the PRIME novels, Miranda Stubbs and Jo Ellis
to their existing notes. Canvas resolves; the final chapter's three illustrations
are included. Neither source review nor production publication is merged by this
preparation task.

**Prepared export:** 14 scenes / 144 beats, both matter pages, 23 supporting
notes, 44 unique image assets, zero final export warnings. The reader runtime is
0.12.4 review candidate (`2f2e5fb`), based on accepted 0.12.0. Animated WebP bytes are retained. The current book
has no authored type-out blocks; the reader retains that capability and sound
controls without adding content. Timing/prose settings are resolved by the
existing exporter; changing speed remains a reader preference (1× default).

**Hosting boundary:** Ted authorised the CLI login after initial local preparation.
Read-only account inspection found no existing Pages/Workers deployments and
confirmed the Murmuration Press zone. A dedicated `murmuration-skip` Pages project
uses production branch `main` and review branch `skip-review-7c030a1`. The DNS API
returned 403; DNS is untouched. No production deployment or Ghost publication is
authorised by preview preparation. The CLI's automatic Workers delegation failed
without deploying; direct Pages creation preserves separate preview branches.

The [repeatable preparation, validation, access and publication procedure](../tools/story-teller/PUBLISH-SKIP.md)
keeps private snapshots/reports beside, never inside, the public upload. Book text
and artwork are not committed to the public tooling repository. Automated browser
checks remain distinct from actual-device or human listening observations. See
that guide and the publication validation summary for results and limitations.

## Reported scroll-follow and supporting-preview problems

Ted clarified that manual scrolling works while automatic following fails. The
normal front-matter → introduction → story route reproduced an inactive follower
after a document turn. The 0.12.2 review build reactivates it when the source
snapshot commits, preserves rereading suspension/Follow story and keeps Previous
and static matter at the top. The black hover popout used a dark fallback with
dark light-theme text; it now uses the reader's current palette. The reading
panel's bounds/independent scrolling are checked in both themes.

Six local/live exported-book cases pass at desktop/390px/320px in light/dark,
including actual wheel/emulated touch points, new content while rereading and
Follow resumption. The full 144-beat live sweep and 75-file HTTPS comparison pass
again. Actual device/Safari and human listening remain unverified. An optional
VS Code hide/return pixel drift also reproduces on the previous baseline and is
recorded as a separate native-test limitation. See the procedure/results.
The current review URL above supersedes the older immutable preview URLs;
production/DNS/Ghost remain untouched pending approval.

## Header and author update workflow (29 October)

Ted requested the actual scene title below Contents, compact beat/state/authored
prose-pacing context and a separate reader speed control. The web-only compact
header suppresses a redundant matching opening H1 in presentation; manuscript,
beat boundaries and timing remain unchanged. Contents remains a toggle. Ted's
shorter-beats observation is editorial feedback, not permission to split text.
Explicit theme selection and further visual branding are deferred to keep this
publication task small; the current system theme and reading contrast remain.

The [author CLI procedure](../tools/story-teller/AUTHOR-PUBLISHING.md) pins source
and renderer revisions, validates an isolated snapshot and uploads a preview.
Publishing the reviewed retained artifact and rollback are distinct explicit
commands. Production, DNS and Ghost remain unapproved and untouched. Saved
position limitations, including order-dependent publication identity, are stated.

## Compact standalone controls review (0.12.4)

Ted requests recovery of reading space, especially iPad portrait. The current
preview uses five SVG toolbar controls and a text-labelled More disclosure,
keeping actual scene titles, quieter beat/status/authored-pacing context and a
separate speed setting. Reveal beat completes the current beat without advancing;
native preview behavior stays separate. No auto-hiding, new gestures, manuscript
edits or branding/theme work is introduced.

Same actual book/scene/ready-state CSS viewport: 768×1024 reading starts at
252.86 → 161.33 px, recovering 91.53 px (36.20% smaller header/control area).
1024×768 recovers 43.89 px (21.39%). Measurements exclude browser chrome.
Fourteen synthetic control cases, ten actual-book follow/note cases, the complete
144-beat export, live file/header/space checks and 278 unit tests pass. These are
Linux Chrome/emulated touch observations, not new actual-iPad/Safari acceptance.
See extension RESULTS and `compact-controls-0.12.4.json` for evidence/limits.
The current immutable preview is linked above; production/DNS/Ghost remain
unchanged and the PR remains unmerged for Ted's iPad review.

## Accepted preview and final integration

Ted accepts the compact controls and reading experience at the exact immutable
preview above, reporting that it works well on his actual iPad and iPhone. No
device/browser versions, exhaustive coverage or human listening are inferred.
Production/subdomain configuration is now authorised; Ghost remains untouched.

Source PR #1 gained later editorial commit `c841b2e`, outside this accepted build.
Its branch and content remain intact. [Source PR #2](https://github.com/tedwarddick/Stories-Told/pull/2)
contains only accepted repairs at `7c030a1` and is the integration dependency for
renderer PR #23. Review confirms all 92 snapshot files match that accepted source
revision and both repaired files have unchanged displayed words. No manuscript
or asset changes are introduced by publication.

The accepted runtime is `2f2e5fb`, with later renderer commits containing records
only. All 75 served preview files match the retained inventory. Current checks:
278 unit tests, syntax/both builds and packaging pass. There are no reported
GitHub status checks/check runs on the reviewed renderer head; a pending combined
status with zero entries is not a running CI check. Cloudflare Pages access works;
DNS API inspection returns 403 and public `read` lookups return NXDOMAIN. Complete
independent integration/publication before requesting any needed dashboard step.

Source PR #2 is merged at `fe8ebbb4acae2e35f16fe7643f75dc91a2bd9cef`; its full tree `a237266cf621f695cbcb4f916d5f7f1d6a690025` equals
the accepted source tree, and `7c030a1` remains an ancestor. Original PR #1 and
editorial head `c841b2e` remain open/untouched. Fresh synthetic control checks pass
all 14 responsive cases and the four-phase/eight-action matrix. No renderer
payload defect was found; no new reader payload or source export is required.

## Production promotion and domain setup

Source PR #2 merged first at `fe8ebbb4acae2e35f16fe7643f75dc91a2bd9cef`;
renderer PR #23 squash-merged at `437b70eac127fe6304dcb92d55c961f1a7a591c2`,
reviewed head `489c262`. Both full merged trees match the reviewed trees. Later
source editorial work (PR #1, now observed at `ec23a04`) is preserved/unmerged.

The documented publish command promoted the retained accepted f519ec23 build
without re-exporting. Production deployment `42ffb0fd-152c-4e9b-9651-c388519fc002`
serves https://murmuration-skip.pages.dev/skip/ . Its source is `7c030a1` and
renderer `2f2e5fb`, mapped to the merged trees above. All 74 reader files remain
byte-identical; only root indexing headers and robots metadata differ. Ghost and
licence terms are unchanged.

Fresh checks on merged main: 278 tests, syntax, fresh-lockfile build/package and
VSIX reader-byte equality pass; no GitHub status/check runs are configured. On
production Pages HTTPS, 75 payload hashes/cache/indexing/redirect/privacy checks,
all 144 beats, 23 notes, 44 assets, four animations, saved position/preferences
and ten light/dark follow/note cases pass. Production observations are automated
Chrome/emulated touch, distinct from Ted's actual-device preview acceptance.

Pages custom-domain association for `read.murmurationpress.co.uk` is created,
but validation says “CNAME record not set” and public DNS is NXDOMAIN. OAuth DNS
API access returns 403; no DNS writes were attempted. The requested manual step
is a CNAME `read` → `murmuration-skip.pages.dev`, proxy on, TTL Auto, after
inspecting for any existing record. Preserve all other DNS/Ghost/email records.
Custom-hostname HTTPS and persistence await DNS; Pages production is usable.

Retain the original build/production receipt for rollback without re-export. This
is the first production deployment, so there is no previous live book to restore;
this accepted deployment becomes the rollback target for subsequent updates.
See `test/evidence/skip-production.json` and AUTHOR-PUBLISHING for exact commands.
Preview and final-domain storage are different origins: existing preview positions
do not transfer automatically. Keep document IDs/order stable for later updates.

## Final custom-domain verification

`https://read.murmurationpress.co.uk/skip/` now resolves with valid HTTPS. Pages
reports the domain, verification and HTTP validation active on production
`42ffb0fd-152c-4e9b-9651-c388519fc002`. HTTP redirects to HTTPS; canonical slash
redirects and private/missing-file 404s pass. Six unrelated root/www/mail public
DNS checks remain unchanged. Ghost remains untouched.

All 75 served payload files match the retained production build, including all
74 accepted reader files. On the final origin, fresh automated Chrome checks
pass all 144 beats, 44 assets, 23 supporting targets, four animations, refresh/
reopening and saved position/preferences. Ten light/dark following/note cases
pass, including tablet portrait/landscape and narrow emulated touch. These do
not extend Ted's actual-device acceptance beyond the preview he reported.

The initial custom-domain check found one configuration exception: the custom domain serves reader.js,
reader.css and web.css with `Cache-Control: max-age=14400`, while Pages serves
`no-cache`. HTML/publication JSON correctly revalidate. Current reading works,
but repeat visitors can retain old renderer files for four hours after an update.
The cache/settings/rules API returns 403, so no global or reader cache settings
were changed by the agent. The requested dashboard fix is a new reader-only
Cache Rule matching the read hostname and /skip/ path, Browser TTL “Respect
origin”, placed after other matching rules. Preserve Ghost/global settings.
Ted then reported the rule deployed. The subsequent strict verifier passes on
the final hostname: mutable JS/CSS/HTML/JSON return no-cache and image assets
retain immutable caching. All 75 payload hashes, route/privacy/indexing/TLS checks
pass. No reader payload or source change was made. The final URL is verified and
ready for Ted to link from Ghost; Ghost itself remains untouched.
