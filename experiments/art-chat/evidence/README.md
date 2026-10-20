# Art temporal evidence

Actual packaged EPUB rendered by EPUB.js 0.3.93 in Linux Chromium, recorded by Playwright at 25fps. The tablet directory is a responsive desktop-browser viewport, not iPad/Safari. Each viewport has `reading.webm` (preload, delayed encounter, delay/response departures and returns) and `reopening.webm` (reopening, second exchange, rapid turns, stale signals, completion/replay and reduced motion).

Screenshots 01–19 and `results.json` record phase/message/static visibility and geometry. Snapshot `shown` is a message count, not a character count. Static/reduced-motion captures can have a hidden performance list plus a visible complete transcript; these are alternatives, not two simultaneously presented conversations. Correlate by screenshot name, instance UUID and trace order; reload and iframe clocks differ.

Top-level captures cover no-script, unsupported-host, initial reduced motion, late reveal and invalid-state fallback. The compact-window image is after a successful focused-control turn to prose; bounds are checked before turning. The long-message stress is explicitly a separate unrecorded DOM test fixture, not dialogue in the EPUB or narrative recordings.

`prime-regression.json` and `prime-regression.webm` are fresh checks of the unchanged accepted PRIME package through the modified reader. Existing evidence from the earlier experiments is preserved.
