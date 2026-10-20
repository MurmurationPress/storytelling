# Native arrival investigation evidence

[Current findings](../../RESULTS.md) explain the conclusion: progressive typing works, but the tested automatic-arrival hypothesis is not reliable. These are native Thorium 3.5.1 Linux recordings, not browser reproductions.

- `ted-recording.json`: provenance and corrected interpretation of Ted's recording; the original personal recording remains outside this repository.
- `first-return/native.webm`: prose, first automatic load/intersection performance, onward prose, completed-state return. `trace.json` was exported after recording; `actions.json` records the capture's inputs. No first full-text flash is observed at 15 fps, which does not prove the absence of an unrecorded sub-frame display.
- `early-return/native.webm`: leave during typing, return, restart incomplete performance. Trace also shows the failed probe reconsidering start during exit while visibility remains visible; this is not approved lifecycle behaviour.
- `reopening/native.webm`: completed state after closing/reopening the same book in the same test profile. Not a new profile, and not first encounter.
- `preload-counterexample/native.webm`: an artificial invisible iframe loads state during opening prose. Trace records automatic performance and completion while embedded/invisible; turning to the real state shows it already complete. This controlled fixture is not a claim about Thorium's natural ahead-of-reading policy. The trace captures initial loading before the video starts; the video shows prose followed by the already-complete real state. The scaled/clipped fixture keeps visible prose and the ordinary reading order intact.
- `browser-results.json`: separate component checks for scripted hiding, progress, immediate reveal, completed reload, reduced motion and no-script fallback. Not native arrival verification.
- EPUBCheck logs and `artifacts.json`: validation and final artifact hashes/rebuild comparison.

Videos use ffmpeg X11 capture at 15 fps from an official unmodified reader window, 1024×768 client size. `actions.json` times are seconds since capture process launch; media start may lag. Trace `ms` values are relative to each `instance`, with wall-clock `at` values. Treat timing between the recording and trace as approximate, not frame-exact synchronization.

`../../arrival/record_native.py` is the optional evidence runner. It requires python-xlib, ffmpeg and Gtk 3. Open the appropriate research EPUB in your own isolated default Thorium profile, then run the desired scenario with the exact title suffix. First-return and early-return need separate fresh profiles; reopening intentionally uses the completed profile. The preload fixture is a separate book/profile. Reader settings/security and manuscript sources are not modified.
