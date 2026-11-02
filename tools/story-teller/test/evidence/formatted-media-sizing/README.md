# PR #36 document-image sizing — 2026-11-02

The same synthetic sizing project was rendered with the original PR's installed
**0.17.0 VSIX** / exported reader and with the **0.17.1** refinement. It contains
three components in one beat (JANUS, JANUS log, annotation), each using a substantial
1000×1800 portrait graph as a standalone figure, inline image and table cell, plus
an eight-stage wide Mermaid diagram. No private manuscript or actual adaptation
was used. This sample has no supporting notes or onward links.

## Before and after

| Reader / JANUS log | Before | After |
| --- | --- | --- |
| HTTP desktop, component figure | [before](before-web-1100.png) | [after](after-web-1100.png) |
| HTTP 375px, component figure | [before](before-web-375.png) | [after](after-web-375.png) |
| Installed extension desktop, portrait | [before](before-native-portrait-desktop.png) | [after](after-native-portrait-desktop.png) |
| Installed extension narrow, portrait | [before](before-native-portrait-narrow.png) | [after](after-native-portrait-narrow.png) |
| Installed extension desktop, wide diagram | [before](before-native-diagram-desktop.png) | [after](after-native-diagram-desktop.png) |
| Installed extension narrow, wide diagram | [before](before-native-diagram-narrow.png) | [after](after-native-diagram-narrow.png) |

Actual rendered dimensions, rounded to pixels:

| JANUS log figure | Before | After |
| --- | ---: | ---: |
| HTTP desktop (1100px viewport) | 107 × 192 | 588 × 1058 |
| HTTP narrow (375px viewport) | 107 × 192 | 309 × 556 |
| Installed extension desktop group | 107 × 192 | 454 × 818 |
| Installed extension narrow group | 107 × 192 | 242 × 436 |

The annotation and circulated JANUS dimensions are also recorded in the JSON
reports; all three formats pass the same assertions. Standalone image and block
wrapper widths must match the available body width within 2px, with the 1.8 height/
width ratio retained. Tall figures use natural height and normal vertical page
scrolling. The 12rem height cap remains on inline/cell thumbnails. Mermaid remains
1736px wide with 16px text inside a bounded, focusable horizontal scroll region;
it is not scaled to thumbnail size. The native narrow reader is narrower than
375px because it is an editor group, not a browser viewport.

## Executed validation

- `npm test`: **345/345**; `npm run check`; both bundles; 0.17.1 VSIX package: pass.
- New `formatted-sizing-web.py` HTTP regression passes at desktop and narrow
  widths with **actual dimensions** for all three formats, including measurable
  hidden preparation, visible playback, non-shrink-wrapped figures, aspect ratio,
  compact inline/cell images, SVG width/font size, local overflow, captions,
  authored order/atomic entry, fixed table columns and manual horizontal scrolling.
- New `formatted-sizing` native scope passes against the installed 0.17.1 VSIX in
  disposable Linux VS Code 1.144.0. It samples hidden layout before clipping,
  then plays/pauses/reveals/resumes the beat, checking dimensions in all formats,
  fixed columns throughout reveal, captions and diagram inspection at both widths.
- Existing formatted-media HTTP and installed-extension regressions pass, covering
  image formats, styles, supporting-note access, pause/speed/immediate reveal,
  replay/navigation cancellation, fallbacks and reduced motion.
- Before captures use the same fixture and a baseline-recording switch, which
  records measurements without asserting the corrected width policy. The fixed
  regression asserts widths, heights and SVG text size, not only `naturalWidth`.

The hidden stage is `visibility:hidden` and measurable. Native scrollbar gutters
can reduce the available viewport width when a tall image first enters document
flow: assertions compare each phase's image/wrapper to that phase's own body,
not to a stale viewport width. Tables retain their measured column widths during
reveal. Initial test-driver iterations corrected the preparation observer's
shared function scope, diagram text selection and post-measurement column
sampling; these were harness fixes, not changes to the accepted playback model.

The [web before](before-web-sizing.json), [web after](after-web-sizing.json),
[native before](before-native-formatted-sizing.json) and
[native after](after-native-formatted-sizing.json) reports retain measurements.
The baseline native report did not sample SVG font size; the updated regression
measures and asserts it in both phases of the candidate.

The [original native migration Undo verification limitation](../formatted-media/native-migration.json)
remains unresolved. Its assertion failed in both 0.17.0 and the unchanged 0.16.0
baseline; the cause remains unconfirmed, and later native project UI review was
not reached. This sizing-only change makes no new migration acceptance claim.
No Safari/iPad, human screen-reader or actual touch acceptance is claimed. No
merge, production deployment or extension publication occurred.
