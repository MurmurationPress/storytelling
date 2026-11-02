---
type: implementation-experiment
status: provisional-slice
created: 2026-10-21
---

# Story Teller

**Playback-speed acceptance (2026-10-28, PR #22 / issue #13):** Ted reports,
“0.75 works best for me.” and “Checked all three tests, working well.” This
accepts the playback-speed feature at `28d9fc9823f023961e3dc137e24693e80e094e4d`;
0.75× is his personal preference. **1× remains the compatibility default.**
The report does not identify the three tests individually or establish specific
device/browser versions, exhaustive platform coverage or human audio findings.
Final review/integration is authorised; no release or deployment is authorised.
See the [validation records](../tools/story-teller/RESULTS.md).

**Chat-wikilink acceptance (2026-10-27):** Ted tested the PR #21 candidate
(`c0338666fc3a44ddf71b115db346b95c172ead73`) in his actual Story Teller project
and reports: “That works well. Will be very useful.” This accepts the desktop
chat-wikilink behaviour he tested. It does not establish exhaustive feature
acceptance or new iPad/Safari, touch or other-platform coverage. The synthetic
automated VS Code/standalone-reader checks remain separate evidence in the
[results](../tools/story-teller/RESULTS.md). Ted authorises final review and
expected-head squash integration; no release, tag movement or deployment.


**Standalone reader acceptance:** Ted tested the web reader on his actual iPad over the local network and says, “It works well.” Browser version, audible sound and exhaustive feature coverage are not established by that report. See [[Story Teller Web Reader]] for the distinct acceptance and validation records.

**2026-10-23 accepted integration:** Ted accepts PR #12's manuscript import, Part–Scene Outline, prose pacing, scroll-follow, all five keyboard shortcuts and scene-opening autoplay, and PR #14's supporting wikilinks/aliases, previews, nested reading panels and refresh. Earlier pending entries are historical. This is author acceptance of the extension experience, not platform certification, publication readiness or resolution of native-test intermittency. Ted also demonstrated animated WebP through the existing Image insert; no playback synchronisation, pause/replay control of image frames or new media component is established. JANUS will use existing notes and directives; no separate JANUS component is needed. A subsequent standalone export/reader trial is recorded in [[Story Teller Web Reader]]; its acceptance is separate.

**2026-10-23 acceptance and supporting-note trial:** Ted accepts scroll-follow, the five keyboard commands and outline scene autoplay at `bf846888f0cbedc70328ff103eea12b9ea8b861e`. Earlier pending records are historical. The new [[Supporting Content]] trial provides explicit wikilink hover/focus previews and a bounded reading panel without adding notes to the story sequence. Ted has now accepted it (see the integration record above). It is implemented in the extension preview only; the standalone web reader remains a later task.

**2026-10-23:** Ted has tested and accepted automatic scroll-follow. The 0.8.3 trial adds direct, rebindable beat commands and an outline-to-reader scene-opening action under the existing Autoplay preference. Those conveniences await his acceptance. The reader cancels outgoing playback on scene selection, reuses one preview, and requires an in-reader gesture where sound cannot start automatically. See the extension guide/results for keyboard bindings, evidence and limits.

**2026-10-22 scroll-follow trial:** the local preview now tests automatic following of visible prose, chat, image and type-out content, with reader-controlled suspension/resumption and top-of-beat navigation. It is implemented for Ted's assessment, not yet accepted or a claim about EPUB readers. The prior accepted playback and automatic prose pacing remain as recorded below.

**2026-10-22 acceptance and navigation trial:** Ted accepts automatic prose pacing in the imported adaptation. The 0.8.1 preview adds a bottom Next button after completed beats, after trailing authored silence; it uses the existing manual turn and Autoplay preference. A completed final beat displays “End of scene.” This new placement awaits Ted's acceptance. Cross-scene playback and publication export are not implied.

**Current acceptance (2026-10-22):** Ted has accepted the formatted annotation reveal. Its earlier awaiting-assessment note below is historical. Keyboard IntelliSense and State metadata conversion are now accepted by Ted; their earlier pending status below is historical. The final authoring milestone remains a local preview and installable VSIX, separate from EPUB delivery and manuscript originals. Native review found an intermittent folding failure during source/preview switching; after correcting the preview reveal and presentation exchange, four full clean-profile native runs passed. The tab-switch race is a likely explanation, not an isolated proof. See [results](../tools/story-teller/RESULTS.md).

**Keyboard-first directive help trial (2026-10-22; historical pending status, now accepted):** Story Teller now proposes parser-supported directives and values through native VS Code completion on `@` or Ctrl+Space in valid authoring positions, with hover explanations. It reuses existing settings and does not introduce manuscript syntax or change playback. Literal prose/code/type-out body remains outside this authoring help. The earlier accepted experience and provisional State converter are preserved; [the guide](../tools/story-teller/README.md) and [results](../tools/story-teller/RESULTS.md) distinguish tested behaviour from Ted's assessment.

**Current acceptance (2026-10-22):** Ted has also accepted page-turn autoplay, type-out border/fill and the context-aware component settings helper. Their earlier “awaiting acceptance” entries below are historical. At this point the new **Convert Scene Metadata** command was a separate trial awaiting his assessment (now accepted): it proposes ordinary Markdown from top-level State callouts using direct fields in the same file's YAML frontmatter, with diff review and no manuscript changes. It is not a live Dataview renderer. See the [extension guide](../tools/story-teller/README.md) and [results](../tools/story-teller/RESULTS.md).

**Type-out panel settings and authoring-helper trial (2026-10-22, awaiting Ted's acceptance):** optional border none/grey and fill none/grey/yellow choices let an adaptation vary the type-out surface without changing its format, sound or speed. Existing omitted settings keep their earlier appearance. The Insert workflow now offers context-aware header editing for existing chat and type-out settings, including speed; the Markdown body remains literal. This is a provisional local preview treatment, not a new manuscript conversion rule or publication format. Page-turn autoplay also remains awaiting acceptance.

**Page-turn autoplay trial (2026-10-22, awaiting Ted's acceptance):** a visible, default-on reader toggle governs whether a manual Next turn performs the next beat immediately. Previous presents its predecessor complete and silent; Restart returns to the first beat ready; explicit source/preview navigation stays ready. This is preview/player navigation policy and a saved reader preference, not manuscript timing metadata or automatic progression to another beat. The accepted component and conversion experience below is unchanged. See the extension README and RESULTS for checks and limits.

**Current acceptance (2026-10-21):** Ted accepts the Markdown/live-preview workflow and the accumulated prose, chat, pace, timing, responding, ticks, imagery/caption, named-beat/folding/navigation, type-out/audio, conversion and Insert helper behaviour. Synthesised modem, keyboard and typewriter sound is sufficient; a richer texture is only a possible later refinement. The historical “awaiting acceptance” notes below record earlier states and are superseded for these features. This remains a local authoring tool, not an EPUB exporter or a general publishing platform. The stabilisation milestone prepares a VSIX for local installation without touching the separate manuscript adaptation.

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

## Accepted pace; first static imagery slice — 2026-10-21

**Ted’s acceptance:** chat pace is accepted. Normal remains the original timing; Brisk and Deliberate scale only calculated message waits. Existing `@delay`, `@pause`, responding, viewer and ticks behaviour is retained.

**Implemented for review, not yet accepted as a reading experience:** ordinary Markdown images now form a component when the image is the whole paragraph. Inline images remain inside prose. An immediately following separate plain italic `*Caption: …*` paragraph is an optional caption, distinct from accessibility alt text. The existing outside delay and pause govern image entry and authored viewing silence. Local PNG/JPEG/WebP references resolve relative to the saved adaptation and stay within its containing workspace (or source directory outside a workspace); missing or unsupported references give a readable placeholder and warning. These are preview rules, not a manuscript or EPUB standard. No private Art adaptation or artwork was committed. See the Story Teller README and RESULTS for exact behaviour, tests and limits.

**Still open:** Ted’s assessment of image composition in his separate Art adaptation, and eventual publication/export treatment. Static imagery here does not settle animation, drawings, video or a broader media library.

## Accepted static imagery; beat authoring helpers — 2026-10-21

**Ted’s acceptance:** static imagery is accepted. The prior “awaiting acceptance” status above records its state when first implemented and is superseded for the static-image treatment. Publication/export handling remains open.

**Implemented for Ted’s review:** an optional `<!-- beat: Title -->` immediately after a `---` boundary, or before first-beat content after frontmatter, gives authoring metadata without reader text or playback time. Duplicate titles are valid; source ranges drive navigation. The preview shows the current title, and explicit Preview This Beat / Show Beat in Source commands connect the editor and preview without cursor-driven playback changes. Native beat folding and beat-only collapse/expand commands use the existing Markdown editor. Insert Beat asks for an optional title; Insert Caption completes the existing plain italic caption convention. These helpers are provisional and await Ted’s acceptance. No Art adaptation or manuscript artwork is changed; normal Markdown, existing chat pace and timing, and manual beat progression remain.

## Accepted beat helpers; provisional type-out — 2026-10-21

**Ted's acceptance:** named beats, folding, source/preview navigation and Caption insertion are accepted. The earlier awaiting-acceptance wording above is historical.

**Implemented for review:** a top-level fenced `typeout` component shares one literal grapheme-reveal mechanism across YAML-style PRIME/Divergent output and annotations. `@format` chooses visual treatment; `@sound` independently chooses a restrained local modem, keyboard, typewriter or silent treatment; `@speed` sets graphemes per second. Audio is reader-controlled and muted preference is stored outside the manuscript. Existing `@delay`/`@pause` still govern entry and subsequent content. Source and manuscript conversion remain separate work; fictional examples and validation are in the extension README/results. This new type-out/sound experience awaits Ted's acceptance, especially its heard quality.

**Audio defect and correction:** Ted also saw “Sound unavailable” in his normal Development Host. Native diagnostics captured `TypeError: Illegal invocation` at voice creation while `AudioContext` was running. The browser interval methods had been called with the component as receiver. Their default wrappers now invoke them through the browser global. Native automation sees a running context and connected/disconnected voice with no warning after the fix; actual heard quality still requires Ted's check. The CSP and manuscript content were not changed. See the extension RESULTS for the bounded evidence.

## Accepted type-out; conservative callout conversion — 2026-10-21

**Ted's verification:** type-out playback and audible modem, keyboard and typewriter sound work for him. The previous note's pending sound assessment is superseded. Richer sound texture remains a possible future refinement.

**Implemented for review:** a current-document command proposes conversion of observed `[!prime-log]`, `[!divergent]` YAML callouts and `[!annotation]` notes into named beats with the accepted type-out component. Its source rules were inspected read-only in the local CONSTRAINT checkout at `341923a917a84be5cfbcbf4601ba7d572e0235d6`. Unclear wrappers remain unchanged with source warnings. The diff/explicit Apply, stale-source protection, one Undo and no-save rules reuse the existing chat-conversion workflow. This authoring conversion awaits Ted's assessment on a copied chapter; it does not establish a full manuscript import or EPUB export.

# Formatted annotation reveal — 2026-10-22

**Implemented for Ted's assessment:** `@format annotation` now renders safe Markdown structure once and reveals its visible Unicode text within that structure. Paragraphs, emphasis, lists, blockquotes and inline code retain their formatting during playback. Normal prose and annotations show Obsidian wiki-link labels as inert text. Literal YAML type-outs retain their exact text and timing path. The type-out header/body boundary, sound and accepted playback controls remain. This is a preview treatment for a separate adaptation file, not a manuscript rewrite or EPUB feature. See the extension README and RESULTS for timing rules and native evidence; Ted has not yet accepted this refinement.

## 2026-10-22 — Manuscript import trial

Ted has accepted keyboard IntelliSense and State metadata conversion. The earlier awaiting-review statements are historical. The separate Markdown manuscript importer in issue #10 is implemented for review and **awaits Ted's acceptance**. It reads MWC-prepared `type`, `parent` and an author-selected order field into a versioned Story Teller project; the reader's existing single-file preview remains available. Source inspection at PrimeTrilogy revision `5bbe44d242a2f2db56ff75ab1ef864e8b564fb20` found CONSTRAINT with six structural part notes, 38 ordered scenes and three unprepared `scene-draft` notes excluded with warnings. MWC revision `08ec248d6bdd1cef33cd1eab255df24430a8e9fa` defines `manuscript_order_key` as ten uppercase base-36 characters ordered lexically among siblings. The source's older `manuscript_sequence` is reporting metadata and is incomplete for part ordering. Shared PNG assets require a containing vault root; SVG visualisations remain unsupported by the current Story Teller image preview and are flagged, not silently rasterised. This is a local authoring import, not publication packaging or source reimport.

## 2026-10-22 — Imported project use and optional prose pacing

Ted reports that he successfully imported and ran the project. His corrupted screencast was a recording problem, not evidence of a product defect. The earlier importer acceptance status above was the status before his report; his report confirms use, while editorial review of every imported scene remains open.

For Ted's current CONSTRAINT adaptation, an **optional** book setting in `story-teller.project.json` (`settings.prosePacing: "on"|"off"`) and initial scene frontmatter override (`story_teller_prose_pacing: on|off|inherit`) now control paragraph pacing. Absence remains Off. This is Story Teller presentation metadata in a separate adaptation, not a manuscript source change or EPUB rule. Top-level paragraphs appear fully formatted in sequence; each preceding paragraph adds a bounded visible-word reading interval before another item. Outside `@delay` replaces that boundary interval; `@pause` adds silence; a chat message keeps its own timing. The import review panel and one-shot destination outline reveal were improved for authoring. These new enhancements await Ted's acceptance, and the initial 60ms/word formula is tunable after real-scene review. See README/RESULTS for exact semantics and evidence.

## Component-owned identity — 2026-11-02 review candidate

**Ted's implementation request:** separate callout identity from reading rhythm
across the existing converters, typeout formats and migration of adaptations.
Optional fenced `@title` and `@timestamp` identify components; conversion preserves
beat boundaries/titles. Explicit `@identity component` separates intentional
untitled components from legacy JANUS beat-heading compatibility.

The 0.16.0 review candidate adds document/selection migration and a deliberate
manifest-bounded project review, with per-file diff/Apply/Undo. A beat title or
single fence alone is not ownership evidence; ambiguous cases require individual
author attribution. Actual book adaptations remain untouched. See the
[component identity guide](../tools/story-teller/COMPONENT-IDENTITY.md) and
[validation](../tools/story-teller/test/evidence/component-identity/README.md).
Implementation/test evidence is separate from author acceptance; no merge or
production deployment is authorised by this implementation task.
