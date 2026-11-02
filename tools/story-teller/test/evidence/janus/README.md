# JANUS document review — 2026-11-02

Synthetic `samples/janus-project` only. No manuscript excerpts or assets.
`validation.json` records the 310-test suite, actual HTTP Chromium checks,
installed VSIX checks and package digest. The two screenshots show the circulated
report (desktop, with its safe supporting-note preview) and internal analysis
(phone, dark reader theme). These are review artifacts, not golden-image tests.

Run the checks in [JANUS.md](../../../JANUS.md). The web probe uses real browser
layout with controlled JavaScript time; native keyboard scrolling also needs its
compositor animation to settle before inspecting the chosen scroll position.

The supporting-note graph has one entry, the first report's `comparison note`
link. Its preview/full content defines signed changes and has no onward links or
later results. It is suitable at that earliest access. This is an editorial check,
not an automatic spoiler filter.

Automated Linux/Chromium/VS Code coverage does not establish Apple-device,
human screen-reader or author acceptance. Early native driver runs timed out
when resizing changed preview focus, and once while waiting for an acknowledgement
that the host's Stop action intentionally never sends. Temporal checks now run
before that source-focus-changing layout command; narrow layout is still checked.
Final installed runs exit successfully. Browser checks also exposed a real nested
scroll reset when retained document nodes were detached at completion; the reader
now restores those positions, with an explicit regression check.
