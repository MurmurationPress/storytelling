---
type: prototype-study
status: tested-with-limitations
created: 2026-10-20
---

# Art Chat Slice

**Ted's authorised first implementation slice:** develop #3's initial component contract alongside a short authored-chat adaptation from Art under #6, and demonstrate it in the existing managed reader. The PR remains unmerged; the five-issue milestone is not complete. [[Component Types]] and Ted's active authoring worktree remain preserved.

## Source and selection

Current authoritative `tedwarddick/PrimeTrilogy`, revision `75b4a92456d459474771364ca35a11211b6ee8bc`, `Books/CONSTRAINT/COLLISION/Art.md`. The chapter and its context/assets were read. The EPUB extracts **462–504**: Robin asks for another bird, Pip introduces Robin to Skip, Skip asks permission to address Robin, Pip allows this drawing, and Robin answers “Blue.” The four chat messages are source lines 477, 479, 495 and 497, with unchanged words, speakers and order. The earlier tattoo/Roppō images are outside the selected sequence; its later drawing is not implemented.

The [adaptation record and storyboard](../experiments/art-chat/ADAPTATION.md) give exact resource boundaries and every transformation. A pinned whole-chapter snapshot is audit input, not full-chapter publication output. No manuscript source is modified; no old uploaded ZIP is authoritative.

## Editorial treatment, proposed for Ted's review

Only the final “, then typed” clause in line 470 is removed from the performed narration: Pip's arriving message carries that procedural information. Her physical hand position, privacy concern and perception remain. Static/no-script/reduced-motion/unsupported-host readers retain the original sentence. A single conditional clause is used rather than publishing two visible copies of the scene.

“It had waited.” remains prose: it is Pip's interpretation of Skip's permission, not a reason to invent significant hesitation. The modest delays and response cue are configurable editorial pacing, not source-specified milliseconds. No unsent messages, invented responses or dramatic silence are added. The voice/camera narration does not operate device controls. Authored spoken quotations outside the chat fences remain normal prose.

## Contract learning and scope

The same version-1 presentation bridge supports the immutable accepted PRIME package and the new Art resources. Art needs an opaque snapshot of message count, delay/response phase and remaining active milliseconds; a character counter is insufficient. The reader owns persistence and confirmed enter/leave, while the component owns those phase semantics. New identity/content/state versions protect restoration. Source/settings changes select a new slot rather than guessing a migration.

[Initial contract draft](../experiments/art-chat/CONTRACT-DRAFT.md) and executable examples are progress on #3, **not a stable universal interface**. Accepted PRIME stays on the supported legacy profile; its full reusable extraction/new snapshot parity remains #5. The small reader metadata/state-slot and fixed package-route prerequisites belong to #4/#7; neither issue is complete. No second protocol, generic component SDK, editor or platform is built.

## Demonstration and review

[Launch instructions and EPUB](../experiments/art-chat/README.md) · [Results and temporal evidence](../experiments/art-chat/RESULTS.md).

Review question: does this short Art sequence feel natural as prose → performed conversation → prose, with redundant description replaced by the experience? The new adaptation still needs Ted's review; the earlier acceptance of PRIME is not automatically acceptance of this chat treatment. Actual iPad/Safari, touch and screen-reader usability remain distinct from responsive Linux-browser checks.

Later: performed drawings, invitation to continue a line and a broader Canvas experience remain [[Future Component Possibilities]], not this implementation slice.


**Verified first-slice result:** actual EPUB.js/Chromium tests pass at 1280×800 and 820×1180, with an additional 1024×600 bounds check. Temporal evidence covers inactive preload, phase interruption/resumption, reopening, completion/replay/reveal, stale identity, motion/static/manual fallback and focused-control navigation. Source/package checks pass and EPUBCheck 5.3.0 reports zero errors/warnings. Accepted PRIME tests pass with artifact bytes unchanged. These are Linux browser results; the adaptation still awaits Ted's editorial acceptance and actual iPad/Safari remains unverified.
