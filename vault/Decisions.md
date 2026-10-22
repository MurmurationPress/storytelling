---
type: decision-log
status: active
---

# Decisions

## 2026-10-22 — Accept Story Teller navigation and settings; trial State conversion

**Ted's acceptance:** page-turn autoplay, type-out border/fill choices and the component settings helper are accepted. This supersedes their earlier awaiting-acceptance entries below. The acceptance concerns the local Story Teller authoring/preview experience, not EPUB export or general reader compatibility.

**Authorised experiment:** convert recognised `[!State]` callouts in an active copied Markdown adaptation by resolving direct top-level `=this.field` references from its own YAML frontmatter. The converter proposes a diff and leaves unclear material for review. It does not execute Dataview, alter beat boundaries or change original vault/manuscript sources. This new conversion awaits Ted's assessment.

## 2026-10-22 — Trial page-turn autoplay in Story Teller

**Authorised experiment, awaiting Ted's acceptance:** add a reader preference (on by default) so a manual Next turn starts the destination beat without another Play press. This does not turn pages automatically. Opening/Preview This Beat and Restart remain ready; Previous reveals the preceding beat silently for rereading; Replay starts the current beat again. The preference is stored outside manuscript Markdown. Existing accepted components, conversion and authoring behaviour remain accepted; this new navigation policy needs Ted's review on an installed VSIX.

## 2026-10-21 — Accept the current Story Teller authoring experience; stabilise a local installable milestone

**Ted's acceptance:** Markdown editing with live preview; prose/chat sequencing, automatic chat timing and chat-local pace; explicit delays, pauses, responding indicators and ticks; static images, captions and image insertion; named beats, folding and source/preview navigation; type-out formats and audible modem/keyboard/typewriter sounds; chat conversion, callout-to-type-out conversion and the existing Insert helpers. Synthesised sounds are sufficient for this milestone. Richer texture is a possible later refinement.

**Authorised work:** review and correct material defects, consolidate the guide and evidence, package and verify a local VSIX, and commit only intended Story Teller changes on the existing feature branch. This is acceptance of the tested authoring/playback behaviour, not approval of EPUB export, publication readiness, general editor compatibility or a public release. The original manuscript, private adaptations and unrelated EPUB work remain separate.

## 2026-10-21 — Accept Story Teller type-out; test callout conversion

**Ted's acceptance:** type-out playback and audible modem, keyboard and typewriter sounds are verified by Ted. Richer sound texture is a possible later refinement, not a requirement for this conversion task. This supersedes the earlier awaiting-acceptance status for the current type-out mechanism.

**Authorised experiment:** a conservative current-document conversion of recognised manuscript machine-output and annotation callouts into titled type-out beats. The original manuscript stays unchanged. Diff review, explicit Apply and source-located warnings are part of this authoring workflow; conversion rules await Ted's assessment on a copied chapter.

## 2026-10-21 — Accept Story Teller beat helpers; test performed type-out

**Ted's acceptance:** named beats, beat folding, explicit source/preview navigation and Caption insertion are accepted. This supersedes their earlier awaiting-review status; it does not approve unrelated publishing or conversion work.

**Authorised next experiment:** one literal type-out component for PRIME/Divergent YAML-style output and annotations, with independent format and sound settings, grapheme-based reveal and optional local sound. This is a Story Teller preview capability awaiting Ted's assessment, not an adaptation of manuscript passages or an EPUB packaging decision.

## 2026-10-21 — Accept Story Teller static imagery; test beat authoring helpers

**Ted's acceptance:** the first static-imagery presentation in Story Teller is accepted. This does not decide publication packaging or treatment of manuscript artwork.

**Authorised next experiment:** optional beat-title metadata, native beat folding, explicit source/preview navigation and a Caption insert helper. These new authoring controls await Ted's assessment. They keep standalone `---` as the beat boundary and preserve accepted chat and imagery behaviour; no manuscript adaptation is changed by this authorisation.

## 2026-10-20 — Record ideas before opening tickets

**Ted's explicit direction:** create a repository, include the vault in it and use the vault to develop ideas before launching into tickets. The purpose is buying thinking time.

Consequence: initialise a notebook, not an implementation backlog. No tickets or application scaffolding are part of this step.

## 2026-10-20 — Obsidian is the present workshop

**Ted's explicit direction:** use a tool he understands and can enhance. Its long-term suitability is unresolved.

Consequence: use readable Markdown and a minimal vault setup; do not assume an Obsidian plugin must be the final product.

## 2026-10-20 — Begin source exploration with Art

**Ted's selected candidate:** Art from CONSTRAINT is a good starting point.

Consequence: inspect and storyboard that chapter before making detailed prototype requirements. PRIME/JANUS dialogue presentation can be explored separately.

## 2026-10-20 — Do not constrain the project to Ghost

**Ted's explicit direction:** an independent site is possible.

Consequence: leave platform and hosting choices open.

## Initial setup choices

**Assistant's initial choices:** working name `murmuration-storytelling`; recommend a private remote repository while working with manuscript material; keep the vault under `vault/` so future code can live alongside it.

**Ted's subsequent choice:** created the private repository [MurmurationPress/storytelling](https://github.com/MurmurationPress/storytelling) and supplied its URL for the prepared vault to be added. The vault lives under `vault/`, alongside repository-level documentation. The earlier repository name was provisional; no product name is settled.

No product name, markup syntax, technology stack, business model or delivery schedule is agreed.

## 2026-10-20 — Sequential app experience; wiki reading model dropped

**Ted's explicit clarification:** the publication is delivered in sequence in a managed app-like environment. He has stopped considering a wiki as the reading model because controlling navigation would be too difficult.

Consequence: retain modular composition as an authoring possibility, but do not treat links as permission for free traversal of the narrative. Asides can remain contextual and bounded. Details of revisiting read material remain open.

**Ted's requested next investigation:** check existing platforms before committing to building our own. An initial documentation comparison is in [[Existing Platforms]]. No platform is selected and no purchase or implementation is authorised by that comparison.

## 2026-10-20 — Authorised focused Planetary Model EPUB experiment

**Ted's explicit direction:** build and evaluate the first small EPUB 3 capability prototype, using the current authoritative Planetary Model manuscript, preserving wording and the existing image, with reader-owned page turns. Create a branch and PR; do not merge or publish a site.

This authorises implementation of the extract experiment only. The earlier thinking-space constraint continues to apply to general platform work. No publishing platform, general authoring language, hosting service or technology stack is selected by this work.

**Original experiment finding, qualified by the subsequent playback investigation in [[Planetary Model EPUB Test]]:** Thorium Desktop 3.5.1 on Linux supports the tested mixed-layout sequence and explicitly started YAML performance with native page turns. Automatic encounter-triggered playback was not established; Begin output is required. Other reader/platform support remains unverified. See [[Planetary Model EPUB Test]] for source pin, artifact and evidence.


## 2026-10-20 — Repair explicit-start playback within PR #1 (subsequently clarified)

**Ted's direction:** investigate the reported immediate full-reveal defect using default-reader native tests, correct playback without changing his settings, preserve authored content and reader page turns, and keep the existing PR unmerged. Automatic arrival activation remains outside this repair.

**Finding:** the original symptom has not reproduced locally; playback-v2 hardens demonstrated colour/visibility failure paths and has temporal native evidence. Ted's exact failure cause is not established. Preserve the original success report as history rather than replacing it with an unqualified correction claim. See [[Planetary Model EPUB Test]].


## 2026-10-20 — Distinguish typing from automatic encounter

**Ted's recording and clarification:** playback-v2 demonstrates progressive typing. The remaining requirement is for the page turn itself to introduce a blank scripted surface and automatically perform PRIME's state, rather than first showing complete text and requiring Play. Completed-page return may show complete state with optional replay.

**Authorised investigation:** test supported arrival signals in unmodified Thorium 3.5.1 on Linux, retain native turns and accessible alternatives, and keep PR #1 unmerged. If reliability cannot be established, retain explicit playback as a separate capability and explain the reader integration needed. No new reader or reader patch is authorised by this step.

**Finding:** the load/intersection hypothesis can perform after the tested native turn but also performs during a controlled invisible preload. No supported reliable active-page contract was established; automatic encounter remains unresolved. Native recordings and the source inspection are in [[Planetary Model EPUB Test]]. The prior interpretation of Ted's recording as failed progressive typing is superseded.


## 2026-10-20 — Reading position is a reader integration boundary

**Finding, not a new implementation:** Thorium 3.5.1 and its pinned vendored Readium code coordinate native location, TTS start/highlighting/navigation and media overlays through application/preload mechanisms. No supported publication-facing silent component-arrival contract was found. Speech playback is not an activation workaround. See [[Planetary Model EPUB Test]] and the linked exact-source trace.

**Proposed next step, not a settled platform choice or authorised reader build:** agree a small supported presentation bridge with a reader/toolkit before another automatic-arrival experiment. Existing Readium application APIs could support integration, with additional committed-presentation filtering. Keep working playback-v2 unchanged. No new EPUB is justified by this trace; automatic encounter remains unresolved and PR #1 remains unmerged.


## 2026-10-20 — Authorised separate reader-integration experiment

**Ted's explicit direction:** build a minimal browser reading shell using an existing EPUB toolkit and a versioned host-to-PRIME presentation connection. Use a new branch/stacked PR, preserve PR #1 and its artifacts, and merge/deploy neither. This authorises the small shell, not a general platform or a Thorium fork.

**Implementation choice for this experiment:** EPUB.js opens and paginates a distinctly named derivative EPUB. Its global-layout limitation is addressed with bounded reflowable state/image resources; manuscript text and SVG remain preserved. This is not a settled project-wide toolkit decision.

**Integration distinction:** the host's explicit committed-presentation contract is our extension, not an EPUB-standard feature or an API available in ordinary Thorium. See [[PRIME Reader Integration]] for results, evidence, fallback behaviour and platform limits.

**Verified result in this host:** the real EPUB.js sequence automatically performs on encounter while a controlled invisible rendition remains inactive. Departure/return, stored-checkpoint reopening, stale-message rejection and accessible static alternatives pass browser checks at desktop and portrait tablet dimensions. Actual iPad/Safari remains unverified. This establishes a small host-integration capability, not an ordinary-Thorium fix.


## 2026-10-20 — Accept the experiment direction and authorise the foundation milestone

**Ted's acceptance:** the tested prose → page turn → automatically typed PRIME state → prose experience is the sought direction. Typing is excellent, well paced and alien. The local 16:35:47 recording and companion 16:34:22 recording are referenced with hashes in the [integration review](../experiments/INTEGRATION-REVIEW.md); private recordings are not uploaded. This is prototype acceptance, not production readiness, broad reader compatibility or blanket approval of implementation details.

**Current direction:** EPUB 3 is the candidate publication package; components perform authored passages; our managed reader supplies explicit presentation lifecycle. The encounter connection is our extension, not standard EPUB or a capability available in ordinary Thorium. Preserve meaningful static fallback and optional manual playback where supported. Components grow from real passages. Chat is the next new component; Obsidian remains the current workshop with its long-term role open.

**Superseding authorisation:** Ted explicitly authorised reviewing/integrating PRs #1/#2 and creating one five-issue milestone. This supersedes earlier keep-unmerged and no-tickets-yet instructions for this bounded work. It does not authorise implementing the milestone in this task or expanding into a general platform. Historical entries remain evidence of their original scope.

**Verified integration:** PR #1 reviewed at `d8cc649`, workspace-only correction `2584e5c`, merged as `3c3922329d80a224075a3ee90167f23867320a67`. PR #2 reviewed at `1edc684`, retargeted to main with all 78 effective changes intact, merged as `b55f08bd03953f01e05544c9e3f9dbd7c91893eb`. Expected-head merge guards were used. Builds/source/package/browser interaction checks pass; browser viewports do not constitute actual iPad/Safari verification. Ordinary-Thorium publication-only encounter remains unresolved.

**Notes preserved:** Ted's local [[Component Types]] was brought into main byte-for-byte without switching/resetting his authoring worktree. Future drawing/line invitation/JANUS/previews/video/apps/footnotes/sound ideas remain in the vault, outside the milestone.

**Planned, not implemented:** [Managed EPUB foundation: reusable PRIME and chat](https://github.com/MurmurationPress/storytelling/milestone/1); contract #3, reader #4, reusable PRIME #5, authored chat #6, packaging/fallback #7. See [[Managed EPUB Foundation]] for issue links, proposed order, evidence and security/dependency constraints.


## 2026-10-21 — Story Teller manual scene-preview slice

**Ted's explicit direction:** implement a small VS Code extension for adapting completed books, with independent parser/player, prose and chat within beat boundaries, manual progression and live preview. This supersedes earlier no-scaffolding guidance for this specific slice only. The Markdown syntax remains provisional. Existing EPUB work and author-authored notes are preserved; no publication, release or merge is authorised. See [[Story Teller]].
