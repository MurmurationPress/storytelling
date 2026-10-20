# Temporal browser evidence

These are continuous Playwright browser-page recordings (25 fps) of actual Chromium running the real EPUB.js renderer and packaged encounter-v1 EPUB, not OS desktop captures or Thorium verification. `linux-desktop/` is 1280×800; `tablet-responsive/` is 820×1180 desktop Chromium, not an iPad test.

Each directory contains `reading.webm` (first page, long invisible preload, arrival, departure/returns, prose/image sequence) and `reopening-replay.webm` (incomplete reopening, rapid turns, reveal/completed reopening, full replay and motion change). Screenshots 01–21 accompany them. Top-level images show initial reduced motion, publication scripts disabled and unsupported bridge fallback.

`results.json` pins the EPUB hash/browser version, records visible text prefixes and computed hiding/bounds, and retains timestamped host/component transitions. Counts in `progress` are performance characters; complete-text captures clear the animated overlay and expose the original complete pre, so a zero-length overlay after completion is not empty YAML. Distinct UUIDs and page reloads have distinct clocks. Use named screenshot steps and trace order rather than subtracting timestamps across page instances.

Regenerate with `npm test` while `npm start` is serving. No toolkit events are mocked. The development-only stale probe sends deliberately invalid channel messages to verify rejection; ordinary navigation in these scenarios still goes through EPUB.js. The optional invisible rendition is deliberately created test infrastructure, not a claimed toolkit default preload policy.
