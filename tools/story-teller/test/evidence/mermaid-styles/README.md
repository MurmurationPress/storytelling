# Actual VS Code styling evidence

These are screenshots of disposable VS Code profiles, not browser mockups.
The before images use the installed **0.14.2 VSIX** and the after images use the
installed **0.14.3 VSIX**. Both use actual **Light Modern / Dark Modern** themes.
Only Mermaid sources from the requested Stories-Told guide scene were extracted;
that repository was read only. Source provenance is in `samples/style-project`.

| Theme / example | Before (0.14.2) | After (0.14.3) |
| --- | --- | --- |
| Light / flowchart | [black fills](before-light-flowchart.png) | [coloured nodes and labels](after-light-flowchart.png) |
| Dark / flowchart | [black fills](before-dark-flowchart.png) | [readable nodes and arrows](after-dark-flowchart.png) |
| Light / hand-drawn class | [black text](before-light-class.png) | [readable text and relationships](after-light-class.png) |
| Dark / hand-drawn class | [black text](before-dark-class.png) | [readable text, annotations and inheritance](after-dark-class.png) |

Sequence inspection: [light](after-light-sequence.png), [dark](after-dark-sequence.png).

Earlier SVG/text-existence tests did not establish that CSP allowed the styles.
The new tests inspect stylesheet application and computed fills/strokes/text
contrast, including during measurement; the normal assertions fail on 0.14.2.
The source/preview panes and host UI are included to show the actual native
context. Native layout dimensions are distinct from real tablet/phone hardware;
no actual iPad/iPhone or Safari testing is claimed.
