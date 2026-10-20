# Art: selection, storyboard and adaptation record

**Source:** current authoritative `tedwarddick/PrimeTrilogy`, revision `75b4a92456d459474771364ca35a11211b6ee8bc`, `Books/CONSTRAINT/COLLISION/Art.md`, Git blob `b67a556df2f121ad371c6a61bc8421a7aea164a8`. Retrieved through GitHub at this pinned revision; no old uploaded ZIP and no manuscript writes. The full chapter was read, including its opening family context, sculpture/tattoo/movement studies and ending. A pinned whole-chapter snapshot is retained only for audit/independent verification; the EPUB contains the short extract below.

## Why this sequence

Ted selected Art. The closing permission exchange is short and coherent without implementing drawings: Robin wants another bird, Pip notices the boundary she has kept around their conversations, Skip asks permission to address Robin, and Pip grants it for this drawing. Robin answers “Blue.” The drawing itself begins after the chosen boundary and is not performed here.

The passage begins within an existing activity; references to the curve and greenshank drawings remain prose, not fabricated pictures or a new scene-setting sentence. This is a late-Art extract, not a replacement for the entire chapter. Retain Pip's perception, physical action and interpretation instead of turning everything into messages.

## Exact inclusive boundaries and storyboard

Overall extract: **lines 462–504**, starting “Robin leaned forward and put a finger on the curve.” and ending ““Blue.””. The following list is an explicit treatment of those lines, not a general template language.

| Reader surface | Source | Performed treatment | Static treatment |
| --- | --- | --- | --- |
| `opening.xhtml` | Prose 462–470, including Robin's spoken “Bird.” and “More bird.” | Normal prose; remove only the procedural clause described below | Original prose intact |
| `ask.xhtml` | Chat fence 472–480; messages **477, 479** | Pip: `Robin's here with me, asking for another bird.` → Skip: `May I ask what colour?` | Both messages immediately readable, same words/speakers/order |
| `between.xhtml` | Prose **482–488** | Original prose, including “It had waited.”, Pip's reading of the question, her spoken invitation and camera-off voice-session detail | Identical prose |
| `permission.xhtml` | Chat fence 490–498; messages **495, 497** | Pip: `You can ask. Just this drawing for now.` → Skip: `What colour shall the bird be, Robin?` | Both messages immediately readable, same words/speakers/order |
| `after.xhtml` | Prose **500–504** | Original prose: Robin looks up; Pip's “Skip's asking you.”; Robin's “Blue.” | Identical prose |

Blank lines and fence/Canvas/POV markup are structural, not extra spoken messages. Canvas remains the channel heading. Robin's and Pip's prose quotations remain prose, not misattributed chat bubbles. Dialogue punctuation and casing are unchanged. Independent verification reads source line numbers, not generated component output.

## Every omission/transformation inside the extract

1. **Source line 470:** “She looked at the two versions of the bird, then typed.”
   - **Performed:** “She looked at the two versions of the bird.” followed by Pip's actual source message on the next reading surface.
   - **Meaning replaced:** the outgoing message appearing performs the act of entering the message. It does not replace her look, hand position, privacy concern or interpretation; all those words remain.
   - **Static/no-script/reduced-motion/absent-host:** retain the original sentence with “, then typed”. Without a performance, its supporting narration is useful.
   - A single `static-only` span contains that clause; the common sentence is not duplicated. The host marker plus motion preference selects the performed narration before paint. Both treatments are never presented together.
2. **Fenced chat syntax, source lines 472–480 and 490–498:** map source speaker/text pairs into semantic messages under Canvas; omit fences, `{{...|...|}}` delimiters and the POV marker from the visible treatment. They are not dialogue. Both treatments preserve all four actual messages.
3. **Outside 462–504:** surrounding chapter is outside this explicitly selected extract, not silently rewritten. Frontmatter/State metadata and earlier images are not part of the performed conversation. No other narration inside the boundaries is omitted or converted.

In particular, **“It had waited.” stays prose**. It communicates Pip's interpretation of permission, not an instruction to simulate a long hesitation. No unsent message, cancelled response or significant extra hesitation is added. The later description of Pip typing with her free hand is outside this selected exchange and is not an adaptation made here.

## Timing is proposed editorial presentation, not a source fact

`storyboard.json` records 900ms before each first Pip message, 1000ms between that message and Skip's response phase, and a 1000ms modest “Skip is responding” three-dot cue before Skip's message arrives. Pip's messages arrive whole, without simulated character typing. Total uninterrupted active duration is about 2.9s per exchange, subject to browser scheduling. These are configurable reading/legibility settings; the manuscript specifies no millisecond timings. The cue does not claim a dramatic thought, unsent message or literal keyboard action during the voice-enabled second exchange. No sound is used.

A reader turn never waits for those phases. Leaving freezes both count and remaining active delay/cue time; returning resumes. Completed return stays complete, with optional replay/reveal. Reduced motion uses static original narration/transcript rather than the performed timing.

## Assets and opportunities left outside

The chapter's `The-Mark-Stencil.png` and `roppo.png`, their sidecars, and the greenshank context were inspected. The two PNG Git blobs are LFS pointers; actual LFS assets were fetched and hash-verified for inspection. Their source placements are lines 184 and 218, before this extract. No image is needed to understand this permission exchange: the surrounding prose carries the reference to existing bird drawings, and the new bird is drawn after line 504. Neither unrelated earlier images nor a fabricated drawing is inserted into the EPUB.

A performed line/spiral and reader continuation belong to later Art opportunities recorded in the vault. No drawing engine, Canvas application, camera/microphone control or reader-drawing feature is implemented. The voice/camera words are source narration, not operational controls in this demo.
