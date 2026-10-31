---
type: publication-preparation
status: published
created: 2026-10-31
---

# Story Telling Guide Publication

**Ted's request:** prepare the examples/authoring guide from Stories-Told's
`Story Teller - Story Telling`, using accepted main through the Mermaid fixes.
Stop at an immutable review preview. Preserve manuscripts/local work and do not
publish to production, edit Ghost or alter Skip's live reader.

**Implemented preparation, not acceptance:** a dedicated `murmuration-story-telling`
Pages project, with `/story-telling/`, production branch `main` and review branch
`story-telling-review`. The existing one-book publisher already supports explicit
project/slug targets; no renderer, router or hosting-platform change was needed.
The [guide procedure](../tools/story-teller/PUBLISH-STORY-TELLING.md) records the
separate target and repeatable prepare/review/promotion commands.

Review: https://e4a234d8.murmuration-story-telling.pages.dev/story-telling/ .
Source is committed Stories-Told main `e199b1c7bd177fec75690d7e0f119fc8766389b4`;
renderer is committed storytelling main `6bbcd23c6d4358040430f640fe6c1a3e07dcfae6`
(runtime 0.14.3). The retained artifact can be promoted without rebuilding after
explicit approval. Snapshots, receipts, screenshots and reports stay private;
only the exported public site was uploaded.

**Validation:** full 3-scene/17-beat guide, both matter pages, three supporting
notes and all recursive links, one PNG at both authored placements, 13 chat
messages, three type-outs, pacing and both Mermaid examples pass local/HTTPS
review. Diagram styles, connectors, abstract annotation and hand-drawn paths are
readable; no source/fallback disclosure is introduced. All 22 served payload
hashes match, with valid preview HTTPS, noindex/cache/redirect/private-path checks.
Real-time playback/pause/panel semantics and browser viewports 1024/768/390/320px
are checked; no real iPad/iPhone/Safari, human audio or screen-reader claim.
The source's minimum-version wording remains unchanged; runtime 0.14.3 satisfies
its “0.14.2 or later” statement.

**Editorial scope:** notes first become accessible in Overview. Scene, Beat and
Component form a cyclic graph of general authoring definitions; titles, hover
excerpts, full text and onward links contain no example-story outcomes. Early
explanation of component forms is intentional reference material. No automatic
spoiler filtering is claimed. Source wording and assets remain unchanged.

**Address:** proposed production is
`https://murmuration-story-telling.pages.dev/story-telling/`, ready for a normal
link from the main website after approval/promotion. No DNS step is required.
Fresh inspection confirms `read.murmurationpress.co.uk` belongs to Skip's Pages
project and the zone has no Worker routes. Sharing that hostname by path would
require separately approved routing infrastructure; no reassignment/router was
introduced. A new branded guide hostname is an optional later decision.

Skip's production identity/domain and all 77 checked served payloads remain
unchanged. The guide has no production deployment. Ted's review, production
promotion and any Ghost/main-website link editing remain pending.


## Approved promotion — 31 October 2026

**Ted’s acceptance:** “Proceed, looks good.” PR #32 is squash-merged at
`8375f79fc027aaeee40ded6e5ae93a7243eb92d7`, with the same reviewed tree.
The retained preview was promoted without rebuilding to production deployment
`613f0696-0d0a-45c9-922b-688c32c22ad9`.

Live: https://murmuration-story-telling.pages.dev/story-telling/ .
The preceding preparation-only statements record the earlier state; production
is now approved and complete. All 22 served payload hashes match at both live
and immutable production origins. Full browser checks pass in both themes and
narrow layouts. No actual Apple-device testing is claimed. Receipt, production
inventory and detailed browser evidence remain private beside the retained build.
Skip’s deployment, domains and all 77 checked payload hashes are unchanged.
No Ghost, DNS, manuscript or routing change was made.

A portable guide-only source ZIP is retained separately, with manifest machine
provenance removed and all committed Markdown/PNG bytes preserved. README keeps
copyright boundaries explicit; software MIT does not automatically license fiction
or artwork. Extracted project validation and actual VS Code opening with installed 0.14.3 pass,
including both rendered diagrams and computed-style checks. Both relevant GitHub repositories
are private; no suitable existing public Story Teller release destination was
found. Public source download is pending that specific destination, not reader
approval. See the procedure for ZIP checksum and private retention location.
