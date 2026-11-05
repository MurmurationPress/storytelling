# Readable project files and migration

This implements [issue #20](https://github.com/MurmurationPress/storytelling/issues/20), with the requested additions for assets, reimport and staged migration. Install `story-teller-0.19.1.vsix` locally for the preservation fixes. Ted's EMERGENCE author acceptance of PR #39 is retained; the subsequent independent review and remediation evidence are recorded separately. No production publication needs changing to test it.

## Layout and identity

```text
story-teller.project.json
scenes/
  gardeners-question-time.md
  the-last-word.md
assets/
  forum-screen.png
metadata/
  book.md
  first-part.md
  import-state.json
Front Matter.md
Back Matter.md
Supporting Content/
```

Scenes remain ordinary Markdown. Beats remain sections separated by standalone `---`, with optional `<!-- beat: Opening -->` titles. Chat, subtext, type-out settings/sound, JANUS, images and Mermaid retain their existing inline syntax. Migration does not split scenes or rewrite dialogue.

New imports use project version **2**. Scene/part/matter IDs remain permanent metadata. `sequence`, each part's `scenes` array and scene `partId` determine reading order. Derived labels and filenames never determine order. Reordering or editing a display title does not rename its file.

Names use normalized lowercase Unicode letters/numbers with hyphens. Empty names become `untitled`; Windows device names receive `story-`. The base is limited to 100 UTF-8 bytes. Collisions are checked with Unicode normalization and case folding; a stable identity-derived suffix is extended until unique. Existing allocated paths are reused. Source asset names are readable; integrity hashes live in metadata, not the normal asset filename. Generated HTTP assets may still use hashes.

Historical absolute provenance remains intact for diagnostics. Opening, preview, export, migration and reimport mappings do not depend on that original machine location; new import mappings use source-root-relative keys.

Declared local `cover_image` media is collected too. If front matter is generated from book metadata, the cover is included there; explicitly authored front matter keeps its own composition. Unsupported or missing declared covers block import. Images inside formatted type-outs use the same collector, while literal YAML/code examples stay literal.

## Migrate an existing project

1. **Make a disposable copy first.** Copy the complete project directory, including hidden files and user additions. For Skip, copy `Story Teller - The Curious Adventures of Skip` to a testing directory outside the production checkout. Open that copy in VS Code.
2. Save or revert affected editor buffers. Run **Story Teller: Migrate Project to Readable Files**.
3. Inspect the read-only JSON preview. `mapping` lists every old/new path; `identities` confirms identity preservation. `changes` lists edited files; the inventory includes every original file's SHA-256. Review blockers and warnings before applying.
4. Choose **Dry run only**, or Escape, to leave the filesystem unchanged. The preview can be copied/saved separately for review.
5. Choose **Create Validated Copy**, then enter a new sibling folder name. Existing destinations are refused. The complete project is staged, rewritten and validated before the new folder becomes available. The original stays intact.
6. Open the validated copy. Its permanent machine-readable report is `metadata/readable-migration.json`. Check scene order, front/back matter, representative components, media and supporting links in preview and a fresh HTTP export.
7. Only after acceptance, decide how to replace your working copy. For a Git repository containing the adaptation, copy the validated contents into a disposable branch/worktree first; review additions, removals and detected renames before committing. The extension does not delete the old directory, push, deploy or publish.

Migration preserves unknown metadata and user-created files. Explicit Markdown resource destinations and the established `cover_image` metadata convention are mapped. Unknown path-bearing syntax blocks migration rather than undergoing a guessed string replacement. Escaping symlinks, special filesystem entries, case-colliding paths, duplicate identities and missing project documents require manual review. Unreferenced files are preserved too.

Only actual Markdown frontmatter is treated as cover metadata. Literal YAML, chat, code examples, Mermaid and inline code keep their authored text, including strings which resemble paths or metadata. Resource URLs in formatted Markdown may change; destinations and optional quoted titles are parsed separately. Independent token/literal comparisons reject unrelated content changes before a migration can report success.

Text requiring reference inspection must round-trip as UTF-8 without changing bytes. UTF-8 BOMs and line endings are retained. Unsupported text encodings, including Latin-1, produce a blocking diagnostic; the original file bytes remain intact. Convert only an explicitly chosen disposable copy with an appropriate encoding-aware editor before retrying. Binary/user files which are not interpreted as text are copied byte for byte; there is no automatic encoding guess or conversion.

Book-local scope does not establish spoiler safety. Supporting Content previews, complete panels and onward links retain the existing [point-of-access editorial rule](../../vault/Supporting%20Content.md). There is no automatic spoiler filter.

## Failure and recovery

The source project is the recovery point throughout. Failure reports a `.story-teller-readable-…` staging directory beside it. The staging wrapper has a `transaction.json` marker/report and a `project/` directory. Keep these for diagnosis. **Do not open an incomplete staged project as your canonical adaptation.**

Retry from the unchanged source after fixing the reported issue, choosing an unused sibling name. An interrupted final reservation may leave an empty destination; inspect it and the transaction marker before manually removing that empty reservation. Never remove a destination containing files merely to make retry proceed. Failed staging is retained; remove it manually only after verifying the original and any completed output. Retry does not silently reuse or delete unknown staging.

Re-running migration on a complete version 2 project is a no-op. An existing destination, inconsistent partial format, unsupported version or dirty buffers cause refusal. This is a copy-and-validate migration, not an in-place multi-file rename with a hidden rollback assumption.

## Reimport without losing adaptation edits

Run **Story Teller: Reimport Markdown Manuscript** from the adaptation. Select the same manuscript book folder and its containing asset/vault root; their locations may differ from those at initial import. Review the report. Changed reimports also produce a validated sibling copy. An unchanged reimport writes nothing and creates no destination.

- Source unchanged: preserve adaptation edits.
- Only source changed: update an unchanged imported file.
- Both changed: block and report the conflict, even if a merge might appear straightforward.
- Source scene deleted: retain its adaptation and existing sequence, membership and labels for author review. Deletion review does not silently move retained scenes to the end.
- Source reordered/title changed: retain IDs and filenames; update source-controlled structure only when it does not conflict with author changes.
- Source moved unchanged: reuse a unique source-digest match. Multiple matches or changed-and-moved notes without reliable identity block rather than guessing from titles.

`metadata/import-state.json` records source-relative mappings and source/imported-output hashes. It is versioned project metadata; commit it with the project. Never reset its output hashes to your current edited files just to clear a conflict: that would authorize overwriting author work later. For a deliberately moved-and-edited source, an author may explicitly update the corresponding ledger entry's **source-relative `source` path**, retaining its ID and all baseline hashes, after verifying the identity mapping. Then rerun review. Keep a recovery copy before editing a ledger.

Migrated legacy projects have no trustworthy imported-output baseline. Their first reimport therefore offers **baseline review only**: it requires unique original source-byte matches against recorded scene provenance and archived part metadata, plus unique existing asset-byte matches. It adds a ledger to a sibling copy without changing adapted content. Run reimport again after reviewing that baseline. If the source has changed since the original import, restore the matching original manuscript revision in a disposable source checkout first; do not assert that current adaptation bytes were the original import. Ambiguous or unavailable historical baselines are explicit manual actions and block automatic reconciliation.

The current conservative merge treats each manifest collection (`scenes`, `parts`, `sequence`) as a unit when both source and adaptation change it. It reports a conflict rather than attempting a speculative structural merge. Source-deleted assets/archive files remain available; cleanup is separate from import.

## Rename and move files

Use **Story Teller: Rename / Move Scene File**. Choose a scene and a project-relative Markdown path within `scenes/`, such as `scenes/part-one/the-last-word.md`. It preserves scene identity/title/order, adjusts relative references and updates the manifest and import ledger through one editor workspace edit, then saves only the affected documents. Inputs must be saved first. Check the result if VS Code reports a failed edit/save; file operations and retained editor buffers need normal editor review/Undo before retrying.

Migration and rename inspect the same text formats. Affected HTML, CSS, JavaScript, JSON or SVG references whose syntax cannot be safely rewritten require explicit manual resolution before a move, including URL-encoded paths. Backticks in code/config files do not make those references safe to ignore.

For a file moved in Explorer or a shell, run the same command, choose the missing scene and enter its actual new path. Repair requires the old path to be absent and the new file to exist. It does not guess which file corresponds to a missing scene. Folder-wide external reorganizations should be repaired scene by scene, reviewing references. Alternatively, edit manifest `file` entries and relative references deliberately, preserving IDs and updating ledger paths. Avoid changing several unrelated things before repairing membership.

Case-only renames use a distinct temporary name first. Every destination component is checked: reuse the existing exact spelling of parent directories; `Part` and `part`, or Unicode-equivalent variants, cannot become separate parents. Destination collisions, parents which are files, traversal, reserved filenames and paths outside `scenes/` are refused before editing. Use ordinary Markdown editing for beat renames/moves; beat identity remains the existing raw-text/index restoration convention, not a newly introduced GUID per beat.

## Reader compatibility and limits

Version 1 remains readable for preview/export and ordinary authoring; storage-changing commands require migration to version 2. There is no dual-write storage path. Removal of legacy reading support requires a separately documented compatibility decision.

Migration initializes `publicationId` to the exact previous exported book identity. Scene/matter IDs and ordering stay unchanged. HTTP saved positions therefore keep their original localStorage key on the **same origin**, and version 2 retains that key after later reordering. Copying/deploying a reader at another origin does not transfer browser storage. Positions saved under older exports with a *different previous order* cannot be inferred from unknown past keys.

Editor snapshots gain a logical project/scene identity. Old full UUID scene URIs can be recognized across migration; same-root renamed URIs have aliases. The extension does not provide a global reading-history/bookmark database or restore serialized editor panels across a fresh installation. Existing raw-text/index beat restoration remains bounded when authors reorder/delete duplicate beats. Playback resumes ready under existing policy, not mid-audio.

Missing/unsupported media keep existing reader diagnostics/placeholders; migration does not invent video playback, scene-link semantics or a general bookmark system. Unsupported path syntax that would break after a move is a blocking manual action. Literal code examples remain unchanged as authored output, rather than being treated as live resource references. Supporting-note resource moves which cannot pass reader equivalence are refused.

Automated Linux/editor/Chromium checks do not establish Safari, iPad, iPhone, Windows/macOS, human audio or human screen-reader acceptance. See the validation record accompanying this candidate for actual results.
