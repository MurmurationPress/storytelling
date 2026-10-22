# Story Teller

Story Teller previews a separate Markdown adaptation as manually selected story beats in desktop VS Code. It is an authoring tool, separate from the managed EPUB experiments. The syntax is provisional; preview and conversion never save a document for you.

## Install and open an adaptation

Requires desktop VS Code 1.95 or later. Node.js is needed only to build the extension from source.

To install the local milestone, open VS Code's Extensions view, choose **… → Install from VSIX…**, and select `story-teller-0.6.1.vsix`. Reload the window if asked. If replacing an older local build, confirm **Story Teller 0.6.1** in Extensions before testing. The VSIX includes its runtime JavaScript, stylesheet and production Markdown/YAML parsers; it does not include manuscript material or fictional development samples.

Make a *separate* Markdown adaptation of a completed chapter. Keep the original manuscript unchanged. Save the adaptation before linking images so relative paths have a base directory. Open it in VS Code, then run **Story Teller: Preview Scene**. The preview opens beside that document, with the first beat ready. **Play** starts it. **Next** turns one beat; with **Autoplay on page turn** enabled (the default), that next beat starts performing immediately. Turn the toggle off to make Next leave it ready for Play. The preference is remembered in VS Code, separately from Markdown. **Previous** shows the preceding beat fully revealed and silent for rereading, with no simulated waiting. **Replay Beat** resets and starts the current beat again. **Restart** returns to beat one in its ready state, showing only untimed leading content; it never autoplays. **Pause/Resume** preserves the remaining wait. Beat turns remain reader-controlled: completion never advances to another beat. Source edits and closing the preview cancel pending playback; unsaved edits reset the current beat to ready. Hiding the preview pauses it, and returning never resumes automatically.

Use **Story Teller: Preview This Beat** from the Command Palette or Markdown editor context menu to open or reuse the preview at the cursor's beat. **Show Beat in Source** reveals and unfolds that beat in its own document. Cursor movement alone does not change playback. With several open documents, each source has its own preview.

To try page-turn autoplay in the installed update, open a saved copy of `samples/lantern.md` in VS Code and run **Story Teller: Preview Scene**. Press Play for the opening beat, then Next: the destination chat should begin on that turn. Turn **Autoplay on page turn** off and press Next again: the new beat should wait for Play. Press Previous to reread the prior beat complete and silent, then Replay Beat to perform it again. Restart should return to beat one ready, even with autoplay enabled. For sound and type-out, open a saved copy of `samples/typeout.md`, leave Mute off, turn Next into a type-out beat, then hide and return to the preview; playback should remain paused until Resume. The sample files are development examples and are not bundled in the VSIX.

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

Ordinary Markdown becomes prose. Adjacent paragraphs, headings and lists form one prose component until a chat, image, type-out or timing directive separates them. Leading untimed prose is immediately readable in ready state. Prose after a timed component waits for that component. Links show their text without navigation; raw HTML and embedded scripts are not executed.

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

Standalone @delay and @pause also work outside fences at a top-level Markdown block boundary. Put a blank line after prose before a directive; a code fence may be followed immediately by one. The directives target the next prose, image, type-out or chat component in source order. Prose and images have zero default entry delay. An outside delay before chat replaces the first message's normal delay instead of making a second entry timer. Outside pauses add before the next component's existing delay. Multiple pauses add. A trailing pause holds the beat open before completion; a trailing delay is diagnosed. Conflicting overrides are diagnosed with source lines, including one outside and one inside chat. Directives are never rendered. Literal examples in code, inline code, quotes and lists remain ordinary Markdown.

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

@format yaml uses monospaced, byte-literal state styling: indentation, punctuation, Markdown markers, wiki syntax and line breaks reveal as written. @format annotation renders paragraphs, bold, italic, lists, blockquotes and inline code in a note style. The complete annotation is parsed once; its text appears within stable formatting, without exposing Markdown delimiters. For annotations, @speed counts rendered text grapheme clusters, including spaces and Unicode sequences, but excludes Markdown markers, list bullets and structural paragraph/list boundaries. A line break inside a code block is text and consumes one step; Markdown's soft/hard line break and the gap between blocks add no timed step. To hold a paragraph or image for reading, author an outside @pause. Wiki links display their label (`[[target|label]]` → `label`) or target (`[[target]]` → `target`) in both prose and annotations, without navigation. Escaped examples and code remain literal; `![[...]]` embeds remain unsupported literal text. Annotation links are inert, remote content is never fetched, and annotation images display an omission placeholder.

Sound is independent: @sound modem, keyboard, typewriter or none. Omission means none. @speed is 1–120 Unicode grapheme clusters per second, default 30. Optional @border none|grey and @fill none|grey|yellow change only the panel treatment; each can be set independently of format, sound and speed. Omit them to retain the format's original appearance. Border none removes the panel border (and annotation accent border); fill none makes the panel background transparent. Values are fixed choices, never CSS. Put all configuration before the blank line. Outside delay/pause apply before entry; following components wait for the reveal.

For example, a formatted annotation can contain `**emphasis**`, `*contrast*`, a list and an inert `[[chapter|chapter label]]` link. Invalid Markdown follows the existing Markdown renderer's ordinary rules; Story Teller does not repair it.

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

### Keyboard-first directive help (awaiting Ted's acceptance)

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

For focused native checks, run `STORY_TELLER_HOST_SCOPE=intellisense npm run test:host`, `STORY_TELLER_HOST_SCOPE=annotation npm run test:host`, or use `STORY_TELLER_HOST_SCOPE=metadata` for State conversion; prepend `STORY_TELLER_VSIX=/absolute/path/story-teller-0.6.1.vsix` to test the installed package in a disposable profile. Press F5 using **Story Teller: Extension Development Host** to open the fictional samples folder, then preview lantern.md. The native host suite requires a graphical Linux session and installed VS Code; it uses temporary files and test-only CDP inspection. The npm build needs Node.js 22 or later. RESULTS.md records validation separately from Ted's acceptance.

During final review, isolated VS Code 1.142.0 runs sometimes returned beat ranges but left the source editor expanded after Collapse All Beats. The preview tab activation and presentation handshake were corrected; four subsequent full native runs in clean Development Host and installed-VSIX profiles passed. The tab-activation race is the likely cause, though it was not isolated in an A/B test. If folding recurs, record the active source/preview tabs and run the full native suite; `STORY_TELLER_HOST_SCOPE=no-fold npm run test:host` diagnoses other flows but does **not** establish that folding passes. See RESULTS.md for the observations.

Known limits: no automatic beat turns, visual beat-card editor, full-book importer, EPUB export, image animation, video or live chat generation. Beat preservation after substantial edits is best effort; duplicate/rewritten beats can change which ordinal is retained. Hidden webview recreation restores a beat ready rather than restoring its exact timer. Only desktop Linux VS Code has been exercised natively; VSCodium, iPad/Safari, remote workspaces and other operating systems remain unverified. The VSIX is a local milestone, not a marketplace release or general manuscript-format promise.
