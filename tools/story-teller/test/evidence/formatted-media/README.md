# Formatted component media review — 2026-11-02

Review candidate **0.17.0**, based on main `916b3b2` (merged JANUS #34 and
component identity/migration #35). All examples/assets are synthetic and public;
no actual adaptation or manuscript was copied or migrated.

- [HTTP desktop](web-desktop.png), [375px](web-narrow.png), [dark 375px](web-dark-narrow.png).
- [Installed extension desktop](native-desktop.png), [narrow editor group](native-narrow.png).
- [HTTP result](web.json), [installed VSIX result](native.json).

The web screenshots show three complete components in one beat: JANUS circulated
report, restricted analysis and character-typed annotation. Native captures focus
on the log and annotation at their authored positions. Images, whole tables,
local horizontal diagram/table inspection and independent headers are visible.
The synthetic graph PNG is original, with JPEG/WebP variants. Four source names
share three content hashes. Twelve image elements and six diagram SVGs are
prepared, loaded and usable; screenshots are not substituted diagram images.

## Executed validation

- `npm test`: **345/345** (including parser, all existing converter/metadata/
  migration routes, player, resource/export security and asynchronous preparation).
- `npm run check`, both bundles and `npm run package`: pass.
- Actual Chrome **156.0.8078.79**, HTTP-served isolated export: image `naturalWidth`,
  SVG presence, atomic source order, annotation character steps, caption handling,
  fixed table columns, manual horizontal inspection across reveal ticks,
  three components/unique IDs, per-diagram style isolation, light/dark/narrow,
  keyboard supporting-note access/return focus, missing/invalid fallback,
  replay/Previous/Next during prep, immediate reveal and reduced motion: pass.
  No external requests or page errors. YAML-only media is never requested.
- Export tests rename the copied source project offline after export, inspect all
  copied assets, prove repeated-content deduplication, and reject traversal and
  symlink escapes through the existing inspector. The HTTP reader requests only
  its exported origin; it has no original-workspace path dependency.
- Installed VS Code **1.144.0**, disposable profile, final **0.17.0 VSIX**:
  new `formatted-media` scope passes (loaded PNG/JPEG/WebP, SVG, metadata,
  pause/speed/reveal, theme, narrow overflow and cancellation/fallback).
- Existing JANUS HTTP table/scroll/playback suite and installed JANUS scope pass.
  Existing component-identity HTTP suite passes. Existing Mermaid style HTTP
  suite passes with zero CSP violations, page errors or external requests,
  including class/flow/sequence, styles, light/dark and keyboard inspection.
- Native metadata migration: the existing installed scope reaches the real
  diff/Apply, proposes two components, preserves beat comments and leaves disk
  untouched. Its subsequent Undo assertion fails on this Linux VS Code build,
  with both 0.17.0 and the unchanged 0.16.0 baseline. Project UI review after that
  assertion is not reached. Deterministic migration/idempotence/selection/project
  reporting tests pass; complete native migration acceptance is **not claimed**; the native failure’s
  cause is unconfirmed.
  See [comparison](native-migration.json).

The sample's sole supporting note is first accessible at the concluding link in
beat one. Its preview and full text describe the synthetic illustration only;
there are no onward links or later disclosures. This is a point-of-access
editorial inspection, not an automatic spoiler filter.

## Package

`tools/story-teller/story-teller-0.17.0.vsix` is a local review artifact, excluded
from Git and not Marketplace-published. SHA-256:

```text
94a8df09a6f36326b3f6fe26f50b9c3120618e5ecf122ddd98ac0e7fbc1a471f
```

Both bundled readers, parser, asset resolver, converter, migration, supporting
reader, formatted helpers and CSS match the packaged source. Tests, screenshots
and sample projects are excluded. There are 416 archive entries. A final package
inventory audit checks these byte comparisons; no production deployment occurs.
Use [the sample](../../../samples/formatted-media-project/) and
[authoring/reproduction guide](../../../FORMATTED-MEDIA.md).

## Limits and test-driver findings

This establishes Linux Chromium/VS Code behaviour, not Safari/iPad, Windows/macOS,
actual touch, human screen-reader or audible-sound acceptance. Existing sound
code is reused; the sample defaults to silence. Author acceptance remains open.
JavaScript timers cannot preempt synchronous Mermaid CPU work; the bounded wait
and cancellation ignore asynchronous late results and remove measurement DOM,
while retaining serial rendering/configuration isolation.

Early test-driver attempts needed safe arrow-function predicates under the real
export CSP, the fixture's exact failure title, and nonzero virtual time for a
chain of zero-delay reduced-motion timers. Visual testing caught and fixed a
real annotation full-table measurement problem: its full text must reserve
width before typing starts. The native legacy scope also required opening the
notification centre for its real diff/Apply test. Attempts with explicit source focus, closing the
preview and a native pointer/Ctrl+Z sequence did not resolve the Undo harness
assertion; these exploratory driver changes were discarded. The new media CDP
scope disables desktop-occlusion throttling. These harness changes
are not claimed as author-facing feature changes. No test permission or reader
security setting was weakened.
