---
type: implementation-review
status: accepted-published
created: 2026-10-30
---

# Reader Analytics

**Ted's request:** implement optional Google Analytics in the reusable Story Teller
export/runtime, prepare The Curious Adventures of Skip using the established
workflow, and create a PR. Merging and production deployment remain pending review.
Ted clarified that “Curiosity” refers to Skip, not another publication.

**Observed website configuration:** the main website and its Ghost origin use GA4
`G-HMESC2B6CC` and CookieScript. A fresh-browser check showed its consent cookie
is host-only and unavailable to the reader subdomain. GA cookies visible on that
subdomain do not establish consent. The reader therefore needs its own consent
choice; website consent is not assumed to carry over.

**Implemented review candidate:** reusable opt-in export configuration; reader-local
Accept/Decline/settings; no Google tag or pings for unset/declined consent;
withdrawal terminates the isolated tag frame. Existing position storage is retained.
The Introduction and matter are excluded from the 13-story analytics mapping.
Stable story UUIDs/publication ID identify observations without sending wording,
notes, source paths or personal fields. Reading starts, unique beat-display coverage,
completion and explicit reader actions have separate meanings. All completion
measurements mean display exposure, including autoplay, never proof of reading.

The [event contract and GA4 guide](../tools/story-teller/ANALYTICS.md) documents
consent boundaries, parameters, reporting and measurement limitations. The
[validation record](../tools/story-teller/RESULTS.md) identifies the exact source,
renderer and immutable preview. Automated Chrome results do not establish actual
Safari/device, screen-reader, human listening or GA dashboard ingestion results.
No manuscript changes, general platform backlog, production upload, merge or
Ghost edit is included in this implementation task.

## Compact privacy controls amendment

Ted requests removal of the persistent full-width consent strip in PR #27. The
0.13.1 candidate uses a small dark circular button at bottom left, following the
main site's CookieScript badge treatment with a local icon. A compact nonmodal
panel opens on an unset visit; either choice closes it. The button reopens it
with the current effective choice inside. Close, Escape and outside interaction
can dismiss without choosing; unset consent stays disabled. Keyboard focus,
touch, short viewports and safe-area positioning are covered by browser checks.
No analytics menu item, new position store or consent-policy change is introduced.

Current immutable review preview:
https://7121a489.murmuration-skip.pages.dev/skip/

Runtime `c627f9475b5bbe7dd9456dcbcfcc0eeaf4651674`, source still
`b002eb1365c46fdb3b0b4bdffe831d850a53415f`. All 62 content/artwork/publication
payload files match the preceding analytics export byte for byte. Supporting
content and its reachable information are unchanged; no new spoiler-safety
claim or editorial alteration is made. Merge/production remain pending review.


## Accepted integration and production publication

Ted accepts the revised bottom-left privacy control at the 7121a489 preview and
reports seeing his browsing activity in GA4. This is **user-reported visual
acceptance and basic ingestion confirmation**, not independent verification of
individual custom events or reporting definitions. No new device/browser versions,
screen-reader, human audio or exhaustive actual-device coverage are inferred.

PR #27 head `283ccbbd7a02f9c8b0aace7dddd9bebbdaa63f3a` was reviewed unchanged
and squash-merged with an exact expected-head guard at
`05a1d2c1c7ae104db1779f3142d4a91967cd379e`. Reviewed and merged trees both equal
`bb3330ebcba7e3feb41807b295ef86dc1887fb9a`. No material defect required changing
the accepted runtime. 287 tests, syntax/build/package and retained-preview checks
pass; GitHub reports no status/check entries on the reviewed head.

The accepted retained artifact was promoted, without rebuild or source changes,
to production `0195b3ac-865d-45f2-ac5c-f7d46f2dc564` at
https://read.murmurationpress.co.uk/skip/ . It retains runtime c627f94 (0.13.1)
and source b002eb1. All 77 reader payload files match the accepted preview; only
root indexing headers and robots change for production. Previous production
`bcc3d61e-81f1-4a33-a246-e17543e3d257` and its retained build remain the rollback
target. See the publication/validation records for receipts and final-origin checks.
Main website, Ghost, DNS and analytics account configuration are unchanged.
