# Accepted experiment integration review — 2026-10-20

Ted authorised review, dependency-ordered integration and one five-issue foundation milestone. This supersedes the earlier keep-unmerged instructions for these two experiments and the earlier no-tickets-yet direction for this limited scope. No milestone implementation or deployment was performed. [Foundation and acceptance](../vault/Managed%20EPUB%20Foundation.md) · [Audit data](integration-review.json).

## Reviewed versions and merge results

| Work | Exact revision / outcome |
| --- | --- |
| Initial remote main | `14acfed63ac621578654ae393968dd3b2bc348e3` |
| PR #1 initial head reviewed | `d8cc6494265273c8e9eea76cecfd73209d2c853a` |
| PR #1 workspace cleanup / final reviewed head | `2584e5cb4ca9f0ee56c98589b7c7f4575d1f9683` |
| PR #1 verified merge commit | `3c3922329d80a224075a3ee90167f23867320a67` |
| PR #2 exact reviewed head | `1edc684aa68f9242b8d8b38adefc342767f162e4` |
| PR #2 verified merge commit | `b55f08bd03953f01e05544c9e3f9dbd7c91893eb` |

The sole pre-merge correction removes accidental machine-specific `.obsidian/workspace.json` changes from PR #1, restoring its main-branch version. No playback or manuscript changes were needed to pass this review. The accepted experimental code is not represented as production-ready; no blocking lifecycle/fallback defect was found within the documented bundled-extract scope.

The PR #1 branch update used a lease against the inspected head. Both merges used the REST merge endpoint's expected-head SHA guard after checking the target main head. After merging #1, PR #2 was deliberately retargeted from the experimental base to main; its **78 effective file changes were compared with the original stacked diff and were identical**. After merging #2, both experiment directory trees were compared against `1edc684` and were identical. Main's Obsidian workspace matched its pre-integration version. Historical experiment reports remain; later documentation status updates below supersede their original unmerged instructions without recasting their evidence.

## Re-run validation

- PR #1: rebuilt playback-v2, diagnostic and both labelled arrival research probes in an isolated checkout. Every generated file reproduced its exact committed bytes. All **five** EPUBs, including the historical original, pass independent manuscript/YAML/image/order/reference checks and EPUBCheck 5.3.0 with **zero errors and warnings**.
- PR #1 component browser checks: PASS in Chromium 156.0.8078.4, including increasing prefixes, opaque reader-style colour override, duplicate activation, hidden pause/resume, bounds, reveal/replay/completion, navigation return, reduced motion, no-script complete text, SVG and diagnostic log. Visibility events in that component test are synthetic browser checks, not new native arrival evidence. The research probe's browser checks also pass **as a component**, not as a reliable arrival contract.
- PR #2: clean locked `npm ci --ignore-scripts`, byte-reproducible derivative build, independent source/package verifier and EPUBCheck 5.3.0: PASS, **zero errors and warnings**. Existing source, timing, SVG and historical package bytes remain preserved.
- PR #2 actual EPUB.js/Chromium 149.0.7827.55 suite: PASS at 1280×800 and 820×1180. >7s invisible preload with zero advancement; delayed blank registration; sustained visible prefixes; early departure, quick/later and completed return; exact stored-checkpoint reopening; rapid turns; wrong-instance/out-of-order rejection; reveal; natural completion; reduced-motion initial/dynamic static output; no-script and absent-host manual/static fallback; source image position/bounds; turns with component controls focused; no repeated live-status mutation during bursts. Full replays measured **5342ms / 5344ms**. The re-run used a separate local test server and isolated browser contexts, leaving Ted's running reading shell/profile untouched.

New review runs took place in detached temporary worktrees, so the original committed temporal recordings/results were not overwritten. Their compact review summary is in the audit JSON. Existing [native ordinary-reader evidence](planetary-epub/RESULTS.md) and [host temporal browser evidence](prime-reader/RESULTS.md) retain their original scope. No new Thorium-native or actual iPad/Safari run is claimed.

## Findings that must not be collapsed

1. Explicit start/replay works for the tested ordinary Thorium 3.5.1 Linux extract; Ted accepts the typing treatment.
2. Publication-only automatic silent-reading encounter remains unresolved in unmodified Thorium. The load/intersection hypothesis fails invisible preload; TTS/media overlays do not expose the needed public API.
3. Our EPUB.js **host extension** demonstrates automatic encounter and lifecycle for the extract. This connection is not standard EPUB and is not installed in ordinary Thorium by importing the EPUB.
4. Linux browser tests at a tablet viewport are not actual iPad/Safari, touch or screen-reader verification.

## Acceptance recording references

- `Screencast from 2026-10-20 16-35-47.webm`: 11.668945s; SHA-256 `d8681a6d735499982e4082be8287a0cd84f6b5410f868b7c3fd05a4ab42ada8f`. Local reference only; recording not copied.
- `Screencast from 2026-10-20 16-34-22.webm`: 17.750816s; SHA-256 `6f0de613a70072d7f633a3c4bd348170fb4a4e1489df4f0feb7420b9c58f92cd`. Local reference only; recording not copied.

The 16:35:47 recording was inspected locally at successive times: prose (~1s), progressive PRIME (~4s and ~7s), then prose (~10s). Ted explicitly accepts this sequence and calls typing excellent, well paced and alien. Browser version in Ted's recording is not recorded; do not assign the automated test browser's version to it. These references record acceptance, not production readiness or universal compatibility. Private recordings and extracted inspection frames were not uploaded.

## Authored notes and scope

`vault/Component Types.md` was present only in Ted's local `experiment/prime-reader-bridge` authoring worktree at `2646b97b5cd5320cb1622490edff931780c97804`; remote main and both PR heads lacked it. Its exact bytes, including wording/spelling and absence of a trailing newline, were preserved in main's foundation update. SHA-256: `9af227cea02a2f21349c6948aeebd1eefcc5faf22a96d3321bb06dfc29ce10e2`. All local branches/worktrees and remote branch heads were inspected; no other vault note was unique to that authoring branch relative to the reviewed PR #1 note history. Ted's active worktree was neither switched nor reset, and its workspace file was not edited by this task.

Known constraints carried into the milestone: scripted EPUB.js is a bundled-trusted-content experiment, not a malicious-book sandbox; pinned XML dependency advisories remain unresolved; a prebuilt browser bundle is not fixed by an npm override alone. Global-layout/mixed-layout limitations, storage/version handling and actual device evidence remain bounded follow-up work. These do not justify an arbitrary-loader or platform/security project.

One milestone and five open issues plan the next stage. No chat renderer, reusable SDK, new authoring representation or platform feature was implemented in this integration task.
