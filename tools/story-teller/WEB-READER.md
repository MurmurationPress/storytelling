# Static Story Teller reader (0.10.1 review baseline)

Export a **saved, separate adaptation project**, not the manuscript vault. The extension and browser use the same parser, StoryPlayer, pacing, Markdown/type-out renderer, sound, scroll-follow and SupportingReader. Only their host adapters differ. Ted has tested the standalone reader on his actual iPad over the local network and reports “It works well.” No browser version, human audio verification or exhaustive feature coverage is inferred. Earlier acceptance of supporting notes at `e9e04b3e194ec6458da59ee07ecc5094d8acf869` is a separate acceptance record.

## Export from VS Code

Open the folder containing `story-teller.project.json`. Run **Story Teller: Export Web Reader**. If multiple projects are open, select one. Save or revert unsaved project files first: the command refuses dirty buffers, including supporting notes and the manifest, rather than silently exporting older disk content. Choose a **new folder outside the adaptation project**, then confirm Export. Existing destinations are refused. Warnings report missing/unsupported images and note targets. Inspect these before sharing the directory. Nothing saves, converts or rewrites manuscript files.

The folder picker is VS Code's native Save dialog: enter the name of a new output directory, not an existing folder to replace. Cancellation before confirmation writes nothing. Export builds in a temporary sibling and publishes the directory only after tracked source hashes and dirty buffers are rechecked (conflicting repeated reads abort rather than replacing an earlier hash); failure removes the temporary output. Concurrent creation of a destination is refused.

## Build/export from the command line

Authors need Node.js 22+ only for the build/export step:

```sh
cd tools/story-teller
npm ci
npm run build
npm run export:web -- /path/to/adaptation /path/to/new-web-folder
```

The CLI reads saved disk content. It cannot see unsaved editor buffers; save/revert these yourself before using it. It never runs chat, State or type-out conversions.

For the committed fictional book:

```sh
npm run export:web -- samples/web-project /tmp/story-teller-web-demo
python3 -m http.server 8765 --bind 127.0.0.1 --directory /tmp/story-teller-web-demo
```

Open **http://127.0.0.1:8765/**. Choose a fresh destination on each export. Readers need only a browser and ordinary static HTTP(S) delivery: no VS Code, Node.js, author filesystem, application backend, build service or external asset host. `file://` is not supported. This task does not host or deploy the output.

## Read

- Initial opening/reopening selects the saved scene/beat **ready**, without starting sound or playback. **Play** starts it. Reopening restores location/preferences, not elapsed performance progress.
- **Contents** collapses/expands an ordered Part–Scene panel. Selecting a scene starts its first beat when Autoplay is enabled; Off leaves it ready. Next turns beats manually; no beat or scene turns automatically. **Next scene →** appears after the last beat completes, including authored silence; the final scene ends with **End of scene**.
- Previous shows a completed silent beat; Replay resets/plays it; Restart returns to the current scene's first beat ready. Pause/Resume preserves remaining waits. Mute and Autoplay are stored per publication in browser local storage; storage-disabled/private browsing still works without guaranteed persistence.
- Sound requires a browser gesture. Enable sound is offered where necessary; unavailable audio has a diagnostic and silent visual fallback. Hiding/departing pauses, clears note surfaces and stops sound. Return does not resume automatically. A scene selection cancels outgoing playback immediately and rejects late responses.
- Following tracks newly revealed content. Scroll up to reread without pausing; **Follow story ↓** resumes. Previous starts at the top, silently. A reading panel pauses both performance and following; dismissal leaves playback paused.
- Wikilinks in prose, chats and annotations retain explicit targets and aliases: the two displayed `JANUS` links open `JANUS early.md` and `JANUS later.md`. Hover or focus previews a note; click/tap/Enter opens its reading panel. Nested links have Back; Escape, Close or an outside click/tap dismisses. Focus and main reading position return to the originating link. Hover/focus never starts or pauses the story. No automatic entity matching or spoiler inference.
- Use Tab/Shift+Tab and native button activation throughout. Contents uses native disclosures. Reduced motion reveals type-outs immediately/silently while retaining authored sequencing; narrow layouts and forced-colour borders are included. Touch checks are browser emulation, **not device/Safari-version verification** (Ted’s separate actual-iPad report is recorded above).

## What is packaged

`index.html`, `reader.js`, shared reader CSS, web theme CSS, `publication.json`, ordered scene JSON files, content-addressed image files and bundled dependency licences. The publication preserves manifest scene/part identities and order; it does not use filename sorting. Notes are packaged as safely rendered Markdown HTML with explicit link-resolution results. Scene bodies remain Markdown for the shared parser. Effective prose pacing is resolved at export; initial scene frontmatter and import provenance are **not published**. Original project files remain untouched.

All `.md` files in **Supporting Content/** are publication notes and are included, even if no link currently reaches them. Keep private research elsewhere. Notes do not become scenes. No source-vault folders, recordings, editor configuration, test evidence, package-manager files or unrelated assets are copied. Only referenced supported PNG/JPEG/WebP images are included, resolving relative to their scene/note within the project. Existing static imagery/captions and original animation bytes are preserved. Animated WebP runs on the browser's own timeline; StoryPlayer Pause/Replay does **not** synchronise its frames.

Missing/unsupported resources become placeholders and warnings. Unsafe traversal/symlink escapes abort export. HTML is disabled/escaped; ordinary Markdown URLs remain inert; remote/data images are not copied or fetched. A restrictive CSP disallows authored scripts, remote connections and embedded frames. Inline style attributes are permitted solely for the shared renderer's fixed presentation/position calculations; no authored CSS is interpreted. The generated bundle contains no VS Code API or filesystem adapter.

Export is a snapshot, not a live watch/reimport system. Re-export to a new directory to publish subsequent edits. Reader links control the presented reading experience, not access control: anyone with the directory can inspect its entire publication data. No offline service worker, DRM, hosting, EPUB export, catalogue, accounts or payments are included. The existing extension-level licence remains unresolved; dependency notices are included without inventing licence terms for Story Teller.

## Checks and acceptance exercise

```sh
npm test              # builds both bundles, then deterministic tests
npm run check
npm run package
# Optional actual HTTP/browser regression, with Python Playwright installed:
python3 test/web-reader.py /absolute/path/to/export
```

The browser script uses an installed `/usr/bin/google-chrome`; configure that path locally for another browser installation. Playwright is test tooling, not a publication dependency. See RESULTS.md and `test/evidence/web-reader.json` for executed versions/results and native regression limitations.

Try both JANUS links, a nested note/Back and dismissal. Play the chat; turn to the formatted annotation, pause/resume/reveal it, then turn to literal YAML and the animated lamp. Check the final beat's explicit next-scene action, missing-resource placeholders, Contents and reopening with Autoplay off. On a narrow window, scroll up during a long beat and use Follow story. Ted’s general acceptance is recorded above; this checklist is not a claim that every item was tested on his iPad.

### Installed-extension closeout checks

`node test/installed-web-export.cjs /absolute/path/story-teller-0.10.1.vsix` installs into a disposable normal VS Code profile, without `--extensionTestsPath` (that mode refuses modal prompts). It uses the supported simple file picker/custom confirmation, waits for extension registration and dialog initialisation, and follows the real command/confirmation to an exported directory. It handles trust for its synthetic project through VS Code's normal UI; it does not disable Workspace Trust. The OS-native file picker is not covered.

For the affected reading handoffs, use `STORY_TELLER_VSIX=... STORY_TELLER_HOST_SCOPE=prose|notes|handoff npm run test:host`, choosing one scope per run. The handoff scope performs 20 cross-root replacements and verifies each committed marker. The driver follows the current live inspector target after a legitimate panel replacement; it never accepts preloaded/hidden content as the reading surface. The notes fixture has an explicit long wait and verifies playback is active before testing Pause-on-panel-open. No author pacing settings are changed.

### Playback speed

The compact **Playback speed** select offers 0.5×, 0.75×, 1× (default), 1.25×
and 1.5×. Smaller is slower. It adjusts calculated prose intervals, automatic
chat delivery (after `@pace`), and type-out reveal (after `@speed`). Authored
`@delay`/`@pause`, delivery ticks, audio pitch and animated-image frames remain
unchanged. Speed does not turn author-disabled prose pacing on.

Change speed during playback or while paused: visible text and proportional
calculated progress are retained; paused reading needs Resume. Explicit waits
keep their remaining time. The preference is stored locally with the existing
publication reader preferences, never in exported content or authoring files.
Invalid/missing storage defaults to 1×; unavailable storage leaves the control
usable for the current session. See the README for the precise timing contract.

For Ted's acceptance, compare a familiar passage at 1×, 0.75× and 0.5×; assess
reading comfort separately from the automated timing measurements. No actual
iPad or human listening validation is claimed for this speed-control change.
