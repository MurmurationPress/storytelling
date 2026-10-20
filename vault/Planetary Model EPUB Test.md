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

## 2026-10-20 — First capability experiment

**Ted's explicit authorisation:** implement this small EPUB experiment, produce a downloadable artifact and reproducible build, evaluate it in a reader, and open a focused PR. This supersedes the earlier no-implementation status for this experiment only. It does not authorise a general platform, manuscript changes, site publication or a broader backlog.

**Source finding:** current remote HEAD remained `84fcdb52841ce5280aa3f23397a4dd2b829c1133`, identical to the earlier inspection. The scene, SVG and companion definition were fetched at that revision; exact blob IDs and hashes are in the prototype's provenance record. No old ZIP was used and the manuscript repository was not modified.

**Built artifact:** [downloadable test EPUB](../experiments/planetary-epub/dist/planetary-model.epub), [build and exercise instructions](../experiments/planetary-epub/README.md), [reader results and evidence](../experiments/planetary-epub/RESULTS.md). The EPUB contains only this extract; pinned whole-scene source remains alongside it for audit.

**Exact extraction:** ContinuityReview closing prose, source lines 48–58, beginning “Demand reduced. Restoration followed through network operations.” and ending “Extend the assessment beyond the interval.”; HostComparison YAML 63–69; SharedDependency prose 72–77; unchanged SVG at embed line 79; remaining prose 81–96 ending “Retain dispersal. Recalculate what it protects.” Only the fenced HostComparison content is performed. Frontmatter, State metadata, other YAML, callout wrappers and other sections are omitted. Paragraphs, wording, YAML indentation and punctuation remain intact.

**Verified in native Thorium Desktop 3.5.1, Linux x86_64 (Zorin OS 18.1):** ordinary reader turns move from prose to the isolated state surface, then prose, image, and remaining prose. Explicit Begin output types three-character bursts with a restrained cursor. Leaving before completion works even with button focus. Turning back shows complete YAML with optional Replay. Immediate reveal and natural completion work. State text and the complete original SVG fit 1024×768 and 800×600 reader windows. Smaller fixed text is a tradeoff. Reader security controls and code were not changed.

**Presentation choice for this test:** reflowable prose plus two fixed-layout spine surfaces (state and image), no spreads. Native testing supports these boundaries in this reader. This is not a settled treatment for every block or reader. The image remains at its original narrative position and preserves the companion definition's meaning.

**Material limitation:** automatic activation on arrival was not established. Thorium advertises spine scripting and executes this script, but document loading and internal visibility handling do not establish a reliable publication-facing “reader reached this page” event. The prototype uses explicit **Begin output** and initially shows complete text. It does not claim automatic performance.

**Return design and scope:** on tested Thorium page turns, returning gives full state and optional replay. Pagehide/hidden events reveal full text and a fresh document load starts complete; another reader retaining a hidden document without such events could continue its timer. Cross-reader lifecycle guarantees remain unresolved.

**Separate validation:** EPUBCheck 5.3.0 reports zero errors and warnings; exact source, ordering, original image bytes and local references pass verification. Chromium component checks pass reduced motion, JavaScript-disabled full-text fallback and stable animation bounds, but these are not native-reader accessibility or compatibility results. No secondary EPUB reader was installed; no iPad, touch or screen-reader result is established.

**What this establishes:** a qualified yes for prose → explicitly started performed PRIME state → prose with Thorium's own page turning. It establishes neither automatic activation nor general EPUB-reader compatibility. EPUB remains an experiment, not an agreed publication platform.
