# PRIME encounter: small EPUB reader integration

**Integration status (2026-10-20):** PRs #1 and #2 were subsequently reviewed and merged under Ted's explicit authorisation. Earlier keep-unmerged instructions below describe the original experiment stage. See the [integration review](../INTEGRATION-REVIEW.md) and [accepted foundation](../../vault/Managed%20EPUB%20Foundation.md). Ordinary-Thorium automatic encounter remains unresolved; automatic encounter is demonstrated in our managed host extension.

This experiment supplies the missing presentation connection using **EPUB.js 0.3.93** and a real EPUB. A page turn from prose starts PRIME automatically; turning onward remains available throughout. This is a small local reading shell, not Thorium, a reader fork or a publishing platform.

It is stacked on **PR #1**, base `experiment/planetary-model-epub` at `d8cc649`. Neither PR is to be merged as part of this experiment. The accepted playback-v2 artifact and all previous research artifacts remain unchanged.

## Try it

Requires Node.js 18+ with npm and Python 3. Tested with Node 24.19.0 / Python 3.12 on Linux.

From this branch:

```sh
cd experiments/prime-reader
./launch.sh
```

Open **http://127.0.0.1:4173**. The first launch installs locked runtime dependencies from npm; subsequent reading uses only local bundled files. There is no CDN or publication network dependency. No browser bundle/build service is required. The server binds to loopback; nothing is deployed publicly.

1. Read the opening prose; use **→** in the reader header or the keyboard's right arrow.
2. The next surface starts blank and performs PRIME without Begin. Turn onward at any time.
3. Turn back during output to resume, or after completion to see the complete state with optional Replay.
4. Continue through prose, the original habitat image, then remaining prose.
5. Reload or close/reopen the tab at the same URL to restore position and output progress. Use **Development → Reset reading** for a fresh first encounter.

Arrow keys work while an output control has focus. The shell also supplies a horizontal swipe handler that calls toolkit navigation; this has not been tested on an actual iPad. Browser history is not the book's page-turn mechanism. Reader controls live outside the publication.

For the controlled preload demonstration, start fresh at **http://127.0.0.1:4173/?preload=1&registrationDelay=350**. The development view is optional: it reports the artificial offscreen rendition, registrations, turns and progress. Wait at least seven seconds on opening prose before turning. The preloaded output remains at zero; the visible page then starts from blank. `registrationDelay` deliberately delays the connection, not the performance timer.

The separately identified publication is [planetary-model-encounter-v1.epub](publication/planetary-model-encounter-v1.epub), title **Planetary Model — PRIME encounter-v1**. Importing it into an ordinary reader does **not** install this host connection: it retains readable text and explicit-start scripting when supported. It does not fix automatic encounter in ordinary Thorium. Prefer the unchanged [playback-v2](../planetary-epub/dist/planetary-model-playback-v2.epub) when testing the accepted ordinary-reader baseline.

## Reproduce

```sh
npm ci --ignore-scripts
python3 build_epub.py
python3 verify.py
epubcheck publication/planetary-model-encounter-v1.epub
npx playwright install chromium
npm start
```

In a second terminal, from this directory, run `npm test`. Tests use the running local server; set `READER_URL` if using a different port. Tests open real Chromium, render the packaged publication through EPUB.js, operate reader controls and save videos, screenshots, computed presentation and message traces under `evidence/`. They do not replace toolkit events with mocks. Re-running replaces named final captures; old randomly named recordings from an interrupted run can be moved aside.

[Results and temporal evidence](RESULTS.md) · [Presentation contract](CONTRACT.md) · [Toolkit choice and publication changes](DESIGN.md)

This is a trusted, bundled-publication experiment. Scripted EPUB.js content is not a secure arbitrary-book sandbox. No file picker, upload endpoint, native execution, filesystem bridge or unrelated host API is provided. The pinned EPUB.js package has an old transitive XML dependency with npm advisories; the local shell is not offered as a production or untrusted-publication reader. See DESIGN.md for the precise scope.

## Art first slice

This branch adds a [short Art conversation](../art-chat/README.md) under #3/#6, using this same reader and presentation bridge. Launch `../art-chat/launch.sh` for port 4190 and open `?book=art`; the default package remains accepted PRIME. Art has its own identified EPUB, phase snapshots and draft contract. The original PRIME artifact bytes and historical evidence remain unchanged. This is a two-package trusted experiment, not a catalogue/import feature.
