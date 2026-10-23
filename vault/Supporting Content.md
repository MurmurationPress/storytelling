---
type: implementation-experiment
status: awaiting-ted-acceptance
created: 2026-10-23
---

# Supporting Content

**Ted's direction:** authors may add supporting Markdown definitions/background and select them through explicit `[[Target]]` or `[[Target|Display text]]` links. `[[Ted|Edward]]` displays Edward and opens Ted.md. `[[JANUS early|JANUS]]` and `[[JANUS later|JANUS]]` deliberately select different information while sharing a name. No automatic entity, timeline or spoiler model is implied.

**Trial implementation:** a fixed `Supporting Content/` folder beside `story-teller.project.json`, outside the scene sequence. Unique exact-case basenames or explicit root-relative paths resolve within that folder. Parent paths, heading/block references and escaping symlinks fail with diagnostics. Notes and images use the shared safe Markdown/local-resource treatment; note images resolve from their own source file. Existing note edits refresh without resetting story playback.

**Reading treatment:** a compact hover/focus preview and a longer native reading dialog, with nested note links and Back. Hover/focus does not disturb playback. Opening the dialog pauses active output/audio; closing returns to the same beat/position without resuming. A progressively typed annotation exposes a note control only when its display label is complete. YAML stays literal.

The resolution/filesystem adapter is separate from VS Code, and the shared reader UI accepts an injected loader. This is the existing preview/player only, not a standalone web implementation or EPUB feature. Notes are ordinary Markdown, not new performed components or scene includes.

**Evidence and limits:** the extension README and RESULTS distinguish deterministic tests, native Linux editor checks, Ted's earlier acceptance and this trial awaiting acceptance. Touch and other platforms remain unverified. No manuscript, private adaptation or artwork is used as a committed example. The synthetic project demonstrates two JANUS files; its test image is the repository's original fictional asset.

**Branch relationship:** this separate PR is stacked on PR #12's accepted `bf846888f0cbedc70328ff103eea12b9ea8b861e`; it does not authorise merging that PR or changing licence terms. Ted's authored [[Component Types]] remains unchanged.
