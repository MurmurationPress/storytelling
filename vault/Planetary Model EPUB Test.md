---
type: prototype-study
status: tested-with-limitations
date: 2026-10-20
---

# Planetary Model EPUB Test

## Current first target

Ted selected **Planetary Model** from CONSTRAINT for the first focused test. This precedes the broader Art study. The immediate question is whether page turning can carry the reader from normally readable prose to performed PRIME state YAML and back to prose.

EPUB 3 and Thorium Desktop were selected for the focused capability experiment below. The initial plan preceded implementation; the dated findings distinguish verified behaviour from remaining questions.

Only the state YAML is to receive the typing treatment. Narrative prose currently inside the same Obsidian callouts should remain normally readable. Do not animate the note's metadata frontmatter or treat it as a PRIME state block.

## Inspected source

- Repository: tedwarddick/PrimeTrilogy
- Path: Books/CONSTRAINT/INSTABILITY/Planetary Model.md
- Inspected commit: 84fcdb52841ce5280aa3f23397a4dd2b829c1133
- Scene blob: b1ab3b0e9b6ea68d586676e99f4b5547d317d87a
- [Source chapter at the inspected revision](https://github.com/tedwarddick/PrimeTrilogy/blob/84fcdb52841ce5280aa3f23397a4dd2b829c1133/Books/CONSTRAINT/INSTABILITY/Planetary%20Model.md)

The chapter contains eight prime-log sections, each beginning with state YAML and continuing into prose. The SharedDependency section also includes a map between prose passages.

## Image and narrative placement

The image is Story World/Visualisations/PRIME Habitat - Planetary Model - 2030-04-04.svg. Its companion definition describes an internal infrastructure comparison; the JANUS hatching is estimated UK-linked operational reach, not sovereignty. Preserve its existing meaning and position.

[Image definition at the inspected revision](https://github.com/tedwarddick/PrimeTrilogy/blob/84fcdb52841ce5280aa3f23397a4dd2b829c1133/Story%20World/Visualisations/Definitions/PRIME%20Habitat%20-%20Planetary%20Model%20-%202030-04-04.md)

For the initial test, include the existing image as a static publication asset. No animation, external hosting or interactive map conversion is required by this choice.

## Proposed small sequence

Use the end of ContinuityReview as opening prose, then the SharedDependency section:

1. Opening prose, readable immediately.
2. Page turn to the HostComparison YAML, typed in PRIME's presentation.
3. Page turn to the following prose, readable immediately.
4. Encounter the existing map at its original point after the infrastructure description.
5. Continue to the prose beginning “PRIME remained distributed across the terrain.”

The precise pagination is a design question. The map could occupy a page of its own if that gives it sufficient space. Do not move it before the prose introducing it, reorder the narrative, or animate prose to match the enclosing callout.

This sequence is a proposed extraction, not an adaptation already performed. Pin and preserve the actual source when building it.

## What to learn

- Does typing start when the state page is encountered, rather than finishing while it is offscreen?
- Can readers leave before typing finishes, without disrupting page turns?
- What happens on turning back: replay, retained state or an explicit choice?
- Are YAML indentation and complete text preserved?
- Does returning to prose restore normal reading and layout?
- Is the map legible at the chosen size, and does it paginate cleanly?
- What adjustments are needed for another reader or iPad? Desktop success alone does not establish mobile compatibility.

No video, murmuration simulation, hosting, new authoring syntax or full-book compiler is needed for this first test.

See [[Art Prototype]], [[PRIME and JANUS]], [[Chat Performance]] and [[Existing Platforms]].

## 2026-10-20 — First capability experiment (historical report)

**Ted's explicit authorisation:** implement this small EPUB experiment, produce a downloadable artifact and reproducible build, evaluate it in a reader, and open a focused PR. This supersedes the earlier no-implementation status for this experiment only. It does not authorise a general platform, manuscript changes, site publication or a broader backlog.

**Source finding:** current remote HEAD remained `84fcdb52841ce5280aa3f23397a4dd2b829c1133`, identical to the earlier inspection. The scene, SVG and companion definition were fetched at that revision; exact blob IDs and hashes are in the prototype's provenance record. No old ZIP was used and the manuscript repository was not modified.

**Built artifact:** [downloadable test EPUB](../experiments/planetary-epub/dist/planetary-model.epub), [build and exercise instructions](../experiments/planetary-epub/README.md), [reader results and evidence](../experiments/planetary-epub/RESULTS.md). The EPUB contains only this extract; pinned whole-scene source remains alongside it for audit.

**Exact extraction:** ContinuityReview closing prose, source lines 48–58, beginning “Demand reduced. Restoration followed through network operations.” and ending “Extend the assessment beyond the interval.”; HostComparison YAML 63–69; SharedDependency prose 72–77; unchanged SVG at embed line 79; remaining prose 81–96 ending “Retain dispersal. Recalculate what it protects.” Only the fenced HostComparison content is performed. Frontmatter, State metadata, other YAML, callout wrappers and other sections are omitted. Paragraphs, wording, YAML indentation and punctuation remain intact.

**Original local report, subsequently qualified by Ted’s contradictory playback result:** In native Thorium Desktop 3.5.1, Linux x86_64 (Zorin OS 18.1), ordinary reader turns move from prose to the isolated state surface, then prose, image, and remaining prose. Explicit Begin output types three-character bursts with a restrained cursor. Leaving before completion works even with button focus. Turning back shows complete YAML with optional Replay. Immediate reveal and natural completion work. State text and the complete original SVG fit 1024×768 and 800×600 reader windows. Smaller fixed text is a tradeoff. Reader security controls and code were not changed.

**Presentation choice for this test:** reflowable prose plus two fixed-layout spine surfaces (state and image), no spreads. Native testing supports these boundaries in this reader. This is not a settled treatment for every block or reader. The image remains at its original narrative position and preserves the companion definition's meaning.

**Material limitation:** automatic activation on arrival was not established. Thorium advertises spine scripting and executes this script, but document loading and internal visibility handling do not establish a reliable publication-facing “reader reached this page” event. The prototype uses explicit **Begin output** and initially shows complete text. It does not claim automatic performance.

**Return design and scope:** on tested Thorium page turns, returning gives full state and optional replay. Pagehide/hidden events reveal full text and a fresh document load starts complete; another reader retaining a hidden document without such events could continue its timer. Cross-reader lifecycle guarantees remain unresolved.

**Separate validation:** EPUBCheck 5.3.0 reports zero errors and warnings; exact source, ordering, original image bytes and local references pass verification. Chromium component checks pass reduced motion, JavaScript-disabled full-text fallback and stable animation bounds, but these are not native-reader accessibility or compatibility results. No secondary EPUB reader was installed; no iPad, touch or screen-reader result is established.

**Original interpretation (subsequently qualified below):** a qualified yes for prose → explicitly started performed PRIME state → prose with Thorium's own page turning. It establishes neither automatic activation nor general EPUB-reader compatibility. EPUB remains an experiment, not an agreed publication platform.


## 2026-10-20 — Playback-v2 defect investigation (historical interpretation)

**Historical interpretation, superseded by the recording clarification below:** the preceding request described a flash and immediate full reveal in Thorium Desktop 3.5.1 on Linux. The subsequent recording demonstrates progressive typing and identifies the remaining issue as initial revelation before playback. Ted likes the printout appearance. Treat this as a defect, despite the earlier local success. His subsequent reset does not by itself establish a correction.

**Reproduction finding:** the unchanged original EPUB progressed normally in a new isolated default profile. Temporary diagnostics recorded one Begin activation, motion preference false, document visible, growing prefixes, transparent complete text, and natural completion after 5,332 ms. No early lifecycle event or showAll was recorded. Ted's exact failure path remains unestablished; the original report is preserved as historical evidence in the prototype's `evidence/RESULTS-v1.md`.

**Candidate correction:** playback-v2 hides complete text using opacity rather than colour, retains its layout and accessibility text, pauses/resumes an explicitly begun performance on hidden/visible events, completes on pagehide, ignores duplicate Begin activations while running, and explains reduced-motion static output. Synthetic browser tests demonstrate the old colour-override and hidden-event failure paths and verify the new protection. Neither path was observed as the cause of Ted's native result. No accessibility preference, reader setting or security control needs changing.

**Native verification of the new build:** multiple timed frames show sustained prefixes for pointer, Enter and Space, followed by complete YAML near the intended 5.33 seconds. Separate diagnostic native runs record complete opacity zero during playback and completion at 5,396 and 5,330 ms. Early departure with control focus, quick and later return to complete state, optional replay, immediate reveal, and state/image bounds at 1024×768 and 800×600 were checked. Browser-only checks cover reduced motion, no-script, duplicate activation, colour overrides, synthetic hidden pause/resume and accessibility-tree text retention. Native accessibility modes, touch, iPad and a second reader remain unverified.

**Artifacts:** [playback-v2 EPUB](../experiments/planetary-epub/dist/planetary-model-playback-v2.epub), [diagnostic variant](../experiments/planetary-epub/dist/planetary-model-playback-v2-diagnostic.epub), [current findings and temporal evidence](../experiments/planetary-epub/RESULTS.md). New filenames, identifiers, library titles and state labels prevent confusion with the old imported copy. Both EPUBs pass EPUBCheck 5.3.0 with zero errors/warnings, and both pass exact source/image/package verification. The manuscript remains pinned and untouched.

**Remaining uncertainty:** Ted should retest the distinctly titled new import with his settings unchanged. If the symptom persists, the diagnostic variant provides a local copyable transition/style log without developer tools. This is hardening plus local verification, not a claim that Ted's exact cause has been found. Automatic page-arrival playback remains a separate unresolved question. PR #1 remains unmerged.


## 2026-10-20 — Recording clarification and automatic encounter investigation

**Ted's recording establishes progressive typing:** the 33.425-second `Screencast from 2026-10-20 15-23-11.webm` shows playback-v2 accumulating text. The crossed wires concerned the reading experience: complete YAML is visible before Begin/Replay clears and performs it. The prior “unexplained progressive-playback defect” interpretation is historical, not the current finding. Recording provenance is retained with the evidence; the personal recording was not copied into the repository.

**Ted's clarified first encounter:** native page turn → blank/cursor state surface → automatic accumulation → native turn onward at any time. Complete text must not flash first when scripting runs. No-script/reduced-motion reading, immediate reveal and the original image must remain available. Revisiting a completed page may show complete state with optional replay; this is separate from first encounter. Manual Play does not meet the requirement.

**Supported-signal finding:** no documented publication-facing active-page notification was established in unmodified Thorium 3.5.1. The released reading-system object exposes name/version/hasFeature. Layout activation and outer container visibility are managed internally via reader IPC; the tempting private visibility-mask feature is disabled. EPUB's DOM event model does not define a committed reader-arrival event. No private hook, security weakening or reader patch was introduced.

**Native experiment:** a distinctly named load/pageshow + ordinary-intersection probe hides complete text using a pre-body script bootstrap. Timed 15 fps native recordings show automatic progression after the tested page turn without a full-text flash, early departure, return, and reopening. Completed state returns/reopens complete with optional Replay. Incomplete return restarts. These observations alone do not qualify arrival detection.

**Failed preload condition:** an artificial EPUB fixture embeds the state invisibly while opening prose is shown. In official native Thorium the hidden state reports visible document + full geometric intersection, starts at 72 ms and completes at 5,403 ms. Actual first page arrival then shows already-complete text. This is a controlled counterexample, not a claim that Thorium naturally preloads this extract in that way. It demonstrates why the tested heuristic cannot be treated as reliable arrival. Experimental Chromium visual tracking reports false for this fixture, but has not been qualified as a supported Thorium active-page contract; not every possible heuristic has been ruled out.

**Outcome:** automatic performance on actual encounter remains unresolved. No automatic candidate is accepted. The unchanged [playback-v2 explicit-start EPUB](../experiments/planetary-epub/dist/planetary-model-playback-v2.epub) is retained as demonstrated working playback, not as fulfilment of automatic arrival. The [current findings](../experiments/planetary-epub/RESULTS.md) link separately named research probes, native recordings, traces and reproduction steps. Both probes pass EPUBCheck with zero errors/warnings and exact source/image/reference checks. Reduced-motion and no-script alternatives are checked in browser components, separately from native lifecycle results. No iPad or secondary-reader support is inferred.

**Additional integration proposed, not built:** the reader would need to expose active/inactive surface notifications after visible layout commitment, distinguish preload from active reading, supply current activity to late listeners, and cover restored positions/reopening. The reader would continue owning native turns. No new reader or platform was built; no manuscript source was modified; PR #1 remains unmerged.


## Reading-position and read-aloud follow-up — 2026-10-20

**Finding:** the typing component works; reliable encounter triggering remains unresolved. The [pinned implementation trace](../experiments/planetary-epub/READING-POSITION.md) follows native page turns to Readium's host locator callback, the selector/caret used to start TTS, speech-driven highlighting and navigation, and media-overlay time/fragment synchronization. These mechanisms maintain location within the reader but do not expose a supported silent-reading component enter/leave subscription to EPUB content in Thorium 3.5.1. TTS can drive navigation, so speech position must not be treated as silent arrival.

**Portability finding:** EPUB 3.3 media-overlay classes concern playback. Apple documents narration controls; Readium Kotlin and EPUB.js expose application integration facilities. These do not make an arrival API available in every publication or establish universal absence across readers. Other readers were not tested. Exact versions/source links and provenance hashes are in the trace.

**Proposed next experiment:** seek an agreed supported reader-side contract, then separately authorise a minimal toolkit-host bridge test for committed component presentation, including initial snapshot, preload suppression, enter/leave, restoration and pre-paint gating. A locator callback alone is insufficient. No reader, bridge or new EPUB was built in this follow-up; no new native success is claimed. Retain playback-v2 and prior native evidence; PR #1 stays unmerged.


## Separate toolkit-host follow-up

Ted subsequently authorised [[PRIME Reader Integration]]: a small EPUB.js reading shell and an explicit presentation connection, on a separate stacked PR. That experiment supplies the missing host integration; it does not establish automatic encounter in unmodified Thorium or change the standard EPUB API findings above. Playback-v2 and all PR #1 research artifacts remain unchanged, and PR #1 remains unmerged.
