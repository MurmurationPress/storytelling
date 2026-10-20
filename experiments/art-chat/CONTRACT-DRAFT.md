# Initial component contract — presentation v1, draft 1

Progress on #3 alongside #6. **Draft, not stable.** This is an additive profile of the existing PRIME presentation bridge, not a second protocol or EPUB standard. Keep #3 open. The accepted immutable PRIME package exercises the original profile through the same updated host; Art exercises versioned identities and opaque phase snapshots. PRIME has not yet been migrated to the new snapshot profile or extracted into the reusable renderer requested by #5.

## Small shared boundary

The publication declares one component occurrence per resource. The reader owns committed presentation, toolkit navigation, connection identity and persistence. The component owns its local progress, timing, meaning, capabilities and completion. Neither completion nor component acknowledgement gates a page turn.

Use the existing `prime:connect` → `ready` → ordered `presentation` / `progress` MessageChannel exchange, `version: 1`, and pre-serialization host marker `prime-presentation-v1`. Names are retained for compatibility; they do not restrict the renderer to PRIME. A blocking publication head script reserves the managed surface before body paint. No marker means readable static content, optionally manual activation where scripts work. No publication scripts means static content and hidden controls.

New Art resources declare `murmuration-component` metadata:

```json
{
  "publication": "art-chat-v1",
  "resource": "ask.xhtml",
  "component": "art.robin-presence",
  "contract": "presentation-v1-draft1",
  "contentVersion": "sha256 of this sequence's words, source positions and timing settings",
  "stateVersion": 1
}
```

`component` is a stable occurrence ID; the actual DOM surface remains `#surface` in this slice. A fresh random `instance` identifies the loaded document, not a durable story occurrence. `sequence` is monotonically increasing within that connection. Publication/resource/component, instance, version and sequence checks reject stale messages before state mutation. New-profile messages also match contract/content/state versions. Known legacy PRIME is an explicitly supported profile with its original identities and scalar position; this is not general capability negotiation for arbitrary publications.

The host has two explicit trusted package choices, not a catalogue or arbitrary loader. `?book=art` opens Art; the unchanged default opens the accepted PRIME EPUB. It reads component metadata through the existing toolkit content hook. The shared `presentation.js` contains only identity/order checks, bounded snapshot-envelope checks and a persistence key—not rendering, pagination or a framework.

## Initial state, enter and leave

After `ready`, the host always sends an inactive snapshot first. Only the first `presentation` may carry `restore`; the component initializes once, then considers actual presentation. A late subscriber receives the current decision rather than depending on hearing a past turn. Unknown/invalid snapshots reset Art to its readable initial performance state and report rejection; changed content/state versions address a different persistence slot, so no automatic migration occurs.

Enter still requires the existing host decision: primary rendition, settled navigation, displayed resource range, current connected content frame, visible host container and component/frame intersection in the reading viewport. Loading, a locator alone or intersection within the deliberately invisible second rendition cannot activate it. During a queued transition every component is inactive; intermediate rapid-turn pages do not perform. Host foreground/resize/restore causes reconciliation, not automatic publication-side guessing. Geometry is still scoped to these known single-surface resources, not arbitrary clipping/occlusion.

A component cancels work on leave and preserves meaningful progress. Returning resumes active time; elapsed invisible time is not caught up. Browser hiding/pagehide may stop work but never supplies positive arrival. Restored completed state stays complete with optional replay. A local reveal/replay chosen before delayed registration takes precedence over the initial stored snapshot in Art; otherwise restoration could undo the reader's current action. PRIME parity for that edge remains a follow-up.

## Opaque progress and persistence

Art's snapshot is:

```json
{
  "contentVersion": "matching component content hash",
  "stateVersion": 1,
  "done": false,
  "progress": { "shown": 1, "phase": "typing", "remainingMs": 400 }
}
```

The reader validates the versioned envelope (maximum 16 KiB) and stores it under publication/resource/occurrence/contract/content/state identity. It does not infer messages, silence or character timing from this object. Art validates its own bounds, valid phases and remaining duration before applying it. The invisible preload cannot overwrite primary state. Legacy PRIME continues using `saved.output`; Art uses `saved.components` slots. The host's persistence mechanism is shared; its legacy boundary remains deliberate rather than silently reinterpreting old state.

Art progress consists of revealed message count plus active delay/response phase and remaining milliseconds. A 50ms maximum update interval checkpoints active work; leave additionally consumes the current visible interval and stops timers. Reopening restores the stored checkpoint, not an elapsed wall-clock deadline. This is not a crash-atomic guarantee for every painted millisecond; an abrupt close can repeat up to a checkpoint interval. localStorage is origin/profile-specific and can fail. In-memory reading continues if storage is unavailable; cross-device and crash recovery are not established.

## Capabilities, settings and local actions

| Concern | Art | Accepted PRIME profile |
| --- | --- | --- |
| Presentation | Shared host enter/leave, initial inactive | Same wire/host presentation path |
| Content/settings | Four pinned source lines; per-message delay and response-cue duration in a small JSON fixture | Existing YAML and fixed burst/interval settings, untouched artifact |
| Progress | Messages, phase, remaining active milliseconds | Character position/completed scalar, original storage |
| Completion | Last selected message has arrived | Complete YAML is readable |
| Replay | Reset only this occurrence, perform only while presented | Existing accepted replay behaviour |
| Immediate reveal | All selected messages, completed and persisted; overrides late initial restore | Existing accepted complete-output control |
| Reduced motion | Static original transcript and narration; explicit status, replay disabled | Existing explained static YAML |
| Unsupported host | Static complete transcript; optional manual play replaces it locally | Existing explicit-start/static fallback |
| No script | Original static transcript/narration; controls hidden | Original static YAML |

Art reports `replay`, `reveal`, `reduced-motion`, `static`, `pause-on-leave` on `ready` and progress. The host knows the legacy PRIME capability set. These are descriptive capabilities, not an RPC to execute arbitrary host commands. Local buttons perform local actions; no second action protocol or manual Pause UI is introduced. Reader entry is not a Play click, and replay must not imply permission to progress invisibly.

Settings stay separate from words. The Art JSON is a hand-audited fixture, not a chosen storyboard language. Hashing the complete sequence (including timing/source positions) intentionally invalidates old progress when settings change; less conservative migration is an open question. No unsent messages, dramatic pauses or silent story beats are invented to exercise a capability.

## Executable examples and open questions

`node contract-examples.cjs` exercises actual shared helpers with PRIME and Art envelopes, old instances/sequences, invalid fields, content/state changes and distinct occurrence keys. `test.cjs` uses real EPUB.js turns for phase interruption, preload, restore and fallback. `../prime-reader/test.cjs` still exercises the accepted PRIME package through the updated host. Mock/helper examples do not substitute for temporal reader evidence.

Before calling this stable: exercise the new snapshot/version/action semantics with a reusable PRIME renderer (#5), decide capability requirements versus this known-pair adapter, test meaningful authored silence against a passage that actually has it, decide content/state migration and storage-unavailable UX, evaluate nonvisual/touch use and actual iPad/Safari (#4), and complete integrated packaging/fallback coverage (#7). Do not add unsent typing or a general component SDK to answer those questions speculatively.
