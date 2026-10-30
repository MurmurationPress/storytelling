---
type: implementation-experiment
status: accepted-reader-review
created: 2026-10-23
---

# Story Teller Web Reader

**Playback-speed acceptance (2026-10-28, PR #22 / issue #13):** Ted reports,
“0.75 works best for me.” and “Checked all three tests, working well.” This
accepts the playback-speed feature at `28d9fc9823f023961e3dc137e24693e80e094e4d`;
0.75× is his personal preference. **1× remains the compatibility default.**
The report does not identify the three tests individually or establish specific
device/browser versions, exhaustive platform coverage or human audio findings.
Final review/integration is authorised; no release or deployment is authorised.
See the [validation records](../tools/story-teller/RESULTS.md).

**Ted’s actual-device acceptance:** Ted tested the standalone reader on his actual iPad over the local network and reported, “It works well.” This is his general acceptance of the reading experience. No browser/Safari version, human audio verification or exhaustive per-feature coverage was supplied. Automated browser emulation remains separate evidence.

**Direction:** export the existing separate adaptation project into a portable static HTTP reader. Ted accepts supporting content at PR #14's `e9e04b3e194ec6458da59ee07ecc5094d8acf869`; that earlier acceptance is separate from the subsequent iPad report above. PRs #12/#14 were already merged before this task. This separate branch starts from integrated main and targets main, without merging/deploying anything.

**Implemented trial:** the extension and browser share `reader-presentation.cjs`, StoryPlayer, parser/Markdown, type-out, sound, scroll-follow and SupportingReader. The VS Code entry only supplies its messaging/state adapter. A browser adapter loads static publication/scene JSON, uses manifest order/identities, supplies note snapshots and stores reader preferences/location locally. Scenes have explicit turns; Contents selection may autoplay, but scene completion never automatically advances. Opening/reopening stays ready; departure pauses. A next-scene action is available at a completed final beat.

**Authoring/export:** Export Web Reader uses saved project data and refuses dirty buffers. The CLI cannot inspect editor buffers and requires saving first. Output is new and outside the project, with temporary construction, source-hash/dirty checks and exclusive destination reservation. Initial scene frontmatter/import provenance are omitted after pacing resolution. Source wording remains unchanged. All Markdown in Supporting Content is deliberately publication material; unrelated vault files and unreferenced assets are excluded. Note refresh in the extension remains separate: a web book is a snapshot, not a live connection to author files.

**Safety:** shared HTML-disabled rendering, inert ordinary URLs, explicit aliases, bounded local-image resolution and content-addressed copying. Traversal/symlink escapes abort. Missing images/targets remain diagnostics/placeholders. Original animated WebP bytes are copied; frames are browser-owned and not synchronised to Pause/Replay. The static reader needs no Node.js, editor, application backend or external media service. HTTP(S) delivery is required; no file:// or offline service worker claim.

**Evidence/limits:** see [guide](../tools/story-teller/WEB-READER.md), [results](../tools/story-teller/RESULTS.md) and committed synthetic HTTP-browser observations. Chrome headless desktop and mobile/touch/reduced-motion emulation are not actual iPad/Safari or human listening. Existing native-editor intermittency remains historical evidence; a passing run does not establish a cure. Extension-level licence terms remain unresolved and unchanged. No manuscript/private media is committed or exported for testing.

**Current task:** finish review/validation and integrate PR #15 using an exact-head squash guard if no material blocker remains. No hosting, EPUB work, component redesign or general platform is part of this trial.

**Closeout corrections:** the installed cross-root preview could retain an old active iframe while a replacement reported ready; changing HTML and resource policy in-place was the unreliable integration path. A root change now disposes/replaces the panel in the same group, using public VS Code APIs and waiting for its own ready signal. Same-root reuse remains. Conflicting repeated export reads also abort. The standalone reader bundles, templates/styles and normal synthetic export bytes are unchanged from 0.10.0, so this is not a new iPad reading treatment. See the closeout RESULTS/evidence for exact native classifications and remaining limits.

**Optional analytics review (2026-10-30):** [[Reader Analytics]] records Ted's
request and implemented export/runtime candidate for The Curious Adventures of
Skip. Website consent does not currently carry to the reader. Completion means
observed display coverage, not proof of reading. Merge/production remain pending.
