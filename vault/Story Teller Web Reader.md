---
type: implementation-experiment
status: awaiting-ted-acceptance
created: 2026-10-23
---

# Story Teller Web Reader

**Direction:** export the existing separate adaptation project into a portable static HTTP reader. Ted accepts supporting content at PR #14's `e9e04b3e194ec6458da59ee07ecc5094d8acf869`; that does not accept this new delivery. PRs #12/#14 were already merged before this task. This separate branch starts from integrated main and targets main, without merging/deploying anything.

**Implemented trial:** the extension and browser share `reader-presentation.cjs`, StoryPlayer, parser/Markdown, type-out, sound, scroll-follow and SupportingReader. The VS Code entry only supplies its messaging/state adapter. A browser adapter loads static publication/scene JSON, uses manifest order/identities, supplies note snapshots and stores reader preferences/location locally. Scenes have explicit turns; Contents selection may autoplay, but scene completion never automatically advances. Opening/reopening stays ready; departure pauses. A next-scene action is available at a completed final beat.

**Authoring/export:** Export Web Reader uses saved project data and refuses dirty buffers. The CLI cannot inspect editor buffers and requires saving first. Output is new and outside the project, with temporary construction, source-hash/dirty checks and exclusive destination reservation. Initial scene frontmatter/import provenance are omitted after pacing resolution. Source wording remains unchanged. All Markdown in Supporting Content is deliberately publication material; unrelated vault files and unreferenced assets are excluded. Note refresh in the extension remains separate: a web book is a snapshot, not a live connection to author files.

**Safety:** shared HTML-disabled rendering, inert ordinary URLs, explicit aliases, bounded local-image resolution and content-addressed copying. Traversal/symlink escapes abort. Missing images/targets remain diagnostics/placeholders. Original animated WebP bytes are copied; frames are browser-owned and not synchronised to Pause/Replay. The static reader needs no Node.js, editor, application backend or external media service. HTTP(S) delivery is required; no file:// or offline service worker claim.

**Evidence/limits:** see [guide](../tools/story-teller/WEB-READER.md), [results](../tools/story-teller/RESULTS.md) and committed synthetic HTTP-browser observations. Chrome headless desktop and mobile/touch/reduced-motion emulation are not actual iPad/Safari or human listening. Existing native-editor intermittency remains historical evidence; a passing run does not establish a cure. Extension-level licence terms remain unresolved and unchanged. No manuscript/private media is committed or exported for testing.

**Next decision:** Ted assesses the synthetic web reader and, if appropriate, exports a saved copy of his adaptation locally. No hosting, EPUB work, component redesign or general platform is part of this trial.
