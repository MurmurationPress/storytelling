# Current result: typing works; reliable automatic encounter remains unresolved

**Ted's recording demonstrates progressive typing in playback-v2.** The clarification changes the interpretation of the preceding investigation: the remaining problem is that the complete YAML is readable before Begin/Replay clears and performs it. Manual playback does not meet the intended first encounter. It is no longer appropriate to describe Ted's recording as an unexplained failure of progressive typing.

**No reliable supported arrival signal was established in unmodified Thorium Desktop 3.5.1 on Linux.** A separately named load/intersection probe automatically performs after the tested page turn, without flashing complete text. However, it also performs in a controlled invisible preload and then shows already-completed output on first actual arrival. It is therefore **not an accepted automatic-playback implementation**. Playback-v2 is retained unchanged as the working explicit-start artifact, not as fulfilment of automatic performance on encounter.

The earlier [original report](evidence/RESULTS-v1.md) and [playback-v2 investigation](evidence/RESULTS-playback-v2.md) are preserved as historical reports. Their interpretation of a playback defect is superseded by Ted's recording and this clarification.

## Ted's recording

Reviewed `Screencast from 2026-10-20 15-23-11.webm` (33.425 seconds). Around 2–3 seconds, the state is already readable; later frames show progressively longer prefixes after Replay, normal prose/image navigation, and another successful replay. See [recording provenance](evidence/arrival-v1/ted-recording.json) for SHA-256 and dimensions. The original personal recording was read locally, not copied to the repository.

The established distinction is:

| Capability | Finding |
| --- | --- |
| Progressive typing | Demonstrated in Ted's playback-v2 recording and local native tests |
| Native page turns across prose/state/prose/image | Demonstrated for the extract |
| Initially blank scripted surface without full-text flash | Demonstrated in the arrival research probe; browser fallback checks also pass |
| Automatic performance after the tested first page turn | Observed in the load/intersection probe |
| Automatic performance **only on actual encounter**, never during invisible preload | **Not established; the tested hypothesis fails a native controlled preload** |
| Completed-page return/reopening | Complete state with optional Replay observed in the probe; separate from first encounter |

## Reader implementation and supported signals

The reader was the official unmodified Linux amd64 **Thorium Desktop 3.5.1**, Zorin OS 18.1 / x86_64, default appearance/settings, separate temporary profiles. Native capture used X11 (`--ozone-platform=x11`) within the GNOME Wayland desktop, as before. No security controls, OS preferences or reader code were changed. No custom reader or new reader integration was built. Native Wayland-only behaviour remains unverified.

We inspected the official v3.5.1 source at **137e8901196bc47173580856105fe78b40473570** and the current [EPUB Reading Systems 3.3 event model](https://www.w3.org/TR/epub-rs-33/#sec-scripted-content-events) and [reading-system interface](https://www.w3.org/TR/epub-rs-33/#app-epubReadingSystem). The event model discusses DOM/UI events, not a committed reader-page arrival notification. The reading-system object describes capabilities, not active page position. Official documentation discovery led from the archived Thorium documentation repository to its replacement support site; that site could not be fetched in this environment. No claim of an exhaustive review of inaccessible documentation is made.

Relevant released implementation findings:

- The [reading-system object](https://github.com/edrlab/thorium-reader/blob/137e8901196bc47173580856105fe78b40473570/src/r2-xxx-js/r2-navigator-js/electron/renderer/webview/epubReadingSystem.ts) exposes name/version/hasFeature, including spine scripting. Native traces confirm these three keys. There is no arrival subscription there.
- [Navigation and spread handling](https://github.com/edrlab/thorium-reader/blob/137e8901196bc47173580856105fe78b40473570/src/r2-xxx-js/r2-navigator-js/electron/renderer/location.ts) load/swap webviews and change the outer reading container's opacity. The tested single-surface sequence did not demonstrate natural ahead-of-reading preloading; this is not assumed to be a universal loading policy.
- The [host handles `R2_EVENT_FXL_CONFIGURE` and `R2_EVENT_SHOW`](https://github.com/edrlab/thorium-reader/blob/137e8901196bc47173580856105fe78b40473570/src/r2-xxx-js/r2-navigator-js/electron/renderer/dom.ts#L394) through Electron IPC and restores the outer container's opacity. Those are reader internals, not a supported event delivered to publication scripts. No IPC access or context-isolation bypass was attempted.
- The tempting private content-mask classes do not solve arrival: [`ENABLE_VISIBILITY_MASK` is false](https://github.com/edrlab/thorium-reader/blob/137e8901196bc47173580856105fe78b40473570/src/r2-xxx-js/r2-navigator-js/electron/common/styles.ts#L886), and the [mask function immediately returns](https://github.com/edrlab/thorium-reader/blob/137e8901196bc47173580856105fe78b40473570/src/r2-xxx-js/r2-navigator-js/electron/renderer/webview/preload.ts#L1979). A DOM class observer would depend on a disabled/private implementation detail.

These findings establish that no supported arrival contract was found, not a proof that every possible EPUB heuristic is impossible. Chromium's experimental `IntersectionObserver` visual tracking (`trackVisibility`) is available and reports `isVisible: false` in the artificial hidden fixture. It is logged separately, not used as the trigger. It was not qualified against Thorium's outer webview masking/retention as a reader-arrival guarantee. This investigation does not claim that this additional heuristic, or every future approach, has been ruled out.

## Native recordings and observations

Continuous **15 fps native reader recordings**, rather than browser-only visibility checks or isolated partial screenshots, are in [evidence/arrival-v1/](evidence/arrival-v1/). Each scenario includes `native.webm`, relative input timings in `actions.json`, and a publication-local trace copied from the real reader. Trace milliseconds are relative to each `instance`; media/input timing has small process-start offsets. Do not subtract milliseconds across different instances or assume frame-exact synchronization.

| Recording | Native observation |
| --- | --- |
| [First arrival and completed return](evidence/arrival-v1/first-return/native.webm) | A native Right at approximately 2 s leaves prose. A blank/cursor surface is followed by progressive output without Play. No full YAML flash is observed at 15 fps. The trace starts the heuristic at 51 ms and completes at 5,382 ms in the state instance: 5,331 ms of progression. Forward reaches prose; back shows complete state with optional Replay. |
| [Early departure and return](evidence/arrival-v1/early-return/native.webm) | Right leaves during typing, with 45 characters recorded on pagehide. Return restarts the incomplete performance; the returned instance completes normally. Pagehide is followed by visibilitychange while visibility still reports visible. The deliberately unqualified probe even reconsiders start on that exit; a departed-document latch could prevent that specific reschedule, but would not fix the invisible-preload failure below. This is further reason not to promote the probe. |
| [Reopening](evidence/arrival-v1/reopening/native.webm) | Closed the completed reader window through its normal window-close event, then reopened the same imported book in the same profile. The saved state position reopens complete, with optional Replay and no forced re-performance. Persistence was observed in this profile; EPUB readers may restrict storage. |
| [Controlled invisible preload](evidence/arrival-v1/preload-counterexample/native.webm) | The opening prose contains an intentionally invisible, scaled, clipped iframe of the state document. This is an **artificial EPUB test fixture**, not a claim that Thorium naturally preloads the next spine item this way. The embedded state reports visible document + full ordinary intersection, starts at 72 ms and completes at 5,403 ms while the reader sees prose. On the actual page turn the state is already complete. This falsifies the tested load/ordinary-intersection arrival hypothesis in the native reader. |

The preload trace records `embedded: true`, `visibility: visible`, `intersecting: true`, sample counts increasing from 6 through 237, and natural completion. Its separate experimental visual-tracking observation is `isVisible: false, ratio: 1`. This is direct evidence of the difference between geometric intersection/document visibility and actual visible encounter. It does not establish which undocumented events Thorium might expose in every layout.

The first-return log was exported after its recording using the same native publication Copy operation; the recorder was then corrected to focus the publication before copying. This export-only correction does not change the EPUB, the recorded page turns or their playback. The corrected recorder works for the other scenarios and is included for reproducibility.

## Artifact status and return policy

- [playback-v2](dist/planetary-model-playback-v2.epub) remains the working explicit-start artifact, with its bytes unchanged. Its initial full state is intentional fallback behaviour, but fails the newly clarified scripted first-encounter requirement. Manual Play is not an automatic-arrival solution.
- [arrival-load-probe-v1](dist/planetary-model-arrival-load-probe-v1.epub) is an **unqualified research probe**, not a recommended replacement. It uses pageshow + ordinary intersection + document visibility as a hypothesis, pre-body script bootstrap to hide complete text before paint, and the same authored YAML/timing. It fails the preload condition.
- [arrival-preload-counterexample-v1](dist/planetary-model-arrival-preload-counterexample-v1.epub) is solely the artificial negative-control fixture. Its hidden state is an extra test instance, outside the visible narrative. It is not a reading edition.

The tested return design is separate: completed or immediately revealed state returns complete with optional Replay; incomplete departure can restart on return. The probe uses a per-probe local-storage completion key for completed reopening. That policy does not turn a load notification into evidence of first arrival; the negative control shows how premature playback can wrongly mark a not-yet-seen state as complete.

All prose, YAML wording/indentation, paragraph ordering and original image bytes remain pinned to the same authoritative source. The visible reading spine remains prose → state → prose → image → remaining prose. The no-script form stays complete because only an executed head script adds the hiding class. Reduced motion stays complete with an explanation. Immediate reveal and native page turns remain available. Browser checks confirm those component fallbacks; native OS reduced-motion/no-script modes were not changed or newly claimed tested.

## Validation and reproduction

Both research EPUBs pass EPUBCheck 5.3.0 with **zero errors or warnings** and independent exact source/image/reference checks. The unchanged explicit-start artifact still passes its preservation check. Artifact hashes and byte-reproducible rebuild results are recorded beside the evidence. Browser component checks are explicitly separate from native arrival observations; no iPad, touch, screen-reader or secondary-reader result is implied.

```sh
python3 experiments/planetary-epub/arrival/build_probe.py
python3 experiments/planetary-epub/arrival/build_probe.py --preload-counterexample
python3 experiments/planetary-epub/verify.py --epub experiments/planetary-epub/dist/planetary-model-arrival-load-probe-v1.epub
python3 experiments/planetary-epub/verify.py --epub experiments/planetary-epub/dist/planetary-model-arrival-preload-counterexample-v1.epub
```

Run EPUBCheck on each output. Optional browser checks: `arrival/check_probe.py` using the existing Playwright environment. Optional native evidence runner: `arrival/record_native.py`, requiring python-xlib, ffmpeg and Gtk 3, with a matching test reader already open in an isolated profile. See its help and the recorded actions. No hosting or network is required to build/read the probes.

## Additional reader integration needed

A reliable solution needs the reader to expose an active-surface contract to the publication: activation after a spine surface is actually committed to the visible reading viewport, deactivation before hiding/departure, and a current-state response for listeners registered after activation. It must distinguish a loaded/preloaded document from the active page, identify the reading occurrence, and cover restored positions/reopening without requiring a reader-control gesture to reach the content first.

Thorium already owns navigation, layout and container visibility internally. A documented, supported bridge from that state to publication scripts would let the EPUB start blank, perform only while active, retain completed return state, and keep native page turns. No such reader change, private-hook dependency, security weakening or new reader has been implemented here. Automatic performance on actual encounter remains unresolved; the PR stays unmerged.
