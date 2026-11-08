# Mixed callout/chat conversion validation — 2026-11-08

Candidate: Story Teller **0.20.0**, issue
[#40](https://github.com/MurmurationPress/storytelling/issues/40).
Ted's installed-extension acceptance is **pending**. No merge, release or
publication was performed.

## Reproduction and outcome

[conversion.json](conversion.json) records the baseline and candidate against
the live Cost of Withholding source, kept outside this public repository.
Its SHA-256 matches before and after validation. The committed
[synthetic structural fixture](../../fixtures/mixed-callout-sequence.md) retains
the same callout/fence/paragraph/message topology with invented content.
`STORY_TELLER_CALLOUT_SOURCE` selects the real acceptance source for the same
unit and native checks. Full manuscript text and native screenshots remain local.

| Operation | Callouts converted | Playable chats | Messages | Warnings |
| --- | ---: | ---: | ---: | --- |
| Baseline Convert Chats | 0 | 0 | 0 | None, despite nested chats |
| Baseline Convert Callouts | 4 | 0 | 0 | Line 72: exactly one top-level YAML fence required |
| Candidate Convert Callouts | 5 | 4 | 5 | None |

The baseline chat blocks remain readable Markdown code, rather than being
performed chats. The new mixed parent retains `divergent`,
`LocalCorrection.SequenceDependency`, `2029-05-27 23:22`, all four chats, all
five Pip messages/viewer declarations and all ten intervening/following prose
paragraphs. The whole scene retains one beat. Tests compare every narrative
paragraph in exact order (including repeats), every YAML payload and every
message. Edits are restricted to callout spans.

Root cause: `convertChats` deliberately ignores non-top-level fence tokens;
`convertCallouts` deliberately rejects more than one fence in a machine callout.
Markdown correctly recognizes the blockquote and its fenced chats. A single
type-out is insufficient for the mixed parent; the new `callout` fence preserves
identity and ordered children without changing existing beat boundaries.

## Checks

- `npm test`: **408/408 passed** with the portable synthetic fixture and again
  with `STORY_TELLER_CALLOUT_SOURCE` set to the actual scene, including existing callout-only,
  chat-only and third-field-subtext tests. [Portable log](unit-tests.txt), [actual-source log](actual-source-tests.txt).
- `npm run check`: passed. [Log](syntax-check.txt). This CommonJS project has
  no TypeScript configuration or typecheck script; this is syntax checking,
  not a claimed TypeScript typecheck.
- `npm run build`: both browser bundles built, also run by package/pretest.
- `npm run package`: passed; archive integrity, source parity, required helper
  inclusion, and exclusion of manuscript/fixtures/samples verified.
- `git diff --check`: passed.

## Installed VS Code

The actual VSIX was installed in a fresh disposable profile, with a separate
test adapter. Story Teller was loaded from the installed extension, not the
source development directory. Only temporary documents were edited.

```bash
STORY_TELLER_HOST_SCOPE=callout-chat \
STORY_TELLER_CALLOUT_SOURCE=/path/to/Stories-Told/MULTIPLICITY/scenes/cost-of-withholding.md \
STORY_TELLER_VSIX="$PWD/story-teller-0.20.0.vsix" npm run test:host
```

[installed.json](installed.json) records structural results without manuscript
dialogue or prose. The screenshot remains local in the native profile. Checks:

- Reviewed diff text equals pure conversion output; Apply equals that diff.
- No automatic disk save; one Undo restores the entire original buffer.
- Reapply then repeat conversion proposes zero additional edits.
- Actual scene preview has one mixed parent, correct type/title/timestamp,
  four chat lists, all five messages in order and all ten prose paragraphs;
  every Pip message retains outgoing/viewer alignment; no reader warnings.
- A separate synthetic mixed annotation is converted through native Apply and
  rendered with both message-owned subtexts; Undo restores its source.

The final native run uses `/tmp/story-teller-host-E3M1lT`. A first exploratory
run incorrectly tried Reveal before starting playback; its harness was corrected
to press Play, then exercise the real Reveal controls. The final run passed.
The older chat-subtext host scope initially timed out waiting for a replacement
reader even though it had already opened its workspace; initializing its tracked
reader root to that workspace corrects the test adapter's reconnect assumption.
The existing scope then passed against the final installed VSIX at desktop and
narrow layouts, including timing/pause/reveal, note links, native conversion
Apply and Undo: [report](existing-subtext-installed.json), isolated profile
`/tmp/story-teller-host-vSAJCv`.

## Acceptance package and limits

Local VSIX: `tools/story-teller/story-teller-0.20.0.vsix`.
SHA-256: `dca1a72472f9500e4fb2bc82802e1aae1002de3d52e8509bea850edfb6504dd2`.

Install this local package, open a **copy** of the requested scene, run
**Convert Callouts to Type-out**, review and Apply, then **Preview Scene**.
Inspect the SequenceDependency parent and its prose/chat sequence. Undo restores
the copied source; the original manuscript is never the editing target.

The [format guide](../../../CALLOUT-CHATS.md) lists supported callout labels and
fences. Nested callouts, unsupported child fences and ambiguous structures stay
unchanged with warnings. Fold markers are retained but the reader shows expanded
content. Top-level-only Convert Chats remains its existing separate command.
These automated Linux VS Code checks do not imply author acceptance, new browser
or device coverage, or permission to merge/publish.
