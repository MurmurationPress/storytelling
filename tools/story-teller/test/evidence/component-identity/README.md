# Component identity review — 2026-11-02

All artifacts use `samples/component-identity-project`, copied into temporary
projects for native tests. No private manuscript/adaptation is included or
migrated. The code starts at main `de3bc87`, which includes JANUS PR #34.

The standalone screenshots show the completed six-component beat at 1100px and
375px. The native screenshots show the installed extension's same reader at the
top of that beat, in desktop and narrow editor groups. The header is visibly
outside the literal PRIME body; its timestamp wraps without overflowing. Native
controls/palette follow the editor; the exported reader follows its own theme.
Long JANUS titles/timestamps and both accepted document palettes are visible in
the full standalone images. These are review artifacts, not golden-image tests.

`validation.json` records the package audit/digest and final automated scopes.
The browser run covers independently optional metadata, visible entry headers,
safe HTML, supporting-note keyboard access, width 1100/768/375, pause/resume/speed,
replay, Previous/Next, reduced motion and no metadata-induced waits. The separate
JANUS suite checks row/heading units, multiple tables, full-table column widths,
manual horizontal inspection through completion and navigation cancellation.
Native checks run real commands through diff/Apply/Undo, inspect dirty versus
disk state, open the project migration report, and verify independent headers,
body playback, supporting links and visible narrow layout. No file is saved by
migration. Project migration plans only manifest scenes/matter, with per-file
review; it does not scan notes or the manuscript repository.

Initial native test-driver attempts failed during a webview handoff and while
waiting for Ready after scene selection had already autoplayed. The final driver
waits for the committed synthetic scene and explicitly restarts before testing
entry/pause. Later installed runs pass. These are not claimed as product fixes.

The sole supporting note is first accessible through the PRIME component's
heading. Its preview/full panel defines signed changes and has no onward links
or later disclosure. This is an editorial point-of-access check, not an automatic
spoiler filter. No human screen-reader, actual touch hardware, Safari or author
acceptance is claimed. No production reader deployment or book migration occurs.

Reproduce using [the guide](../../../COMPONENT-IDENTITY.md#review-sample-and-checks).
