---
type: publication-preparation
status: cloudflare-preview-production-approval-pending
created: 2026-10-28
---

# Skip Web Publication

**Ted's direction:** prepare The Curious Adventures of Skip using the existing
standalone Story Teller export, one self-contained book at `/skip/`. The aim is
to learn whether readers enjoy the presentation before investing in a shared
architecture. Ghost remains the main website with a link to the reader. No
shared multi-book renderer, accounts, payments or new platform is authorised.

**Review preview:** https://cfc10c44.murmuration-skip.pages.dev/skip/

**Proposed production address:** `https://read.murmurationpress.co.uk/skip/`.
Ted requested Cloudflare static hosting subject to inspecting the existing
account/deployment arrangements; that inspection and the review deployment are
now complete. Ted authorises a preview for review; production
upload, DNS changes and Ghost publication remain subject to his later approval.

**Book source:** committed Stories-Told main `bf92b8e`, plus four target-only
wikilink repairs at `7c030a1` in [source review PR #1](https://github.com/tedwarddick/Stories-Told/pull/1).
All displayed words, dialogue, timing, settings, order, matter and artwork are
preserved. These repairs resolve the PRIME novels, Miranda Stubbs and Jo Ellis
to their existing notes. Canvas resolves; the final chapter's three illustrations
are included. Neither source review nor production publication is merged by this
preparation task.

**Prepared export:** 14 scenes / 144 beats, both matter pages, 23 supporting
notes, 44 unique image assets, zero final export warnings. The reader runtime is
0.12.2 review candidate (`6239345`), based on accepted 0.12.0. Animated WebP bytes are retained. The current book
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
