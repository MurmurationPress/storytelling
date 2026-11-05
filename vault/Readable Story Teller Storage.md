---
type: architectural-proposal
status: implementation-under-validation
created: 2026-11-05
---

# Readable Story Teller Storage

## Implementation review status

The 0.19.0 candidate implements the architecture below and awaits Ted's acceptance.
The [author guide](../tools/story-teller/READABLE-FILES.md) is the operational
reference; [validation evidence](../tools/story-teller/test/evidence/readable-storage/README.md)
records passing unit/installed-migration/HTTP/Skip-copy checks separately from
the reproduced baseline native-folding runner failure. Ordinary legacy editing
and settings remain available where they keep the existing layout; storage-changing
commands require version 2. Rename requires clean inputs and saves only its own
affected documents. No production project, merge, release or deployment is changed.

Ted requests readable source storage, safe migration, reimport and reader compatibility. This proposal extends [issue #20](https://github.com/MurmurationPress/storytelling/issues/20), which already agrees readable scene filenames, permanent IDs, ordering independent of filenames and explicit renames. Reimport and readable assets extend that issue's original scope. This records the pre-implementation proposal. Ted subsequently accepted the conflict policy below; implementation is now under validation on the dedicated branch. See [author guide](../tools/story-teller/READABLE-FILES.md) for the implemented workflow and limits.

## Findings

- `tools/story-teller/src/manuscript-import.cjs` creates format version 1 projects. Parts and scenes receive random UUIDs at planning time. Scene paths are `scenes/<id>.md`; copied part notes are `metadata/<id>.md`. Asset paths combine the original basename with a full SHA-256 digest. Matter has stable IDs and readable paths. Provenance currently includes absolute source paths.
- Beats remain ordered sections inside scene Markdown, separated by standalone `---`, with optional beat-title comments. Component configuration and authored dialogue remain inline. A beat-file architecture would add fragmentation and change the established authoring format without solving this problem.
- Root `sequence`, part `scenes` arrays and scene `partId` preserve order/membership independently of files. Labels are presentation metadata. `orderedScenes` validates the manifest and currently accepts version 1 only.
- Import creates an exclusively reserved new destination through staging and checks reviewed input hashes. Existing destinations are refused. There is no current reimport/merge contract or saved imported-output baseline.
- Preview, pacing, outline, metadata migration and export consume manifest paths. The outline watches manifest changes, not arbitrary scene moves. There is no automatic manifest reconciliation for external renames.
- Supporting links resolve within the supporting-content directory. Their exact relative targets, aliases and earliest-access editorial meaning must remain intact. Ordinary Markdown URLs do not establish a general scene-link system. Migration must inventory actual reference syntax rather than treating all textual path matches as links.
- Export parses scene Markdown and nested supported component media, copies resources into hashed generated assets and emits scene JSON under hashes of stable scene IDs. Generated names are separate from source storage and can remain opaque.
- HTTP preferences use `story-teller:<book.id>`. That ID is a hash of ordered document IDs; the saved scene is its logical ID and the saved beat uses index/raw text. A pure path migration preserving IDs/order retains this key. Reordering currently changes the key and requires an explicit compatibility solution.
- Editor preview persistence uses source URIs plus beat index/raw text. Renames need URI alias resolution; retaining UUID metadata alone does not preserve editor state.
- Temporary matter filenames also use UUIDs; these are transaction scratch files, not author-facing source names. Hashes used for integrity/stale-input checks remain necessary.
- Existing suites cover import, media, outline/navigation, export, supporting content, playback and component metadata migration. Existing component-metadata migration changes component syntax; it is separate from filesystem migration.

The local Skip adaptation is available in the sibling Stories-Told checkout. Read-only inventory found version 1, 14 scenes (all GUID filenames), 52 assets and 95 files total. Its content/media must remain private and tests must operate only on disposable copies.

## Proposed canonical representation

Keep JSON and the established Markdown/component formats. Introduce project version 2 rather than a parallel YAML manifest or beat-file format:

```text
Before                         After (illustrative titles)
story-teller.project.json       story-teller.project.json
scenes/<uuid>.md                scenes/gardeners-question-time.md
metadata/<part-uuid>.md         metadata/first-part.md
assets/forum-<sha256>.png       assets/forum.png
Front Matter.md                Front Matter.md
Back Matter.md                 Back Matter.md
Supporting Content/            Supporting Content/
```

Keep scene/part/matter IDs permanently. Retain explicit sequence and membership arrays; filenames have no ordering semantics and no derived-number prefixes. Title changes never rename files automatically. Beats retain their titles and source order within each Markdown scene.

Allocate paths with a shared, deterministic slug allocator: normalized Unicode, lowercase letters/digits and hyphens, bounded UTF-8 length, no traversal, control characters, trailing dots/spaces or Windows device names. Compare candidate names under normalized case folding. Reserve all existing names, including unknown files. Duplicate titles use a short stable identity suffix, extending it if needed; assets use stable import mappings and collision suffixes rather than full content hashes as names. Persist allocated paths and never recalculate existing paths merely because titles/order/content change.

Unknown manifest/frontmatter fields and user files survive. Runtime references are project-relative; historical absolute provenance is retained as evidence, not used as a portability requirement. New import mappings use source-root-relative keys. Export integrity hashes remain independent of readable asset paths.

Add an explicit project publication identity, initialized on migration to the exact old exported book-ID calculation. Export uses it thereafter, including after reorder. Maintain the old storage key and scene IDs. Beat-content matching retains existing restoration behavior; an identical duplicate beat remains index-disambiguated, not a newly claimed stable beat identity.

## Import and reconciliation

New imports allocate readable paths from scene/part titles and original asset names. Save a versioned import ledger containing source-relative identity mapping, source digest, last imported output digest, and enough baseline information for conflict review. Import identifiers already supplied by the source can be reused only after uniqueness validation.

Reimport uses explicit identity or the persisted source mapping first. A moved source with a unique unchanged baseline can be offered as a match. Changed-and-moved sources without reliable identity require author mapping; titles alone are insufficient. Duplicate matches block review. Preserve all existing allocated paths and IDs. Reuse assets; changed bytes do not rename an established source asset.

**Conflict contract accepted by Ted (2026-11-05):** unchanged source leaves adaptation edits untouched; source-only changes update clean imported output; changes on both sides block that scene for explicit resolution. Source deletions retain adapted scenes and report them for review. Never overwrite adaptation edits or silently delete files. No-op reimport writes nothing, including the ledger. Existing projects without import baselines must establish a reviewed baseline; provenance's source hash alone cannot prove an adaptation is unedited.

## Migration and recovery

Provide `Story Teller: Migrate Project to Readable Files` with dry-run preview/report, explicit Apply and Cancel. Prefer an exclusively reserved sibling destination to a multi-file in-place transaction. The original project stays intact and is the recovery point. The author opens the validated sibling after success and reviews Git changes before replacing the old working copy.

1. Validate schema/version, path boundaries, unique identities, order, file existence, references and case-folded collisions. Refuse partial/mixed migrations and unresolved ambiguous references.
2. Inventory every file and hash, including unknown files. Reject escaping symlinks and unsupported filesystem entries explicitly rather than skipping them.
3. Build the complete path map, ID-preserving map, reference edits and warnings. Review dry-run JSON and a readable preview. No source mutation.
4. Refuse dirty buffers; snapshot source inventory after review. Copy the full project into a marked staging directory, preserving bytes for unaffected files.
5. Apply only reviewed moves/reference edits and the versioned manifest/ledger. Unknown metadata containing possibly affected paths requires review/blocking instead of speculative string replacement.
6. Compare semantic inventories and asset bytes; validate parsed components, supporting targets, matter, sequence and generated reader data. Check source inventory again before committing the sibling destination.
7. Write a machine-readable report, inventory and old-to-new map. Record transaction identity/status externally to publication material. Never overwrite a destination. Interrupted staging is distinguishable from a completed project; retry explicitly cleans/reuses only verified transaction-owned staging. A completed v2 project returns a no-op result.

Copying an unchanged project cannot silently repair missing assets or unsupported content. Pre-existing warnings must be distinguished from newly introduced failures. Blocking unknown-reference cases require a manual resolution recorded in the report.

## Filesystem authoring and compatibility

Add an explicit scene rename/move command and VS Code file-operation handling that updates manifest references with collision and stale-input checks. A move observed after an external shell operation is diagnosed; repair requires an unambiguous identity/mapping, never guessing from a title. Document manifest editing for operations outside VS Code. Keep scenes within `scenes/` to match the existing exporter boundary.

Version 1 remains readable for preview/export. Canonical new imports and migrated writes use version 2. Block project-mutating commands on version 1 with an actionable migration message; preserve ordinary source access. No dual-write. Any eventual removal of the v1 read adapter needs a separately announced compatibility decision, not an undocumented expiry.

Retain URI aliases for editor restore across moves/migration, keyed by stable project/scene identity. Supporting note paths are unchanged unless a reviewed reference mapping requires otherwise. If the editor cannot recover a previous cross-root URI, document that limitation and provide an explicit restore path; do not claim browser state establishes editor restoration.

Video, arbitrary internal scene links and standalone bookmark features must not be claimed as supported merely because they appear in acceptance requirements. Inventory encountered syntax and preserve bytes; unsupported references that a move would affect block migration pending an explicit manual action.

## Validation and delivery gates

Test portable slug collisions/reserved names/Unicode/long names, first and repeated import, source edits/reorder/moves, adaptation conflicts, missing/duplicate media, unknown fields/files, cancellation, concurrent edits, interrupted staging/retry, repeated migration and reference repair. Compare inventories including text, component settings, subtext, timing, references and asset hashes. Compare reader data semantically where media source paths differ; compare emitted resource bytes.

Run full unit/build/check/package suites and targeted installed VSIX/HTTP reader checks for playback/navigation, persistence, nested media/supporting content, motion preferences and audio cleanup. Exercise a disposable Skip copy without committing private fixtures. Device and human accessibility claims require actual tests. Existing unsupported behavior remains explicitly limited.

Deliver migration/rename/recovery/Git review documentation, VSIX and a PR referencing #20 on `feature/readable-project-storage`. Do not merge, publish or deploy before author acceptance. This document is the pre-implementation proposal, not evidence that those delivery gates have passed.
