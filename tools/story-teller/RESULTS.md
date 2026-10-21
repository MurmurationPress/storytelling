# Header responding correction — 2026-10-21

A header `@responding` had been implemented as a one-message marker. A viewer-first message consumed it, while its visual cue was correctly suppressed for the viewer. As a result, a header-style chat setting did not reach the incoming reply. This is a reproduced parser-policy mismatch; it is not a claim to have inspected Ted's unsaved editor buffer.

Before the first message/pause, `@responding` now enables incoming cues throughout that chat. Viewer messages never display or consume that setting. Existing per-message directives between messages/pauses retain their one-message scope. The cue still uses only existing message delays, disappears on Pause/reset/arrival and respects the viewer, motion and timing rules. No content setting is invented by conversion.

Build/syntax checks and **55 deterministic tests pass**. New regressions cover a converted viewer-first chat with ticks, multiple incoming replies, pause/resume/replay/reset and isolation between chats, plus legacy per-message scope. The actual Extension Development Host suite runs the fictional viewer-first scene with **only a header flag**, confirms the incoming cue after the viewer's delivered/read phase, and exercises the existing conversion/Undo/multiline regressions. These are automated observations, not a reproduction of Ted's unseen current buffer. An initial full-suite run passed playback but timed out at the unrelated Regenerate-button lookup; the test-only locator now searches native workbench buttons beyond transient toast containers, and the full rerun passed. No conversion product logic changed for that harness adjustment. Author-edited Art and Component Types files are unchanged.

---

# Current-document chat conversion — 2026-10-21

## Evidence and implemented scope

The inspected authoritative Art source is pinned to `79edd0e365e3ae6ab5f5e19413d6fe12d679a518` (`Books/CONSTRAINT/COLLISION/Art.md`, SHA-256 `2625789554f7c743e56ca114b08c80992a84d6e298e95414d3d1785f85594497`). Source definitions were read from writing-companion revision `08ec248d6bdd1cef33cd1eab255df24430a8e9fa`; exact paths and conversion rules are in README. Current local Component Types and author-edited Art were also inspected. No guessed speaker-name recognition is used.

A read-only in-memory audit converted **30 authoritative Art containers / 71 messages**. Their speaker/text/order, titles and explicit right-aligned participant declarations match the inspected companion parser's results; an independent temporary execution of that TypeScript parser supplied the comparison. The second conversion pass made **zero changes**. This audit is separate from committed fictional fixture tests. No manuscript passage or converted manuscript output is committed, saved back or published.

## Executed validation

- Build and JavaScript syntax checks pass; **53 deterministic parser/player/conversion tests pass**. Dependency audit: zero vulnerabilities; no dependency added.
- Fictional/minimal fixtures cover multiline content, titles, inherited speakers, escaped literal pipes, explicit settings, no invented settings, ambiguity/subtext/artwork retention, current valid blocks, literal examples, quotes/lists/code/frontmatter, BOM/CRLF, surrounding byte preservation, idempotence and source-line warnings. New heading/continuation parsing is additive; playback timing, viewer ticks/offset and non-viewer responding regressions remain covered.
- **Actual VS Code 1.142.0 Extension Development Host automation passes:** native read-only diff/count/warnings; Review Warnings output; Cancel with no source edit; edits after preparation causing stale Apply refusal; Regenerate using the latest buffer; explicit Apply of two containers; no file save; one Undo restoring the exact prior unsaved buffer. Host testing uses temporary fictional documents and verifies the on-disk file stays unchanged.
- The host also previews the converted fictional scene through the real player, observes the `# Harbour link` title and verifies a multiline message retains its colon, blank line and literal directive-looking text. Existing timed playback/safety regressions run in the same suite.

These are **automated API/DOM observations in a real Extension Development Host**, not a human pointer/reading review or cross-platform validation. Temporary profile/logs are printed by `npm run test:host`. No VS Code API is mocked. Unit clock tests establish exact timing; real UI tests allow asynchronous renderer latency.

## Material limitations

Only the inspected plain wrapper subset in top-level chat fences is convertible. Unknown historical formats, nonempty subtext, dividers, assets, complex alignment/identity markup and ambiguous blocks are unchanged with line warnings. Current invalid manually adapted chats (for example a missing space in `Speaker: message`) are flagged rather than guessed/repaired. Canonical `# Title` and explicit `  | ` continuation support were necessary additive parser changes; existing `@title` and bare `@ticks` remain supported. Older tick aliases were not introduced or expanded by this task.

Conversion does not editorially remove redundant narration, insert beats, change timing or construct image/drawing components. Windows/macOS, VS Code Web/remote, actual screen-reader operation and the prior hidden/reopening behaviour remain unverified. The manuscript source, local authoring worktree/Art file, Component Types and EPUB work are preserved. No push, release, deployment or merge.

---

# Consistent tick flag — 2026-10-21

`@ticks` now enables optional authored status marks, matching the bare `@responding` flag style. Omission leaves ticks disabled. Viewer requirements, header placement, duplicate detection and timing are unchanged. Older `@ticks on` / `@ticks off` drafts remain readable for compatibility; the sample/docs and main playback fixtures use `@ticks`.

Build/syntax checks and **43 deterministic tests** pass. The actual Extension Development Host suite exercises the updated sample's bare tick flag and outgoing read marks; existing title, timing, responding and safe-rendering regressions remain covered. These are automated checks, not a manual reading review. Local Art and Component Types notes are unchanged.

---

# Optional chat titles — 2026-10-21

`@title Title text` is an optional header inside a chat fence, once before messages/pauses. It renders a plain-text heading and names the conversation for accessibility. It appears when playback reaches the chat, before its first message, and adds no timing. Outside silence does not prematurely reveal a later title. Untitled chats retain their prior rendering. Empty, duplicate and late titles are diagnosed; titles with spaces/colons are supported. This does not add support for manuscript-specific `> Speaker` chat syntax or rewrite the local Art file.

Build and syntax checks pass; **42 deterministic tests pass**, including title scope, validation and component-entry timing. The actual Extension Development Host test checks title-before-first-message, no title leakage into the next chat, and an HTML-like title displayed as text without executing or fetching content. These are automated DOM observations, not a manual reading/accessibility review. Existing timing/lifecycle limitations below remain.

---

# Cross-component timing — 2026-10-21

## Automated validation

- Build and JavaScript syntax checks pass. **40 parser/player tests pass** with an injected deterministic monotonic scheduler. Dependency audit reports zero vulnerabilities; no dependency was added.
- Exact clock totals cover multi-paragraph prose revealed atomically, chat → delayed prose, additive consecutive pauses, combined pause/delay, outside first-message overrides with no second entry delay, leading in-chat pauses, trailing completion pauses, and duplicate overrides across chat boundaries. Tests also cover source locations, literal Markdown contexts, invalid-control omission, manual navigation, source-edit resets, interruption/resume and stale callbacks after replay/disposal.
- The real **VS Code 1.142.0 Extension Development Host** suite exercises the extended `lantern.md`: chat → 1000ms delayed prose → 800ms trailing pause, then prose → 700ms silence → 1200ms first-message delay with Ivo's responding cue → chat → 1000ms delayed prose → 1000ms trailing pause. It observes the distinct phases and records timestamped counts/status in its temporary `temporal.json`.
- The existing host regression checks remain: explicit Play/ready state, Pause/Resume, Replay, beat preservation on edits, viewer-only ticks/responding, outgoing offset with ticks disabled, safe content rendering, focused controls and disposal. The mixed example runs with an emulated reduced-motion preference; timing/sequencing remain intact without animation.

These are **automated DOM observations in the actual Extension Development Host**, not a manual pointer/reading review. Exact timing assertions come from the deterministic scheduler tests; host observations allow real timer/polling latency. No actual iPad, macOS, Windows or assistive-technology result is inferred.

## Decisions and limits

Recognised outside directives are metadata, never rendered story content. They are valid at root block boundaries, not inside an existing Markdown paragraph, quotation, list or literal code example. Invalid controls are diagnosed with source lines; they add no timing. A conflicted outside override retains the first authored value. Malformed chat keeps dialogue as code without executing it; authoring-control lines are stripped from that fallback. Neither an error nor a pending delay can carry into the next beat.

Prose entry defaults to zero; adjacent Markdown paragraphs remain one component. No sentence reveal, new component type, automatic beat progression or helper interface was introduced. Existing chat delays/ticks, the non-viewer responding rule and source/reset behaviour remain in place. The prior hide/reopen/OS-background, accessibility, cross-platform and best-effort identity limitations below still apply. Ted's existing sample edits were retained while adding the requested examples. EPUB work and Component Types remain untouched. No push, release, deployment or merge.

---

# Timed chat and responding — earlier verification (2026-10-21)

## Executed checks

Linux desktop; Node.js 24.19.0; VS Code 1.142.0 (`6d62b1d5dace93a33b3a6d3eca1317bd5e15bcb1`). Dependencies unchanged from the first slice.

- Build and JavaScript syntax checks pass; `npm audit` reports zero vulnerabilities.
- **28 deterministic parser/player tests pass.** An injected monotonic fake clock checks default bounds/Unicode length, one-message overrides, zero delay, additive and trailing pauses, exact remaining-time pause/resume, message/status reset on replay, duplicate Play, stale canceled callbacks, navigation/edit/disposal cancellation, multiple mixed components, manual beat progression, original syntax and diagnostics. These are clock-controlled unit tests, not measurements of browser timer precision.
- **Actual Extension Development Host automation passes.** It observes the fictional sample ready with zero messages after an idle wait; then 1 → 2 → 3 messages over time; Pause holds the count; Resume completes; viewer-only delivered/read ticks; Replay clears progress; edits preserve beat position and reset to ready; mixed-beat following prose waits for chat; Next remains manual. It also exercises pinned-document/reused-preview behaviour, empty-source recovery, focus/navigation and closing during playback.
- The host test emulates `prefers-reduced-motion: reduce` through Electron CDP, confirms the media preference and observes timed mixed-beat sequencing unchanged. Both preference paths use discrete reveals with **no animation**.
- The hostile-source fixture still produces no executable content elements or requests to its remote hostname. Chat payloads remain text nodes; raw HTML remains escaped; links/images remain inert.

Host automation uses real VS Code document edits and the actual rendered webview, with DOM control clicks/inspection through test-only CDP. It is **not a manual pointer, screen-reader or OS reduced-motion-settings observation**. Its printed temporary profile includes `temporal.json` with timestamped counts. No host integration is mocked, and the extension contains no CDP code.

The optional `@responding` continuation adds a speaker-derived, nonanimated cue during the next non-viewer message's delay, without extra timing. Viewer messages and chats without an explicit viewer suppress the cue; this does not change delivery timing. Unit tests cover opt-in/default-off behaviour, explicit silence, zero delay, status phases, pause/resume, replay, edits/navigation and invalid directives. The host run checks “Ivo is responding…” appears during the sample delay, disappears on Pause, returns on Resume and disappears on message arrival.

The viewer-offset regression was caused by applying the outgoing CSS class only to messages with status ticks. It now depends directly on speaker/viewer identity. The host test checks the mixed beat with ticks off: Mara alone has the outgoing class and a measured horizontal offset; no ticks appear.

## Material limits

- Hidden previews are wired to pause via VS Code and document visibility; page disposal destroys the clock. Full tab-hide/recreation and OS background/minimise transitions were not exercised in the host suite. Restored webviews prepare the beat ready; they do not restore elapsed playback. Actual renderer destruction on closing during playback is checked; the stale-work guarantee is additionally tested with deliberately invoked cancelled unit-test callbacks.
- Default delays and the 600ms authored read-status phase are provisional presentation choices, not measurements of human reading/delivery. Turning ticks on adds that phase to the linear timeline. No real delivery service, telemetry, typing simulation, automatic next beat or persistent session is implemented.
- The fictional scene demonstrates syntax, not an accepted adaptation of Art or another manuscript. EPUB artifacts/code and user-authored notes are unchanged.
- Windows/macOS, VS Code Web, screen readers and high contrast remain unverified. Source-to-beat identity remains best effort as documented. No push, release, deployment or merge.

---

# Initial manual slice — historical verification (2026-10-21)

## Executed

Linux desktop; Node.js 24.19.0; VS Code 1.142.0 (commit `6d62b1d5dace93a33b3a6d3eca1317bd5e15bcb1`); markdown-it 15.0.3; esbuild 0.28.2.

- `npm ci`, `npm run build`, `npm run check`: pass. The extension host is plain CommonJS JavaScript; the build bundles the independent parser/player/browser renderer, not the extension API.
- `npm test`: **13 focused tests pass**. Covers initial/BOM/CRLF/unclosed frontmatter, sample component order, fence-aware separators, empty beats, punctuation/speakers, malformed chat preservation, nested fences, unsafe Markdown and navigation/edit reconciliation.
- `npm audit`: **0 vulnerabilities** at verification time. The initial old markdown-it pin was replaced before delivery; the lockfile pins the verified dependency tree.
- `npm run test:host`: **pass in an actual isolated VS Code Extension Development Host**, not a mocked VS Code API or standalone browser page. Opens a temporary Markdown source and invokes the contributed command; inspects the real rendered webview with test-only Electron CDP.

The host run verifies prose → chat → mixed beat; all three controls and boundary states; unsaved edits; insertion before the current beat; edited dialogue; preview remaining bound to its source when another document is selected; command reuse; empty-source recovery; focus staying on Next during manual navigation. Host source-edit operations use `WorkspaceEdit`, while control activation uses DOM clicks in the actual webview. This is not an OS pointer or screen-reader test.

A source fixture includes raw script/iframe markup, remote Markdown image/link and HTML-like chat speaker/message text. No executable script/image/iframe/link/style element appears in the story content, a script sentinel remains unset, and no request to the fixture's remote hostname is observed. Tests write only temporary documents; no manuscript is adapted or rewritten.

## Limits

- Syntax and reconciliation are provisional. Wholesale rewrites and identical/removed/split beats do not have stable author-supplied identities; the documented best-effort rules apply.
- Message delivery is whole-beat/manual, with no timers, typing indicators, delivered/read ticks or authored timing. The fictional scene is a syntax fixture, not evidence of an accepted manuscript adaptation.
- Links are inert and images use alt text. Local image presentation and other component types are deferred.
- Hidden-webview state restoration is implemented with the documented webview state/ready APIs, but tab hide/recreation and full application restart were not included in the automated host run. Full saved-session restoration is outside this slice.
- No actual macOS, Windows, remote-workspace, VS Code Web, screen-reader or high-contrast verification. Styles use VS Code theme variables and native buttons; broader accessibility verification remains open.
- Existing EPUB experiments and Art feature work were not changed or retested by this separate extension slice. No new EPUB, release, publication, merge or deployment is produced.
