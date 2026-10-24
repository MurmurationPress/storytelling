# Story Teller

Story Teller previews a separate Markdown adaptation as manually selected story beats in desktop VS Code. It is an authoring tool, separate from the managed EPUB experiments. The syntax is provisional; preview and conversion never save a document for you.

## Install and open an adaptation

Requires desktop VS Code 1.95 or later. Node.js is needed only to build the extension from source.

To install the local milestone, open VS Code's Extensions view, choose **… → Install from VSIX…**, and select `story-teller-0.11.1.vsix`. Reload the window if asked. If replacing an older local build, confirm **Story Teller 0.11.1** in Extensions before testing. The VSIX includes its runtime JavaScript, stylesheet and production Markdown/YAML parsers; it does not include manuscript material or fictional development samples.

Make a *separate* Markdown adaptation of a completed chapter. Keep the original manuscript unchanged. Save the adaptation before linking images so relative paths have a base directory. Open it in VS Code, then run **Story Teller: Preview Scene**. The preview opens beside that document, with the first beat ready. **Play** starts it. **Next** turns one beat; with **Autoplay** enabled (the default), that next beat starts performing immediately. Turn the toggle off to make Next leave it ready for Play. The preference is remembered in VS Code, separately from Markdown. When a beat finishes, including a trailing authored pause, a **Next →** button appears below its content. It performs the same page turn as the top Next button; the top control remains available throughout. On the final beat, **End of scene** appears instead. **Previous** shows the preceding beat fully revealed and silent for rereading, with its bottom Next button. **Replay Beat** resets and starts the current beat again. **Restart** returns to beat one in its ready state, showing only untimed leading content; it never autoplays. **Pause/Resume** preserves the remaining wait. Beat turns remain reader-controlled: completion never advances to another beat or scene. Source edits and closing the preview cancel pending playback; unsaved edits reset the current beat to ready. Hiding the preview pauses it, and returning never resumes automatically.

Use **Story Teller: Preview This Beat** from the Command Palette or Markdown editor context menu to open or reuse the preview at the cursor's beat. **Show Beat in Source** reveals and unfolds that beat in its own document. Cursor movement alone does not change playback. Standalone Markdown documents retain their own previews; outline reading uses the shared reader described below.

To try page-turn autoplay in the installed update, open a saved copy of `samples/lantern.md` in VS Code and run **Story Teller: Preview Scene**. Press Play for the opening beat, then Next: the destination chat should begin on that turn. Turn **Autoplay** off and press Next again: the new beat should wait for Play. Press Previous to reread the prior beat complete and silent, then Replay Beat to perform it again. Restart should return to beat one ready, even with autoplay enabled. For sound and type-out, open a saved copy of `samples/typeout.md`, leave Mute off, turn Next into a type-out beat, then hide and return to the preview; playback should remain paused until Resume. The sample files are development examples and are not bundled in the VSIX.

For the bottom control, Play a beat with a trailing `@pause` and check that **Next →** appears only after the silence, below the final content. Activate it with Enter or Space; the next beat should follow the Autoplay toggle. Previous should show its completed beat with the bottom control immediately. Replay Beat should remove the control until that performance completes. At the final beat, look for **End of scene**. The button never takes focus. When following is active, the reader scrolls just enough to show it; during rereading, it never pulls the page down.

The preview follows newly revealed content when it passes below the reading viewport, including the end-of-beat Next button. It scrolls in small, cancellable steps; reduced motion moves directly. Scroll up with the wheel, touch, scrollbar or keyboard to reread without pausing playback. When more content is below, **Follow story ↓** appears near the lower right; activate it to catch up. Scrolling back to the bottom also resumes following. A newly selected beat, Replay Beat and Restart begin at the top. Previous shows its completed beat at the top without jumping to the end. Hiding and returning to the preview preserves its position and does not resume playback. Following is a reader behaviour, not a manuscript directive.

## Keyboard authoring and outline reading

These native commands appear in the Command Palette and Keyboard Shortcuts, where they can be rebound. The defaults are scoped to the Markdown text editor, except Show Beat in Source which requires the Story Teller reader to be active. Press and release the first combination before the second; personal keybindings are never changed.

| Command | Linux / Windows | macOS |
| --- | --- | --- |
| Insert Beat | Ctrl+K, Shift+B | Cmd+K, Shift+B |
| Preview This Beat | Ctrl+K, Shift+P | Cmd+K, Shift+P |
| Show Beat in Source | Ctrl+K, Shift+S | Cmd+K, Shift+S |
| Collapse All Beats | Ctrl+K, Shift+C | Cmd+K, Shift+C |
| Expand All Beats | Ctrl+K, Shift+E | Cmd+K, Shift+E |

Insert Beat prompts for an optional title; Enter with an empty field makes an untitled beat, Escape cancels. It uses the existing Insert helper, refuses selections rather than replacing them, and prevents nested boundaries inside fenced components. One Undo reverses the insertion. Preview This Beat selects the caret's beat ready for Play. Show Beat in Source stops and resets playback and reveals/unfolds the matching source range. Moving the source caret alone does not change playback. Windows/macOS bindings are contributed but have not been tested on those platforms; other installed extensions can still define conflicts.

Selecting a scene in **Part–Scene Outline** opens/reuses its unsaved source and one shared reader, selects the first beat and starts it when **Autoplay** is on. With Autoplay off it stays ready. The toggle uses the same saved preference as earlier page-turn autoplay; upgrading preserves Off. Source-only file opening, Preview Scene, Preview This Beat and Restart do not autoplay. Scene changes immediately cancel the outgoing timers, responding indicators, sound and scroll work; rapid selections commit only the latest scene. A resource-root change replaces the preview panel in its existing group with a fresh security-policy lifetime; same-root scenes reuse it. Source buffers stay open. Returning to a hidden reader stays paused. Selecting from the outline consolidates open Story Teller previews into that reader; source buffers stay open. The source editor keeps focus after an outline selection so writing can continue.

An outline click cannot be relied on to unlock audio inside the webview. Visual playback continues; **Enable sound** offers a direct reader gesture when a scene uses sound and its audio context is not running. Previously enabled audio may continue to be available for later scenes. Mute is still respected. Native audio-graph checks establish activation/cleanup, not what a person heard. Ted accepted automatic scroll-follow, all five shortcuts and outline scene autoplay at `bf846888f0cbedc70328ff103eea12b9ea8b861e`. Ted also accepts supporting-note links, aliases, previews, nested panels and refresh in PR #14. Import/outline/pacing work in PR #12 is accepted. Acceptance is separate from automated/platform verification (see RESULTS).

## Supporting Markdown notes

Open the adaptation project folder containing `story-teller.project.json`. Add supporting `.md` files in the fixed **`Supporting Content/`** folder beside that manifest. There is no new setting or manifest version. New imports create the empty folder; create it with VS Code's Explorer for an existing project. Notes are excluded from discovery and cannot appear in the manifest's Part–Scene playback sequence, even if their frontmatter says `type: scene`. Preview Scene/Preview This Beat also refuse to perform a supporting note; read it through a scene link.

```text
story-teller.project.json
scenes/Two accounts.md
Supporting Content/Ted.md
Supporting Content/JANUS early.md
Supporting Content/JANUS later.md
Supporting Content/definitions/Accounts.md
assets/harbour-portrait.png
```

Write `[[Ted|Edward]]` to display **Edward** and open **Ted.md**. `[[JANUS early|JANUS]]` and `[[JANUS later|JANUS]]` both display **JANUS** and open different files; the author chooses the reference at each story point. There is no automatic entity matching, spoiler detection or timeline rule.

Targets trim surrounding whitespace. A target without a slash searches the folder and subfolders for an exact, case-sensitive filename, with `.md` optional. It must have exactly one match: two `Ted.md` files are an error, even if one is at the root. Use `[[definitions/Accounts|the accounts]]` for an explicit path or `[[./Ted|Edward]]` to select a root file. These paths are always relative to **Supporting Content**, including links inside notes. Targets use literal filenames, including spaces/Unicode, rather than URL decoding. Parent traversal, absolute paths, URLs, heading/block references and backslash paths are rejected. Symlink escapes are rejected; symlink directories are not indexed. Outside an opened adaptation project, aliases still display but note interaction reports how to open the project and add the missing folder/files.

In the reader, hover or keyboard-focus a link for a compact preview. Move into the preview without dismissing it. Click, tap, Enter or Space opens the longer note panel. Opening a panel pauses an active performance and stops its sound; it leaves the beat and reading position intact. **Escape**, **Close**, or a click outside dismisses it and returns focus to the link where possible. Playback never resumes automatically: use **Play/Resume**. Hover/focus alone leaves playback running. Notes can link to other notes; **← Back** returns to the prior note and its scroll position. Scene turns, Replay, edits and preview hiding clear the aside and invalidate outstanding loads.

Notes render ordinary Markdown, code, images and internal wikilinks. Their initial closed YAML frontmatter is omitted without evaluation. `---` is an ordinary rule in a note, not a beat boundary, and chat/typeout fences are readable code. Raw HTML is escaped and ordinary URL links stay inert. Note images resolve relative to the note file, with the existing workspace/source-directory boundaries and PNG/JPEG/WebP restrictions: `![Landing](../assets/harbour-portrait.png)` is valid in a root note. Remote/data images, unsupported formats and unsafe/unreadable resources show placeholders and diagnostics; no remote media is fetched.

Story wikilinks work in prose, chat message bodies and formatted annotation type-outs. Chat's other punctuation/Markdown-looking text retains its accepted literal presentation. A typed annotation reveals the display label's graphemes and only enables a link when the whole label is visible; target filenames do not count toward its speed or chat/prose timing. The static accessible passage remains available without per-character announcements. YAML type-outs, inline/fenced code, escaped examples and unsupported `![[...]]` embeds remain literal. Speakers, chat titles and image captions keep their existing plain-text treatment.

Save new notes to make their filenames discoverable. Unsaved edits to existing notes, and supporting-file create/change/delete events, refresh note content and source-located diagnostics without resetting the story. A visible panel refreshes in place. Missing, ambiguous or invalid links remain focusable so the reader can see a useful failure message; author warnings identify the target and correction. Editing the scene itself still uses the established ready/reset behaviour.

To try the synthetic example, open **`samples/supporting-project/` as the VS Code folder**, then select **1.1 Two accounts** in Part–Scene Outline. Hover/focus both JANUS links, open Edward, follow the accounts and go Back, then close and Resume. Turn to the annotation beat to inspect a progressively revealed link and a deliberate missing-note diagnostic. The example and its original test image are development files, excluded from the VSIX. Supporting content is available in both the extension preview and the standalone web export described below. `supporting-content.cjs` owns indexing/target resolution and content loading without VS Code; `supporting-host.cjs` adapts unsaved documents and local image resources. `SupportingReader` takes an injected `load(target)` returning safe `{id, title, html, links, media, diagnostics}` plus availability/pause/close callbacks. Requests carry the current reader instance and source revision; refreshes use a separate version and never update the scene/player. The host explicitly watches the project with [VS Code’s RelativePattern API](https://code.visualstudio.com/api/references/vscode-api#workspace.createFileSystemWatcher), rather than assuming an implicit workspace event stream. Watcher exclusions remain respected; clean buffers do not mask external file changes, while unsaved buffers take precedence. Touch, iPad, Windows/macOS and VSCodium are unverified.

## Beats and components

A standalone --- line separates beats. An optional title comment immediately after it names the new beat; the same comment may name the first beat after initial YAML frontmatter without a leading separator:

~~~~markdown
---
title: Fictional adaptation
---

<!-- beat: On the jetty -->
The old radio clicked.

---
<!-- beat: A reply -->
~~~chat
# Harbour link
@viewer Mara
Mara: Are you there?
Ivo: Yes. By the lantern.
~~~
~~~~

The title appears beside the beat number, not in reader content or timing. Untitled beats retain “Beat N”; duplicate titles are allowed. An initial --- opens frontmatter, closed by a later standalone --- or .... Frontmatter is excluded from playback and never evaluated. Separators in code fences, quotes, lists and indented code stay literal. Use *** when you want a horizontal rule in prose.

**Story Teller: Collapse All Beats** and **Expand All Beats** operate on beat folds; normal Markdown folding remains available. A folded named beat keeps its title visible. **Story Teller: Insert… → Beat boundary** asks for an optional title; Escape cancels, an empty title makes an untitled beat. Insert outside fences. All helpers use the normal editor and Undo.

Ordinary Markdown becomes prose. With automatic prose pacing off (the default when unset), adjacent paragraphs, headings and lists form one prose component until a chat, image, type-out or timing directive separates them. When enabled, ordinary top-level paragraphs reveal one at a time, fully formatted; lists, blockquotes, tables and code remain intact prose blocks and do not receive their own automatic reading interval. Leading untimed prose is immediately readable in ready state. Prose after a timed component waits for that component. Ordinary Markdown URL links show their text without navigation; explicit wikilinks open supporting notes as described below; raw HTML and embedded scripts are not executed.

### Authored chat

A top-level chat fence contains one Speaker: message per line. The first colon followed by whitespace divides speaker from message. Two spaces, a pipe and a space continue a multiline message on the next line. Blank lines in the fence do not create messages.

~~~~markdown
~~~chat
# Harbour link
@viewer Mara
@pace brisk
@ticks
@responding
Mara: The lamp is steady.
Ivo: I can see it.
  | From the far bank.
@pause 900ms
@delay 1200ms
Mara: Stay there.
~~~
~~~~

The optional # Title is a visible chat heading inside the fence. @viewer gives the exact name of the outgoing participant and controls bubble alignment. Bare @ticks enables authored delivery/read marks on that participant's messages only; it is off by default. One tick appears at reveal, two after 600ms of active playback. These are presentation effects, not delivery or reader telemetry. Header @responding shows “Speaker is responding…” during delays for incoming messages only. A between-message @responding applies to only the next message. It adds no wait and disappears on Pause. A viewer is required for incoming/outgoing classification. Existing chats with only Speaker: message lines remain valid.

The default message delay is clamp(400 + 35 × Unicode code-point count, 800, 4000) milliseconds. It is an editorial pacing heuristic, not estimated reading time. Chat-local @pace normal (default) multiplies the bounded result by 1; @pace brisk by 0.7; @pace deliberate by 1.3, rounded to whole milliseconds. Put pace before the first message. The setting never affects another chat, an explicit delay or a pause.

@delay Nms **replaces** the next message's calculated delay (0–60000ms). @pause Nms **adds** silence at its position (1–60000ms). Thus a 900ms pause followed by an explicit 1200ms delay takes 2100ms at every pace. A responding cue, when enabled for an incoming message, occupies its delay rather than adding another timer. Reduced motion keeps discrete message sequencing and authored waits.

### Timing between components

**Automatic prose pacing is opt-in.** In an imported project, run **Story Teller: Set Book Prose Pacing** from a project scene and choose On or Off. This writes `"settings": { "prosePacing": "on" }` (or `"off"`) in `story-teller.project.json`; existing projects without that field remain Off. For a single scene, run **Story Teller: Set Scene Prose Pacing** (also in the Markdown editor context menu) and choose On, Off or Inherit. It edits the scene's initial YAML frontmatter field `story_teller_prose_pacing: on|off|inherit` in one undoable, unsaved editor edit. Inherit or an absent field uses the book value. The picker and preview status show the effective value and its source. Both commands work from the keyboard through the Command Palette; they never insert generated pauses. For a standalone Markdown file, a scene override of On works without a project. Source edits reset the preview to ready, so press Play again to examine the new setting.

Standalone @delay and @pause also work outside fences at a top-level Markdown block boundary. Put a blank line after prose before a directive; a code fence may be followed immediately by one. The directives target the next prose, image, type-out or chat component in source order. With prose pacing off, prose and images have zero default entry delay; an outside delay before chat replaces its first message's normal delay. With prose pacing on, a preceding paced paragraph adds a **boundary reading interval** before the next component: `clamp(visible word count × 60ms, 1000ms, 4000ms)`. Markdown markers and hidden wiki-link targets do not count. The first paragraph has no automatic entry delay, and the last paragraph of a beat has no automatic trailing wait. An outside @delay at that boundary replaces **only that boundary interval**; the chat's first message retains its own automatic or in-chat explicit delay. An outside @pause adds silence to the boundary interval and any following chat timing. Thus a short paragraph, @pause 300ms, @delay 200ms, then an 800ms chat message takes 300 + 200 + 800 = 1300ms after the paragraph appears. Existing authored pauses remain and may add to automatic pacing when enabled. Multiple pauses add. A trailing pause holds the beat open before completion; a trailing delay is diagnosed. Without a preceding paced paragraph, the existing chat override semantics remain. Directives are never rendered. Literal examples in code, inline code, quotes and lists remain ordinary Markdown.

Beat progression stays manual. Play is explicit for the opening or source-selected beat; the reader-controlled Next turn may start its destination according to the autoplay toggle. A source edit resets playback to ready. Reduced motion does not erase authored chat sequencing.

### Static images and captions

A standalone Markdown image paragraph becomes an image component. An inline image stays inside its prose component. A separate plain italic caption paragraph immediately after a standalone image gives a visible caption while alt text remains the accessibility description:

~~~~markdown
@delay 900ms

![A lit tower](<assets/harbour%20tower.webp>)

*Caption: The light beyond the wall.*

@pause 1200ms
~~~~

Images preserve aspect ratio and fit the preview without horizontal overflow. Their entry delay is zero unless authored otherwise, and there is no automatic viewing hold. PNG, JPEG and WebP are supported; SVG, remote URLs and embedded data URLs are not. Paths resolve relative to the saved adaptation. The file must remain within the containing VS Code workspace, including parent-directory paths to shared assets; outside a workspace the source directory is the limit. Symlink escapes and unreadable/unsupported files produce a visible placeholder and an author warning. Open the encompassing workspace when adaptation and assets are siblings.

**Insert… → Image** selects an existing local file, inserts a relative Markdown reference with an editable alt-text placeholder, and leaves the file in place. **Insert… → Caption** adds a caption below a standalone image or selects its existing caption text for editing. These helpers do not replace selected prose or create orphan captions. A saved source file is needed to resolve media.

### Type-out, formatted annotations and sound

A top-level typeout fence has a configuration header, one blank line, then its body. YAML bodies remain entirely literal; annotation bodies render safe Markdown. Directive-looking body text is content in both formats:

~~~~markdown
~~~typeout
@format yaml
@sound modem
@speed 24
@border grey
@fill yellow

status: observing
confidence: unresolved
~~~
~~~~

@format yaml uses monospaced, byte-literal state styling: indentation, punctuation, Markdown markers, wiki syntax and line breaks reveal as written. @format annotation renders paragraphs, bold, italic, lists, blockquotes and inline code in a note style. The complete annotation is parsed once; its text appears within stable formatting, without exposing Markdown delimiters. For annotations, @speed counts rendered text grapheme clusters, including spaces and Unicode sequences, but excludes Markdown markers, list bullets and structural paragraph/list boundaries. A line break inside a code block is text and consumes one step; Markdown's soft/hard line break and the gap between blocks add no timed step. To hold a paragraph or image for reading, author an outside @pause. Wiki links display their label (`[[target|label]]` → `label`) or target (`[[target]]` → `target`) in prose, chat messages and annotations, opening the explicitly selected supporting file. Escaped examples and code remain literal; `![[...]]` embeds remain unsupported literal text. Ordinary Markdown URL links remain inert, remote content is never fetched, and annotation images display an omission placeholder.

Sound is independent: @sound modem, keyboard, typewriter or none. Omission means none. @speed is 1–120 Unicode grapheme clusters per second, default 30. Optional @border none|grey and @fill none|grey|yellow change only the panel treatment; each can be set independently of format, sound and speed. Omit them to retain the format's original appearance. Border none removes the panel border (and annotation accent border); fill none makes the panel background transparent. Values are fixed choices, never CSS. Put all configuration before the blank line. Outside delay/pause apply before entry; following components wait for the reveal.

For example, a formatted annotation can contain `**emphasis**`, `*contrast*`, a list and an explicit `[[chapter|chapter label]]` supporting-note link. Invalid Markdown follows the existing Markdown renderer's ordinary rules; Story Teller does not repair it.

**Reveal Immediately** is shown while type-out is active. It completes that passage, stops sound and continues later authored waits/components. **Mute sound** applies across passages and is remembered outside Markdown. Sound is locally synthesised, starts after a playback gesture, and stops on Pause, reveal, navigation, edit, hiding or disposal. Reduced motion shows the complete passage at entry and suppresses sound. Assistive technology receives the complete passage without character-by-character announcements. If audio fails, visual reveal continues with an explicit warning. Ted has verified audible modem, keyboard and typewriter playback; richer texture is a possible later refinement.

**Insert… → Type-out** offers fictional PRIME/Divergent YAML and Annotation presets with editable body placeholders. The presets add only their format and sound; optional speed, border and fill remain absent. To edit any setting, put the caret anywhere inside that chat or type-out fence and choose **Insert… → Component settings…**. Choose a setting, then a fixed value or **Default** to remove an optional override. Speed uses a validated whole-number prompt in grapheme clusters per second. The helper edits only the header in one Undo step, refuses ambiguous/invalid configuration, and aborts if the document or caret changes while a picker is open. An ordinary yaml fence and existing manuscript annotation syntax are not converted just by previewing.

## Converting a copied chapter

Always work on a copied adaptation, not the authoritative manuscript. The three conversion commands operate only on the active Markdown buffer, including unsaved changes. They show a native read-only diff with conversion and warning counts. **Review Warnings** opens source-located notes; **Apply** is explicit; Cancel leaves the source untouched. If the source changes after the proposal, Apply refuses it and offers Regenerate. Apply is one undoable editor edit and does not save. Repeating a successful conversion is a no-op.

**Story Teller: Convert Chats in Current Document** recognises inspected, top-level manuscript chat containers inside chat fences: explicit {{speaker|body|subtext}} message wrappers, an optional leading # Title, and an optional explicit > Participant viewer marker. It retains speakers, text, order, multiline messages, titles, prose and existing beat separators. Unsupported subtext, ambiguous viewer/identity, multiple channel comments, unclosed or nested fences, ordinary dialogue and unrelated code stay unchanged with warnings. Existing valid Story Teller chat blocks remain unchanged. The converter does not infer ticks, responding, timing or a viewer.

**Story Teller: Convert Callouts to Type-out** recognises top-level Obsidian [!prime-log] and [!divergent] machine-output callouts containing exactly one complete YAML fence, and nonempty [!annotation] callouts. It removes one structural quote level, retains literal body and surrounding prose, and starts a named beat using the displayed callout title or label. An immediately preceding boundary is reused. Machine output receives yaml/modem settings; annotation receives annotation/keyboard. Nested, malformed, mixed structural content, unsafe titles and title conflicts are left for review. That command leaves ordinary chat/State callouts, existing components and literal examples unchanged. No speed or timing is inferred.

**Story Teller: Convert Scene Metadata** handles top-level `[!State]` callouts (case-insensitive, including folded forms). It reads direct top-level fields from the *same document's* initial YAML frontmatter and resolves only an entire inline-code value of the form `` `=this.field` ``. For example, `` > **Date**: `=this.story_date` `` becomes `**Date:** 2030-04-01` when `story_date: 2030-04-01` is present. Each field remains a separate readable Markdown line, in source order. Redundant bold around a label/colon is normalised without changing the label. Literal field values are retained. Frontmatter, prose and beat boundaries are untouched. Date-only YAML values keep their ISO `YYYY-MM-DD` form without timezone conversion; strings, finite numbers (including `0`) and booleans (including `false`) are supported. Values are escaped for literal Markdown display. YAML is parsed as data under a non-executing core schema; Dataview and JavaScript are never evaluated. Missing/null, collection, tagged, aliased or multiline values, unsupported expressions, titled/nested/ambiguous State callouts and malformed YAML receive source-located warnings. An unresolved field leaves its **whole callout** unchanged; malformed frontmatter prevents all conversions in that document. Unrelated callouts, fenced examples and already converted lines remain unchanged. No beat is added.

To try it, copy a scene with frontmatter and a State callout into a separate saved Markdown file. Make an unsaved edit if desired, run **Story Teller: Convert Scene Metadata**, inspect the diff and **Review Warnings**, then choose **Apply**. Check the lines in **Story Teller: Preview Scene** and use Undo to restore the copied source if needed. The fictional `samples/state-conversion.md` demonstrates the supported form when working from the source checkout; development samples are excluded from the VSIX.

The rules came from read-only inspection of CONSTRAINT at revision 341923a917a84be5cfbcbf4601ba7d572e0235d6. Fictional fixtures are used in tests; no manuscript passage or artwork is packaged. Review each diff for editorial suitability.

## Insert helpers and development

### Keyboard-first directive help

On a standalone directive line in an adaptation, type `@` to open native VS Code suggestions. **Ctrl+Space** opens them manually; type more of the name or value to narrow the list, press **Enter** to accept, and use **Tab** to leave an editable snippet placeholder. Hover over a recognised directive for scope, defaults and timing help. The extension does not change editor preferences or replace other Markdown completion providers.

Suggestions follow source position: `@viewer`, `@pace`, `@ticks`, `@responding` and the parser-supported `@title` alias occur in chat configuration; `@delay`, `@pause` and positional `@responding` remain available between messages. The canonical chat title is still `# Title`. Type-out headers offer `@format`, `@sound`, `@speed`, `@border` and `@fill`; after the header's blank line, the body stays literal and gets no directive suggestions. Between components, only `@delay` and `@pause` are offered. Value completion handles partial `br`, `mo`, `gr` or `ye`, for example. Numeric placeholders use milliseconds for delay/pause (`0–60000ms` and `1–60000ms`) and Unicode grapheme clusters per second for speed (`1–120`, default `30`). `@delay` replaces the next item's normal wait; `@pause` adds silence. A setting already declared elsewhere in the same header is omitted from name suggestions, while its own line remains editable.

Use a blank line between prose and an outside timing directive. Suggestions do not turn a line inside a prose paragraph into a control. They are suppressed in initial YAML frontmatter, quotations, unrelated fences, inline-code examples and the literal body of type-out. In the tested Linux VS Code default profile, `@` triggered suggestions with `editor.suggestOnTriggerCharacters` enabled; no workspace setting was needed. If you have disabled trigger-character suggestions, **Ctrl+Space** remains the manual path in a valid position. This is authoring help, not new manuscript syntax.

**Story Teller: Insert…** is available from the Command Palette and Markdown context menu. It offers Chat block, Beat boundary, Delay, Pause, Responding, Ticks, Pace, Image, Caption, Type-out and Component settings. Native snippets provide editable placeholders. Responding/Ticks require chat context; Pace remains a direct shortcut, while Component settings can edit or remove its header override. No optional chat effect is enabled by a new chat snippet. **Wrap Selection as Chat** is a separate explicit action that preserves selected content verbatim; wrapping alone does not convert message syntax. Helpers reject unsafe structural positions and stale source/selection, do not overwrite selected prose silently, and leave saving to the author.

| Authored setting | Insert helper coverage |
| --- | --- |
| Chat `# Title`, `@viewer`, `@pace`, header `@ticks`, header `@responding` | Component settings; Pace and Ticks also retain their existing shortcuts. |
| Per-message `@delay`, `@pause`, `@responding`; outside `@delay`, `@pause` | Delay, Pause and Responding snippets in valid structural positions. |
| Type-out `@format`, `@sound`, `@speed`, `@border`, `@fill` | Type-out presets for initial format/sound; Component settings for each header value and optional Default. |
| `---` and optional beat title; local image and caption | Beat boundary, Image and Caption helpers. |

Message text, literal type-out body and image alt text remain ordinary Markdown/snippet editing, not hidden settings. Per-message timing and responding placement remain contextual; Component settings edits the chat-wide header only.

For development, open tools/story-teller as the VS Code folder, run:

~~~sh
npm ci
npm run build
npm run check
npm test
npm run test:host
npm run package
~~~

For supporting-note native checks, run `STORY_TELLER_HOST_SCOPE=notes npm run test:host`; add `STORY_TELLER_VSIX="$PWD/story-teller-0.11.0.vsix"` to exercise the installed package. For other focused native checks, run `STORY_TELLER_HOST_SCOPE=prose npm run test:host` for temporal paragraph reveal and scene override, `STORY_TELLER_HOST_SCOPE=intellisense npm run test:host`, `STORY_TELLER_HOST_SCOPE=annotation npm run test:host`, `STORY_TELLER_HOST_SCOPE=import npm run test:host` for the imported-project outline/preview (system picker remains manual), or use `STORY_TELLER_HOST_SCOPE=metadata` for State conversion; prepend `STORY_TELLER_VSIX=/absolute/path/story-teller-0.11.0.vsix` to test the installed package in a disposable profile. Press F5 using **Story Teller: Extension Development Host** to open the fictional samples folder, then preview lantern.md. The native host suite requires a graphical Linux session and installed VS Code; it uses temporary files and test-only CDP inspection. The npm build needs Node.js 22 or later. RESULTS.md records validation separately from Ted's acceptance.

During final review, isolated VS Code 1.142.0 runs sometimes returned beat ranges but left the source editor expanded after Collapse All Beats. The preview tab activation and presentation handshake were corrected; four subsequent full native runs in clean Development Host and installed-VSIX profiles passed. The tab-activation race is the likely cause, though it was not isolated in an A/B test. If folding recurs, record the active source/preview tabs and run the full native suite; `STORY_TELLER_HOST_SCOPE=no-fold npm run test:host` diagnoses other flows but does **not** establish that folding passes. See RESULTS.md for the observations.

Known limits: no automatic beat turns, visual beat-card editor, EPUB import, EPUB export, general video or live chat generation. Animated WebP uses the existing image path; its animation is independent of playback pause. Beat preservation after substantial edits is best effort; duplicate/rewritten beats can change which ordinal is retained. Hidden webview recreation restores a beat ready rather than restoring its exact timer. Only desktop Linux VS Code has been exercised natively; VSCodium, iPad/Safari, remote workspaces and other operating systems remain unverified. The VSIX is a local milestone, not a marketplace release or general manuscript-format promise.

## Import an ordered Markdown manuscript

Run **Story Teller: Import Markdown Manuscript** and select a book folder such as `PrimeTrilogy/Books/CONSTRAINT` (the sibling `CONSTRAINT.md` book note is read too). Choose a frontmatter order field from the displayed samples. For the inspected CONSTRAINT preparation use `manuscript_order_key`: MWC stores ten uppercase base-36 characters, ordered lexically among siblings. Numeric fields and digit-structured strings also sort numerically by segment; mixed, missing, duplicate or invalid values block import. Filenames never supply fallback order.

Review the scrollable panel of parts, numbered scenes, included files, copied assets, exclusions and full warnings. Its Back, Continue and Cancel buttons stay visible below the list and are keyboard reachable. Continue remains unavailable while order errors or unresolved supported assets exist. A structural part folder note supplies its title; a manuscript-bearing part note becomes an introduction before its scenes. Unprepared drafts and unrelated notes are excluded with warnings. When shared assets cannot resolve within the selected book folder, choose an asset root containing both the book and assets (for CONSTRAINT, the `PrimeTrilogy` vault root). Supported local PNG, JPEG and WebP media are copied with collision-safe names; current Story Teller imagery does not support SVG, so its embeds remain in the copied source with warnings. Ordinary wiki links remain untouched. The importer does not run chat, callout or State conversions. Book cover-image frontmatter is retained but not copied as scene media; the current CONSTRAINT cover reference is pending and appears as a warning.

Select **Continue**, choose a parent folder, enter a new project folder name and confirm **Import**. It writes into a temporary folder then renames atomically; it refuses an existing destination and does not save or modify the original manuscript. The new folder contains `story-teller.project.json` (schema version 1, stable IDs, explicit part/scene order, provenance), editable scene copies, original book/part metadata copies, supported assets and an empty `Supporting Content/` folder. Accept **Open Project Folder** to open the destination window with **Story Teller → Part–Scene Outline** revealed and the first part expanded. Selecting a scene opens its Markdown adaptation; **Preview This Beat** and source navigation work as for standalone documents. The outline and the `orderedScenes` assembly input read the same manifest sequence. You can still open any standalone Markdown scene without a project.

### Imported scene headings (#16; awaiting Ted’s acceptance)

New imports add the resolved story-scene title as an H1 at the opening of the
Markdown body, after unchanged YAML frontmatter and any leading structural beat
metadata/boundary. The title is the same value used in Part–Scene Outline.
Ordinary punctuation and Unicode remain readable; Markdown-sensitive characters
are escaped so the title renders literally, including `*`, wiki-looking text and
HTML-looking text. Existing leading H1s with the same rendered text are retained
byte-for-byte (including Setext headings and authored emphasis). Comparison is
case-sensitive and ignores differences in rendered whitespace. A different
heading is preserved below the inserted title.

```markdown
---
type: scene
title: The signal
---
# The signal

Original scene content…
```

The generated heading belongs to the first nonempty beat: it does not add a
separator, title-only beat or viewing delay. Leading separators and named-beat
comments retain their structural positions. Story scene IDs, labels, grouping,
order and original source hashes stay unchanged. Copied part introductions,
part metadata, front/back matter and supporting notes receive no new heading.
There is no upgrade command or modification of existing adaptations on opening.

In web exports, a story that already supplies its matching opening H1 uses
“Scene 1.1” in the reader header; its full title stays in the body and Contents.
This avoids a repeated automatic title. Scenes without that H1 retain the existing
full header. The VS Code player renders the source H1 normally.

To try it, install 0.11.1, import a synthetic or copied prepared manuscript to a
**new** destination, select its scene in the outline and inspect source/preview.
Check one title in the first beat with prose below it, then export and serve the
reader over HTTP. Existing adaptations remain untouched. See RESULTS.md for the
native/browser evidence and platform limits.

Imported chat, callout and State syntax is deliberately left unconverted. Review a copied scene, then run the existing chat, callout or State converters individually if wanted. No EPUB import, export, manuscript reordering or automatic reimport is included. A copied Obsidian SVG embed will remain unsupported in this preview until an imagery decision is made; the import review reports it. Ted successfully imported and ran his project, and has accepted prose pacing and outline scene autoplay. Ted accepts the import/outline workflow; the automated cross-window handoff limitation remains documented in RESULTS.

### Animated WebP observation

Ted demonstrated animated WebP through the existing Image insert. This is supported browser image display, not a synchronised animation component: playback Pause, Replay and beat timing do not control the image's frame timeline. No private/third-party example media is bundled. JANUS can use supporting notes and existing directives; it needs no separate component.

## Export a standalone static reader (trial)

Run **Story Teller: Export Web Reader** from an opened adaptation project. Save/revert project buffers first; choose a new destination outside the project and explicitly confirm. Export uses the saved manifest sequence, leaves sources untouched and copies only publication content/assets. See [WEB-READER.md](WEB-READER.md) for CLI export, local HTTP preview, reader controls, safety boundaries and acceptance checks. Ted has now tested the web reader on his actual iPad over the local network and reports “It works well.” This does not establish a browser version, human audio check or exhaustive coverage.

## Book matter and project scaffolding (0.11.0; accepted by Ted)

Ted accepted this deliverable: “Good, simple deliverable. Happy with that.” This
does not add actual iPad/Safari or touch verification.

New manuscript imports create **Front Matter.md**, **Back Matter.md** and
**Supporting Content/** even when there is no publication metadata or matter.
Keep these in your separate adaptation; original manuscripts are never edited.
The outline lists Front Matter before the parts and Back Matter after them.
Select either to open its Markdown source and static reader page. Editing keeps
source focus and refreshes the preview. Scene labels, IDs and beat shortcuts are
unchanged. Supporting notes are never part of the reading order.

For an existing project, run **Story Teller: Add Book Matter and Supporting
Content** from the Command Palette. With multiple workspace projects, choose
one. The command creates only missing items and reports created/already-present
items or an error. It preserves deliberately empty files and author edits. Run
it again safely. Opening an older project does not upgrade or write it; older
projects still preview and export normally. Save/revert a dirty project manifest
before upgrading. A failed upgrade can leave individually created scaffold
files; the report identifies the error and a repeat preserves those files and
finishes registration. It never labels a failed upgrade complete.

### Import mappings and provenance

Read-only inspection of current CONSTRAINT and MWC found `type: book|part|scene`,
`parent` wikilinks and `manuscript_order_key`, but **no publication-matter
classification**. This increment adds an explicit source convention, not a claim
about existing MWC output: `type: front-matter` or `type: back-matter`, with
`parent: "[[Book]]"`. Several notes on either side use the selected order key;
a single note needs no order value. Their Markdown bodies retain wording/order
and supported media is relocated using the existing importer. Original YAML and
content remain archived in project metadata. Names alone never classify matter.
Unmatched parents and unknown types are reported/excluded. Unclassified book-note
body text remains archived, rather than being guessed to be publication matter.

Existing classified front matter is authoritative: metadata is **not appended**
to it, avoiding duplicate title/copyright pages. Otherwise, supplied scalar
`title`, `subtitle`, `author`, `series`, `series_book`, `publisher`, `imprint`,
`copyright`, `rights`, `language`, `isbn_epub`, `isbn_paper`, `isbn_hard` populate
new front matter. Identical values are not repeated; rights already contained in
the copyright string are not repeated. No legal terms, author name, cover, date
or title inferred from a filename is inserted. Description, cover metadata,
collections and other workshop fields remain in the archived book note; they
are not automatically turned into publication pages. No source metadata yields
empty editable matter. Ordered scenes parented directly to a book without parts
retain explicit order and receive labels 1, 2, …; a matter-only/empty book also
opens and exports without fabricating a part or scene.

Upgrading uses the project’s retained `bookFile` metadata, not absolute provenance
paths back into a vault. New imports additionally retain ready-to-use matter
sources (`matter.front/back.sourceFile`) for recreating a missing document later.
Older imports cannot recover previously excluded source matter automatically;
copy that content into the adaptation manually. Existing documents always win.

### Portable manifest and reading

Manifest version 1 gains optional entries:

```json
{
  "matter": {
    "front": { "id": "stable-front-id", "file": "Front Matter.md" },
    "back": { "id": "stable-back-id", "file": "Back Matter.md" }
  },
  "settings": { "supportingContent": "Supporting Content" }
}
```

Omitting `settings.supportingContent` means `Supporting Content`. A configured
project-relative folder such as `Notes/Background` is respected by scaffolding,
preview and export; no competing default folder is created. Traversal and escape
symlinks are rejected. Keep notes separate from scenes/metadata/assets. Paths and
matter IDs remain separate from generated scene labels. Registration is in the
manifest; merely naming an unrelated file Front Matter.md does not publish it.

Matter is ordinary, fully displayed safe Markdown: headings, text, existing
images and explicit supporting-note links. Ordinary Markdown links retain the
reader’s existing inert safe presentation. Fenced chat/typeout examples remain
code on these pages; they are not performed. Frontmatter is author metadata and
is not displayed. Continue enters the next document; Previous returns to the
preceding matter page or the last beat of a preceding scene, fully revealed and
silent. Entering a scene via Continue respects Autoplay. The shared reader stops
outgoing reveal/audio/scroll work before a document turn. Beat turns remain manual.

Web export includes nonempty matter in Contents and reading order:
Front Matter → scenes in manifest order → Back Matter. Blank/metadata-only matter
is omitted from web Contents and sequence, while remaining visible/editable in
the author outline. A book with no nonempty reading pages displays an empty-book
message. Export uses saved content and existing local-asset/note rules; no source
vault, archived metadata or unrelated files are included. There is no new cover
screen, generated Contents document, progress-saving system or EPUB export.

### Try this increment

1. Install `story-teller-0.11.0.vsix` using **Extensions: Install from VSIX…**,
   then reload VS Code. The extension-level licence remains unresolved; no
   marketplace release or new licence is implied.
2. Open an existing imported adaptation folder. Run **Add Book Matter and
   Supporting Content**. Check both new outline documents. Write a title or
   acknowledgements, leave either intentionally empty, and repeat the command:
   your edits/empty file must remain unchanged.
3. Alternatively import `samples/matter-source/Lantern/` from this repository,
   select `order`, review the matter list and one scene, then choose a **new**
   destination outside the source. Open the project folder and select Front Matter.
4. Follow Continue → story → last beat → Next scene → Back Matter. Check
   Autoplay on/off and Previous. Edit matter while previewing; verify focus stays
   in your source. Add `[[Definition|A note]]` and the corresponding supporting note.
5. Export to a new folder, serve it with `python3 -m http.server 8000 --directory
   /path/to/export`, and open `http://localhost:8000`. Check Contents, images,
   notes and narrow widths. Empty matter must be absent from the exported reader.

Automated/native evidence and platform limits are recorded in RESULTS.md.
