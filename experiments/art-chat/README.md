# Art · a short authored conversation

First implementation slice for milestone 1, #3 and #6. **Contract draft; not the full milestone.** A late-Art permission exchange moves through normal prose, two short performed conversations separated by important narration, then prose. Only the redundant “then typed” clause is replaced by the performed message; static readers retain it.

## Try it locally

Node.js 18+ with npm and Python 3; tested on Linux with Node 24.19.0 and Python 3.12.

```sh
cd experiments/art-chat
./launch.sh
```

Open **http://127.0.0.1:4190/?book=art**. Use reader arrows or keyboard left/right. Read the prose, turn to Canvas and let the messages arrive. Turn away during a delay or response cue, then back. Continue through the second exchange to Robin's answer. Replay is optional after completion; Show complete conversation reveals immediately. Development → Reset reading starts fresh. Reopening at the same URL restores the stored reading position and component phase.

The same shell still opens the accepted PRIME at **http://127.0.0.1:4190/**. The immutable PRIME EPUBs are unchanged. Keep the existing 4173 preview running if preferred; this slice uses a separate loopback port/profile origin, with no public deployment. First install needs npm; all reading resources are then local. No model service, remote dialogue or TTS is involved.

For the invisible-preload/late-registration fixture, reset and open **http://127.0.0.1:4190/?book=art&preload=1&registrationDelay=350**, wait at least four seconds on prose, then turn. The invisible rendition must not consume the conversation. Development information is optional and separate from reading controls.

[Download the distinct EPUB](publication/art-chat-v1.epub), library title **CONSTRAINT · Art chat slice v1**. An ordinary reader gets the static complete treatment and optional manual activation when scripts work; importing it does not give Thorium our encounter extension. Script/motion fallback probes in the shell: append `&scripts=0`, `&bridge=0`, or enable reduced motion. Actual ordinary-reader/iPad compatibility for this new package has not been established.

## Reproduce and validate

```sh
npm ci --prefix ../prime-reader --ignore-scripts
npx --prefix ../prime-reader playwright install chromium
python3 build.py
python3 verify.py
epubcheck publication/art-chat-v1.epub
node contract-examples.cjs
./launch.sh
```

In a second terminal in this directory:

```sh
node test.cjs
READER_URL=http://127.0.0.1:4190 READER_EVIDENCE_DIR=/tmp/art-prime-regression node ../prime-reader/test.cjs
```

Tests exercise the actual EPUB.js renderer and EPUB, not mocked location events. `ART_EVIDENCE_DIR` changes the Art capture directory; `READER_EVIDENCE_DIR` keeps the PRIME recheck from overwriting historical evidence. Build timestamps/order are fixed; rebuilding the same source/settings/code gives identical package bytes. `verify.py` independently checks source blob/hash, all dialogue/speakers/order, complete static prose, the sole adapted clause, references, script copies and every accepted PRIME artifact against the merged foundation.

[Adaptation and source boundaries](ADAPTATION.md) · [Initial contract](CONTRACT-DRAFT.md) · [Results and temporal evidence](RESULTS.md)

This is the same trusted-publication EPUB.js shell, with its existing scripting/dependency limitations. It accepts only the two bundled packages; it is not an untrusted-book sandbox. Desktop/tablet-sized browser tests are not actual iPad/Safari or screen-reader verification. #3–#7 remain open unless their full acceptance criteria are separately met.
