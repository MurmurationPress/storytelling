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
- A top-level fenced block with exactly `chat` as its language contains one `Speaker: message` per nonblank line. The first colon followed by whitespace divides speaker and message. Messages are literal text, not nested Markdown. Continue a message on the next line with `  | ` (two spaces, a pipe, a space); everything after that prefix is message text, including blank lines, `Speaker:` text or directive-looking examples. Continuations must follow a message, not a timing/control line. Editor word wrapping still needs no continuation syntax.
- Prose and any number of chat blocks can share a beat, in source order.
- Separators inside backtick/tilde fences stay literal. Quoted/list-nested fences remain prose code blocks. Empty beats are omitted.
- Invalid/empty chat blocks keep their dialogue as readable code with a warning and do not partially execute; authoring-control lines are omitted from that fallback.

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

Original `Speaker: message` fences still work unchanged. Timing directives work inside chat fences and at top-level component boundaries. Chat example:

````markdown
```chat
@title Lighthouse radio
@viewer Mara
@ticks
@responding
Mara: Are you there?
@delay 1200ms
Ivo: Yes. By the lantern.
@pause 900ms
Mara: I can see the light.
```
````

- `@delay Nms`: replace the default delay **before the next message** (integer 0–60000ms). It applies once. A pause before that message is additional. Repeated pending overrides or an unused trailing override are errors.
- `@responding`: in the header (before messages/pauses), enable “Speaker is responding…” during **every non-viewer message’s delay** in this chat, using the message’s speaker. Viewer messages never show it or consume the header setting; without an explicit viewer, no cue is shown. For existing authored passages, `@responding` placed between messages/pauses still applies only to the next message. Both forms use the default delay or `@delay` and add no time. It disappears when the message arrives or playback is paused/cancelled, and returns on Resume. It is absent in ready/completed state, during explicit pauses/status phases and for zero delays. Duplicate headers and duplicate/unconsumed per-message directives are diagnosed. This is an authored cue, not real typing activity; there is no animation under either motion preference.
- `@pause Nms`: add silent active time at that position (integer 1–60000ms). It never appears as a message. A trailing pause delays following prose/completion too.
- `# Title` (or existing `@title Title text`): optional plain-text chat heading, scoped to this fence. Put it once before messages/pauses. It appears when playback reaches the chat (before the first message), adds no time, and stays visible through Pause/completion. Titles may contain spaces and colons; Markdown/HTML is not executed or formatted. Untitled chats retain their previous appearance.
- `@viewer Speaker`: exact speaker name of the viewing participant, scoped to this chat fence. Names may contain spaces. Header only, before any message/pause. The viewer’s messages are offset as outgoing messages independently of ticks.
- `@ticks`: optional flag header, once, **off by default**. Requires a viewer matching a speaker in the fence. Omit the flag to disable ticks. The older `@ticks on` / `@ticks off` forms remain accepted for existing drafts; new examples use the bare flag. Only that participant's outgoing messages get marks, at their bottom right. Incoming messages get none.

No other directives, units, fractions or negative values are accepted. Invalid chat blocks keep dialogue as readable code with a source-line diagnostic; control lines are omitted and they never partly execute. Timing is editorial metadata, separate from dialogue wording.

### Timing across components

Use standalone `@delay Nms` and `@pause Nms` outside fences at a **top-level Markdown block boundary**. Put a blank line before them after prose; after a closed code fence or at the beginning of a beat, no preceding blank line is needed. Consecutive directives may share adjacent lines. The following prose/chat may start on the next line or after a blank line.

All adjacent ordinary Markdown (including several paragraphs, headings or lists) forms **one prose component**, up to the next top-level timing directive or chat component. It appears together, never sentence by sentence. Its default entry delay is **0ms**, so untimed leading prose remains immediately readable in ready state.

- Outside `@delay` replaces the next component's entry delay. Before prose it replaces zero; before chat it replaces **the first message's** calculated delay. It creates no extra chat-entry timer and leaves later messages unchanged. Leading in-chat pauses remain additive.
- Outside `@pause` adds silence before the next component's existing timing. Consecutive pauses add. A delay can precede or follow pauses and still targets the next prose/chat component.
- A trailing pause holds playback open after visible content, then completes the beat. A trailing delay is an error: its source line is reported and it cannot carry into the next beat.
- Multiple outside delays aimed at one item, including an outside delay plus an in-chat delay before the first message, are diagnosed with source locations. The **first authored override is retained**; later conflicting overrides are ignored. Fix the diagnostic rather than relying on conflicts as authoring syntax. Existing duplicate directives entirely within chat still invalidate that chat.
- Malformed outside timing directives are diagnosed and omitted without adding time. Recognised control lines are never story content. A standalone `@responding` outside chat is **not** a prose indicator; it remains ordinary Markdown. Use it only inside chat.
- Inside fenced/indented code, inline code, blockquotes, lists, and ordinary paragraph continuations, timing-looking text stays literal. Escape `\@delay` or use code formatting to write literal examples at the start of a top-level block. Only `@delay` / `@pause` are reserved outside chat. YAML frontmatter is not interpreted as timing.

Example: **prose → silence → chat → delayed prose → trailing silence**:

````markdown
The radio crackled.

@pause 700ms
@delay 1200ms

```chat
@viewer Mara
@responding
Ivo: I'm here.
```

@delay 1000ms

Mara lowered the receiver.

@pause 800ms
````

From Play: 700ms silence, then a 1200ms first-message delay showing “Ivo is responding…”, so the message arrives at **1900ms**. The prose appears at **2900ms**; the trailing pause completes the beat at **3700ms**. There are no ticks in this example. With only `@pause 700ms`, the first message would retain its normal delay; with only `@delay 1200ms`, it would arrive at 1200ms. Before prose, `@pause 700ms` + `@delay 1200ms` similarly gives 1900ms, because prose's default is zero. Optional outgoing read-status phases still add their documented 600ms where enabled.

The [sample](samples/lantern.md) keeps the accepted chat timing and adds delayed prose after beat 2, and a 700ms silence + 1200ms first-message override, delayed closing prose, and trailing pause in beat 3. Syntax remains provisional. The native Insert helpers below now provide small authoring conveniences; there is no visual card editor or general authoring framework.

**Default before-message delay:** `clamp(400 + 35 × Unicode code-point count, 800, 4000)` milliseconds. The minimum avoids an unreadable rush of short messages; length adds a restrained composition delay; the maximum avoids making long messages feel stalled. This is a starting editorial heuristic, not a reading-speed or delivery estimate. There is no automatic progression to another beat.

With ticks enabled, a revealed outgoing message immediately receives one tick (`delivered`), then two (`read`) after **600ms of active playback**. This is an authored presentation effect, not network delivery, actual reader attention or telemetry. The status phase is part of the linear sequence: the following message's own delay starts afterwards, and following prose waits for all status/pause phases. Replay resets both ticks and messages. These deliberately simple effects do not model a messaging service.

A new beat is **ready**, with only its leading prose readable. Play starts sequential whole-message reveals. All components retain source order: prose after a chat waits for that chat's last message, status and authored pause, plus any outside timing assigned to it. Pause retains the exact remaining active delay. Resume continues; Replay Beat clears all progress and immediately starts that beat again. Next/Previous/Restart cancel playback and prepare the selected beat without starting it. Completion stays on the current beat. Unsaved source edits cancel playback, retain the beat where possible and reset it to ready.

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

## Convert manuscript chats in the current document

**Try on a copied scene first.** In the Development Host, open `conversion-example.md` (fictional), or an editable copy of your manuscript scene. Run **Story Teller: Convert Chats in Current Document** from the Command Palette.

1. The command captures the active Markdown buffer, **including unsaved edits**, and opens a native VS Code diff of two read-only snapshots. Its title/notification gives the conversion count and review-warning count.
2. Inspect the diff. Choose **Review Warnings** to see every warning with source line in the **Story Teller Chat Conversion** output channel. The fictional example proposes two conversions and leaves one subtext-bearing block unchanged with a warning.
3. Choose **Apply** explicitly, or **Cancel**/dismiss the notification to leave the source intact. Apply edits only that captured document in one undoable editor operation. It does not save the file. One **Ctrl+Z** restores the complete pre-conversion buffer, including earlier unsaved edits.
4. If the source changed after preparation, Apply is refused. **Regenerate** prepares a new diff from that same document's current buffer; Cancel preserves it. A changed-and-undone document version is still stale. A closed document is never reopened/applied automatically.
5. Run **Story Teller: Preview Scene** to inspect/play the result. Run conversion again to check the zero-change result. No beat separators or surrounding prose are inserted/reordered.

Only explicit, top-level **`chat` fences** with the inspected manuscript wrapper format are converted. Ordinary speech, arbitrary `Label: text`, blockquoted/list-nested chats, indented code, unrelated/literal-example fences and initial YAML frontmatter are protected. Unclosed frontmatter/fences and historical `chat-old` variants are left for review. Existing valid Story Teller blocks remain byte-for-byte unchanged, including their existing title spelling/settings.

Supported manuscript subset:

````markdown
```chat
# Harbour link
> Ari
{{Ari|Is the lamp still lit?|}}
{{Bo|First line.
Second line.|}}
```
````

Becomes:

````markdown
```chat
# Harbour link
@viewer Ari
Ari: Is the lamp still lit?
Bo: First line.
  | Second line.
```
````

Rules derive from the actual manuscript and its companion renderer, **not a list of guessed speaker names**:

- `{{speaker|body|subtext}}` / `{{speaker|body}}` supply explicit identities and message boundaries. An empty speaker inherits the preceding resolved speaker. Literal escaped separators `\|` become message text `|`; punctuation, Unicode, blank/indented message lines and order are retained.
- A single leading `# Title` supplies the chat title, emitted inside the fence as `# Title`. Multiple or interleaved channel comments are ambiguous and remain unchanged.
- A single leading `> Participant` is the manuscript's explicit right-aligned participant declaration and maps to `@viewer Participant`. No viewer is guessed from the first speaker. Multiple/changing/centred/formatted participant declarations are review-only.
- Existing explicit Story Teller settings within a wrapper block can carry through: `@viewer`, bare `@ticks`, `@responding`, `@delay Nms`, `@pause Nms`. Generated settings use the current canonical vocabulary. The manuscript's viewer/title alone never causes ticks, responding or timing settings to be invented. The converter adds no old tick-form compatibility; the parser's pre-existing aliases remain as before.
- **Nonempty subtext**, dividers, embedded artwork, nested/inline message wrappers, unresolved/formatted speaker identities, unknown settings and mixed/ambiguous container content leave the **entire container unchanged**, with a review warning. These may carry meaning that this player's supported syntax cannot safely express. Speaker names containing `:` cannot be losslessly represented by the current message grammar and are flagged.
- Converted multiline messages use `  | ` continuation lines and reveal together as one message. The existing default-delay formula sees their full text; no extra timing or typing effect is added. A blank initial message line can be represented by `Speaker: ` followed by continuations.
- No source dialogue or supporting narration is editorially adapted by this command. The converter preserves wording and content; it does not translate Markdown/Obsidian embeds into new visual components.

The implementation is `src/convert.cjs` (pure function returning text, precise replacement ranges/count/warnings) plus `src/conversion-command.cjs` (VS Code review/apply integration). It uses the [documented read-only content-provider API](https://code.visualstudio.com/api/extension-guides/virtual-documents), native `vscode.diff`, document-version checks and one `TextEditor.edit` with undo stops. It does not write files or run manuscript code.

### Source inspection and limits

Read-only inspection used authoritative `tedwarddick/PrimeTrilogy` revision **`79edd0e365e3ae6ab5f5e19413d6fe12d679a518`**, `Books/CONSTRAINT/COLLISION/Art.md`, alongside Ted's local adaptation. A local Books-tree survey and `Books/CONSTRAINT/DECENTRALISATION/Flock.md` supplied additional same-format examples. The format definition/renderer was inspected at `MurmurationPress/murmuration-writing-companion` revision **`08ec248d6bdd1cef33cd1eab255df24430a8e9fa`**, `src/chat/ManuscriptChat.ts`, `src/chat/ManuscriptChatPlugin.ts` and `Help/Manuscript_Chat.md`. The inspected renderer distinguishes body/subtext, inherited speaker, channel comments, participant alignment and dividers. Unsupported meanings are flagged rather than discarded.

Only fictional/minimal fixtures are committed. The original manuscript repository, local `Art.md`, Component Types notes and EPUB artifacts are not modified. This is not a whole-book importer, an Obsidian parser or a promise that every historical chat dialect is supported. Review the diff and warnings before Apply.

## Chat authoring: Insert and Wrap

**Accepted direction:** Ted has accepted the Markdown/live-preview workflow, chat playback and pacing, and reports that conversion is good. The replacement (`@delay`) versus additional-silence (`@pause`) distinction remains unchanged. **New and awaiting Ted's acceptance:** the Insert/Wrap workflow and these context guards. Completing this authoring slice is not a claim that every Art adaptation or the separate managed-EPUB foundation is finished.

Keep the original manuscript intact. Work in a **separate Markdown EPUB+ adaptation**, for example `Art.epubplus.md`, using VS Code's normal Save As/copy workflow. No packaging/export is performed here. Ted's existing standalone `---` lines in Art are useful starting beat boundaries: keep them while adapting, then deliberately add/change them only as an editorial action. Conversion neither inserts nor rewrites them.

`---` means a **manual story-beat boundary in the adaptation**, not an automatic sentence/paragraph break. The initial YAML `--- … ---` (or `...` close) remains metadata. Separators inside fenced/indented code or literal quoted/list examples are not beats. An opening `---` is reserved for frontmatter; the boundary helper refuses to insert it before any story content. Parsing, conversion and insertion share structural source inspection.

Run **Story Teller: Insert…** from the Command Palette, or right-click in a Markdown editor and choose the same command. The native picker offers:

| Item | Inserts / meaning |
| --- | --- |
| Chat block | A fenced chat with `# Title`, `@viewer Name` and two sample messages; optional features off |
| Beat boundary | A standalone `---`, with surrounding block spacing |
| Delay | `@delay 1200ms`; editable numeric tab stop; replaces the next item's normal delay |
| Pause | `@pause 800ms`; editable numeric tab stop; adds silence before the item's existing delay |
| Responding | Bare `@responding`, inside chat only; header enables all non-viewer cues |
| Ticks | Bare `@ticks`, once in a chat header with an explicit matching viewer |
| Wrap Selection as Chat | Separate explicit wrapping action; selected content is kept verbatim, not converted |

The Chat snippet uses native **Tab / Shift+Tab** navigation: title → viewer → first message → other speaker → reply → final caret. The viewer field is linked to the first message's speaker. Edit the placeholders to the actual passage; the example words/settings are an authoring stub, not manuscript content or invented dialogue to retain. `@ticks` and `@responding` are **not** enabled by the Chat snippet.

Example after editing a chat stub and explicitly opting into the flags:

````markdown
```chat
# Harbour link
@viewer Ari
@ticks
@responding
Ari: Is the lamp still lit?
Bo: Yes. I'll leave it on.
```
````

Ari is the viewer/outgoing participant and receives the offset and optional authored ticks. Bo is eligible for the responding cue during Bo's message delay. Existing `@title` remains readable; helpers/conversion generate `# Title`. Both flags remain canonical bare directives. Place Delay/Pause inside a chat for message timing or outside for the next prose/chat component; the established timing totals above still apply.

### Context and safety

- Use one caret or one contiguous selection. Regular insertion **never replaces a nonempty selection**. Clear it or choose Wrap explicitly.
- Chat fences/boundaries cannot be inserted inside a chat. Literal fences, inline code, frontmatter, quoted/list contexts and fence-delimiter lines are guarded. Put the caret on a normal blank line for the simplest result.
- Responding/Ticks outside chat produce a warning and no edit. Flags require actual `@viewer Name` syntax; ticks belong in the header, must not duplicate a setting and require a matching speaker. Header responding must not be duplicated. Between-message responding retains the existing per-message behaviour.
- Inside chat, use a blank line or a message boundary. A directive is never inserted in the middle of a message or a continuation. Helpers add line/block spacing; they do not rewrite existing words.
- Wrap is also available separately as **Story Teller: Wrap Selection as Chat** and on the Markdown selection context menu. It adds fences around plain selected content using one editor edit, preserving `$`, backslashes, message wrappers and text literally. It refuses selections crossing beat boundaries/frontmatter, containing fences, or selecting only part of a quote/list. Complete quoted/list blocks can be wrapped verbatim; that still does not convert their syntax. It does **not** claim that selected prose or `Label: text` has become valid dialogue. Review the result; run Convert Chats only if it contains a supported manuscript container.
- Cancel the picker with **Escape**. If the source or selection changes while choosing, insertion is refused so it cannot land at a stale position. No insertion/wrapping operation saves the file. The initial insertion or wrap is one Undo action; later placeholder typing uses normal editor Undo behaviour.

These are [native VS Code snippets/pickers](https://code.visualstudio.com/api/references/vscode-api), not a text editor or storyboard UI. Literal examples and multi-cursor/complex structured wrapping can still be edited manually with the existing editor; the helpers deliberately warn rather than guess.

### Continuing Art

1. Open your existing adaptation, or make a separate `Art.epubplus.md` copy of the original. Keep original manuscript text and existing beat lines intact.
2. Run **Convert Chats in Current Document**, inspect the diff and warnings, and Apply only the recognised conversions. The conversion does not add optional flags or alter boundaries.
3. At a blank line **inside** a converted chat, use Insert for optional Ticks/Responding or timing. Keep header flags before messages/pauses. Use Insert → Chat block for new authored structure; replace its placeholders with the actual source words.
4. Use **Preview Scene**, then Play. Use manual Previous/Next to review the existing Art beats. If you deliberately need another boundary, put the caret between components outside fences and use Insert → Beat boundary.
5. Try Tab-linked viewer editing, Escape cancellation and one Undo on a fictional/copy scene first. Save the adaptation yourself when satisfied; neither command saves or overwrites the original.

A read-only local Art snapshot had four existing beat boundaries (five beats), one valid manually adapted chat and 29 remaining manuscript-style chat containers. In-memory conversion preserved all boundary bytes and the beat count exactly. The remaining legacy blocks need conversion before playback; existing Obsidian image embeds remain outside this increment's supported components. No manuscript content is included in the committed tests or automatically repaired by this exercise.

## Chat pace (awaiting Ted’s acceptance)

Ted accepts the existing chat experience and pacing, but finds that long exchanges accumulate too much waiting. Pace changes automatic waits locally, without changing authored silence or the global default:

````markdown
```chat
# Harbour approach
@pace brisk
@viewer Mara
@responding
Ivo: The lantern is steady.
@pause 900ms
@delay 1200ms
Mara: I can see it now.
```
````

Use `@pace normal`, `@pace brisk` or `@pace deliberate` before the first message in that chat. Omission means Normal. Only one declaration is allowed; unknown values, duplicate declarations and declarations after a message produce line-numbered diagnostics. Continuation text and literal Markdown examples remain literal. Pace does not carry into the next chat or affect prose.

Normal keeps the existing formula exactly: `min(4000, max(800, 400 + 35 × Unicode character count))` milliseconds. Apply the pace multiplier **after** that bound, rounding each result with `Math.round` to whole milliseconds. Multipliers are centrally defined in `src/pace.cjs`: Normal **1**, Brisk **0.7**, Deliberate **1.3**. Effective automatic ranges are therefore 800–4000ms, 560–2800ms and 1040–5200ms. Bounding first preserves the established length model; scaling that wait makes Brisk a modest reduction and Deliberate a modest increase. No adaptive acceleration is used.

An explicit `@delay` replaces the calculated wait entirely, including at a chat boundary; it is never scaled. `@pause` adds its original silence before the next wait. A 900ms pause followed by an explicit 1200ms delay therefore remains **2100ms at every pace**. Responding occupies the effective incoming-message wait itself, with no extra timer. Outgoing read ticks retain their separate 600ms phase. Reduced motion still preserves sequential message delivery.

To author a setting, place the caret inside the chat, run **Story Teller: Insert… → Pace**, then choose **Normal**, **Brisk** or **Deliberate**. The helper places configuration directly after the opening fence, replacing/moving existing declarations instead of adding duplicates. It preserves messages and makes one unsaved, undoable operation. A selection must remain entirely inside the same chat. Outside a chat it explains where to put the caret. New chat snippets continue to omit pace.

To compare, launch the Development Host as above and open `lantern.md`. Its last two beats (4 and 5) contain the same eight-message fictional conversation at Normal and Brisk, both with `@responding`, a 900ms pause and a 1200ms explicit delay. Play each; Replay Beat repeats it. Total waits are **18,865ms Normal** versus **13,835ms Brisk**. The pause/delay remain unchanged. Try the Pace helper on either block, Undo, and edit the value to `deliberate` for a slower comparison. Beat navigation remains manual; source edits reset the current beat to ready.

Imagery is the next feature, outside this increment. Existing manuscript, conversion and EPUB work remain separate.
