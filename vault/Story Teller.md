---
type: implementation-experiment
status: provisional-slice
created: 2026-10-21
---

# Story Teller

**Ted's current direction:** start a VS Code extension for adapting completed books into sequences of presented story beats. This authorises a small manual-preview implementation, not a general editor or publishing platform. It is a separate authoring experiment alongside [[Managed EPUB Foundation]]; the earlier EPUB artifacts and Art work are preserved, not restructured or migrated.

**Provisional syntax being tested:** normal Markdown prose, initial YAML frontmatter excluded from performance, standalone `---` beat boundaries, and top-level fenced `chat` blocks containing `Speaker: message` lines. Prose and chat may share a beat. This is not an agreed long-term interchange format or a change to manuscript sources. The fictional sample has no authoritative-manuscript adaptation claims.

**Implemented slice:** “Story Teller: Preview Scene” opens beside a Markdown document; Previous/Next/Restart manually navigate whole beats. Unsaved edits update the preview with best-effort current-beat preservation. The parser and player do not import VS Code. The extension handles documents and panel lifetime. HTML is escaped; links are inert; images use alt text; no manuscript scripts or remote fetches are enabled.

[Source, provisional syntax, fictional sample and development-host instructions](../tools/story-teller/README.md). Test claims and limitations are recorded in [results](../tools/story-teller/RESULTS.md).

**Deferred by Ted's brief:** content-based timing, delivered/read ticks, visual beat cards, import/export. No existing EPUB lifecycle or timing is replaced, and no permanent choice about Obsidian's role or publication format follows from this slice. Future integration with the managed reader remains a proposal requiring concrete examples.

## Timed-chat continuation — 2026-10-21

**Accepted workflow:** Ted accepts the Markdown/live-preview workflow and authorises timed chat **within** a manually selected beat. The original chat-line syntax remains valid; provisional `@delay`, `@pause`, `@viewer` and `@ticks` directives add bounded timing and optional authored status effects. Leading prose is readable in ready state; later prose waits for preceding chat. Play is explicit; Pause/Resume preserves active time; Replay Beat resets and plays; source edits reset to ready. The player clock is injectable and independent of VS Code. Reduced motion retains sequential whole-message reveals without animation. See the extension README/results for the formula, tick semantics, verification and limits.

This supersedes the earlier timing/ticks deferral **for this slice**. Visual beat cards, import/export and other components remain deferred. No EPUB lifecycle is replaced or manuscript adapted by the fictional sample.

## Cross-component timing — 2026-10-21

**Ted's accepted distinction:** `@delay` replaces an item's default delay; `@pause` adds silence while preserving the item's existing timing. Both names remain; no replacement directive is introduced.

The implementation now applies standalone outside directives at top-level Markdown block boundaries. Adjacent prose stays one component with zero default entry delay. An outside chat delay replaces its first message's delay; pauses add silence. Explicitly delayed prose and trailing pauses use the existing independent scheduler. Literal Markdown contexts are preserved, ambiguous overrides are diagnosed, and timing stays within the manually selected beat. The recent non-viewer responding and viewer-offset fixes remain intact. See the updated source README/results for supported positions, exact totals and automated host evidence. Syntax is still provisional; no authoring-helper UI, extra component or EPUB migration follows from this change.

## Current-document chat conversion — 2026-10-21

**Ted's authorised increment:** convert recognised manuscript chat containers in one active Markdown buffer, preserving words, speakers, order, title, surrounding prose and unsaved edits. Preview the diff and warnings before explicit Apply; reject stale snapshots; one Undo reverses the conversion. No whole-book importer or automatic file save is authorised.

The converter is grounded in the current authoritative Art manuscript and the companion renderer, with pinned revisions/rules in the extension README. It converts only the plain wrapper subset; unsupported subtext, dividers, assets and ambiguous identity/alignment remain unchanged for review. The player now additionally accepts `# Title` and explicit multiline continuations (`  | `), while existing `@title`, bare ticks and accepted timing/responding remain. Only fictional fixtures are committed; local Art/manuscript sources are untouched. See README/results for actual native-host automated checks and limitations. This records implementation evidence, not editorial acceptance of a converted scene.

## Chat authoring consolidation — 2026-10-21

**Ted's accepted direction:** retain the Markdown/live-preview workflow, accepted chat playback/pacing, `@delay` as replacement and `@pause` as additional silence. He reports conversion is good. Keep canonical bare flags and `# Title`. Existing Art separators are useful starting boundaries; conversion must preserve them. The EPUB+ adaptation is a separate Markdown file from the original manuscript, not an instruction to overwrite that source or build export here.

**Implemented and awaiting Ted's acceptance:** native Insert picker/context-menu helpers for Chat, Beat boundary, Delay, Pause, Responding and Ticks, plus explicit Wrap Selection. Snippet title/viewer/message placeholders use the actual `@viewer Name` syntax; optional flags stay off. Wrapping preserves selected content without claiming to convert it. Structural checks now agree across parsing, conversion and insertion, protecting frontmatter and literal code and refusing unsafe context/selection edits. Normal editor Undo, selection and tab stops are reused.

The existing conversion/review flow is preserved. Read-only Art exercise findings, automated host checks and limits are in extension README/results; no manuscript text or boundaries are rewritten/committed. The new helpers and complete adapted-scene experience still need Ted's authoring review. The broader EPUB foundation, images and import/export remain separate scope.


## Chat-local pace — 2026-10-21

**Ted’s acceptance and feedback:** the existing chat experience is accepted. Long exchanges accumulate too much waiting. Retain `@delay` replacement and `@pause` additional silence; imagery is next, not part of this increment.

**Implemented, awaiting Ted’s acceptance:** optional chat-header `@pace normal|brisk|deliberate`. Normal is unchanged; Brisk/Deliberate scale only the existing bounded automatic message waits by 0.7/1.3, rounding milliseconds. Explicit delays, pauses, tick timing, viewer and responding semantics remain. The native Insert picker adds a Pace choice which updates that chat’s configuration in one Undo. Fictional Normal/Brisk comparison beats and validation details live in the Story Teller README/results. This is authoring presentation metadata, not dialogue rewriting or a new EPUB contract.
