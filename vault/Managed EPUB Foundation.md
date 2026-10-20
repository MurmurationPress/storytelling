---
type: project-direction
status: accepted-direction
created: 2026-10-20
---

# Managed EPUB Foundation

## Acceptance and its limits

Ted has tested the reading shell and accepts prose → reader page turn → automatically typed PRIME state → prose as the experience sought. He describes the typing as excellent: “Pace is good and it feels alien, just what I was looking for.” Preserve that pace and character as the reference treatment. Acceptance establishes the prototype direction; it does not establish production readiness, universal EPUB compatibility or acceptance of every implementation detail.

The local acceptance recording is `Screencast from 2026-10-20 16-35-47.webm` (11.668945s) under Ted's `Videos/Screencasts`. Review samples show opening prose at ~1s, progressive output at ~4s and ~7s, and subsequent prose at ~10s. `Screencast from 2026-10-20 16-34-22.webm` (17.750816s) is a companion recording. References and hashes, not private recordings/screenshots, are stored in the [integration review](../experiments/INTEGRATION-REVIEW.md). No recording is uploaded by this integration task.

## Demonstrated separation

| Part | Responsibility established by the experiment | Still open |
| --- | --- | --- |
| Publication | EPUB 3 packages authored content, essential static meaning, component settings/code and assets in reading order | Reusable packaging representation; manuscript-to-component editorial mapping |
| Component | PRIME performs authored text, manages local progress/completion, reveal/replay and reduced-motion treatment | Small common PRIME/chat contract; component-specific actions and authored timing |
| Managed reader | Existing toolkit paginates/navigates; our host confirms presentation and sends lifecycle; reader stores enough position/state to return/reopen | Maintainable integration, capability negotiation, storage/version changes and actual device coverage |

EPUB 3 is the **candidate publication format**. The versioned host-to-component presentation connection is **our extension**, not an EPUB-standard event or an API available to arbitrary publication scripts in ordinary Thorium. EPUB.js is the demonstrated toolkit, not a permanent platform commitment. The original experiment remains useful evidence rather than the final architecture.

## Evidence we must keep distinct

- **Ordinary-reader explicit playback:** accepted PRIME typing works after Begin/Replay in the tested Thorium 3.5.1 Linux extract. Existing native evidence remains in [[Planetary Model EPUB Test]].
- **Publication-only automatic encounter:** no supported reliable signal was established in ordinary Thorium. The load/intersection research hypothesis fails the controlled invisible-preload case; TTS and media-overlay internals do not supply a silent-reading publication API.
- **Managed-reader automatic encounter:** our EPUB.js host extension demonstrates blank first encounter, automatic progressive output, preload inactivity, departure/return and reopening for the test extract. See [[PRIME Reader Integration]].
- **Browser/device coverage:** actual Linux Chromium integration tests at desktop and portrait tablet-sized viewports are not actual iPad/Safari testing. Touch, screen-reader use and broader compatibility remain unverified unless separately evidenced.

## Fallback direction

Every publication must retain an authored static presentation carrying essential meaning without the host extension or scripts. Where ordinary-reader scripting supports it, optional manual playback may supplement that static presentation. The full managed experience uses our reader's presentation lifecycle. Reduced motion must give an understandable static state; immediate reveal and reader-owned navigation remain available.

For chat, a plain list of words may omit expressive silence or a typing indicator that never becomes a message. How to preserve that essential meaning in a static transcript needs an editorial decision against the selected passage; it must not silently rewrite dialogue or discard meaning.

## Next limited milestone

Develop reusable PRIME and authored-chat components in the managed EPUB reader. The contract should grow from those two real cases: draft the small shared lifecycle, select/pin a real conversation, then let chat expose assumptions before calling the contract settled. Reader enter/leave is distinct from local play/replay/reveal and component completion. Stable occurrence identities and versions must protect state restoration.

Five focused issues cover contract, reader integration, reusable PRIME, chat, and publication packaging/fallback. Their links and proposed order are recorded below once created. Contract discovery and chat passage analysis can proceed together; they are not a circular implementation dependency. Reader integration and PRIME extraction can proceed against the initial contract while chat refines it. Packaging starts with provenance/fallback requirements and closes the integrated two-component acceptance path.

Obsidian remains the current authoring workshop. No permanent Obsidian dependency, template language, generic storyboard schema or editor is chosen. Components grow from actual manuscript needs, not a catalogue of imagined widgets.

## Scope boundary

Ted's current authorisation supersedes “no tickets yet” **for this one limited milestone** and authorises review/integration of PRs #1 and #2. It does not authorise implementing the new issues in this task. Earlier exploratory notes stay exploratory. The current task does not authorise catalogue management, accounts/payments, production hosting, a general storyboard editor or arbitrary untrusted-EPUB loading.

Keep [[Component Types]] intact as Ted's authored possibilities. [[Future Component Possibilities]] records Skip's performed drawing and invitation to continue a line, JANUS, contextual previews, video, applications, footnotes and sound outside the milestone. These are not an extra backlog.

Known foundation constraint: the scripted EPUB.js shell is for bundled trusted content, not a secure arbitrary-book sandbox; its pinned XML dependency advisories remain unresolved. The reader issue must assess the actual shipped browser bundle/dependency path and retain a clear trust boundary. A dependency override alone does not patch code already embedded in a prebuilt bundle.


## Milestone and proposed order

[Managed EPUB foundation: reusable PRIME and chat](https://github.com/MurmurationPress/storytelling/milestone/1) — five open issues; no due date inferred.

- [#3 — Define the small PRIME/chat component contract](https://github.com/MurmurationPress/storytelling/issues/3)
- [#4 — Make managed-reader presentation lifecycle maintainable](https://github.com/MurmurationPress/storytelling/issues/4)
- [#5 — Extract the accepted reusable PRIME typing component](https://github.com/MurmurationPress/storytelling/issues/5)
- [#6 — Build authored chat from a pinned manuscript conversation](https://github.com/MurmurationPress/storytelling/issues/6)
- [#7 — Package PRIME and chat with meaningful EPUB fallbacks](https://github.com/MurmurationPress/storytelling/issues/7)

Start #3's contract discovery together with #6's real-conversation selection/behavioural analysis. Then reader integration (#4) and PRIME extraction (#5) can proceed against the first contract while chat (#6) implements and refines it. Packaging/provenance/fallback policy (#7) can begin early; its final two-component build closes the milestone. This is a proposed order, not a dependency cycle or an implementation schedule.

**Recommended first code task:** #5, extracting the accepted PRIME renderer behind #3's initial small contract, retaining the existing extract as a regression fixture. First establish that draft and the real chat case; chat remains the next new delivery component, not blocked on the PRIME extraction finishing.
