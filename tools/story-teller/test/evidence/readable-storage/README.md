# Readable storage validation — 0.19.0

This is implementation evidence for issue #20 and the requested broader storage/reimport migration. Ted accepted the conflict policy; implementation acceptance remains pending. No production project, published reader, release or deployment was changed.

## Passing checks

- Baseline: 359 unit tests. Final candidate: **382/382 unit tests**, zero failures/skips; `npm run check`, build and VSIX packaging pass.
- [Normal installed VSIX](installed-migration.json): VS Code 1.144.0 on Linux, isolated profiles/extensions directories, no extension development/test flags. Actual commands verify read-only preview/cancel, validated migration, preserved original, opening the result and nested scene move/manifest saves. The scene ID stays unchanged and the moved result exports normally. OS-native folder pickers and Workspace Trust are outside this check.
- [HTTP playback](http-playback.json): actual export of that installed-editor migrated/renamed synthetic project, served over HTTP in Chrome 156.0.8078.79. Covers scene/beat turns, chat delivery/read ticks, formatted annotation prefixes, literal YAML, sound graph cleanup, nested supporting panels/links, scroll following, preferences/reopening, rapid stale-scene rejection and reduced-motion/touch **emulation**. It is not device/human listening evidence.
- [Existing reading position](http-position.json): the same HTTP origin and browser localStorage retain publication key, scene ID and beat index when a legacy export is replaced by a migrated export; reopening stays ready. No page errors.
- [Private Skip copy](skip-inventory.json): an independent parsed semantic inventory compares 14 scenes, 16 scene/matter documents, 150 beats, 598 components, 700 references and 52 assets. Identity, text/component/settings/media semantics and asset bytes match. 65 paths change, reader validation has zero warnings, repeated migration is a no-op. The supplied original's complete inventory is checked unchanged. No private manuscript, media, filenames or raw migration report is committed here.
- Deterministic tests additionally cover conflict preservation, no-write unchanged reimport, changed sources, duplicate names, portable slugs/reserved names/Unicode, ordering, source relocation/moves, source asset rename/reuse, nested formatted media and literal code, book covers, missing/duplicate media behavior, dry-run/cancel, stale buffers/files, interrupted staging/retry, unknown fields/files, unusual filenames, ambiguous JSON and numeric metadata, reference resolution and legacy baseline adoption.

## Native runner limitation

The broad default `npm run test:host` was run against the candidate and the unchanged **0.18.1-email VSIX**. Both time out at the visible native-folding assertion in `run-host.cjs:1423`; all source lines remain visible despite the expected folding ranges. This is a reproduced baseline limitation, not a passing full native suite or a claimed fix. Historical native folding limitations remain relevant.

The `navigation` scope also times out at its synthetic keyboard beat-title prompt (`run-host.cjs:862`) in both the candidate and unchanged 0.18.1-email. This is not a passing keyboard-navigation test. The separate normal-installed command test and HTTP navigation checks above pass.

An exploratory `no-fold` run also reaches the older generic conversion section, whose fixture expects optional legacy chat subtext to be rejected, although 0.18 supports it. No production converter changes are made for that obsolete runner expectation. The targeted installed migration and full HTTP playback results above are separate passing evidence; do not describe the broad default native runner as passing.

No actual Safari, iPad, iPhone, Windows/macOS, human screen-reader or human audio validation was performed. Existing video/scene-link/bookmark capabilities are not invented by storage migration. Ambiguous historical baselines, unknown path-bearing syntax, unsafe metadata and unsupported filesystem entries remain blocking manual actions. See [author/migration guide](../../../READABLE-FILES.md).

## Reproduce

From `tools/story-teller/`:

```sh
npm ci
npm run check
npm test
npm run package
node test/installed-readable.cjs story-teller-0.19.0.vsix
```

The last command prints a temporary `webExport` path. With optional Python Playwright and installed Chrome:

```sh
python test/web-reader.py /printed/web/export /tmp/readable-http.json
python test/readable-position-web.py /legacy/export /migrated/export /tmp/readable-position.json
```

For private acceptance, the following reads the supplied project, makes a disposable copy first, migrates only that copy and prints the new test directory. It exports a local HTTP reader there; it does not deploy it:

```sh
node test/real-readable.cjs '/path/to/Story Teller - The Curious Adventures of Skip'
```

For manual testing install the VSIX, open a disposable full project copy, run **Migrate Project to Readable Files**, review/cancel once, then create the validated sibling. Open that sibling and inspect scenes, matter, representative components and supporting links. Export to another unused directory and test over HTTP. Keep the original copy and inspect the permanent migration report/Git diff before deciding whether to replace any working copy.
