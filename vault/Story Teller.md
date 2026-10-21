---
type: implementation-experiment
status: provisional-slice
created: 2026-10-21
---

# Story Teller

**Ted's current direction:** start a VS Code extension for adapting completed books into sequences of presented story beats. This authorises a small manual-preview implementation, not a general editor or publishing platform. It is a separate authoring experiment alongside [[Managed EPUB Foundation]]; the earlier EPUB artifacts and Art work are preserved, not restructured or migrated.

**Provisional syntax being tested:** normal Markdown prose, initial YAML frontmatter excluded from performance, standalone `---` beat boundaries, and top-level fenced `chat` blocks containing `Speaker: message` lines. Prose and chat may share a beat. This is not an agreed long-term interchange format or a change to manuscript sources. The fictional sample has no authoritative-manuscript adaptation claims.

**Implemented slice:** “Story Teller: Preview Scene” opens beside a Markdown document; Previous/Next/Restart manually navigate whole beats. Unsaved edits update the preview with best-effort current-beat preservation. The parser and player do not import VS Code. The extension handles documents and panel lifetime. HTML is escaped; links are inert; images use alt text; no manuscript scripts or remote fetches are enabled.

[Source, provisional syntax, fictional sample and development-host instructions](../tools/story-teller/README.md). Test claims and limitations are recorded in [results](../tools/story-teller/RESULTS.md).

**Deferred by Ted's brief:** content-based timing, delivered/read ticks, visual beat cards, import/export. No existing EPUB lifecycle or timing is replaced, and no permanent choice about Obsidian's role or publication format follows from this slice. Future integration with the managed reader remains a proposal requiring concrete examples.
