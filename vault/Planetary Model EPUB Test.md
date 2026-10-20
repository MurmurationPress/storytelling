---
type: prototype-study
status: proposed
date: 2026-10-20
---

# Planetary Model EPUB Test

## Current first target

Ted selected **Planetary Model** from CONSTRAINT for the first focused test. This precedes the broader Art study. The immediate question is whether page turning can carry the reader from normally readable prose to performed PRIME state YAML and back to prose.

EPUB 3 is a candidate publication target and Thorium Desktop a candidate test reader. No capability test has yet been built or run. Reader support for scripting, lifecycle events and navigation needs verification.

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
