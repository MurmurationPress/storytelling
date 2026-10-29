---
type: implementation-experiment
status: accepted-extension-behaviour
created: 2026-10-23
---

# Supporting Content

**Acceptance (2026-10-23):** Ted accepts explicit wikilinks, aliases, hover/focus previews, nested reading panels and refresh behaviour in PR #14 at `e9e04b3e194ec6458da59ee07ecc5094d8acf869` (the accepted feature head, distinct from the later integration closeout). This does not establish touch/other-platform support or publication readiness. JANUS uses these notes and existing directives, without a separate component.

**Ted's direction:** authors may add supporting Markdown definitions/background and select them through explicit `[[Target]]` or `[[Target|Display text]]` links. `[[Ted|Edward]]` displays Edward and opens Ted.md. `[[JANUS early|JANUS]]` and `[[JANUS later|JANUS]]` deliberately select different information while sharing a name. No automatic entity, timeline or spoiler model is implied.

**Trial implementation:** a fixed `Supporting Content/` folder beside `story-teller.project.json`, outside the scene sequence. Unique exact-case basenames or explicit root-relative paths resolve within that folder. Parent paths, heading/block references and escaping symlinks fail with diagnostics. Notes and images use the shared safe Markdown/local-resource treatment; note images resolve from their own source file. Existing note edits refresh without resetting story playback.

**Reading treatment:** a compact hover/focus preview and a longer native reading dialog, with nested note links and Back. Hover/focus does not disturb playback. Opening the dialog pauses active output/audio; closing returns to the same beat/position without resuming. A progressively typed annotation exposes a note control only when its display label is complete. YAML stays literal.

The resolution/filesystem adapter is separate from VS Code, and the shared reader UI accepts an injected loader. This is the existing preview/player only, not a standalone web implementation or EPUB feature. Notes are ordinary Markdown, not new performed components or scene includes.

**Evidence and limits:** the extension README and RESULTS distinguish deterministic tests, native Linux editor checks, Ted's author acceptance. Touch and other platforms remain unverified. No manuscript, private adaptation or artwork is used as a committed example. The synthetic project demonstrates two JANUS files; its test image is the repository's original fictional asset.

**Branch relationship:** this separate PR is stacked on PR #12's accepted `bf846888f0cbedc70328ff103eea12b9ea8b861e`; Ted subsequently authorised dependency-order integration of both PRs; licence terms remain unchanged. Ted's authored [[Component Types]] remains unchanged.

**Standalone web trial:** [[Story Teller Web Reader]] exports these behaviours using the shared presentation module and a snapshot note loader. The authoring extension retains its filesystem/editor-buffer refresh; exported books are static snapshots, updated by a new export rather than access to the author's files. This web delivery is awaiting acceptance.

## Editorial review rule: information at the point of access

Agreed with Ted on 29 October 2026. Supporting Content is part of the storytelling and must be reviewed against what the reader can know when it first becomes accessible.

For each authored link, check the hover/focus preview, the full reading panel, and every note reachable through onward links. Follow those links recursively, treating cycles as already visited; a safe direct note can still lead to a revealing later one. Include titles, aliases, images, captions and alternative text, not only the note's body.

Review against the earliest access point to that specific note version. Flag later events, identities, relationships, outcomes and explanations which would disclose a reveal prematurely. Also flag information which assumes knowledge the reader has not yet acquired. Check links in front/back matter and supporting notes as well as story scenes. Repeat the check when a shared note or its onward links change.

Use explicit earlier/later note versions with display aliases where needed, or revise/remove the premature material or link. A later version must not remain reachable through an earlier note's onward links. Preserve intentional mysteries and distinguish information the reader knows from information a particular character knows.

Record the entry point, revealing content/link chain and proposed correction for findings. An intentional early disclosure is an editorial decision to record explicitly, not an automatic error to rewrite.

The review is scoped to the book's own exported Supporting Content. Project scoping prevents access to unrelated vault material; it does not prevent spoilers within the publication. This is a human/editorial review rule using existing explicit links and note versions, not an implemented automatic spoiler filter, reader-progress gate or new engine.

