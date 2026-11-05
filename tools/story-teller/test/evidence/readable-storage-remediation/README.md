# Readable storage preservation remediation — 0.19.1

Issue #20 / PR #39. Supersedes the pending-acceptance status in the original
[0.19.0 evidence](../readable-storage/README.md). Ted granted author acceptance
following EMERGENCE testing at `a159a8087b01f398bd20b3bd1aab2cc86dcd4548`;
that author report is retained, separately from the revised checks below.
No production story project, release or deployed reader was changed.

## Corrections and independent checks

Actual frontmatter ownership governs cover metadata edits; literal YAML, fenced
code, chat and other literal component output are preserved. Validation now
compares independently parsed authored tokens/literal snapshots rather than
using the rewriting function as its own expected result. Lossless UTF-8 decoding
blocks unsupported text encodings before replacement bytes can be written;
unaffected binary files retain their exact bytes. Markdown destinations are
parsed separately from optional titles. Every destination directory component
is checked for case/Unicode aliases and existing files before a move.

The four original independent probes are permanent tests in
`test/readable-preservation.test.cjs`. The same probes run against the exact
original reviewed head produce **0 pass / 4 fail**; the remediated implementation
produces **4 pass / 0 fail**. The expanded preservation suite passes **14/14**,
including Latin-1 bytes, BOM/CRLF, independently compared literal output,
malicious hash-consistent plan changes, titled/space-containing media URLs,
and portable directory aliases. The complete suite also covers source-only
literal reimport updates.

Fresh independent cumulative review found two further scanner gaps: scene moves
did not inspect all supported HTML/code/style/SVG files, and percent-encoded
reference-style Markdown links could escape detection. Both now block before
edits when no safe rewrite rule exists. Permanent probes cover these cases and
literal examples. Independent review at code head
`825df4a5972052a0d2ef83b24fce0c3da26545f7` reports no material findings and
independently passes all **399/399** unit tests. Final documentation/evidence
head is recorded in the PR review comment before guarded integration.

## Executed validation

- Syntax check, complete unit suite (**399 pass, zero failures/skips**), both
  reader builds and VSIX packaging pass. [Machine summary](regressions.json).
- [Normal installed VSIX](installed-migration.json): Linux VS Code 1.144.0,
  isolated profiles, actual cancel/migrate/open/nested-rename/save commands.
  A Markdown image with a space-containing destination and quoted title loads
  in the actual editor preview after the move (`naturalWidth > 0`).
- [HTTP playback](http-playback.json): exported from that installed-editor result;
  Chrome 156, actual image loading, playback/navigation, chat/subtext, formatted
  components, literal YAML, supporting panels, audio graph cleanup, scroll,
  preferences and narrow/reduced-motion emulation pass.
- [Saved reading position](http-position.json): same HTTP origin and existing
  localStorage retain publication ID, scene ID and beat index across legacy
  export replacement; reopening remains ready.
- [Disposable Skip inventory](skip-inventory.json): 14 scenes, 16 documents,
  150 beats, 598 components, 700 references and 52 assets match independently.
  Original inventory unchanged, 65 path changes, zero reader warnings, repeated
  migration no-op. [Installed Skip commands](installed-skip.json) and its
  [HTTP position/navigation smoke test](http-skip.json) pass too.
- [Current EMERGENCE check](emergence-block.json): automatic migration safely
  **blocks** on a percent-encoded vault-provenance path in unknown HTML-comment
  metadata in an archived asset note. Both production and disposable inventories
  remain unchanged; materialization refuses the blocked plan. The metadata needs
  explicit manual review; no exemption, deletion or speculative rewrite was
  introduced. Earlier successful migration/author acceptance is historical;
  this candidate does **not** claim successful automatic EMERGENCE migration.

No private story text, filenames, media or migration reports are committed here.
Artifact version/checksum are recorded in the JSON evidence. Install the local
`story-teller-0.19.1.vsix`; it is an acceptance artifact, not a published release.

## Limits and reproduction

The original documented native folding timeout and navigation keyboard-prompt
timeout also occur in unchanged 0.18.1-email. They remain baseline limitations;
this is not a passing broad native runner. The exploratory stale legacy-subtext
expectation remains documented. No actual Windows/macOS, Safari/iPad/iPhone,
human listening or human screen-reader validation is claimed.

From `tools/story-teller`, run `npm run check`, `npm test`, `npm run package`,
then `node test/installed-readable.cjs story-teller-0.19.1.vsix`. Use its printed
export with `python test/web-reader.py EXPORT EVIDENCE.json`; optional Python
Playwright and installed Chrome are required. Run
`node test/real-readable.cjs '/path/to/private/project'` for a disposable semantic
comparison, or add the project path to the installed runner for actual commands.
Unknown metadata/encoding blockers require manual review; do not bypass them to
obtain a green report. The [migration/recovery guide](../../../READABLE-FILES.md)
explains disposable-copy author testing and Git review.
