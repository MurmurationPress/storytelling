# Reader investigation — 2026-10-20

The key question has a **qualified yes in Thorium Desktop 3.5.1 on Linux**: ordinary page turns can traverse prose, explicitly started performed PRIME state, prose, the existing image, and more prose. Automatic start on arrival is unresolved; this artifact deliberately requires Begin output. This establishes a small capability, not a platform decision.

## Native reader run

- Reader: official [Thorium Desktop v3.5.1](https://github.com/edrlab/thorium-reader/releases/tag/v3.5.1), Linux amd64 DEB, extracted without system installation.
- Platform: Zorin OS 18.1 (Ubuntu noble base), x86_64; GNOME Wayland session, reader run with `--ozone-platform=x11` for X11 screenshot/input automation.
- A temporary isolated `--user-data-dir` held the test library. No security settings, reader code or sandbox flags were changed. No custom build. The EPUB contains only local resources; no external content service is involved.
- Real reader windows were driven with X11 keyboard/pointer input and captured using ImageMagick window screenshots, not a browser recreation. Sizes below are reader client-window dimensions, excluding desktop decorations.

| Check | Thorium 3.5.1 / Linux result |
| --- | --- |
| Prose → state using native Right-arrow turn | Pass; prose readable on opening, state isolated on next surface at 1024×768 |
| No premature playback | Pass for explicit-start design: complete text shown until Begin; no automatic trigger implemented |
| Begin / burst typing / restrained cursor | Pass; native screenshot shows partial YAML with reserved blank area and stable controls |
| Leave before completion | Pass; Right arrow while Begin/Restart has focus reaches following prose without waiting |
| Turn back | Pass; full YAML, optional Replay; no forced replay |
| Immediate reveal | Pass; Show complete output restores all seven YAML lines immediately |
| Natural completion | Pass; complete output returns after approximately five seconds |
| State → prose → image → remaining prose | Pass using reader page turns; existing image follows infrastructure paragraph and precedes “PRIME remained distributed…” |
| Reader's mouse page-turn control | Pass; right edge control advances from state to prose |
| State bounds, 1024×768 and 800×600 | Pass; indentation and final line visible; no clipping; 800×600 fixed text is smaller |
| Image at both sizes | Entire original SVG visible, large labels readable; original crowded northern labels retained, not redesigned |
| Reduced motion | Browser component check passed; native OS preference not tested |
| No JavaScript | Browser component check passed; native reader security controls left unchanged |
| Touch/swipe and screen reader | Not tested |

Screenshots in `evidence/` show opening, partial state, completed/revisited state, immediate reveal, prose return, image, and post-image prose. The 800×600 captures show state and image bounds. Native page turns can briefly show a blank loading surface; this is reader document loading, not an authored pause or completion gate.

## Why explicit activation

Official marketing's “EPUB 3 support” does not settle publication script execution or encounter timing. We inspected the released source at **137e8901196bc47173580856105fe78b40473570** (v3.5.1), rather than deriving behaviour from the format label:

- Thorium's [streamer injection](https://github.com/edrlab/thorium-reader/blob/137e8901196bc47173580856105fe78b40473570/src/main/streamer/streamerCommon.ts#L150) advertises `spine-scripting`; its [reading-system implementation](https://github.com/edrlab/thorium-reader/blob/137e8901196bc47173580856105fe78b40473570/src/r2-xxx-js/r2-navigator-js/electron/renderer/webview/epubReadingSystem.ts#L50) does too. Actual Begin/typing was then verified natively.
- The navigator [manages two webviews and spread swaps](https://github.com/edrlab/thorium-reader/blob/137e8901196bc47173580856105fe78b40473570/src/r2-xxx-js/r2-navigator-js/electron/renderer/location.ts#L882). Its commented-out hide IPC and internal [content visibility mask](https://github.com/edrlab/thorium-reader/blob/137e8901196bc47173580856105fe78b40473570/src/r2-xxx-js/r2-navigator-js/electron/renderer/webview/preload.ts#L1975) are not a demonstrated public publication-page lifecycle contract. Load means document loaded; intersection means intersection within a document. Neither establishes that the user reached a reader page, particularly with retained or paired views.
- We did not establish a reliable standard arrival event. Explicit Begin makes activation unambiguous and immune to loading ahead. Document visibility/pagehide are only conservative exit hints, not used to start output. This is a deliberate limitation, not a claim that automatic activation is impossible in every configuration.

The [EPUB 3.3 specification](https://www.w3.org/TR/epub-33/#sec-scripted-content) cautions that reading systems may present scripted content differently, including pagination. Its [layout metadata](https://www.w3.org/TR/epub-33/#layout) allows per-spine overrides. Those provisions motivated the mixed-layout trial; only the native run establishes that this reader keeps its page turns with these overrides. No conclusion about all EPUB readers follows.

A browser component test caught XHTML not deferring the original head script as expected: it ran before its elements existed. The final script is placed after the state markup and was retested in both Chromium and Thorium. No reader security workaround was required.

## Separate browser and package evidence

Playwright Chromium **156.0.8078.4**, Linux, loaded the unpacked XHTML as local files. `check_browser.py` verifies partial output, stable surface/control geometry, completion, immediate reveal, browser away/back, reduced motion, full YAML with JavaScript disabled, SVG loading, and absence of script exceptions. See `evidence/browser-results.json`. These checks establish component behaviour; they do not establish native EPUB pagination, touch gestures or another reader's lifecycle.

EPUBCheck **5.3.0**, EPUB 3.3 rules: **0 fatal / 0 errors / 0 warnings / 0 infos**. See `evidence/epubcheck.txt`. `verify.py` passes exact pinned-source comparisons, paragraph/YAML preservation, ordered spine, SVG byte identity and every local resource reference. Building and reading need no network resources.

No second standard EPUB reader was installed (Calibre/ebook-viewer, Foliate and Bookworm were unavailable). Chromium is not counted as a secondary EPUB reader. Windows, macOS, iOS/iPadOS and Android are untested.

## Remaining manual checks

On each additional reader/platform, record its exact version and repeat README steps with the same EPUB: initial prose, explicit start only after arrival, early exit, quick return, completed return, replay, immediate reveal, image placement, and all remaining prose. Test at small and large windows, enlarged prose fonts, OS reduced motion, supported no-script mode, keyboard focus, screen-reader reading and actual touch page turns. Do not disable reader protections to obtain a pass. If scripting or mixed layout fails, record static-text behaviour and boundary failures separately. A successful desktop test does not imply iPad support.
