# Mixed callout fixtures

`mixed-callout-sequence.md` is a synthetic structural adaptation of the requested
Cost of Withholding acceptance case. It retains five machine callouts, their
paragraph/fence/blank-line structure, and four chats containing five messages.
All prose, dialogue, speaker names, titles, dates and YAML data are invented.
It is an experiment/test fixture, not manuscript wording or a canonical copy.

The actual authoritative source remains in Ted's separate Stories-Told checkout
at `MULTIPLICITY/scenes/cost-of-withholding.md`; its content and screenshots are
not committed or packaged. Actual-source acceptance was pinned on 2026-11-08:

- Source checkout HEAD: `001c0e1aa459c34917adc5e1b595ffa69fd269a1`.
- Live content SHA-256:
  `78d9ef4c2e5d7fca14e5039045c4a4394d772f0f809d1e242f47818ed0d858ef`.

Run the identical unit checks against the real file with:

```bash
STORY_TELLER_CALLOUT_SOURCE=/path/to/Stories-Told/MULTIPLICITY/scenes/cost-of-withholding.md npm test
```

Native acceptance uses this variable too, editing only a disposable VS Code
buffer. No other scene is copied or edited. All fixtures are excluded from VSIX.
