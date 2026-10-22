# Page-turn autoplay trial — 2026-10-22

**Acceptance status:** This navigation change awaits Ted’s review. His earlier acceptance of the authoring, component, conversion and synthesised-sound experience remains in force. The reader-facing toggle defaults on and is stored in VS Code global state, outside the manuscript. A manual Next turn starts its destination beat when enabled; when disabled it leaves that beat ready. Opening a scene, Preview This Beat and Restart leave the selected beat ready. Previous shows the preceding beat fully revealed and silent, including images, chat statuses and type-out text. Replay Beat resets and plays the current beat. Completion never turns a page.

**Implementation and checks:** The shared player owns Next/Previous/Replay/Restart policy and cancels outgoing timers before switching. The webview stops the outgoing sound before navigation and unlocks Web Audio during the Next gesture when the destination needs it. Existing hide/return, source-edit reset, mute and reduced-motion rules remain. Three new deterministic tests cover all four departure states, the toggle, immediate silent Previous without elapsed time, replay and stale callback rejection. `npm run check`, `npm run build` and all **104 tests** pass. The full native Extension Development Host suite also passed, followed by the same suite with **story-teller-0.2.0.vsix installed in a disposable VS Code 1.142.0 Linux profile**. The installed run exercised the accepted preview/conversion/insertion regressions as well as autoplay; its local trace captured a type-out prefix growing from `st` to `sta` over 510 ms, a complete silent Previous state, and two Web Audio node disconnections after leaving the active type-out. The test also checked preference persistence after preview reopening, off-mode Next, Replay, Restart and native hide/return. These are automated UI and audio-graph observations, **not a new human listening test**.

**Package and limits:** The 0.2.0 VSIX contains 122 files, including runtime code/CSS and production dependency licences. It excludes samples, test evidence, private adaptations, manuscript artwork and the VSIX itself. `vsce` still warns that the extension has no project-level licence; this task did not invent one. VSCodium, remote workspaces and actual tablet/iPad use remain unverified. Ted should judge the new navigation feel in the installed extension; the earlier accepted sound quality is not being reasserted from automation.

# Local installable milestone — 2026-10-21

**Acceptance:** Ted accepts the Markdown/live-preview workflow; prose/chat sequencing, automatic message timing and chat pace; delay/pause/responding/ticks; static imagery, captions and insertion; named beats, folding and source/preview navigation; type-out presentation and audible modem/keyboard/typewriter sounds; both conversion commands and existing Insert helpers. Synthesised audio is sufficient. This is acceptance of the authoring experience, not a claim of publication/export readiness or universal editor support. The dated reports below retain the evidence and earlier pending-acceptance status as history.

**Review and changes:** Audited source targeting, conversion diff staleness/Undo, structural Markdown, player/audio timers, webview presentation/edit cancellation, media path bounds, and helper/parser syntax. Existing deterministic and native regressions cover those failure paths; no material product-behaviour defect was reproduced in this review, so playback semantics were left intact. Packaging was missing: added a pinned VSIX tool, prepublish build, repository metadata, 0.1.0 local milestone version and a runtime-focused .vscodeignore. The native suite can now use an installed VSIX in a disposable profile through a separate temporary test adapter; the tested Story Teller code comes from the package, not an extension-development path. Two test-harness races were corrected: waiting for the intended source editor to become active before conversion/folding, and waiting for a newly opened preview to receive its source before asserting persisted mute. README was consolidated without changing source/manuscript content.

**Automated evidence:** npm ci, build, check and all 101 deterministic tests pass; the native Extension Development Host regression passes on VS Code 1.142.0, Linux x64. The same suite passes with story-teller-0.1.0.vsix installed in a disposable profile. It exercises prose/chat/image/type-out preview, timing and cancellation, control-focused navigation, folding and source navigation, conversion diff/review/cancel/stale Apply/single Undo, snippet insertion/tab stops and asset loading. The final package is 947,291 bytes with 122 entries. Inspection confirms runtime JavaScript/CSS and markdown-it with seven dependency licence files; no samples, test evidence, manuscript/adaptation files or unrelated art entered the VSIX. The package reports one warning: this repository does not provide an extension-level licence file. No licence terms were invented by this task. npm audit reports zero vulnerabilities at the pinned install used here.

**Observed versus accepted:** Native automation observes temporal visual playback and Web Audio graph state, not sound quality. Ted previously heard and accepted the three synthesised sounds in his normal Development Host. This review did not perform a fresh human listening test. The installed-VSIX regression is an actual VS Code desktop run; it is not VSCodium, iPad/Safari or remote-workspace verification.

**Remaining limits:** The syntax and conversion recognition remain passage-grounded and provisional. Beat selection after wholesale edits is best effort; recreated hidden webviews return ready. The preview is local, not EPUB export. VS Code versions other than 1.142.0 and VSCodium were not tested in this milestone. Private adaptation files and original manuscript assets were excluded from commits and package.

# Callout-to-type-out conversion — 2026-10-21

**Acceptance:** Ted has now verified type-out playback and audible modem, keyboard and typewriter sounds. That supersedes the earlier pending-audio status below; richer texture is only a possible later refinement. The new callout conversion awaits his assessment.

Read-only inspection used local CONSTRAINT manuscript revision `341923a917a84be5cfbcbf4601ba7d572e0235d6`. Representative `[!prime-log]` and `[!divergent]` wrappers contain timestamp/prose around one YAML fence; `[!annotation]` wrappers contain authored note text. The converter keeps that surrounding text and order, removes one quote level, reuses or inserts beat boundaries, retains compatible existing beat titles, and gives the type-out fence format/sound headers. It leaves chat, State, existing type-out, literal examples and ambiguous forms unchanged. A read-only in-memory audit across 16 chapters with these labels proposed **90 conversions and five warnings**. It made no manuscript edits; the five warnings were machine logs without one convertible YAML fence. Existing parser diagnostics in those chapters did not increase after the proposed conversion. This audit is evidence about the inspected revision, not a promise that every future source form is supported.

**Automated validation:** Build and syntax checks pass; **101 deterministic tests pass**, including seven focused callout cases for source order/indentation, CRLF, long fences, frontmatter, titles/conflicts, existing boundaries, nested/malformed/ambiguous wrappers, component protection and idempotence. Existing chat conversion, playback, audio, imagery and beat tests remain green. The real Linux VS Code 1.142.0 Extension Development Host run exercises the fictional document's diff/count/warnings, Cancel, stale Apply/Regenerate, explicit Apply, unsaved buffer/single Undo and converted YAML/annotation playback in the preview. Those are automated API/DOM observations, not Ted's editorial acceptance or a new human audio check. See [the fictional sample](samples/callout-conversion.md), the converter tests and the host runner for reproduction.

Limitations: prose-only machine logs and unsupported/mixed fences require review; an annotation is performed as literal text, so Markdown markup inside it is visible as text. Titles unsafe for the current HTML-comment syntax are flagged rather than changed. The command does not change original manuscript sources, infer timing, import a book or export EPUB. No push, release or merge.

---

# Type-out sound correction — 2026-10-21

Ted reported the same “Sound unavailable” warning in his normal Extension Development Host. A diagnostic run in the real Linux VS Code 1.142.0 webview captured **`voice: TypeError: Illegal invocation; context running`**. `AudioContext` was present, creation succeeded and `resume()` reached `running`; this was not an absent API, suspended context or CSP refusal. The failure occurred after the oscillator/gain graph was connected, when the default `setInterval` function was invoked as a method of `TypeoutSound` rather than of `window`. Chromium rejected that receiver. The same binding affected `clearInterval` cleanup. The webview CSP was inspected and left unchanged; no network or broader media permission was added.

The defaults now call `globalThis.setInterval` and `globalThis.clearInterval` with the browser global as receiver. A regression test uses browser-like functions that throw `Illegal invocation` for any other receiver. The existing single-voice design, mute, pause/resume, reveal, navigation/edit/disposal cleanup, silent format, and visual fallback remain. A missing Web Audio API is identified once and is never retried; an actual resume failure records its phase and may be retried on a later playback gesture. The visible warning now includes the failure phase, exception and context state so another failure can be distinguished without developer tools. It remains a single warning line rather than accumulating notices.

**Validation:** Build and syntax checks pass; **94 deterministic tests pass**. The actual isolated Extension Development Host now shows no sound-unavailable warning for modem, keyboard or typewriter, with a running Web Audio context and a connected voice during reveal; Pause disconnects the voice. Temporal visual, reduced-motion, hide/return, immediate-reveal and prior accepted-feature regressions pass. These native API/DOM observations establish graph operation and cleanup, **not sound heard through speakers**. Ted should assess audibility and volume with Mute off in a fresh Extension Development Host. The earlier report below remains as historical evidence of the defect; its unavailable-sound conclusion is superseded by this correction. The fictional native trace is in [typeout-native.json](test/evidence/typeout-native.json). No manuscript or private adaptation was touched; no push, release or merge.

---

# Literal type-out preview — 2026-10-21

**Acceptance status:** Ted accepts named beats, folding, source/preview navigation and Caption insertion, in addition to the prior chat, pace and static-image experience. The type-out component and its sound choices are new and await his assessment. The older sections below retain their historical, pre-acceptance wording.

One top-level `typeout` fence now handles literal PRIME/Divergent-style YAML or a note. Its header selects `@format yaml|annotation`, optional independent `@sound modem|keyboard|typewriter|none` (default none) and `@speed` in Unicode grapheme clusters per second (default 30, allowed 1–120). A blank line separates configuration from body; body text, indentation, Unicode and line breaks are never parsed as YAML or directives. Ordinary YAML fences and existing annotations remain untouched. The YAML and annotation presentations share the same reveal clock. Outside delay/pause semantics, manual beats, source-order blocking, contextual Reveal Immediately, replay, edit cancellation and hidden-preview pause all use the existing independent player. A full, visually hidden passage is available to assistive technology while visible text advances without live per-character announcements. Reduced motion reveals it fully at component entry and suppresses sound. The sound is locally synthesised with one bounded voice per active passage; no external audio or per-character nodes are used. Mute is a reader preference stored apart from the Markdown.

**Automated validation:** `npm run build`, `npm run check` and `npm test` pass with **93 deterministic tests**. New tests cover literal/CRLF/Unicode parsing, invalid header lines, grapheme timing and bounds, exact pause/resume and immediate reveal semantics, reset/cancellation, reduced motion, preset insertion and a fake Web Audio lifecycle. Existing chat, images, conversion, beats and navigation tests remain green. The real VS Code 1.142.0 Linux Extension Development Host run observes the fictional sample through the actual preview: ready/no output, progressively longer prefixes at separate times, pause/hide/return holding a prefix, resume, immediate reveal followed by later authored timing, replay, edit reset, reduced-motion full text, 320px bounds and each of the four sound modes' visual playback. It also reruns earlier source/preview, folding, conversion and imagery checks. The test uses CDP DOM events, so it establishes visual and lifecycle behaviour, **not that sound was heard or its quality**. Its isolated host reported Web Audio unavailable after creating the initial modem graph; keyboard/typewriter then kept revealing silently with the warning. The fictional temporal and audio-event observations are retained in [typeout-native.json](test/evidence/typeout-native.json). A trusted human Play gesture and actual listening are still needed to assess sound on Ted's machine. This remains a local extension preview, not an EPUB or reader compatibility result.

The fictional [type-out sample](samples/typeout.md) and README give exact local steps. No manuscript passage, artwork, private Art adaptation, Component Types note or accepted EPUB artifact was changed. No push, release, deployment or merge.

---

# Named beats, source navigation and Caption insert — 2026-10-21

**Acceptance status:** Ted accepts static imagery and the existing chat/pace experience. Beat titles, folding, explicit source/preview navigation and the Caption helper are newly implemented and await his review. The previous imagery section below is preserved as the historical report from before his acceptance.

The shared Markdown structure scanner now supplies beat source ranges and optional title metadata. A title comment immediately after a boundary, or before first-beat content after frontmatter, is removed from reader rendering and timing. Preview This Beat uses the cursor's source range and resets that beat to ready; Show Beat in Source checks document URI, revision, index and range before revealing/unfolding its own source. Ordinary cursor moves do not change the preview. Native folding ranges keep a title line visible and end before the next separator. Insert Beat prompts for an optional title and Insert Caption adds/selects the established plain-text caption without replacing prose. The independent player now also uses a later unchanged beat as a source-edit anchor when an earlier inserted boundary is removed.

**Automated validation:** 84 deterministic tests pass with build, syntax and whitespace checks. New tests cover first/titled/duplicate/untitled beats, frontmatter and literal fences, UTF-16 source offsets after edits, title-only empty beats, folding ranges, comment-free reader output, titled Beat snippets, caption association/insertion/refusal and player source-edit preservation. The actual VS Code 1.142.0 Linux Extension Development Host suite passed with an isolated profile: it exercised title display, Preview This Beat retaining the source selection, Show Beat in Source returning to the exact title line, native Collapse/Expand, Beat title prompt/Cancel/Undo, Caption snippet placeholder/Undo and existing-caption text selection. The native editor DOM showed the titled beat line while its dialogue was hidden after Collapse All Beats; Show Beat in Source revealed that dialogue, also after `editor.foldAll` nested Markdown folding. Existing chat, conversion, image, narrow-view and safety regressions passed. The host's provider result included the titled beat fold (`start: 12, end: 32`) alongside normal Markdown folds. These are automated editor/UI observations, not Ted's manual assessment or a cross-platform guarantee. No actual iPad/Safari or EPUB export is claimed.

**Limit:** VS Code merges ranges from multiple folding providers; a conflicting Markdown fold at the same start line may win for some untitled heading-first beats. Single-line beats have no foldable interior. The beat-only commands target source-derived beat starts, but exact fold selection in those collisions needs manual observation. The extension does not add region markers or suppress the Markdown provider. Multiple-preview routing is guarded by each panel's source URI; the native suite tested one document's round trip, while manual multi-document UI verification remains. Directly folding a nested chat fence immediately before Collapse All Beats produced inconsistent native folding in isolated runs; the verified nested-unfold scenario used VS Code's `editor.foldAll` to create the nested state. This remains a VS Code interaction to inspect manually, not a claim that every fold combination is deterministic.

To inspect locally: launch the Extension Development Host, open `samples/lantern.md`, use Preview This Beat from the second beat title, then Show Beat in Source; collapse/expand beats and observe the title and fenced chat in the editor. Try Insert → Beat boundary (named and empty title), Insert → Caption on beat 6's image or its existing caption, Tab through the placeholder and Undo. Run `npm run test:host` to repeat automated observations. No manuscript source or Ted's local Art adaptation was edited.

---

# Static imagery preview — 2026-10-21

**Acceptance:** Ted accepts the chat pace setting. Normal, Brisk and Deliberate remain as implemented; image presentation is a new experiment awaiting his assessment in Art.

## Implemented behaviour

A standalone ordinary Markdown image paragraph is an image component. An optional immediately following separate `*Caption: plain text*` paragraph belongs to that image; alt text remains the image’s accessibility text, and Markdown title text is not reused as a caption. Inline images stay within their prose component. Image entry defaults to zero delay. Outside `@delay` replaces that entry delay and `@pause` adds authored silence; an image itself consumes no viewing timer. The existing player governs pause, resume, replay, navigation and source-edit cancellation.

The saved adaptation’s directory is the reference base. The permitted resource root is its containing workspace folder, or that directory when outside a workspace. Relative `../` links can reach shared assets inside the root. The host rejects remote/data URLs, unsupported extensions, paths and symlinks escaping the root, absent/unreadable files and mismatched PNG/JPEG/WebP signatures. It uses VS Code `asWebviewUri` and bounded `localResourceRoots`; CSP permits only webview-local images, with no network loading or embedded scripts. The host sends a pending revision immediately to stop prior playback, resolves files, then the webview preloads them before enabling Play. Browser loading has a five-second timeout and failure placeholder. Revisions reject stale results.

**Insert… → Image** chooses an existing file, writes an encoded relative Markdown path with an editable alt-text snippet, and leaves the file in place. The operation is unsaved and one Undo; it refuses selected prose, chats, untitled documents and files outside the permitted root. The native file picker uses VS Code `showOpenDialog`.

Three small original geometric harbour fixtures (PNG portrait, WebP landscape, JPEG inline) are committed; no manuscript artwork was copied. Sample beats 6–7 show prose → delayed image → pause → chat and a captioned portrait with inline JPEG. The private Art adaptation and existing EPUB assets remain untouched.

## Validation and limits

- **79 deterministic tests pass**, plus build, syntax and whitespace checks. Coverage includes image parsing/source order, caption separation, inline/literal preservation, exact image/pause/chat timing, player cancellation, spaces/Unicode/parent paths, remote/outside/symlink/missing/unsupported/unreadable failures, and Insert command success/cancel/stale/Undo settings. Existing chat pace, conversion and safe-rendering tests pass.
- **VS Code 1.142.0 Linux Extension Development Host:** automated observations exercised the real preview and toolkit with WebP, PNG and JPEG files, delayed reveal, caption/alt, a 320px reader area, replay, missing-file placeholder, and source changes while playback was active. Earlier accepted chat/authoring regressions were also exercised. See the local `npm run test:host` runner. These are automated API/DOM observations, not Ted’s manual acceptance. The operating-system file picker was not automatically selected in this suite; the Insert command was tested with a deterministic file-picker adapter, and Ted’s manual steps in README cover the real picker.
- The first native run exposed an inline image style-class loss, which was fixed. Browser/VS Code polling made an older pace stopwatch assertion flaky; exact totals remain covered by the injected-clock tests, while native observations use a wider timing range. A previous conversion Undo check sometimes targeted a diff after focus changed; the host harness now explicitly focuses the source editor before Undo. No chat timing code was changed.

No actual Art image composition, remote VS Code workspace, Windows/macOS, screen-reader or publication/export result is established. Missing files never block beat completion, but a very slow local image may hold preparation for up to five seconds before showing a placeholder. The simple plain-text caption convention and responsive fit are provisional.

---

# Chat-local pace — 2026-10-21

Ted accepts the existing chat experience. His remaining feedback is that long exchanges accumulate too much waiting. **The new pace setting awaits his acceptance.** Imagery is next and is not implemented here.

`@pace normal|brisk|deliberate` is chat-local configuration before the first message. Omission is exactly Normal. The centrally defined multipliers 1/0.7/1.3 scale the existing bounded automatic delay, rounded per message to milliseconds. Explicit inside/outside delays, additive pauses and 600ms read ticks do not scale. Responding uses the same effective incoming-message delay, without an additional wait. Prose ordering, manual beats, pause/resume, replay and cancellation remain unchanged.

The Insert picker now offers Pace and then three described choices. It writes configuration at the start of the selected chat, replacing/moving existing declarations (including consolidating duplicates) in one unsaved Undo operation. It refuses other structural contexts and guards document/selection changes across both pickers. New chat snippets omit pace.

## Validation

- **70 deterministic tests pass**, plus build, syntax checks and `git diff --check`. Coverage includes default/explicit Normal compatibility, Unicode length, pre-scaling bounds/rounding, explicit delays and pauses, tick timing, cross-chat scope, responding duration, pause/resume/replay/cancellation, line-numbered invalid/duplicate/late configuration, helper CRLF updates and literal continuation preservation. Existing parser/converter/safe-rendering regressions remain green.
- **Actual VS Code 1.142.0 on Linux, isolated Extension Development Host:** automated native picker interaction verified Brisk insertion, Deliberate replacement, two single Undos and outside-chat refusal. Real extension webview playback exercised all three paces with an incoming responding indicator, then a 300ms pause and explicit 1200ms delay. This is temporal DOM observation in the native host, not a browser-only player mock or Ted’s manual acceptance.
- First-message observations: Normal **839ms** (target 800), Brisk **633ms** (560), Deliberate **1057ms** (1040). Second-message observations from Play: **2303ms**, **2124ms**, **2638ms** (targets 2300/2060/2540). Polling and IPC add measurement latency; exact timing is covered by the injected deterministic scheduler. Evidence: [pace-native.json](test/evidence/pace-native.json). Re-run with `npm run test:host`; full local run logs/temporal files were in `/tmp/story-teller-host-wVHdgb`.
- Existing host regression checks also passed: ready idle, mixed ordering, responding, reduced-motion sequencing, viewer alignment/ticks, source reset, navigation/focus, safe rendering, conversion preview/cancellation/staleness/Undo, native snippets and context guards. The first run stopped when a pre-existing conversion notification folded its buttons out of view; the harness now opens the native notification centre before selecting notification actions. No product behaviour was changed for that test issue.

`lantern.md` retains its first three beats and adds matching eight-message Normal/Brisk comparisons. Their summed waits are **18,865ms** and **13,835ms**, including the same unscaled 900ms pause and 1200ms explicit delay. Use README launch steps, Next to beats 4/5, Play, then Replay or the Pace helper. These authoring examples still need Ted’s comparison.

No dependencies, imagery, conversion rules, manuscript content or EPUB artifacts were added/changed. Ted’s authoring worktree, Component Types note and private untracked Art/assets were left untouched. No push, publication, release or merge.

---

# Chat authoring consolidation — 2026-10-21

## Status and acceptance

Ted has accepted Markdown/live preview, chat playback/pacing, the separate replacement/additional-silence semantics and reports conversion is good. The new Insert/Wrap experience and contextual guard choices **await his acceptance**. No remote issue/milestone is closed by this local slice; the earlier EPUB work is separate.

## Implementation

Existing conversion was reused, including diff/count/warnings, explicit Apply, stale refusal/regeneration, no save and single Undo. Source inspection is now shared by parsing, conversion and helper context checks. It recognises initial frontmatter, root beat boundaries and literal/nested code contexts. Tests explicitly verify outside `---` bytes remain unchanged through conversion, including BOM/CRLF, while initial YAML and fenced examples do not create beats.

Native **Story Teller: Insert…** supplies Chat, Beat boundary, Delay, Pause, Responding and Ticks, plus explicit Wrap Selection. Commands are contributed to the palette and Markdown context menu. Native SnippetString tab stops provide title/viewer/message fields, with the viewer linked to the first speaker. Optional flags are off until inserted. Context guards prevent nested fences, selected-text replacement, misplaced flags, metadata/example edits and wrapping across boundaries. Wrap keeps selected text verbatim and explains that it does not convert the syntax. Picker state is version/selection guarded and operations are unsaved/single-undo.

## Validation

Build/syntax checks pass; **65 deterministic parser/player/converter/helper tests pass**. Earlier timing/phase/cancellation, header responding, viewer offsets/ticks, source preservation and safe-rendering checks remain green. No dependencies or production configuration were added.

The real **VS Code 1.142.0 Linux Extension Development Host** suite exercises native picker selection, all six inserts, title/viewer/message tab stops, linked viewer edits, numeric timing placeholders, wrapping, selection/context refusals and single Undo. It also retains conversion diff/warnings/Cancel/stale/Apply/Undo, converted multiline preview and accepted playback regressions. These are automated API/DOM observations, not Ted's manual authoring/reading acceptance or OS pointer testing.

An initial full-suite attempt passed playback but could not reach the stale-conversion action because VS Code had folded the warning out of the transient toast UI. The harness now opens native Notifications before choosing Regenerate; product conversion behaviour was unchanged. A subsequent full insertion/Undo run passed. Picker cancellation and picker-stale checks are included in the final run. A DOM-only context-menu check timed out because the native popup was not exposed in the main document; a separate isolated host screenshot was inspected and shows “Story Teller: Insert…” in the Markdown context menu. Popup activation was not automated; invocation/picker behaviour is automated through the contributed command. No user settings were changed for that popup check. Additional harness adjustments wait for the rendered source fixture and keep the current chat text identical while testing insertion of an earlier beat; otherwise the test was exercising the documented edited-beat fallback rather than unchanged-beat preservation.

## Read-only Art exercise

Snapshot SHA-256 **`e60079b6167181a94ddae43370589c8bf6d2514e5221164b418353e6ee01e658`**, inspected in memory while Ted continues editing. It had **four existing boundaries / five beats**, a valid manually adapted chat and **29 remaining legacy containers**. All 29 are convertible in that snapshot, with no conversion review warning; existing valid chat is unchanged. Conversion preserves every existing boundary's exact text/EOL bytes, initial frontmatter and beat count. Second pass proposes zero changes. Source line positions may shift when fence bodies shrink; boundaries themselves do not change.

Authoring observations: legacy wrapper chats produce reader diagnostics until converted; optional settings are intentionally not inferred; Obsidian artwork embeds remain literal/unsupported in this text-only slice. Existing boundaries are useful editorial starting points, not permission to automatically split paragraphs or rewrite a scene. No manuscript words, scene boundaries or source files were changed or committed by the exercise. Only fictional/minimal fixtures are committed. The local Art file may continue changing independently of this recorded snapshot.

## Remaining limits

The helpers are intentionally conservative around code, frontmatter, partial quotes/lists and complex selections; complete quoted/list blocks may be wrapped verbatim. They do not format/convert selected dialogue or infer speakers. Delay inserted at the end of an unfinished draft still needs following content; parser diagnostics remain the guide during authoring. Cross-platform, screen-reader/high-contrast and OS background/minimise verification remain as previously noted. No images, new component types, import/export, EPUB packaging, deployment, push, release or merge were added.

---

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
