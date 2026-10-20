# Result: automatic encounter works in the explicit EPUB.js host integration

**The real EPUB moves from prose through a toolkit page turn into automatically accumulating PRIME output, then onward to prose.** A separate real-toolkit invisible rendition remains at zero characters for more than seven seconds. This demonstrates the missing presentation connection in our small shell, **not in standard EPUB or ordinary Thorium**.

The accepted typing treatment remains: three characters per 65 ms, restrained cursor, no sound, stable reserved space. The original playback-v2 and previous research packages are untouched. [PR #1's ordinary-reader findings](../planetary-epub/READING-POSITION.md) remain valid and unmerged.

## Browser and scope

2026-10-20, Zorin OS 18.1 Linux x86_64; Node 24.19.0, Playwright 1.61.1, actual **Chromium 149.0.7827.55** browser engine in headless mode; EPUB.js **0.3.93** with the default single-page paginated manager. The browser opens the actual `.epub`; no location callbacks or publication DOM are mocked. Playwright records the browser page at 25 fps, not the operating-system desktop. These are toolkit/browser integration results, **not native Thorium tests**.

Two independent contexts: **1280×800 desktop** and **820×1180 portrait responsive tablet viewport**. The latter uses desktop Linux Chromium at a different size; it does not verify iPad hardware, touch interaction or Safari/WebKit. No secondary browser engine was tested.

## Temporal evidence

| Scenario | Desktop evidence | Responsive tablet evidence | Established result |
| --- | --- | --- | --- |
| Opening prose; >7s invisible preload; delayed first encounter; departure and quick/later return; natural completion; image in sequence; completed return | [reading.webm](evidence/linux-desktop/reading.webm) | [reading.webm](evidence/tablet-responsive/reading.webm) | Real reader turns; offscreen output stays inactive; visible first state starts from blank |
| Partial-output reopening; rapid navigation; reveal; completed reopening; sustained full Replay; reduced-motion switch | [reopening-replay.webm](evidence/linux-desktop/reopening-replay.webm) | [reopening-replay.webm](evidence/tablet-responsive/reopening-replay.webm) | Resume/reveal/completion policies and progression over several seconds |

[Machine-readable results](evidence/results.json) contain per-frame computed opacity/display, visible prefixes, bounds, page-relative host timings and message traces. Screenshots `01`–`21` in each evidence directory correspond to the named steps in `test.cjs`. Reload resets the page clock; UUIDs distinguish document instances. Video wall time, host time and iframe time must not be treated as a single frame-exact clock.

| Check | Observed result in both viewport runs |
| --- | --- |
| Prose before state | Immediately readable, exact source text; first turn uses toolkit navigation |
| Controlled invisible preload | Second EPUB.js rendition is offscreen/inert; initial inactive snapshot; zero characters and no tick events during >7s dwell |
| Delayed connection | 350ms registration delay; first captured surface is blank, complete text opacity 0 |
| Sustained first output | Desktop prefixes 30 → 75 characters; tablet 30 → 72; complete text hidden behind output in every partial capture |
| Early departure | ArrowRight with Show complete output focused reaches prose; saved count stops advancing |
| Quick / later return | Incomplete output resumes; a second absence lasts >6s with unchanged count, then resumes |
| Natural completion / completed return | Full text, optional Replay; no forced repeat on return |
| Image placement and bounds | Prose → original SVG → remaining prose; loaded, aspect-contained and within frame in both sizes; labels visually inspected |
| Incomplete reopening | Actual persisted checkpoint after tab close restored exactly: desktop 66 → 66, tablet 57 → 57 characters |
| Rapid navigation | Four ordinary queued arrow turns settle on state; pending transactions suppress intermediate activation |
| Stale signals | Old sequence and wrong document instance rejected; valid typing continues; detached records retired |
| Immediate reveal / completed reopening | Complete state persists and reopens complete |
| Full uninterrupted Replay | Desktop 5340ms; tablet 5345ms; multiple longer prefixes before completion |
| Reduced motion | Initial reduced-motion context and dynamic change give readable static full text, explanation and disabled Replay |
| Publication scripting disabled | Real toolkit `allowScriptedContent:false`, no host marker; complete readable YAML, controls hidden |
| Unsupported bridge | Real toolkit without opt-in marker; readable full YAML, explicit Begin performs, reveal works |
| Live status | A MutationObserver confirms no repeated status mutations while character bursts accumulate; this is not a screen-reader usability test |

The initial performance's active time spans several visits, so the uninterrupted Replay is the clean timing measurement. Nominal 237 characters / 3 × 65ms is 5135ms; timer/rendering/capture overhead stretches it to about 5.34s. No elapsed offscreen time is caught up on return.

The artificial preloader is deliberate test infrastructure, **not a claim that EPUB.js normally preloads this extract in that way**. It uses the same packaged state and connection path, with host ownership and presentation preventing activation. Tests also delay registration to cover a listener arriving after the page has committed.

## Package and preservation checks

New title/identifier: **Planetary Model — PRIME encounter-v1**. [Download EPUB](publication/planetary-model-encounter-v1.epub). SHA-256:

```text
cf7e7474491615fdff4c763fb5dfb391b422ba993f22fe60c7b5c66134636d4c
```

- EPUBCheck **5.3.0**: **0 errors, 0 warnings**, [log](evidence/epubcheck.txt).
- `verify.py`: PASS against independently specified pinned manuscript ranges, exact prose/YAML whitespace/punctuation, reading order, original SVG bytes, manifest and all internal references; no remote publication resources.
- The derivative has exactly four changed existing resources (package metadata/spine, CSS, state/image presentation markup) and two added component scripts. Opening/before-image/after-image XHTML and original SVG are byte-identical to playback-v2. The build records and validates the baseline hash.
- All prior generated outputs match PR #1 base `d8cc649` byte-for-byte; [preserved artifact hashes](publication/preserved-artifacts.json). No manuscript repository write, reader fork, merge or deployment.
- All new JavaScript files pass syntax checks. Runtime and development dependencies are locked. Rebuilding the same inputs reproduces the package hash.

## Findings, limitations and next step

A controlled host can make the encounter reliable for this extract by combining toolkit navigation/display state with actual component geometry, explicit inactive/enter/leave and document identity. A first-visible locator, document load or in-frame intersection alone remains insufficient. See the implemented [contract](CONTRACT.md) and the [toolkit/adaptation decision](DESIGN.md).

This is limited to one bundled trusted publication, one visible paginated surface and ordinary controls. Arbitrary nested clipping, hostile EPUBs, general mixed-layout handling, cross-device persistence and arbitrary reader themes are not established. Storage must remain available in the same browser origin/profile for reopening. Screen-reader use, browser back/forward cache behaviour across browser shutdown, actual iPad/Safari and touch swipes remain unverified. The scripting trust boundary and upstream npm advisories are documented in DESIGN.md; this is not a production-safe arbitrary-book loader.

Recommended next experiment: **Ted reads this shell locally and evaluates whether the page turn feels right.** If it does, test the same integration in actual iPad Safari before selecting more reader infrastructure. That is a compatibility check, not authorisation to build a platform. Ordinary Thorium still needs its own supported reader integration; this shell does not alter that result.
