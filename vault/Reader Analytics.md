---
type: implementation-review
status: pending-review
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
