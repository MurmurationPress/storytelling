# Story Teller — scene preview slice

A local VS Code extension for adapting completed books into presented story beats. This is a **provisional authoring experiment**, separate from the EPUB experiments. It does not replace their publication format, runtime or accepted artifacts.

## Try it

Requires desktop VS Code 1.95+ and Node.js 22+ (Node 24 recommended).

1. Open **this directory** (`tools/story-teller`) as a VS Code folder.
2. In its terminal, run `npm ci`, then `npm run build`.
3. Press **F5** and select **Story Teller: Extension Development Host**. The launch configuration builds the browser player and opens the sample folder in a separate development window.
4. In that new window, open `lantern.md`. Run **Story Teller: Preview Scene** from the Command Palette.
5. Use **Next** to reach a chat beat, then **Play**. **Pause/Resume** freezes/restores its remaining delay; **Replay Beat** resets the current beat and starts it again. **Previous**, **Next** and **Restart** remain manual. Edit the Markdown without saving: the current beat resets to ready-to-play.

Alternatively, after building, from this directory:

```sh
code --new-window --extensionDevelopmentPath="$PWD" "$PWD/samples"
```

The preview stays attached to the document used to open it, even when another editor is selected. Run the command on another Markdown document to open a separate preview. Repeating it for the same document reveals its existing panel. Closing a panel disposes its listeners. Source editing uses the normal VS Code editor; the preview never writes to the document.

## Provisional syntax

- Ordinary Markdown is prose (headings, emphasis, lists, quotations and code supported).
- A standalone `---` line separates beats, even without surrounding blank lines. It takes priority over Markdown's setext-heading interpretation. Use `***` for a horizontal rule. Up to three leading spaces are permitted; indented code is literal.
- If the file starts with `---`, the next standalone `---` or `...` closes initial YAML frontmatter. Frontmatter is recognised and excluded, **not evaluated or used as configuration**. A BOM and CRLF are supported. An unclosed initial block warns and stays readable. Avoid starting a scene with a separator unless it is frontmatter.
- A top-level fenced block with exactly `chat` as its language contains one `Speaker: message` per nonblank line. The first colon followed by whitespace divides speaker and message. Messages are literal text, not nested Markdown. Keep each message on one source line; editor word wrapping is fine.
- Prose and any number of chat blocks can share a beat, in source order.
- Separators inside backtick/tilde fences stay literal. Quoted/list-nested fences remain prose code blocks. Empty beats are omitted.
- Invalid/empty chat blocks remain readable code with a warning; no partial dialogue is discarded.

Example (the [fictional sample](samples/lantern.md) demonstrates all three beat arrangements):

````markdown
---
title: A fictional example
---
The receiver clicked.

---

```chat
Mara: Are you there?
Ivo: Yes. By the lantern.
```

---

She stepped onto the jetty.

```chat
Mara: I can see the light.
```

The water held its reflection.
````

## Timed chat (provisional directives)

Original `Speaker: message` fences still work unchanged. Timing directives are lines **inside** a chat fence:

````markdown
```chat
@viewer Mara
@ticks on
Mara: Are you there?
@delay 1200ms
@responding
Ivo: Yes. By the lantern.
@pause 900ms
Mara: I can see the light.
```
````

- `@delay Nms`: replace the default delay **before the next message** (integer 0–60000ms). It applies once. A pause before that message is additional. Repeated pending overrides or an unused trailing override are errors.
- `@responding`: show “Speaker is responding…” during the **next message’s delay**, using that message’s speaker, **only when the speaker differs from `@viewer`**. Viewer messages never show it; without an explicit viewer, no responding cue is shown. Applies once, with either the default delay or `@delay`; adds no time. It disappears when the message arrives or playback is paused/cancelled, and returns on Resume. It is absent in ready/completed state, during explicit pauses/status phases and for zero delays. Duplicate/unconsumed directives are diagnosed. This is an authored cue, not real typing activity; there is no animation under either motion preference.
- `@pause Nms`: add silent active time at that position (integer 1–60000ms). It never appears as a message. A trailing pause delays following prose/completion too.
- `@viewer Speaker`: exact speaker name of the viewing participant, scoped to this chat fence. Names may contain spaces. Header only, before any message/pause.
- `@ticks on` / `@ticks off`: optional header, once, **off by default**. On requires a viewer matching a speaker in the fence. Only that participant's outgoing messages get marks, at their bottom right. Incoming messages get none.

No other directives, units, fractions or negative values are accepted. Invalid blocks stay readable code with a diagnostic explaining why; they never partly execute. Timing is editorial metadata, separate from dialogue wording.

**Default before-message delay:** `clamp(400 + 35 × Unicode code-point count, 800, 4000)` milliseconds. The minimum avoids an unreadable rush of short messages; length adds a restrained composition delay; the maximum avoids making long messages feel stalled. This is a starting editorial heuristic, not a reading-speed or delivery estimate. There is no automatic progression to another beat.

With ticks enabled, a revealed outgoing message immediately receives one tick (`delivered`), then two (`read`) after **600ms of active playback**. This is an authored presentation effect, not network delivery, actual reader attention or telemetry. The status phase is part of the linear sequence: the following message's own delay starts afterwards, and following prose waits for all status/pause phases. Replay resets both ticks and messages. These deliberately simple effects do not model a messaging service.

A new beat is **ready**, with only its leading prose readable. Play starts sequential whole-message reveals. All components retain source order: prose after a chat waits for that chat's last message, status and authored pause. Pause retains the exact remaining active delay. Resume continues; Replay Beat clears all progress and immediately starts that beat again. Next/Previous/Restart cancel playback and prepare the selected beat without starting it. Completion stays on the current beat. Unsaved source edits cancel playback, retain the beat where possible and reset it to ready.

A hidden preview pauses via VS Code panel visibility and document visibility; it does **not** resume automatically. If VS Code destroys/recreates the hidden webview, the beat is restored ready rather than restoring phase progress. Closing/disposal cancels its pending work. No session-level playback persistence is promised. Losing keyboard focus while the preview is still visible does not pause it.

There are **no reveal animations in either motion preference**. Reduced motion retains the same discrete message sequencing and delays, without typing/fading/movement effects. No timing is removed just because reduced motion is enabled.

The syntax remains a proposal, not a settled manuscript or publishing standard. Beat cards, import/export, animated typing effects and live generated dialogue remain outside this slice.

## Structure and safety

- `src/parser.cjs`: pure Markdown → scene model, using pinned markdown-it. No VS Code or DOM imports.
- `src/player.cjs`: manual navigation, timed beat sequencing and source-update reconciliation. The monotonic clock/scheduler and change callback are injectable; no host or rendering dependency.
- `src/webview.cjs`: browser renderer and small host-message adapter. Bundled with esbuild into ignored `dist/player.js`.
- `src/extension.cjs`: command, editor/document binding, webview lifetime and resource policy only.

On edits, an unchanged current beat is matched by its complete source text, choosing the nearest duplicate. Otherwise an unchanged preceding beat anchors its relative position, then the index is clamped. This is best effort: wholesale rewrites, repeated identical beats, splitting/deleting the current beat can change its identity. No persistent authored IDs are imposed in this slice. Hidden-panel recreation matches the saved beat text where possible, falls back to its ordinal, and receives the latest source; restarting VS Code is not a saved reading-session feature.

Raw HTML is escaped. Chat uses text nodes. Links render their label without navigation; images show their alt text, including local images. There is **no source asset loading** yet. The webview allows only the extension's bundled script (nonce) and stylesheet. CSP denies network connections, frames, images, inline source scripts and forms; command URIs are disabled. `localResourceRoots` excludes manuscript/workspace directories. Source is sent as structured messages after a ready handshake, never interpolated into an HTML/script string. This extension has no network client or remote-content loader.

This follows [VS Code's documented webview resource and CSP guidance](https://code.visualstudio.com/api/extension-guides/webview). Rendering uses [markdown-it's token/renderer API](https://github.com/markdown-it/markdown-it/blob/master/docs/architecture.md), with HTML disabled and link/image renderers restricted. No general editor, custom text editing or new EPUB protocol is introduced.

## Checks

```sh
npm ci
npm run build
npm run check
npm test
npm audit
```

Optional real desktop integration check (requires a graphical Linux session, installed VS Code, Node 22+):

```sh
npm run test:host
# Override the Electron executable on another installation:
VSCODE_EXECUTABLE=/path/to/VSCode/electron npm run test:host
```

The host test launches an isolated Extension Development Host/profile with temporary documents. It uses the [documented extension test entry point](https://code.visualstudio.com/api/working-with-extensions/testing-extension) and test-only Electron CDP DOM inspection, with no installed-extension changes. CDP is a **test harness**, not part of the extension. Logs/profile remain in the printed temporary directory. It closes only its own process. Windows/macOS host-runner paths are not verified.

See [RESULTS.md](RESULTS.md) for executed checks and limits. No publication, marketplace release, PR merge or deployment is part of this slice.
