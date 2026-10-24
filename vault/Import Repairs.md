# Import Repairs

This repair experiment is awaiting Ted’s acceptance. It is stacked on PR #18 at
`8088f75bd5c35d2d604f6ba14eb64f3c08041053`, which remains unmerged/unaccepted;
main contains PR #17 at `2f5a8b93ad07dce0742c9f50d95638e38025f17e`. The separate
branch preserves the heading candidate rather than treating it as integrated.

## Established findings

Read-only current local PrimeTrilogy source at
`382bcf5656c340a5988df5064f26482a2d95aef3` reproduces the reported paths and
embed (Books/EMERGENCE/First Detection.md; OBSERVATION/JANUS Analysis.md:141).
First Detection has type scene and the selected book as canonical parent. Its
sibling order key places it before the first part. The old importer accepted
book-level scenes only when no parts existed; with parts present it incorrectly
excluded this valid scene. Old planning produced 35 reading documents; the
repaired plan produces 36 distinct source documents with that scene first.

MWC source `08ec248d6bdd1cef33cd1eab255df24430a8e9fa`,
src/manuscript/ManuscriptOrder.ts, distributedEntries/appendChildren, orders book
scenes and parts together as siblings, then traverses each part’s children. The
repair follows that hierarchy with strict source-key diagnostics instead of MWC’s
fallback filename ordering when keys are invalid. No synthetic part or source
metadata edit is needed. Missing/unmatched/ambiguous scene parents and unclear
sibling order now block import with source-located errors rather than dropping
story content. Membership conventions are otherwise unchanged; the already
corrected review metadata is untouched and no title-specific exclusions exist.

The image is a valid PNG at Media/Media Book 1/PA01 Relationship Model Book1.png.
The source uses a bare-filename wikimedia embed with an alias inside a blockquote.
The old resolver tried only the scene directory and root directly, never nested
asset folders. It fails with both the book folder and full vault root: zero order
errors, one unresolved image (the reported PNG), two unsupported-format warnings.
Thus the PNG—not SVG/Markdown warnings—was the actual Continue blocker in this
local reproduction. Ted’s selected root was not captured, so it is not inferred.
The repaired vault-root lookup resolves the PNG with zero unresolved assets;
book-only scope correctly still needs explicit authorisation of a broader root.

No ZIP was used or assumed current; this live revision is newer than the earlier
inspection pinned elsewhere. No available ZIP was compared. Private source is
read-only, and verification of actual PNG bytes uses disposable copies in an
otherwise fictional book. No manuscript passage or private asset is committed.

## Implemented contract (pending acceptance)

New imports store an optional version-1 manifest sequence of root part/scene IDs.
Part children retain their own ordered references; direct scenes have null partId.
Outline, orderedScenes assembly/navigation and web Contents consume that same
sequence. Legacy manifests without the field keep their existing order. Existing
projects are never silently upgraded/reordered. Direct scenes have independent
ordinal labels; existing part/child numbering is retained.

Image lookup stays inside the explicitly selected canonical source root. Bare
Obsidian filenames require a unique supported file below it; duplicate candidates
block. Exact relative/root-relative paths are supported; ./ or ../ makes a path
source-relative, with traversal and symlink escapes rejected. Hidden directories
and symlink directories are not traversed for basename lookup. Aliases and width
or width-by-height hints are recognised; images retain original bytes and the
reader’s responsive presentation. SVG and Markdown transclusion remain unsupported,
explicit non-blocking warnings. Missing/ambiguous/corrupt supported images block.

Review shows the selected root, ordered root entries and all blocking reasons both
in the main content and beside Continue. Exclusions and unsupported-format warnings
are labelled separately. Back rereads source metadata and rebuilds asset lookup;
correcting references/order or explicitly choosing the proper asset root can clear
the blockers. There is no skip-missing-assets action. Final snapshot checks remain.

See tools/story-teller/README.md and RESULTS.md for tests and native/browser limits.
