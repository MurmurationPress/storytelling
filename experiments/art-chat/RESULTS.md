# Art first slice: working reader demonstration, contract still a draft

The real EPUB.js reader delivers a late-Art sequence as prose → performed Pip/Skip exchange → prose → performed exchange → prose. Source words/speakers/order are intact. The performed opening replaces only “, then typed” with the arriving Pip message; static treatments retain that clause. This is a functioning adaptation candidate for Ted's review, **not yet an accepted chat treatment or a completed milestone**.

## Scope and versions

Authoritative Art: `tedwarddick/PrimeTrilogy` revision **75b4a92456d459474771364ca35a11211b6ee8bc**, `Books/CONSTRAINT/COLLISION/Art.md`; extract **462–504**, messages **477, 479, 495, 497**. The current source head was rechecked after the build and remained that revision. Read the [adaptation/storyboard](ADAPTATION.md), [provenance](source/provenance.json) and [draft contract](CONTRACT-DRAFT.md).

Linux Zorin OS 18.1 x86_64, Node 24.19.0, Python 3.12, Playwright 1.61.1, **Chromium 149.0.7827.55**, existing **EPUB.js 0.3.93**. Tests render the actual EPUB through the toolkit and call actual reader navigation; location/arrival events are not mocked. Videos are continuous **25fps browser-page recordings in headless Chromium**, not Thorium/native-desktop captures. 1280×800 and 820×1180 are independent desktop/responsive tablet-sized contexts. A separate 1024×600 short-window bounds check also passes. **Actual iPad/Safari, touch and screen-reader usability remain unverified.**

## Temporal browser evidence

| Run | First arrival, delays, early departures and returns | Reopening, second exchange, replay/reveal and completion |
| --- | --- | --- |
| Linux desktop 1280×800 | [reading.webm](evidence/linux-desktop/reading.webm) | [reopening.webm](evidence/linux-desktop/reopening.webm) |
| Responsive tablet 820×1180 | [reading.webm](evidence/tablet-responsive/reading.webm) | [reopening.webm](evidence/tablet-responsive/reopening.webm) |

[Detailed results/traces](evidence/results.json) include snapshots, visible message counts, response-indicator visibility, static-treatment visibility and bounds. Screenshots 01–19 in each run match the test steps. Each reload/document instance has its own clock: correlate source labels/UUIDs and event order, not arithmetic across different page clocks. This is more than a single partial frame; multiple phases and progressively more messages are captured.

| Check | Result |
| --- | --- |
| Prose before/after | Correct source paragraphs; performed opening omits only the typed clause; interpretation “It had waited.” and camera/voice detail stay prose; ending “Blue.” preserved |
| Invisible preload and delayed arrival | Second real toolkit rendition stays inactive for >4.5s, longer than the full 2.9s exchange. Exactly 0 messages, initial 900ms remaining, no tick events. 350ms late registration still exposes blank performance rather than complete transcript |
| Message phases | 0 messages → Pip message + Skip response cue → 2 messages; the cue disappears on arrival. Uninterrupted replay measured 2901ms in each run, using proposed editorial 900/1000/1000ms phases |
| Departure during delay | Stop with remaining delay intact; quick return restores the saved phase before advancing |
| Departure during response cue | Stop with remaining response time intact; >4.5s absence changes no stored progress; later return resumes rather than consuming unseen output |
| Incomplete reopening | Stored second-exchange checkpoint restored exactly: desktop delay `548ms`; tablet delay `498ms`, both with 0 messages |
| Completed return/reopen | Both messages remain visible, no forced repetition; optional Replay works |
| Immediate reveal | Completes/persists the transcript; a separate 2s delayed-registration case confirms local reveal is not undone by initial restoration |
| Rapid navigation/stale signals | Four rapid ordinary turns settle on the correct resource. Wrong instance and old sequence are rejected; timing continues on valid identity. Shared executable tests also reject content/state version mismatch |
| Reduced motion | Initial reduced-motion context and dynamic change show the complete static transcript, explained status, disabled replay and original supporting narration |
| No publication scripts / absent host | Complete readable transcript and original narration. No-script controls hidden; absent-host optional manual playback replaces, rather than duplicates, the transcript |
| Invalid progress | Out-of-range saved message count is rejected; a fresh valid phase is used instead of broken/unreadable progress |
| Long message/bounds | Deliberate non-manuscript DOM stress fixture wraps and scrolls inside the component; reader turns still work with controls focused. No invented stress dialogue is packaged or included in narrative videos |
| Reader navigation | Focused reveal-control ArrowRight turns to following prose during performance; controls stay in bounds at main tested sizes and 1024×600 |

The controlled preloader is test infrastructure, not a claimed toolkit default. The source contains no authored significant delay or unsent message in these exchanges; none is manufactured. “It had waited.” is retained interpretation, not simulated as a new dramatic pause. This source therefore does **not** validate every future authored-silence/typing-cancellation case.

The layout check found and corrected a genuine pagination issue during development: a 100vh flex surface exceeded EPUB.js's padded content box and created a second page. The final surface uses the toolkit content box's 100% height; a single ordinary turn now leaves the component, and the shorter-window test passes. Failed development captures were moved out of the repository; the committed evidence matches the final package below.

## Package and source checks

[Download **CONSTRAINT · Art chat slice v1**](publication/art-chat-v1.epub), SHA-256:

```text
bc95fe97842a225e54c85026fad99003c74d17338788b7b7617a50f592f68cd4
```

- `verify.py`: PASS for pinned chapter SHA-256/Git blob, every selected static prose paragraph, four dialogue lines/speakers/order, sole conditional clause, manifest/spine/local references, embedded settings/code identity and accepted PRIME package preservation.
- EPUBCheck **5.3.0**: **zero errors and warnings**, [log](evidence/epubcheck.txt).
- Rebuilding identical inputs produces the same ZIP bytes/hash. Bundled assets/scripts/settings are local; no service or narration is involved.
- The pinned chapter snapshot intentionally retains upstream trailing spaces (including Markdown hard breaks); it is hash/blob verified rather than whitespace-normalised. New code/docs pass whitespace checks with that source snapshot excluded.
- `contract-examples.cjs`: PASS for the actual shared helper code, legacy PRIME/new Art identities, stale/out-of-order/invalid envelopes, distinct occurrence/version keys and versioned opaque snapshots. Helper checks do not substitute for the temporal tests.

## Accepted PRIME preservation

Every existing artifact under `planetary-epub/dist` and `prime-reader/publication` is compared byte-for-byte to foundation commit `5946536`. The accepted renderer/timing and original image are unchanged. The full existing real-reader PRIME test suite passes through the updated reader at both viewports: invisible preload, sustained prefixes, departure/returns, exact checkpoint reopening, replay/reveal, reduced motion, no script/manual fallback and focused-control navigation. Full replays measured **5346ms / 5349ms**. [Fresh recheck summary](evidence/prime-regression.json) · [fresh desktop replay recording](evidence/prime-regression.webm). Historical evidence is not overwritten.

## What this establishes and leaves open

The existing presentation bridge can serve this short real chat as well as accepted PRIME. Chat's phase/remaining-time snapshot is a concrete shared need; the reader can persist it without owning chat logic. Initial inactive state, content/state identity and interruption/reopening are exercised. The small changes under #4/#7 provide metadata-driven identity/state slots and one explicit trusted package route; they do not complete those issues.

The initial #3 contract remains **draft/open**. The immutable PRIME package still uses its supported legacy snapshot profile; migration to the new profile and reusable configurable PRIME extraction remain #5. Significant authored silence, unsent typing, broad capability negotiation and state migration need other evidence, not invented dialogue. #6 remains open for Ted's adaptation/pacing review and any resulting refinements. #4 still needs actual iPad/Safari and broader reader maintenance; #7 still needs final reusable two-component packaging/fallback coverage.

This is the existing trusted-publication browser shell, not a safe arbitrary-EPUB loader. Its upstream scripting/XML dependency limitations remain documented in the parent experiment; no claim of remediation or ordinary-Thorium automatic encounter is made. localStorage is origin/profile-specific and checkpoint-based. No drawing engine, live chatbot, editor, catalogue, account/payment, public hosting or manuscript write was introduced.
