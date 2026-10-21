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
