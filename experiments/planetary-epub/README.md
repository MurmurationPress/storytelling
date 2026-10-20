# Planetary Model EPUB capability experiment

**Integration status (2026-10-20):** PRs #1 and #2 were subsequently reviewed and merged under Ted's explicit authorisation. Earlier keep-unmerged instructions below describe the original experiment stage. See the [integration review](../INTEGRATION-REVIEW.md) and [accepted foundation](../../vault/Managed%20EPUB%20Foundation.md). Ordinary-Thorium automatic encounter remains unresolved; automatic encounter is demonstrated in our managed host extension.

**Reading-position follow-up (2026-10-20):** [the implementation trace](READING-POSITION.md) follows native turns, TTS and media overlays through the exact Thorium/Readium versions. Location APIs remain application-side; narration mechanisms do not supply a supported silent-reading encounter signal to publication scripts. No credible new supported trigger was found, so no new EPUB or native run was added. Playback-v2 remains unchanged.

**Progressive typing is demonstrated in Ted's recording. Automatic performance on actual encounter remains unresolved.** Playback-v2 is retained as a working explicit-start artifact; showing the complete state before Begin/Replay does not meet the desired first scripted encounter. See [current findings and native recordings](RESULTS.md). The earlier [original report](evidence/RESULTS-v1.md) and [playback-v2 investigation](evidence/RESULTS-playback-v2.md) remain historical; the recording clarifies that the issue is revelation on arrival, rather than failed progression.

[Download the retained playback-v2 EPUB](dist/planetary-model-playback-v2.epub), library title **Planetary Model — PRIME playback-v2**. It requires explicit playback and is not being presented as satisfying automatic arrival. Its bytes and printout treatment are unchanged.

Two distinctly named **research probes**, not accepted automatic-playback editions, are available: [arrival-load-probe-v1](dist/planetary-model-arrival-load-probe-v1.epub) and [arrival-preload-counterexample-v1](dist/planetary-model-arrival-preload-counterexample-v1.epub). The first automatically performs after the tested native page turn but fails the invisible-preload condition. The second is an artificial hidden-preload counterexample. The current findings explain their limitations and link first-arrival, departure/return and reopening recordings. Importing either does not require changing reader or OS settings.

The existing [playback-v2 diagnostic variant](dist/planetary-model-playback-v2-diagnostic.epub) is retained for explicit-start investigation; it is not an arrival solution.

## Open and exercise

1. Import `dist/planetary-model-playback-v2.epub` into Thorium Desktop. For a rebuilt version, remove the earlier imported copy and import again; Thorium stores a copy. Do not change security settings.
2. Read the opening ContinuityReview prose. Use the reader's Right arrow or page-turn control until HostComparison appears.
3. The complete YAML is initially readable. Select **Begin output** to perform it in three-character bursts, about 5.33 seconds in total. **Show complete output** reveals it immediately. No sound.
4. Turn forward **before** completion. The next reading surface is ordinary SharedDependency prose. Turn back: in tested Thorium, complete YAML returns, with **Replay output** available.
5. Turn forward through the prose, the habitat image on its own surface, and all remaining SharedDependency prose. The prose can span more than one page at smaller sizes.
6. Repeat at approximately 1024×768 and 800×600 reader content-window sizes. Check every YAML line, indentation, map labels, and the ability to leave while a button retains keyboard focus.

Reduced motion shows complete text with an explanation and a disabled **Static output** control; it does not flash into a performance. Without JavaScript, the complete YAML remains readable and playback controls stay hidden. These two fallbacks were checked in a browser component test; native system reduced-motion and native scripting-disabled modes remain unverified. There is no content navigation bar or completion gate; the blue arrows and progress bar in screenshots belong to Thorium.

## Reproduce offline

Python 3.9+ standard library and EPUBCheck are sufficient for building and package validation. No Python dependencies, network, fonts or services are required for building or reading.

```sh
python3 experiments/planetary-epub/build.py
python3 experiments/planetary-epub/verify.py
epubcheck experiments/planetary-epub/dist/planetary-model-playback-v2.epub
# Optional local diagnostic variant:
python3 experiments/planetary-epub/build.py --diagnostic
python3 experiments/planetary-epub/verify.py --diagnostic
epubcheck experiments/planetary-epub/dist/planetary-model-playback-v2-diagnostic.epub
```

Tested with Python 3.12 and EPUBCheck 5.3.0: zero errors and warnings. ZIP order, timestamps and package metadata are fixed; rebuilding the same inputs produces identical EPUB bytes. `verify.py` independently checks exact manuscript line ranges, paragraph breaks, YAML whitespace, reading order, SVG byte identity, manifest resources and internal references.

Optional browser component checks (not EPUB-reader verification): install Playwright into a disposable environment, install its Chromium, then run `python experiments/planetary-epub/check_browser.py`. The recorded run used Playwright Chromium 156.0.8078.4. See `evidence/playback-v2/browser-results.json`.

## Source and extraction

Authoritative repository: `tedwarddick/PrimeTrilogy`. Remote HEAD checked on 2026-10-20: **84fcdb52841ce5280aa3f23397a4dd2b829c1133**, identical to the previously inspected revision. No relevant changes. The source repository was read only. The old uploaded ZIP was not used.

`source/provenance.json` records exact paths, Git blob IDs and SHA-256 hashes. `source/scene.md` is a pinned whole-scene snapshot for audit, not the reading artifact. Only the following extract enters the EPUB. Line numbers below are inclusive in that snapshot; `dist/extraction.json` records the corresponding source spans and extracted text.

| Reading item | Source lines | Exact boundaries |
| --- | --- | --- |
| Closing ContinuityReview prose | 48–58 | “Demand reduced. Restoration followed through network operations.” through “Extend the assessment beyond the interval.” |
| HostComparison YAML | 63–69 | `HostComparison:` through `  failure_correlation: previously_underweighted` (fences 62 and 70 removed) |
| SharedDependency prose before image | 72–77 | “Migration preserved execution where local supply failed.” through “…the same neighbourhood.” |
| Image | 79 | Original embed position, following infrastructure description |
| Remaining SharedDependency prose | 81–96 | “PRIME remained distributed across the terrain.” through “Retain dispersal. Recalculate what it protects.” |

Only Obsidian quote prefixes, callout headers and code fences are removed. Blank quote lines become paragraph separators; whitespace surrounding blocks is trimmed. Single manuscript line breaks inside a paragraph remain in XHTML source and render as normal prose spaces. The frontmatter, State metadata callout, ContinuityReview YAML, callout names and other log sections are excluded. `PRIME · 2030-04-04 08:22`, controls and status messages are editorial presentation metadata; they are not manuscript additions. No prose or dialogue words are rewritten.

The companion `source/image-definition.md` was read before presentation work. The unchanged SVG is bundled byte for byte: hatching estimates UK-linked JANUS operational reach, not sovereignty; contours represent infrastructure concentration; PRIME presence does not establish complete access or control. The added image alternative text summarises those distinctions. No derivative was needed.

## Small presentation choice

`build.py` extracts this one scene and writes an EPUB 3 ZIP. `presentation/settings.json` contains timing and surface dimensions; `style.css` and `state.js` contain rendering behaviour. There is no general template language or compiler framework.

Prose stays reflowable. Two spine items override layout to pre-paginated, each with a 1000×720 viewport and no spread: state and image. This confines the short YAML to one stable surface and gives the map space while retaining adjustable prose. The complete YAML reserves its full bounds with zero opacity during animation (independent of reader text-colour overrides); an aria-hidden visual overlay supplies partial output. Assistive technology retains complete authored state rather than receiving every character. Buttons have fixed widths to avoid shifting when labels change. Screen-reader operation itself has not been tested.

Mixed layout is a test choice with a cost: fixed text scales with the surface rather than following prose font-size settings. At 800×600 it fits but is smaller. This is not a conclusion that all state blocks should use fixed layout. Other readers may handle mixed-layout boundaries differently.

No animation starts on load, intersection, or focus. On load, full text is visible. Begin starts the performance; repeated activation while it runs is ignored. Replay is available after completion or immediate reveal. Reduced motion immediately reveals it. `pagehide` finishes the output; document-hidden events pause the existing prefix and visible events resume that explicitly started performance, without treating visibility as reader location; session storage marks a begun performance so a new document load can offer Replay. In Thorium's tested turn-away/turn-back path the full state returned. A reader that retains an offscreen document without pagehide may resume the same performance rather than return complete; reliable cross-reader pause/resume or return-to-complete is not claimed. Show complete output is always available when scripts run. No key, swipe or reader-navigation event is intercepted.
