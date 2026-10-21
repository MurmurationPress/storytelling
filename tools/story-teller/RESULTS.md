# Timed chat verification — 2026-10-21

## Executed checks

Linux desktop; Node.js 24.19.0; VS Code 1.142.0 (`6d62b1d5dace93a33b3a6d3eca1317bd5e15bcb1`). Dependencies unchanged from the first slice.

- Build and JavaScript syntax checks pass; `npm audit` reports zero vulnerabilities.
- **27 deterministic parser/player tests pass.** An injected monotonic fake clock checks default bounds/Unicode length, one-message overrides, zero delay, additive and trailing pauses, exact remaining-time pause/resume, message/status reset on replay, duplicate Play, stale canceled callbacks, navigation/edit/disposal cancellation, multiple mixed components, manual beat progression, original syntax and diagnostics. These are clock-controlled unit tests, not measurements of browser timer precision.
- **Actual Extension Development Host automation passes.** It observes the fictional sample ready with zero messages after an idle wait; then 1 → 2 → 3 messages over time; Pause holds the count; Resume completes; viewer-only delivered/read ticks; Replay clears progress; edits preserve beat position and reset to ready; mixed-beat following prose waits for chat; Next remains manual. It also exercises pinned-document/reused-preview behaviour, empty-source recovery, focus/navigation and closing during playback.
- The host test emulates `prefers-reduced-motion: reduce` through Electron CDP, confirms the media preference and observes timed mixed-beat sequencing unchanged. Both preference paths use discrete reveals with **no animation**.
- The hostile-source fixture still produces no executable content elements or requests to its remote hostname. Chat payloads remain text nodes; raw HTML remains escaped; links/images remain inert.

Host automation uses real VS Code document edits and the actual rendered webview, with DOM control clicks/inspection through test-only CDP. It is **not a manual pointer, screen-reader or OS reduced-motion-settings observation**. Its printed temporary profile includes `temporal.json` with timestamped counts. No host integration is mocked, and the extension contains no CDP code.

The optional `@responding` continuation adds a speaker-derived, nonanimated cue during the next message's delay, without extra timing. Unit tests cover opt-in/default-off behaviour, explicit silence, zero delay, status phases, pause/resume, replay, edits/navigation and invalid directives. The host run checks “Ivo is responding…” appears during the sample delay, disappears on Pause, returns on Resume and disappears on message arrival.

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
